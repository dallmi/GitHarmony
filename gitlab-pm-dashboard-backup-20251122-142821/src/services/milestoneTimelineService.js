/**
 * Milestone Timeline Service
 * Filters and formats milestones for timeline views
 */

/**
 * Get upcoming milestones within specified days
 * @param {Array} milestones - All milestones
 * @param {number} days - Number of days to look ahead (default 30)
 * @returns {Array} upcoming milestones
 */
export function getUpcomingMilestones(milestones, days = 30) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today

  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

  return milestones
    .filter(m => {
      if (!m.due_date) return false

      const due = new Date(m.due_date)
      return due >= today && due <= futureDate
    })
    .map(m => ({
      ...m,
      daysUntil: calculateDaysUntil(m.due_date),
      status: deriveMilestoneStatus(m)
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

/**
 * Calculate days until milestone
 * @param {string} dueDate
 * @returns {number}
 */
function calculateDaysUntil(dueDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  const diff = due - today

  return Math.round(diff / (1000 * 60 * 60 * 24))
}

/**
 * Derive milestone status based on progress and timeline
 * @param {Object} milestone
 * @returns {string} 'on-track' | 'at-risk' | 'overdue'
 */
function deriveMilestoneStatus(milestone) {
  const daysUntil = calculateDaysUntil(milestone.due_date)

  // Overdue
  if (daysUntil < 0 && milestone.state !== 'closed') {
    return 'overdue'
  }

  // Calculate progress if we have issue stats
  let progress = 0
  if (milestone.stats && milestone.stats.total_issues > 0) {
    progress = (milestone.stats.closed_issues / milestone.stats.total_issues) * 100
  }

  // On track if progress is good or plenty of time
  if (progress >= 80 || daysUntil > 7) {
    return 'on-track'
  }

  // At risk otherwise
  return 'at-risk'
}

/**
 * Format milestone for display
 * @param {Object} milestone
 * @returns {Object}
 */
export function formatMilestone(milestone) {
  return {
    ...milestone,
    formattedDate: formatDate(milestone.due_date),
    daysUntil: calculateDaysUntil(milestone.due_date),
    status: deriveMilestoneStatus(milestone),
    progress: milestone.stats
      ? Math.round((milestone.stats.closed_issues / milestone.stats.total_issues) * 100)
      : 0
  }
}

/**
 * Format date for display
 * @param {string} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return 'No date'

  const d = new Date(date)
  const options = { month: 'short', day: 'numeric' }
  return d.toLocaleDateString('en-US', options)
}

/**
 * Get status badge for milestone
 * @param {string} status
 * @returns {Object}
 */
export function getMilestoneStatusBadge(status) {
  const badges = {
    'on-track': {
      label: 'On Track',
      icon: '●',
      color: '#059669',
      background: '#D1FAE5'
    },
    'at-risk': {
      label: 'At Risk',
      icon: '▲',
      color: '#D97706',
      background: '#FEF3C7'
    },
    'overdue': {
      label: 'Overdue',
      icon: '■',
      color: '#DC2626',
      background: '#FEE2E2'
    }
  }

  return badges[status] || badges['at-risk']
}
