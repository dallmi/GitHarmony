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
    const sprint = getSprintFromLabels(issue.labels, issue.iteration)
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

  // Build a map of sprint name to start date for sorting
  const sprintDates = new Map()
  issues.forEach((issue) => {
    const sprint = getSprintFromLabels(issue.labels, issue.iteration)
    if (sprint && issue.iteration?.start_date && !sprintDates.has(sprint)) {
      sprintDates.set(sprint, issue.iteration.start_date)
    }
  })

  // Convert to array and sort by start date (or by sprint number for legacy format)
  const velocityData = Array.from(sprintMap.values())
    .sort((a, b) => {
      const dateA = sprintDates.get(a.sprint)
      const dateB = sprintDates.get(b.sprint)

      // If both have dates, sort by date
      if (dateA && dateB) {
        return new Date(dateA) - new Date(dateB)
      }

      // Try to parse as numbers (for legacy "Sprint X" format)
      const numA = typeof a.sprint === 'number' ? a.sprint : parseInt(a.sprint, 10)
      const numB = typeof b.sprint === 'number' ? b.sprint : parseInt(b.sprint, 10)

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      // Fallback to string comparison
      return String(a.sprint).localeCompare(String(b.sprint))
    })
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
    (issue) => getSprintFromLabels(issue.labels, issue.iteration) === currentSprint
  )

  if (sprintIssues.length === 0) {
    return { actual: [], ideal: [], total: 0 }
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

  const totalIssues = sprintIssues.length

  // Generate ideal burndown line (linear)
  const idealData = []
  // Calculate days more accurately - use floor since we're working with normalized dates
  const daysDiff = (sprintEnd - sprintStart) / (24 * 60 * 60 * 1000)
  const days = Math.round(daysDiff)  // Round to nearest whole day

  for (let day = 0; day <= days; day++) {
    const date = new Date(sprintStart.getTime() + day * 24 * 60 * 60 * 1000)
    // Use local date string to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const dayStr = String(date.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${dayStr}`

    const remaining = totalIssues - (totalIssues / days) * day
    idealData.push({
      date: dateKey,
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

  // Track daily progress
  const dayMap = new Map()
  closedIssues.forEach(({ date }) => {
    // Normalize the date and use local date string
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)
    const year = normalizedDate.getFullYear()
    const month = String(normalizedDate.getMonth() + 1).padStart(2, '0')
    const day = String(normalizedDate.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1)
  })

  // Generate actual burndown points (start at day 0 to match ideal)
  console.log('Burndown generation:', {
    sprintStart: sprintStart.toISOString(),
    sprintEnd: sprintEnd.toISOString(),
    today: today.toISOString(),
    days,
    totalIssues
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

    // For day 0, don't check closed issues (start point)
    if (day > 0 && dayMap.has(dateKey)) {
      remainingIssues -= dayMap.get(dateKey)
    }

    actualData.push({
      date: dateKey,
      remaining: Math.max(0, remainingIssues)
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
    total: totalIssues,
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
 * Get current active sprint (most recent iteration with open issues)
 */
export function getCurrentSprint(issues) {
  if (!issues || issues.length === 0) return null

  // Build a map of iteration name to start date
  const iterationDates = new Map()

  issues
    .filter((i) => i.state === 'opened')
    .forEach((issue) => {
      const sprint = getSprintFromLabels(issue.labels, issue.iteration)
      if (!sprint) return

      // Try to get the start date from the iteration object
      const startDate = issue.iteration?.start_date
      if (startDate && !iterationDates.has(sprint)) {
        iterationDates.set(sprint, startDate)
      }
    })

  if (iterationDates.size === 0) {
    // Fallback: if no iterations with dates, just return any sprint with open issues
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

  // Find the iteration with the most recent start date
  let mostRecentSprint = null
  let mostRecentDate = null

  iterationDates.forEach((date, sprint) => {
    const dateObj = new Date(date)
    if (!mostRecentDate || dateObj > mostRecentDate) {
      mostRecentDate = dateObj
      mostRecentSprint = sprint
    }
  })

  return mostRecentSprint
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
