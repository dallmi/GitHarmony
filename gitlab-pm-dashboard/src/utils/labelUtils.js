/**
 * Label parsing utilities
 * Extract sprint, priority, category from GitLab labels
 */

/**
 * Extract sprint number from labels (e.g., "Sprint 3" -> 3)
 */
export function getSprintFromLabels(labels) {
  if (!labels || labels.length === 0) return null

  const sprintLabel = labels.find(l => l.toLowerCase().startsWith('sprint'))
  if (!sprintLabel) return null

  const match = sprintLabel.match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

/**
 * Extract priority from labels (e.g., "Priority::High" -> "High")
 */
export function getPriorityFromLabels(labels) {
  if (!labels || labels.length === 0) return 'Medium'

  const priorityLabel = labels.find(l =>
    l.toLowerCase().includes('priority') ||
    l.toLowerCase().includes('p1') ||
    l.toLowerCase().includes('p2') ||
    l.toLowerCase().includes('p3')
  )

  if (!priorityLabel) return 'Medium'

  const lower = priorityLabel.toLowerCase()
  if (lower.includes('high') || lower.includes('p1')) return 'High'
  if (lower.includes('low') || lower.includes('p3')) return 'Low'
  return 'Medium'
}

/**
 * Check if issue has blocker label
 */
export function isBlocked(labels) {
  if (!labels || labels.length === 0) return false
  return labels.some(l =>
    l.toLowerCase().includes('blocker') ||
    l.toLowerCase().includes('blocked')
  )
}

/**
 * Get category from labels (e.g., "Type::Bug" -> "Bug")
 */
export function getCategoryFromLabels(labels) {
  if (!labels || labels.length === 0) return 'Task'

  const categoryLabel = labels.find(l =>
    l.toLowerCase().includes('type::') ||
    l.toLowerCase().includes('bug') ||
    l.toLowerCase().includes('feature') ||
    l.toLowerCase().includes('enhancement')
  )

  if (!categoryLabel) return 'Task'

  const lower = categoryLabel.toLowerCase()
  if (lower.includes('bug')) return 'Bug'
  if (lower.includes('feature')) return 'Feature'
  if (lower.includes('enhancement')) return 'Enhancement'
  if (lower.includes('documentation')) return 'Documentation'

  // Extract from Type:: format
  const match = categoryLabel.match(/Type::(.+)/i)
  return match ? match[1].trim() : 'Task'
}

/**
 * Get all custom labels (exclude system labels)
 */
export function getCustomLabels(labels) {
  if (!labels || labels.length === 0) return []

  const systemPrefixes = ['sprint', 'priority', 'type::', 'blocker', 'blocked', 'p1', 'p2', 'p3']

  return labels.filter(label => {
    const lower = label.toLowerCase()
    return !systemPrefixes.some(prefix => lower.includes(prefix))
  })
}

/**
 * Format labels for display
 */
export function formatLabel(label) {
  // Remove scoped label prefix (e.g., "Type::Bug" -> "Bug")
  const parts = label.split('::')
  return parts.length > 1 ? parts[1].trim() : label
}
