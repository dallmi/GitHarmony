import React, { useMemo } from 'react'
import { generateInsights, getInsightStats } from '../services/insightsService'
import DependencyAlertsSection from './DependencyAlertsSection'

/**
 * AI Insights Engine View
 * 100% local analysis - no external API calls
 */
export default function InsightsView({ issues, milestones, epics, stats, healthScore, risks }) {
  const insights = useMemo(() => {
    if (!issues || issues.length === 0) return []

    return generateInsights({
      issues,
      milestones,
      epics,
      stats,
      healthScore,
      risks
    })
  }, [issues, milestones, epics, stats, healthScore, risks])

  const insightStats = getInsightStats(insights)

  const getTypeColor = (type) => {
    switch (type) {
      case 'critical': return '#DC2626'
      case 'warning': return '#D97706'
      case 'info': return '#2563EB'
      case 'success': return '#059669'
      default: return '#6B7280'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      case 'success': return '✅'
      default: return '💡'
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Velocity': return '📈'
      case 'Bottlenecks': return '🔴'
      case 'Resources': return '👥'
      case 'Milestones': return '🎯'
      case 'Epics': return '📦'
      case 'Risks': return '⚠️'
      case 'Forecast': return '🔮'
      case 'Quality': return '✨'
      default: return '💡'
    }
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          AI Insights Engine
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Intelligent pattern detection and recommendations (100% local analysis)
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Insights</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>
            {insightStats.total}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Critical</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#DC2626' }}>
            {insightStats.critical}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #D97706' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Warnings</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#D97706' }}>
            {insightStats.warning}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Success</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#059669' }}>
            {insightStats.success}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="card" style={{ marginBottom: '30px', background: '#EFF6FF', borderColor: '#BFDBFE' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '24px' }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', marginBottom: '4px' }}>
              100% Local Analysis
            </div>
            <div style={{ fontSize: '13px', color: '#1E40AF', lineHeight: '1.5' }}>
              All insights are generated using statistical algorithms in your browser.
              No data is sent to external servers. Completely private and secure.
            </div>
          </div>
        </div>
      </div>

      {/* Dependency Alerts Section */}
      <DependencyAlertsSection issues={issues} />

      {/* Insights List */}
      {insights.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎯</div>
          <h3 className="mb-2">No Insights Available</h3>
          <p className="text-muted">
            The AI engine needs more project data to generate insights.
            <br />
            Add more issues, milestones, and sprint data to see recommendations.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {insights.map((insight, index) => (
            <div
              key={index}
              className="card"
              style={{
                borderLeft: `4px solid ${getTypeColor(insight.type)}`,
                background: insight.type === 'critical' ? '#FEF2F2' :
                           insight.type === 'warning' ? '#FFFBEB' :
                           insight.type === 'success' ? '#F0FDF4' : 'white'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '32px' }}>
                  {getTypeIcon(insight.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: getTypeColor(insight.type) + '20',
                      color: getTypeColor(insight.type),
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      {insight.type}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {getCategoryIcon(insight.category)} {insight.category}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: '#9CA3AF',
                      marginLeft: 'auto'
                    }}>
                      Confidence: {insight.confidence}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                    {insight.title}
                  </h3>

                  <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px', lineHeight: '1.6' }}>
                    {insight.description}
                  </p>

                  {/* Impact */}
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937' }}>Impact: </span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{insight.impact}</span>
                  </div>

                  {/* Recommendation */}
                  <div style={{
                    padding: '12px 16px',
                    background: '#F9FAFB',
                    borderLeft: '3px solid ' + getTypeColor(insight.type),
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                      💡 Recommended Action
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                      {insight.recommendation}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Algorithm Info */}
      {insights.length > 0 && (
        <div className="card" style={{ marginTop: '30px', background: '#F9FAFB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            About the AI Insights Engine
          </h3>
          <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>Algorithms Used:</strong>
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li>Statistical trend analysis for velocity patterns</li>
              <li>Coefficient of variation for consistency metrics</li>
              <li>Time-series analysis for forecasting</li>
              <li>Threshold-based anomaly detection</li>
              <li>Rule-based expert system for recommendations</li>
            </ul>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
              All computations run locally in your browser using JavaScript. No machine learning models or external APIs are used.
              Data never leaves your computer.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
