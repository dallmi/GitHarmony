import React, { useMemo } from 'react'
import {
  calculateVelocity,
  calculateAverageVelocity,
  calculateVelocityTrend,
  calculateBurndown,
  predictCompletion,
  getCurrentSprint
} from '../services/velocityService'

/**
 * Velocity & Burndown Analytics View
 * Shows sprint velocity, trends, burndown chart, and predictive analytics
 */
export default function VelocityView({ issues }) {
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
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
          <h3 className="mb-2">No Velocity Data</h3>
          <p className="text-muted">Add "Sprint X" labels to your issues to track velocity and burndown.</p>
        </div>
      </div>
    )
  }

  const { velocityData, avgVelocity, trend, currentSprint, burndown, prediction } = analytics

  // Helper to get trend color and icon
  const getTrendDisplay = (trendValue) => {
    if (trendValue > 10) return { color: '#059669', icon: '📈', label: 'Improving' }
    if (trendValue < -10) return { color: '#DC2626', icon: '📉', label: 'Declining' }
    return { color: '#D97706', icon: '➡️', label: 'Stable' }
  }

  const trendDisplay = getTrendDisplay(trend)

  // Calculate max values for chart scaling
  const maxVelocity = Math.max(...velocityData.map((s) => s.velocity), 10)
  const maxBurndown = burndown.total || 10

  return (
    <div className="container-fluid">
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
            {prediction ? new Date(prediction.date).toLocaleDateString() : 'N/A'}
          </div>
          {prediction && (
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {prediction.sprintsRemaining} sprints ({prediction.confidence}% confidence)
            </div>
          )}
        </div>
      </div>

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
                    const barHeight = (sprint.velocity / maxVelocity) * 100
                    const isRecent = index >= velocityData.length - 3

                    return (
                      <div key={sprint.sprint} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        {/* Bar */}
                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                          <div
                            style={{
                              width: '100%',
                              height: `${barHeight}%`,
                              background: isRecent ? '#2563EB' : '#93C5FD',
                              borderRadius: '4px 4px 0 0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '600',
                              minHeight: '24px'
                            }}
                          >
                            {sprint.velocity}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* X-axis labels */}
                <div style={{ position: 'absolute', left: '50px', right: 0, bottom: 0, height: '40px', display: 'flex', gap: '8px', padding: '0 10px' }}>
                  {velocityData.map((sprint) => (
                    <div key={sprint.sprint} style={{ flex: 1, fontSize: '12px', color: '#6B7280', textAlign: 'center', paddingTop: '8px' }}>
                      S{sprint.sprint}
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
                    ? '✅ On Track'
                    : '⚠️ Behind Schedule'}
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
              {velocityData.map((sprint) => (
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
