/**
 * Cycle Time & Issue Lifecycle Analytics Service
 * Tracks how long issues spend in different phases
 */

/**
 * Common label patterns for different phases
 * Updated to match actual GitLab labels in use
 *
 * Workflow understanding:
 * - Backlog: Issues that haven't been analyzed yet
 * - Analysis: Issues being analyzed, refined, or ready for work after analysis
 * - InProgress: Active development work
 */
export const DEFAULT_PHASE_PATTERNS = {
  backlog: ['backlog', 'new', 'open', 'todo', 'to do'],
  analysis: ['analysis', 'analyzing', 'refinement', 'planning', 'design', 'in analysis', 'in discovery', 'ready for work', 'awaiting refinement'],
  inProgress: ['in progress', 'doing', 'wip', 'development', 'started', 'active'],
  review: ['review', 'code review', 'peer review', 'reviewing', 'in review'],
  testing: ['in testing', 'testing', 'qa', 'test', 'validation', 'verification'],
  awaitingTesting: ['awaiting testing', 'awaiting qa', 'ready for testing', 'to test'],
  awaitingRelease: ['awaiting release', 'ready for release', 'to release', 'pending release'],
  released: ['released', 'deployed', 'in production'],
  cancelled: ['cancelled', 'canceled', 'rejected', 'wont fix', 'won\'t fix'],
  done: ['done', 'completed', 'closed', 'resolved', 'finished'],
  blocked: ['blocked', 'blocker', 'on hold', 'paused', 'blocked(do not use)']
}

/**
 * Detect which phase an issue is in based on its labels
 */
export function detectIssuePhase(issue, phasePatterns = DEFAULT_PHASE_PATTERNS) {
  if (!issue.labels || issue.labels.length === 0) {
    if (issue.state === 'closed') return 'done'
    return 'backlog'
  }

  const labels = issue.labels.map(l => l.toLowerCase())

  // Check each phase in priority order (most specific first)
  if (labels.some(l => phasePatterns.cancelled.some(p => l.includes(p)))) {
    return 'cancelled'
  }
  if (labels.some(l => phasePatterns.released.some(p => l.includes(p)))) {
    return 'released'
  }
  if (labels.some(l => phasePatterns.blocked.some(p => l.includes(p)))) {
    return 'blocked'
  }
  if (labels.some(l => phasePatterns.awaitingRelease.some(p => l.includes(p)))) {
    return 'awaitingRelease'
  }
  if (labels.some(l => phasePatterns.awaitingTesting.some(p => l.includes(p)))) {
    return 'awaitingTesting'
  }
  if (labels.some(l => phasePatterns.testing.some(p => l.includes(p)))) {
    return 'testing'
  }
  if (labels.some(l => phasePatterns.review.some(p => l.includes(p)))) {
    return 'review'
  }
  if (labels.some(l => phasePatterns.inProgress.some(p => l.includes(p)))) {
    return 'inProgress'
  }
  if (labels.some(l => phasePatterns.analysis.some(p => l.includes(p)))) {
    return 'analysis'
  }
  if (labels.some(l => phasePatterns.done.some(p => l.includes(p)))) {
    return 'done'
  }
  if (labels.some(l => phasePatterns.backlog.some(p => l.includes(p)))) {
    return 'backlog'
  }

  // Default based on state
  if (issue.state === 'closed') return 'done'
  return 'backlog'
}

/**
 * Calculate how long an issue has been in its current phase
 */
export function getTimeInCurrentPhase(issue) {
  const now = new Date()
  const updatedAt = new Date(issue.updated_at)
  const diffTime = Math.abs(now - updatedAt)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Calculate total lead time (created to closed/current)
 */
export function getLeadTime(issue) {
  const created = new Date(issue.created_at)
  const end = issue.closed_at ? new Date(issue.closed_at) : new Date()
  const diffTime = Math.abs(end - created)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Estimate cycle time (time from when work starts to closure)
 * Without GitLab label event history, we cannot accurately determine when
 * work actually started. We use heuristics to provide a better estimate
 * than simply using lead time.
 *
 * Estimation strategy:
 * 1. If issue has milestone: assume work started at milestone start date
 * 2. If issue was updated significantly after creation: use first major update
 * 3. Otherwise: use a percentage of lead time (80% default) as typical wait time is 20%
 */
export function estimateCycleTime(issue) {
  // Only calculate for closed issues
  if (!issue.closed_at) {
    return null
  }

  const created = new Date(issue.created_at)
  const closed = new Date(issue.closed_at)
  const updated = new Date(issue.updated_at)

  let workStarted = created // Default to created date

  // Strategy 1: Use milestone start date if available
  if (issue.milestone && issue.milestone.start_date) {
    const milestoneStart = new Date(issue.milestone.start_date)
    // Only use milestone start if it's after creation and before close
    if (milestoneStart > created && milestoneStart < closed) {
      workStarted = milestoneStart
    }
  }
  // Strategy 2: Use first significant update (if updated > 1 day after creation)
  else if (updated > created) {
    const updateDiff = (updated - created) / (1000 * 60 * 60 * 24)
    const leadTime = (closed - created) / (1000 * 60 * 60 * 24)

    // If issue was updated significantly after creation (> 1 day) and update is in first half of lifecycle
    if (updateDiff > 1 && updateDiff < leadTime / 2) {
      // Estimate work started around first update
      workStarted = updated
    }
    // Strategy 3: Apply typical wait time percentage (20% wait, 80% work)
    else {
      const waitTimeMs = (closed - created) * 0.2 // 20% wait time
      workStarted = new Date(created.getTime() + waitTimeMs)
    }
  }
  // Strategy 3: Apply typical wait time percentage as fallback
  else {
    const waitTimeMs = (closed - created) * 0.2 // 20% wait time
    workStarted = new Date(created.getTime() + waitTimeMs)
  }

  // Calculate cycle time from estimated work start
  const diffTime = Math.abs(closed - workStarted)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Ensure cycle time is not greater than lead time
  const leadTimeDays = Math.ceil((closed - created) / (1000 * 60 * 60 * 24))
  return Math.min(diffDays, leadTimeDays)
}

/**
 * Get lead time statistics for closed issues
 * Lead Time = Created → Closed (total time in system)
 */
export function getCycleTimeStats(issues) {
  const closedIssues = issues.filter(i => i.state === 'closed')

  if (closedIssues.length === 0) {
    return {
      count: 0,
      avgLeadTime: 0,
      medianLeadTime: 0,
      minLeadTime: 0,
      maxLeadTime: 0,
      leadTimes: [],
      avgCycleTime: 0,
      medianCycleTime: 0,
      minCycleTime: 0,
      maxCycleTime: 0,
      cycleTimes: [],
      avgWaitTime: 0
    }
  }

  const leadTimes = closedIssues.map(i => getLeadTime(i)).sort((a, b) => a - b)
  const avgLeadTime = Math.round(leadTimes.reduce((sum, t) => sum + t, 0) / leadTimes.length)
  const medianLeadTime = leadTimes[Math.floor(leadTimes.length / 2)]

  // Calculate cycle times (excludes backlog wait time)
  const cycleTimesWithIssues = closedIssues
    .map(i => ({ issue: i, cycleTime: estimateCycleTime(i) }))
    .filter(({ cycleTime }) => cycleTime !== null)

  const cycleTimes = cycleTimesWithIssues
    .map(({ cycleTime }) => cycleTime)
    .sort((a, b) => a - b)

  let avgCycleTime = 0
  let medianCycleTime = 0
  let minCycleTime = 0
  let maxCycleTime = 0
  let avgWaitTime = 0

  if (cycleTimes.length > 0) {
    avgCycleTime = Math.round(cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length)

    // Proper median calculation
    if (cycleTimes.length % 2 === 0) {
      // Even number: average of two middle values
      const mid1 = cycleTimes[cycleTimes.length / 2 - 1]
      const mid2 = cycleTimes[cycleTimes.length / 2]
      medianCycleTime = Math.round((mid1 + mid2) / 2)
    } else {
      // Odd number: middle value
      medianCycleTime = cycleTimes[Math.floor(cycleTimes.length / 2)]
    }

    minCycleTime = cycleTimes[0]
    maxCycleTime = cycleTimes[cycleTimes.length - 1]

    // Average wait time = Lead Time - Cycle Time
    avgWaitTime = Math.max(0, avgLeadTime - avgCycleTime)
  }

  return {
    count: closedIssues.length,
    avgLeadTime,
    medianLeadTime,
    minLeadTime: leadTimes[0],
    maxLeadTime: leadTimes[leadTimes.length - 1],
    leadTimes,
    avgCycleTime,
    medianCycleTime,
    minCycleTime,
    maxCycleTime,
    cycleTimes,
    avgWaitTime
  }
}

/**
 * Get issue distribution by phase
 */
export function getPhaseDistribution(issues, phasePatterns = DEFAULT_PHASE_PATTERNS) {
  const distribution = {
    backlog: [],
    analysis: [],
    inProgress: [],
    review: [],
    testing: [],
    awaitingTesting: [],
    awaitingRelease: [],
    released: [],
    cancelled: [],
    done: [],
    blocked: []
  }

  issues.forEach(issue => {
    const phase = detectIssuePhase(issue, phasePatterns)
    if (distribution[phase]) {
      distribution[phase].push(issue)
    } else {
      // Fallback for unknown phases
      distribution.backlog.push(issue)
    }
  })

  return distribution
}

/**
 * Calculate average time in each phase for completed issues
 * This is an approximation based on available data
 */
export function getAverageTimePerPhase(issues) {
  const closedIssues = issues.filter(i => i.state === 'closed')

  if (closedIssues.length === 0) {
    return {
      backlog: 0,
      analysis: 0,
      inProgress: 0,
      review: 0,
      testing: 0,
      total: 0
    }
  }

  // This is a rough approximation
  // Ideally we'd need label history from GitLab API
  const avgLeadTime = closedIssues.reduce((sum, i) => sum + getLeadTime(i), 0) / closedIssues.length

  // Estimate based on typical distribution
  // These are rough estimates - can be configured
  return {
    backlog: Math.round(avgLeadTime * 0.2), // ~20% in backlog
    analysis: Math.round(avgLeadTime * 0.15), // ~15% in analysis
    inProgress: Math.round(avgLeadTime * 0.4), // ~40% in development
    review: Math.round(avgLeadTime * 0.1), // ~10% in review
    testing: Math.round(avgLeadTime * 0.15), // ~15% in testing
    total: Math.round(avgLeadTime)
  }
}

/**
 * Identify bottlenecks (phases with most issues or longest time)
 */
export function identifyBottlenecks(issues) {
  const distribution = getPhaseDistribution(issues.filter(i => i.state === 'opened'))
  const bottlenecks = []

  // Count issues in each phase
  const phaseCounts = Object.entries(distribution).map(([phase, issuesList]) => ({
    phase,
    count: issuesList.length,
    avgTimeInPhase: issuesList.length > 0
      ? Math.round(issuesList.reduce((sum, i) => sum + getTimeInCurrentPhase(i), 0) / issuesList.length)
      : 0,
    issues: issuesList
  }))

  // Sort by count (descending)
  const sortedByCount = [...phaseCounts].sort((a, b) => b.count - a.count)

  // Root cause helpers
  const getRootCause = (phase, phaseData) => {
    const causes = []
    const actions = []

    // Phase-specific root causes
    if (phase === 'testing' || phase === 'awaitingTesting') {
      if (phaseData.avgTimeInPhase > 7) {
        causes.push('Security or QA team backlog')
        actions.push('Request additional QA resources or auto-approve low-risk changes')
      }
      if (phaseData.count > 5) {
        causes.push(`${phaseData.count} issues waiting for testing`)
        actions.push('Prioritize testing queue, enable parallel testing')
      }
    }

    if (phase === 'awaitingRelease') {
      if (phaseData.avgTimeInPhase > 5) {
        causes.push('Infrequent deployment schedule')
        actions.push('Enable more frequent deployments or continuous delivery')
      }
      if (phaseData.count > 3) {
        causes.push(`${phaseData.count} issues ready but waiting for release window`)
        actions.push('Deploy batches more frequently (daily vs weekly)')
      }
    }

    if (phase === 'review') {
      if (phaseData.avgTimeInPhase > 3) {
        causes.push('Code review backlog or slow review process')
        actions.push('Assign dedicated reviewers, set SLA for reviews (24-48 hours)')
      }
    }

    if (phase === 'blocked') {
      causes.push('External dependencies or blockers')
      actions.push('Escalate blockers to management, find workarounds')
    }

    if (phase === 'inProgress') {
      if (phaseData.count > 8) {
        causes.push('Too much work in progress (WIP)')
        actions.push('Implement WIP limits, focus on completing vs starting')
      }
      if (phaseData.avgTimeInPhase > 10) {
        causes.push('Issues are more complex than estimated')
        actions.push('Break down large issues, improve estimation process')
      }
    }

    // Generic fallbacks
    if (causes.length === 0 && phaseData.count > 5) {
      causes.push(`High volume of issues in ${getPhaseLabel(phase)}`)
      actions.push('Increase throughput or reduce incoming work to this phase')
    }

    if (causes.length === 0 && phaseData.avgTimeInPhase > 10) {
      causes.push('Issues spending excessive time in this phase')
      actions.push('Investigate process inefficiencies or resource constraints')
    }

    return { causes, actions }
  }

  // Identify bottlenecks
  sortedByCount.forEach((phaseData, index) => {
    if (phaseData.count === 0) return

    let severity = 'low'
    let reason = ''

    if (index === 0 && phaseData.count > 5) {
      severity = 'high'
      reason = `Highest concentration of issues (${phaseData.count})`
    } else if (phaseData.avgTimeInPhase > 14) {
      severity = 'medium'
      reason = `Long average time in phase (${phaseData.avgTimeInPhase} days)`
    } else if (phaseData.count > 3) {
      severity = 'low'
      reason = `${phaseData.count} issues currently in this phase`
    }

    if (severity) {
      const { causes, actions } = getRootCause(phaseData.phase, phaseData)

      bottlenecks.push({
        phase: phaseData.phase,
        count: phaseData.count,
        avgTimeInPhase: phaseData.avgTimeInPhase,
        severity,
        reason,
        rootCauses: causes,
        recommendedActions: actions
      })
    }
  })

  return bottlenecks.filter(b => b.count > 0)
}

/**
 * Get detailed issue lifecycle data
 */
export function getIssueLifecycleData(issue) {
  return {
    iid: issue.iid,
    title: issue.title,
    state: issue.state,
    currentPhase: detectIssuePhase(issue),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
    leadTime: getLeadTime(issue),
    cycleTime: estimateCycleTime(issue),
    timeInCurrentPhase: getTimeInCurrentPhase(issue),
    labels: issue.labels || [],
    assignees: issue.assignees || [],
    milestone: issue.milestone,
    epic: issue.epic
  }
}

/**
 * Get lead time distribution for histogram
 */
export function getLeadTimeDistribution(issues) {
  const closedIssues = issues.filter(i => i.state === 'closed')
  const leadTimes = closedIssues.map(i => getLeadTime(i))

  // Create buckets: 0-7, 8-14, 15-30, 31-60, 61-90, 90+
  const buckets = {
    '0-7 days': 0,
    '8-14 days': 0,
    '15-30 days': 0,
    '31-60 days': 0,
    '61-90 days': 0,
    '90+ days': 0
  }

  leadTimes.forEach(days => {
    if (days <= 7) buckets['0-7 days']++
    else if (days <= 14) buckets['8-14 days']++
    else if (days <= 30) buckets['15-30 days']++
    else if (days <= 60) buckets['31-60 days']++
    else if (days <= 90) buckets['61-90 days']++
    else buckets['90+ days']++
  })

  return buckets
}

/**
 * Get control chart data for lead time and cycle time analysis
 * Returns data points for run chart with percentiles and trends
 */
export function getControlChartData(issues, metric = 'leadTime') {
  const closedIssues = issues
    .filter(i => i.state === 'closed' && i.closed_at)
    .sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at))

  if (closedIssues.length === 0) {
    return {
      dataPoints: [],
      average: 0,
      median: 0,
      percentile85: 0,
      percentile95: 0,
      upperControlLimit: 0,
      lowerControlLimit: 0
    }
  }

  // Prepare data points with date and value
  const dataPoints = closedIssues.map(issue => {
    const value = metric === 'cycleTime' ? estimateCycleTime(issue) : getLeadTime(issue)
    return {
      date: new Date(issue.closed_at),
      dateStr: new Date(issue.closed_at).toLocaleDateString(),
      value: value || 0,
      issue: {
        iid: issue.iid,
        title: issue.title,
        web_url: issue.web_url
      }
    }
  }).filter(dp => dp.value > 0) // Filter out null cycle times

  if (dataPoints.length === 0) {
    return {
      dataPoints: [],
      average: 0,
      median: 0,
      percentile85: 0,
      percentile95: 0,
      upperControlLimit: 0,
      lowerControlLimit: 0
    }
  }

  // Calculate statistics
  const values = dataPoints.map(dp => dp.value).sort((a, b) => a - b)
  const average = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
  const median = values[Math.floor(values.length * 0.5)]
  const percentile85 = values[Math.floor(values.length * 0.85)]
  const percentile95 = values[Math.floor(values.length * 0.95)]

  // Calculate control limits (±3 standard deviations)
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  const upperControlLimit = Math.round(average + (3 * stdDev))
  const lowerControlLimit = Math.max(0, Math.round(average - (3 * stdDev)))

  return {
    dataPoints,
    average,
    median,
    percentile85,
    percentile95,
    upperControlLimit,
    lowerControlLimit,
    stdDev: Math.round(stdDev)
  }
}

/**
 * Get phase label summary (helps user configure)
 */
export function getDetectedLabels(issues) {
  const allLabels = new Set()
  issues.forEach(issue => {
    if (issue.labels) {
      issue.labels.forEach(label => allLabels.add(label))
    }
  })

  const labelsByCategory = {
    status: [],
    phase: [],
    workflow: [],
    other: []
  }

  Array.from(allLabels).forEach(label => {
    const lower = label.toLowerCase()
    if (lower.includes('status')) {
      labelsByCategory.status.push(label)
    } else if (Object.values(DEFAULT_PHASE_PATTERNS).flat().some(p => lower.includes(p))) {
      labelsByCategory.phase.push(label)
    } else if (lower.includes('workflow') || lower.includes('work')) {
      labelsByCategory.workflow.push(label)
    } else {
      labelsByCategory.other.push(label)
    }
  })

  return labelsByCategory
}

/**
 * Export cycle time data to CSV
 */
export function exportCycleTimeToCSV(issues) {
  const headers = [
    'Issue ID',
    'Title',
    'State',
    'Current Phase',
    'Lead Time (days)',
    'Cycle Time (days)',
    'Time in Current Phase (days)',
    'Created At',
    'Updated At',
    'Closed At',
    'Labels',
    'Assignees',
    'Milestone',
    'Epic'
  ]

  const rows = issues.map(issue => {
    const lifecycle = getIssueLifecycleData(issue)
    return [
      lifecycle.iid,
      `"${lifecycle.title.replace(/"/g, '""')}"`,
      lifecycle.state,
      lifecycle.currentPhase,
      lifecycle.leadTime,
      lifecycle.cycleTime || 'N/A',
      lifecycle.timeInCurrentPhase,
      new Date(lifecycle.createdAt).toLocaleDateString(),
      new Date(lifecycle.updatedAt).toLocaleDateString(),
      lifecycle.closedAt ? new Date(lifecycle.closedAt).toLocaleDateString() : 'N/A',
      lifecycle.labels.join('; ') || 'None',
      lifecycle.assignees.map(a => a.name).join('; ') || 'None',
      lifecycle.milestone ? lifecycle.milestone.title : 'None',
      lifecycle.epic ? lifecycle.epic.title : 'None'
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
export function downloadCSV(csvContent, filename = 'cycle-time-report.csv') {
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

/**
 * Get phase name in human-readable format
 */
export function getPhaseLabel(phase) {
  const labels = {
    backlog: 'Backlog',
    analysis: 'Analysis',
    inProgress: 'In Progress',
    review: 'Review',
    testing: 'In Testing',
    awaitingTesting: 'Awaiting Testing',
    awaitingRelease: 'Awaiting Release',
    released: 'Released',
    cancelled: 'Cancelled',
    done: 'Done',
    blocked: 'Blocked'
  }
  return labels[phase] || phase
}

/**
 * Get phase color
 */
export function getPhaseColor(phase) {
  const colors = {
    backlog: '#6B7280',
    analysis: '#3B82F6',
    inProgress: '#F59E0B',
    review: '#8B5CF6',
    testing: '#EC4899',
    awaitingTesting: '#F59E0B',
    awaitingRelease: '#10B981',
    released: '#059669',
    cancelled: '#9CA3AF',
    done: '#10B981',
    blocked: '#EF4444'
  }
  return colors[phase] || '#6B7280'
}
