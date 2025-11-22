import React, { useMemo } from 'react'
import { calculateCommunicationsMetrics, getCommunicationsHealthScore } from '../services/communicationsMetricsService'

/**
 * Communications Dashboard
 * Displays metrics specific to Internal Communications teams
 */
export default function CommunicationsDashboard({ issues }) {
  const metrics = useMemo(() => {
    return calculateCommunicationsMetrics(issues)
  }, [issues])

  const healthScore = useMemo(() => {
    return getCommunicationsHealthScore(metrics)
  }, [metrics])

  if (!metrics) {
    return (
      <div className="container">
        <div className="card text-center">
          <p>No communications data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Communications Dashboard
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Track reach, engagement, stakeholder satisfaction, and campaign performance
        </p>
      </div>

      {/* Health Score */}
      <div className="card" style={{ marginBottom: '30px', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Communications Health Score
          </div>
        </div>
        <div
          className={`health-circle ${
            healthScore.status === 'green' ? 'health-good' :
            healthScore.status === 'amber' ? 'health-warning' :
            'health-danger'
          }`}
        >
          {healthScore.score}
        </div>
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Based on approval rate, stakeholder satisfaction, compliance, and campaign success
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-4" style={{ marginBottom: '30px' }}>
        <div className="card metric-card">
          <div className="metric-label">Total Communications</div>
          <div className="metric-value">{metrics.totalCommunications}</div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">Active</div>
          <div className="metric-value" style={{ color: 'var(--info)' }}>
            {metrics.activeCommunications}
          </div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">Total Reach</div>
          <div className="metric-value">{metrics.reach.totalReach.toLocaleString()}</div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">Average Reach</div>
          <div className="metric-value">{metrics.reach.averageReach.toLocaleString()}</div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Engagement Metrics</h3>
        <div className="grid grid-4">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary)' }}>
              {metrics.engagement.totalComments}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Total Comments
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary)' }}>
              {metrics.engagement.averageComments}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Avg Comments/Issue
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary)' }}>
              {metrics.engagement.totalUpvotes}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Total Upvotes
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary)' }}>
              {metrics.engagement.averageEngagement}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Engagement Rate
            </div>
          </div>
        </div>
      </div>

      {/* Stakeholder Metrics */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Stakeholder Metrics</h3>
        <div className="grid grid-2">
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Approval Rate</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)' }}>
                  {metrics.stakeholder.approvalRate}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${metrics.stakeholder.approvalRate}%`,
                    background: 'var(--success)'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Satisfaction Rate</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--info)' }}>
                  {metrics.stakeholder.satisfactionRate}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${metrics.stakeholder.satisfactionRate}%`,
                    background: 'var(--info)'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>
                {metrics.stakeholder.positiveCount}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Positive Feedback
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)' }}>
                {metrics.stakeholder.negativeCount}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Negative Feedback
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--warning)' }}>
                {metrics.stakeholder.awaitingApproval}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Awaiting Approval
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Quality */}
      <div className="grid grid-2" style={{ marginBottom: '30px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Content Pipeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>Draft</span>
              <span className="badge badge-info">{metrics.content.draft}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>In Review</span>
              <span className="badge badge-warning">{metrics.content.inReview}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>Published</span>
              <span className="badge badge-success">{metrics.content.published}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Compliance Rate</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{metrics.content.complianceRate}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${metrics.content.complianceRate}%` }} />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Average Revisions: <strong>{metrics.content.averageRevisions}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Campaign Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>Total Campaigns</span>
              <span style={{ fontSize: '20px', fontWeight: '700' }}>{metrics.campaigns.total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>Active</span>
              <span className="badge badge-info">{metrics.campaigns.active}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>Completed</span>
              <span className="badge badge-success">{metrics.campaigns.completed}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Success Rate</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)' }}>
                {metrics.campaigns.successRate}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${metrics.campaigns.successRate}%`,
                  background: 'var(--success)'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reach by Channel */}
      {Object.keys(metrics.reach.byChannel).length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Reach by Channel</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {Object.entries(metrics.reach.byChannel).map(([channel, count]) => (
              <div
                key={channel}
                style={{
                  flex: '1 1 200px',
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>
                  {count}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'capitalize' }}>
                  {channel}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
