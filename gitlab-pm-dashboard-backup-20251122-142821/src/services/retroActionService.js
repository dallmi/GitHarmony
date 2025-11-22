/**
 * Retrospective Action Items Service
 * Manages continuous improvement actions from sprint retrospectives
 */

const STORAGE_KEY = 'retroActions'

/**
 * Get all retro actions from localStorage
 */
export function getAllRetroActions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading retro actions:', error)
    return []
  }
}

/**
 * Get actions for a specific sprint
 */
export function getActionsForSprint(sprintId = 'current') {
  const actions = getAllRetroActions()
  return actions.filter(action => action.sprintId === sprintId)
}

/**
 * Get all open actions (including carried over)
 */
export function getOpenActions() {
  const actions = getAllRetroActions()
  return actions.filter(action =>
    action.status === 'open' || action.status === 'in-progress'
  )
}

/**
 * Get overdue actions
 */
export function getOverdueActions() {
  const actions = getOpenActions()
  const now = new Date()

  return actions.filter(action => {
    if (!action.dueDate) return false
    const dueDate = new Date(action.dueDate)
    return dueDate < now
  })
}

/**
 * Save a new or updated action
 */
export function saveRetroAction(action) {
  const actions = getAllRetroActions()

  if (action.id) {
    // Update existing
    const index = actions.findIndex(a => a.id === action.id)
    if (index >= 0) {
      actions[index] = {
        ...actions[index],
        ...action,
        updatedAt: new Date().toISOString()
      }
    }
  } else {
    // Create new
    const newAction = {
      ...action,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    actions.push(newAction)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
  return actions
}

/**
 * Delete an action
 */
export function deleteRetroAction(actionId) {
  const actions = getAllRetroActions()
  const filtered = actions.filter(a => a.id !== actionId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return filtered
}

/**
 * Mark action as complete
 */
export function completeAction(actionId) {
  const actions = getAllRetroActions()
  const action = actions.find(a => a.id === actionId)

  if (action) {
    action.status = 'done'
    action.completedAt = new Date().toISOString()
    action.updatedAt = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
  }

  return actions
}

/**
 * Carry over incomplete actions to next sprint
 */
export function carryOverActions(fromSprintId, toSprintId, toSprintName) {
  const actions = getAllRetroActions()
  const openActions = actions.filter(a =>
    a.sprintId === fromSprintId &&
    (a.status === 'open' || a.status === 'in-progress')
  )

  openActions.forEach(action => {
    // Create new action for next sprint
    const carriedAction = {
      ...action,
      id: Date.now().toString() + Math.random(),
      sprintId: toSprintId,
      sprintName: toSprintName,
      carriedFrom: fromSprintId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    actions.push(carriedAction)
  })

  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
  return openActions.length
}

/**
 * Get retro action statistics
 */
export function getRetroActionStats() {
  const actions = getAllRetroActions()

  if (actions.length === 0) {
    return {
      totalActions: 0,
      openActions: 0,
      inProgressActions: 0,
      completedActions: 0,
      overdueActions: 0,
      completionRate: 0,
      avgDaysToComplete: 0
    }
  }

  const openActions = actions.filter(a => a.status === 'open').length
  const inProgressActions = actions.filter(a => a.status === 'in-progress').length
  const completedActions = actions.filter(a => a.status === 'done').length
  const overdueActions = getOverdueActions().length

  const completionRate = Math.round((completedActions / actions.length) * 100)

  // Calculate average days to complete
  const completedWithDates = actions.filter(a =>
    a.status === 'done' && a.completedAt && a.createdAt
  )

  let avgDaysToComplete = 0
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum, action) => {
      const created = new Date(action.createdAt)
      const completed = new Date(action.completedAt)
      const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24))
      return sum + days
    }, 0)
    avgDaysToComplete = Math.round(totalDays / completedWithDates.length)
  }

  return {
    totalActions: actions.length,
    openActions,
    inProgressActions,
    completedActions,
    overdueActions,
    completionRate,
    avgDaysToComplete
  }
}

/**
 * Get recent actions (last 10)
 */
export function getRecentActions(limit = 10) {
  const actions = getAllRetroActions()
  return actions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}

/**
 * Export retro actions to CSV
 */
export function exportRetroActionsCSV() {
  const actions = getAllRetroActions()

  const headers = [
    'ID',
    'Sprint',
    'Action',
    'Owner',
    'Status',
    'Due Date',
    'Created At',
    'Completed At',
    'Carried From',
    'Days Open'
  ]

  const rows = actions.map(action => {
    const created = new Date(action.createdAt)
    const now = action.completedAt ? new Date(action.completedAt) : new Date()
    const daysOpen = Math.ceil((now - created) / (1000 * 60 * 60 * 24))

    return [
      action.id,
      action.sprintName || action.sprintId,
      `"${action.action.replace(/"/g, '""')}"`,
      action.owner || 'Unassigned',
      action.status,
      action.dueDate || 'N/A',
      new Date(action.createdAt).toLocaleDateString(),
      action.completedAt ? new Date(action.completedAt).toLocaleDateString() : 'N/A',
      action.carriedFrom || 'N/A',
      daysOpen
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
export function downloadRetroActionsCSV(csvContent, filename = 'retro-actions.csv') {
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
 * Create default action template
 */
export function createDefaultAction(sprintId = 'current', sprintName = 'Current Sprint') {
  return {
    sprintId,
    sprintName,
    action: '',
    owner: '',
    dueDate: '',
    status: 'open', // open, in-progress, done, wont-do
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}
