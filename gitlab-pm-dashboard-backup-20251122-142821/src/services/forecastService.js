/**
 * Timeline Forecasting Service
 *
 * Provides realistic completion date forecasts based on:
 * - Historical velocity
 * - Remaining work
 * - Team capacity
 * - Confidence intervals
 */

/**
 * Forecast initiative completion date based on velocity
 */
export function forecastInitiativeCompletion(initiative, issues, teamName = null) {
  // Get issues for this initiative
  const initiativeIssues = initiative.issues.filter(i => i.state === 'opened')

  if (initiativeIssues.length === 0) {
    return {
      isComplete: true,
      forecastDate: new Date(),
      confidence: 100,
      weeksRemaining: 0,
      variance: { optimistic: 0, pessimistic: 0 }
    }
  }

  // Calculate velocity (issues closed per week)
  const velocity = calculateInitiativeVelocity(initiative, issues)

  if (velocity.weeklyAverage === 0) {
    // No historical data - use default estimate
    return {
      isComplete: false,
      forecastDate: null,
      confidence: 0,
      weeksRemaining: null,
      variance: { optimistic: null, pessimistic: null },
      reason: 'No historical velocity data available'
    }
  }

  // Calculate remaining work
  const remainingIssues = initiativeIssues.length

  // Calculate story points if available
  let remainingPoints = 0
  let hasStoryPoints = false
  initiativeIssues.forEach(issue => {
    const spLabel = issue.labels?.find(l => l.toLowerCase().startsWith('sp::'))
    if (spLabel) {
      hasStoryPoints = true
      const sp = parseInt(spLabel.split('::')[1], 10)
      if (!isNaN(sp)) remainingPoints += sp
    }
  })

  // Use story points if available, otherwise use issue count
  const workMetric = hasStoryPoints ? 'storyPoints' : 'issueCount'
  const remainingWork = hasStoryPoints ? remainingPoints : remainingIssues
  const weeklyThroughput = hasStoryPoints ? velocity.weeklyPointsAverage : velocity.weeklyAverage

  // Calculate forecast
  const weeksRemaining = Math.ceil(remainingWork / weeklyThroughput)

  // Calculate confidence based on velocity stability
  const confidence = calculateConfidence(velocity.trend, velocity.consistency)

  // Calculate variance (optimistic/pessimistic scenarios)
  const variance = calculateVariance(weeksRemaining, velocity.consistency, confidence)

  // Calculate forecast date
  const forecastDate = new Date()
  forecastDate.setDate(forecastDate.getDate() + (weeksRemaining * 7))

  return {
    isComplete: false,
    forecastDate,
    confidence,
    weeksRemaining,
    variance,
    velocity: {
      weeklyAverage: velocity.weeklyAverage,
      weeklyPointsAverage: velocity.weeklyPointsAverage,
      trend: velocity.trend,
      consistency: velocity.consistency
    },
    remainingWork: {
      issues: remainingIssues,
      storyPoints: hasStoryPoints ? remainingPoints : null,
      metric: workMetric
    }
  }
}

/**
 * Calculate historical velocity for an initiative
 */
function calculateInitiativeVelocity(initiative, allIssues) {
  const closedIssues = initiative.issues.filter(i => i.state === 'closed')

  if (closedIssues.length === 0) {
    return {
      weeklyAverage: 0,
      weeklyPointsAverage: 0,
      trend: 0,
      consistency: 0
    }
  }

  // Group by week
  const weeklyData = new Map()

  closedIssues.forEach(issue => {
    if (!issue.closed_at) return

    const closedDate = new Date(issue.closed_at)
    const weekKey = getWeekKey(closedDate)

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, {
        issueCount: 0,
        storyPoints: 0,
        week: weekKey
      })
    }

    const weekData = weeklyData.get(weekKey)
    weekData.issueCount++

    // Add story points if available
    const spLabel = issue.labels?.find(l => l.toLowerCase().startsWith('sp::'))
    if (spLabel) {
      const sp = parseInt(spLabel.split('::')[1], 10)
      if (!isNaN(sp)) weekData.storyPoints += sp
    }
  })

  // Calculate averages (last 8 weeks or all available data)
  const weeks = Array.from(weeklyData.values()).sort((a, b) => b.week.localeCompare(a.week))
  const recentWeeks = weeks.slice(0, 8)

  const weeklyAverage = recentWeeks.length > 0
    ? recentWeeks.reduce((sum, w) => sum + w.issueCount, 0) / recentWeeks.length
    : 0

  const weeklyPointsAverage = recentWeeks.length > 0
    ? recentWeeks.reduce((sum, w) => sum + w.storyPoints, 0) / recentWeeks.length
    : 0

  // Calculate trend (positive = improving, negative = declining)
  const trend = calculateTrend(recentWeeks.map(w => w.issueCount))

  // Calculate consistency (standard deviation - lower is more consistent)
  const consistency = calculateConsistency(recentWeeks.map(w => w.issueCount))

  return {
    weeklyAverage,
    weeklyPointsAverage,
    trend,
    consistency
  }
}

/**
 * Get week key (YYYY-WW format)
 */
function getWeekKey(date) {
  const year = date.getFullYear()
  const firstDayOfYear = new Date(year, 0, 1)
  const daysSinceFirstDay = Math.floor((date - firstDayOfYear) / (24 * 60 * 60 * 1000))
  const weekNumber = Math.ceil((daysSinceFirstDay + firstDayOfYear.getDay() + 1) / 7)
  return `${year}-${weekNumber.toString().padStart(2, '0')}`
}

/**
 * Calculate trend from time series data
 */
function calculateTrend(values) {
  if (values.length < 2) return 0

  // Simple linear regression
  const n = values.length
  const xSum = (n * (n - 1)) / 2 // 0 + 1 + 2 + ... + (n-1)
  const ySum = values.reduce((sum, v) => sum + v, 0)
  const xySum = values.reduce((sum, v, i) => sum + (i * v), 0)
  const xxSum = (n * (n - 1) * (2 * n - 1)) / 6 // 0² + 1² + 2² + ... + (n-1)²

  const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum)

  // Normalize to percentage
  const average = ySum / n
  return average !== 0 ? (slope / average) * 100 : 0
}

/**
 * Calculate consistency (coefficient of variation)
 */
function calculateConsistency(values) {
  if (values.length < 2) return 100

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  // Coefficient of variation (lower is more consistent)
  const cv = mean !== 0 ? (stdDev / mean) * 100 : 0

  // Convert to consistency score (100 = perfect consistency, 0 = very inconsistent)
  return Math.max(0, 100 - cv)
}

/**
 * Calculate confidence level (0-100)
 */
function calculateConfidence(trend, consistency) {
  // Base confidence on consistency
  let confidence = consistency

  // Adjust for trend
  if (trend > 10) {
    // Improving trend increases confidence
    confidence = Math.min(100, confidence + 10)
  } else if (trend < -10) {
    // Declining trend decreases confidence
    confidence = Math.max(0, confidence - 15)
  }

  return Math.round(confidence)
}

/**
 * Calculate variance (optimistic/pessimistic scenarios)
 */
function calculateVariance(weeksRemaining, consistency, confidence) {
  // Lower consistency = higher variance
  const varianceFactor = (100 - consistency) / 100

  // Optimistic: 20% better with high consistency
  const optimisticWeeks = Math.max(1, Math.ceil(weeksRemaining * (1 - (0.2 * (consistency / 100)))))

  // Pessimistic: Could be 50-100% longer with low consistency
  const pessimisticWeeks = Math.ceil(weeksRemaining * (1 + (0.5 + varianceFactor * 0.5)))

  return {
    optimistic: optimisticWeeks,
    pessimistic: pessimisticWeeks
  }
}

/**
 * Compare forecast date with due date
 */
export function compareForecastToDueDate(initiative, forecast) {
  if (!initiative.dueDate || !forecast.forecastDate) {
    return {
      hasDueDate: false,
      hasOutlooking: forecast.forecastDate !== null,
      gap: null,
      status: 'unknown'
    }
  }

  const dueDate = new Date(initiative.dueDate)
  const forecastDate = forecast.forecastDate

  // Calculate gap in days
  const gap = Math.round((forecastDate - dueDate) / (1000 * 60 * 60 * 24))

  let status = 'on-track'
  if (gap > 14) {
    status = 'at-risk' // More than 2 weeks late
  } else if (gap > 7) {
    status = 'warning' // 1-2 weeks late
  } else if (gap < -14) {
    status = 'ahead' // More than 2 weeks early
  }

  return {
    hasDueDate: true,
    hasForecast: true,
    dueDate,
    forecastDate,
    gap, // Positive = late, negative = early
    status,
    isLate: gap > 0,
    weeksGap: Math.round(gap / 7)
  }
}

/**
 * Get forecast for all initiatives
 */
export function forecastAllInitiatives(initiatives, issues) {
  return initiatives.map(initiative => {
    const forecast = forecastInitiativeCompletion(initiative, issues)
    const comparison = compareForecastToDueDate(initiative, forecast)

    return {
      initiativeId: initiative.id,
      initiativeName: initiative.name,
      initiativeStatus: initiative.status,
      initiativeProgress: initiative.progress,
      dueDate: initiative.dueDate,
      ...forecast,
      comparison
    }
  }).sort((a, b) => {
    // Sort by gap (most at-risk first)
    if (!a.comparison.hasDueDate) return 1
    if (!b.comparison.hasDueDate) return -1
    return b.comparison.gap - a.comparison.gap
  })
}

/**
 * Calculate Monte Carlo simulation for completion date
 * Runs 1000 simulations with random velocity variations
 */
export function monteCarloForecast(initiative, issues, simulations = 1000) {
  const velocity = calculateInitiativeVelocity(initiative, issues)
  const remainingIssues = initiative.issues.filter(i => i.state === 'opened').length

  if (velocity.weeklyAverage === 0 || remainingIssues === 0) {
    return null
  }

  const completionWeeks = []

  for (let i = 0; i < simulations; i++) {
    // Simulate velocity with random variation based on consistency
    const variationRange = (100 - velocity.consistency) / 100
    const randomFactor = 1 + ((Math.random() - 0.5) * 2 * variationRange)
    const simulatedVelocity = velocity.weeklyAverage * randomFactor

    const weeks = Math.ceil(remainingIssues / simulatedVelocity)
    completionWeeks.push(weeks)
  }

  // Sort results
  completionWeeks.sort((a, b) => a - b)

  // Calculate percentiles
  const p10 = completionWeeks[Math.floor(simulations * 0.1)]  // 10% chance of finishing by
  const p50 = completionWeeks[Math.floor(simulations * 0.5)]  // 50% chance (median)
  const p90 = completionWeeks[Math.floor(simulations * 0.9)]  // 90% chance

  return {
    percentiles: {
      p10: { weeks: p10, date: addWeeksToDate(new Date(), p10), probability: 10 },
      p50: { weeks: p50, date: addWeeksToDate(new Date(), p50), probability: 50 },
      p90: { weeks: p90, date: addWeeksToDate(new Date(), p90), probability: 90 }
    },
    range: {
      min: completionWeeks[0],
      max: completionWeeks[simulations - 1],
      average: completionWeeks.reduce((sum, w) => sum + w, 0) / simulations
    }
  }
}

/**
 * Add weeks to a date
 */
function addWeeksToDate(date, weeks) {
  const newDate = new Date(date)
  newDate.setDate(newDate.getDate() + (weeks * 7))
  return newDate
}

/**
 * Export forecast data to CSV
 */
export function exportForecastCSV(forecasts) {
  const headers = [
    'Initiative',
    'Status',
    'Progress %',
    'Due Date',
    'Forecast Date',
    'Gap (Days)',
    'Gap (Weeks)',
    'Forecast Status',
    'Weeks Remaining',
    'Confidence %',
    'Optimistic (Weeks)',
    'Pessimistic (Weeks)',
    'Weekly Velocity',
    'Remaining Issues'
  ]

  const rows = forecasts.map(f => [
    f.initiativeName,
    f.initiativeStatus,
    f.initiativeProgress,
    f.dueDate ? new Date(f.dueDate).toLocaleDateString() : 'No due date',
    f.forecastDate ? f.forecastDate.toLocaleDateString() : 'Cannot forecast',
    f.comparison.hasDueDate && f.comparison.hasForecast ? f.comparison.gap : '-',
    f.comparison.hasDueDate && f.comparison.hasForecast ? f.comparison.weeksGap : '-',
    f.comparison.status || 'unknown',
    f.weeksRemaining || '-',
    f.confidence || '-',
    f.variance?.optimistic || '-',
    f.variance?.pessimistic || '-',
    f.velocity?.weeklyAverage?.toFixed(1) || '-',
    f.remainingWork?.issues || '-'
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n')

  return csvContent
}

/**
 * Format date for display
 */
export function formatForecastDate(date) {
  if (!date) return 'N/A'
  const options = { month: 'short', day: 'numeric', year: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Get forecast status badge configuration
 */
export function getForecastStatusBadge(status) {
  const badges = {
    'on-track': {
      label: 'On Track',
      color: '#059669',
      background: '#D1FAE5'
    },
    'warning': {
      label: 'Minor Delay',
      color: '#D97706',
      background: '#FEF3C7'
    },
    'at-risk': {
      label: 'At Risk',
      color: '#DC2626',
      background: '#FEE2E2'
    },
    'ahead': {
      label: 'Ahead',
      color: '#0891B2',
      background: '#CFFAFE'
    },
    'unknown': {
      label: 'Unknown',
      color: '#6B7280',
      background: '#F3F4F6'
    }
  }

  return badges[status] || badges['unknown']
}
