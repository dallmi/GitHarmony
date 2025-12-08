/**
 * Cross-Project Epic-Issue Linking Service
 * Handles parent-child relationships and cross-project dependencies
 * between epics and issues across multiple GitLab projects
 */

/**
 * Enhanced epic structure with parent/child relationships
 * GitLab API provides these fields for epics:
 * - parent_id: ID of the parent epic
 * - has_parent: Boolean indicating if epic has a parent
 * - _links.parent: URL to parent epic API endpoint
 * - _links.epic_issues: URL to get issues in this epic
 */

/**
 * Build a hierarchy tree from flat epic list
 * @param {Array} epics - Flat list of epics from API
 * @returns {Object} Hierarchical epic structure
 */
export function buildEpicHierarchy(epics) {
  if (!epics || epics.length === 0) return { rootEpics: [], epicMap: new Map() }

  const epicMap = new Map()
  const rootEpics = []

  // First pass: Create map of all epics
  epics.forEach(epic => {
    epicMap.set(epic.id, {
      ...epic,
      children: [],
      level: 0,
      path: [epic.id]
    })
  })

  // Second pass: Build parent-child relationships
  epics.forEach(epic => {
    const enhancedEpic = epicMap.get(epic.id)

    if (epic.parent_id && epicMap.has(epic.parent_id)) {
      // This epic has a parent
      const parent = epicMap.get(epic.parent_id)
      parent.children.push(enhancedEpic)
      enhancedEpic.parent = parent
      enhancedEpic.level = parent.level + 1
      enhancedEpic.path = [...parent.path, epic.id]
    } else {
      // Root epic (no parent or parent not in our dataset)
      rootEpics.push(enhancedEpic)
    }
  })

  // Sort children by start date or title
  const sortChildren = (epic) => {
    epic.children.sort((a, b) => {
      if (a.start_date && b.start_date) {
        return new Date(a.start_date) - new Date(b.start_date)
      }
      return (a.title || '').localeCompare(b.title || '')
    })
    epic.children.forEach(sortChildren)
  }

  rootEpics.forEach(sortChildren)

  return { rootEpics, epicMap }
}

/**
 * Link issues to epics across projects
 * @param {Array} issues - All issues from all projects
 * @param {Array} epics - All epics from all groups
 * @returns {Object} Enhanced data structure with cross-project links
 */
export function linkCrossProjectIssues(issues, epics) {
  const epicIssueMap = new Map()
  const projectEpicMap = new Map()
  const crossProjectLinks = []

  // Initialize epic issue collections
  epics.forEach(epic => {
    epicIssueMap.set(epic.id, {
      epic,
      issues: [],
      projects: new Set(),
      crossProjectIssues: []
    })
  })

  // Process issues and build relationships
  issues.forEach(issue => {
    if (!issue.epic) return

    const epicData = epicIssueMap.get(issue.epic.id)
    if (!epicData) return

    epicData.issues.push(issue)

    // Track project for this issue
    const projectId = issue.project_id || issue.project?.id
    if (projectId) {
      epicData.projects.add(projectId)

      // Track if this is a cross-project issue
      if (epicData.epic.group_id !== issue.namespace?.id) {
        epicData.crossProjectIssues.push(issue)
        crossProjectLinks.push({
          epic: epicData.epic,
          issue,
          type: 'cross-project',
          epicProject: epicData.epic.group_id,
          issueProject: projectId
        })
      }
    }

    // Build reverse mapping: project -> epics
    if (!projectEpicMap.has(projectId)) {
      projectEpicMap.set(projectId, new Set())
    }
    projectEpicMap.get(projectId).add(issue.epic.id)
  })

  return {
    epicIssueMap,
    projectEpicMap,
    crossProjectLinks,
    statistics: calculateCrossProjectStats(epicIssueMap, crossProjectLinks)
  }
}

/**
 * Calculate statistics for cross-project relationships
 */
function calculateCrossProjectStats(epicIssueMap, crossProjectLinks) {
  const stats = {
    totalEpics: epicIssueMap.size,
    epicsWithIssues: 0,
    epicsWithCrossProjectIssues: 0,
    totalCrossProjectLinks: crossProjectLinks.length,
    projectCount: new Set(),
    avgProjectsPerEpic: 0
  }

  epicIssueMap.forEach((data) => {
    if (data.issues.length > 0) {
      stats.epicsWithIssues++
    }
    if (data.crossProjectIssues.length > 0) {
      stats.epicsWithCrossProjectIssues++
    }
    data.projects.forEach(p => stats.projectCount.add(p))
  })

  stats.projectCount = stats.projectCount.size
  stats.avgProjectsPerEpic = stats.epicsWithIssues > 0
    ? Math.round((stats.projectCount / stats.epicsWithIssues) * 10) / 10
    : 0

  return stats
}

/**
 * Find dependencies between epics based on issue relationships
 * @param {Map} epicIssueMap - Map of epic IDs to their issues
 * @returns {Array} List of epic dependencies
 */
export function findEpicDependencies(epicIssueMap, issues) {
  const dependencies = []
  const processedPairs = new Set()

  // Look for blocking relationships between issues in different epics
  issues.forEach(issue => {
    if (!issue.epic || !issue.blocking_issues_count) return

    // Get issues that this issue blocks
    const blockedIssues = issues.filter(i =>
      i.links?.some(link => link.link_type === 'blocks' && link.target_id === issue.id)
    )

    blockedIssues.forEach(blockedIssue => {
      if (!blockedIssue.epic || blockedIssue.epic.id === issue.epic.id) return

      const pairKey = `${issue.epic.id}-${blockedIssue.epic.id}`
      if (processedPairs.has(pairKey)) return

      processedPairs.add(pairKey)
      dependencies.push({
        type: 'blocks',
        fromEpic: issue.epic,
        toEpic: blockedIssue.epic,
        fromIssue: issue,
        toIssue: blockedIssue,
        description: `Epic "${issue.epic.title}" blocks Epic "${blockedIssue.epic.title}"`
      })
    })
  })

  return dependencies
}

/**
 * Generate cross-project report
 * @param {Object} linkingData - Output from linkCrossProjectIssues
 * @returns {Object} Formatted report for display
 */
export function generateCrossProjectReport(linkingData) {
  const { epicIssueMap, statistics } = linkingData

  const report = {
    summary: {
      ...statistics,
      healthStatus: statistics.epicsWithCrossProjectIssues > statistics.epicsWithIssues * 0.5
        ? 'Complex - High cross-project coordination needed'
        : statistics.epicsWithCrossProjectIssues > statistics.epicsWithIssues * 0.2
        ? 'Moderate - Some cross-project coordination'
        : 'Simple - Mostly project-isolated work'
    },
    epicBreakdown: [],
    recommendations: []
  }

  // Analyze each epic
  epicIssueMap.forEach((data, epicId) => {
    if (data.issues.length === 0) return

    const breakdown = {
      epicId,
      epicTitle: data.epic.title,
      totalIssues: data.issues.length,
      crossProjectIssues: data.crossProjectIssues.length,
      projectCount: data.projects.size,
      projects: Array.from(data.projects),
      complexity: data.projects.size > 3 ? 'high' :
                 data.projects.size > 1 ? 'medium' : 'low'
    }

    report.epicBreakdown.push(breakdown)
  })

  // Generate recommendations
  if (statistics.epicsWithCrossProjectIssues > statistics.epicsWithIssues * 0.3) {
    report.recommendations.push({
      type: 'warning',
      title: 'High Cross-Project Complexity',
      description: `${statistics.epicsWithCrossProjectIssues} epics span multiple projects`,
      action: 'Consider dedicated cross-team coordination meetings'
    })
  }

  const highComplexityEpics = report.epicBreakdown.filter(e => e.complexity === 'high')
  if (highComplexityEpics.length > 0) {
    report.recommendations.push({
      type: 'info',
      title: 'Epics Requiring Extra Attention',
      description: `${highComplexityEpics.length} epics span 3+ projects`,
      action: 'Assign dedicated epic owners for coordination',
      epics: highComplexityEpics.map(e => e.epicTitle)
    })
  }

  return report
}

/**
 * Enhance epic data with cross-project information
 * @param {Array} epics - Original epic list
 * @param {Object} linkingData - Cross-project linking data
 * @returns {Array} Enhanced epics with cross-project metadata
 */
export function enhanceEpicsWithCrossProjectData(epics, linkingData) {
  const { epicIssueMap } = linkingData

  return epics.map(epic => {
    const epicData = epicIssueMap.get(epic.id) || {
      issues: [],
      projects: new Set(),
      crossProjectIssues: []
    }

    return {
      ...epic,
      // Add cross-project metadata
      _crossProject: {
        issueCount: epicData.issues.length,
        projectCount: epicData.projects.size,
        projects: Array.from(epicData.projects),
        crossProjectIssueCount: epicData.crossProjectIssues.length,
        hasMultipleProjects: epicData.projects.size > 1,
        complexity: epicData.projects.size > 3 ? 'high' :
                   epicData.projects.size > 1 ? 'medium' : 'low'
      },
      // Keep original issues array
      issues: epicData.issues
    }
  })
}

/**
 * Find orphaned issues (not linked to any epic)
 * @param {Array} issues - All issues
 * @returns {Array} Issues without epic assignment
 */
export function findOrphanedIssues(issues) {
  return issues.filter(issue => !issue.epic && issue.labels?.some(label =>
    label.toLowerCase().includes('epic') || label.toLowerCase().includes('feature')
  ))
}

/**
 * Suggest epic assignments for orphaned issues
 * @param {Array} orphanedIssues - Issues without epics
 * @param {Array} epics - Available epics
 * @returns {Array} Suggestions for epic assignments
 */
export function suggestEpicAssignments(orphanedIssues, epics) {
  const suggestions = []

  orphanedIssues.forEach(issue => {
    const scores = []

    epics.forEach(epic => {
      let score = 0

      // Check label overlap
      const epicLabels = new Set(epic.labels?.map(l => l.toLowerCase()) || [])
      const issueLabels = new Set(issue.labels?.map(l => l.toLowerCase()) || [])
      const commonLabels = [...issueLabels].filter(l => epicLabels.has(l))
      score += commonLabels.length * 10

      // Check milestone alignment
      if (issue.milestone && epic.milestone && issue.milestone.id === epic.milestone.id) {
        score += 20
      }

      // Check title/description similarity
      const issueTitleLower = (issue.title || '').toLowerCase()
      const epicTitleLower = (epic.title || '').toLowerCase()
      const commonWords = issueTitleLower.split(' ').filter(word =>
        word.length > 3 && epicTitleLower.includes(word)
      )
      score += commonWords.length * 5

      // Check assignee overlap
      if (epic.issues && epic.issues.length > 0) {
        const epicAssignees = new Set()
        epic.issues.forEach(ei => {
          ei.assignees?.forEach(a => epicAssignees.add(a.id))
        })
        const hasCommonAssignee = issue.assignees?.some(a => epicAssignees.has(a.id))
        if (hasCommonAssignee) score += 15
      }

      if (score > 0) {
        scores.push({ epic, score })
      }
    })

    // Get top 3 suggestions
    scores.sort((a, b) => b.score - a.score)
    const topSuggestions = scores.slice(0, 3)

    if (topSuggestions.length > 0) {
      suggestions.push({
        issue,
        suggestions: topSuggestions.map(s => ({
          epic: s.epic,
          confidence: s.score > 30 ? 'high' : s.score > 15 ? 'medium' : 'low',
          score: s.score
        }))
      })
    }
  })

  return suggestions
}