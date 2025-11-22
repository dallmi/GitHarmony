/**
 * Sprint Goal Management Service
 * Manages sprint goals and tracks achievement history
 */

const STORAGE_KEY = 'sprintGoals'

/**
 * Get all sprint goals from localStorage
 */
export function getAllSprintGoals() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading sprint goals:', error)
    return []
  }
}

/**
 * Get current active sprint goal
 * Uses current iteration/sprint from context if available
 */
export function getCurrentSprintGoal(sprintId = 'current') {
  const goals = getAllSprintGoals()
  return goals.find(g => g.sprintId === sprintId) || null
}

/**
 * Save or update a sprint goal
 */
export function saveSprintGoal(sprintGoal) {
  const goals = getAllSprintGoals()

  // Check if goal already exists for this sprint
  const existingIndex = goals.findIndex(g => g.sprintId === sprintGoal.sprintId)

  if (existingIndex >= 0) {
    // Update existing goal
    goals[existingIndex] = {
      ...goals[existingIndex],
      ...sprintGoal,
      updatedAt: new Date().toISOString()
    }
  } else {
    // Add new goal
    goals.push({
      ...sprintGoal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  return goals
}

/**
 * Delete a sprint goal
 */
export function deleteSprintGoal(sprintId) {
  const goals = getAllSprintGoals()
  const filtered = goals.filter(g => g.sprintId !== sprintId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return filtered
}

/**
 * Get sprint goal history
 */
export function getSprintGoalHistory() {
  const goals = getAllSprintGoals()

  // Sort by creation date, newest first
  return goals.sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

/**
 * Calculate sprint goal achievement rate
 */
export function calculateAchievementRate() {
  const goals = getAllSprintGoals()

  const goalsWithStatus = goals.filter(g => g.achievement !== undefined && g.achievement !== null)

  if (goalsWithStatus.length === 0) {
    return {
      totalGoals: goals.length,
      achievedCount: 0,
      partialCount: 0,
      missedCount: 0,
      achievementRate: 0
    }
  }

  const achievedCount = goalsWithStatus.filter(g => g.achievement === 'met').length
  const partialCount = goalsWithStatus.filter(g => g.achievement === 'partial').length
  const missedCount = goalsWithStatus.filter(g => g.achievement === 'not-met').length

  // Calculate weighted achievement rate
  // Met = 100%, Partial = 50%, Not Met = 0%
  const weightedScore = (achievedCount * 100) + (partialCount * 50)
  const achievementRate = Math.round(weightedScore / goalsWithStatus.length)

  return {
    totalGoals: goals.length,
    goalsWithStatus: goalsWithStatus.length,
    achievedCount,
    partialCount,
    missedCount,
    achievementRate
  }
}

/**
 * Get sprint goal statistics for display
 */
export function getSprintGoalStats() {
  const history = getSprintGoalHistory()
  const rate = calculateAchievementRate()

  // Get last 5 sprints for trend
  const recent = history.slice(0, 5)
  const recentAchieved = recent.filter(g => g.achievement === 'met').length

  return {
    ...rate,
    recentSprints: recent.length,
    recentAchieved,
    recentRate: recent.length > 0 ? Math.round((recentAchieved / recent.length) * 100) : 0,
    hasGoals: history.length > 0
  }
}

/**
 * Create a default sprint goal template
 */
export function createDefaultGoal(sprintId = 'current', sprintName = 'Current Sprint') {
  return {
    sprintId,
    sprintName,
    goal: '',
    successCriteria: [],
    achievement: null, // null, 'met', 'partial', 'not-met'
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Export sprint goal history to CSV
 */
export function exportSprintGoalsCSV() {
  const goals = getSprintGoalHistory()

  const headers = [
    'Sprint ID',
    'Sprint Name',
    'Goal',
    'Achievement',
    'Success Criteria',
    'Notes',
    'Created At',
    'Updated At'
  ]

  const rows = goals.map(goal => [
    goal.sprintId,
    goal.sprintName || 'N/A',
    `"${(goal.goal || '').replace(/"/g, '""')}"`,
    goal.achievement || 'Not Completed',
    `"${(goal.successCriteria || []).join('; ')}"`,
    `"${(goal.notes || '').replace(/"/g, '""')}"`,
    new Date(goal.createdAt).toLocaleDateString(),
    new Date(goal.updatedAt).toLocaleDateString()
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Download CSV file
 */
export function downloadSprintGoalsCSV(csvContent, filename = 'sprint-goals.csv') {
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
