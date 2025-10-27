import React from 'react'
import MetricCard from './MetricCard'
import HealthCircle from './HealthCircle'

export default function ExecutiveDashboard({ stats, healthScore }) {
  if (!stats || !healthScore) {
    return (
      <div className="container">
        <div className="card text-center">
          <p>No data available. Please configure and load GitLab data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Health Score Section */}
      <div className="card mb-3">
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '40px', alignItems: 'center' }}>
          <div className="text-center">
            <HealthCircle score={healthScore.score} status={healthScore.status} />
            <div className="metric-label" style={{ marginTop: '12px' }}>
              PROJECT HEALTH
            </div>
          </div>

          <div>
            <h3 className="mb-2">Health Breakdown</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <HealthBreakdownBar
                label="Completion"
                score={healthScore.breakdown.completionScore}
                weight="30%"
              />
              <HealthBreakdownBar
                label="Schedule"
                score={healthScore.breakdown.scheduleScore}
                weight="25%"
              />
              <HealthBreakdownBar
                label="Blockers"
                score={healthScore.breakdown.blockerScore}
                weight="25%"
              />
              <HealthBreakdownBar
                label="Risk"
                score={healthScore.breakdown.riskScore}
                weight="20%"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-4 mb-3">
        <MetricCard
          label="TOTAL ISSUES"
          value={stats.total}
        />
        <MetricCard
          label="COMPLETION RATE"
          value={`${stats.completionRate}%`}
          color="var(--success)"
        />
        <MetricCard
          label="OPEN ISSUES"
          value={stats.open}
          color="var(--info)"
        />
        <MetricCard
          label="CLOSED ISSUES"
          value={stats.closed}
          color="var(--success)"
        />
      </div>

      {/* Warning Indicators */}
      <div className="grid grid-3">
        <MetricCard
          label="BLOCKERS"
          value={stats.blockers}
          color={stats.blockers > 0 ? 'var(--danger)' : 'var(--text-primary)'}
          subtitle={stats.blockers > 0 ? 'Needs attention' : 'No blockers'}
        />
        <MetricCard
          label="OVERDUE"
          value={stats.overdue}
          color={stats.overdue > 0 ? 'var(--danger)' : 'var(--text-primary)'}
          subtitle={stats.overdue > 0 ? 'Past due date' : 'On schedule'}
        />
        <MetricCard
          label="AT RISK"
          value={stats.atRisk}
          color={stats.atRisk > 0 ? 'var(--warning)' : 'var(--text-primary)'}
          subtitle={stats.atRisk > 0 ? 'Due within 7 days' : 'Looking good'}
        />
      </div>
    </div>
  )
}

function HealthBreakdownBar({ label, score, weight }) {
  const color = score >= 80 ? 'var(--success)' :
                score >= 60 ? 'var(--warning)' :
                'var(--danger)'

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
        fontSize: '13px'
      }}>
        <span style={{ fontWeight: '500' }}>
          {label} <span style={{ color: 'var(--text-secondary)' }}>({weight})</span>
        </span>
        <span style={{ fontWeight: '600', color }}>{Math.round(score)}</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  )
}
