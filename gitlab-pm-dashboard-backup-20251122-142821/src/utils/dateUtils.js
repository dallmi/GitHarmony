/**
 * Date utility functions
 * Format dates, calculate durations, check overdue status
 */

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Format date to readable format (e.g., "Jan 15, 2024")
 */
export function formatDateReadable(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date) {
  if (!date) return false
  return new Date(date) < new Date()
}

/**
 * Calculate days until/since a date
 */
export function daysUntil(date) {
  if (!date) return null
  const today = new Date()
  const target = new Date(date)
  const diffTime = target - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Format duration in days (e.g., "5 days", "1 day")
 */
export function formatDuration(days) {
  if (days === null || days === undefined) return ''
  if (days === 1) return '1 day'
  return `${days} days`
}

/**
 * Get relative time string (e.g., "2 days ago", "in 5 days")
 */
export function getRelativeTime(date) {
  if (!date) return ''
  const days = daysUntil(date)

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}

/**
 * Calculate progress percentage based on dates
 */
export function calculateDateProgress(startDate, dueDate) {
  if (!startDate || !dueDate) return 0

  const start = new Date(startDate).getTime()
  const due = new Date(dueDate).getTime()
  const now = new Date().getTime()

  if (now < start) return 0
  if (now > due) return 100

  const total = due - start
  const elapsed = now - start

  return Math.round((elapsed / total) * 100)
}
