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
import { useIterationFilter } from '../contexts/IterationFilterContext'

// Issue card component for the board columns
function IssueCard({ issue, isDone = false }) {
  return (
    <div
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
        marginBottom: '4px',
        textDecoration: isDone ? 'line-through' : 'none',
        color: isDone ? 'var(--text-secondary)' : 'inherit'
      }}>
        #{issue.iid} {issue.title}
      </div>
      <div className="text-small text-muted" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{issue.assignees?.[0]?.name || 'Unassigned'}</span>
        {issue.weight && <span style={{ fontWeight: '600' }}>{issue.weight} pts</span>}
      </div>
    </div>
  )
}

export default function SprintBoardView({ issues: allIssues }) {
  const [expandedSprint, setExpandedSprint] = useState(null)

  // Use iteration filter context
  const { filteredIssues, selectedIterations } = useIterationFilter()

  // Use filtered issues if iterations are selected, otherwise use all issues
  const issues = selectedIterations.length > 0 ? filteredIssues : allIssues

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

  // Get the workflow status of an issue based on labels
  const getWorkflowStatus = (issue) => {
    // Closed issues are always "done"
    if (issue.state === 'closed') return 'done'

    // Check for specific status labels (case-insensitive exact match)
    // Labels can be strings OR objects with a 'name' property
    const labelNames = (issue.labels || []).map(l => {
      const labelText = typeof l === 'string' ? l : (l.name || l.title || '')
      return labelText.toLowerCase().trim()
    })

    // Cancelled and Awaiting Release go to Done column
    if (labelNames.includes('status::cancelled') || labelNames.includes('cancelled')) return 'done'
    if (labelNames.includes('status::awaiting release') || labelNames.includes('awaiting release')) return 'done'

    // In Testing
    if (labelNames.includes('status::in testing') || labelNames.includes('in testing')) return 'testing'

    // In Progress
    if (labelNames.includes('status::in progress') || labelNames.includes('in progress')) return 'inprogress'

    // Everything else (including no status label) goes to Backlog
    // This includes: In Discovery, In Analysis, Awaiting Refinement,
    // Ready for Work, Done (but open), Awaiting Release, Released, or no label
    return 'backlog'
  }

  if (sprints.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
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
            backlog: sprintIssues.filter(i => getWorkflowStatus(i) === 'backlog'),
            inprogress: sprintIssues.filter(i => getWorkflowStatus(i) === 'inprogress'),
            testing: sprintIssues.filter(i => getWorkflowStatus(i) === 'testing'),
            done: sprintIssues.filter(i => getWorkflowStatus(i) === 'done')
          }

          // Calculate story points for each column
          const storyPoints = {
            backlog: grouped.backlog.reduce((sum, issue) => sum + (issue.weight || 0), 0),
            inprogress: grouped.inprogress.reduce((sum, issue) => sum + (issue.weight || 0), 0),
            testing: grouped.testing.reduce((sum, issue) => sum + (issue.weight || 0), 0),
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
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
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
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>
                      {expandedSprint === sprint ? '▾' : '▸'}
                    </span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: hasIssues ? '#92400E' : '#1E40AF' }}>
                        {hasIssues ? 'Team Capacity Issues' : 'Team Capacity'}
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
                                <div style={{ fontSize: '16px', fontWeight: '600', color: getStatusColor(member.status) }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {/* Backlog Column */}
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      📋 Backlog ({grouped.backlog.length})
                    </h4>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {storyPoints.backlog} story points
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {grouped.backlog.map(issue => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                    {grouped.backlog.length === 0 && (
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
                      🔄 In Progress ({grouped.inprogress.length})
                    </h4>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {storyPoints.inprogress} story points
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {grouped.inprogress.map(issue => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                    {grouped.inprogress.length === 0 && (
                      <div className="text-center text-muted" style={{ padding: '20px' }}>
                        No items
                      </div>
                    )}
                  </div>
                </div>

                {/* Testing Column */}
                <div style={{ background: '#FEF3C7', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      🧪 Testing ({grouped.testing.length})
                    </h4>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {storyPoints.testing} story points
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {grouped.testing.map(issue => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                    {grouped.testing.length === 0 && (
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
                      <IssueCard key={issue.id} issue={issue} isDone />
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
