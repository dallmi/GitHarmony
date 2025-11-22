import React, { useState, useMemo } from 'react'
import { createUnifiedIssueEpicView } from '../services/multiSourceGitlabApi'

/**
 * Unified Epic-Issue View Component
 * Displays all issues grouped by their parent epics, regardless of source project/group
 */
export default function UnifiedEpicIssueView({ data, onIssueClick, onEpicClick }) {
  const [expandedEpics, setExpandedEpics] = useState(new Set())
  const [filterSource, setFilterSource] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyOrphaned, setShowOnlyOrphaned] = useState(false)

  // Create unified view
  const epicGroups = useMemo(() => {
    return createUnifiedIssueEpicView(data)
  }, [data])

  // Get unique sources for filtering
  const sources = useMemo(() => {
    const sourceSet = new Set()
    data.issues.forEach(issue => {
      if (issue._source) sourceSet.add(issue._source)
    })
    data.epics.forEach(epic => {
      if (epic._source) sourceSet.add(epic._source)
    })
    return Array.from(sourceSet).sort()
  }, [data])

  // Apply filters
  const filteredGroups = useMemo(() => {
    let groups = epicGroups

    // Filter by source
    if (filterSource !== 'all') {
      groups = groups.map(group => ({
        ...group,
        issues: group.issues.filter(issue => issue._source === filterSource)
      })).filter(group => {
        if (group.epic) {
          return group.epic._source === filterSource || group.issues.length > 0
        }
        return group.issues.length > 0
      })
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      groups = groups.map(group => ({
        ...group,
        issues: group.issues.filter(issue =>
          issue.title.toLowerCase().includes(term) ||
          issue.description?.toLowerCase().includes(term) ||
          issue.iid.toString().includes(term)
        )
      })).filter(group => {
        if (group.epic) {
          const epicMatches = group.epic.title.toLowerCase().includes(term) ||
                             group.epic.description?.toLowerCase().includes(term)
          return epicMatches || group.issues.length > 0
        }
        return group.issues.length > 0
      })
    }

    // Show only orphaned issues
    if (showOnlyOrphaned) {
      groups = groups.filter(group => !group.epic)
    }

    return groups
  }, [epicGroups, filterSource, searchTerm, showOnlyOrphaned])

  const toggleEpic = (epicId) => {
    const newExpanded = new Set(expandedEpics)
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId)
    } else {
      newExpanded.add(epicId)
    }
    setExpandedEpics(newExpanded)
  }

  const expandAll = () => {
    const allEpicIds = filteredGroups
      .filter(g => g.epic)
      .map(g => g.epic.id)
    setExpandedEpics(new Set(allEpicIds))
  }

  const collapseAll = () => {
    setExpandedEpics(new Set())
  }

  // Calculate statistics
  const stats = {
    totalEpics: filteredGroups.filter(g => g.epic).length,
    totalIssues: filteredGroups.reduce((sum, g) => sum + g.issues.length, 0),
    orphanedIssues: filteredGroups.find(g => !g.epic)?.issues.length || 0
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '8px' }}>Unified Epic-Issue View</h2>
          <p style={{ margin: 0, color: '#6B7280' }}>
            All issues from multiple projects grouped by their parent epics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={expandAll}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
        padding: '16px',
        background: '#F9FAFB',
        borderRadius: '8px'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search issues and epics..."
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
            Source Filter
          </label>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              minWidth: '150px'
            }}
          >
            <option value="all">All Sources</option>
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showOnlyOrphaned}
              onChange={(e) => setShowOnlyOrphaned(e.target.checked)}
            />
            <span style={{ fontSize: '14px' }}>Orphaned Issues Only</span>
          </label>
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3B82F6' }}>
            {stats.totalEpics}
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>Epics</div>
        </div>
        <div style={{
          padding: '16px',
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
            {stats.totalIssues}
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>Total Issues</div>
        </div>
        <div style={{
          padding: '16px',
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>
            {stats.orphanedIssues}
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>Orphaned Issues</div>
        </div>
      </div>

      {/* Epic Groups */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredGroups.length === 0 ? (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            background: '#F9FAFB',
            borderRadius: '8px',
            color: '#6B7280'
          }}>
            No issues or epics found matching your filters
          </div>
        ) : (
          filteredGroups.map((group, index) => (
            <div
              key={group.epic?.id || 'orphaned'}
              style={{
                background: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              {/* Epic Header */}
              {group.epic ? (
                <div
                  style={{
                    padding: '16px',
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleEpic(group.epic.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>
                          {expandedEpics.has(group.epic.id) ? '▼' : '▶'}
                        </span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                            {group.epic.title}
                          </h3>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '13px', color: '#6B7280' }}>
                            <span>📊 Epic #{group.epic.iid}</span>
                            <span>📁 {group.epic._source || 'Unknown'}</span>
                            {group.epic._groupPath && <span>👥 {group.epic._groupPath}</span>}
                            <span>📋 {group.issues.length} issues</span>
                            {group.epic.state && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: group.epic.state === 'opened' ? '#DBEAFE' : '#D1FAE5',
                                color: group.epic.state === 'opened' ? '#1E40AF' : '#065F46',
                                fontSize: '12px'
                              }}>
                                {group.epic.state}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEpicClick && onEpicClick(group.epic)
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      View Epic
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '16px',
                    background: '#FEF3C7',
                    borderBottom: '1px solid #FCD34D'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#92400E' }}>
                    📦 Orphaned Issues (No Epic)
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#B45309' }}>
                    {group.issues.length} issues without an assigned epic
                  </p>
                </div>
              )}

              {/* Issues List */}
              {(!group.epic || expandedEpics.has(group.epic.id)) && (
                <div style={{ padding: '8px' }}>
                  {group.issues.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
                      No issues in this epic
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {group.issues.map((issue) => (
                        <div
                          key={`${issue._source}-${issue.id}`}
                          style={{
                            padding: '12px',
                            background: '#F9FAFB',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onClick={() => onIssueClick && onIssueClick(issue)}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#F9FAFB'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                #{issue.iid} - {issue.title}
                              </div>
                              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6B7280' }}>
                                <span>📁 {issue._source || 'Unknown'}</span>
                                <span>📂 {issue._projectPath || issue._projectId}</span>
                                {issue.assignee && <span>👤 {issue.assignee.name || issue.assignee.username}</span>}
                                {issue.state && (
                                  <span style={{
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    background: issue.state === 'opened' ? '#DBEAFE' : '#D1FAE5',
                                    color: issue.state === 'opened' ? '#1E40AF' : '#065F46'
                                  }}>
                                    {issue.state}
                                  </span>
                                )}
                                {issue.labels?.length > 0 && (
                                  <span>🏷️ {issue.labels.slice(0, 3).join(', ')}</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {issue.milestone && (
                                <span style={{
                                  padding: '2px 8px',
                                  background: '#E5E7EB',
                                  borderRadius: '12px',
                                  fontSize: '11px'
                                }}>
                                  {issue.milestone.title}
                                </span>
                              )}
                              {issue.due_date && (
                                <span style={{
                                  padding: '2px 8px',
                                  background: '#FEE2E2',
                                  color: '#DC2626',
                                  borderRadius: '12px',
                                  fontSize: '11px'
                                }}>
                                  Due: {new Date(issue.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}