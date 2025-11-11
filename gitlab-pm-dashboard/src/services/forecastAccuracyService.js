/**
 * Forecast Accuracy Service
 * Tracks historical predictions vs actual outcomes to build confidence in forecasting
 * Helps executives understand reliability of project timeline predictions
 */

import { getActiveProjectId } from './storageService'

const STORAGE_KEY = 'gitlab-pm-forecasts'

/**
 * Get project-specific key for localStorage
 */
function getProjectKey(baseKey) {
  const projectId = getActiveProjectId()
  if (!projectId || projectId === 'cross-project') {
    return baseKey
  }
  return `${baseKey}_${projectId}`
}

/**
 * Load forecast history from storage
 */
export function loadForecastHistory() {
  try {
    const stored = localStorage.getItem(getProjectKey(STORAGE_KEY))
    if (stored) {
      const data = JSON.parse(stored)
      // Convert date strings back to Date objects
      if (data.forecasts) {
        data.forecasts = data.forecasts.map(forecast => ({
          ...forecast,
          createdAt: new Date(forecast.createdAt),
          targetDate: new Date(forecast.targetDate),
          actualDate: forecast.actualDate ? new Date(forecast.actualDate) : null
        }))
      }
      return data
    }
  } catch (error) {
    console.error('Error loading forecast history:', error)
  }

  return {
    forecasts: [],
    lastModified: new Date().toISOString()
  }
}

/**
 * Save forecast history to storage
 */
export function saveForecastHistory(forecastData) {
  try {
    const toSave = {
      ...forecastData,
      lastModified: new Date().toISOString()
    }
    localStorage.setItem(getProjectKey(STORAGE_KEY), JSON.stringify(toSave))
    return true
  } catch (error) {
    console.error('Error saving forecast history:', error)
    return false
  }
}

/**
 * Record a new forecast
 * @param {string} type - 'milestone', 'sprint', 'epic', 'initiative'
 * @param {string} targetId - ID of the item being forecasted
 * @param {string} targetName - Name of the item
 * @param {Date} targetDate - Predicted completion date
 * @param {number} scopeSize - Number of issues/points at time of forecast
 * @param {number} confidenceScore - Confidence score (0-100) at time of forecast
 * @param {object} metadata - Additional context (velocity, team size, etc.)
 */
export function recordForecast(type, targetId, targetName, targetDate, scopeSize, confidenceScore, metadata = {}) {
  const data = loadForecastHistory()

  const forecast = {
    id: `forecast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    targetId,
    targetName,
    targetDate,
    scopeSize,
    confidenceScore,
    metadata,
    createdAt: new Date(),
    actualDate: null,
    accuracy: null,
    status: 'pending' // 'pending', 'completed', 'missed', 'cancelled'
  }

  data.forecasts.push(forecast)
  saveForecastHistory(data)

  return forecast
}

/**
 * Update forecast with actual outcome
 */
export function updateForecastOutcome(forecastId, actualDate, status = 'completed') {
  const data = loadForecastHistory()
  const forecast = data.forecasts.find(f => f.id === forecastId)

  if (!forecast) {
    return null
  }

  forecast.actualDate = actualDate
  forecast.status = status

  // Calculate accuracy if completed
  if (status === 'completed' && actualDate && forecast.targetDate) {
    const targetTime = new Date(forecast.targetDate).getTime()
    const actualTime = new Date(actualDate).getTime()
    const diffDays = Math.round((actualTime - targetTime) / (1000 * 60 * 60 * 24))

    forecast.accuracy = {
      diffDays,
      percentageError: Math.abs(diffDays / 30) * 100, // Assuming 30-day window
      wasEarly: diffDays < 0,
      wasOnTime: Math.abs(diffDays) <= 3, // Within 3 days is "on time"
      wasLate: diffDays > 3
    }
  }

  saveForecastHistory(data)
  return forecast
}

/**
 * Get forecast accuracy statistics
 */
export function getForecastAccuracyStats() {
  const data = loadForecastHistory()
  const completed = data.forecasts.filter(f => f.status === 'completed' && f.accuracy)

  if (completed.length === 0) {
    return {
      totalForecasts: data.forecasts.length,
      completedForecasts: 0,
      overallAccuracy: 0,
      avgDaysOff: 0,
      onTimeCount: 0,
      earlyCount: 0,
      lateCount: 0,
      onTimePercentage: 0,
      avgConfidenceScore: 0,
      confidenceCorrelation: 'unknown'
    }
  }

  const totalDaysOff = completed.reduce((sum, f) => sum + Math.abs(f.accuracy.diffDays), 0)
  const avgDaysOff = Math.round(totalDaysOff / completed.length)

  const onTimeCount = completed.filter(f => f.accuracy.wasOnTime).length
  const earlyCount = completed.filter(f => f.accuracy.wasEarly && !f.accuracy.wasOnTime).length
  const lateCount = completed.filter(f => f.accuracy.wasLate).length

  const avgConfidenceScore = Math.round(
    completed.reduce((sum, f) => sum + f.confidenceScore, 0) / completed.length
  )

  // Calculate overall accuracy (100% - average percentage error)
  const avgPercentageError = completed.reduce((sum, f) => sum + f.accuracy.percentageError, 0) / completed.length
  const overallAccuracy = Math.max(0, Math.round(100 - avgPercentageError))

  // Analyze correlation between confidence score and accuracy
  const highConfidenceForecasts = completed.filter(f => f.confidenceScore >= 70)
  const highConfidenceOnTime = highConfidenceForecasts.filter(f => f.accuracy.wasOnTime).length
  const highConfidenceAccuracy = highConfidenceForecasts.length > 0
    ? (highConfidenceOnTime / highConfidenceForecasts.length) * 100
    : 0

  const lowConfidenceForecasts = completed.filter(f => f.confidenceScore < 50)
  const lowConfidenceOnTime = lowConfidenceForecasts.filter(f => f.accuracy.wasOnTime).length
  const lowConfidenceAccuracy = lowConfidenceForecasts.length > 0
    ? (lowConfidenceOnTime / lowConfidenceForecasts.length) * 100
    : 0

  let confidenceCorrelation = 'unknown'
  if (highConfidenceForecasts.length >= 3 && lowConfidenceForecasts.length >= 3) {
    if (highConfidenceAccuracy > lowConfidenceAccuracy + 20) {
      confidenceCorrelation = 'strong' // Confidence scores are reliable
    } else if (highConfidenceAccuracy > lowConfidenceAccuracy + 10) {
      confidenceCorrelation = 'moderate'
    } else {
      confidenceCorrelation = 'weak' // Confidence scores don't predict accuracy well
    }
  }

  return {
    totalForecasts: data.forecasts.length,
    completedForecasts: completed.length,
    overallAccuracy,
    avgDaysOff,
    onTimeCount,
    earlyCount,
    lateCount,
    onTimePercentage: Math.round((onTimeCount / completed.length) * 100),
    avgConfidenceScore,
    confidenceCorrelation,
    highConfidenceAccuracy: Math.round(highConfidenceAccuracy),
    lowConfidenceAccuracy: Math.round(lowConfidenceAccuracy)
  }
}

/**
 * Get forecast accuracy trends over time (by month)
 */
export function getForecastAccuracyTrends(months = 6) {
  const data = loadForecastHistory()
  const completed = data.forecasts.filter(f => f.status === 'completed' && f.accuracy)

  if (completed.length === 0) {
    return []
  }

  // Group by month
  const monthlyData = {}
  completed.forEach(forecast => {
    const monthKey = new Date(forecast.createdAt).toISOString().slice(0, 7) // YYYY-MM
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        forecasts: [],
        onTime: 0,
        early: 0,
        late: 0
      }
    }
    monthlyData[monthKey].forecasts.push(forecast)
    if (forecast.accuracy.wasOnTime) monthlyData[monthKey].onTime++
    else if (forecast.accuracy.wasEarly) monthlyData[monthKey].early++
    else if (forecast.accuracy.wasLate) monthlyData[monthKey].late++
  })

  // Convert to array and calculate accuracy per month
  return Object.values(monthlyData)
    .map(month => ({
      month: month.month,
      totalForecasts: month.forecasts.length,
      onTimePercentage: Math.round((month.onTime / month.forecasts.length) * 100),
      avgDaysOff: Math.round(
        month.forecasts.reduce((sum, f) => sum + Math.abs(f.accuracy.diffDays), 0) / month.forecasts.length
      ),
      distribution: {
        onTime: month.onTime,
        early: month.early,
        late: month.late
      }
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-months)
}

/**
 * Get recent forecasts with their status
 */
export function getRecentForecasts(limit = 10) {
  const data = loadForecastHistory()
  return data.forecasts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}

/**
 * Get forecasts by status
 */
export function getForecastsByStatus(status) {
  const data = loadForecastHistory()
  return data.forecasts
    .filter(f => f.status === status)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

/**
 * Calculate forecast reliability score (0-100)
 * Based on historical accuracy and consistency
 */
export function calculateForecastReliability() {
  const stats = getForecastAccuracyStats()

  if (stats.completedForecasts < 5) {
    return {
      score: null,
      reason: 'Insufficient data (need at least 5 completed forecasts)',
      recommendation: 'Continue tracking forecasts to build confidence'
    }
  }

  let score = 0
  const factors = []

  // Factor 1: On-time delivery rate (40 points max)
  const onTimePoints = Math.round((stats.onTimePercentage / 100) * 40)
  score += onTimePoints
  factors.push({
    name: 'On-Time Rate',
    points: onTimePoints,
    maxPoints: 40,
    detail: `${stats.onTimePercentage}% on time`
  })

  // Factor 2: Average accuracy (30 points max)
  const accuracyPoints = Math.round((stats.overallAccuracy / 100) * 30)
  score += accuracyPoints
  factors.push({
    name: 'Overall Accuracy',
    points: accuracyPoints,
    maxPoints: 30,
    detail: `${stats.overallAccuracy}% accurate`
  })

  // Factor 3: Confidence correlation (20 points max)
  let correlationPoints = 0
  if (stats.confidenceCorrelation === 'strong') correlationPoints = 20
  else if (stats.confidenceCorrelation === 'moderate') correlationPoints = 12
  else if (stats.confidenceCorrelation === 'weak') correlationPoints = 5
  score += correlationPoints
  factors.push({
    name: 'Confidence Reliability',
    points: correlationPoints,
    maxPoints: 20,
    detail: `${stats.confidenceCorrelation} correlation`
  })

  // Factor 4: Sample size (10 points max)
  const samplePoints = Math.min(10, Math.round((stats.completedForecasts / 20) * 10))
  score += samplePoints
  factors.push({
    name: 'Data Sample',
    points: samplePoints,
    maxPoints: 10,
    detail: `${stats.completedForecasts} forecasts`
  })

  let recommendation = ''
  if (score >= 80) {
    recommendation = 'Excellent forecast reliability. Predictions are highly trustworthy.'
  } else if (score >= 60) {
    recommendation = 'Good forecast reliability. Continue monitoring and refining.'
  } else if (score >= 40) {
    recommendation = 'Moderate reliability. Focus on improving accuracy factors.'
  } else {
    recommendation = 'Low reliability. Review forecasting methodology and assumptions.'
  }

  return {
    score,
    factors,
    recommendation,
    stats
  }
}

/**
 * Auto-detect and record forecasts from velocity data
 * This can be called periodically to track implicit forecasts
 */
export function autoRecordForecastsFromMilestones(milestones, currentVelocity) {
  const data = loadForecastHistory()
  const newForecasts = []

  milestones.forEach(milestone => {
    // Check if we already have a forecast for this milestone
    const existingForecast = data.forecasts.find(
      f => f.type === 'milestone' && f.targetId === milestone.id && f.status === 'pending'
    )

    if (!existingForecast && milestone.due_date && milestone.stats) {
      const openIssues = milestone.stats.total_issues - milestone.stats.closed_issues
      const projectedDate = new Date(milestone.due_date)

      // Simple confidence based on progress and time remaining
      const progress = (milestone.stats.closed_issues / milestone.stats.total_issues) * 100
      const daysUntilDue = Math.ceil((new Date(milestone.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      let confidence = 50

      if (progress > 80 && daysUntilDue > 0) confidence = 85
      else if (progress > 60 && daysUntilDue > 3) confidence = 70
      else if (progress < 30 && daysUntilDue < 7) confidence = 30

      const forecast = recordForecast(
        'milestone',
        milestone.id,
        milestone.title,
        projectedDate,
        milestone.stats.total_issues,
        confidence,
        {
          progress,
          openIssues,
          velocity: currentVelocity,
          autoGenerated: true
        }
      )

      newForecasts.push(forecast)
    }
  })

  return newForecasts
}
