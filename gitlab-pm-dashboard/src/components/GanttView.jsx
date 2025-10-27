import React, { useMemo } from 'react'
import { isBlocked } from '../utils/labelUtils'

export default function GanttView({ issues }) {
  const issuesWithDates = useMemo(() => {
    return issues.filter(i => i.due_date || i.milestone?.due_date)
  }, [issues])

  const { minDate, maxDate, months } = useMemo(() => {
    if (issuesWithDates.length === 0) return { minDate: null, maxDate: null, months: [] }

    const min = new Date(Math.min(...issuesWithDates.map(i =>
      new Date(i.created_at || i.milestone?.start_date || i.due_date).getTime()
    )))
    const max = new Date(Math.max(...issuesWithDates.map(i =>
      new Date(i.due_date || i.milestone?.due_date).getTime()
    )))

    min.setDate(1)
    max.setMonth(max.getMonth() + 1)

    const monthsList = []
    let current = new Date(min)
    while (current <= max) {
      monthsList.push(new Date(current))
      current.setMonth(current.getMonth() + 1)
    }

    return { minDate: min, maxDate: max, months: monthsList }
  }, [issuesWithDates])

  const getBarPosition = (issue) => {
    const startDate = new Date(issue.created_at)
    const endDate = new Date(issue.due_date || issue.milestone?.due_date)
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24)
    const startDays = (startDate - minDate) / (1000 * 60 * 60 * 24)
    const duration = (endDate - startDate) / (1000 * 60 * 60 * 24)

    return {
      left: `${(startDays / totalDays) * 100}%`,
      width: `${Math.max((duration / totalDays) * 100, 2)}%`
    }
  }

  const getBarColor = (issue) => {
    if (isBlocked(issue.labels)) return 'var(--danger)'
    if (issue.state === 'closed') return 'var(--success)'
    if (issue.due_date && new Date(issue.due_date) < new Date()) return 'var(--danger)'
    return 'var(--info)'
  }

  const getProgress = (issue) => {
    if (issue.state === 'closed') return 100
    const labelNames = issue.labels.map(l => l.toLowerCase())
    if (labelNames.some(l => l.includes('review') || l.includes('testing'))) return 75
    if (labelNames.some(l => l.includes('progress') || l.includes('wip'))) return 50
    if (labelNames.some(l => l.includes('started'))) return 25
    return 0
  }

  if (issuesWithDates.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📅</div>
          <h3 className="mb-2">No Timeline Available</h3>
          <p className="text-muted">Add due dates or milestones to your issues to see the Gantt chart.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-timeline">
      <div className="card" style={{ overflowX: 'auto' }}>
        <h2 className="mb-3">Gantt Chart</h2>

        {/* Timeline Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '250px 1fr',
          borderBottom: '2px solid var(--border-medium)',
          paddingBottom: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Task
          </div>
          <div style={{ display: 'flex' }}>
            {months.map((month, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}
              >
                {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Rows */}
        {issuesWithDates.map(issue => {
          const position = getBarPosition(issue)
          const progress = getProgress(issue)
          const barColor = getBarColor(issue)

          return (
            <div
              key={issue.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '250px 1fr',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-light)'
              }}
            >
              {/* Task Label */}
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>
                  #{issue.iid} {issue.title.substring(0, 30)}{issue.title.length > 30 ? '...' : ''}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {issue.assignees?.[0]?.name || 'Unassigned'}
                  {isBlocked(issue.labels) && (
                    <span style={{ marginLeft: '8px', color: 'var(--danger)', fontWeight: '600' }}>
                      🚫 BLOCKER
                    </span>
                  )}
                </div>
              </div>

              {/* Timeline Bar */}
              <div style={{ position: 'relative', height: '32px' }}>
                <div
                  onClick={() => window.open(issue.web_url, '_blank')}
                  style={{
                    position: 'absolute',
                    left: position.left,
                    width: position.width,
                    height: '100%',
                    background: barColor,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                  title={`${issue.title} - ${progress}% complete`}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {issue.title.substring(0, 20)}
                  </span>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
