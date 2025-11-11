/**
 * Velocity & Burndown Analytics Service
 * Calculates sprint velocity, burndown data, and predictive metrics
 */

import { getSprintFromLabels } from '../utils/labelUtils'

/**
 * Calculate velocity metrics for all sprints
 * Returns velocity data sorted by sprint number
 * Tracks both issue count and story points (weight)
 */
export function calculateVelocity(issues) {
  if (!issues || issues.length === 0) {
    return []
  }

  // Group issues by sprint
  const sprintMap = new Map()

  issues.forEach((issue) => {
    const sprint = getSprintFromLabels(issue.labels, issue.iteration)
    if (!sprint) return

    if (!sprintMap.has(sprint)) {
      sprintMap.set(sprint, {
        sprint,
        totalIssues: 0,
        completedIssues: 0,
        openIssues: 0,
        totalPoints: 0,
        completedPoints: 0,
        openPoints: 0,
        completedAt: []
      })
    }

    const sprintData = sprintMap.get(sprint)
    const issueWeight = issue.weight || 0

    sprintData.totalIssues++
    sprintData.totalPoints += issueWeight

    if (issue.state === 'closed') {
      sprintData.completedIssues++
      sprintData.completedPoints += issueWeight
      if (issue.closed_at) {
        sprintData.completedAt.push(new Date(issue.closed_at))
      }
    } else {
      sprintData.openIssues++
      sprintData.openPoints += issueWeight
    }
  })

  // Build a map of sprint name to start date for sorting
  const sprintDates = new Map()
  issues.forEach((issue) => {
    const sprint = getSprintFromLabels(issue.labels, issue.iteration)
    if (sprint && issue.iteration?.start_date && !sprintDates.has(sprint)) {
      sprintDates.set(sprint, issue.iteration.start_date)
    }
  })

  // Convert to array and sort by start date (or by sprint number for legacy format)
  const velocityData = Array.from(sprintMap.values())
    .sort((a, b) => {
      const dateA = sprintDates.get(a.sprint)
      const dateB = sprintDates.get(b.sprint)

      // If both have dates, sort by date
      if (dateA && dateB) {
        return new Date(dateA) - new Date(dateB)
      }

      // Try to parse as numbers (for legacy "Sprint X" format)
      const numA = typeof a.sprint === 'number' ? a.sprint : parseInt(a.sprint, 10)
      const numB = typeof b.sprint === 'number' ? b.sprint : parseInt(b.sprint, 10)

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      // Fallback to string comparison
      return String(a.sprint).localeCompare(String(b.sprint))
    })
    .map((sprint) => ({
      ...sprint,
      velocity: sprint.completedIssues, // Velocity by issue count (default)
      velocityPoints: sprint.completedPoints, // Velocity by story points
      completionRate: sprint.totalIssues > 0
        ? Math.round((sprint.completedIssues / sprint.totalIssues) * 100)
        : 0,
      completionRatePoints: sprint.totalPoints > 0
        ? Math.round((sprint.completedPoints / sprint.totalPoints) * 100)
        : 0
    }))

  return velocityData
}

/**
 * Calculate average velocity over last N sprints
 * Returns both issue count and story points averages
 * @param {Array} velocityData - Array of sprint velocity data
 * @param {number} lastNSprints - Number of sprints to average (default: 3)
 * @param {string} currentSprintName - Optional: name of current sprint to use as end point
 */
export function calculateAverageVelocity(velocityData, lastNSprints = 3, currentSprintName = null) {
  if (!velocityData || velocityData.length === 0) {
    return { byIssues: 0, byPoints: 0 }
  }

  // Find the current sprint index (to avoid using future sprints)
  let currentIndex = velocityData.length - 1
  if (currentSprintName) {
    const foundIndex = velocityData.findIndex(s => s.sprint === currentSprintName)
    if (foundIndex >= 0) {
      currentIndex = foundIndex
    }
  }

  // Take N sprints up to and including current sprint
  const startIndex = Math.max(0, currentIndex - lastNSprints + 1)
  const recentSprints = velocityData.slice(startIndex, currentIndex + 1)

  if (recentSprints.length === 0) {
    return { byIssues: 0, byPoints: 0 }
  }

  const totalVelocity = recentSprints.reduce((sum, s) => sum + s.velocity, 0)
  const totalPoints = recentSprints.reduce((sum, s) => sum + (s.velocityPoints || 0), 0)

  return {
    byIssues: Math.round(totalVelocity / recentSprints.length),
    byPoints: Math.round(totalPoints / recentSprints.length)
  }
}

/**
 * Legacy function for backwards compatibility
 * Returns only issue count average
 */
export function calculateAverageVelocityLegacy(velocityData, lastNSprints = 3) {
  const result = calculateAverageVelocity(velocityData, lastNSprints)
  return typeof result === 'object' ? result.byIssues : result
}

/**
 * Calculate velocity trend (positive = improving, negative = declining)
 * Returns both short-term (sprint-to-sprint) and long-term (moving average) trends
 * @param {Array} velocityData - Array of sprint velocity data
 * @param {string} currentSprintName - Optional: name of current sprint to use instead of most recent
 * @returns {Object} { shortTerm, longTerm } - Both trend percentages
 */
export function calculateVelocityTrend(velocityData, currentSprintName = null) {
  if (!velocityData || velocityData.length < 2) {
    return { shortTerm: 0, longTerm: 0 }
  }

  // Find the current sprint index (to avoid using future sprints)
  let currentIndex = velocityData.length - 1
  if (currentSprintName) {
    const foundIndex = velocityData.findIndex(s => s.sprint === currentSprintName)
    if (foundIndex >= 0) {
      currentIndex = foundIndex
    }
  }

  // Need at least one previous sprint
  if (currentIndex < 1) {
    return { shortTerm: 0, longTerm: 0 }
  }

  // SHORT-TERM TREND: Current sprint vs previous sprint
  const currentSprint = velocityData[currentIndex]
  const previousSprint = velocityData[currentIndex - 1]

  let shortTerm = 0
  if (previousSprint.velocity > 0) {
    shortTerm = Math.round(((currentSprint.velocity - previousSprint.velocity) / previousSprint.velocity) * 100)
  }

  // LONG-TERM TREND: Average of last 3 sprints vs average of 3 sprints before that
  let longTerm = 0

  // Need at least 4 sprints for long-term trend (2 groups of 2+ sprints)
  if (currentIndex >= 3) {
    // Recent 3 sprints (including current)
    const recentStart = Math.max(0, currentIndex - 2)
    const recentSprints = velocityData.slice(recentStart, currentIndex + 1)
    const recentAvg = recentSprints.reduce((sum, s) => sum + s.velocity, 0) / recentSprints.length

    // Previous 3 sprints (before the recent group)
    const previousStart = Math.max(0, recentStart - 3)
    const previousEnd = recentStart
    const previousSprints = velocityData.slice(previousStart, previousEnd)

    if (previousSprints.length > 0) {
      const previousAvg = previousSprints.reduce((sum, s) => sum + s.velocity, 0) / previousSprints.length

      if (previousAvg > 0) {
        longTerm = Math.round(((recentAvg - previousAvg) / previousAvg) * 100)
      }
    }
  }

  return { shortTerm, longTerm }
}

/**
 * Legacy function for backwards compatibility
 * Returns only the short-term trend as a number
 */
export function calculateVelocityTrendLegacy(velocityData, currentSprintName = null) {
  const result = calculateVelocityTrend(velocityData, currentSprintName)
  return typeof result === 'object' ? result.shortTerm : result
}

/**
 * Calculate burndown data for current sprint
 * Supports both issue count and story points modes
 * @param {Array} issues - All issues
 * @param {string} currentSprint - Current sprint name
 * @param {string} mode - 'issues' or 'points' (default: 'issues')
 */
export function calculateBurndown(issues, currentSprint, mode = 'issues') {
  if (!issues || !currentSprint) {
    return { actual: [], ideal: [], total: 0, mode }
  }

  const sprintIssues = issues.filter(
    (issue) => getSprintFromLabels(issue.labels, issue.iteration) === currentSprint
  )

  if (sprintIssues.length === 0) {
    return { actual: [], ideal: [], total: 0, mode }
  }

  // Try to get sprint dates from iteration object
  let sprintStart = null
  let sprintEnd = null

  // Find any issue in this sprint that has iteration dates
  const issueWithIteration = sprintIssues.find(i => i.iteration?.start_date)
  if (issueWithIteration && issueWithIteration.iteration) {
    if (issueWithIteration.iteration.start_date) {
      sprintStart = new Date(issueWithIteration.iteration.start_date)
      sprintStart.setHours(0, 0, 0, 0) // Normalize to start of day
    }
    if (issueWithIteration.iteration.due_date) {
      sprintEnd = new Date(issueWithIteration.iteration.due_date)
      sprintEnd.setHours(23, 59, 59, 999) // Normalize to end of day
    }
  }

  // Fallback: use earliest created_at if no iteration dates
  if (!sprintStart) {
    const createdDates = sprintIssues
      .map((i) => new Date(i.created_at))
      .filter((d) => !isNaN(d))

    if (createdDates.length === 0) {
      return { actual: [], ideal: [], total: 0 }
    }

    sprintStart = new Date(Math.min(...createdDates))
    sprintStart.setHours(0, 0, 0, 0) // Normalize to start of day
  }

  // If no end date, assume 2-week sprint
  if (!sprintEnd) {
    const sprintDuration = 14 * 24 * 60 * 60 * 1000 // 14 days in milliseconds
    sprintEnd = new Date(sprintStart.getTime() + sprintDuration)
    sprintEnd.setHours(23, 59, 59, 999) // Normalize to end of day
  }

  // Create today using local date components to avoid timezone issues
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Calculate totals based on mode
  const totalIssues = sprintIssues.length
  const totalPoints = sprintIssues.reduce((sum, issue) => sum + (issue.weight || 0), 0)
  const total = mode === 'points' ? totalPoints : totalIssues

  // Generate ideal burndown line (linear)
  const idealData = []
  // Calculate days more accurately - use floor since we're working with normalized dates
  const daysDiff = (sprintEnd - sprintStart) / (24 * 60 * 60 * 1000)
  const days = Math.round(daysDiff)  // Round to nearest whole day

  for (let day = 0; day <= days; day++) {
    const date = new Date(sprintStart.getTime() + day * 24 * 60 * 60 * 1000)

    // Don't generate points beyond sprint end date
    if (date > sprintEnd) break

    // Use local date string to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const dayStr = String(date.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${dayStr}`

    const remaining = total - (total / days) * day
    idealData.push({
      date: dateKey,
      remaining: Math.max(0, Math.round(remaining))
    })
  }

  // Generate actual burndown (issues/points closed over time)
  const closedIssues = sprintIssues
    .filter((i) => i.state === 'closed' && i.closed_at)
    .map((i) => ({
      date: new Date(i.closed_at),
      issue: i,
      value: mode === 'points' ? (i.weight || 0) : 1
    }))
    .sort((a, b) => a.date - b.date)

  const actualData = []
  let remaining = total

  // Track daily progress (by issue count or points)
  const dayMap = new Map()
  closedIssues.forEach(({ date, value }) => {
    // Normalize the date and use local date string
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)
    const year = normalizedDate.getFullYear()
    const month = String(normalizedDate.getMonth() + 1).padStart(2, '0')
    const day = String(normalizedDate.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + value)
  })

  // Generate actual burndown points (start at day 0 to match ideal)
  console.log('Burndown generation:', {
    sprintStart: sprintStart.toISOString(),
    sprintEnd: sprintEnd.toISOString(),
    today: today.toISOString(),
    days,
    total,
    mode
  })

  for (let day = 0; day <= days; day++) {
    const date = new Date(sprintStart.getTime() + day * 24 * 60 * 60 * 1000)
    // Create clean date using local components to avoid timezone shift
    const cleanDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    // Stop if we're past today (don't generate future data points)
    if (cleanDate > today) break

    // Use local date string to avoid timezone issues
    const year = cleanDate.getFullYear()
    const month = String(cleanDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(cleanDate.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${dayStr}`

    console.log(`Day ${day}: ${dateKey}, cleanDate > today: ${cleanDate > today}, cleanDate: ${cleanDate.toISOString()}, today: ${today.toISOString()}`)

    // For day 0, don't check closed items (start point)
    if (day > 0 && dayMap.has(dateKey)) {
      remaining -= dayMap.get(dateKey)
    }

    actualData.push({
      date: dateKey,
      remaining: Math.max(0, remaining)
    })
  }

  console.log('Actual data points generated:', actualData.length, 'Last date:', actualData[actualData.length - 1]?.date)

  // Use local date format for return values
  const startYear = sprintStart.getFullYear()
  const startMonth = String(sprintStart.getMonth() + 1).padStart(2, '0')
  const startDay = String(sprintStart.getDate()).padStart(2, '0')
  const startDateKey = `${startYear}-${startMonth}-${startDay}`

  const endYear = sprintEnd.getFullYear()
  const endMonth = String(sprintEnd.getMonth() + 1).padStart(2, '0')
  const endDay = String(sprintEnd.getDate()).padStart(2, '0')
  const endDateKey = `${endYear}-${endMonth}-${endDay}`

  return {
    actual: actualData,
    ideal: idealData,
    total,
    totalIssues,
    totalPoints,
    mode,
    sprintStart: startDateKey,
    sprintEnd: endDateKey
  }
}

/**
 * Predict completion date based on velocity
 */
export function predictCompletion(issues, averageVelocity) {
  if (!issues || averageVelocity === 0) {
    return null
  }

  const openIssues = issues.filter((i) => i.state === 'opened').length

  if (openIssues === 0) {
    return {
      date: new Date().toISOString().split('T')[0],
      sprintsRemaining: 0,
      confidence: 100
    }
  }

  // Calculate sprints needed
  const sprintsRemaining = Math.ceil(openIssues / averageVelocity)

  // Assume 2-week sprints
  const today = new Date()
  const completionDate = new Date(
    today.getTime() + sprintsRemaining * 14 * 24 * 60 * 60 * 1000
  )

  // Calculate confidence (higher velocity = higher confidence)
  const confidence = Math.min(95, 60 + averageVelocity * 2)

  return {
    date: completionDate.toISOString().split('T')[0],
    sprintsRemaining,
    confidence: Math.round(confidence),
    openIssues
  }
}

/**
 * Get current active sprint based on today's date
 * Returns the iteration where today falls between start_date and due_date
 */
export function getCurrentSprint(issues) {
  if (!issues || issues.length === 0) return null

  // Build a map of iteration name to date range
  const iterationRanges = new Map()

  issues.forEach((issue) => {
    const sprint = getSprintFromLabels(issue.labels, issue.iteration)
    if (!sprint) return

    // Get iteration dates
    const startDate = issue.iteration?.start_date
    const endDate = issue.iteration?.due_date

    if (startDate && endDate && !iterationRanges.has(sprint)) {
      iterationRanges.set(sprint, {
        start: new Date(startDate),
        end: new Date(endDate)
      })
    }
  })

  // Find the sprint where today falls between start and end dates
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day

  for (const [sprint, range] of iterationRanges.entries()) {
    const start = new Date(range.start)
    start.setHours(0, 0, 0, 0)
    const end = new Date(range.end)
    end.setHours(23, 59, 59, 999)

    if (today >= start && today <= end) {
      return sprint
    }
  }

  // Fallback 1: If no current sprint found, find the most recently completed sprint
  // (for teams between sprints)
  let mostRecentPastSprint = null
  let mostRecentPastDate = null

  iterationRanges.forEach((range, sprint) => {
    const end = new Date(range.end)
    if (end < today && (!mostRecentPastDate || end > mostRecentPastDate)) {
      mostRecentPastDate = end
      mostRecentPastSprint = sprint
    }
  })

  if (mostRecentPastSprint) {
    return mostRecentPastSprint
  }

  // Fallback 2: If no iterations with dates, return any sprint with open issues
  const sprintsWithOpenIssues = issues
    .filter((i) => i.state === 'opened')
    .map((i) => getSprintFromLabels(i.labels, i.iteration))
    .filter((s) => s !== null)

  if (sprintsWithOpenIssues.length === 0) return null

  // Try to parse as number for legacy "Sprint X" format
  const asNumbers = sprintsWithOpenIssues
    .map(s => typeof s === 'number' ? s : parseInt(s, 10))
    .filter(n => !isNaN(n))

  if (asNumbers.length > 0) {
    return Math.max(...asNumbers)
  }

  // Otherwise return the first one
  return sprintsWithOpenIssues[0]
}

/**
 * Get all unique iteration/sprint names from issues
 * Returns array of iteration names sorted by start date (most recent first)
 */
export function getUniqueIterations(issues) {
  if (!issues || issues.length === 0) return []

  const iterationSet = new Set()

  issues.forEach((issue) => {
    const sprint = getSprintFromLabels(issue.labels, issue.iteration)
    if (sprint) {
      iterationSet.add(sprint)
    }
  })

  return Array.from(iterationSet).sort((a, b) => {
    // Try to get dates for sorting
    const issueA = issues.find(i => getSprintFromLabels(i.labels, i.iteration) === a)
    const issueB = issues.find(i => getSprintFromLabels(i.labels, i.iteration) === b)

    const dateA = issueA?.iteration?.start_date
    const dateB = issueB?.iteration?.start_date

    if (dateA && dateB) {
      return new Date(dateB) - new Date(dateA) // Most recent first
    }
    if (dateA) return -1
    if (dateB) return 1

    // Fallback: try numeric sort
    const numA = typeof a === 'number' ? a : parseInt(a, 10)
    const numB = typeof b === 'number' ? b : parseInt(b, 10)

    if (!isNaN(numA) && !isNaN(numB)) {
      return numB - numA // Highest first
    }

    // Alphabetical sort
    return String(b).localeCompare(String(a))
  })
}

/**
 * Calculate capacity impact for a sprint based on team absences
 * @param {Array} issues - Issues to extract sprint dates and team members from
 * @param {string} sprintName - Name of the sprint to analyze
 * @param {Function} getTeamAbsenceStats - Absence service function
 * @param {Function} loadTeamConfig - Team config service function
 * @returns {Object} { capacityLoss, totalCapacity, lossPercentage, absenceCount, affectedMembers, details }
 */
export function calculateSprintCapacityImpact(issues, sprintName, getTeamAbsenceStats, loadTeamConfig) {
  if (!issues || !sprintName) {
    return {
      capacityLoss: 0,
      totalCapacity: 0,
      lossPercentage: 0,
      absenceCount: 0,
      affectedMembers: [],
      details: null
    }
  }

  // Get sprint dates from issues
  const sprintIssues = issues.filter(i => getSprintFromLabels(i.labels, i.iteration) === sprintName)
  if (sprintIssues.length === 0) {
    return {
      capacityLoss: 0,
      totalCapacity: 0,
      lossPercentage: 0,
      absenceCount: 0,
      affectedMembers: [],
      details: null
    }
  }

  // Find sprint date range
  const issueWithDates = sprintIssues.find(i => i.iteration?.start_date && i.iteration?.due_date)
  if (!issueWithDates) {
    return {
      capacityLoss: 0,
      totalCapacity: 0,
      lossPercentage: 0,
      absenceCount: 0,
      affectedMembers: [],
      details: null
    }
  }

  const startDate = new Date(issueWithDates.iteration.start_date)
  const endDate = new Date(issueWithDates.iteration.due_date)

  // Load team configuration
  const teamConfig = loadTeamConfig()
  if (!teamConfig.teamMembers || teamConfig.teamMembers.length === 0) {
    return {
      capacityLoss: 0,
      totalCapacity: 0,
      lossPercentage: 0,
      absenceCount: 0,
      affectedMembers: [],
      details: null
    }
  }

  // Calculate total team capacity for the sprint (in hours)
  const sprintLengthDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  const sprintWeeks = sprintLengthDays / 7
  const totalCapacity = teamConfig.teamMembers.reduce((sum, member) => {
    const weeklyCapacity = member.defaultCapacity || 40
    return sum + (weeklyCapacity * sprintWeeks)
  }, 0)

  // Get absence statistics for this sprint
  const absenceStats = getTeamAbsenceStats(teamConfig.teamMembers, startDate, endDate)
  const capacityLoss = absenceStats.totalHoursImpact
  const lossPercentage = totalCapacity > 0 ? Math.round((capacityLoss / totalCapacity) * 100) : 0

  // Find affected members (those with absences)
  const affectedMembers = Object.entries(absenceStats.byMember)
    .filter(([_, data]) => data.hoursLost > 0)
    .map(([username, data]) => ({
      username,
      hoursLost: data.hoursLost,
      absenceCount: data.absenceCount,
      absences: data.absences
    }))

  return {
    capacityLoss: Math.round(capacityLoss),
    totalCapacity: Math.round(totalCapacity),
    lossPercentage,
    absenceCount: absenceStats.totalAbsences,
    affectedMembers,
    details: absenceStats
  }
}
