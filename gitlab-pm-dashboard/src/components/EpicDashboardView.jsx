import React, { useMemo } from 'react'

/**
 * Epic Dashboard View
 * Shows epic hierarchy, progress, and health aggregation
 * Requires GitLab Premium/Ultimate for epic support
 */
export default function EpicDashboardView({ epics, issues }) {
  // Calculate epic statistics and health scores
  const epicStats = useMemo(() => {
    if (!epics || epics.length === 0) {
      return []
    }

    return epics.map((epic) => {
      const epicIssues = epic.issues || []
      const totalIssues = epicIssues.length
      const openIssues = epicIssues.filter((i) => i.state === 'opened').length
      const closedIssues = epicIssues.filter((i) => i.state === 'closed').length
      const completionRate = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0

      // Calculate epic health score
      const health = calculateEpicHealth({
        completionRate,
        openIssues,
        totalIssues,
        startDate: epic.start_date,
        dueDate: epic.end_date
      })

      return {
        ...epic,
        totalIssues,
        openIssues,
        closedIssues,
        completionRate,
        health
      }
    }).sort((a, b) => {
      // Sort by state (open first) then by health score
      if (a.state !== b.state) {
        return a.state === 'opened' ? -1 : 1
      }
      return b.health.score - a.health.score
    })
  }, [epics])

  // Calculate overall epic portfolio health
  const portfolioHealth = useMemo(() => {
    if (epicStats.length === 0) return null

    const openEpics = epicStats.filter((e) => e.state === 'opened')
    const totalIssues = epicStats.reduce((sum, e) => sum + e.totalIssues, 0)
    const closedIssues = epicStats.reduce((sum, e) => sum + e.closedIssues, 0)
    const avgCompletion = Math.round(
      epicStats.reduce((sum, e) => sum + e.completionRate, 0) / epicStats.length
    )
    const avgHealth = Math.round(
      epicStats.reduce((sum, e) => sum + e.health.score, 0) / epicStats.length
    )

    return {
      totalEpics: epicStats.length,
      openEpics: openEpics.length,
      totalIssues,
      closedIssues,
      avgCompletion,
      avgHealth
    }
  }, [epicStats])

  if (!epics || epics.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📦</div>
          <h3 className="mb-2">No Epics Found</h3>
          <p className="text-muted">
            Epic support requires GitLab Premium or Ultimate.
            <br />
            Configure your Group Path in settings to enable epic tracking.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Portfolio Summary Cards */}
      {portfolioHealth && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Epics</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>
              {portfolioHealth.totalEpics}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {portfolioHealth.openEpics} in progress
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Issues</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>
              {portfolioHealth.totalIssues}
            </div>
            <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
              {portfolioHealth.closedIssues} completed
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Avg. Completion</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#2563EB' }}>
              {portfolioHealth.avgCompletion}%
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Portfolio Health</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: getHealthColor(portfolioHealth.avgHealth) }}>
              {portfolioHealth.avgHealth}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {getHealthLabel(portfolioHealth.avgHealth)}
            </div>
          </div>
        </div>
      )}

      {/* Epic Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {epicStats.map((epic) => (
          <div
            key={epic.id}
            className="card"
            style={{
              borderLeft: `4px solid ${getHealthColor(epic.health.score)}`,
              opacity: epic.state === 'closed' ? 0.7 : 1
            }}
          >
            {/* Epic Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
                    {epic.title}
                  </h3>
                  <span
                    style={{
                      padding: '4px 8px',
                      background: epic.state === 'opened' ? '#DBEAFE' : '#D1FAE5',
                      color: epic.state === 'opened' ? '#1E40AF' : '#065F46',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}
                  >
                    {epic.state}
                  </span>
                </div>

                {epic.description && (
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: '8px 0', lineHeight: '1.5' }}>
                    {epic.description.substring(0, 200)}
                    {epic.description.length > 200 && '...'}
                  </p>
                )}

                {/* Dates */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                  {epic.start_date && (
                    <div>
                      <strong>Start:</strong> {new Date(epic.start_date).toLocaleDateString()}
                    </div>
                  )}
                  {epic.end_date && (
                    <div>
                      <strong>Due:</strong> {new Date(epic.end_date).toLocaleDateString()}
                    </div>
                  )}
                  {epic.web_url && (
                    <div>
                      <a href={epic.web_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB' }}>
                        View in GitLab →
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Health Score Badge */}
              <div
                style={{
                  minWidth: '100px',
                  textAlign: 'center',
                  padding: '12px',
                  background: getHealthColor(epic.health.score) + '20',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Health</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: getHealthColor(epic.health.score) }}>
                  {epic.health.score}
                </div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
                  {epic.health.label}
                </div>
              </div>
            </div>

            {/* Epic Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Issues</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937' }}>
                  {epic.totalIssues}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Open Issues</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#DC2626' }}>
                  {epic.openIssues}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Closed Issues</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#059669' }}>
                  {epic.closedIssues}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Completion</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#2563EB' }}>
                  {epic.completionRate}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                Progress: {epic.closedIssues} / {epic.totalIssues} issues completed
              </div>
              <div
                style={{
                  width: '100%',
                  height: '12px',
                  background: '#E5E7EB',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${epic.completionRate}%`,
                    height: '100%',
                    background: getHealthColor(epic.health.score),
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Health Issues */}
            {epic.health.issues.length > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#FEF3C7',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '6px' }}>
                  ⚠️ Health Issues:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350F' }}>
                  {epic.health.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Calculate epic health score based on multiple factors
 */
function calculateEpicHealth({ completionRate, openIssues, totalIssues, startDate, dueDate }) {
  let score = 100
  const issues = []

  // Factor 1: Completion Rate (40% weight)
  if (completionRate < 30) {
    score -= 30
    issues.push('Low completion rate (<30%)')
  } else if (completionRate < 50) {
    score -= 20
    issues.push('Below average completion rate')
  } else if (completionRate < 70) {
    score -= 10
  }

  // Factor 2: Open Issues (30% weight)
  if (totalIssues > 0) {
    const openRatio = openIssues / totalIssues
    if (openRatio > 0.8) {
      score -= 25
      issues.push('Most issues still open (>80%)')
    } else if (openRatio > 0.6) {
      score -= 15
    }
  }

  // Factor 3: Schedule Health (30% weight)
  if (dueDate) {
    const today = new Date()
    const due = new Date(dueDate)
    const start = startDate ? new Date(startDate) : null

    if (due < today && openIssues > 0) {
      score -= 30
      issues.push('Overdue with open issues')
    } else if (start && due) {
      const totalDuration = due - start
      const elapsed = today - start
      const progress = elapsed / totalDuration

      // Check if completion rate aligns with time progress
      if (progress > 0.8 && completionRate < 60) {
        score -= 20
        issues.push('Behind schedule (80% time, <60% complete)')
      } else if (progress > 0.5 && completionRate < 40) {
        score -= 15
        issues.push('Behind schedule (50% time, <40% complete)')
      }
    }
  }

  score = Math.max(0, Math.min(100, score))

  return {
    score: Math.round(score),
    label: getHealthLabel(score),
    issues
  }
}

/**
 * Get health color based on score
 */
function getHealthColor(score) {
  if (score >= 80) return '#059669' // Green
  if (score >= 60) return '#D97706' // Orange
  return '#DC2626' // Red
}

/**
 * Get health label based on score
 */
function getHealthLabel(score) {
  if (score >= 80) return 'Healthy'
  if (score >= 60) return 'At Risk'
  return 'Critical'
}
