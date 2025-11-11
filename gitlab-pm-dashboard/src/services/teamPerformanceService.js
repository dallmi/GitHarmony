/**
 * Team Performance Service
 * Analyzes team member contributions, workload distribution, and identifies burnout risks
 * Provides people-focused metrics for executive decision-making
 */

import { loadTeamConfig } from './teamConfigService'
import { loadAbsences } from './absenceService'

/**
 * Calculate team member contributions over a time range
 * Returns top contributors with detailed metrics
 */
export function calculateTeamMemberContributions(issues, daysBack = 30) {
  if (!issues || issues.length === 0) {
    return []
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  // Filter issues closed in the time range
  const recentIssues = issues.filter(issue => {
    if (!issue.closed_at) return false
    const closedDate = new Date(issue.closed_at)
    return closedDate >= cutoffDate
  })

  // Group by assignee
  const contributionsByMember = {}

  recentIssues.forEach(issue => {
    const assignee = issue.assignees?.[0]?.name || issue.assignee?.name || 'Unassigned'

    if (!contributionsByMember[assignee]) {
      contributionsByMember[assignee] = {
        name: assignee,
        issuesCompleted: 0,
        storyPoints: 0,
        avgCycleTime: [],
        labels: {}
      }
    }

    contributionsByMember[assignee].issuesCompleted++

    // Add story points if available
    const points = extractStoryPoints(issue)
    if (points > 0) {
      contributionsByMember[assignee].storyPoints += points
    }

    // Calculate cycle time
    if (issue.created_at && issue.closed_at) {
      const created = new Date(issue.created_at)
      const closed = new Date(issue.closed_at)
      const cycleTime = Math.ceil((closed - created) / (1000 * 60 * 60 * 24))
      contributionsByMember[assignee].avgCycleTime.push(cycleTime)
    }

    // Track label distribution (complexity indicators)
    issue.labels?.forEach(label => {
      if (!contributionsByMember[assignee].labels[label]) {
        contributionsByMember[assignee].labels[label] = 0
      }
      contributionsByMember[assignee].labels[label]++
    })
  })

  // Calculate averages and format results
  const contributors = Object.values(contributionsByMember).map(member => {
    const avgCycleTime = member.avgCycleTime.length > 0
      ? Math.round(member.avgCycleTime.reduce((sum, time) => sum + time, 0) / member.avgCycleTime.length)
      : 0

    return {
      name: member.name,
      issuesCompleted: member.issuesCompleted,
      storyPoints: member.storyPoints,
      avgCycleTime,
      velocity: member.storyPoints / (daysBack / 7), // Story points per week
      topLabels: Object.entries(member.labels)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label]) => label)
    }
  })

  // Sort by issues completed (descending)
  return contributors.sort((a, b) => b.issuesCompleted - a.issuesCompleted)
}

/**
 * Calculate current workload distribution across team
 * Shows who has how many open issues assigned
 */
export function calculateWorkloadDistribution(issues) {
  if (!issues || issues.length === 0) {
    return []
  }

  const teamConfig = loadTeamConfig()
  const teamMembers = teamConfig.teamMembers || []
  const absenceData = loadAbsences()
  const absenceCalendar = absenceData.absences || []
  const today = new Date()

  // Get open issues
  const openIssues = issues.filter(issue => issue.state === 'opened')

  // Initialize workload for all team members
  const workloadByMember = {}

  teamMembers.forEach(member => {
    workloadByMember[member.username] = {
      name: member.username,
      role: member.role,
      openIssues: 0,
      storyPoints: 0,
      isOnLeave: false,
      overdueIssues: 0,
      avgIssueAge: []
    }

    // Check if member is currently on leave
    const memberAbsences = absenceCalendar.filter(a => a.username === member.username)
    memberAbsences.forEach(absence => {
      const startDate = new Date(absence.startDate)
      const endDate = new Date(absence.endDate)
      if (today >= startDate && today <= endDate) {
        workloadByMember[member.username].isOnLeave = true
      }
    })
  })

  // Count open issues by assignee
  openIssues.forEach(issue => {
    const assignee = issue.assignees?.[0]?.name || issue.assignee?.name

    if (assignee && workloadByMember[assignee]) {
      workloadByMember[assignee].openIssues++

      const points = extractStoryPoints(issue)
      if (points > 0) {
        workloadByMember[assignee].storyPoints += points
      }

      // Check if overdue
      if (issue.due_date) {
        const dueDate = new Date(issue.due_date)
        if (dueDate < today) {
          workloadByMember[assignee].overdueIssues++
        }
      }

      // Calculate issue age
      if (issue.created_at) {
        const created = new Date(issue.created_at)
        const age = Math.ceil((today - created) / (1000 * 60 * 60 * 24))
        workloadByMember[assignee].avgIssueAge.push(age)
      }
    }
  })

  // Calculate averages and format results
  return Object.values(workloadByMember).map(member => {
    const avgIssueAge = member.avgIssueAge.length > 0
      ? Math.round(member.avgIssueAge.reduce((sum, age) => sum + age, 0) / member.avgIssueAge.length)
      : 0

    return {
      name: member.name,
      role: member.role,
      openIssues: member.openIssues,
      storyPoints: member.storyPoints,
      overdueIssues: member.overdueIssues,
      avgIssueAge,
      isOnLeave: member.isOnLeave
    }
  }).sort((a, b) => b.openIssues - a.openIssues)
}

/**
 * Identify team members at risk of burnout
 * Based on workload, overdue items, and leave patterns
 */
export function identifyBurnoutRisks(issues) {
  const workload = calculateWorkloadDistribution(issues)
  const risks = []

  // Calculate team average workload
  const activeMembers = workload.filter(m => !m.isOnLeave)
  if (activeMembers.length === 0) return risks

  const avgOpenIssues = activeMembers.reduce((sum, m) => sum + m.openIssues, 0) / activeMembers.length
  const avgStoryPoints = activeMembers.reduce((sum, m) => sum + m.storyPoints, 0) / activeMembers.length

  workload.forEach(member => {
    if (member.isOnLeave) return // Skip members on leave

    const riskFactors = []
    let riskScore = 0

    // Factor 1: Significantly above average workload (>150%)
    if (member.openIssues > avgOpenIssues * 1.5) {
      riskFactors.push(`${member.openIssues} open issues (team avg: ${Math.round(avgOpenIssues)})`)
      riskScore += 30
    }

    // Factor 2: High story points burden (>150% of average)
    if (member.storyPoints > avgStoryPoints * 1.5) {
      riskFactors.push(`${member.storyPoints} story points (team avg: ${Math.round(avgStoryPoints)})`)
      riskScore += 25
    }

    // Factor 3: Multiple overdue issues
    if (member.overdueIssues >= 3) {
      riskFactors.push(`${member.overdueIssues} overdue issues`)
      riskScore += 20
    }

    // Factor 4: Old stagnant issues
    if (member.avgIssueAge > 45) {
      riskFactors.push(`Average issue age: ${member.avgIssueAge} days`)
      riskScore += 15
    }

    // Factor 5: Extremely high workload (>200%)
    if (member.openIssues > avgOpenIssues * 2) {
      riskFactors.push('Critical overload')
      riskScore += 30
    }

    if (riskScore >= 30) {
      risks.push({
        name: member.name,
        role: member.role,
        riskScore,
        riskLevel: riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
        riskFactors,
        openIssues: member.openIssues,
        storyPoints: member.storyPoints,
        overdueIssues: member.overdueIssues
      })
    }
  })

  return risks.sort((a, b) => b.riskScore - a.riskScore)
}

/**
 * Get team velocity trends by member (last 4 weeks)
 */
export function getTeamVelocityByMember(issues) {
  if (!issues || issues.length === 0) {
    return []
  }

  const teamConfig = loadTeamConfig()
  const teamMembers = teamConfig.teamMembers || []
  const weeks = 4
  const today = new Date()

  // Initialize data structure
  const velocityByMember = {}
  teamMembers.forEach(member => {
    velocityByMember[member.username] = {
      name: member.username,
      role: member.role,
      weeklyVelocity: Array(weeks).fill(0),
      weeklyIssues: Array(weeks).fill(0),
      trend: 'stable'
    }
  })

  // Process closed issues from last 4 weeks
  issues.filter(issue => issue.closed_at).forEach(issue => {
    const closedDate = new Date(issue.closed_at)
    const weeksAgo = Math.floor((today - closedDate) / (7 * 24 * 60 * 60 * 1000))

    if (weeksAgo < weeks && weeksAgo >= 0) {
      const assignee = issue.assignees?.[0]?.name || issue.assignee?.name
      if (assignee && velocityByMember[assignee]) {
        const points = extractStoryPoints(issue)
        velocityByMember[assignee].weeklyVelocity[weeks - 1 - weeksAgo] += points
        velocityByMember[assignee].weeklyIssues[weeks - 1 - weeksAgo]++
      }
    }
  })

  // Calculate trends
  return Object.values(velocityByMember).map(member => {
    const recentWeeks = member.weeklyVelocity.slice(-2)
    const olderWeeks = member.weeklyVelocity.slice(0, 2)

    const recentAvg = recentWeeks.reduce((sum, v) => sum + v, 0) / 2
    const olderAvg = olderWeeks.reduce((sum, v) => sum + v, 0) / 2

    let trend = 'stable'
    if (recentAvg > olderAvg * 1.2) trend = 'increasing'
    else if (recentAvg < olderAvg * 0.8) trend = 'decreasing'

    const totalVelocity = member.weeklyVelocity.reduce((sum, v) => sum + v, 0)
    const avgVelocity = totalVelocity / weeks

    return {
      name: member.name,
      role: member.role,
      weeklyVelocity: member.weeklyVelocity,
      weeklyIssues: member.weeklyIssues,
      avgVelocity: Math.round(avgVelocity * 10) / 10,
      totalIssues: member.weeklyIssues.reduce((sum, i) => sum + i, 0),
      trend
    }
  }).sort((a, b) => b.avgVelocity - a.avgVelocity)
}

/**
 * Extract story points from issue weight, labels, or title
 */
function extractStoryPoints(issue) {
  // First, check GitLab's native weight property (most common)
  if (issue.weight !== undefined && issue.weight !== null) {
    return issue.weight
  }

  // Check labels for story points
  if (issue.labels) {
    for (const label of issue.labels) {
      const match = label.match(/^(?:story points?|sp|points?)[:=\s]*(\d+)$/i)
      if (match) {
        return parseInt(match[1], 10)
      }
    }
  }

  // Check title for story points in brackets
  if (issue.title) {
    const match = issue.title.match(/\[(\d+)\s*(?:sp|pts?|points?)?\]/i)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return 0
}

/**
 * Get team performance summary
 */
export function getTeamPerformanceSummary(issues, daysBack = 30) {
  const contributions = calculateTeamMemberContributions(issues, daysBack)
  const workload = calculateWorkloadDistribution(issues)
  const burnoutRisks = identifyBurnoutRisks(issues)
  const velocityTrends = getTeamVelocityByMember(issues)

  const totalCompleted = contributions.reduce((sum, c) => sum + c.issuesCompleted, 0)
  const totalStoryPoints = contributions.reduce((sum, c) => sum + c.storyPoints, 0)

  // If team config exists, use configured members; otherwise, count actual contributors
  let activeMembers = workload.filter(m => !m.isOnLeave).length
  if (activeMembers === 0 && contributions.length > 0) {
    // No team config, but we have contributors from the data
    activeMembers = contributions.filter(c => c.name !== 'Unassigned').length
  }

  return {
    topContributors: contributions.slice(0, 5),
    workloadDistribution: workload,
    burnoutRisks,
    velocityTrends,
    summary: {
      activeMembers,
      totalCompleted,
      totalStoryPoints,
      avgVelocityPerMember: activeMembers > 0 ? Math.round((totalStoryPoints / activeMembers) * 10) / 10 : 0,
      membersAtRisk: burnoutRisks.length,
      membersOnLeave: workload.filter(m => m.isOnLeave).length
    }
  }
}
