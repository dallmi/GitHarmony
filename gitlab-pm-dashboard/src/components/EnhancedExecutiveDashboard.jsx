import React, { useMemo, useState } from 'react'
import { getInitiatives, getStatusBadge, formatDate } from '../services/initiativeService'
import { getUpcomingMilestones, getMilestoneStatusBadge } from '../services/milestoneTimelineService'
import { calculateCommunicationsMetrics } from '../services/communicationsMetricsService'
import { exportExecutiveSummaryToCSV, downloadCSV } from '../utils/csvExportUtils'
import { useIterationFilter } from '../contexts/IterationFilterContext'
import IterationFilterDropdown from './IterationFilterDropdown'
import HealthScoreConfigModal from './HealthScoreConfigModal'

/**
 * Enhanced Executive Dashboard
 * Card-based layout inspired by corporate dashboards
 * Shows initiatives, KPIs, risks, and upcoming milestones
 * Now includes iteration filter and configurable health score
 */
export default function EnhancedExecutiveDashboard({ stats, healthScore, issues: allIssues, milestones, epics, risks }) {
  const [showHealthConfig, setShowHealthConfig] = useState(false)
  const [configKey, setConfigKey] = useState(0) // Force re-render on config change

  // Use filtered issues from iteration context
  const { filteredIssues: issues } = useIterationFilter()
  // Get initiatives from epics
  const initiatives = useMemo(() => {
    if (!epics || !issues) return []
    return getInitiatives(epics, issues)
  }, [epics, issues])

  // Get upcoming milestones (next 30 days)
  const upcomingMilestones = useMemo(() => {
    if (!milestones) return []
    return getUpcomingMilestones(milestones, 30)
  }, [milestones])

  // Get communications metrics for KPIs
  const commsMetrics = useMemo(() => {
    return calculateCommunicationsMetrics(issues)
  }, [issues])

  // Get top 3 high-priority risks
  const topRisks = useMemo(() => {
    if (!risks) return []
    return risks
      .filter(r => r.impact === 'high' || (r.impact === 'medium' && r.probability === 'high'))
      .slice(0, 3)
  }, [risks])

  const handleExportCSV = () => {
    const exportData = {
      initiatives,
      healthScore,
      upcomingMilestones,
      topRisks,
      stats
    }
    const csvContent = exportExecutiveSummaryToCSV(exportData)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csvContent, `executive-summary-${date}.csv`)
  }

  const handleConfigSave = (newConfig) => {
    setConfigKey(prev => prev + 1) // Force re-render
    window.location.reload() // Reload to apply new health score calculation
  }

  return (
    <div className="container">
      {/* Iteration Filter */}
      <div style={{ marginBottom: '20px' }}>
        <IterationFilterDropdown />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Executive Overview
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Comprehensive view of all initiatives and key performance indicators
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn"
            onClick={() => setShowHealthConfig(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-secondary)'
            }}
            title="Configure health score calculation"
          >
            <span>⚙️</span>
            <span>Health Score Settings</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Export Summary CSV</span>
          </button>
        </div>
      </div>

      {/* Health Score Config Modal */}
      <HealthScoreConfigModal
        isOpen={showHealthConfig}
        onClose={() => setShowHealthConfig(false)}
        onSave={handleConfigSave}
      />

      {/* Top KPIs */}
      <div className="grid grid-4" style={{ marginBottom: '30px' }}>
        <div className="card metric-card">
          <div className="metric-label">Active Initiatives</div>
          <div className="metric-value" style={{ color: 'var(--info)' }}>
            {initiatives.filter(i => i.openIssues > 0).length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {initiatives.filter(i => i.status === 'on-track').length} on track, {initiatives.filter(i => i.status === 'at-risk').length} at risk
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">Health Score</div>
          <div className="metric-value" style={{
            color: healthScore?.status === 'green' ? 'var(--success)' :
                   healthScore?.status === 'amber' ? 'var(--warning)' : 'var(--danger)'
          }}>
            {healthScore?.score || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Overall project health
          </div>
        </div>

        {commsMetrics && (
          <>
            <div className="card metric-card">
              <div className="metric-label">Reach Rate</div>
              <div className="metric-value" style={{ color: 'var(--primary)' }}>
                {commsMetrics.reach?.averageReach?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Average audience per initiative
              </div>
            </div>

            <div className="card metric-card">
              <div className="metric-label">Stakeholder Satisfaction</div>
              <div className="metric-value" style={{ color: 'var(--success)' }}>
                {commsMetrics.stakeholder?.satisfactionRate || 0}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Based on feedback received
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-2" style={{ gap: '30px', marginBottom: '30px' }}>
        {/* Active Initiatives */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            Active Initiatives
          </h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Current status of ongoing strategic projects
          </div>

          {initiatives.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                No initiatives found
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Tag epics with "initiative::name" labels to group them into initiatives
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {initiatives.slice(0, 4).map(initiative => {
                const badge = getStatusBadge(initiative.status)

                return (
                  <div
                    key={initiative.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {initiative.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {initiative.epics.length} epic{initiative.epics.length !== 1 ? 's' : ''} · {initiative.totalIssues} issue{initiative.totalIssues !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: badge.color,
                          background: badge.background,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Progress</span>
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>{initiative.progress}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: '6px' }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${initiative.progress}%`,
                            background: initiative.status === 'on-track' ? 'var(--success)' :
                                       initiative.status === 'at-risk' ? 'var(--warning)' : 'var(--danger)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    {initiative.dueDate && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        Due: {formatDate(initiative.dueDate)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Risk Management Panel */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            Risk Management
          </h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Identified risks requiring attention
          </div>

          {topRisks.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                No high-priority risks identified
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topRisks.map(risk => {
                const impactColor = risk.impact === 'high' ? 'var(--danger)' :
                                   risk.impact === 'medium' ? 'var(--warning)' : 'var(--info)'

                return (
                  <div
                    key={risk.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${impactColor}`
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                      {risk.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.5' }}>
                      {risk.description}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        Impact: <strong style={{ color: impactColor, textTransform: 'capitalize' }}>{risk.impact}</strong>
                      </span>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        Probability: <strong style={{ textTransform: 'capitalize' }}>{risk.probability}</strong>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Milestones */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
          Upcoming Milestones
        </h3>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Key deliverables and deadlines in the next 30 days
        </div>

        {upcomingMilestones.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              No upcoming milestones in the next 30 days
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingMilestones.map(milestone => {
              const badge = getMilestoneStatusBadge(milestone.status)

              return (
                <div
                  key={milestone.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    gap: '20px'
                  }}
                >
                  {/* Date */}
                  <div style={{
                    width: '80px',
                    textAlign: 'center',
                    borderRight: '2px solid var(--border-light)',
                    paddingRight: '20px'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>
                      {milestone.daysUntil}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {milestone.daysUntil === 1 ? 'day' : 'days'}
                    </div>
                  </div>

                  {/* Milestone Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {milestone.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {milestone.description || 'No description'}
                    </div>
                  </div>

                  {/* Status */}
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: badge.color,
                      background: badge.background,
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
