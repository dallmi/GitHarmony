/**
 * Search and Filter Utilities
 * Universal search across multiple data dimensions
 */

/**
 * Search issues by multiple fields
 * @param {Array} issues - Array of issue objects
 * @param {string} searchTerm - Search query
 * @returns {Array} Filtered issues
 */
export function searchIssues(issues, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return issues
  }

  const term = searchTerm.toLowerCase().trim()

  return issues.filter(issue => {
    // Search in title
    if (issue.title?.toLowerCase().includes(term)) return true

    // Search in description
    if (issue.description?.toLowerCase().includes(term)) return true

    // Search in labels
    if (issue.labels?.some(label => label.toLowerCase().includes(term))) return true

    // Search in assignee names
    if (issue.assignees?.some(a =>
      a.name?.toLowerCase().includes(term) ||
      a.username?.toLowerCase().includes(term)
    )) return true

    // Search in epic title
    if (issue.epic?.title?.toLowerCase().includes(term)) return true

    // Search in milestone title
    if (issue.milestone?.title?.toLowerCase().includes(term)) return true

    // Search in author name
    if (issue.author?.name?.toLowerCase().includes(term)) return true
    if (issue.author?.username?.toLowerCase().includes(term)) return true

    // Search in issue IID or ID
    if (issue.iid?.toString().includes(term)) return true
    if (issue.id?.toString().includes(term)) return true

    // Search in references
    if (issue.references?.short?.toLowerCase().includes(term)) return true

    return false
  })
}

/**
 * Search epics by multiple fields
 * @param {Array} epics - Array of epic objects
 * @param {string} searchTerm - Search query
 * @returns {Array} Filtered epics
 */
export function searchEpics(epics, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return epics
  }

  const term = searchTerm.toLowerCase().trim()

  return epics.filter(epic => {
    // Search in title
    if (epic.title?.toLowerCase().includes(term)) return true

    // Search in description
    if (epic.description?.toLowerCase().includes(term)) return true

    // Search in labels
    if (epic.labels?.some(label => label.toLowerCase().includes(term))) return true

    // Search in author name
    if (epic.author?.name?.toLowerCase().includes(term)) return true
    if (epic.author?.username?.toLowerCase().includes(term)) return true

    // Search in epic IID or ID
    if (epic.iid?.toString().includes(term)) return true
    if (epic.id?.toString().includes(term)) return true

    return false
  })
}

/**
 * Search milestones by multiple fields
 */
export function searchMilestones(milestones, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return milestones
  }

  const term = searchTerm.toLowerCase().trim()

  return milestones.filter(milestone => {
    if (milestone.title?.toLowerCase().includes(term)) return true
    if (milestone.description?.toLowerCase().includes(term)) return true
    if (milestone.id?.toString().includes(term)) return true
    if (milestone.iid?.toString().includes(term)) return true
    return false
  })
}

/**
 * Filter issues by specific criteria
 */
export function filterIssues(issues, filters) {
  let filtered = [...issues]

  // Filter by state
  if (filters.state && filters.state !== 'all') {
    filtered = filtered.filter(i => i.state === filters.state)
  }

  // Filter by labels
  if (filters.labels && filters.labels.length > 0) {
    filtered = filtered.filter(i =>
      filters.labels.some(label => i.labels?.includes(label))
    )
  }

  // Filter by assignee
  if (filters.assignee) {
    filtered = filtered.filter(i =>
      i.assignees?.some(a => a.username === filters.assignee)
    )
  }

  // Filter by epic
  if (filters.epicId) {
    filtered = filtered.filter(i => i.epic?.id === filters.epicId)
  }

  // Filter by milestone
  if (filters.milestoneId) {
    filtered = filtered.filter(i => i.milestone?.id === filters.milestoneId)
  }

  // Filter by priority (label-based)
  if (filters.priority) {
    filtered = filtered.filter(i =>
      i.labels?.some(label => label.toLowerCase().includes(filters.priority.toLowerCase()))
    )
  }

  // Filter by overdue
  if (filters.overdue) {
    const now = new Date()
    filtered = filtered.filter(i =>
      i.due_date &&
      new Date(i.due_date) < now &&
      i.state === 'opened'
    )
  }

  // Filter by missing description
  if (filters.missingDescription) {
    filtered = filtered.filter(i => !i.description || i.description.trim() === '')
  }

  // Filter by missing assignee
  if (filters.missingAssignee) {
    filtered = filtered.filter(i => !i.assignees || i.assignees.length === 0)
  }

  // Filter by missing labels
  if (filters.missingLabels) {
    filtered = filtered.filter(i => !i.labels || i.labels.length === 0)
  }

  // Filter by missing due date
  if (filters.missingDueDate) {
    filtered = filtered.filter(i => !i.due_date)
  }

  return filtered
}

/**
 * Get unique values for filter options
 */
export function getFilterOptions(issues) {
  const labels = new Set()
  const assignees = new Map()
  const epics = new Map()
  const milestones = new Map()

  issues.forEach(issue => {
    // Collect labels
    issue.labels?.forEach(label => labels.add(label))

    // Collect assignees
    issue.assignees?.forEach(a => {
      if (a.username) {
        assignees.set(a.username, a.name)
      }
    })

    // Collect epics
    if (issue.epic) {
      epics.set(issue.epic.id, issue.epic.title)
    }

    // Collect milestones
    if (issue.milestone) {
      milestones.set(issue.milestone.id, issue.milestone.title)
    }
  })

  return {
    labels: Array.from(labels).sort(),
    assignees: Array.from(assignees.entries()).map(([username, name]) => ({ username, name })).sort((a, b) => a.name.localeCompare(b.name)),
    epics: Array.from(epics.entries()).map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title)),
    milestones: Array.from(milestones.entries()).map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title))
  }
}
