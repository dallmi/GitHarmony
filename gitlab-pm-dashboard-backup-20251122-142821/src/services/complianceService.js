/**
 * Issue Compliance & Quality Check Service
 * Validates issues against quality criteria
 */

import { getStaleThresholds, getEnabledCriteria } from './criteriaConfigService'

/**
 * Configurable thresholds for stale issue detection
 * Now loaded from localStorage config
 */
export function getStaleThresholdsConfig() {
  return getStaleThresholds()
}

// Keep for backwards compatibility
export const STALE_THRESHOLDS = getStaleThresholdsConfig()

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
  const thresholds = getStaleThresholdsConfig()

  if (daysOpen >= thresholds.critical) {
    return { isStale: true, daysOpen, severity: 'critical' }
  } else if (daysOpen >= thresholds.warning) {
    return { isStale: true, daysOpen, severity: 'warning' }
  }

  return { isStale: false, daysOpen, severity: null }
}

/**
 * Validation functions for each criterion type
 */
const VALIDATION_FUNCTIONS = {
  assignee: (issue) => issue.assignees && issue.assignees.length > 0,
  weight: (issue) => issue.weight !== null && issue.weight !== undefined && issue.weight > 0,
  epic: (issue) => issue.epic !== null && issue.epic !== undefined,
  description: (issue, config) => {
    const threshold = config?.threshold || 20
    return issue.description && issue.description.trim().length >= threshold
  },
  labels: (issue) => {
    if (!issue.labels || issue.labels.length === 0) return false
    const hasTypeLabel = issue.labels.some(l =>
      l.toLowerCase().includes('bug') ||
      l.toLowerCase().includes('feature') ||
      l.toLowerCase().includes('enhancement') ||
      l.toLowerCase().includes('type::')
    )
    return hasTypeLabel
  },
  milestone: (issue) => issue.milestone !== null && issue.milestone !== undefined,
  dueDate: (issue) => issue.due_date !== null && issue.due_date !== undefined,
  priority: (issue) => {
    if (!issue.labels || issue.labels.length === 0) return false
    return issue.labels.some(l =>
      l.toLowerCase().includes('priority') ||
      l.toLowerCase().includes('p1') ||
      l.toLowerCase().includes('p2') ||
      l.toLowerCase().includes('p3')
    )
  },
  stale: (issue) => {
    const staleStatus = checkStaleStatus(issue)
    return !staleStatus.isStale
  }
}

/**
 * Get dynamic severity for criteria that can change severity based on issue state
 */
const DYNAMIC_SEVERITY_FUNCTIONS = {
  stale: (issue) => {
    const staleStatus = checkStaleStatus(issue)
    if (staleStatus.severity === 'critical') return 'high'
    if (staleStatus.severity === 'warning') return 'medium'
    return 'low'
  }
}

/**
 * Build quality criteria from config
 * This allows criteria to be enabled/disabled and configured via UI
 */
function getQualityCriteria() {
  const enabledCriteria = getEnabledCriteria()
  const thresholds = getStaleThresholdsConfig()
  const qualityCriteria = {}

  Object.entries(enabledCriteria).forEach(([key, config]) => {
    qualityCriteria[key] = {
      name: config.name,
      description: config.description,
      severity: config.severity,
      validate: (issue) => {
        const validationFn = VALIDATION_FUNCTIONS[key]
        return validationFn ? validationFn(issue, config) : true
      },
      ...(DYNAMIC_SEVERITY_FUNCTIONS[key] && {
        getDynamicSeverity: DYNAMIC_SEVERITY_FUNCTIONS[key]
      })
    }
  })

  // Update stale description with current thresholds
  if (qualityCriteria.stale) {
    qualityCriteria.stale.description = `Issue has been open too long (Warning: ${thresholds.warning} days, Critical: ${thresholds.critical} days)`
  }

  return qualityCriteria
}

/**
 * Issue Quality Criteria
 * Now dynamically loaded from config
 */
const QUALITY_CRITERIA = getQualityCriteria()

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
