/**
 * Unified Velocity Service
 *
 * Single source of truth for all velocity calculations across the application.
 * Supports both sprint-level (Analytics) and member-level (Team Management) velocity.
 *
 * Key Features:
 * - Unified calculation engine for consistency
 * - Supports separate lookback periods for Analytics vs Team Management
 * - Flexible aggregation (by sprint, by member, by team)
 * - Configurable metric type (story points vs issue count)
 * - Built-in caching for performance
 * - Backward compatible with existing services
 */

import { getSprintFromLabels } from '../utils/labelUtils'
import { calculateAbsenceImpact } from './absenceService'
import { loadVelocityConfig } from './velocityConfigService'

// Cache for velocity calculations to improve performance
const velocityCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Clear the velocity cache (call when data changes)
 */
export function clearVelocityCache() {
  velocityCache.clear()
}

/**
 * Get cache key for velocity calculations
 */
function getCacheKey(type, params) {
  return `${type}:${JSON.stringify(params)}`
}

/**
 * Core velocity calculation engine
 *
 * @param {Object} options - Configuration options
 * @param {Array} options.issues - Array of GitLab issues
 * @param {string} options.aggregationType - 'sprint' | 'member' | 'team'
 * @param {string} options.metricType - 'points' | 'issues'
 * @param {number} options.lookbackIterations - Number of iterations to analyze
 * @param {string} options.username - Username for member-specific calculations
 * @param {number} options.memberCapacity - Member's weekly capacity in hours
 * @param {Array} options.teamMembers - Team members for team calculations
 * @param {boolean} options.includeAbsences - Whether to factor in absences
 * @returns {Object} Velocity calculation results
 */
export function calculateUnifiedVelocity(options) {
  const {
    issues,
    aggregationType = 'sprint',
    metricType = 'points',
    lookbackIterations = 3,
    username = null,
    memberCapacity = 40,
    teamMembers = [],
    includeAbsences = true
  } = options

  // Check cache
  const cacheKey = getCacheKey(aggregationType, options)
  const cached = velocityCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data
  }

  let result

  switch (aggregationType) {
    case 'sprint':
      result = calculateSprintVelocity(issues, metricType, lookbackIterations)
      break
    case 'member':
      result = calculateMemberVelocityCore(
        issues,
        username,
        memberCapacity,
        metricType,
        lookbackIterations,
        includeAbsences
      )
      break
    case 'team':
      result = calculateTeamVelocity(
        issues,
        teamMembers,
        metricType,
        lookbackIterations,
        includeAbsences
      )
      break
    default:
      throw new Error(`Unknown aggregation type: ${aggregationType}`)
  }

  // Cache the result
  velocityCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  })

  return result
}

/**
 * Calculate sprint-level velocity (for Analytics view)
 */
function calculateSprintVelocity(issues, metricType, lookbackIterations) {
  if (!issues || issues.length === 0) {
    return {
      velocityData: [],
      avgVelocity: { byIssues: 0, byPoints: 0 },
      dataQuality: 'no-data'
    }
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
        startDate: issue.iteration?.start_date,
        endDate: issue.iteration?.due_date
      })
    }

    const sprintData = sprintMap.get(sprint)

    // Extract story points
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
    // Fallback to weight field
    if (storyPoints === 0 && issue.weight) {
      storyPoints = parseInt(issue.weight) || 0
    }

    sprintData.totalIssues++
    sprintData.totalPoints += storyPoints

    if (issue.state === 'closed') {
      sprintData.completedIssues++
      sprintData.completedPoints += storyPoints
    } else {
      sprintData.openIssues++
      sprintData.openPoints += storyPoints
    }
  })

  // Sort sprints and calculate velocity
  const velocityData = Array.from(sprintMap.values())
    .sort((a, b) => {
      if (a.endDate && b.endDate) {
        return new Date(b.endDate) - new Date(a.endDate)
      }
      return 0
    })
    .map(sprint => ({
      ...sprint,
      velocity: sprint.completedIssues,
      velocityPoints: sprint.completedPoints,
      completionRate: sprint.totalIssues > 0
        ? Math.round((sprint.completedIssues / sprint.totalIssues) * 100)
        : 0,
      completionRatePoints: sprint.totalPoints > 0
        ? Math.round((sprint.completedPoints / sprint.totalPoints) * 100)
        : 0
    }))

  // Calculate average velocity for the lookback period
  const recentSprints = velocityData.slice(0, lookbackIterations)
  const avgVelocity = {
    byIssues: 0,
    byPoints: 0
  }

  if (recentSprints.length > 0) {
    const totalIssues = recentSprints.reduce((sum, s) => sum + s.completedIssues, 0)
    const totalPoints = recentSprints.reduce((sum, s) => sum + s.completedPoints, 0)

    avgVelocity.byIssues = Math.round(totalIssues / recentSprints.length)
    avgVelocity.byPoints = Math.round(totalPoints / recentSprints.length)
  }

  // Determine data quality
  let dataQuality = 'excellent'
  if (recentSprints.length < lookbackIterations) {
    dataQuality = recentSprints.length < 2 ? 'low' : 'moderate'
  }

  return {
    velocityData,
    avgVelocity,
    dataQuality,
    sprintsAnalyzed: recentSprints.length
  }
}

/**
 * Calculate member-level velocity (for Team Management)
 */
function calculateMemberVelocityCore(issues, username, memberCapacity, metricType, lookbackIterations, includeAbsences) {
  if (!username || !issues || issues.length === 0) {
    return {
      hoursPerStoryPoint: null,
      hoursPerIssue: null,
      iterationsAnalyzed: 0,
      dataQuality: 'no-data'
    }
  }

  // Filter for member's closed issues with iterations
  const memberIssues = issues.filter(issue => {
    const isAssigned =
      issue.assignee?.username === username ||
      issue.assignees?.some(a => a.username === username)

    return isAssigned &&
      issue.state === 'closed' &&
      issue.iteration?.start_date &&
      issue.iteration?.due_date
  })

  if (memberIssues.length === 0) {
    return {
      hoursPerStoryPoint: null,
      hoursPerIssue: null,
      iterationsAnalyzed: 0,
      dataQuality: 'no-history'
    }
  }

  // Group by iteration
  const iterationMap = new Map()

  memberIssues.forEach(issue => {
    const iterationName = getSprintFromLabels(issue.labels, issue.iteration)
    if (!iterationName) return

    // Extract story points
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
    if (storyPoints === 0 && issue.weight) {
      storyPoints = parseInt(issue.weight) || 0
    }

    // For issue count mode, count all; for points mode, only count with points
    const shouldInclude = metricType === 'issues' || storyPoints > 0
    if (!shouldInclude) return

    if (!iterationMap.has(iterationName)) {
      iterationMap.set(iterationName, {
        name: iterationName,
        startDate: new Date(issue.iteration.start_date),
        endDate: new Date(issue.iteration.due_date),
        storyPoints: 0,
        issueCount: 0
      })
    }

    const iteration = iterationMap.get(iterationName)
    iteration.storyPoints += storyPoints
    iteration.issueCount++
  })

  // Sort by date and take recent iterations
  const iterations = Array.from(iterationMap.values())
    .sort((a, b) => b.endDate - a.endDate)
    .slice(0, lookbackIterations)

  if (iterations.length === 0) {
    return {
      hoursPerStoryPoint: null,
      hoursPerIssue: null,
      iterationsAnalyzed: 0,
      dataQuality: 'no-completed-work'
    }
  }

  // Calculate capacity and velocity
  let totalMetricValue = 0
  let totalHoursAvailable = 0

  iterations.forEach(iteration => {
    // Calculate working days
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

    const dailyHours = memberCapacity / 5
    let iterationCapacity = workDays * dailyHours

    // Factor in absences if enabled
    if (includeAbsences) {
      const absenceHours = calculateAbsenceImpact(
        username,
        iteration.startDate,
        iteration.endDate,
        memberCapacity
      )
      iterationCapacity = Math.max(0, iterationCapacity - absenceHours)
    }

    totalMetricValue += metricType === 'issues' ? iteration.issueCount : iteration.storyPoints
    totalHoursAvailable += iterationCapacity
  })

  // Calculate hours per metric
  const hoursPerMetric = totalMetricValue > 0
    ? totalHoursAvailable / totalMetricValue
    : null

  // Determine data quality
  let dataQuality = 'excellent'
  if (iterations.length < 3) {
    dataQuality = iterations.length === 1 ? 'low' : 'moderate'
  }

  return {
    hoursPerStoryPoint: metricType === 'points' ? (hoursPerMetric ? Math.round(hoursPerMetric * 10) / 10 : null) : null,
    hoursPerIssue: metricType === 'issues' ? (hoursPerMetric ? Math.round(hoursPerMetric * 10) / 10 : null) : null,
    iterationsAnalyzed: iterations.length,
    dataQuality,
    metricType,
    totalMetricValue,
    totalHoursAvailable: Math.round(totalHoursAvailable)
  }
}

/**
 * Calculate team-level velocity
 */
function calculateTeamVelocity(issues, teamMembers, metricType, lookbackIterations, includeAbsences) {
  if (!teamMembers || teamMembers.length === 0) {
    return {
      hoursPerStoryPoint: null,
      hoursPerIssue: null,
      membersAnalyzed: 0,
      dataQuality: 'insufficient'
    }
  }

  const memberVelocities = teamMembers
    .map(member => {
      const velocity = calculateMemberVelocityCore(
        issues,
        member.username,
        member.defaultCapacity || 40,
        metricType,
        lookbackIterations,
        includeAbsences
      )

      const hoursPerMetric = metricType === 'issues'
        ? velocity.hoursPerIssue
        : velocity.hoursPerStoryPoint

      return {
        username: member.username,
        hoursPerMetric,
        iterationsAnalyzed: velocity.iterationsAnalyzed
      }
    })
    .filter(v => v.hoursPerMetric !== null && v.iterationsAnalyzed >= 2)

  if (memberVelocities.length === 0) {
    return {
      hoursPerStoryPoint: null,
      hoursPerIssue: null,
      metricType,
      membersAnalyzed: 0,
      dataQuality: 'insufficient'
    }
  }

  // Calculate average
  const avgHoursPerMetric = memberVelocities.reduce((sum, v) => sum + v.hoursPerMetric, 0) / memberVelocities.length

  return {
    hoursPerStoryPoint: metricType === 'points' ? Math.round(avgHoursPerMetric * 10) / 10 : null,
    hoursPerIssue: metricType === 'issues' ? Math.round(avgHoursPerMetric * 10) / 10 : null,
    metricType,
    membersAnalyzed: memberVelocities.length,
    dataQuality: memberVelocities.length >= 3 ? 'good' : 'moderate'
  }
}

/**
 * High-level API for Analytics Velocity View
 * Uses analyticsLookbackIterations from config
 */
export function getAnalyticsVelocity(issues, metricType = 'points', customLookback = null) {
  const config = loadVelocityConfig()
  const lookback = customLookback || config.analyticsLookbackIterations || config.velocityLookbackIterations || 3

  return calculateUnifiedVelocity({
    issues,
    aggregationType: 'sprint',
    metricType,
    lookbackIterations: lookback
  })
}

/**
 * High-level API for Team Management Capacity
 * Uses velocityLookbackIterations from config
 */
export function getTeamManagementVelocity(issues, username, memberCapacity = 40, customLookback = null) {
  const config = loadVelocityConfig()
  const lookback = customLookback || config.velocityLookbackIterations || 3

  return calculateUnifiedVelocity({
    issues,
    aggregationType: 'member',
    metricType: config.metricType || 'points',
    lookbackIterations: lookback,
    username,
    memberCapacity,
    includeAbsences: true
  })
}

/**
 * Get velocity with fallback hierarchy (individual -> team -> static)
 * Used for capacity planning in Team Management
 */
export function getVelocityWithFallback(username, issues, memberCapacity, teamMembers) {
  const config = loadVelocityConfig()

  // Try individual velocity
  const individual = getTeamManagementVelocity(issues, username, memberCapacity)
  const hoursPerMetric = config.metricType === 'issues'
    ? individual.hoursPerIssue
    : individual.hoursPerStoryPoint

  if (hoursPerMetric && individual.iterationsAnalyzed >= 2) {
    return {
      hours: hoursPerMetric,
      source: 'individual',
      quality: individual.dataQuality,
      details: `Based on ${individual.iterationsAnalyzed} iterations`,
      metricType: config.metricType
    }
  }

  // Try team average
  const team = calculateTeamVelocity(
    issues,
    teamMembers,
    config.metricType,
    config.velocityLookbackIterations,
    true
  )

  const teamHours = config.metricType === 'issues'
    ? team.hoursPerIssue
    : team.hoursPerStoryPoint

  if (teamHours) {
    return {
      hours: teamHours,
      source: 'team-average',
      quality: team.dataQuality,
      details: `Team average (${team.membersAnalyzed} members)`,
      metricType: config.metricType
    }
  }

  // Fall back to static
  const staticHours = config.metricType === 'issues'
    ? config.staticHoursPerIssue
    : config.staticHoursPerStoryPoint

  return {
    hours: staticHours,
    source: 'static',
    quality: 'configured',
    details: `No historical data (needs ≥2 iterations with completed work)`,
    metricType: config.metricType
  }
}