/**
 * Member Velocity Service
 * Calculates individual team member velocity based on historical performance
 * Used to estimate hours per story point for each team member
 */

import { getSprintFromLabels } from '../utils/labelUtils'
import { calculateAbsenceImpact } from './absenceService'

/**
 * Calculate individual velocity for a team member
 * @param {string} username - Team member username
 * @param {Array} allIssues - All issues from GitLab
 * @param {number} memberDefaultCapacity - Member's weekly capacity in hours
 * @param {number} lookbackIterations - Number of iterations to analyze (default: 3)
 * @returns {Object} Velocity data including hours per story point
 */
export function calculateMemberVelocity(username, allIssues, memberDefaultCapacity = 40, lookbackIterations = 3) {
  if (!username || !allIssues || allIssues.length === 0) {
    console.log(`[Velocity] No issues provided for ${username}`)
    return {
      hoursPerStoryPoint: null,
      iterationsAnalyzed: 0,
      totalStoryPoints: 0,
      totalHoursAvailable: 0,
      dataQuality: 'insufficient',
      iterations: []
    }
  }

  // Get all closed issues assigned to this member with iterations
  // Check both assignee and assignees array for compatibility
  const memberIssues = allIssues.filter(issue => {
    const isAssigned =
      issue.assignee?.username === username ||
      issue.assignees?.some(a => a.username === username)

    return isAssigned &&
      issue.state === 'closed' &&
      issue.iteration?.start_date &&
      issue.iteration?.due_date
  })

  console.log(`[Velocity] Found ${memberIssues.length} closed issues for ${username} out of ${allIssues.length} total issues`)

  if (memberIssues.length === 0) {
    return {
      hoursPerStoryPoint: null,
      iterationsAnalyzed: 0,
      totalStoryPoints: 0,
      totalHoursAvailable: 0,
      dataQuality: 'no-history',
      iterations: []
    }
  }

  // Group issues by iteration
  const iterationMap = new Map()
  memberIssues.forEach(issue => {
    const iterationName = getSprintFromLabels(issue.labels, issue.iteration)

    // Try to find story points - check both "sp::" and "SP::" and also check weight field
    let storyPoints = 0
    if (issue.labels) {
      const spLabel = issue.labels.find(l =>
        typeof l === 'string' && (l.startsWith('sp::') || l.startsWith('SP::'))
      )
      if (spLabel) {
        const spValue = spLabel.replace(/^sp::/i, '')
        storyPoints = parseInt(spValue) || 0
      }
    }

    // Fallback to weight field if no SP label found
    if (storyPoints === 0 && issue.weight) {
      storyPoints = parseInt(issue.weight) || 0
    }

    if (iterationName && storyPoints > 0) {
      if (!iterationMap.has(iterationName)) {
        iterationMap.set(iterationName, {
          name: iterationName,
          startDate: new Date(issue.iteration.start_date),
          endDate: new Date(issue.iteration.due_date),
          storyPoints: 0,
          issues: []
        })
      }
      const iteration = iterationMap.get(iterationName)
      iteration.storyPoints += storyPoints
      iteration.issues.push(issue)
    }
  })

  console.log(`[Velocity] Found ${iterationMap.size} iterations with story points for ${username}`)

  // Sort iterations by end date (most recent first) and take the last N
  const iterations = Array.from(iterationMap.values())
    .sort((a, b) => b.endDate - a.endDate)
    .slice(0, lookbackIterations)

  if (iterations.length === 0) {
    return {
      hoursPerStoryPoint: null,
      iterationsAnalyzed: 0,
      totalStoryPoints: 0,
      totalHoursAvailable: 0,
      dataQuality: 'no-completed-work',
      iterations: []
    }
  }

  // Calculate capacity and story points for each iteration
  let totalStoryPoints = 0
  let totalHoursAvailable = 0

  const iterationDetails = iterations.map(iteration => {
    // Calculate working days in the iteration
    let workDays = 0
    const current = new Date(iteration.startDate)
    const end = new Date(iteration.endDate)
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++
      }
      current.setDate(current.getDate() + 1)
    }

    // Calculate capacity for this iteration
    const dailyHours = memberDefaultCapacity / 5
    const iterationCapacity = workDays * dailyHours

    // Get absence impact for this iteration
    const absenceHours = calculateAbsenceImpact(
      username,
      iteration.startDate,
      iteration.endDate,
      memberDefaultCapacity
    )

    // Available hours = capacity - absences
    const availableHours = Math.max(0, iterationCapacity - absenceHours)

    totalStoryPoints += iteration.storyPoints
    totalHoursAvailable += availableHours

    return {
      name: iteration.name,
      startDate: iteration.startDate,
      endDate: iteration.endDate,
      storyPoints: iteration.storyPoints,
      capacity: iterationCapacity,
      absenceHours,
      availableHours,
      issueCount: iteration.issues.length
    }
  })

  // Calculate average hours per story point
  const hoursPerStoryPoint = totalStoryPoints > 0
    ? totalHoursAvailable / totalStoryPoints
    : null

  // Determine data quality
  let dataQuality = 'excellent'
  if (iterations.length < 3) {
    dataQuality = iterations.length === 1 ? 'low' : 'moderate'
  }

  const result = {
    hoursPerStoryPoint: hoursPerStoryPoint ? Math.round(hoursPerStoryPoint * 10) / 10 : null,
    iterationsAnalyzed: iterations.length,
    totalStoryPoints,
    totalHoursAvailable: Math.round(totalHoursAvailable),
    dataQuality,
    iterations: iterationDetails
  }

  console.log(`[Velocity] ${username} velocity calc result:`, {
    hoursPerSP: result.hoursPerStoryPoint,
    iterations: result.iterationsAnalyzed,
    storyPoints: result.totalStoryPoints,
    quality: result.dataQuality
  })

  return result
}

/**
 * Calculate team average velocity
 * Used as fallback when individual velocity data is insufficient
 * @param {Array} teamMembers - All team members
 * @param {Array} allIssues - All issues from GitLab
 * @param {number} lookbackIterations - Number of iterations to analyze
 * @returns {Object} Team velocity data
 */
export function calculateTeamAverageVelocity(teamMembers, allIssues, lookbackIterations = 3) {
  if (!teamMembers || teamMembers.length === 0 || !allIssues || allIssues.length === 0) {
    return {
      hoursPerStoryPoint: null,
      membersAnalyzed: 0,
      dataQuality: 'insufficient'
    }
  }

  const memberVelocities = teamMembers
    .map(member => {
      const velocity = calculateMemberVelocity(
        member.username,
        allIssues,
        member.defaultCapacity || 40,
        lookbackIterations
      )
      return {
        username: member.username,
        hoursPerStoryPoint: velocity.hoursPerStoryPoint,
        iterationsAnalyzed: velocity.iterationsAnalyzed
      }
    })
    .filter(v => v.hoursPerStoryPoint !== null && v.iterationsAnalyzed >= 2)

  if (memberVelocities.length === 0) {
    return {
      hoursPerStoryPoint: null,
      membersAnalyzed: 0,
      dataQuality: 'insufficient'
    }
  }

  // Calculate average
  const avgHoursPerStoryPoint = memberVelocities.reduce((sum, v) => sum + v.hoursPerStoryPoint, 0) / memberVelocities.length

  return {
    hoursPerStoryPoint: Math.round(avgHoursPerStoryPoint * 10) / 10,
    membersAnalyzed: memberVelocities.length,
    dataQuality: memberVelocities.length >= 3 ? 'good' : 'moderate'
  }
}

/**
 * Get hours per story point for a member with fallback logic
 * @param {string} username - Team member username
 * @param {Array} allIssues - All issues
 * @param {number} memberDefaultCapacity - Member's capacity
 * @param {Object} teamAverage - Team average velocity
 * @param {number} staticHoursPerSP - Static fallback value
 * @returns {Object} Hours per story point with metadata
 */
export function getHoursPerStoryPoint(username, allIssues, memberDefaultCapacity, teamAverage, staticHoursPerSP = 6) {
  const memberVelocity = calculateMemberVelocity(username, allIssues, memberDefaultCapacity)

  // Priority 1: Use member's own velocity if quality is good enough
  if (memberVelocity.hoursPerStoryPoint && memberVelocity.iterationsAnalyzed >= 2) {
    console.log(`[Velocity] ${username} using INDIVIDUAL velocity: ${memberVelocity.hoursPerStoryPoint} h/SP from ${memberVelocity.iterationsAnalyzed} iterations`)
    return {
      hours: memberVelocity.hoursPerStoryPoint,
      source: 'individual',
      quality: memberVelocity.dataQuality,
      details: `Based on ${memberVelocity.iterationsAnalyzed} iterations`
    }
  }

  // Priority 2: Use team average if available
  if (teamAverage && teamAverage.hoursPerStoryPoint) {
    console.log(`[Velocity] ${username} using TEAM AVERAGE: ${teamAverage.hoursPerStoryPoint} h/SP (individual had ${memberVelocity.iterationsAnalyzed} iterations)`)
    return {
      hours: teamAverage.hoursPerStoryPoint,
      source: 'team-average',
      quality: teamAverage.dataQuality,
      details: `Team average (${teamAverage.membersAnalyzed} members)`
    }
  }

  // Priority 3: Fall back to static value
  console.log(`[Velocity] ${username} using STATIC: ${staticHoursPerSP} h/SP (no historical data)`)
  return {
    hours: staticHoursPerSP,
    source: 'static',
    quality: 'configured',
    details: `No historical data (needs ≥2 iterations with completed work)`
  }
}
