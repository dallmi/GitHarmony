import React, { useMemo } from 'react'
import { generateInsights, getInsightStats } from '../services/insightsService'
import DependencyAlertsSection from './DependencyAlertsSection'

/**
 * Insights View
 * Local analysis - no external API calls
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

  const getTypeLabel = (type) => {
    switch (type) {
      case 'critical': return 'CRITICAL'
      case 'warning': return 'WARNING'
      case 'info': return 'INFO'
      case 'success': return 'SUCCESS'
      default: return 'INSIGHT'
    }
  }

  const getCategoryLabel = (category) => {
    // Return category as-is, no icons
    return category
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Insights
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Intelligent pattern detection and recommendations
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

      {/* Dependency Alerts Section */}
      <DependencyAlertsSection issues={issues} />

      {/* Insights List */}
      {insights.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
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
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: getTypeColor(insight.type),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {getTypeLabel(insight.type)}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {getCategoryLabel(insight.category)}
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

    </div>
  )
}
