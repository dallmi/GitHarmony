/**
 * Velocity & Burndown Analytics Service
 *
 * This service now delegates sprint velocity calculations to the unified velocity service
 * while maintaining all additional analytics functionality (burndown, burnup, confidence, etc.)
 */

import { getSprintFromLabels } from '../utils/labelUtils'
import { getAnalyticsVelocity } from './unifiedVelocityService'

/**
 * Calculate velocity metrics for all sprints
 * DELEGATES TO UNIFIED SERVICE for consistency
 * Returns velocity data sorted by sprint number
 * Tracks both issue count and story points
 */
export function calculateVelocity(issues) {
  if (!issues || issues.length === 0) {
    return []
  }

  // Use the unified service to get velocity data
  const result = getAnalyticsVelocity(issues, 'points')

  // The unified service returns { velocityData, avgVelocity, dataQuality }
  // We just need the velocityData array for backward compatibility
  return result.velocityData || []
}

/**
 * Calculate average velocity over last N sprints
 * Returns both issue count and story points averages
 * IMPORTANT: Only includes COMPLETED sprints in the average (excludes current/ongoing sprint)
 * @param {Array} velocityData - Array of sprint velocity data
 * @param {number} lastNSprints - Number of sprints to average (default: 3)
 * @param {string} currentSprintName - Optional: name of current sprint to use as end point
 * @returns {Object} { byIssues, byPoints, sprintsUsed } - Averages and actual sprint count
 */
export function calculateAverageVelocity(velocityData, lastNSprints = 3, currentSprintName = null) {
  if (!velocityData || velocityData.length === 0) {
    return { byIssues: 0, byPoints: 0, sprintsUsed: 0 }
  }

  // Filter out incomplete sprints (only include completed sprints)
  const today = new Date()
  const completedSprints = velocityData.filter(sprint => {
    if (!sprint.endDate) return false
    const endDate = new Date(sprint.endDate)
    return endDate < today // Sprint has ended
  })

  // If a current sprint name is specified, use it as the endpoint
  let sprintsToAnalyze = completedSprints
  if (currentSprintName) {
    const currentIndex = completedSprints.findIndex(s => s.sprint === currentSprintName)
    if (currentIndex >= 0) {
      // Take completed sprints up to and including the specified sprint
      sprintsToAnalyze = completedSprints.slice(0, currentIndex + 1)
    }
  }

  // Take the most recent N completed sprints
  const recentSprints = sprintsToAnalyze.slice(-lastNSprints)

  if (recentSprints.length === 0) {
    return { byIssues: 0, byPoints: 0, sprintsUsed: 0 }
  }

  const totalVelocity = recentSprints.reduce((sum, s) => sum + s.velocity, 0)
  const totalPoints = recentSprints.reduce((sum, s) => sum + (s.velocityPoints || 0), 0)

  return {
    byIssues: Math.round(totalVelocity / recentSprints.length),
    byPoints: Math.round(totalPoints / recentSprints.length),
    sprintsUsed: recentSprints.length
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
 * IMPORTANT: Only includes COMPLETED sprints in trend calculations (excludes current/ongoing sprint)
 * @param {Array} velocityData - Array of sprint velocity data
 * @param {string} currentSprintName - Optional: name of current sprint to use instead of most recent
 * @param {string} mode - 'issues' or 'points' (default: 'issues')
 * @returns {Object} { shortTerm, longTerm } - Both trend percentages
 */
export function calculateVelocityTrend(velocityData, currentSprintName = null, mode = 'issues') {
  if (!velocityData || velocityData.length < 2) {
    return { shortTerm: 0, longTerm: 0 }
  }

  // Filter out incomplete sprints (only include completed sprints)
  const today = new Date()
  const completedSprints = velocityData.filter(sprint => {
    if (!sprint.endDate) return false
    const endDate = new Date(sprint.endDate)
    return endDate < today // Sprint has ended
  })

  if (completedSprints.length < 2) {
    return { shortTerm: 0, longTerm: 0 }
  }

  // Find the current sprint index (to avoid using future sprints)
  let currentIndex = completedSprints.length - 1
  if (currentSprintName) {
    const foundIndex = completedSprints.findIndex(s => s.sprint === currentSprintName)
    if (foundIndex >= 0) {
      currentIndex = foundIndex
    }
  }

  // Need at least one previous sprint
  if (currentIndex < 1) {
    return { shortTerm: 0, longTerm: 0 }
  }

  // Helper to get velocity value based on mode
  const getVelocityValue = (sprint) => mode === 'points' ? (sprint.velocityPoints || 0) : sprint.velocity

  // SHORT-TERM TREND: Current sprint vs previous sprint
  const currentSprint = completedSprints[currentIndex]
  const previousSprint = completedSprints[currentIndex - 1]

  let shortTerm = 0
  const previousValue = getVelocityValue(previousSprint)
  if (previousValue > 0) {
    const currentValue = getVelocityValue(currentSprint)
    shortTerm = Math.round(((currentValue - previousValue) / previousValue) * 100)
  }

  // LONG-TERM TREND: Average of last 3 sprints vs average of 3 sprints before that
  let longTerm = 0

  // Need at least 4 sprints for long-term trend (2 groups of 2+ sprints)
  if (currentIndex >= 3) {
    // Recent 3 sprints (including current)
    const recentStart = Math.max(0, currentIndex - 2)
    const recentSprints = completedSprints.slice(recentStart, currentIndex + 1)
    const recentAvg = recentSprints.reduce((sum, s) => sum + getVelocityValue(s), 0) / recentSprints.length

    // Previous 3 sprints (before the recent group)
    const previousStart = Math.max(0, recentStart - 3)
    const previousEnd = recentStart
    const previousSprints = completedSprints.slice(previousStart, previousEnd)

    if (previousSprints.length > 0) {
      const previousAvg = previousSprints.reduce((sum, s) => sum + getVelocityValue(s), 0) / previousSprints.length

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
 * Calculate burnup chart data for scope tracking over time
 * Shows total scope vs completed work, revealing scope creep
 *
 * @param {Array} issues - All project issues
 * @param {String} startDate - Project/tracking start date (ISO string)
 * @param {Number} maxDataPoints - Maximum data points to return (defaults to 26 for 6 months of biweekly sprints)
 * @param {Number} trailingMonths - Number of months to look back (defaults to 12 for 1 year trailing window)
 * @returns {Object} Burnup chart data with dates, scope, and completion lines
 */
export function calculateBurnupData(issues, startDate = null, maxDataPoints = 26, trailingMonths = 12) {
  if (!issues || issues.length === 0) {
    return {
      dataPoints: [],
      totalScope: 0,
      completed: 0,
      remaining: 0,
      scopeGrowth: 0,
      projectedCompletion: null
    }
  }

  // Determine start date - use trailing window from today
  let chartStartDate
  if (startDate) {
    chartStartDate = new Date(startDate)
  } else {
    // Use trailing window (default 12 months back from today)
    const today = new Date()
    chartStartDate = new Date(today.getFullYear(), today.getMonth() - trailingMonths, today.getDate())
  }

  // Normalize to midnight
  chartStartDate.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate total time span and create data points
  const totalDays = Math.floor((today - chartStartDate) / (24 * 60 * 60 * 1000))
  const dataPointInterval = Math.max(1, Math.ceil(totalDays / maxDataPoints))

  const dataPoints = []
  let currentDate = new Date(chartStartDate)

  // Track scope and completion for each data point
  while (currentDate <= today) {
    const scopeAtDate = issues.filter(i => {
      const createdDate = i.created_at ? new Date(i.created_at) : null
      return createdDate && createdDate <= currentDate
    })

    const completedAtDate = scopeAtDate.filter(i => {
      if (i.state !== 'closed' || !i.closed_at) return false
      const closedDate = new Date(i.closed_at)
      return closedDate <= currentDate
    })

    // Calculate points (weight) as well
    const scopePoints = scopeAtDate.reduce((sum, i) => sum + (i.weight || 0), 0)
    const completedPoints = completedAtDate.reduce((sum, i) => sum + (i.weight || 0), 0)

    dataPoints.push({
      date: currentDate.toISOString().split('T')[0],
      totalScope: scopeAtDate.length,
      completed: completedAtDate.length,
      remaining: scopeAtDate.length - completedAtDate.length,
      scopePoints,
      completedPoints,
      remainingPoints: scopePoints - completedPoints
    })

    // Move to next interval
    currentDate = new Date(currentDate.getTime() + dataPointInterval * 24 * 60 * 60 * 1000)
  }

  // Ensure we have a data point for today
  if (dataPoints.length === 0 || dataPoints[dataPoints.length - 1].date !== today.toISOString().split('T')[0]) {
    const allScope = issues
    const allCompleted = issues.filter(i => i.state === 'closed')

    dataPoints.push({
      date: today.toISOString().split('T')[0],
      totalScope: allScope.length,
      completed: allCompleted.length,
      remaining: allScope.length - allCompleted.length,
      scopePoints: allScope.reduce((sum, i) => sum + (i.weight || 0), 0),
      completedPoints: allCompleted.reduce((sum, i) => sum + (i.weight || 0), 0),
      remainingPoints: allScope.reduce((sum, i) => sum + (i.weight || 0), 0) - allCompleted.reduce((sum, i) => sum + (i.weight || 0), 0)
    })
  }

  // Calculate scope growth (difference between first and last data point)
  const initialScope = dataPoints[0]?.totalScope || 0
  const currentScope = dataPoints[dataPoints.length - 1]?.totalScope || 0
  const scopeGrowth = currentScope - initialScope
  const scopeGrowthPercent = initialScope > 0 ? Math.round((scopeGrowth / initialScope) * 100) : 0

  // Calculate velocity from recent data points (last 6 for ~3 months)
  const recentPoints = dataPoints.slice(-6)
  let avgVelocity = 0
  if (recentPoints.length >= 2) {
    const completionDiff = recentPoints[recentPoints.length - 1].completed - recentPoints[0].completed
    const timeDiff = recentPoints.length - 1
    avgVelocity = timeDiff > 0 ? completionDiff / timeDiff : 0
  }

  // Project completion date based on current velocity
  let projectedCompletion = null
  const currentData = dataPoints[dataPoints.length - 1]
  if (avgVelocity > 0 && currentData && currentData.remaining > 0) {
    const intervalsRemaining = Math.ceil(currentData.remaining / avgVelocity)
    const projectionDate = new Date(today.getTime() + intervalsRemaining * dataPointInterval * 24 * 60 * 60 * 1000)
    projectedCompletion = projectionDate.toISOString().split('T')[0]
  }

  return {
    dataPoints,
    totalScope: currentData?.totalScope || 0,
    completed: currentData?.completed || 0,
    remaining: currentData?.remaining || 0,
    scopeGrowth,
    scopeGrowthPercent,
    initialScope,
    avgVelocity: Math.round(avgVelocity * 10) / 10,
    projectedCompletion,
    chartStartDate: chartStartDate.toISOString().split('T')[0]
  }
}

/**
 * Calculate 6-month velocity trend for executive dashboard
 * Provides historical velocity view with moving averages
 *
 * @param {Array} issues - All project issues
 * @param {Number} months - Number of months to look back (defaults to 6)
 * @returns {Object} Velocity trend data with weekly/biweekly granularity
 */
export function calculateVelocityTrendHistory(issues, months = 6) {
  if (!issues || issues.length === 0) {
    return {
      dataPoints: [],
      avgVelocity: 0,
      trend: 0,
      peakVelocity: 0,
      lowVelocity: 0
    }
  }

  // Calculate cutoff date (N months ago)
  const today = new Date()
  const cutoffDate = new Date(today.getFullYear(), today.getMonth() - months, today.getDate())
  cutoffDate.setHours(0, 0, 0, 0)

  // Filter issues closed in the last N months
  const recentIssues = issues.filter(i => {
    if (i.state !== 'closed' || !i.closed_at) return false
    const closedDate = new Date(i.closed_at)
    return closedDate >= cutoffDate
  })

  // Group by 2-week intervals (sprint-like periods)
  const dataPoints = []
  let currentInterval = new Date(cutoffDate)

  while (currentInterval <= today) {
    const intervalEnd = new Date(currentInterval.getTime() + 14 * 24 * 60 * 60 * 1000)

    const closedInInterval = recentIssues.filter(i => {
      const closedDate = new Date(i.closed_at)
      return closedDate >= currentInterval && closedDate < intervalEnd
    })

    const issueCount = closedInInterval.length
    const pointsCount = closedInInterval.reduce((sum, i) => sum + (i.weight || 0), 0)

    dataPoints.push({
      startDate: currentInterval.toISOString().split('T')[0],
      endDate: intervalEnd.toISOString().split('T')[0],
      issueCount,
      pointsCount
    })

    currentInterval = intervalEnd
  }

  // Calculate moving average (last 3 periods)
  const movingAverages = dataPoints.map((point, index) => {
    const start = Math.max(0, index - 2)
    const relevantPoints = dataPoints.slice(start, index + 1)
    const avgIssues = relevantPoints.reduce((sum, p) => sum + p.issueCount, 0) / relevantPoints.length
    const avgPoints = relevantPoints.reduce((sum, p) => sum + p.pointsCount, 0) / relevantPoints.length

    return {
      ...point,
      movingAvgIssues: Math.round(avgIssues * 10) / 10,
      movingAvgPoints: Math.round(avgPoints * 10) / 10
    }
  })

  // Calculate overall metrics
  const totalIssues = dataPoints.reduce((sum, p) => sum + p.issueCount, 0)
  const totalPoints = dataPoints.reduce((sum, p) => sum + p.pointsCount, 0)
  const avgVelocityIssues = dataPoints.length > 0 ? totalIssues / dataPoints.length : 0
  const avgVelocityPoints = dataPoints.length > 0 ? totalPoints / dataPoints.length : 0

  // Calculate trend (compare first half vs second half)
  const midpoint = Math.floor(dataPoints.length / 2)
  const firstHalf = dataPoints.slice(0, midpoint)
  const secondHalf = dataPoints.slice(midpoint)

  let trendIssues = 0
  let trendPoints = 0

  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.issueCount, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.issueCount, 0) / secondHalf.length

    trendIssues = firstHalfAvg > 0 ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0

    const firstHalfAvgPoints = firstHalf.reduce((sum, p) => sum + p.pointsCount, 0) / firstHalf.length
    const secondHalfAvgPoints = secondHalf.reduce((sum, p) => sum + p.pointsCount, 0) / secondHalf.length

    trendPoints = firstHalfAvgPoints > 0 ? Math.round(((secondHalfAvgPoints - firstHalfAvgPoints) / firstHalfAvgPoints) * 100) : 0
  }

  // Find peak and low velocity
  const peakVelocityIssues = Math.max(...dataPoints.map(p => p.issueCount), 0)
  const lowVelocityIssues = Math.min(...dataPoints.map(p => p.issueCount), 0)
  const peakVelocityPoints = Math.max(...dataPoints.map(p => p.pointsCount), 0)
  const lowVelocityPoints = Math.min(...dataPoints.map(p => p.pointsCount), 0)

  return {
    dataPoints: movingAverages,
    avgVelocityIssues: Math.round(avgVelocityIssues * 10) / 10,
    avgVelocityPoints: Math.round(avgVelocityPoints * 10) / 10,
    trendIssues,
    trendPoints,
    peakVelocityIssues,
    lowVelocityIssues,
    peakVelocityPoints,
    lowVelocityPoints,
    periodCount: dataPoints.length,
    months
  }
}

/**
 * Calculate delivery confidence score - answers "Will we hit our target?"
 * Combines velocity consistency, risk indicators, and capacity trends
 *
 * @param {Array} issues - All project issues
 * @param {Object} targetDate - Optional target completion date (Date object)
 * @param {Number} targetScope - Optional target scope (number of issues)
 * @returns {Object} Confidence score with breakdown and recommendations
 */
export function calculateDeliveryConfidence(issues) {
  if (!issues || issues.length === 0) {
    return {
      score: 0,
      status: 'unknown',
      factors: [],
      recommendations: [],
      breakdown: {}
    }
  }

  const factors = []
  let totalScore = 0
  let maxScore = 0

  // Factor 1: Velocity Consistency (30 points max)
  // Stable velocity = higher confidence
  const velocityData = calculateVelocity(issues)
  if (velocityData.length >= 3) {
    const recent3 = velocityData.slice(-3).map(v => v.velocity)
    const avg = recent3.reduce((sum, v) => sum + v, 0) / recent3.length
    const variance = recent3.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / recent3.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = avg > 0 ? (stdDev / avg) * 100 : 100

    let velocityConsistencyScore = 0
    if (coefficientOfVariation < 15) {
      velocityConsistencyScore = 30 // Very consistent
    } else if (coefficientOfVariation < 30) {
      velocityConsistencyScore = 20 // Moderately consistent
    } else if (coefficientOfVariation < 50) {
      velocityConsistencyScore = 10 // Somewhat variable
    } else {
      velocityConsistencyScore = 0 // Highly variable
    }

    totalScore += velocityConsistencyScore
    maxScore += 30

    factors.push({
      name: 'Velocity Consistency',
      score: velocityConsistencyScore,
      maxScore: 30,
      status: velocityConsistencyScore >= 20 ? 'good' : velocityConsistencyScore >= 10 ? 'warning' : 'risk',
      detail: `Coefficient of variation: ${Math.round(coefficientOfVariation)}%`
    })
  }

  // Factor 2: Scope Stability (25 points max)
  // Measures whether the gap between scope and completion is growing (bad) or shrinking (good)
  const burnupData = calculateBurnupData(issues)
  let scopeStabilityScore = 0
  let scopeStabilityDetail = ''

  // Calculate gap trend: are we getting closer to done or falling behind?
  if (burnupData.dataPoints && burnupData.dataPoints.length >= 2) {
    const firstPoint = burnupData.dataPoints[0]
    const lastPoint = burnupData.dataPoints[burnupData.dataPoints.length - 1]

    const initialGap = firstPoint.remaining
    const currentGap = lastPoint.remaining

    // Calculate gap change - negative means gap is shrinking (good!)
    const gapChange = currentGap - initialGap
    const gapChangePercent = initialGap > 0 ? Math.round((gapChange / initialGap) * 100) : 0

    // Score based on gap trend
    if (gapChangePercent <= -20) {
      scopeStabilityScore = 25 // Gap shrinking fast (excellent)
      scopeStabilityDetail = `Gap shrinking: ${Math.abs(gapChangePercent)}% (${Math.abs(gapChange)} fewer items)`
    } else if (gapChangePercent <= 0) {
      scopeStabilityScore = 22 // Gap shrinking (very good)
      scopeStabilityDetail = `Gap shrinking: ${Math.abs(gapChangePercent)}% (${Math.abs(gapChange)} fewer items)`
    } else if (gapChangePercent <= 10) {
      scopeStabilityScore = 18 // Small gap growth (acceptable)
      scopeStabilityDetail = `Gap growing slowly: +${gapChangePercent}% (+${gapChange} items)`
    } else if (gapChangePercent <= 25) {
      scopeStabilityScore = 12 // Moderate gap growth (concerning)
      scopeStabilityDetail = `Gap growing: +${gapChangePercent}% (+${gapChange} items)`
    } else if (gapChangePercent <= 50) {
      scopeStabilityScore = 6 // Significant gap growth (risky)
      scopeStabilityDetail = `Gap growing significantly: +${gapChangePercent}% (+${gapChange} items)`
    } else {
      scopeStabilityScore = 0 // Excessive gap growth (critical)
      scopeStabilityDetail = `Gap growing rapidly: +${gapChangePercent}% (+${gapChange} items)`
    }
  } else {
    // Fallback to old logic if insufficient data points
    if (burnupData.scopeGrowthPercent <= 5) {
      scopeStabilityScore = 25
    } else if (burnupData.scopeGrowthPercent <= 15) {
      scopeStabilityScore = 20
    } else if (burnupData.scopeGrowthPercent <= 30) {
      scopeStabilityScore = 10
    } else {
      scopeStabilityScore = 0
    }
    scopeStabilityDetail = `Scope growth: ${burnupData.scopeGrowthPercent}% (+${burnupData.scopeGrowth} items)`
  }

  totalScore += scopeStabilityScore
  maxScore += 25

  factors.push({
    name: 'Scope Stability',
    score: scopeStabilityScore,
    maxScore: 25,
    status: scopeStabilityScore >= 20 ? 'good' : scopeStabilityScore >= 12 ? 'warning' : 'risk',
    detail: scopeStabilityDetail
  })

  // Factor 3: Completion Rate (20 points max)
  // Higher completion rate = on track
  const completionRate = burnupData.totalScope > 0
    ? (burnupData.completed / burnupData.totalScope) * 100
    : 0

  let completionRateScore = 0
  if (completionRate >= 80) {
    completionRateScore = 20
  } else if (completionRate >= 60) {
    completionRateScore = 15
  } else if (completionRate >= 40) {
    completionRateScore = 10
  } else if (completionRate >= 20) {
    completionRateScore = 5
  } else {
    completionRateScore = 0
  }

  totalScore += completionRateScore
  maxScore += 20

  factors.push({
    name: 'Completion Progress',
    score: completionRateScore,
    maxScore: 20,
    status: completionRateScore >= 15 ? 'good' : completionRateScore >= 10 ? 'warning' : 'risk',
    detail: `${Math.round(completionRate)}% complete (${burnupData.completed}/${burnupData.totalScope})`
  })

  // Factor 4: Blockers and Risks (15 points max)
  // Fewer blockers = higher confidence
  const openIssues = issues.filter(i => i.state === 'opened')
  const blockers = openIssues.filter(i => {
    const labels = i.labels?.map(l => l.toLowerCase()) || []
    return labels.some(l => l.includes('blocker') || l.includes('blocked'))
  })

  const blockerPercentage = openIssues.length > 0
    ? (blockers.length / openIssues.length) * 100
    : 0

  let riskScore = 0
  if (blockerPercentage === 0) {
    riskScore = 15
  } else if (blockerPercentage < 5) {
    riskScore = 10
  } else if (blockerPercentage < 10) {
    riskScore = 5
  } else {
    riskScore = 0
  }

  totalScore += riskScore
  maxScore += 15

  factors.push({
    name: 'Risk Profile',
    score: riskScore,
    maxScore: 15,
    status: riskScore >= 10 ? 'good' : riskScore >= 5 ? 'warning' : 'risk',
    detail: `${blockers.length} blocker(s) (${Math.round(blockerPercentage)}% of open issues)`
  })

  // Factor 5: Velocity Trend (10 points max)
  // Improving velocity = higher confidence
  const currentSprint = getCurrentSprint(issues)
  const trendData = calculateVelocityTrend(velocityData, currentSprint)
  const trend = typeof trendData === 'object' ? trendData.longTerm : trendData

  let trendScore = 0
  if (trend > 10) {
    trendScore = 10 // Strong improvement
  } else if (trend > 0) {
    trendScore = 8 // Slight improvement
  } else if (trend >= -10) {
    trendScore = 5 // Stable or slight decline
  } else {
    trendScore = 0 // Significant decline
  }

  totalScore += trendScore
  maxScore += 10

  factors.push({
    name: 'Velocity Trend',
    score: trendScore,
    maxScore: 10,
    status: trendScore >= 8 ? 'good' : trendScore >= 5 ? 'warning' : 'risk',
    detail: `${trend >= 0 ? '+' : ''}${trend}% long-term trend`
  })

  // Calculate final confidence percentage
  const confidencePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  // Determine status
  let status = 'unknown'
  let statusColor = '#6B7280'
  if (confidencePercent >= 75) {
    status = 'high'
    statusColor = '#16A34A' // Green
  } else if (confidencePercent >= 50) {
    status = 'medium'
    statusColor = '#EAB308' // Yellow
  } else if (confidencePercent >= 25) {
    status = 'low'
    statusColor = '#F97316' // Orange
  } else {
    status = 'critical'
    statusColor = '#DC2626' // Red
  }

  // Generate recommendations
  const recommendations = []

  if (factors[0].score < 20) {
    recommendations.push({
      priority: 'high',
      category: 'velocity',
      title: 'Stabilize velocity',
      description: 'Velocity is inconsistent. Focus on predictable sprint planning and reducing interruptions.'
    })
  }

  if (factors[1].score < 20) {
    // Use the new gap-based detail for recommendations
    const scopeFactor = factors[1]
    const isGapGrowing = scopeFactor.detail.includes('growing')

    if (isGapGrowing) {
      recommendations.push({
        priority: 'high',
        category: 'scope',
        title: 'Address growing backlog',
        description: scopeFactor.detail + '. New work is being added faster than completion. Consider increasing capacity or reducing scope.'
      })
    } else {
      recommendations.push({
        priority: 'medium',
        category: 'scope',
        title: 'Monitor scope stability',
        description: scopeFactor.detail + '. Keep monitoring to ensure the gap continues to shrink.'
      })
    }
  }

  if (factors[3].score < 10) {
    recommendations.push({
      priority: 'critical',
      category: 'blockers',
      title: 'Address blockers immediately',
      description: `${blockers.length} blocker(s) are impacting delivery. Escalate and resolve critical impediments.`
    })
  }

  if (factors[4].score < 5) {
    recommendations.push({
      priority: 'high',
      category: 'velocity',
      title: 'Investigate velocity decline',
      description: 'Velocity is declining. Review team capacity, technical debt, and process bottlenecks.'
    })
  }

  if (completionRate < 50 && burnupData.remaining > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'progress',
      title: 'Accelerate delivery pace',
      description: `${burnupData.remaining} items remaining. Consider increasing team capacity or reducing scope.`
    })
  }

  return {
    score: confidencePercent,
    status,
    statusColor,
    factors,
    recommendations,
    breakdown: {
      totalScore,
      maxScore,
      completionRate: Math.round(completionRate),
      blockerCount: blockers.length,
      scopeGrowth: burnupData.scopeGrowthPercent,
      velocityTrend: trend
    }
  }
}

/**
 * Calculate trailing 30-day comparison metrics for executive reporting
 * Compares last 30 days vs previous 30 days across key metrics
 * This provides a fair comparison since both periods are complete
 *
 * @param {Array} issues - All project issues
 * @returns {Object} Trailing 30-day comparison data
 */
export function calculateMonthOverMonthMetrics(issues) {
  if (!issues || issues.length === 0) {
    return {
      currentPeriod: { name: '', issues: 0, completed: 0, velocity: 0, points: 0 },
      previousPeriod: { name: '', issues: 0, completed: 0, velocity: 0, points: 0 },
      changes: { issues: 0, completed: 0, velocity: 0, points: 0 },
      percentChanges: { issues: 0, completed: 0, velocity: 0, points: 0 }
    }
  }

  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today

  // Last 30 days (days 0-29 counting back from today)
  const last30DaysEnd = new Date(today)
  const last30DaysStart = new Date(today)
  last30DaysStart.setDate(last30DaysStart.getDate() - 29) // 30 days including today
  last30DaysStart.setHours(0, 0, 0, 0)

  // Previous 30 days (days 30-59 counting back from today)
  const previous30DaysEnd = new Date(last30DaysStart)
  previous30DaysEnd.setHours(23, 59, 59, 999)
  previous30DaysEnd.setDate(previous30DaysEnd.getDate() - 1) // Day before last30DaysStart
  const previous30DaysStart = new Date(previous30DaysEnd)
  previous30DaysStart.setDate(previous30DaysStart.getDate() - 29) // 30 days total
  previous30DaysStart.setHours(0, 0, 0, 0)

  // Format period names
  const formatPeriodName = (start, end) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const startMonth = monthNames[start.getMonth()]
    const endMonth = monthNames[end.getMonth()]
    const startDay = start.getDate()
    const endDay = end.getDate()

    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${startDay}-${endDay}`
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
    }
  }

  const currentPeriodName = formatPeriodName(last30DaysStart, last30DaysEnd)
  const previousPeriodName = formatPeriodName(previous30DaysStart, previous30DaysEnd)

  // Last 30 days metrics
  const last30DaysIssues = issues.filter(i => {
    const created = i.created_at ? new Date(i.created_at) : null
    return created && created >= last30DaysStart && created <= last30DaysEnd
  })

  const last30DaysCompleted = issues.filter(i => {
    if (i.state !== 'closed' || !i.closed_at) return false
    const closed = new Date(i.closed_at)
    return closed >= last30DaysStart && closed <= last30DaysEnd
  })

  const last30DaysPoints = last30DaysCompleted.reduce((sum, i) => sum + (i.weight || 0), 0)
  const last30DaysVelocity = last30DaysCompleted.length

  // Previous 30 days metrics
  const previous30DaysIssues = issues.filter(i => {
    const created = i.created_at ? new Date(i.created_at) : null
    return created && created >= previous30DaysStart && created <= previous30DaysEnd
  })

  const previous30DaysCompleted = issues.filter(i => {
    if (i.state !== 'closed' || !i.closed_at) return false
    const closed = new Date(i.closed_at)
    return closed >= previous30DaysStart && closed <= previous30DaysEnd
  })

  const previous30DaysPoints = previous30DaysCompleted.reduce((sum, i) => sum + (i.weight || 0), 0)
  const previous30DaysVelocity = previous30DaysCompleted.length

  // Calculate changes
  const issuesChange = last30DaysIssues.length - previous30DaysIssues.length
  const completedChange = last30DaysVelocity - previous30DaysVelocity
  const pointsChange = last30DaysPoints - previous30DaysPoints

  // Calculate percentage changes
  const issuesPercentChange = previous30DaysIssues.length > 0
    ? Math.round((issuesChange / previous30DaysIssues.length) * 100)
    : 0

  const completedPercentChange = previous30DaysVelocity > 0
    ? Math.round((completedChange / previous30DaysVelocity) * 100)
    : 0

  const pointsPercentChange = previous30DaysPoints > 0
    ? Math.round((pointsChange / previous30DaysPoints) * 100)
    : 0

  return {
    currentPeriod: {
      name: currentPeriodName,
      issues: last30DaysIssues.length,
      completed: last30DaysVelocity,
      velocity: last30DaysVelocity,
      points: last30DaysPoints
    },
    previousPeriod: {
      name: previousPeriodName,
      issues: previous30DaysIssues.length,
      completed: previous30DaysVelocity,
      velocity: previous30DaysVelocity,
      points: previous30DaysPoints
    },
    changes: {
      issues: issuesChange,
      completed: completedChange,
      velocity: completedChange,
      points: pointsChange
    },
    percentChanges: {
      issues: issuesPercentChange,
      completed: completedPercentChange,
      velocity: completedPercentChange,
      points: pointsPercentChange
    }
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
    .filter(([, data]) => data.hoursLost > 0)
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