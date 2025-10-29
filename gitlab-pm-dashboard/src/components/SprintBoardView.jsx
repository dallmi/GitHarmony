import React, { useMemo } from 'react'
import { getSprintFromLabels } from '../utils/labelUtils'

export default function SprintBoardView({ issues }) {
  const sprints = useMemo(() => {
    // Build map of iteration name to start date for sorting
    const iterationDates = new Map()
    issues.forEach(issue => {
      if (issue.iteration) {
        const title = typeof issue.iteration === 'object' ? issue.iteration.title : issue.iteration
        const startDate = issue.iteration?.start_date || null
        if (title && !iterationDates.has(title)) {
          iterationDates.set(title, startDate)
        }
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
        return new Date(dateB) - new Date(dateA) // Newest first
      }

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

              <div className="grid grid-3" style={{ gap: '16px' }}>
                {/* To Do Column */}
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                    📋 To Do ({grouped.todo.length})
                  </h4>
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
                        <div className="text-small text-muted">
                          {issue.assignees?.[0]?.name || 'Unassigned'}
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
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                    🔄 In Progress ({grouped.progress.length})
                  </h4>
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
                        <div className="text-small text-muted">
                          {issue.assignees?.[0]?.name || 'Unassigned'}
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
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                    ✅ Done ({grouped.done.length})
                  </h4>
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
                          color: 'var(--text-secondary)'
                        }}>
                          #{issue.iid} {issue.title}
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
