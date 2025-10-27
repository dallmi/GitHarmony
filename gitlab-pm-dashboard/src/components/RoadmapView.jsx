import React from 'react'
import { isBlocked, getPriorityFromLabels } from '../utils/labelUtils'
import { formatDateReadable } from '../utils/dateUtils'

export default function RoadmapView({ issues, milestones }) {
  if (milestones.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🗺️</div>
          <h3 className="mb-2">No Milestones</h3>
          <p className="text-muted">Create milestones in GitLab to see the roadmap view.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <h2 className="mb-3">Roadmap</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {milestones.map(milestone => {
          const milestoneIssues = issues.filter(i => i.milestone?.id === milestone.id)
          const completed = milestoneIssues.filter(i => i.state === 'closed').length
          const total = milestoneIssues.length
          const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0
          const blockerCount = milestoneIssues.filter(i => isBlocked(i.labels)).length
          const highPriority = milestoneIssues.filter(i => getPriorityFromLabels(i.labels) === 'High').length
          const atRisk = milestoneIssues.filter(i =>
            i.due_date &&
            Math.floor((new Date(i.due_date) - new Date()) / (1000 * 60 * 60 * 24)) <= 7 &&
            i.state === 'opened'
          ).length
          const overdue = milestoneIssues.filter(i =>
            i.due_date &&
            new Date(i.due_date) < new Date() &&
            i.state === 'opened'
          ).length

          return (
            <div key={milestone.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '8px' }}>{milestone.title}</h3>
                  {milestone.description && (
                    <p className="text-muted mb-2" style={{ fontSize: '14px' }}>{milestone.description}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                    <span className={milestone.state === 'active' ? 'badge badge-success' : 'badge'}>
                      {milestone.state === 'active' ? 'Active' : 'Closed'}
                    </span>
                    {milestone.due_date && (
                      <span className="text-muted">
                        📅 {formatDateReadable(milestone.due_date)}
                      </span>
                    )}
                    {blockerCount > 0 && (
                      <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                        🚫 {blockerCount} Blockers
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
                    {progressPercent}%
                  </div>
                  <div className="text-small text-muted">{completed} / {total}</div>
                </div>
              </div>

              <div className="progress-bar mb-3">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>

              <div className="grid grid-3" style={{ gap: '12px' }}>
                <div className="card" style={{ background: 'var(--bg-secondary)', padding: '12px', textAlign: 'center' }}>
                  <div className="text-small text-muted mb-1">HIGH PRIORITY</div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>{highPriority}</div>
                </div>
                <div className="card" style={{ background: 'var(--bg-secondary)', padding: '12px', textAlign: 'center' }}>
                  <div className="text-small text-muted mb-1">AT RISK</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--warning)' }}>{atRisk}</div>
                </div>
                <div className="card" style={{ background: 'var(--bg-secondary)', padding: '12px', textAlign: 'center' }}>
                  <div className="text-small text-muted mb-1">OVERDUE</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)' }}>{overdue}</div>
                </div>
              </div>

              {blockerCount > 0 && (
                <div style={{
                  marginTop: '16px',
                  background: '#FEE2E2',
                  borderLeft: '4px solid var(--danger)',
                  padding: '16px',
                  borderRadius: '4px'
                }}>
                  <h4 style={{ color: 'var(--danger)', marginBottom: '12px', fontWeight: '600' }}>
                    🚫 Blockers
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {milestoneIssues.filter(i => isBlocked(i.labels)).map(issue => (
                      <div
                        key={issue.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px'
                        }}
                      >
                        <span
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => window.open(issue.web_url, '_blank')}
                        >
                          #{issue.iid} {issue.title}
                        </span>
                        <span className="text-muted">
                          {issue.assignees?.[0]?.name || 'Unassigned'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {issues.filter(i => !i.milestone).length > 0 && (
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <h3 className="mb-2">📋 Backlog</h3>
            <p className="text-muted">
              {issues.filter(i => !i.milestone).length} issues without milestone
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
