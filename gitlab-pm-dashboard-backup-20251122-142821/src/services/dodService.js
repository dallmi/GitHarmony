/**
 * Definition of Done (DoD) Service
 * Manages DoD templates and compliance checking
 */

const STORAGE_KEY = 'dodTemplates'

/**
 * Default DoD templates for different issue types
 */
const DEFAULT_DOD_TEMPLATES = {
  feature: {
    name: 'Feature',
    checklist: [
      { id: 'code-review', label: 'Code reviewed (2+ approvals)', required: true },
      { id: 'unit-tests', label: 'Unit tests written (>80% coverage)', required: true },
      { id: 'integration-tests', label: 'Integration tests passed', required: true },
      { id: 'documentation', label: 'Documentation updated', required: true },
      { id: 'demo', label: 'Demoed to Product Owner', required: false },
      { id: 'acceptance-criteria', label: 'Acceptance criteria met', required: true }
    ]
  },
  bug: {
    name: 'Bug Fix',
    checklist: [
      { id: 'root-cause', label: 'Root cause documented', required: true },
      { id: 'code-review', label: 'Code reviewed', required: true },
      { id: 'test-case', label: 'Test case added to prevent regression', required: true },
      { id: 'regression-test', label: 'Regression test passed', required: true },
      { id: 'fix-verified', label: 'Fix verified in staging', required: true }
    ]
  },
  enhancement: {
    name: 'Enhancement',
    checklist: [
      { id: 'code-review', label: 'Code reviewed', required: true },
      { id: 'backward-compatible', label: 'Backward compatible', required: true },
      { id: 'performance-tested', label: 'Performance tested', required: false },
      { id: 'documentation', label: 'Documentation updated', required: true },
      { id: 'acceptance-criteria', label: 'Acceptance criteria met', required: true }
    ]
  }
}

/**
 * Get DoD templates from localStorage or return defaults
 */
export function getDoDTemplates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    return DEFAULT_DOD_TEMPLATES
  } catch (error) {
    console.error('Error loading DoD templates:', error)
    return DEFAULT_DOD_TEMPLATES
  }
}

/**
 * Save DoD templates to localStorage
 */
export function saveDoDTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

/**
 * Reset DoD templates to defaults
 */
export function resetDoDTemplates() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DOD_TEMPLATES))
  return DEFAULT_DOD_TEMPLATES
}

/**
 * Get DoD template for a specific issue type
 */
export function getDoDForIssueType(issueType) {
  const templates = getDoDTemplates()

  // Normalize issue type
  const normalizedType = issueType?.toLowerCase() || 'feature'

  // Match against template keys
  if (templates[normalizedType]) {
    return templates[normalizedType]
  }

  // Fallback to feature template
  return templates.feature || DEFAULT_DOD_TEMPLATES.feature
}

/**
 * Detect issue type from labels
 */
export function detectIssueType(issue) {
  if (!issue.labels || issue.labels.length === 0) {
    return 'feature' // default
  }

  const labels = issue.labels.map(l => l.toLowerCase())

  if (labels.some(l => l.includes('bug') || l.includes('defect'))) {
    return 'bug'
  }

  if (labels.some(l => l.includes('enhancement') || l.includes('improvement'))) {
    return 'enhancement'
  }

  return 'feature'
}

/**
 * Check DoD compliance for an issue
 */
export function checkDoDCompliance(issue) {
  const issueType = detectIssueType(issue)
  const dod = getDoDForIssueType(issueType)

  const checkedItems = []
  const missingItems = []

  dod.checklist.forEach(item => {
    // For now, we'll do simple heuristic checks
    // In a full implementation, this would integrate with GitLab API

    let isPassing = false

    switch (item.id) {
      case 'code-review':
        // Check if issue has merge request (heuristic: look for MR in description)
        isPassing = issue.description && (
          issue.description.includes('!') || // MR reference
          issue.description.toLowerCase().includes('merge request') ||
          issue.description.toLowerCase().includes('reviewed')
        )
        break

      case 'unit-tests':
      case 'integration-tests':
      case 'regression-test':
        // Check if description mentions tests
        isPassing = issue.description && (
          issue.description.toLowerCase().includes('test') ||
          issue.description.toLowerCase().includes('coverage')
        )
        break

      case 'documentation':
        // Check if description mentions docs or has substantial content
        isPassing = issue.description && (
          issue.description.toLowerCase().includes('documentation') ||
          issue.description.toLowerCase().includes('readme') ||
          issue.description.length >= 200
        )
        break

      case 'acceptance-criteria':
        // Check if description has acceptance criteria section
        isPassing = issue.description && (
          issue.description.toLowerCase().includes('acceptance criteria') ||
          issue.description.toLowerCase().includes('acceptance:') ||
          issue.description.includes('- [ ]') // Checklist format
        )
        break

      case 'root-cause':
        // Check if description mentions root cause
        isPassing = issue.description && (
          issue.description.toLowerCase().includes('root cause') ||
          issue.description.toLowerCase().includes('cause:') ||
          issue.description.toLowerCase().includes('reason:')
        )
        break

      case 'test-case':
      case 'fix-verified':
      case 'demo':
      case 'backward-compatible':
      case 'performance-tested':
        // These require manual verification
        isPassing = false
        break

      default:
        isPassing = false
    }

    if (isPassing) {
      checkedItems.push(item)
    } else if (item.required) {
      missingItems.push(item)
    }
  })

  const requiredItems = dod.checklist.filter(item => item.required)
  const requiredPassed = checkedItems.filter(item => item.required).length
  const compliancePercentage = requiredItems.length > 0
    ? Math.round((requiredPassed / requiredItems.length) * 100)
    : 100

  return {
    issueType,
    dodTemplate: dod.name,
    totalItems: dod.checklist.length,
    requiredItems: requiredItems.length,
    checkedItems,
    missingItems,
    compliancePercentage,
    isCompliant: missingItems.length === 0
  }
}

/**
 * Find all issues with DoD violations
 */
export function findDoDViolations(issues) {
  // Only check closed or in-review issues
  const relevantIssues = issues.filter(issue =>
    issue.state === 'closed' ||
    issue.labels?.some(l => l.toLowerCase().includes('review'))
  )

  const violations = relevantIssues
    .map(issue => ({
      issue,
      dod: checkDoDCompliance(issue)
    }))
    .filter(result => !result.dod.isCompliant)

  // Sort by compliance percentage (worst first)
  violations.sort((a, b) => a.dod.compliancePercentage - b.dod.compliancePercentage)

  return violations
}

/**
 * Get DoD statistics
 */
export function getDoDStats(issues) {
  const relevantIssues = issues.filter(issue =>
    issue.state === 'closed' ||
    issue.labels?.some(l => l.toLowerCase().includes('review'))
  )

  if (relevantIssues.length === 0) {
    return {
      totalIssues: 0,
      compliantIssues: 0,
      violatingIssues: 0,
      complianceRate: 100,
      avgCompliancePercentage: 100
    }
  }

  const results = relevantIssues.map(issue => checkDoDCompliance(issue))
  const compliantIssues = results.filter(r => r.isCompliant).length
  const violatingIssues = results.filter(r => !r.isCompliant).length
  const complianceRate = Math.round((compliantIssues / relevantIssues.length) * 100)

  const avgCompliancePercentage = Math.round(
    results.reduce((sum, r) => sum + r.compliancePercentage, 0) / results.length
  )

  return {
    totalIssues: relevantIssues.length,
    compliantIssues,
    violatingIssues,
    complianceRate,
    avgCompliancePercentage
  }
}

/**
 * Export DoD violations to CSV
 */
export function exportDoDViolationsCSV(violations) {
  const headers = [
    'Issue ID',
    'Title',
    'Type',
    'State',
    'DoD Template',
    'Compliance %',
    'Missing Items',
    'URL'
  ]

  const rows = violations.map(({ issue, dod }) => [
    issue.iid,
    `"${issue.title.replace(/"/g, '""')}"`,
    dod.issueType,
    issue.state,
    dod.dodTemplate,
    `${dod.compliancePercentage}%`,
    `"${dod.missingItems.map(item => item.label).join('; ')}"`,
    issue.web_url
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Download CSV file
 */
export function downloadDoDViolationsCSV(csvContent, filename = 'dod-violations.csv') {
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
