import React, { useMemo } from 'react'
import {
  calculateVelocity,
  calculateAverageVelocity,
  calculateVelocityTrend,
  calculateBurndown,
  predictCompletion,
  getCurrentSprint
} from '../services/velocityService'
import { exportVelocityToCSV, downloadCSV } from '../utils/csvExportUtils'
import { useIterationFilter } from '../contexts/IterationFilterContext'

/**
 * Velocity & Burndown Analytics View
 * Shows sprint velocity, trends, burndown chart, and predictive analytics
 */
export default function VelocityView({ issues: allIssues }) {
  // Use filtered issues from iteration context
  const { filteredIssues: issues } = useIterationFilter()
  // Get velocity root cause analysis
  const getVelocityRootCause = (velocityData, trend, avgVelocity) => {
    if (!velocityData || velocityData.length < 2) return { causes: [], actions: [] }

    const causes = []
    const actions = []

    const recent3 = velocityData.slice(-3)
    const recent = velocityData[velocityData.length - 1]
    const previous = velocityData[velocityData.length - 2]

    // Analyze velocity drop
    if (trend < -10) {
      // Significant decline
      const dropPercent = Math.abs(trend)

      causes.push({
        severity: 'critical',
        category: 'velocity-decline',
        description: `Velocity declined by ${dropPercent}% (from ${previous.velocity} to ${recent.velocity} issues/sprint)`,
        impact: `${previous.velocity - recent.velocity} fewer issues completed per sprint`
      })

      // Analyze potential reasons
      if (recent.completionRate < 70) {
        causes.push({
          severity: 'warning',
          category: 'completion-rate',
          description: `Low completion rate: ${recent.completionRate}% in Sprint ${recent.sprint}`,
          impact: `${recent.openIssues} issues not completed`
        })
        actions.push({
          priority: 'high',
          title: 'Reduce sprint scope',
          description: 'Team is taking on too much work. Reduce planned issues by 20-30%',
          estimatedImpact: 'Improve completion rate to 80%+'
        })
      }

      // Check for increasing WIP
      if (recent.openIssues > previous.openIssues) {
        causes.push({
          severity: 'warning',
          category: 'wip-increase',
          description: `Work in progress increased from ${previous.openIssues} to ${recent.openIssues} issues`,
          impact: 'More started work not being completed'
        })
        actions.push({
          priority: 'high',
          title: 'Implement WIP limits',
          description: 'Focus on completing existing work before starting new issues',
          estimatedImpact: 'Increase completion rate'
        })
      }

      actions.push({
        priority: 'high',
        title: 'Investigate blockers',
        description: 'Review issues for blockers, dependencies, or scope creep',
        estimatedImpact: 'Identify and remove impediments'
      })
    } else if (trend > 10) {
      // Improving velocity
      causes.push({
        severity: 'info',
        category: 'velocity-improvement',
        description: `Velocity improved by ${trend}% (from ${previous.velocity} to ${recent.velocity} issues/sprint)`,
        impact: `${recent.velocity - previous.velocity} more issues completed per sprint`
      })

      if (recent.completionRate > 90) {
        causes.push({
          severity: 'info',
          category: 'high-completion',
          description: `Excellent completion rate: ${recent.completionRate}% in Sprint ${recent.sprint}`,
          impact: 'Team is efficiently completing planned work'
        })
        actions.push({
          priority: 'low',
          title: 'Consider increasing scope',
          description: 'Team may have capacity for more work. Test with 10-15% increase',
          estimatedImpact: 'Optimize team utilization'
        })
      }

      actions.push({
        priority: 'low',
        title: 'Document success factors',
        description: 'Capture what worked well this sprint to replicate in future',
        estimatedImpact: 'Maintain improved velocity'
      })
    } else {
      // Stable velocity
      causes.push({
        severity: 'info',
        category: 'velocity-stable',
        description: `Velocity stable at ~${avgVelocity} issues/sprint`,
        impact: 'Predictable delivery rate'
      })

      if (avgVelocity < 5 && recent.totalIssues > 10) {
        causes.push({
          severity: 'warning',
          category: 'low-velocity',
          description: `Low velocity despite ${recent.totalIssues} issues in sprint`,
          impact: 'Team may be overloaded or issues too large'
        })
        actions.push({
          priority: 'medium',
          title: 'Break down issues',
          description: 'Split large issues into smaller chunks (aim for 1-3 day issues)',
          estimatedImpact: 'Increase throughput and visibility'
        })
      }
    }

    return { causes, actions }
  }

  const analytics = useMemo(() => {
    if (!issues || issues.length === 0) {
      return null
    }

    const velocityData = calculateVelocity(issues)
    const avgVelocity = calculateAverageVelocity(velocityData, 3)
    const trend = calculateVelocityTrend(velocityData)
    const currentSprint = getCurrentSprint(issues)
    const burndown = calculateBurndown(issues, currentSprint)
    const prediction = predictCompletion(issues, avgVelocity)

    return {
      velocityData,
      avgVelocity,
      trend,
      currentSprint,
      burndown,
      prediction
    }
  }, [issues])

  if (!analytics || analytics.velocityData.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <h3 className="mb-2">No Velocity Data</h3>
          <p className="text-muted">Add "Sprint X" labels to your issues to track velocity and burndown.</p>
        </div>
      </div>
    )
  }

  const { velocityData, avgVelocity, trend, currentSprint, burndown, prediction } = analytics

  // Helper to get trend color and icon
  const getTrendDisplay = (trendValue) => {
    if (trendValue > 10) return { color: '#059669', icon: '↑', label: 'Improving' }
    if (trendValue < -10) return { color: '#DC2626', icon: '↓', label: 'Declining' }
    return { color: '#D97706', icon: '→', label: 'Stable' }
  }

  const trendDisplay = getTrendDisplay(trend)

  // Calculate max values for chart scaling
  const maxVelocity = Math.max(...velocityData.map((s) => s.velocity), 10)
  const maxBurndown = burndown.total || 10

  const handleExportCSV = () => {
    const csvContent = exportVelocityToCSV(velocityData)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csvContent, `velocity-data-${date}.csv`)
  }

  return (
    <div className="container-fluid">
      {/* Header with Export Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Velocity & Burndown Analytics</h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Sprint velocity, trends, burndown chart, and predictive analytics
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleExportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>Export Velocity CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Current Sprint</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>
            Sprint {currentSprint || 'N/A'}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Avg. Velocity (Last 3)</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#2563EB' }}>
            {avgVelocity} <span style={{ fontSize: '16px', color: '#6B7280' }}>issues/sprint</span>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Velocity Trend</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: trendDisplay.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{trendDisplay.icon}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
          <div style={{ fontSize: '12px', color: trendDisplay.color, marginTop: '4px' }}>
            {trendDisplay.label}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Predicted Completion</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#059669' }}>
            {prediction ? new Date(prediction.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
          </div>
          {prediction && (
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {prediction.sprintsRemaining} sprints ({prediction.confidence}% confidence)
            </div>
          )}
        </div>
      </div>

      {/* Velocity Root Cause Analysis */}
      {(() => {
        const { causes, actions } = getVelocityRootCause(velocityData, trend, avgVelocity)

        if (causes.length === 0) return null

        return (
          <div className="card" style={{ marginBottom: '20px', background: '#F9FAFB' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Velocity Analysis
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Root Causes */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>
                  Analysis:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {causes.map((cause, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        background: 'white',
                        borderRadius: '6px',
                        borderLeft: `4px solid ${
                          cause.severity === 'critical' ? '#DC2626' :
                          cause.severity === 'warning' ? '#D97706' :
                          '#2563EB'
                        }`
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        {cause.description}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {cause.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              {actions.length > 0 && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>
                    Recommended Actions:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {actions.map((action, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          background: 'white',
                          borderRadius: '6px',
                          borderLeft: '4px solid #2563EB'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          {action.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                          {action.description}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          Expected impact: {action.estimatedImpact}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Velocity Chart */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            Sprint Velocity
          </h2>

          {velocityData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              No velocity data available
            </div>
          ) : (
            <div>
              {/* Chart */}
              <div style={{ position: 'relative', height: '300px', marginBottom: '20px' }}>
                {/* Y-axis labels */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 40, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', textAlign: 'right', paddingRight: '8px' }}>
                  <div>{maxVelocity}</div>
                  <div>{Math.round(maxVelocity * 0.75)}</div>
                  <div>{Math.round(maxVelocity * 0.5)}</div>
                  <div>{Math.round(maxVelocity * 0.25)}</div>
                  <div>0</div>
                </div>

                {/* Chart area */}
                <div style={{ position: 'absolute', left: '50px', right: 0, top: 0, bottom: 40, borderLeft: '2px solid #E5E7EB', borderBottom: '2px solid #E5E7EB', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px' }}>
                  {velocityData.map((sprint, index) => {
                    const barHeightPercent = (sprint.velocity / maxVelocity) * 100
                    const isRecent = index >= velocityData.length - 3

                    // Calculate actual pixel height from the container (300px total - 40px for x-axis - 20px padding = 240px chart area)
                    const chartHeightPx = 240
                    const barHeightPx = Math.max((barHeightPercent / 100) * chartHeightPx, 24)

                    return (
                      <div key={sprint.sprint} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {/* Bar */}
                        <div
                          style={{
                            width: '100%',
                            height: `${barHeightPx}px`,
                            background: isRecent ? '#2563EB' : '#93C5FD',
                            borderRadius: '4px 4px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {sprint.velocity}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* X-axis labels */}
                <div style={{ position: 'absolute', left: '50px', right: 0, bottom: 0, height: '40px', display: 'flex', gap: '8px', padding: '0 10px' }}>
                  {velocityData.map((sprint) => (
                    <div key={sprint.sprint} style={{ flex: 1, fontSize: '11px', color: '#6B7280', textAlign: 'center', paddingTop: '8px', lineHeight: '1.2' }}>
                      {sprint.sprint}
                    </div>
                  ))}
                </div>
              </div>

              {/* Average line indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '12px', background: '#F3F4F6', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '3px', background: '#2563EB' }} />
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Recent Sprint</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '3px', background: '#93C5FD' }} />
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Previous Sprint</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Burndown Chart */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            Sprint {currentSprint} Burndown
          </h2>

          {burndown.total === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              No burndown data for current sprint
            </div>
          ) : (
            <div>
              {/* Chart */}
              <div style={{ position: 'relative', height: '300px', marginBottom: '20px' }}>
                {/* Y-axis labels */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 40, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', textAlign: 'right', paddingRight: '8px' }}>
                  <div>{burndown.total}</div>
                  <div>{Math.round(burndown.total * 0.75)}</div>
                  <div>{Math.round(burndown.total * 0.5)}</div>
                  <div>{Math.round(burndown.total * 0.25)}</div>
                  <div>0</div>
                </div>

                {/* Chart area */}
                <div style={{ position: 'absolute', left: '50px', right: 0, top: 0, bottom: 40, borderLeft: '2px solid #E5E7EB', borderBottom: '2px solid #E5E7EB' }}>
                  <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                    {/* Ideal line */}
                    {burndown.ideal.length > 1 && (
                      <polyline
                        points={burndown.ideal.map((point, i) => {
                          const x = (i / (burndown.ideal.length - 1)) * 100
                          const y = 100 - (point.remaining / burndown.total) * 100
                          return `${x}%,${y}%`
                        }).join(' ')}
                        fill="none"
                        stroke="#D1D5DB"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    )}

                    {/* Actual line */}
                    {burndown.actual.length > 1 && (
                      <polyline
                        points={burndown.actual.map((point, i) => {
                          const x = (i / (burndown.ideal.length - 1)) * 100
                          const y = 100 - (point.remaining / burndown.total) * 100
                          return `${x}%,${y}%`
                        }).join(' ')}
                        fill="none"
                        stroke="#DC2626"
                        strokeWidth="3"
                      />
                    )}
                  </svg>
                </div>

                {/* X-axis labels */}
                <div style={{ position: 'absolute', left: '50px', right: 0, bottom: 0, height: '40px', display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {burndown.sprintStart ? new Date(burndown.sprintStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Today</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {burndown.sprintEnd ? new Date(burndown.sprintEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'End'}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '12px', background: '#F3F4F6', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '3px', background: '#DC2626' }} />
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Actual Progress</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '3px', background: '#D1D5DB', borderTop: '2px dashed #D1D5DB' }} />
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Ideal Burndown</span>
                </div>
              </div>

              {/* Status indicator */}
              <div style={{ marginTop: '16px', padding: '12px', background: burndown.actual[burndown.actual.length - 1]?.remaining <= burndown.ideal[burndown.actual.length - 1]?.remaining ? '#D1FAE5' : '#FEE2E2', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: burndown.actual[burndown.actual.length - 1]?.remaining <= burndown.ideal[burndown.actual.length - 1]?.remaining ? '#059669' : '#DC2626' }}>
                  {burndown.actual[burndown.actual.length - 1]?.remaining <= burndown.ideal[burndown.actual.length - 1]?.remaining
                    ? 'On Track'
                    : 'Behind Schedule'}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  {burndown.actual[burndown.actual.length - 1]?.remaining || 0} issues remaining
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sprint Details Table */}
      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Sprint History</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Sprint</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Total Issues</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Completed</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Open</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Velocity</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {[...velocityData].reverse().map((sprint) => (
                <tr key={sprint.sprint} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>Sprint {sprint.sprint}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{sprint.totalIssues}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#059669' }}>{sprint.completedIssues}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#DC2626' }}>{sprint.openIssues}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2563EB' }}>{sprint.velocity}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <div style={{ flex: 1, maxWidth: '100px', height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${sprint.completionRate}%`,
                            height: '100%',
                            background: sprint.completionRate >= 80 ? '#059669' : sprint.completionRate >= 50 ? '#D97706' : '#DC2626'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '40px' }}>{sprint.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
