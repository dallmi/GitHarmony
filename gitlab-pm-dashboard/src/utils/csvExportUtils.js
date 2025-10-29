/**
 * CSV Export Utilities
 * Universal export functionality for issues, epics, and other data
 */

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return ''
  }

  const stringField = String(field)

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`
  }

  return stringField
}

/**
 * Convert array to CSV row
 */
function arrayToCSVRow(array) {
  return array.map(field => escapeCSVField(field)).join(',')
}

/**
 * Export issues to CSV
 */
export function exportIssuesToCSV(issues) {
  if (!issues || issues.length === 0) {
    return 'No data to export'
  }

  // CSV Headers
  const headers = [
    'Issue ID',
    'Title',
    'State',
    'Labels',
    'Assignees',
    'Epic',
    'Milestone',
    'Due Date',
    'Created',
    'Updated',
    'Author',
    'Priority',
    'Weight',
    'Time Estimate',
    'Time Spent',
    'Description',
    'URL'
  ]

  // CSV Rows
  const rows = issues.map(issue => {
    const labels = issue.labels?.join('; ') || ''
    const assignees = issue.assignees?.map(a => a.name).join('; ') || 'Unassigned'
    const epic = issue.epic?.title || ''
    const milestone = issue.milestone?.title || ''
    const dueDate = issue.due_date || ''
    const created = issue.created_at ? new Date(issue.created_at).toLocaleDateString() : ''
    const updated = issue.updated_at ? new Date(issue.updated_at).toLocaleDateString() : ''
    const author = issue.author?.name || ''
    const priority = issue.labels?.find(l => l.toLowerCase().includes('priority'))?.split('::')[1] || ''
    const weight = issue.weight || ''
    const timeEstimate = issue.time_stats?.human_time_estimate || ''
    const timeSpent = issue.time_stats?.human_total_time_spent || ''
    const description = issue.description?.substring(0, 500) || '' // Limit description length
    const url = issue.web_url || ''

    return [
      issue.iid || issue.id,
      issue.title,
      issue.state,
      labels,
      assignees,
      epic,
      milestone,
      dueDate,
      created,
      updated,
      author,
      priority,
      weight,
      timeEstimate,
      timeSpent,
      description,
      url
    ]
  })

  // Combine headers and rows
  const csvContent = [
    arrayToCSVRow(headers),
    ...rows.map(row => arrayToCSVRow(row))
  ].join('\n')

  return csvContent
}

/**
 * Export epics to CSV
 */
export function exportEpicsToCSV(epics) {
  if (!epics || epics.length === 0) {
    return 'No data to export'
  }

  const headers = [
    'Epic ID',
    'Title',
    'State',
    'Labels',
    'Start Date',
    'Due Date',
    'Total Issues',
    'Open Issues',
    'Closed Issues',
    'Completion %',
    'Health Score',
    'Author',
    'Description',
    'URL'
  ]

  const rows = epics.map(epic => {
    const labels = epic.labels?.join('; ') || ''
    const startDate = epic.start_date || ''
    const dueDate = epic.due_date || epic.end_date || ''
    const totalIssues = epic.issues?.length || 0
    const openIssues = epic.issues?.filter(i => i.state === 'opened').length || 0
    const closedIssues = epic.issues?.filter(i => i.state === 'closed').length || 0
    const completion = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0
    const healthScore = epic.health?.score || ''
    const author = epic.author?.name || ''
    const description = epic.description?.substring(0, 500) || ''
    const url = epic.web_url || ''

    return [
      epic.iid || epic.id,
      epic.title,
      epic.state,
      labels,
      startDate,
      dueDate,
      totalIssues,
      openIssues,
      closedIssues,
      `${completion}%`,
      healthScore,
      author,
      description,
      url
    ]
  })

  const csvContent = [
    arrayToCSVRow(headers),
    ...rows.map(row => arrayToCSVRow(row))
  ].join('\n')

  return csvContent
}

/**
 * Export milestones to CSV
 */
export function exportMilestonesToCSV(milestones, issues = []) {
  if (!milestones || milestones.length === 0) {
    return 'No data to export'
  }

  const headers = [
    'Milestone ID',
    'Title',
    'State',
    'Start Date',
    'Due Date',
    'Total Issues',
    'Open Issues',
    'Closed Issues',
    'Completion %',
    'Description',
    'URL'
  ]

  const rows = milestones.map(milestone => {
    const milestoneIssues = issues.filter(i => i.milestone?.id === milestone.id)
    const totalIssues = milestoneIssues.length
    const openIssues = milestoneIssues.filter(i => i.state === 'opened').length
    const closedIssues = milestoneIssues.filter(i => i.state === 'closed').length
    const completion = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0

    return [
      milestone.iid || milestone.id,
      milestone.title,
      milestone.state,
      milestone.start_date || '',
      milestone.due_date || '',
      totalIssues,
      openIssues,
      closedIssues,
      `${completion}%`,
      milestone.description?.substring(0, 500) || '',
      milestone.web_url || ''
    ]
  })

  const csvContent = [
    arrayToCSVRow(headers),
    ...rows.map(row => arrayToCSVRow(row))
  ].join('\n')

  return csvContent
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename)
  } else {
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Export filtered data based on view type
 */
export function exportViewData(viewType, data, filename) {
  let csvContent = ''
  const date = new Date().toISOString().split('T')[0]

  switch (viewType) {
    case 'issues':
      csvContent = exportIssuesToCSV(data)
      filename = filename || `issues-export-${date}.csv`
      break
    case 'epics':
      csvContent = exportEpicsToCSV(data)
      filename = filename || `epics-export-${date}.csv`
      break
    case 'milestones':
      csvContent = exportMilestonesToCSV(data.milestones, data.issues)
      filename = filename || `milestones-export-${date}.csv`
      break
    default:
      console.error('Unknown view type for export:', viewType)
      return
  }

  downloadCSV(csvContent, filename)
}
