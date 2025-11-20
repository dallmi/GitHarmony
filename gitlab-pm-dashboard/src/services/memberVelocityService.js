/**
 * Member Velocity Service
 *
 * This service now acts as a backward-compatible wrapper around the unified velocity service.
 * All calculations are delegated to unifiedVelocityService.js for consistency.
 *
 * @deprecated Direct use is deprecated. Use unifiedVelocityService.js for new code.
 */

import {
  calculateUnifiedVelocity,
  getTeamManagementVelocity,
  getVelocityWithFallback,
  clearVelocityCache
} from './unifiedVelocityService'

/**
 * Calculate individual velocity for a team member
 * BACKWARD COMPATIBILITY WRAPPER - Delegates to unified service
 *
 * @param {string} username - Team member username
 * @param {Array} allIssues - All issues from GitLab
 * @param {number} memberDefaultCapacity - Member's weekly capacity in hours
 * @param {number} lookbackIterations - Number of iterations to analyze (default: 3)
 * @param {string} metricType - 'points' or 'issues' (default: 'points')
 * @returns {Object} Velocity data including hours per story point or hours per issue
 */
export function calculateMemberVelocity(username, allIssues, memberDefaultCapacity = 40, lookbackIterations = 3, metricType = 'points') {
  // Delegate to unified service
  const result = calculateUnifiedVelocity({
    issues: allIssues,
    aggregationType: 'member',
    metricType,
    lookbackIterations,
    username,
    memberCapacity: memberDefaultCapacity,
    includeAbsences: true
  })

  // Transform to match legacy format
  return {
    hoursPerStoryPoint: result.hoursPerStoryPoint,
    hoursPerIssue: result.hoursPerIssue,
    iterationsAnalyzed: result.iterationsAnalyzed,
    totalStoryPoints: result.totalMetricValue && metricType === 'points' ? result.totalMetricValue : 0,
    totalIssueCount: result.totalMetricValue && metricType === 'issues' ? result.totalMetricValue : 0,
    totalMetricValue: result.totalMetricValue || 0,
    totalHoursAvailable: result.totalHoursAvailable || 0,
    dataQuality: result.dataQuality,
    metricType,
    iterations: [] // Legacy field, not used in new implementation
  }
}

/**
 * Calculate team average velocity
 * BACKWARD COMPATIBILITY WRAPPER - Delegates to unified service
 *
 * @param {Array} teamMembers - All team members
 * @param {Array} allIssues - All issues from GitLab
 * @param {number} lookbackIterations - Number of iterations to analyze
 * @param {string} metricType - 'points' or 'issues'
 * @returns {Object} Team velocity data
 */
export function calculateTeamAverageVelocity(teamMembers, allIssues, lookbackIterations = 3, metricType = 'points') {
  // Delegate to unified service
  const result = calculateUnifiedVelocity({
    issues: allIssues,
    aggregationType: 'team',
    metricType,
    lookbackIterations,
    teamMembers,
    includeAbsences: true
  })

  // Transform to match legacy format
  return {
    hoursPerStoryPoint: result.hoursPerStoryPoint,
    hoursPerIssue: result.hoursPerIssue,
    metricType: result.metricType,
    membersAnalyzed: result.membersAnalyzed,
    dataQuality: result.dataQuality
  }
}

/**
 * Get hours per metric unit for a member with fallback logic
 * BACKWARD COMPATIBILITY WRAPPER - Delegates to unified service
 *
 * @param {string} username - Team member username
 * @param {Array} allIssues - All issues
 * @param {number} memberDefaultCapacity - Member's capacity
 * @param {Object} teamAverage - Team average velocity (pre-calculated)
 * @param {number} staticHoursPerSP - Static fallback value for story points
 * @param {number} staticHoursPerIssue - Static fallback value for issue count
 * @param {string} metricType - 'points' or 'issues'
 * @param {number} lookbackIterations - Number of iterations to analyze
 * @returns {Object} Hours per metric unit with metadata
 */
export function getHoursPerStoryPoint(username, allIssues, memberDefaultCapacity, teamAverage, staticHoursPerSP = 6, staticHoursPerIssue = 8, metricType = 'points', lookbackIterations = 3) {
  // If team average is provided, use it; otherwise calculate on-demand
  const teamMembers = teamAverage ? [] : [] // Empty array since we already have team average

  // Use the unified service's fallback logic
  const result = getVelocityWithFallback(username, allIssues, memberDefaultCapacity, teamMembers)

  // If result uses team average but we have a pre-calculated one, use it
  if (result.source === 'team-average' && teamAverage) {
    const teamHours = metricType === 'issues' ? teamAverage.hoursPerIssue : teamAverage.hoursPerStoryPoint
    if (teamHours) {
      return {
        hours: teamHours,
        source: 'team-average',
        quality: teamAverage.dataQuality,
        details: `Team average (${teamAverage.membersAnalyzed} members)`,
        metricType
      }
    }
  }

  // Override static values if different from config
  if (result.source === 'static') {
    const configuredStatic = metricType === 'issues' ? staticHoursPerIssue : staticHoursPerSP
    if (result.hours !== configuredStatic) {
      return {
        ...result,
        hours: configuredStatic
      }
    }
  }

  return result
}

// Re-export cache clearing function
export { clearVelocityCache }