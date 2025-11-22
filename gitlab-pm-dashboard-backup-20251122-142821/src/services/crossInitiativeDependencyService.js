/**
 * Cross-Initiative Dependency Service
 *
 * Analyzes dependencies between initiatives (not just issues)
 * Identifies critical paths and cascade impacts across strategic initiatives
 */

import { detectAllDependencies } from './dependencyService'

/**
 * Detect dependencies between initiatives
 * An initiative depends on another if any of its issues depend on issues in the other initiative
 */
export function detectInitiativeDependencies(initiatives, issues) {
  // First, get all issue-level dependencies
  const issueDependencyMap = detectAllDependencies(issues)

  const initiativeDependencies = []

  initiatives.forEach(fromInitiative => {
    const dependsOnInitiatives = new Map()

    // Check each issue in this initiative
    fromInitiative.issues.forEach(issue => {
      const depInfo = issueDependencyMap.get(issue.iid)

      if (depInfo && depInfo.dependencies.length > 0) {
        // Check which initiatives the dependencies belong to
        depInfo.dependencies.forEach(depIssue => {
          const depInitiative = initiatives.find(init =>
            init.issues.some(i => i.iid === depIssue.iid)
          )

          if (depInitiative && depInitiative.id !== fromInitiative.id) {
            if (!dependsOnInitiatives.has(depInitiative.id)) {
              dependsOnInitiatives.set(depInitiative.id, {
                initiative: depInitiative,
                dependencyCount: 0,
                openDependencies: 0,
                blockedIssues: [],
                blockingIssues: []
              })
            }

            const depData = dependsOnInitiatives.get(depInitiative.id)
            depData.dependencyCount++
            if (depIssue.state === 'opened') {
              depData.openDependencies++
            }
            depData.blockedIssues.push({
              iid: issue.iid,
              title: issue.title,
              state: issue.state
            })
            depData.blockingIssues.push({
              iid: depIssue.iid,
              title: depIssue.title,
              state: depIssue.state
            })
          }
        })
      }
    })

    // Add to results if this initiative has dependencies
    if (dependsOnInitiatives.size > 0) {
      initiativeDependencies.push({
        initiativeId: fromInitiative.id,
        initiativeName: fromInitiative.name,
        initiativeStatus: fromInitiative.status,
        initiativeProgress: fromInitiative.progress,
        dependsOn: Array.from(dependsOnInitiatives.values()).map(dep => ({
          initiativeId: dep.initiative.id,
          initiativeName: dep.initiative.name,
          initiativeStatus: dep.initiative.status,
          initiativeProgress: dep.initiative.progress,
          dependencyCount: dep.dependencyCount,
          openDependencies: dep.openDependencies,
          isBlocking: dep.openDependencies > 0,
          severity: calculateDependencySeverity(
            dep.openDependencies,
            dep.dependencyCount,
            dep.initiative.status,
            dep.initiative.progress
          ),
          blockedIssues: dep.blockedIssues,
          blockingIssues: dep.blockingIssues
        }))
      })
    }
  })

  return initiativeDependencies
}

/**
 * Calculate severity of initiative dependency
 */
function calculateDependencySeverity(openDeps, totalDeps, blockingStatus, blockingProgress) {
  if (openDeps === 0) return 'low'

  // High severity if:
  // - Many open dependencies (3+)
  // - Blocking initiative is delayed or at-risk
  // - Blocking initiative has low progress (<50%)
  if (openDeps >= 3 || blockingStatus === 'delayed' || blockingProgress < 50) {
    return 'high'
  }

  // Medium severity if:
  // - Some open dependencies (1-2)
  // - Blocking initiative is at-risk
  if (openDeps >= 1 || blockingStatus === 'at-risk') {
    return 'medium'
  }

  return 'low'
}

/**
 * Build initiative dependency graph (nodes and edges for visualization)
 */
export function buildInitiativeDependencyGraph(initiatives, issues) {
  const dependencies = detectInitiativeDependencies(initiatives, issues)

  const nodes = initiatives.map(init => ({
    id: init.id,
    label: init.name,
    status: init.status,
    progress: init.progress,
    issueCount: init.totalIssues,
    hasDependencies: dependencies.some(dep => dep.initiativeId === init.id),
    isBlocker: dependencies.some(dep =>
      dep.dependsOn.some(d => d.initiativeId === init.id && d.isBlocking)
    )
  }))

  const edges = []
  dependencies.forEach(dep => {
    dep.dependsOn.forEach(target => {
      edges.push({
        from: dep.initiativeId,
        to: target.initiativeId,
        label: `${target.dependencyCount} issue${target.dependencyCount !== 1 ? 's' : ''}`,
        isBlocking: target.isBlocking,
        severity: target.severity,
        openDependencies: target.openDependencies
      })
    })
  })

  return { nodes, edges }
}

/**
 * Find critical path through initiatives
 * Returns the longest dependency chain
 */
export function findCriticalPath(initiatives, issues) {
  const dependencies = detectInitiativeDependencies(initiatives, issues)

  // Build adjacency list
  const graph = new Map()
  initiatives.forEach(init => {
    graph.set(init.id, [])
  })

  dependencies.forEach(dep => {
    dep.dependsOn.forEach(target => {
      graph.get(dep.initiativeId).push({
        id: target.initiativeId,
        name: target.initiativeName,
        weight: target.openDependencies
      })
    })
  })

  // Find longest path using DFS
  const visited = new Set()
  let longestPath = []

  function dfs(initiativeId, currentPath, currentWeight) {
    visited.add(initiativeId)
    const initiative = initiatives.find(i => i.id === initiativeId)
    currentPath.push({
      id: initiativeId,
      name: initiative.name,
      status: initiative.status,
      progress: initiative.progress
    })

    const neighbors = graph.get(initiativeId) || []
    if (neighbors.length === 0) {
      // Leaf node - check if this is the longest path
      if (currentPath.length > longestPath.length ||
          (currentPath.length === longestPath.length && currentWeight > (longestPath.weight || 0))) {
        longestPath = {
          path: [...currentPath],
          length: currentPath.length,
          weight: currentWeight
        }
      }
    } else {
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor.id)) {
          dfs(neighbor.id, currentPath, currentWeight + neighbor.weight)
        }
      })
    }

    currentPath.pop()
    visited.delete(initiativeId)
  }

  // Start DFS from each initiative
  initiatives.forEach(init => {
    dfs(init.id, [], 0)
  })

  return longestPath
}

/**
 * Calculate cascade impact - if initiative X is delayed N weeks, what else shifts?
 */
export function calculateCascadeImpact(initiativeId, delayWeeks, initiatives, issues) {
  const dependencies = detectInitiativeDependencies(initiatives, issues)

  // Build reverse dependency map (who depends on this initiative?)
  const impactedInitiatives = []

  function findImpacted(targetId, depth = 0, accumulatedDelay = delayWeeks) {
    dependencies
      .filter(dep => dep.dependsOn.some(d => d.initiativeId === targetId))
      .forEach(dep => {
        const existing = impactedInitiatives.find(i => i.initiativeId === dep.initiativeId)
        if (!existing) {
          impactedInitiatives.push({
            initiativeId: dep.initiativeId,
            initiativeName: dep.initiativeName,
            initiativeStatus: dep.initiativeStatus,
            initiativeProgress: dep.initiativeProgress,
            depth,
            estimatedDelayWeeks: accumulatedDelay,
            causedBy: targetId
          })

          // Recursively find initiatives that depend on this one
          findImpacted(dep.initiativeId, depth + 1, accumulatedDelay)
        }
      })
  }

  findImpacted(initiativeId)

  // Sort by depth (immediate impacts first)
  impactedInitiatives.sort((a, b) => a.depth - b.depth)

  return {
    sourceInitiative: initiatives.find(i => i.id === initiativeId),
    delayWeeks,
    impactedCount: impactedInitiatives.length,
    impacted: impactedInitiatives
  }
}

/**
 * Get initiative dependency matrix (table showing which initiatives depend on which)
 */
export function getInitiativeDependencyMatrix(initiatives, issues) {
  const dependencies = detectInitiativeDependencies(initiatives, issues)

  const matrix = []

  initiatives.forEach(rowInit => {
    const row = {
      initiative: rowInit.name,
      initiativeId: rowInit.id,
      status: rowInit.status,
      dependencies: {}
    }

    initiatives.forEach(colInit => {
      if (rowInit.id === colInit.id) {
        row.dependencies[colInit.id] = { type: 'self' }
      } else {
        const dep = dependencies.find(d => d.initiativeId === rowInit.id)
        const depOn = dep?.dependsOn.find(d => d.initiativeId === colInit.id)

        if (depOn) {
          row.dependencies[colInit.id] = {
            type: 'depends',
            count: depOn.dependencyCount,
            openCount: depOn.openDependencies,
            isBlocking: depOn.isBlocking,
            severity: depOn.severity
          }
        } else {
          row.dependencies[colInit.id] = { type: 'none' }
        }
      }
    })

    matrix.push(row)
  })

  return {
    matrix,
    initiatives: initiatives.map(i => ({
      id: i.id,
      name: i.name,
      status: i.status,
      progress: i.progress
    }))
  }
}

/**
 * Find blocking initiatives (initiatives that are blocking others)
 */
export function findBlockingInitiatives(initiatives, issues) {
  const dependencies = detectInitiativeDependencies(initiatives, issues)

  const blockingMap = new Map()

  dependencies.forEach(dep => {
    dep.dependsOn.forEach(target => {
      if (target.isBlocking) {
        if (!blockingMap.has(target.initiativeId)) {
          blockingMap.set(target.initiativeId, {
            initiativeId: target.initiativeId,
            initiativeName: target.initiativeName,
            initiativeStatus: target.initiativeStatus,
            initiativeProgress: target.initiativeProgress,
            blockedInitiatives: [],
            totalBlockedIssues: 0,
            highestSeverity: 'low'
          })
        }

        const blockingData = blockingMap.get(target.initiativeId)
        blockingData.blockedInitiatives.push({
          initiativeId: dep.initiativeId,
          initiativeName: dep.initiativeName,
          openDependencies: target.openDependencies,
          severity: target.severity
        })
        blockingData.totalBlockedIssues += target.openDependencies

        // Track highest severity
        if (target.severity === 'high') {
          blockingData.highestSeverity = 'high'
        } else if (target.severity === 'medium' && blockingData.highestSeverity !== 'high') {
          blockingData.highestSeverity = 'medium'
        }
      }
    })
  })

  return Array.from(blockingMap.values())
    .sort((a, b) => {
      // Sort by severity first, then by number of blocked initiatives
      const severityOrder = { high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.highestSeverity] - severityOrder[a.highestSeverity]
      if (severityDiff !== 0) return severityDiff
      return b.blockedInitiatives.length - a.blockedInitiatives.length
    })
}

/**
 * Export initiative dependencies to CSV
 */
export function exportInitiativeDependenciesCSV(dependencies) {
  const headers = [
    'Initiative',
    'Status',
    'Progress %',
    'Depends On Initiative',
    'Dependency Status',
    'Dependency Progress %',
    'Total Dependencies',
    'Open Dependencies',
    'Severity',
    'Is Blocking'
  ]

  const rows = []
  dependencies.forEach(dep => {
    if (dep.dependsOn.length === 0) {
      rows.push([
        dep.initiativeName,
        dep.initiativeStatus,
        dep.initiativeProgress,
        'No dependencies',
        '-', '-', '0', '0', '-', 'No'
      ])
    } else {
      dep.dependsOn.forEach((target, idx) => {
        rows.push([
          idx === 0 ? dep.initiativeName : '',
          idx === 0 ? dep.initiativeStatus : '',
          idx === 0 ? dep.initiativeProgress : '',
          target.initiativeName,
          target.initiativeStatus,
          target.initiativeProgress,
          target.dependencyCount,
          target.openDependencies,
          target.severity,
          target.isBlocking ? 'Yes' : 'No'
        ])
      })
    }
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n')

  return csvContent
}

/**
 * Export cascade impact analysis to CSV
 */
export function exportCascadeImpactCSV(cascadeImpact) {
  const headers = [
    'Source Initiative',
    'Delay (Weeks)',
    'Impacted Initiative',
    'Status',
    'Progress %',
    'Dependency Depth',
    'Estimated Delay (Weeks)'
  ]

  const rows = cascadeImpact.impacted.map((impact, idx) => [
    idx === 0 ? cascadeImpact.sourceInitiative.name : '',
    idx === 0 ? cascadeImpact.delayWeeks : '',
    impact.initiativeName,
    impact.initiativeStatus,
    impact.initiativeProgress,
    impact.depth,
    impact.estimatedDelayWeeks
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}
