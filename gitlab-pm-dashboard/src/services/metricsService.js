/**
 * Metrics Calculation Service
 * Handles all health scores, progress calculations, and aggregations
 */

import {
  HEALTH_SCORE_WEIGHTS,
  HEALTH_SCORE_AMPLIFIERS,
  HEALTH_THRESHOLDS
} from '../constants/config.js'

/**
 * Get progress percentage for an issue based on labels and state
 */
export function getProgress(issue) {
  if (issue.state === 'closed') return 100

  const labelNames = issue.labels.map(l => l.toLowerCase())
  if (labelNames.some(l => l.includes('review') || l.includes('testing'))) return 75
  if (labelNames.some(l => l.includes('progress') || l.includes('wip'))) return 50
  if (labelNames.some(l => l.includes('started'))) return 25

  return 0
}

/**
 * Check if issue is a blocker
 */
export function isBlocker(labels) {
  return labels.some(l => l.toLowerCase().includes('blocker') || l.toLowerCase().includes('blocked'))
}

/**
 * Get priority from labels
 */
export function getPriority(labels) {
  const labelNames = labels.map(l => l.toLowerCase())
  if (labelNames.some(l => l.includes('critical') || l.includes('urgent') || l.includes('high'))) {
    return 'high'
  }
  if (labelNames.some(l => l.includes('low'))) {
    return 'low'
  }
  return 'medium'
}

/**
 * Calculate project statistics
 */
export function calculateStats(issues) {
  const total = issues.length
  const open = issues.filter(i => i.state === 'opened').length
  const closed = issues.filter(i => i.state === 'closed').length
  const blockers = issues.filter(i => isBlocker(i.labels)).length

  const overdue = issues.filter(i =>
    i.due_date &&
    new Date(i.due_date) < new Date() &&
    i.state === 'opened'
  ).length

  const atRisk = issues.filter(i => {
    if (!i.due_date || i.state === 'closed') return false
    const daysUntilDue = Math.floor((new Date(i.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    return daysUntilDue <= 7 && daysUntilDue >= 0
  }).length

  const completionRate = total > 0 ? Math.round((closed / total) * 100) : 0

  return {
    total,
    open,
    closed,
    blockers,
    overdue,
    atRisk,
    completionRate
  }
}

/**
 * Load health score configuration from localStorage or use defaults
 */
function getHealthScoreConfig() {
  const saved = localStorage.getItem('healthScoreConfig')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse health score config:', e)
    }
  }

  // Use imported defaults
  return {
    weights: HEALTH_SCORE_WEIGHTS,
    amplifiers: HEALTH_SCORE_AMPLIFIERS,
    thresholds: HEALTH_THRESHOLDS
  }
}

/**
 * Calculate health score based on multiple dimensions
 * Now uses configurable weights and amplifiers from localStorage or defaults
 */
export function calculateHealthScore(stats) {
  const config = getHealthScoreConfig()
  const { weights, amplifiers, thresholds } = config

  const completionScore = stats.completionRate
  const scheduleScore = stats.total > 0
    ? Math.max(0, 100 - (stats.overdue / stats.total * amplifiers.schedule))
    : 100

  const blockerScore = stats.total > 0
    ? Math.max(0, 100 - (stats.blockers / stats.total * amplifiers.blockers))
    : 100

  const riskScore = stats.total > 0
    ? Math.max(0, 100 - (stats.atRisk / stats.total * amplifiers.risk))
    : 100

  const overall = Math.round(
    completionScore * weights.completion +
    scheduleScore * weights.schedule +
    blockerScore * weights.blockers +
    riskScore * weights.risk
  )

  let status = 'red'
  if (overall >= thresholds.good) status = 'green'
  else if (overall >= thresholds.warning) status = 'amber'

  return {
    score: overall,
    status,
    breakdown: {
      completionScore,
      scheduleScore,
      blockerScore,
      riskScore
    }
  }
}

/**
 * Calculate Epic-level metrics
 */
export function calculateEpicMetrics(epic) {
  const issues = epic.issues || []
  const stats = calculateStats(issues)
  const health = calculateHealthScore(stats)

  return {
    ...epic,
    stats,
    health: health.status,
    healthScore: health.score,
    progress: stats.completionRate
  }
}

/**
 * Get unique assignees from issues
 */
export function getUniqueAssignees(issues) {
  const assigneeMap = new Map()

  issues.forEach(issue => {
    issue.assignees?.forEach(assignee => {
      assigneeMap.set(assignee.id, assignee)
    })
  })

  return Array.from(assigneeMap.values())
}
