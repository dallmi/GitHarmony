import React, { useState } from 'react'
import {
  findBlockedIssues,
  getDependencyStats,
  getRecommendedActions,
  detectCircularDependencies,
  exportDependencyCSV,
  downloadDependencyCSV
} from '../services/dependencyService'

/**
 * Dependency Alerts Section for AI Insights
 * Shows blocked issues and dependency analysis
 */
export default function DependencyAlertsSection({ issues }) {
  const [expandedIssue, setExpandedIssue] = useState(null)

  const blockedIssues = findBlockedIssues(issues)
  const stats = getDependencyStats(issues)
  const circularDeps = detectCircularDependencies(issues)

  const handleExportCSV = () => {
    const csvContent = exportDependencyCSV(blockedIssues)
    downloadDependencyCSV(csvContent)
  }

  if (!stats.hasBlockers && circularDeps.length === 0) {
    return (
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
          🔗 Dependency Blockers
        </h3>
        <div style={{
          padding: '24px',
          background: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
            No Dependency Blockers
          </div>
          <div style={{ fontSize: '14px', color: '#15803D' }}>
            All issues are unblocked and ready to work on
          </div>
        </div>
      </div>
    )
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  const getSeverityBadge = (severity) => {
    const color = getSeverityColor(severity)
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        background: `${color}15`,
        color,
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {severity}
      </span>
    )
  }

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
          🔗 Dependency Blockers
        </h3>
        {blockedIssues.length > 0 && (
          <button
            onClick={handleExportCSV}
            style={{
              padding: '6px 12px',
              background: '#E60000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '12px',
          background: '#F9FAFB',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF4444' }}>
            {stats.totalBlockedIssues}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            Blocked Issues
          </div>
        </div>
        <div style={{
          padding: '12px',
          background: '#F9FAFB',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>
            {stats.totalOpenDependencies}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            Open Dependencies
          </div>
        </div>
        <div style={{
          padding: '12px',
          background: '#F9FAFB',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF4444' }}>
            {stats.highSeverityBlocked}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            High Severity
          </div>
        </div>
        <div style={{
          padding: '12px',
          background: '#F9FAFB',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#A855F7' }}>
            {circularDeps.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            Circular Deps
          </div>
        </div>
      </div>

      {/* Circular Dependencies Alert */}
      {circularDeps.length > 0 && (
        <div style={{
          padding: '12px',
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#D97706', marginBottom: '8px' }}>
            ⚠️ Circular Dependencies Detected
          </div>
          {circularDeps.map((circ, idx) => (
            <div key={idx} style={{ fontSize: '13px', color: '#92400E', marginBottom: '4px' }}>
              #{circ.issue1.iid} ↔ #{circ.issue2.iid}: "{circ.issue1.title}" and "{circ.issue2.title}"
            </div>
          ))}
        </div>
      )}

      {/* Blocked Issues List */}
      {blockedIssues.length > 0 && (
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#4B5563', marginBottom: '12px' }}>
            Blocked Issues ({blockedIssues.length})
          </h4>
          {blockedIssues.map((blocked) => {
            const isExpanded = expandedIssue === blocked.issue.iid
            const recommendations = getRecommendedActions(blocked)

            return (
              <div
                key={blocked.issue.iid}
                style={{
                  border: `2px solid ${getSeverityColor(blocked.severity)}`,
                  borderRadius: '8px',
                  marginBottom: '12px',
                  overflow: 'hidden'
                }}
              >
                {/* Issue Header */}
                <div
                  onClick={() => setExpandedIssue(isExpanded ? null : blocked.issue.iid)}
                  style={{
                    padding: '12px 16px',
                    background: '#F9FAFB',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                        #{blocked.issue.iid}
                      </span>
                      {getSeverityBadge(blocked.severity)}
                      {blocked.blocksCount > 0 && (
                        <span style={{
                          fontSize: '12px',
                          color: '#DC2626',
                          fontWeight: '500'
                        }}>
                          🚫 Blocks {blocked.blocksCount} issue{blocked.blocksCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#4B5563' }}>
                      {blocked.issue.title}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    color: '#6B7280',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}>
                    ▼
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '16px', background: 'white' }}>
                    {/* Open Dependencies */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563', marginBottom: '8px' }}>
                        Open Dependencies ({blocked.openDependencies.length}):
                      </div>
                      {blocked.openDependencies.map(dep => (
                        <div
                          key={dep.iid}
                          style={{
                            padding: '8px 12px',
                            background: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '6px',
                            marginBottom: '6px',
                            fontSize: '13px'
                          }}
                        >
                          <div style={{ fontWeight: '600', color: '#DC2626', marginBottom: '2px' }}>
                            #{dep.iid}: {dep.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#991B1B' }}>
                            {dep.assignees && dep.assignees.length > 0
                              ? `Assigned to: ${dep.assignees.map(a => a.name).join(', ')}`
                              : '⚠️ No assignee'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Closed Dependencies */}
                    {blocked.closedDependencies.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563', marginBottom: '8px' }}>
                          Resolved Dependencies ({blocked.closedDependencies.length}):
                        </div>
                        {blocked.closedDependencies.map(dep => (
                          <div
                            key={dep.iid}
                            style={{
                              padding: '6px 12px',
                              background: '#F0FDF4',
                              border: '1px solid #86EFAC',
                              borderRadius: '6px',
                              marginBottom: '4px',
                              fontSize: '12px',
                              color: '#166534'
                            }}
                          >
                            ✅ #{dep.iid}: {dep.title}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Blocks Other Issues */}
                    {blocked.blocksCount > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563', marginBottom: '8px' }}>
                          🚫 Blocks These Issues ({blocked.blocksCount}):
                        </div>
                        {blocked.blocksIssues.map(issue => (
                          <div
                            key={issue.iid}
                            style={{
                              padding: '6px 12px',
                              background: '#FEF3C7',
                              border: '1px solid #FCD34D',
                              borderRadius: '6px',
                              marginBottom: '4px',
                              fontSize: '12px',
                              color: '#92400E'
                            }}
                          >
                            #{issue.iid}: {issue.title}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommendations */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563', marginBottom: '8px' }}>
                        💡 Recommended Actions:
                      </div>
                      {recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            background: rec.priority === 'urgent' ? '#FEE2E2' : '#EFF6FF',
                            border: `1px solid ${rec.priority === 'urgent' ? '#DC2626' : '#3B82F6'}`,
                            borderRadius: '6px',
                            marginBottom: '6px'
                          }}
                        >
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: rec.priority === 'urgent' ? '#DC2626' : '#1E40AF',
                            marginBottom: '2px'
                          }}>
                            {rec.action}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: rec.priority === 'urgent' ? '#991B1B' : '#1E3A8A'
                          }}>
                            {rec.details}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* View Issue Link */}
                    <div style={{ marginTop: '12px' }}>
                      <a
                        href={blocked.issue.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '13px',
                          color: '#E60000',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                      >
                        View Issue in GitLab →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
