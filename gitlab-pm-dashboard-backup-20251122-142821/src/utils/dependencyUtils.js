/**
 * Dependency parsing utilities
 * Extract "blocked by #123" from descriptions and build graph
 */

/**
 * Extract dependency references from issue description
 * Looks for patterns like:
 * - "blocked by #123"
 * - "depends on #456"
 * - "requires #789"
 */
export function extractDependencies(description) {
  if (!description) return []

  const dependencies = []
  const patterns = [
    /blocked by #(\d+)/gi,
    /depends on #(\d+)/gi,
    /requires #(\d+)/gi,
    /waiting for #(\d+)/gi
  ]

  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(description)) !== null) {
      dependencies.push(parseInt(match[1], 10))
    }
  })

  return [...new Set(dependencies)] // Remove duplicates
}

/**
 * Build dependency graph from issues
 * Returns nodes and links for D3 visualization
 */
export function buildDependencyGraph(issues) {
  const nodes = []
  const links = []

  // Create nodes
  issues.forEach(issue => {
    nodes.push({
      id: issue.iid,
      title: issue.title,
      state: issue.state,
      labels: issue.labels
    })
  })

  // Create links
  issues.forEach(issue => {
    const dependencies = extractDependencies(issue.description)

    dependencies.forEach(depId => {
      // Check if dependency exists in our issue list
      const targetExists = issues.some(i => i.iid === depId)

      if (targetExists) {
        links.push({
          source: depId, // The issue we depend on
          target: issue.iid, // The current issue
          type: 'blocks'
        })
      }
    })
  })

  return { nodes, links }
}

/**
 * Find circular dependencies
 */
export function findCircularDependencies(issues) {
  const graph = buildDependencyGraph(issues)
  const circular = []

  // Simple cycle detection using DFS
  function hasCycle(nodeId, visited = new Set(), path = new Set()) {
    if (path.has(nodeId)) {
      return true
    }

    if (visited.has(nodeId)) {
      return false
    }

    visited.add(nodeId)
    path.add(nodeId)

    const outgoing = graph.links.filter(l => l.source === nodeId)

    for (const link of outgoing) {
      if (hasCycle(link.target, visited, path)) {
        circular.push({ from: nodeId, to: link.target })
        return true
      }
    }

    path.delete(nodeId)
    return false
  }

  graph.nodes.forEach(node => {
    hasCycle(node.id)
  })

  return circular
}

/**
 * Calculate critical path (issues with longest dependency chain)
 */
export function calculateCriticalPath(issues) {
  const graph = buildDependencyGraph(issues)
  const depths = new Map()

  function getDepth(nodeId, visited = new Set()) {
    if (depths.has(nodeId)) {
      return depths.get(nodeId)
    }

    if (visited.has(nodeId)) {
      return 0 // Circular dependency
    }

    visited.add(nodeId)

    const incoming = graph.links.filter(l => l.target === nodeId)

    if (incoming.length === 0) {
      depths.set(nodeId, 0)
      return 0
    }

    const maxDepth = Math.max(
      ...incoming.map(link => getDepth(link.source, visited) + 1)
    )

    depths.set(nodeId, maxDepth)
    return maxDepth
  }

  // Calculate depths for all nodes
  graph.nodes.forEach(node => {
    getDepth(node.id)
  })

  // Find maximum depth
  const maxDepth = Math.max(...Array.from(depths.values()))

  // Return issues on critical path
  return issues.filter(issue => depths.get(issue.iid) === maxDepth)
}

/**
 * Get blocked issues (issues with unresolved dependencies)
 */
export function getBlockedIssues(issues) {
  const blocked = []

  issues.forEach(issue => {
    if (issue.state === 'closed') return

    const dependencies = extractDependencies(issue.description)

    if (dependencies.length > 0) {
      const unresolvedDeps = dependencies.filter(depId => {
        const depIssue = issues.find(i => i.iid === depId)
        return depIssue && depIssue.state !== 'closed'
      })

      if (unresolvedDeps.length > 0) {
        blocked.push({
          issue,
          blockedBy: unresolvedDeps
        })
      }
    }
  })

  return blocked
}
