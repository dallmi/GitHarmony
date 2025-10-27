/**
 * Issue Compliance & Quality Check Service
 * Validates issues against UBS quality criteria
 */

/**
 * Configurable thresholds for stale issue detection
 */
export const STALE_THRESHOLDS = {
  warning: 4 * 7, // 4 weeks in days
  critical: 8 * 7  // 8 weeks in days
}

/**
 * Calculate how many days an issue has been open
 */
function getDaysOpen(issue) {
  const created = new Date(issue.created_at)
  const now = new Date()
  const diffTime = Math.abs(now - created)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Check if issue is stale based on thresholds
 */
export function checkStaleStatus(issue) {
  if (issue.state !== 'opened') {
    return { isStale: false, daysOpen: 0, severity: null }
  }

  const daysOpen = getDaysOpen(issue)

  if (daysOpen >= STALE_THRESHOLDS.critical) {
    return { isStale: true, daysOpen, severity: 'critical' }
  } else if (daysOpen >= STALE_THRESHOLDS.warning) {
    return { isStale: true, daysOpen, severity: 'warning' }
  }

  return { isStale: false, daysOpen, severity: null }
}

/**
 * UBS Issue Quality Criteria
 */
const QUALITY_CRITERIA = {
  assignee: {
    name: 'Assignee',
    description: 'Issue must be assigned to a team member',
    validate: (issue) => issue.assignees && issue.assignees.length > 0,
    severity: 'high'
  },
  weight: {
    name: 'Weight/Estimation',
    description: 'Issue must have story points or time estimate',
    validate: (issue) => issue.weight !== null && issue.weight !== undefined && issue.weight > 0,
    severity: 'high'
  },
  epic: {
    name: 'Epic Assignment',
    description: 'Issue must be assigned to an epic',
    validate: (issue) => issue.epic !== null && issue.epic !== undefined,
    severity: 'medium'
  },
  description: {
    name: 'Description',
    description: 'Issue must have a meaningful description (min 20 characters)',
    validate: (issue) => issue.description && issue.description.trim().length >= 20,
    severity: 'high'
  },
  labels: {
    name: 'Type Label',
    description: 'Issue must have a type label (Bug, Feature, etc.)',
    validate: (issue) => {
      if (!issue.labels || issue.labels.length === 0) return false
      const hasTypeLabel = issue.labels.some(l =>
        l.toLowerCase().includes('bug') ||
        l.toLowerCase().includes('feature') ||
        l.toLowerCase().includes('enhancement') ||
        l.toLowerCase().includes('type::')
      )
      return hasTypeLabel
    },
    severity: 'high'
  },
  milestone: {
    name: 'Milestone',
    description: 'Issue should be assigned to a milestone',
    validate: (issue) => issue.milestone !== null && issue.milestone !== undefined,
    severity: 'medium'
  },
  dueDate: {
    name: 'Due Date',
    description: 'Issue should have a due date (for tracking)',
    validate: (issue) => issue.due_date !== null && issue.due_date !== undefined,
    severity: 'low'
  },
  priority: {
    name: 'Priority',
    description: 'Issue should have a priority label',
    validate: (issue) => {
      if (!issue.labels || issue.labels.length === 0) return false
      return issue.labels.some(l =>
        l.toLowerCase().includes('priority') ||
        l.toLowerCase().includes('p1') ||
        l.toLowerCase().includes('p2') ||
        l.toLowerCase().includes('p3')
      )
    },
    severity: 'medium'
  },
  stale: {
    name: 'Stale Issue',
    description: `Issue has been open too long (Warning: ${STALE_THRESHOLDS.warning} days, Critical: ${STALE_THRESHOLDS.critical} days)`,
    validate: (issue) => {
      const staleStatus = checkStaleStatus(issue)
      return !staleStatus.isStale
    },
    severity: 'low',
    getDynamicSeverity: (issue) => {
      const staleStatus = checkStaleStatus(issue)
      if (staleStatus.severity === 'critical') return 'high'
      if (staleStatus.severity === 'warning') return 'medium'
      return 'low'
    }
  }
}

/**
 * Check single issue against all quality criteria
 */
export function checkIssueCompliance(issue) {
  const violations = []
  const passed = []
  const staleStatus = checkStaleStatus(issue)

  Object.entries(QUALITY_CRITERIA).forEach(([key, criteria]) => {
    const isValid = criteria.validate(issue)

    if (!isValid) {
      // Use dynamic severity for stale issues
      const severity = criteria.getDynamicSeverity
        ? criteria.getDynamicSeverity(issue)
        : criteria.severity

      violations.push({
        criterion: key,
        name: criteria.name,
        description: criteria.description,
        severity,
        ...(key === 'stale' && { daysOpen: staleStatus.daysOpen })
      })
    } else {
      passed.push(key)
    }
  })

  return {
    issueId: issue.id,
    iid: issue.iid,
    title: issue.title,
    state: issue.state,
    violations,
    passed,
    complianceScore: Math.round((passed.length / Object.keys(QUALITY_CRITERIA).length) * 100),
    isCompliant: violations.length === 0,
    staleStatus
  }
}

/**
 * Check all issues and return non-compliant ones
 */
export function findNonCompliantIssues(issues) {
  const results = issues.map(issue => {
    const compliance = checkIssueCompliance(issue)

    return {
      ...compliance,
      // Additional metadata
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      author: issue.author,
      assignees: issue.assignees || [],
      labels: issue.labels || [],
      milestone: issue.milestone,
      epic: issue.epic,
      weight: issue.weight,
      description: issue.description,
      dueDate: issue.due_date,
      webUrl: issue.web_url
    }
  })

  // Filter only non-compliant issues
  const nonCompliant = results.filter(r => !r.isCompliant)

  // Sort by compliance score (worst first), then by days open (oldest first)
  return nonCompliant.sort((a, b) => {
    if (a.complianceScore !== b.complianceScore) {
      return a.complianceScore - b.complianceScore
    }
    return (b.staleStatus?.daysOpen || 0) - (a.staleStatus?.daysOpen || 0)
  })
}

/**
 * Find all stale issues (regardless of compliance)
 */
export function findStaleIssues(issues) {
  return issues
    .filter(issue => issue.state === 'opened')
    .map(issue => {
      const staleStatus = checkStaleStatus(issue)
      return {
        ...issue,
        staleStatus
      }
    })
    .filter(issue => issue.staleStatus.isStale)
    .sort((a, b) => b.staleStatus.daysOpen - a.staleStatus.daysOpen)
}

/**
 * Get compliance statistics
 */
export function getComplianceStats(issues) {
  const results = issues.map(checkIssueCompliance)

  const total = results.length
  const compliant = results.filter(r => r.isCompliant).length
  const nonCompliant = total - compliant
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0

  // Count violations by criterion
  const violationsByCriterion = {}
  Object.keys(QUALITY_CRITERIA).forEach(key => {
    violationsByCriterion[key] = 0
  })

  results.forEach(result => {
    result.violations.forEach(violation => {
      violationsByCriterion[violation.criterion]++
    })
  })

  // Count by severity
  const highSeverity = results.filter(r =>
    r.violations.some(v => v.severity === 'high')
  ).length
  const mediumSeverity = results.filter(r =>
    r.violations.some(v => v.severity === 'medium') &&
    !r.violations.some(v => v.severity === 'high')
  ).length
  const lowSeverity = results.filter(r =>
    r.violations.some(v => v.severity === 'low') &&
    !r.violations.some(v => v.severity === 'high' || v.severity === 'medium')
  ).length

  // Stale issue statistics
  const staleIssues = findStaleIssues(issues)
  const staleWarning = staleIssues.filter(i => i.staleStatus.severity === 'warning').length
  const staleCritical = staleIssues.filter(i => i.staleStatus.severity === 'critical').length

  return {
    total,
    compliant,
    nonCompliant,
    complianceRate,
    violationsByCriterion,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    staleIssues: {
      total: staleIssues.length,
      warning: staleWarning,
      critical: staleCritical
    }
  }
}

/**
 * Export non-compliant issues to CSV format
 */
export function exportToCSV(nonCompliantIssues) {
  const headers = [
    'Issue ID',
    'Title',
    'State',
    'Compliance Score',
    'Violations',
    'Days Open',
    'Stale Status',
    'Missing Assignee',
    'Missing Weight',
    'Missing Epic',
    'Missing Description',
    'Missing Type Label',
    'Missing Milestone',
    'Missing Due Date',
    'Missing Priority',
    'Created At',
    'Updated At',
    'Author',
    'Current Assignees',
    'Epic',
    'Milestone',
    'URL'
  ]

  const rows = nonCompliantIssues.map(issue => {
    const violationMap = {}
    issue.violations.forEach(v => {
      violationMap[v.criterion] = true
    })

    const staleStatus = issue.staleStatus?.isStale
      ? (issue.staleStatus.severity === 'critical' ? 'CRITICAL' : 'WARNING')
      : 'OK'

    return [
      issue.iid,
      `"${issue.title.replace(/"/g, '""')}"`, // Escape quotes
      issue.state,
      issue.complianceScore + '%',
      issue.violations.length,
      issue.staleStatus?.daysOpen || 0,
      staleStatus,
      violationMap.assignee ? 'YES' : 'NO',
      violationMap.weight ? 'YES' : 'NO',
      violationMap.epic ? 'YES' : 'NO',
      violationMap.description ? 'YES' : 'NO',
      violationMap.labels ? 'YES' : 'NO',
      violationMap.milestone ? 'YES' : 'NO',
      violationMap.dueDate ? 'YES' : 'NO',
      violationMap.priority ? 'YES' : 'NO',
      new Date(issue.createdAt).toLocaleDateString(),
      new Date(issue.updatedAt).toLocaleDateString(),
      issue.author ? issue.author.name : 'Unknown',
      issue.assignees.map(a => a.name).join('; ') || 'None',
      issue.epic ? issue.epic.title : 'None',
      issue.milestone ? issue.milestone.title : 'None',
      issue.webUrl
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
export function downloadCSV(csvContent, filename = 'non-compliant-issues.csv') {
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
 * Get criterion details
 */
export function getCriteriaDetails() {
  return Object.entries(QUALITY_CRITERIA).map(([key, criteria]) => ({
    key,
    ...criteria
  }))
}
