/**
 * Velocity & Burndown Analytics Service
 * Calculates sprint velocity, burndown data, and predictive metrics
 */

import { getSprintFromLabels } from '../utils/labelUtils'

/**
 * Calculate velocity metrics for all sprints
 * Returns velocity data sorted by sprint number
 */
export function calculateVelocity(issues) {
  if (!issues || issues.length === 0) {
    return []
  }

  // Group issues by sprint
  const sprintMap = new Map()

  issues.forEach((issue) => {
    const sprint = getSprintFromLabels(issue.labels)
    if (!sprint) return

    if (!sprintMap.has(sprint)) {
      sprintMap.set(sprint, {
        sprint,
        totalIssues: 0,
        completedIssues: 0,
        openIssues: 0,
        completedAt: []
      })
    }

    const sprintData = sprintMap.get(sprint)
    sprintData.totalIssues++

    if (issue.state === 'closed') {
      sprintData.completedIssues++
      if (issue.closed_at) {
        sprintData.completedAt.push(new Date(issue.closed_at))
      }
    } else {
      sprintData.openIssues++
    }
  })

  // Convert to array and sort by sprint number
  const velocityData = Array.from(sprintMap.values())
    .sort((a, b) => a.sprint - b.sprint)
    .map((sprint) => ({
      ...sprint,
      velocity: sprint.completedIssues, // Velocity = completed issues
      completionRate: sprint.totalIssues > 0
        ? Math.round((sprint.completedIssues / sprint.totalIssues) * 100)
        : 0
    }))

  return velocityData
}

/**
 * Calculate average velocity over last N sprints
 */
export function calculateAverageVelocity(velocityData, lastNSprints = 3) {
  if (!velocityData || velocityData.length === 0) return 0

  const recentSprints = velocityData.slice(-lastNSprints)
  const totalVelocity = recentSprints.reduce((sum, s) => sum + s.velocity, 0)

  return Math.round(totalVelocity / recentSprints.length)
}

/**
 * Calculate velocity trend (positive = improving, negative = declining)
 */
export function calculateVelocityTrend(velocityData) {
  if (!velocityData || velocityData.length < 2) return 0

  const recent = velocityData.slice(-3)
  if (recent.length < 2) return 0

  const oldAvg = recent.slice(0, Math.floor(recent.length / 2))
    .reduce((sum, s) => sum + s.velocity, 0) / Math.floor(recent.length / 2)

  const newAvg = recent.slice(Math.floor(recent.length / 2))
    .reduce((sum, s) => sum + s.velocity, 0) / Math.ceil(recent.length / 2)

  return Math.round(((newAvg - oldAvg) / oldAvg) * 100)
}

/**
 * Calculate burndown data for current sprint
 */
export function calculateBurndown(issues, currentSprint) {
  if (!issues || !currentSprint) {
    return { actual: [], ideal: [], total: 0 }
  }

  const sprintIssues = issues.filter(
    (issue) => getSprintFromLabels(issue.labels) === currentSprint
  )

  if (sprintIssues.length === 0) {
    return { actual: [], ideal: [], total: 0 }
  }

  // Get sprint start date (earliest created_at)
  const createdDates = sprintIssues
    .map((i) => new Date(i.created_at))
    .filter((d) => !isNaN(d))

  if (createdDates.length === 0) {
    return { actual: [], ideal: [], total: 0 }
  }

  const sprintStart = new Date(Math.min(...createdDates))
  const today = new Date()

  // Calculate total duration (assume 2-week sprint if no end date)
  const sprintDuration = 14 * 24 * 60 * 60 * 1000 // 14 days in milliseconds
  const sprintEnd = new Date(sprintStart.getTime() + sprintDuration)

  const totalIssues = sprintIssues.length

  // Generate ideal burndown line (linear)
  const idealData = []
  const days = Math.ceil((sprintEnd - sprintStart) / (24 * 60 * 60 * 1000))

  for (let day = 0; day <= days; day++) {
    const date = new Date(sprintStart.getTime() + day * 24 * 60 * 60 * 1000)
    const remaining = totalIssues - (totalIssues / days) * day
    idealData.push({
      date: date.toISOString().split('T')[0],
      remaining: Math.max(0, Math.round(remaining))
    })
  }

  // Generate actual burndown (issues closed over time)
  const closedIssues = sprintIssues
    .filter((i) => i.state === 'closed' && i.closed_at)
    .map((i) => ({
      date: new Date(i.closed_at),
      issue: i
    }))
    .sort((a, b) => a.date - b.date)

  const actualData = []
  let remainingIssues = totalIssues

  // Start point
  actualData.push({
    date: sprintStart.toISOString().split('T')[0],
    remaining: totalIssues
  })

  // Track daily progress
  const dayMap = new Map()
  closedIssues.forEach(({ date }) => {
    const dateKey = date.toISOString().split('T')[0]
    dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1)
  })

  // Generate actual burndown points
  for (let day = 1; day <= days; day++) {
    const date = new Date(sprintStart.getTime() + day * 24 * 60 * 60 * 1000)
    const dateKey = date.toISOString().split('T')[0]

    if (dayMap.has(dateKey)) {
      remainingIssues -= dayMap.get(dateKey)
    }

    actualData.push({
      date: dateKey,
      remaining: Math.max(0, remainingIssues)
    })

    // Stop at today
    if (date >= today) break
  }

  return {
    actual: actualData,
    ideal: idealData,
    total: totalIssues,
    sprintStart: sprintStart.toISOString().split('T')[0],
    sprintEnd: sprintEnd.toISOString().split('T')[0]
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
 * Get current active sprint (highest sprint number with open issues)
 */
export function getCurrentSprint(issues) {
  if (!issues || issues.length === 0) return null

  const sprintsWithOpenIssues = issues
    .filter((i) => i.state === 'opened')
    .map((i) => getSprintFromLabels(i.labels))
    .filter((s) => s !== null)

  if (sprintsWithOpenIssues.length === 0) return null

  return Math.max(...sprintsWithOpenIssues)
}
