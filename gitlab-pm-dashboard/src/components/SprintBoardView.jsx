import React, { useMemo, useState } from 'react'
import { getSprintFromLabels } from '../utils/labelUtils'
import {
  calculateWorkingDays,
  calculateTeamWorkload,
  generateRecommendations,
  getStatusColor,
  getStatusLabel,
  formatRecommendation
} from '../utils/capacityUtils'

export default function SprintBoardView({ issues }) {
  const [expandedSprint, setExpandedSprint] = useState(null)
  const sprints = useMemo(() => {
    // Build map of iteration name to start date for sorting
    const iterationDates = new Map()
    issues.forEach(issue => {
      // Use the SAME function to get the sprint name that will be used for display
      const sprintName = getSprintFromLabels(issue.labels, issue.iteration)
      if (sprintName && !iterationDates.has(sprintName)) {
        const startDate = issue.iteration?.start_date || null
        iterationDates.set(sprintName, startDate)
      }
    })

    const sprintSet = new Set(
      issues.map(i => getSprintFromLabels(i.labels, i.iteration))
    )

    // Sort by start date if available, otherwise alphabetically
    return Array.from(sprintSet).filter(Boolean).sort((a, b) => {
      const dateA = iterationDates.get(a)
      const dateB = iterationDates.get(b)

      if (dateA && dateB) {
        return new Date(dateB) - new Date(dateA) // Newest first (descending)
      }

      // If one has a date and the other doesn't, prioritize the one with a date
      if (dateA && !dateB) return -1
      if (!dateA && dateB) return 1

      // Fallback to alphabetical sort
      return a.localeCompare(b)
    })
  }, [issues])

  const getProgress = (issue) => {
    if (issue.state === 'closed') return 100
    const labelNames = issue.labels.map(l => l.toLowerCase())
    if (labelNames.some(l => l.includes('review') || l.includes('testing'))) return 75
    if (labelNames.some(l => l.includes('progress') || l.includes('wip'))) return 50
    if (labelNames.some(l => l.includes('started'))) return 25
    return 0
  }

  if (sprints.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
          <h3 className="mb-2">No Sprints/Iterations Found</h3>
          <p className="text-muted">
            Add iterations to your issues in GitLab, or add "Sprint X" / "Iteration X" labels to see the sprint board.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <h2 className="mb-3">Sprint Board</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {sprints.map(sprint => {
          const sprintIssues = issues.filter(i => getSprintFromLabels(i.labels, i.iteration) === sprint)
          const completed = sprintIssues.filter(i => i.state === 'closed').length
          const total = sprintIssues.length
          const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

          // Get iteration dates for display
          const firstIssueWithIteration = sprintIssues.find(i => i.iteration)
          const iterationData = firstIssueWithIteration?.iteration
          const startDate = iterationData?.start_date
          const dueDate = iterationData?.due_date

          const grouped = {
            todo: sprintIssues.filter(i => i.state === 'opened' && getProgress(i) === 0),
            progress: sprintIssues.filter(i => i.state === 'opened' && getProgress(i) > 0 && getProgress(i) < 100),
            done: sprintIssues.filter(i => i.state === 'closed')
          }

          // Calculate story points for each column
          const storyPoints = {
            todo: grouped.todo.reduce((sum, issue) => sum + (issue.weight || 0), 0),
            progress: grouped.progress.reduce((sum, issue) => sum + (issue.weight || 0), 0),
            done: grouped.done.reduce((sum, issue) => sum + (issue.weight || 0), 0)
          }

          // Calculate team capacity and recommendations
          const workingDays = calculateWorkingDays(startDate, dueDate)
          const teamWorkload = calculateTeamWorkload(sprintIssues, workingDays)
          const recommendations = generateRecommendations(teamWorkload)
          const hasIssues = recommendations.filter(r => r.priority === 'high').length > 0

          return (
            <div key={sprint} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ marginBottom: '4px' }}>{sprint}</h3>
                  {(startDate || dueDate) && (
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>
                      {startDate && new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {startDate && dueDate && ' - '}
                      {dueDate && new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>
                    {progressPercent}%
                  </div>
                  <div className="text-small text-muted">{completed} / {total}</div>
                </div>
              </div>

              <div className="progress-bar mb-3">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>

              {/* Team Capacity Section */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: hasIssues ? '#FEF3C7' : '#EFF6FF',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '12px'
                  }}
                  onClick={() => setExpandedSprint(expandedSprint === sprint ? null : sprint)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {expandedSprint === sprint ? '▼' : '▶'}
                    </span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: hasIssues ? '#92400E' : '#1E40AF' }}>
                        {hasIssues ? '⚠️ Team Capacity Issues' : '✓ Team Capacity'}
                      </div>
                      <div style={{ fontSize: '12px', color: hasIssues ? '#78350F' : '#1E40AF' }}>
                        {teamWorkload.length} team members, {workingDays} working days
                        {recommendations.length > 0 && ` • ${recommendations.length} recommendation${recommendations.length > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: hasIssues ? '#92400E' : '#1E40AF' }}>
                    Click to {expandedSprint === sprint ? 'hide' : 'show'} details
                  </div>
                </div>

                {expandedSprint === sprint && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                    {/* Team Member Cards */}
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Team Workload</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                        {teamWorkload.map(member => (
                          <div
                            key={member.username || member.name}
                            style={{
                              padding: '12px',
                              background: 'white',
                              borderRadius: '6px',
                              borderLeft: `4px solid ${getStatusColor(member.status)}`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                                  {member.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                  {getStatusLabel(member.status)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: getStatusColor(member.status) }}>
                                  {member.utilizationPercent}%
                                </div>
                                <div style={{ fontSize: '10px', color: '#6B7280' }}>
                                  {member.totalWeight.toFixed(1)}d / {member.capacity}d
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                              {member.issues.length} issue{member.issues.length !== 1 ? 's' : ''}
                            </div>
                            {/* Capacity bar */}
                            <div style={{
                              width: '100%',
                              height: '6px',
                              background: '#E5E7EB',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              marginTop: '8px'
                            }}>
                              <div
                                style={{
                                  width: `${Math.min(member.utilizationPercent, 100)}%`,
                                  height: '100%',
                                  background: getStatusColor(member.status),
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                          Smart Recommendations
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {recommendations.map((rec, idx) => {
                            const formatted = formatRecommendation(rec)
                            const bgColor = rec.priority === 'high' ? '#FEF3C7' : rec.priority === 'medium' ? '#DBEAFE' : '#F3F4F6'
                            const textColor = rec.priority === 'high' ? '#78350F' : rec.priority === 'medium' ? '#1E40AF' : '#374151'

                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '12px',
                                  background: bgColor,
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: textColor
                                }}
                              >
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <span style={{ fontSize: '16px' }}>{formatted.icon}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                      {rec.type === 'rebalance' && `Move ${rec.weight.toFixed(1)} days from ${rec.from} to ${rec.to}`}
                                      {rec.type === 'assign' && `Assign to ${rec.to}`}
                                      {rec.type === 'warning' && 'Capacity Warning'}
                                      {rec.type === 'info' && 'Available Capacity'}
                                    </div>
                                    <div>{rec.reason}</div>
                                    {rec.issues && rec.issues.length > 0 && (
                                      <div style={{ marginTop: '6px', fontSize: '11px' }}>
                                        Issues: {rec.issues.map(i => `#${i.iid}`).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-3" style={{ gap: '16px' }}>
                {/* To Do Column */}
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      📋 To Do ({grouped.todo.length})
                    </h4>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {storyPoints.todo} story points
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {grouped.todo.map(issue => (
                      <div
                        key={issue.id}
                        className="card"
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => window.open(issue.web_url, '_blank')}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                          #{issue.iid} {issue.title}
                        </div>
                        <div className="text-small text-muted" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{issue.assignees?.[0]?.name || 'Unassigned'}</span>
                          {issue.weight && <span style={{ fontWeight: '600' }}>{issue.weight} pts</span>}
                        </div>
                      </div>
                    ))}
                    {grouped.todo.length === 0 && (
                      <div className="text-center text-muted" style={{ padding: '20px' }}>
                        No items
                      </div>
                    )}
                  </div>
                </div>

                {/* In Progress Column */}
                <div style={{ background: '#DBEAFE', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      🔄 In Progress ({grouped.progress.length})
                    </h4>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {storyPoints.progress} story points
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {grouped.progress.map(issue => (
                      <div
                        key={issue.id}
                        className="card"
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => window.open(issue.web_url, '_blank')}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                          #{issue.iid} {issue.title}
                        </div>
                        <div className="text-small text-muted" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{issue.assignees?.[0]?.name || 'Unassigned'}</span>
                          {issue.weight && <span style={{ fontWeight: '600' }}>{issue.weight} pts</span>}
                        </div>
                      </div>
                    ))}
                    {grouped.progress.length === 0 && (
                      <div className="text-center text-muted" style={{ padding: '20px' }}>
                        No items
                      </div>
                    )}
                  </div>
                </div>

                {/* Done Column */}
                <div style={{ background: '#D1FAE5', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      ✅ Done ({grouped.done.length})
                    </h4>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {storyPoints.done} story points
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {grouped.done.map(issue => (
                      <div
                        key={issue.id}
                        className="card"
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => window.open(issue.web_url, '_blank')}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                      >
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          textDecoration: 'line-through',
                          color: 'var(--text-secondary)',
                          marginBottom: '4px'
                        }}>
                          #{issue.iid} {issue.title}
                        </div>
                        <div className="text-small text-muted" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{issue.assignees?.[0]?.name || 'Unassigned'}</span>
                          {issue.weight && <span style={{ fontWeight: '600' }}>{issue.weight} pts</span>}
                        </div>
                      </div>
                    ))}
                    {grouped.done.length === 0 && (
                      <div className="text-center text-muted" style={{ padding: '20px' }}>
                        No items
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
