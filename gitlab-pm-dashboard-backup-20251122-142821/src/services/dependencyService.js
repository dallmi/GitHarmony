/**
 * Dependency Detection and Analysis Service
 * Automatically detects and analyzes issue dependencies
 * 100% automatic - no manual input required
 */

/**
 * Parse issue description/title for dependency patterns
 */
function parseDependencyPatterns(text) {
  if (!text) return []

  const dependencies = []

  // Common dependency patterns
  const patterns = [
    /depends on #(\d+)/gi,
    /blocked by #(\d+)/gi,
    /requires #(\d+)/gi,
    /needs #(\d+)/gi,
    /waiting for #(\d+)/gi,
    /blocks? #(\d+)/gi,
    /dependency:? #(\d+)/gi,
    /(?:^|\s)#(\d+)(?:\s|$)/g  // Generic #123 mentions
  ]

  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const issueNumber = parseInt(match[1], 10)
      if (issueNumber && !dependencies.includes(issueNumber)) {
        dependencies.push(issueNumber)
      }
    }
  })

  return dependencies
}

/**
 * Detect dependencies from GitLab related issues (if available)
 */
function getRelatedIssueDependencies(issue) {
  // GitLab API can provide related issues
  // For now, we'll parse from description/comments
  // Future enhancement: Use GitLab Related Issues API
  return []
}

/**
 * Find all dependencies for all issues
 */
export function detectAllDependencies(issues) {
  const issueMap = new Map()
  const dependencyMap = new Map()

  // Build issue lookup map
  issues.forEach(issue => {
    issueMap.set(issue.iid, issue)
  })

  // Detect dependencies for each issue
  issues.forEach(issue => {
    const textToSearch = `${issue.title} ${issue.description || ''}`
    const dependencyIssueNumbers = parseDependencyPatterns(textToSearch)
    const relatedDeps = getRelatedIssueDependencies(issue)

    const allDeps = [...new Set([...dependencyIssueNumbers, ...relatedDeps])]

    if (allDeps.length > 0) {
      const resolvedDeps = allDeps
        .map(iid => issueMap.get(iid))
        .filter(dep => dep !== undefined)

      if (resolvedDeps.length > 0) {
        dependencyMap.set(issue.iid, {
          issue,
          dependencies: resolvedDeps,
          dependencyCount: resolvedDeps.length,
          openDependencies: resolvedDeps.filter(dep => dep.state === 'opened'),
          closedDependencies: resolvedDeps.filter(dep => dep.state === 'closed')
        })
      }
    }
  })

  return dependencyMap
}

/**
 * Find issues that are blocked by open dependencies
 */
export function findBlockedIssues(issues) {
  const dependencyMap = detectAllDependencies(issues)
  const blockedIssues = []

  dependencyMap.forEach((depInfo, issueIid) => {
    if (depInfo.openDependencies.length > 0) {
      // Calculate severity
      const openCount = depInfo.openDependencies.length
      let severity = 'low'
      if (openCount >= 3) {
        severity = 'high'
      } else if (openCount >= 1) {
        severity = 'medium'
      }

      // Find which issues this blocks (reverse dependency)
      const blocksOtherIssues = []
      dependencyMap.forEach((otherDepInfo, otherIid) => {
        if (otherIid !== issueIid) {
          const blockedByThis = otherDepInfo.dependencies.some(dep => dep.iid === issueIid)
          if (blockedByThis) {
            blocksOtherIssues.push(otherDepInfo.issue)
          }
        }
      })

      blockedIssues.push({
        ...depInfo,
        severity,
        blocksCount: blocksOtherIssues.length,
        blocksIssues: blocksOtherIssues,
        impact: calculateImpact(openCount, blocksOtherIssues.length)
      })
    }
  })

  // Sort by severity (high first), then by impact (highest first)
  blockedIssues.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity]
    }
    return b.impact - a.impact
  })

  return blockedIssues
}

/**
 * Calculate impact score based on dependencies and downstream blockers
 */
function calculateImpact(openDependencies, blocksCount) {
  // Impact = (open dependencies * 10) + (blocks other issues * 20)
  // Blocking others is more impactful than being blocked
  return (openDependencies * 10) + (blocksCount * 20)
}

/**
 * Get dependency statistics
 */
export function getDependencyStats(issues) {
  const blockedIssues = findBlockedIssues(issues)
  const dependencyMap = detectAllDependencies(issues)

  const totalIssuesWithDependencies = dependencyMap.size
  const totalBlockedIssues = blockedIssues.length
  const highSeverityBlocked = blockedIssues.filter(b => b.severity === 'high').length
  const mediumSeverityBlocked = blockedIssues.filter(b => b.severity === 'medium').length

  // Calculate total open dependencies across all issues
  let totalOpenDependencies = 0
  dependencyMap.forEach(depInfo => {
    totalOpenDependencies += depInfo.openDependencies.length
  })

  return {
    totalIssuesWithDependencies,
    totalBlockedIssues,
    highSeverityBlocked,
    mediumSeverityBlocked,
    totalOpenDependencies,
    hasBlockers: totalBlockedIssues > 0
  }
}

/**
 * Get recommended actions for dependency blockers
 */
export function getRecommendedActions(blockedIssue) {
  const recommendations = []

  if (blockedIssue.severity === 'high') {
    recommendations.push({
      priority: 'urgent',
      action: 'Escalate to leadership',
      details: `This issue is blocked by ${blockedIssue.openDependencies.length} open dependencies. Consider daily standup focus.`
    })
  }

  if (blockedIssue.blocksCount > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Prioritize unblocking',
      details: `Unblocking this will unblock ${blockedIssue.blocksCount} other issue(s).`
    })
  }

  blockedIssue.openDependencies.forEach(dep => {
    if (dep.state === 'opened' && !dep.assignees?.length) {
      recommendations.push({
        priority: 'medium',
        action: `Assign dependency #${dep.iid}`,
        details: `"${dep.title}" has no assignee. Assign to accelerate unblocking.`
      })
    }
  })

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      action: 'Monitor dependencies',
      details: 'Track progress on open dependencies in daily standups.'
    })
  }

  return recommendations
}

/**
 * Build dependency graph data structure
 * Returns nodes and edges for visualization
 */
export function buildDependencyGraph(issues) {
  const dependencyMap = detectAllDependencies(issues)
  const nodes = []
  const edges = []

  // Add all issues with dependencies as nodes
  dependencyMap.forEach((depInfo, issueIid) => {
    nodes.push({
      id: issueIid,
      label: `#${issueIid}: ${depInfo.issue.title}`,
      issue: depInfo.issue,
      state: depInfo.issue.state,
      hasOpenDependencies: depInfo.openDependencies.length > 0
    })

    // Add dependency edges
    depInfo.dependencies.forEach(dep => {
      edges.push({
        from: issueIid,
        to: dep.iid,
        label: 'depends on',
        isBlocking: dep.state === 'opened'
      })
    })
  })

  return { nodes, edges }
}

/**
 * Detect circular dependencies (A depends on B, B depends on A)
 */
export function detectCircularDependencies(issues) {
  const dependencyMap = detectAllDependencies(issues)
  const circular = []

  dependencyMap.forEach((depInfo, issueIid) => {
    depInfo.dependencies.forEach(dep => {
      // Check if dependency also depends on this issue
      const reverseDep = dependencyMap.get(dep.iid)
      if (reverseDep) {
        const hasReverse = reverseDep.dependencies.some(d => d.iid === issueIid)
        if (hasReverse) {
          circular.push({
            issue1: depInfo.issue,
            issue2: dep,
            type: 'circular'
          })
        }
      }
    })
  })

  // Remove duplicates (A→B and B→A are the same circular dependency)
  const unique = []
  circular.forEach(circ => {
    const exists = unique.some(u =>
      (u.issue1.iid === circ.issue1.iid && u.issue2.iid === circ.issue2.iid) ||
      (u.issue1.iid === circ.issue2.iid && u.issue2.iid === circ.issue1.iid)
    )
    if (!exists) {
      unique.push(circ)
    }
  })

  return unique
}

/**
 * Export dependency report to CSV
 */
export function exportDependencyCSV(blockedIssues) {
  const headers = [
    'Issue ID',
    'Title',
    'State',
    'Severity',
    'Open Dependencies',
    'Blocks Other Issues',
    'Impact Score',
    'Dependency Issues',
    'Recommended Action',
    'URL'
  ]

  const rows = blockedIssues.map(blocked => {
    const depList = blocked.openDependencies
      .map(dep => `#${dep.iid}: ${dep.title}`)
      .join('; ')

    const recommendations = getRecommendedActions(blocked)
    const topRecommendation = recommendations[0]?.action || 'Monitor'

    return [
      blocked.issue.iid,
      `"${blocked.issue.title.replace(/"/g, '""')}"`,
      blocked.issue.state,
      blocked.severity,
      blocked.openDependencies.length,
      blocked.blocksCount,
      blocked.impact,
      `"${depList}"`,
      `"${topRecommendation}"`,
      blocked.issue.web_url
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
export function downloadDependencyCSV(csvContent, filename = 'dependency-blockers.csv') {
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
