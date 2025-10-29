import React, { useMemo, useState } from 'react'
import { calculateEpicRAG, getHistoricalData } from '../services/ragAnalysisService'

/**
 * Risk Analysis Dashboard
 * Deep-dive root cause analysis with actionable insights
 */
export default function RiskAnalysisView({ epics, issues }) {
  const [selectedEpic, setSelectedEpic] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all') // all, red, amber, green

  // Calculate RAG for all epics
  const epicAnalysis = useMemo(() => {
    if (!epics || !issues) return []

    const historicalData = getHistoricalData(issues.filter(i => i.state === 'closed'))

    const analysis = epics.map(epic => {
      const epicIssues = issues.filter(i => i.epic?.id === epic.id)
      const rag = calculateEpicRAG(epic, epicIssues, historicalData)

      return {
        epic,
        issues: epicIssues,
        ...rag
      }
    })

    // Sort by severity: red > amber > green
    return analysis.sort((a, b) => {
      const statusOrder = { red: 0, amber: 1, green: 2 }
      return statusOrder[a.status] - statusOrder[b.status]
    })
  }, [epics, issues])

  // Filter by status
  const filteredAnalysis = useMemo(() => {
    if (filterStatus === 'all') return epicAnalysis
    return epicAnalysis.filter(a => a.status === filterStatus)
  }, [epicAnalysis, filterStatus])

  // Summary stats
  const summary = useMemo(() => {
    const red = epicAnalysis.filter(a => a.status === 'red').length
    const amber = epicAnalysis.filter(a => a.status === 'amber').length
    const green = epicAnalysis.filter(a => a.status === 'green').length
    const total = epicAnalysis.length

    return { red, amber, green, total }
  }, [epicAnalysis])

  const getStatusColor = (status) => {
    if (status === 'red') return '#EF4444'
    if (status === 'amber') return '#F59E0B'
    return '#10B981'
  }

  const getStatusBg = (status) => {
    if (status === 'red') return '#FEE2E2'
    if (status === 'amber') return '#FEF3C7'
    return '#D1FAE5'
  }

  const getStatusLabel = (status) => {
    if (status === 'red') return 'Critical'
    if (status === 'amber') return 'At Risk'
    return 'On Track'
  }

  if (!epics || epics.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>⚠️</div>
          <h3 className="mb-2">No Epics Available</h3>
          <p className="text-muted">Add epics to your project to see risk analysis.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
          Risk Analysis Dashboard
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Deep-dive root cause analysis with actionable recommendations
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div
          className="card"
          onClick={() => setFilterStatus(filterStatus === 'red' ? 'all' : 'red')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid #EF4444',
            background: filterStatus === 'red' ? '#FEE2E2' : 'white'
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>🔴 Critical Epics</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#EF4444' }}>{summary.red}</div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            {summary.total > 0 ? Math.round((summary.red / summary.total) * 100) : 0}% of portfolio
          </div>
        </div>

        <div
          className="card"
          onClick={() => setFilterStatus(filterStatus === 'amber' ? 'all' : 'amber')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid #F59E0B',
            background: filterStatus === 'amber' ? '#FEF3C7' : 'white'
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>🟡 At Risk Epics</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#F59E0B' }}>{summary.amber}</div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            {summary.total > 0 ? Math.round((summary.amber / summary.total) * 100) : 0}% of portfolio
          </div>
        </div>

        <div
          className="card"
          onClick={() => setFilterStatus(filterStatus === 'green' ? 'all' : 'green')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid #10B981',
            background: filterStatus === 'green' ? '#D1FAE5' : 'white'
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>🟢 On Track Epics</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981' }}>{summary.green}</div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            {summary.total > 0 ? Math.round((summary.green / summary.total) * 100) : 0}% of portfolio
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Epics</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1F2937' }}>{summary.total}</div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            {filterStatus !== 'all' ? `Showing ${filteredAnalysis.length}` : 'All epics'}
          </div>
        </div>
      </div>

      {/* Epic Risk Details */}
      {filteredAnalysis.length === 0 ? (
        <div className="card text-center" style={{ padding: '40px' }}>
          <p style={{ color: '#6B7280' }}>No epics match the selected filter.</p>
        </div>
      ) : (
        filteredAnalysis.map(analysis => {
          const isSelected = selectedEpic === analysis.epic.id
          const isRedOrAmber = analysis.status === 'red' || analysis.status === 'amber'

          return (
            <div key={analysis.epic.id} style={{ marginBottom: '20px' }}>
              <div
                className="card"
                style={{
                  borderLeft: `4px solid ${getStatusColor(analysis.status)}`,
                  background: isSelected ? getStatusBg(analysis.status) : 'white'
                }}
              >
                {/* Epic Header */}
                <div
                  onClick={() => setSelectedEpic(isSelected ? null : analysis.epic.id)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: isSelected ? '20px' : '0'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <a
                        href={analysis.epic.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1F2937',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {analysis.epic.title}
                      </a>

                      <div style={{
                        padding: '4px 12px',
                        background: getStatusColor(analysis.status),
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {getStatusLabel(analysis.status)}
                      </div>

                      {analysis.status !== 'green' && (
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>
                          {isSelected ? '▼' : '▶'} Click for details
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                      {analysis.reason}
                    </div>

                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#6B7280' }}>
                      <span>{analysis.metrics.closedIssues}/{analysis.metrics.totalIssues} issues closed ({analysis.metrics.progressPercent.toFixed(0)}%)</span>
                      {analysis.metrics.remainingIterations !== null && (
                        <span>{analysis.metrics.remainingIterations} iterations left</span>
                      )}
                      {analysis.metrics.currentVelocity > 0 && (
                        <span>Velocity: {analysis.metrics.currentVelocity.toFixed(1)} (need {analysis.metrics.requiredVelocity.toFixed(1)})</span>
                      )}
                    </div>
                  </div>

                  <div style={{ minWidth: '120px', textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Progress</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: getStatusColor(analysis.status) }}>
                      {analysis.metrics.progressPercent.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isSelected && isRedOrAmber && (
                  <div>
                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '20px', marginTop: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
                        Root Cause Analysis
                      </h3>

                      {/* Contributing Factors */}
                      {analysis.factors.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280', marginBottom: '12px' }}>
                            🔍 Contributing Factors
                          </h4>
                          {analysis.factors.map((factor, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '12px',
                                background: 'white',
                                borderLeft: `4px solid ${factor.severity === 'critical' ? '#EF4444' : '#F59E0B'}`,
                                borderRadius: '6px',
                                marginBottom: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                                  {idx + 1}. {factor.title}
                                </div>
                                <div style={{
                                  padding: '2px 8px',
                                  background: factor.severity === 'critical' ? '#FEE2E2' : '#FEF3C7',
                                  color: factor.severity === 'critical' ? '#DC2626' : '#D97706',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600'
                                }}>
                                  {factor.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
                                </div>
                              </div>
                              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>
                                {factor.description}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                                <strong>Impact:</strong> {factor.impact}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Plan */}
                      {analysis.actions.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280', marginBottom: '12px' }}>
                            💡 Recommended Action Plan
                          </h4>
                          {analysis.actions.map((action, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '12px',
                                background: 'white',
                                borderLeft: `4px solid ${
                                  action.priority === 'critical' ? '#EF4444' :
                                  action.priority === 'high' ? '#F59E0B' : '#3B82F6'
                                }`,
                                borderRadius: '6px',
                                marginBottom: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                                  {action.priority === 'critical' ? '🚨' : action.priority === 'high' ? '⚠️' : '📋'} {action.title}
                                </div>
                                <div style={{
                                  padding: '2px 8px',
                                  background:
                                    action.priority === 'critical' ? '#FEE2E2' :
                                    action.priority === 'high' ? '#FEF3C7' : '#DBEAFE',
                                  color:
                                    action.priority === 'critical' ? '#DC2626' :
                                    action.priority === 'high' ? '#D97706' : '#1E40AF',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  textTransform: 'uppercase'
                                }}>
                                  {action.priority}
                                </div>
                              </div>
                              <div style={{ fontSize: '13px', color: '#1F2937', marginBottom: '6px' }}>
                                {action.description}
                              </div>
                              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280' }}>
                                <span><strong>Effort:</strong> {action.estimatedEffort}</span>
                                <span><strong>Impact:</strong> {action.impact}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Projection */}
                      {analysis.projection && (
                        <div style={{
                          padding: '16px',
                          background: analysis.projection.onTime ? '#D1FAE5' : '#FEE2E2',
                          borderRadius: '8px',
                          border: `2px solid ${analysis.projection.onTime ? '#10B981' : '#EF4444'}`
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: analysis.projection.onTime ? '#065F46' : '#991B1B', marginBottom: '8px' }}>
                            📈 Completion Projection
                          </div>
                          <div style={{ fontSize: '13px', color: analysis.projection.onTime ? '#065F46' : '#991B1B' }}>
                            <div>Expected completion: <strong>{analysis.projection.date.toLocaleDateString()}</strong></div>
                            <div>At current velocity: <strong>{analysis.projection.iterationsNeeded} iterations</strong> ({analysis.projection.weeksNeeded} weeks)</div>
                            {analysis.projection.daysVariance !== null && (
                              <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: '600' }}>
                                {analysis.projection.onTime
                                  ? `✅ On time (${Math.abs(Math.round(analysis.projection.daysVariance))} days early)`
                                  : `⚠️ ${Math.abs(Math.round(analysis.projection.daysVariance))} days late`
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Green Status - Brief Summary */}
                {isSelected && analysis.status === 'green' && (
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px', marginTop: '16px' }}>
                    <div style={{ padding: '16px', background: '#D1FAE5', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#065F46', marginBottom: '8px' }}>
                        ✅ Epic is on track
                      </div>
                      <div style={{ fontSize: '13px', color: '#065F46' }}>
                        Current velocity ({analysis.metrics.currentVelocity.toFixed(1)} issues/iter) is sufficient to complete remaining {analysis.metrics.remainingIssues} issues in {analysis.metrics.remainingIterations} iterations.
                      </div>
                      {analysis.projection && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#065F46' }}>
                          Projected completion: <strong>{analysis.projection.date.toLocaleDateString()}</strong>
                          {analysis.projection.daysVariance < 0 && ` (${Math.abs(Math.round(analysis.projection.daysVariance))} days ahead of schedule)`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
