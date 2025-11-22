import React, { useEffect } from 'react'
import { calculateBacklogHealth, getBacklogHealthTrend, saveHealthHistory } from '../services/backlogHealthService'

/**
 * Backlog Health Card for Executive Dashboard
 * Shows backlog readiness metrics with automatic calculations
 */
export default function BacklogHealthCard({ issues }) {
  const health = calculateBacklogHealth(issues)
  const trend = getBacklogHealthTrend(health)

  // Save health history on mount and when health changes
  useEffect(() => {
    if (health.totalIssues > 0) {
      saveHealthHistory(health)
    }
  }, [health.healthScore])

  // Determine health color
  const getHealthColor = (score) => {
    if (score >= 75) return '#10B981' // Green
    if (score >= 60) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }

  const getHealthStatus = (score) => {
    if (score >= 75) return 'Healthy'
    if (score >= 60) return 'Needs Attention'
    return 'Critical'
  }

  const getMetricColor = (percentage) => {
    if (percentage >= 75) return '#10B981'
    if (percentage >= 60) return '#F59E0B'
    return '#EF4444'
  }

  const healthColor = getHealthColor(health.healthScore)
  const healthStatus = getHealthStatus(health.healthScore)

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
          Backlog Health
        </h3>
        {trend && (
          <span style={{
            fontSize: '13px',
            color: trend.direction === 'improving' ? '#10B981' : trend.direction === 'declining' ? '#EF4444' : '#6B7280',
            fontWeight: '500'
          }}>
            {trend.message}
          </span>
        )}
      </div>

      {/* Overall Health Score */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
        padding: '16px',
        background: '#F9FAFB',
        borderRadius: '8px',
        borderLeft: `4px solid ${healthColor}`
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '36px',
            fontWeight: '700',
            color: healthColor
          }}>
            {health.healthScore}%
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>
            {healthStatus}
          </div>
        </div>
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          textAlign: 'right'
        }}>
          {health.totalIssues} issues in backlog
        </div>
      </div>

      {/* Metric Breakdown */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', color: '#4B5563' }}>
            📝 Refined (Has Weight)
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: getMetricColor(health.refinedPercentage)
          }}>
            {health.refinedPercentage}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: '#E5E7EB',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '12px'
        }}>
          <div style={{
            width: `${health.refinedPercentage}%`,
            height: '100%',
            background: getMetricColor(health.refinedPercentage),
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', color: '#4B5563' }}>
            📋 Has Description
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: getMetricColor(health.hasDescriptionPercentage)
          }}>
            {health.hasDescriptionPercentage}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: '#E5E7EB',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '12px'
        }}>
          <div style={{
            width: `${health.hasDescriptionPercentage}%`,
            height: '100%',
            background: getMetricColor(health.hasDescriptionPercentage),
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', color: '#4B5563' }}>
            ✅ Ready for Sprint
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: getMetricColor(health.readyForSprintPercentage)
          }}>
            {health.readyForSprintPercentage}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: '#E5E7EB',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${health.readyForSprintPercentage}%`,
            height: '100%',
            background: getMetricColor(health.readyForSprintPercentage),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Alert Message */}
      {health.alert && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: health.alert.severity === 'high' ? '#FEE2E2' : '#FEF3C7',
          border: `1px solid ${health.alert.severity === 'high' ? '#DC2626' : '#F59E0B'}`,
          borderRadius: '6px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: health.alert.severity === 'high' ? '#DC2626' : '#D97706',
            marginBottom: '4px'
          }}>
            {health.alert.severity === 'high' ? '⚠️ ' : '⚡ '}{health.alert.message}
          </div>
          <div style={{
            fontSize: '12px',
            color: health.alert.severity === 'high' ? '#991B1B' : '#92400E'
          }}>
            {health.alert.recommendation}
          </div>
        </div>
      )}

      {/* Issue Counts */}
      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#6B7280',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>{health.issues.refined} refined</span>
        <span>{health.issues.hasDescription} with description</span>
        <span>{health.issues.readyForSprint} ready</span>
      </div>
    </div>
  )
}
