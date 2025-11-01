/**
 * Initiative Service
 * Groups epics into strategic initiatives using label conventions
 * Label pattern: initiative::initiative-name
 */

/**
 * Extract initiatives from epics using label convention
 * @param {Array} epics - GitLab epics
 * @param {Array} issues - GitLab issues
 * @returns {Array} initiatives
 */
export function getInitiatives(epics, issues) {
  const initiativeMap = new Map()

  // Group epics by initiative label
  epics.forEach(epic => {
    const initiativeLabel = epic.labels?.find(l => l.toLowerCase().startsWith('initiative::'))

    if (initiativeLabel) {
      const initiativeKey = initiativeLabel.toLowerCase()
      const initiativeName = initiativeLabel
        .replace(/initiative::/i, '')
        .split('::')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()) // Title case

      if (!initiativeMap.has(initiativeKey)) {
        initiativeMap.set(initiativeKey, {
          id: initiativeKey,
          name: initiativeName,
          label: initiativeLabel,
          epics: [],
          issues: [],
          dueDate: null,
          startDate: null
        })
      }

      initiativeMap.get(initiativeKey).epics.push(epic)
    }
  })

  // Aggregate issues for each initiative
  initiativeMap.forEach((initiative) => {
    const issueIds = new Set()

    // Get all issues linked to epics in this initiative
    initiative.epics.forEach(epic => {
      const epicIssues = issues.filter(i =>
        i.epic?.id === epic.id ||
        i.labels?.some(l => l.toLowerCase() === initiative.label.toLowerCase())
      )

      epicIssues.forEach(issue => issueIds.add(issue.id))
    })

    // Convert issue IDs back to issue objects
    initiative.issues = Array.from(issueIds)
      .map(id => issues.find(i => i.id === id))
      .filter(Boolean)

    // Calculate dates from epics
    const epicDueDates = initiative.epics
      .filter(e => e.due_date)
      .map(e => new Date(e.due_date))

    const epicStartDates = initiative.epics
      .filter(e => e.start_date)
      .map(e => new Date(e.start_date))

    if (epicDueDates.length > 0) {
      initiative.dueDate = new Date(Math.max(...epicDueDates)) // Latest due date
    }

    if (epicStartDates.length > 0) {
      initiative.startDate = new Date(Math.min(...epicStartDates)) // Earliest start
    }

    // Calculate progress
    const totalIssues = initiative.issues.length
    const closedIssues = initiative.issues.filter(i => i.state === 'closed').length
    initiative.progress = totalIssues > 0
      ? Math.round((closedIssues / totalIssues) * 100)
      : 0
    initiative.totalIssues = totalIssues
    initiative.closedIssues = closedIssues
    initiative.openIssues = totalIssues - closedIssues

    // Derive status
    initiative.status = deriveInitiativeStatus(
      initiative.progress,
      initiative.dueDate,
      initiative.startDate
    )
  })

  return Array.from(initiativeMap.values())
    .sort((a, b) => {
      // Sort by due date, then by name
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate)
      }
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return a.name.localeCompare(b.name)
    })
}

/**
 * Derive initiative status based on progress and timeline
 * @param {number} progress - Completion percentage
 * @param {Date} dueDate - Initiative due date
 * @param {Date} startDate - Initiative start date
 * @returns {string} 'on-track' | 'at-risk' | 'delayed'
 */
function deriveInitiativeStatus(progress, dueDate, startDate) {
  if (!dueDate) {
    return progress >= 80 ? 'on-track' : 'at-risk'
  }

  const today = new Date()
  const due = new Date(dueDate)
  const start = startDate ? new Date(startDate) : new Date(due.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Calculate timeline progress
  const totalDuration = due - start
  const elapsed = today - start
  const timeProgress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100))

  // Already overdue
  if (today > due && progress < 100) {
    return 'delayed'
  }

  // Behind schedule by more than 20%
  if (progress < timeProgress - 20) {
    return 'delayed'
  }

  // Behind schedule by 10-20%
  if (progress < timeProgress - 10) {
    return 'at-risk'
  }

  // On or ahead of schedule
  return 'on-track'
}

/**
 * Get status badge configuration
 * @param {string} status
 * @returns {Object}
 */
export function getStatusBadge(status) {
  const badges = {
    'on-track': {
      label: 'On Track',
      color: '#059669',
      background: '#D1FAE5'
    },
    'at-risk': {
      label: 'At Risk',
      color: '#D97706',
      background: '#FEF3C7'
    },
    'delayed': {
      label: 'Delayed',
      color: '#DC2626',
      background: '#FEE2E2'
    }
  }

  return badges[status] || badges['at-risk']
}

/**
 * Format date for display
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return 'No date set'

  const d = new Date(date)
  const options = { month: 'short', day: 'numeric', year: 'numeric' }
  return d.toLocaleDateString('en-US', options)
}
