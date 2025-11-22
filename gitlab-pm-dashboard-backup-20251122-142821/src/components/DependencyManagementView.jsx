import React, { useState, useMemo, useEffect } from 'react'

/**
 * Dependency Management Dashboard
 * Track and visualize dependencies at multiple levels (initiative, epic, story)
 * Shows critical paths and blocking chains
 */
export default function DependencyManagementView({ issues = [], epics = [], milestones = [] }) {
  const [viewLevel, setViewLevel] = useState('all') // all, initiative, epic, story
  const [selectedItem, setSelectedItem] = useState(null)
  const [showCriticalPath, setShowCriticalPath] = useState(true)
  const [viewMode, setViewMode] = useState('graph') // graph, table, matrix

  // Extract dependencies from issues and epics
  const dependencies = useMemo(() => {
    const deps = []
    const itemMap = new Map()

    // Process epics
    epics.forEach(epic => {
      itemMap.set(`epic-${epic.id}`, {
        id: `epic-${epic.id}`,
        type: 'epic',
        title: epic.title,
        state: epic.state,
        dueDate: epic.due_date,
        labels: epic.labels || [],
        webUrl: epic.web_url
      })

      // Check for dependencies in epic description
      const depPattern = /depends on:?\s*(#\d+|epic-\d+|story-\d+)/gi
      const blockedByPattern = /blocked by:?\s*(#\d+|epic-\d+|story-\d+)/gi

      const description = epic.description || ''
      let match

      while ((match = depPattern.exec(description)) !== null) {
        deps.push({
          id: `dep-${deps.length}`,
          from: `epic-${epic.id}`,
          to: match[1].replace('#', 'issue-'),
          type: 'depends_on',
          level: 'epic'
        })
      }

      while ((match = blockedByPattern.exec(description)) !== null) {
        deps.push({
          id: `dep-${deps.length}`,
          from: `epic-${epic.id}`,
          to: match[1].replace('#', 'issue-'),
          type: 'blocked_by',
          level: 'epic'
        })
      }
    })

    // Process issues
    issues.forEach(issue => {
      const itemId = `issue-${issue.iid}`

      // Determine level based on labels
      let level = 'story'
      if (issue.labels?.some(l => l.startsWith('initiative::'))) {
        level = 'initiative'
      } else if (issue.epic) {
        level = 'epic-child'
      }

      itemMap.set(itemId, {
        id: itemId,
        type: 'issue',
        title: issue.title,
        state: issue.state,
        dueDate: issue.due_date,
        assignee: issue.assignee,
        labels: issue.labels || [],
        webUrl: issue.web_url,
        level,
        milestone: issue.milestone?.title
      })

      // Extract dependencies from description and labels
      const description = issue.description || ''

      // Check for blocking/blocked labels
      if (issue.labels?.includes('blocking')) {
        // This issue blocks others
        issue.blocking_issues?.forEach(blockedId => {
          deps.push({
            id: `dep-${deps.length}`,
            from: itemId,
            to: `issue-${blockedId}`,
            type: 'blocks',
            level
          })
        })
      }

      // Parse description for dependency markers
      const patterns = [
        { regex: /depends on:?\s*(#\d+|epic-\d+)/gi, type: 'depends_on' },
        { regex: /blocked by:?\s*(#\d+|epic-\d+)/gi, type: 'blocked_by' },
        { regex: /blocks:?\s*(#\d+|epic-\d+)/gi, type: 'blocks' },
        { regex: /required for:?\s*(#\d+|epic-\d+)/gi, type: 'required_for' }
      ]

      patterns.forEach(({ regex, type }) => {
        let match
        while ((match = regex.exec(description)) !== null) {
          const targetId = match[1].replace('#', 'issue-')
          deps.push({
            id: `dep-${deps.length}`,
            from: itemId,
            to: targetId,
            type,
            level
          })
        }
      })

      // Check for cross-references in comments
      if (issue.notes) {
        issue.notes.forEach(note => {
          const mentionPattern = /mentioned in (#\d+)/gi
          let match
          while ((match = mentionPattern.exec(note.body)) !== null) {
            deps.push({
              id: `dep-${deps.length}`,
              from: itemId,
              to: match[1].replace('#', 'issue-'),
              type: 'related',
              level
            })
          }
        })
      }
    })

    return { dependencies: deps, items: itemMap }
  }, [issues, epics])

  // Calculate critical path
  const criticalPath = useMemo(() => {
    if (!showCriticalPath) return []

    const { dependencies: deps, items } = dependencies
    const graph = new Map()
    const reverseGraph = new Map()

    // Build adjacency lists
    deps.forEach(dep => {
      if (!graph.has(dep.from)) graph.set(dep.from, [])
      if (!reverseGraph.has(dep.to)) reverseGraph.set(dep.to, [])

      graph.get(dep.from).push(dep.to)
      reverseGraph.get(dep.to).push(dep.from)
    })

    // Find items with no dependencies (start nodes)
    const startNodes = []
    items.forEach((item, id) => {
      if (!reverseGraph.has(id) || reverseGraph.get(id).length === 0) {
        startNodes.push(id)
      }
    })

    // Find items with no dependents (end nodes)
    const endNodes = []
    items.forEach((item, id) => {
      if (!graph.has(id) || graph.get(id).length === 0) {
        if (reverseGraph.has(id)) { // Has dependencies but no dependents
          endNodes.push(id)
        }
      }
    })

    // Calculate longest path (critical path)
    const calculateLongestPath = (start) => {
      const distances = new Map()
      const parents = new Map()
      const queue = [start]
      distances.set(start, 0)

      while (queue.length > 0) {
        const current = queue.shift()
        const currentDist = distances.get(current)

        const neighbors = graph.get(current) || []
        neighbors.forEach(neighbor => {
          const newDist = currentDist + 1
          if (!distances.has(neighbor) || distances.get(neighbor) < newDist) {
            distances.set(neighbor, newDist)
            parents.set(neighbor, current)
            queue.push(neighbor)
          }
        })
      }

      // Find the longest path
      let maxDist = 0
      let endpoint = start
      distances.forEach((dist, node) => {
        if (dist > maxDist) {
          maxDist = dist
          endpoint = node
        }
      })

      // Reconstruct path
      const path = []
      let current = endpoint
      while (current) {
        path.unshift(current)
        current = parents.get(current)
      }

      return { path, length: maxDist }
    }

    // Find the overall critical path
    let longestPath = { path: [], length: 0 }
    startNodes.forEach(start => {
      const path = calculateLongestPath(start)
      if (path.length > longestPath.length) {
        longestPath = path
      }
    })

    return longestPath.path
  }, [dependencies, showCriticalPath])

  // Identify circular dependencies
  const circularDependencies = useMemo(() => {
    const { dependencies: deps } = dependencies
    const graph = new Map()
    const circles = []

    deps.forEach(dep => {
      if (!graph.has(dep.from)) graph.set(dep.from, new Set())
      graph.get(dep.from).add(dep.to)
    })

    const visited = new Set()
    const recStack = new Set()
    const path = []

    const detectCycle = (node) => {
      visited.add(node)
      recStack.add(node)
      path.push(node)

      const neighbors = graph.get(node) || new Set()
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor)) return true
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor)
          circles.push(path.slice(cycleStart))
          return true
        }
      }

      path.pop()
      recStack.delete(node)
      return false
    }

    graph.forEach((_, node) => {
      if (!visited.has(node)) {
        detectCycle(node)
      }
    })

    return circles
  }, [dependencies])

  // Filter dependencies based on view level
  const filteredDependencies = useMemo(() => {
    if (viewLevel === 'all') return dependencies

    const filtered = dependencies.dependencies.filter(dep => {
      if (viewLevel === 'initiative') {
        return dep.level === 'initiative'
      } else if (viewLevel === 'epic') {
        return dep.level === 'epic' || dep.level === 'epic-child'
      } else if (viewLevel === 'story') {
        return dep.level === 'story'
      }
      return true
    })

    return { ...dependencies, dependencies: filtered }
  }, [dependencies, viewLevel])

  // Render dependency graph
  const renderGraph = () => {
    const { dependencies: deps, items } = filteredDependencies

    // Group items by type/level for layout
    const levels = {
      initiative: [],
      epic: [],
      story: []
    }

    items.forEach((item, id) => {
      if (item.level === 'initiative') {
        levels.initiative.push(id)
      } else if (item.type === 'epic' || item.level === 'epic-child') {
        levels.epic.push(id)
      } else {
        levels.story.push(id)
      }
    })

    return (
      <div style={{
        position: 'relative',
        minHeight: '600px',
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px',
        overflow: 'auto'
      }}>
        {/* SVG for dependency lines */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          {deps.map(dep => {
            const fromItem = items.get(dep.from)
            const toItem = items.get(dep.to)
            if (!fromItem || !toItem) return null

            // Simple positioning (would need proper layout algorithm for production)
            const fromEl = document.getElementById(`node-${dep.from}`)
            const toEl = document.getElementById(`node-${dep.to}`)
            if (!fromEl || !toEl) return null

            const fromRect = fromEl.getBoundingClientRect()
            const toRect = toEl.getBoundingClientRect()
            const containerRect = fromEl.offsetParent?.getBoundingClientRect()

            if (!containerRect) return null

            const x1 = fromRect.left + fromRect.width / 2 - containerRect.left
            const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
            const x2 = toRect.left + toRect.width / 2 - containerRect.left
            const y2 = toRect.top + toRect.height / 2 - containerRect.top

            const isOnCriticalPath = criticalPath.includes(dep.from) && criticalPath.includes(dep.to)

            return (
              <g key={dep.id}>
                <defs>
                  <marker
                    id={`arrowhead-${dep.id}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill={isOnCriticalPath ? '#DC2626' :
                            dep.type === 'blocks' ? '#F59E0B' : '#6B7280'}
                    />
                  </marker>
                </defs>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isOnCriticalPath ? '#DC2626' :
                         dep.type === 'blocks' ? '#F59E0B' : '#6B7280'}
                  strokeWidth={isOnCriticalPath ? 3 : 2}
                  markerEnd={`url(#arrowhead-${dep.id})`}
                  strokeDasharray={dep.type === 'related' ? '5,5' : 'none'}
                />
              </g>
            )
          })}
        </svg>

        {/* Render nodes by level */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Initiatives */}
          {levels.initiative.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '12px' }}>
                INITIATIVES
              </h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {levels.initiative.map(id => {
                  const item = items.get(id)
                  const isOnPath = criticalPath.includes(id)
                  return (
                    <div
                      key={id}
                      id={`node-${id}`}
                      onClick={() => setSelectedItem(item)}
                      style={{
                        padding: '12px',
                        background: isOnPath ? '#FEE2E2' : 'white',
                        border: `2px solid ${isOnPath ? '#DC2626' : '#E5E7EB'}`,
                        borderRadius: '8px',
                        minWidth: '200px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                        {item.state} • {item.milestone || 'No milestone'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Epics */}
          {levels.epic.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '12px' }}>
                EPICS
              </h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {levels.epic.map(id => {
                  const item = items.get(id)
                  const isOnPath = criticalPath.includes(id)
                  return (
                    <div
                      key={id}
                      id={`node-${id}`}
                      onClick={() => setSelectedItem(item)}
                      style={{
                        padding: '10px',
                        background: isOnPath ? '#FEF3C7' : 'white',
                        border: `2px solid ${isOnPath ? '#F59E0B' : '#D1D5DB'}`,
                        borderRadius: '6px',
                        minWidth: '180px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                        {item.title}
                      </div>
                      {item.assignee && (
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                          @{item.assignee.username}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Stories */}
          {levels.story.length > 0 && (
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '12px' }}>
                STORIES
              </h4>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {levels.story.slice(0, 20).map(id => { // Limit for performance
                  const item = items.get(id)
                  const isOnPath = criticalPath.includes(id)
                  return (
                    <div
                      key={id}
                      id={`node-${id}`}
                      onClick={() => setSelectedItem(item)}
                      style={{
                        padding: '8px',
                        background: isOnPath ? '#F0F9FF' : 'white',
                        border: `1px solid ${isOnPath ? '#3B82F6' : '#E5E7EB'}`,
                        borderRadius: '4px',
                        minWidth: '150px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: '500', color: '#4B5563' }}>
                        {item.title.substring(0, 50)}...
                      </div>
                    </div>
                  )
                })}
                {levels.story.length > 20 && (
                  <div style={{ padding: '8px', color: '#6B7280', fontSize: '12px' }}>
                    +{levels.story.length - 20} more stories
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render dependency matrix
  const renderMatrix = () => {
    const { dependencies: deps, items } = filteredDependencies
    const itemArray = Array.from(items.values()).slice(0, 20) // Limit for display

    return (
      <div style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px',
        overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', borderBottom: '2px solid #E5E7EB' }}>From / To</th>
              {itemArray.map(item => (
                <th
                  key={item.id}
                  style={{
                    padding: '8px',
                    borderBottom: '2px solid #E5E7EB',
                    writingMode: 'vertical-lr',
                    textOrientation: 'mixed',
                    height: '100px',
                    fontSize: '10px'
                  }}
                >
                  {item.title.substring(0, 30)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itemArray.map(fromItem => (
              <tr key={fromItem.id}>
                <td style={{
                  padding: '8px',
                  borderRight: '2px solid #E5E7EB',
                  fontWeight: '500'
                }}>
                  {fromItem.title.substring(0, 30)}
                </td>
                {itemArray.map(toItem => {
                  const dep = deps.find(d =>
                    d.from === fromItem.id && d.to === toItem.id
                  )
                  return (
                    <td
                      key={toItem.id}
                      style={{
                        padding: '4px',
                        border: '1px solid #F3F4F6',
                        textAlign: 'center',
                        background: dep ? (
                          dep.type === 'blocks' ? '#FEF3C7' :
                          dep.type === 'blocked_by' ? '#FEE2E2' :
                          '#E0F2FE'
                        ) : 'white'
                      }}
                    >
                      {dep && (
                        <span style={{ fontSize: '10px' }}>
                          {dep.type === 'blocks' ? '🚫' :
                           dep.type === 'blocked_by' ? '⛔' :
                           dep.type === 'depends_on' ? '→' :
                           '↔'}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Render dependency table
  const renderTable = () => {
    const { dependencies: deps, items } = filteredDependencies

    return (
      <div style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                From
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                Relationship
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                To
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                Level
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                Critical Path
              </th>
            </tr>
          </thead>
          <tbody>
            {deps.map((dep, index) => {
              const fromItem = items.get(dep.from)
              const toItem = items.get(dep.to)
              if (!fromItem || !toItem) return null

              const isOnPath = criticalPath.includes(dep.from) && criticalPath.includes(dep.to)

              return (
                <tr
                  key={dep.id}
                  style={{
                    borderTop: index > 0 ? '1px solid #E5E7EB' : 'none',
                    background: isOnPath ? '#FEF9C3' : 'white'
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                      {fromItem.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {fromItem.type} • {fromItem.state}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: dep.type === 'blocks' ? '#FEF3C7' :
                                 dep.type === 'blocked_by' ? '#FEE2E2' :
                                 dep.type === 'depends_on' ? '#E0F2FE' :
                                 '#F3F4F6',
                      color: dep.type === 'blocks' ? '#92400E' :
                             dep.type === 'blocked_by' ? '#991B1B' :
                             dep.type === 'depends_on' ? '#075985' :
                             '#374151',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {dep.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                      {toItem.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {toItem.type} • {toItem.state}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '2px 6px',
                      background: '#EEF2FF',
                      color: '#4F46E5',
                      borderRadius: '3px',
                      fontSize: '11px'
                    }}>
                      {dep.level}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {isOnPath && (
                      <span style={{ color: '#DC2626', fontSize: '16px' }}>⚠️</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
          Dependency Management
        </h2>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>
          Track and visualize dependencies across initiatives, epics, and stories
        </p>
      </div>

      {/* Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
            Total Dependencies
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937' }}>
            {dependencies.dependencies.length}
          </div>
        </div>

        <div style={{
          background: criticalPath.length > 0 ? '#FEF3C7' : 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
            Critical Path Length
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#92400E' }}>
            {criticalPath.length} items
          </div>
        </div>

        <div style={{
          background: circularDependencies.length > 0 ? '#FEE2E2' : 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
            Circular Dependencies
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: circularDependencies.length > 0 ? '#DC2626' : '#10B981' }}>
            {circularDependencies.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
            Blocking Issues
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#F59E0B' }}>
            {dependencies.dependencies.filter(d => d.type === 'blocks').length}
          </div>
        </div>
      </div>

      {/* Circular Dependency Warning */}
      {circularDependencies.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '8px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#DC2626', marginBottom: '8px' }}>
            ⚠️ Circular Dependencies Detected
          </h4>
          <div style={{ fontSize: '13px', color: '#991B1B' }}>
            {circularDependencies.map((cycle, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                • {cycle.join(' → ')} → {cycle[0]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* View Mode */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['graph', 'table', 'matrix'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '8px 16px',
                  background: viewMode === mode ? '#3B82F6' : 'white',
                  color: viewMode === mode ? 'white' : '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: mode === 'graph' ? '6px 0 0 6px' :
                              mode === 'matrix' ? '0 6px 6px 0' : '0',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Level Filter */}
          <select
            value={viewLevel}
            onChange={(e) => setViewLevel(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            <option value="all">All Levels</option>
            <option value="initiative">Initiatives Only</option>
            <option value="epic">Epics Only</option>
            <option value="story">Stories Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Show Critical Path
          </label>

          <button
            onClick={() => window.location.href = '#export'}
            style={{
              padding: '8px 16px',
              background: 'white',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Main View */}
      {viewMode === 'graph' && renderGraph()}
      {viewMode === 'table' && renderTable()}
      {viewMode === 'matrix' && renderMatrix()}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {selectedItem.title}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Type</div>
              <div style={{ fontSize: '14px' }}>{selectedItem.type}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>State</div>
              <div style={{ fontSize: '14px' }}>{selectedItem.state}</div>
            </div>

            {selectedItem.assignee && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Assignee</div>
                <div style={{ fontSize: '14px' }}>@{selectedItem.assignee.username}</div>
              </div>
            )}

            {selectedItem.milestone && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Milestone</div>
                <div style={{ fontSize: '14px' }}>{selectedItem.milestone}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <a
                href={selectedItem.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  background: '#3B82F6',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none'
                }}
              >
                View in GitLab
              </a>
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}