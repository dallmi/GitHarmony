/**
 * Label parsing utilities
 * Extract sprint, priority, category from GitLab labels
 */

/**
 * Extract sprint/iteration from labels or iteration field
 * Supports: "Sprint 3", "Iteration 3", or GitLab iteration object
 */
export function getSprintFromLabels(labels, iteration = null) {
  // First, check GitLab iteration field (most reliable)
  if (iteration) {
    if (typeof iteration === 'object' && iteration.title) {
      return iteration.title // e.g., "Iteration 3.5"
    }
    if (typeof iteration === 'string') {
      return iteration
    }
  }

  // Fallback: Check labels for "Sprint X" or "Iteration X"
  if (!labels || labels.length === 0) return null

  const iterationLabel = labels.find(l => {
    const lower = l.toLowerCase()
    return lower.startsWith('sprint') || lower.startsWith('iteration')
  })

  if (!iterationLabel) return null

  // Return full label (e.g., "Iteration 3.5" or "Sprint 12")
  return iterationLabel
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
