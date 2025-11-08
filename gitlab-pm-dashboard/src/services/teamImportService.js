/**
 * Team Import Service
 * Automatically imports team members from GitLab issues and calculates velocity
 */

import { loadTeamConfig, saveTeamConfig } from './teamConfigService'

/**
 * Extract unique team members from issues
 */
export function extractTeamMembersFromIssues(issues) {
  const members = new Map()

  issues.forEach(issue => {
    // Add assignee
    if (issue.assignee) {
      const key = issue.assignee.username
      if (!members.has(key)) {
        members.set(key, {
          username: issue.assignee.username,
          name: issue.assignee.name || issue.assignee.username,
          avatarUrl: issue.assignee.avatar_url || issue.assignee.web_url?.replace(/users\/.*/, `users/${issue.assignee.username}.png`),
          role: 'Developer', // Default role
          defaultCapacity: 40, // Default capacity
          source: 'gitlab',
          lastSeen: issue.updated_at
        })
      }
    }

    // Add author if different from assignee
    if (issue.author && issue.author.username !== issue.assignee?.username) {
      const key = issue.author.username
      if (!members.has(key)) {
        members.set(key, {
          username: issue.author.username,
          name: issue.author.name || issue.author.username,
          avatarUrl: issue.author.avatar_url || issue.author.web_url?.replace(/users\/.*/, `users/${issue.author.username}.png`),
          role: 'Developer',
          defaultCapacity: 40,
          source: 'gitlab',
          lastSeen: issue.updated_at
        })
      }
    }
  })

  return Array.from(members.values())
}

/**
 * Calculate velocity for team members (last 90 days by default)
 */
export function calculateMemberVelocity(issues, member, daysBack = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  // Filter issues for this member in the time period
  const memberIssues = issues.filter(issue => {
    if (issue.assignee?.username !== member.username) return false

    // Check if closed within the time period
    if (issue.state === 'closed' && issue.closed_at) {
      const closedDate = new Date(issue.closed_at)
      return closedDate >= cutoffDate
    }

    return false
  })

  // Calculate story points completed
  let totalPoints = 0
  let totalTimeSpent = 0
  let issueCount = 0

  memberIssues.forEach(issue => {
    // Story points from labels
    const spLabel = issue.labels?.find(l => l.startsWith('sp::'))
    if (spLabel) {
      const points = parseInt(spLabel.replace('sp::', ''))
      if (!isNaN(points)) {
        totalPoints += points
      }
    }

    // Time tracking
    if (issue.time_stats?.total_time_spent) {
      totalTimeSpent += issue.time_stats.total_time_spent / 3600 // Convert to hours
    }

    issueCount++
  })

  // Calculate weeks in period
  const weeksInPeriod = daysBack / 7

  return {
    totalPoints,
    totalTimeSpent: Math.round(totalTimeSpent),
    issueCount,
    averagePointsPerWeek: weeksInPeriod > 0 ? Math.round((totalPoints / weeksInPeriod) * 10) / 10 : 0,
    averageHoursPerWeek: weeksInPeriod > 0 ? Math.round((totalTimeSpent / weeksInPeriod) * 10) / 10 : 0,
    periodDays: daysBack
  }
}

/**
 * Smart merge of imported members with existing configuration
 */
export function mergeTeamMembers(existingMembers, importedMembers, issues) {
  const merged = new Map()

  // Start with existing members (preserve custom settings)
  existingMembers.forEach(member => {
    merged.set(member.username, { ...member })
  })

  // Add or update with imported members
  importedMembers.forEach(imported => {
    if (merged.has(imported.username)) {
      // Update only GitLab-sourced fields
      const existing = merged.get(imported.username)
      merged.set(imported.username, {
        ...existing,
        name: imported.name || existing.name,
        avatarUrl: imported.avatarUrl || existing.avatarUrl,
        lastSeen: imported.lastSeen
      })
    } else {
      // New member - calculate velocity
      const velocity = calculateMemberVelocity(issues, imported)

      // Estimate capacity based on velocity
      let estimatedCapacity = 40 // Default
      if (velocity.averageHoursPerWeek > 0) {
        // Round to nearest 5 hours
        estimatedCapacity = Math.round(velocity.averageHoursPerWeek / 5) * 5
        // Cap between 10 and 60 hours
        estimatedCapacity = Math.max(10, Math.min(60, estimatedCapacity))
      }

      merged.set(imported.username, {
        ...imported,
        defaultCapacity: estimatedCapacity,
        velocity
      })
    }
  })

  // Calculate velocity for all members
  const result = Array.from(merged.values())
  result.forEach(member => {
    if (!member.velocity) {
      member.velocity = calculateMemberVelocity(issues, member)
    }
  })

  return result
}

/**
 * Import team members from issues with smart detection
 */
export function importTeamFromIssues(issues, options = {}) {
  const {
    autoDetectRoles = true,
    preserveCustomSettings = true,
    velocityPeriodDays = 90
  } = options

  // Get existing configuration
  const existingConfig = loadTeamConfig()
  const existingMembers = existingConfig.teamMembers || []

  // Extract members from issues
  const importedMembers = extractTeamMembersFromIssues(issues)

  // Auto-detect roles based on issue labels and activity
  if (autoDetectRoles) {
    importedMembers.forEach(member => {
      const memberIssues = issues.filter(i =>
        i.assignee?.username === member.username ||
        i.author?.username === member.username
      )

      // Check for role indicators in labels
      const hasTestingLabels = memberIssues.some(i =>
        i.labels?.some(l => l.toLowerCase().includes('test') || l.toLowerCase().includes('qa'))
      )
      const hasDevOpsLabels = memberIssues.some(i =>
        i.labels?.some(l => l.toLowerCase().includes('devops') || l.toLowerCase().includes('infrastructure'))
      )
      const hasAnalysisLabels = memberIssues.some(i =>
        i.labels?.some(l => l.toLowerCase().includes('analysis') || l.toLowerCase().includes('requirement'))
      )

      // Set role based on activity
      if (hasTestingLabels) {
        member.role = 'QA Engineer'
      } else if (hasDevOpsLabels) {
        member.role = 'DevOps Engineer'
      } else if (hasAnalysisLabels) {
        member.role = 'Business Analyst'
      }
      // Keep default 'Developer' otherwise
    })
  }

  // Merge with existing configuration
  const mergedMembers = preserveCustomSettings
    ? mergeTeamMembers(existingMembers, importedMembers, issues)
    : importedMembers

  return {
    members: mergedMembers,
    imported: importedMembers.length,
    existing: existingMembers.length,
    new: mergedMembers.length - existingMembers.length
  }
}

/**
 * Calculate team velocity statistics
 */
export function calculateTeamVelocity(issues, teamMembers, daysBack = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  // Get all closed issues in period
  const closedIssues = issues.filter(issue => {
    if (issue.state !== 'closed' || !issue.closed_at) return false
    const closedDate = new Date(issue.closed_at)
    return closedDate >= cutoffDate
  })

  // Calculate totals
  let totalPoints = 0
  let totalTimeSpent = 0
  let totalTimeEstimate = 0

  closedIssues.forEach(issue => {
    // Story points
    const spLabel = issue.labels?.find(l => l.startsWith('sp::'))
    if (spLabel) {
      const points = parseInt(spLabel.replace('sp::', ''))
      if (!isNaN(points)) totalPoints += points
    }

    // Time tracking
    if (issue.time_stats) {
      if (issue.time_stats.total_time_spent) {
        totalTimeSpent += issue.time_stats.total_time_spent / 3600
      }
      if (issue.time_stats.time_estimate) {
        totalTimeEstimate += issue.time_stats.time_estimate / 3600
      }
    }
  })

  const weeksInPeriod = daysBack / 7

  // Calculate hours per story point (if we have both data)
  let hoursPerStoryPoint = 6 // Default
  if (totalPoints > 0 && totalTimeSpent > 0) {
    hoursPerStoryPoint = Math.round((totalTimeSpent / totalPoints) * 10) / 10
  }

  return {
    periodDays: daysBack,
    closedIssues: closedIssues.length,
    totalPoints,
    totalHoursSpent: Math.round(totalTimeSpent),
    totalHoursEstimated: Math.round(totalTimeEstimate),
    averagePointsPerWeek: weeksInPeriod > 0 ? Math.round((totalPoints / weeksInPeriod) * 10) / 10 : 0,
    averageHoursPerWeek: weeksInPeriod > 0 ? Math.round((totalTimeSpent / weeksInPeriod) * 10) / 10 : 0,
    hoursPerStoryPoint,
    estimateAccuracy: totalTimeEstimate > 0 ? Math.round((totalTimeSpent / totalTimeEstimate) * 100) : null
  }
}