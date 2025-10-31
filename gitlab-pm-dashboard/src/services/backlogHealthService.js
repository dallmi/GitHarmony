/**
 * Backlog Health Metrics Service
 * Analyzes backlog quality and readiness for sprint planning
 * 100% automatic - no manual input required
 */

/**
 * Calculate backlog health metrics for all open issues
 */
export function calculateBacklogHealth(issues) {
  // Filter only open issues in backlog (not in active sprint)
  const backlogIssues = issues.filter(issue => issue.state === 'opened')

  if (backlogIssues.length === 0) {
    return {
      totalIssues: 0,
      healthScore: 100,
      refinedPercentage: 100,
      hasDescriptionPercentage: 100,
      readyForSprintPercentage: 100,
      issues: {
        refined: 0,
        hasDescription: 0,
        readyForSprint: 0
      },
      trend: null,
      alert: null
    }
  }

  // Count issues meeting each criterion
  let refinedCount = 0
  let hasDescriptionCount = 0
  let readyForSprintCount = 0

  backlogIssues.forEach(issue => {
    // Refined: Has weight/story points
    if (issue.weight !== null && issue.weight !== undefined && issue.weight > 0) {
      refinedCount++
    }

    // Has Description: Description >50 chars (substantial)
    if (issue.description && issue.description.trim().length >= 50) {
      hasDescriptionCount++
    }

    // Ready for Sprint: Has all required fields
    const isReady = (
      issue.weight !== null && issue.weight !== undefined && issue.weight > 0 &&
      issue.description && issue.description.trim().length >= 50 &&
      issue.assignees && issue.assignees.length > 0 &&
      (issue.epic !== null && issue.epic !== undefined) &&
      (issue.milestone !== null && issue.milestone !== undefined)
    )

    if (isReady) {
      readyForSprintCount++
    }
  })

  // Calculate percentages
  const refinedPercentage = Math.round((refinedCount / backlogIssues.length) * 100)
  const hasDescriptionPercentage = Math.round((hasDescriptionCount / backlogIssues.length) * 100)
  const readyForSprintPercentage = Math.round((readyForSprintCount / backlogIssues.length) * 100)

  // Overall health score (weighted average)
  // Refined: 35%, Has Description: 25%, Ready: 40%
  const healthScore = Math.round(
    (refinedPercentage * 0.35) +
    (hasDescriptionPercentage * 0.25) +
    (readyForSprintPercentage * 0.40)
  )

  // Determine alert status
  let alert = null
  if (healthScore < 60) {
    alert = {
      severity: 'high',
      message: 'Critical: Backlog health is very low. Schedule immediate refinement session.',
      recommendation: 'Focus on refining top 10 priority items with weights and descriptions.'
    }
  } else if (healthScore < 75) {
    alert = {
      severity: 'medium',
      message: 'Warning: Backlog health is below recommended threshold.',
      recommendation: 'Schedule backlog refinement session before next sprint planning.'
    }
  }

  return {
    totalIssues: backlogIssues.length,
    healthScore,
    refinedPercentage,
    hasDescriptionPercentage,
    readyForSprintPercentage,
    issues: {
      refined: refinedCount,
      hasDescription: hasDescriptionCount,
      readyForSprint: readyForSprintCount
    },
    alert
  }
}

/**
 * Get backlog health trend by comparing to historical data
 */
export function getBacklogHealthTrend(currentHealth) {
  // Load historical health from localStorage
  const history = loadHealthHistory()

  if (history.length < 2) {
    return null // Not enough data for trend
  }

  // Compare current to average of last 3 measurements
  const recentHistory = history.slice(-3)
  const avgHistoricalScore = recentHistory.reduce((sum, h) => sum + h.healthScore, 0) / recentHistory.length

  const difference = currentHealth.healthScore - avgHistoricalScore

  if (Math.abs(difference) < 5) {
    return {
      direction: 'stable',
      difference: 0,
      message: 'Stable'
    }
  } else if (difference > 0) {
    return {
      direction: 'improving',
      difference: Math.round(difference),
      message: `Improving (↑${Math.round(difference)}% from avg)`
    }
  } else {
    return {
      direction: 'declining',
      difference: Math.round(Math.abs(difference)),
      message: `Declining (↓${Math.round(Math.abs(difference))}% from avg)`
    }
  }
}

/**
 * Save current health to history (called after calculating)
 */
export function saveHealthHistory(health) {
  const history = loadHealthHistory()

  history.push({
    timestamp: new Date().toISOString(),
    healthScore: health.healthScore,
    refinedPercentage: health.refinedPercentage,
    hasDescriptionPercentage: health.hasDescriptionPercentage,
    readyForSprintPercentage: health.readyForSprintPercentage
  })

  // Keep only last 30 measurements (roughly 6 months if weekly checks)
  const trimmedHistory = history.slice(-30)

  localStorage.setItem('backlogHealthHistory', JSON.stringify(trimmedHistory))
}

/**
 * Load health history from localStorage
 */
function loadHealthHistory() {
  try {
    const stored = localStorage.getItem('backlogHealthHistory')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading backlog health history:', error)
    return []
  }
}

/**
 * Get detailed breakdown of issues by health status
 */
export function getBacklogHealthBreakdown(issues) {
  const backlogIssues = issues.filter(issue => issue.state === 'opened')

  const breakdown = {
    refined: [],
    notRefined: [],
    hasDescription: [],
    noDescription: [],
    readyForSprint: [],
    notReady: []
  }

  backlogIssues.forEach(issue => {
    // Refined status
    if (issue.weight !== null && issue.weight !== undefined && issue.weight > 0) {
      breakdown.refined.push(issue)
    } else {
      breakdown.notRefined.push(issue)
    }

    // Description status
    if (issue.description && issue.description.trim().length >= 50) {
      breakdown.hasDescription.push(issue)
    } else {
      breakdown.noDescription.push(issue)
    }

    // Ready for sprint status
    const isReady = (
      issue.weight !== null && issue.weight !== undefined && issue.weight > 0 &&
      issue.description && issue.description.trim().length >= 50 &&
      issue.assignees && issue.assignees.length > 0 &&
      (issue.epic !== null && issue.epic !== undefined) &&
      (issue.milestone !== null && issue.milestone !== undefined)
    )

    if (isReady) {
      breakdown.readyForSprint.push(issue)
    } else {
      breakdown.notReady.push(issue)
    }
  })

  return breakdown
}

/**
 * Get top issues that need refinement (not ready)
 */
export function getIssuesNeedingRefinement(issues, limit = 10) {
  const backlogIssues = issues.filter(issue => issue.state === 'opened')

  // Score each issue by how "not ready" it is
  const scoredIssues = backlogIssues.map(issue => {
    let needsWork = 0

    // Missing weight (most critical)
    if (!issue.weight || issue.weight === 0) needsWork += 3

    // Missing description
    if (!issue.description || issue.description.trim().length < 50) needsWork += 2

    // Missing epic
    if (!issue.epic) needsWork += 1

    // Missing milestone
    if (!issue.milestone) needsWork += 1

    // Missing assignee
    if (!issue.assignees || issue.assignees.length === 0) needsWork += 1

    return {
      issue,
      needsWorkScore: needsWork,
      missingFields: getMissingFields(issue)
    }
  })

  // Sort by needs work score (highest first), then by created date (oldest first)
  scoredIssues.sort((a, b) => {
    if (a.needsWorkScore !== b.needsWorkScore) {
      return b.needsWorkScore - a.needsWorkScore
    }
    return new Date(a.issue.created_at) - new Date(b.issue.created_at)
  })

  return scoredIssues.slice(0, limit)
}

/**
 * Helper to get list of missing fields for an issue
 */
function getMissingFields(issue) {
  const missing = []

  if (!issue.weight || issue.weight === 0) missing.push('Weight/Story Points')
  if (!issue.description || issue.description.trim().length < 50) missing.push('Description')
  if (!issue.epic) missing.push('Epic')
  if (!issue.milestone) missing.push('Milestone')
  if (!issue.assignees || issue.assignees.length === 0) missing.push('Assignee')

  return missing
}

/**
 * Export backlog health report to CSV
 */
export function exportBacklogHealthCSV(health, breakdown) {
  const headers = [
    'Issue ID',
    'Title',
    'Has Weight',
    'Has Description',
    'Has Epic',
    'Has Milestone',
    'Has Assignee',
    'Ready for Sprint',
    'Missing Fields',
    'Created At',
    'URL'
  ]

  const rows = breakdown.notReady.map(issue => {
    const missingFields = getMissingFields(issue)

    return [
      issue.iid,
      `"${issue.title.replace(/"/g, '""')}"`,
      issue.weight > 0 ? 'Yes' : 'No',
      issue.description && issue.description.trim().length >= 50 ? 'Yes' : 'No',
      issue.epic ? 'Yes' : 'No',
      issue.milestone ? 'Yes' : 'No',
      issue.assignees && issue.assignees.length > 0 ? 'Yes' : 'No',
      'No',
      `"${missingFields.join(', ')}"`,
      new Date(issue.created_at).toLocaleDateString(),
      issue.web_url
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Download CSV file
 */
export function downloadBacklogHealthCSV(csvContent, filename = 'backlog-health-issues.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
