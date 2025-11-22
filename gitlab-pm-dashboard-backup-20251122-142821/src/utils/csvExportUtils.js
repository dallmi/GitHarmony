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

  // CSV Headers - URL moved right after Title for better visibility
  const headers = [
    'Issue ID',
    'Title',
    'URL',
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
    'Description'
  ]

  // CSV Rows
  const rows = issues.map(issue => {
    const labels = issue.labels?.join('; ') || ''
    const assignees = issue.assignees?.map(a => a.name).join('; ') || 'Unassigned'
    const epic = issue.epic?.title || ''
    const milestone = issue.milestone?.title || ''
    const dueDate = issue.due_date || issue.dueDate || ''
    const created = (issue.created_at || issue.createdAt) ? new Date(issue.created_at || issue.createdAt).toLocaleDateString() : ''
    const updated = (issue.updated_at || issue.updatedAt) ? new Date(issue.updated_at || issue.updatedAt).toLocaleDateString() : ''
    const author = issue.author?.name || ''
    const priority = issue.labels?.find(l => l.toLowerCase().includes('priority'))?.split('::')[1] || ''
    const weight = issue.weight || ''
    const timeEstimate = issue.time_stats?.human_time_estimate || ''
    const timeSpent = issue.time_stats?.human_total_time_spent || ''
    const description = issue.description?.substring(0, 500) || '' // Limit description length
    const url = issue.web_url || issue.webUrl || '' // Support both snake_case and camelCase

    return [
      issue.iid || issue.id,
      issue.title,
      url,
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
      description
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
    'URL',
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
    'Description'
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
      url,
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
      description
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
    'URL',
    'State',
    'Start Date',
    'Due Date',
    'Total Issues',
    'Open Issues',
    'Closed Issues',
    'Completion %',
    'Description'
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
      milestone.web_url || '',
      milestone.state,
      milestone.start_date || '',
      milestone.due_date || '',
      totalIssues,
      openIssues,
      closedIssues,
      `${completion}%`,
      milestone.description?.substring(0, 500) || ''
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
 * Export initiatives to CSV
 */
export function exportInitiativesToCSV(initiatives) {
  if (!initiatives || initiatives.length === 0) {
    return 'No data to export'
  }

  const headers = [
    'Initiative Name',
    'Status',
    'Progress %',
    'Total Epics',
    'Total Issues',
    'Open Issues',
    'Closed Issues',
    'Start Date',
    'Due Date',
    'Label'
  ]

  const rows = initiatives.map(initiative => [
    initiative.name,
    initiative.status,
    `${initiative.progress}%`,
    initiative.epics.length,
    initiative.totalIssues,
    initiative.openIssues,
    initiative.closedIssues,
    initiative.startDate ? new Date(initiative.startDate).toLocaleDateString() : '',
    initiative.dueDate ? new Date(initiative.dueDate).toLocaleDateString() : '',
    initiative.label
  ])

  const csvContent = [
    arrayToCSVRow(headers),
    ...rows.map(row => arrayToCSVRow(row))
  ].join('\n')

  return csvContent
}

/**
 * Export velocity data to CSV
 */
export function exportVelocityToCSV(velocityData) {
  if (!velocityData || velocityData.length === 0) {
    return 'No data to export'
  }

  const headers = [
    'Sprint',
    'Velocity',
    'Total Issues',
    'Completed Issues',
    'Open Issues',
    'Completion Rate %',
    'Sprint Start',
    'Sprint End'
  ]

  const rows = velocityData.map(sprint => [
    `Sprint ${sprint.sprint}`,
    sprint.velocity,
    sprint.totalIssues,
    sprint.closedIssues,
    sprint.openIssues,
    sprint.completionRate ? `${sprint.completionRate}%` : '',
    sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : '',
    sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : ''
  ])

  const csvContent = [
    arrayToCSVRow(headers),
    ...rows.map(row => arrayToCSVRow(row))
  ].join('\n')

  return csvContent
}

/**
 * Export risk data to CSV
 */
export function exportRisksToCSV(risks) {
  if (!risks || risks.length === 0) {
    return 'No data to export'
  }

  const headers = [
    'Risk Title',
    'Description',
    'Impact',
    'Probability',
    'Risk Score',
    'Mitigation Strategy',
    'Owner',
    'Status',
    'Created Date'
  ]

  const rows = risks.map(risk => [
    risk.title,
    risk.description || '',
    risk.impact,
    risk.probability,
    risk.riskScore || '',
    risk.mitigation || '',
    risk.owner || '',
    risk.status || 'Open',
    risk.createdAt ? new Date(risk.createdAt).toLocaleDateString() : ''
  ])

  const csvContent = [
    arrayToCSVRow(headers),
    ...rows.map(row => arrayToCSVRow(row))
  ].join('\n')

  return csvContent
}

/**
 * Export cycle time data to CSV
 */
export function exportCycleTimeToCSV(cycleTimeData) {
  if (!cycleTimeData || cycleTimeData.length === 0) {
    return 'No data to export'
  }

  const headers = [
    'Issue ID',
    'Title',
    'Lead Time (days)',
    'Cycle Time (days)',
    'Created Date',
    'First Commit Date',
    'Closed Date',
    'Labels',
    'Assignee'
  ]

  const rows = cycleTimeData.map(item => [
    item.issueId || item.iid,
    item.title,
    item.leadTime || '',
    item.cycleTime || '',
    item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
    item.firstCommit ? new Date(item.firstCommit).toLocaleDateString() : '',
    item.closedAt ? new Date(item.closedAt).toLocaleDateString() : '',
    item.labels?.join('; ') || '',
    item.assignee || ''
  ])

  const csvContent = [
    arrayToCSVRow(headers),
    ...rows.map(row => arrayToCSVRow(row))
  ].join('\n')

  return csvContent
}

/**
 * Export executive summary to CSV
 */
export function exportExecutiveSummaryToCSV(data) {
  const { initiatives, healthScore, upcomingMilestones, topRisks, stats } = data

  const sections = []

  // Health Score Section
  sections.push('HEALTH SCORE')
  sections.push(`Score,${healthScore?.score || 'N/A'}`)
  sections.push(`Status,${healthScore?.status || 'N/A'}`)
  sections.push('')

  // Overall Stats
  sections.push('OVERALL STATISTICS')
  sections.push(`Total Issues,${stats?.totalIssues || 0}`)
  sections.push(`Open Issues,${stats?.openIssues || 0}`)
  sections.push(`Closed Issues,${stats?.closedIssues || 0}`)
  sections.push(`Total Epics,${stats?.totalEpics || 0}`)
  sections.push('')

  // Initiatives Summary
  if (initiatives && initiatives.length > 0) {
    sections.push('INITIATIVES SUMMARY')
    sections.push(arrayToCSVRow([
      'Name', 'Status', 'Progress %', 'Epics', 'Issues', 'Due Date'
    ]))
    initiatives.forEach(init => {
      sections.push(arrayToCSVRow([
        init.name,
        init.status,
        `${init.progress}%`,
        init.epics.length,
        init.totalIssues,
        init.dueDate ? new Date(init.dueDate).toLocaleDateString() : ''
      ]))
    })
    sections.push('')
  }

  // Upcoming Milestones
  if (upcomingMilestones && upcomingMilestones.length > 0) {
    sections.push('UPCOMING MILESTONES (Next 30 Days)')
    sections.push(arrayToCSVRow([
      'Title', 'Due Date', 'Days Until', 'Status'
    ]))
    upcomingMilestones.forEach(milestone => {
      sections.push(arrayToCSVRow([
        milestone.title,
        milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : '',
        milestone.daysUntil || '',
        milestone.status || ''
      ]))
    })
    sections.push('')
  }

  // Top Risks
  if (topRisks && topRisks.length > 0) {
    sections.push('TOP RISKS')
    sections.push(arrayToCSVRow([
      'Title', 'Impact', 'Probability', 'Description'
    ]))
    topRisks.forEach(risk => {
      sections.push(arrayToCSVRow([
        risk.title,
        risk.impact,
        risk.probability,
        risk.description || ''
      ]))
    })
  }

  return sections.join('\n')
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
    case 'initiatives':
      csvContent = exportInitiativesToCSV(data)
      filename = filename || `initiatives-export-${date}.csv`
      break
    case 'velocity':
      csvContent = exportVelocityToCSV(data)
      filename = filename || `velocity-export-${date}.csv`
      break
    case 'risks':
      csvContent = exportRisksToCSV(data)
      filename = filename || `risks-export-${date}.csv`
      break
    case 'cycletime':
      csvContent = exportCycleTimeToCSV(data)
      filename = filename || `cycle-time-export-${date}.csv`
      break
    case 'executive':
      csvContent = exportExecutiveSummaryToCSV(data)
      filename = filename || `executive-summary-${date}.csv`
      break
    default:
      console.error('Unknown view type for export:', viewType)
      return
  }

  downloadCSV(csvContent, filename)
}
