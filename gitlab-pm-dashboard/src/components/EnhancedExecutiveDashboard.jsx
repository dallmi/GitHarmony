import React, { useMemo, useState } from 'react'
import { getInitiatives, getStatusBadge, formatDate } from '../services/initiativeService'
import { getUpcomingMilestones, getMilestoneStatusBadge } from '../services/milestoneTimelineService'
import { calculateCommunicationsMetrics } from '../services/communicationsMetricsService'
import { exportExecutiveSummaryToCSV, downloadCSV } from '../utils/csvExportUtils'
import { useIterationFilter } from '../contexts/IterationFilterContext'
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

  // State for expandable sections in Items Requiring Attention
  const [expandedSections, setExpandedSections] = useState({
    blockers: false,
    overdue: false,
    highPriority: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

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

  // Calculate velocity metrics
  const velocityMetrics = useMemo(() => {
    if (!issues || issues.length === 0) return null

    // Calculate weekly velocity (issues closed in last 4 weeks)
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const recentlyClosed = issues.filter(i => {
      if (i.state !== 'closed' || !i.closed_at) return false
      const closedDate = new Date(i.closed_at)
      return closedDate >= fourWeeksAgo
    })

    const weeklyVelocity = (recentlyClosed.length / 4).toFixed(1)

    // Calculate team utilization (open issues per assignee)
    const assigneeMap = new Map()
    issues.filter(i => i.state === 'opened').forEach(issue => {
      issue.assignees?.forEach(assignee => {
        const count = assigneeMap.get(assignee.id) || 0
        assigneeMap.set(assignee.id, count + 1)
      })
    })

    const avgIssuesPerPerson = assigneeMap.size > 0
      ? (issues.filter(i => i.state === 'opened' && i.assignees?.length > 0).length / assigneeMap.size).toFixed(1)
      : 0

    return {
      weeklyVelocity,
      activeMembers: assigneeMap.size,
      avgIssuesPerPerson
    }
  }, [issues])

  // Calculate risk profile metrics
  const riskMetrics = useMemo(() => {
    if (!stats) return null

    const highPriorityOpen = issues.filter(i => {
      if (i.state !== 'opened') return false
      const labels = i.labels?.map(l => l.toLowerCase()) || []
      return labels.some(l => l.includes('priority::high') || l.includes('critical') || l.includes('urgent'))
    }).length

    return {
      blockers: stats.blockers,
      overdue: stats.overdue,
      highPriority: highPriorityOpen,
      total: stats.blockers + stats.overdue + highPriorityOpen
    }
  }, [issues, stats])

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
        {/* Tile 1: Active Initiatives */}
        <div className="card metric-card">
          <div className="metric-label">Active Initiatives</div>
          <div className="metric-value" style={{ color: 'var(--info)' }}>
            {initiatives.filter(i => i.openIssues > 0).length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {initiatives.filter(i => i.status === 'on-track').length} on track, {initiatives.filter(i => i.status === 'at-risk').length} at risk
          </div>
        </div>

        {/* Tile 2: Health Score */}
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

        {/* Tile 3: Velocity & Capacity */}
        {velocityMetrics && (
          <div className="card metric-card">
            <div className="metric-label">Velocity & Capacity</div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>
              {velocityMetrics.weeklyVelocity}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              issues/week · {velocityMetrics.activeMembers} members · {velocityMetrics.avgIssuesPerPerson} avg/person
            </div>
          </div>
        )}

        {/* Tile 4: Risk Profile */}
        {riskMetrics && (
          <div className="card metric-card">
            <div className="metric-label">Risk Profile</div>
            <div className="metric-value" style={{
              color: riskMetrics.total === 0 ? 'var(--success)' :
                     riskMetrics.total <= 5 ? 'var(--warning)' : 'var(--danger)'
            }}>
              {riskMetrics.total}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {riskMetrics.blockers} blockers · {riskMetrics.overdue} overdue · {riskMetrics.highPriority} high priority
            </div>
          </div>
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

        {/* Critical Items Requiring Attention */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            Items Requiring Attention
          </h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Blockers, overdue items, and high-priority issues
          </div>

          {riskMetrics && riskMetrics.total === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>✓</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                No critical items requiring attention
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Blockers Section */}
              {riskMetrics && riskMetrics.blockers > 0 && (() => {
                const blockerIssues = issues.filter(i => {
                  if (i.state !== 'opened') return false
                  const labels = i.labels?.map(l => l.toLowerCase()) || []
                  return labels.some(l => l.includes('blocker'))
                })
                const isExpanded = expandedSections.blockers
                const displayIssues = isExpanded ? blockerIssues : blockerIssues.slice(0, 3)
                const hasMore = blockerIssues.length > 3

                return (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      background: '#FEE2E2',
                      borderRadius: '8px 8px 0 0',
                      borderLeft: '4px solid var(--danger)'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)' }}>
                        {riskMetrics.blockers} Blocker{riskMetrics.blockers !== 1 ? 's' : ''}
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#991B1B', fontWeight: '600' }}>
                        CRITICAL
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#FEF2F2', borderRadius: '0 0 8px 8px' }}>
                      {displayIssues.map(issue => (
                        <a
                          key={issue.id}
                          href={issue.web_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 12px',
                            background: 'white',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                            border: '1px solid #FECACA',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--danger)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#FECACA'
                            e.currentTarget.style.transform = 'translateX(0)'
                          }}
                        >
                          <div style={{
                            width: '4px',
                            height: '100%',
                            background: 'var(--danger)',
                            borderRadius: '2px',
                            marginRight: '8px'
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>
                              #{issue.iid} {issue.title}
                            </div>
                            {issue.assignees && issue.assignees.length > 0 && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Assigned to: {issue.assignees[0].name}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600' }}>
                            View →
                          </div>
                        </a>
                      ))}
                      {hasMore && (
                        <button
                          onClick={() => toggleSection('blockers')}
                          style={{
                            padding: '8px 12px',
                            background: 'white',
                            border: '1px solid #FCA5A5',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#DC2626',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginTop: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FEE2E2'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white'
                          }}
                        >
                          {isExpanded ? '▲ Show less' : `▼ Show all ${riskMetrics.blockers} blockers`}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Overdue Issues Section */}
              {riskMetrics && riskMetrics.overdue > 0 && (() => {
                const overdueIssues = issues.filter(i => {
                  if (i.state !== 'opened' || !i.due_date) return false
                  const dueDate = new Date(i.due_date)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return dueDate < today
                })
                const isExpanded = expandedSections.overdue
                const displayIssues = isExpanded ? overdueIssues : overdueIssues.slice(0, 3)
                const hasMore = overdueIssues.length > 3

                return (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      background: '#FEF3C7',
                      borderRadius: '8px 8px 0 0',
                      borderLeft: '4px solid var(--warning)'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400E' }}>
                        {riskMetrics.overdue} Overdue Issue{riskMetrics.overdue !== 1 ? 's' : ''}
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#92400E', fontWeight: '600' }}>
                        OVERDUE
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#FFFBEB', borderRadius: '0 0 8px 8px' }}>
                      {displayIssues.map(issue => {
                        const dueDate = new Date(issue.due_date)
                        const today = new Date()
                        const daysOverdue = Math.floor((today - dueDate) / (24 * 60 * 60 * 1000))

                        return (
                          <a
                            key={issue.id}
                            href={issue.web_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '8px 12px',
                              background: 'white',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              color: 'var(--text-primary)',
                              border: '1px solid #FDE68A',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--warning)'
                              e.currentTarget.style.transform = 'translateX(4px)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#FDE68A'
                              e.currentTarget.style.transform = 'translateX(0)'
                            }}
                          >
                            <div style={{
                              width: '4px',
                              height: '100%',
                              background: 'var(--warning)',
                              borderRadius: '2px',
                              marginRight: '8px'
                            }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>
                                #{issue.iid} {issue.title}
                              </div>
                              <div style={{ fontSize: '11px', color: '#92400E' }}>
                                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: '600' }}>
                              View →
                            </div>
                          </a>
                        )
                      })}
                      {hasMore && (
                        <button
                          onClick={() => toggleSection('overdue')}
                          style={{
                            padding: '8px 12px',
                            background: 'white',
                            border: '1px solid #FCD34D',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#D97706',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginTop: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FEF3C7'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white'
                          }}
                        >
                          {isExpanded ? '▲ Show less' : `▼ Show all ${riskMetrics.overdue} overdue issues`}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* High Priority Issues Section */}
              {riskMetrics && riskMetrics.highPriority > 0 && (() => {
                const highPriorityIssues = issues.filter(i => {
                  if (i.state !== 'opened') return false
                  const labels = i.labels?.map(l => l.toLowerCase()) || []
                  return labels.some(l => l.includes('priority::high') || l.includes('critical') || l.includes('urgent'))
                })
                const isExpanded = expandedSections.highPriority
                const displayIssues = isExpanded ? highPriorityIssues : highPriorityIssues.slice(0, 3)
                const hasMore = highPriorityIssues.length > 3

                return (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      background: '#DBEAFE',
                      borderRadius: '8px 8px 0 0',
                      borderLeft: '4px solid var(--info)'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF' }}>
                        {riskMetrics.highPriority} High Priority Issue{riskMetrics.highPriority !== 1 ? 's' : ''}
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#1E40AF', fontWeight: '600' }}>
                        HIGH PRIORITY
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#EFF6FF', borderRadius: '0 0 8px 8px' }}>
                      {displayIssues.map(issue => (
                        <a
                          key={issue.id}
                          href={issue.web_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 12px',
                            background: 'white',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                            border: '1px solid #BFDBFE',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--info)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#BFDBFE'
                            e.currentTarget.style.transform = 'translateX(0)'
                          }}
                        >
                          <div style={{
                            width: '4px',
                            height: '100%',
                            background: 'var(--info)',
                            borderRadius: '2px',
                            marginRight: '8px'
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>
                              #{issue.iid} {issue.title}
                            </div>
                            {issue.assignees && issue.assignees.length > 0 && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Assigned to: {issue.assignees[0].name}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--info)', fontWeight: '600' }}>
                            View →
                          </div>
                        </a>
                      ))}
                      {hasMore && (
                        <button
                          onClick={() => toggleSection('highPriority')}
                          style={{
                            padding: '8px 12px',
                            background: 'white',
                            border: '1px solid #93C5FD',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#2563EB',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginTop: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#DBEAFE'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white'
                          }}
                        >
                          {isExpanded ? '▲ Show less' : `▼ Show all ${riskMetrics.highPriority} high priority issues`}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}
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

              // Calculate progress and risk factors
              const progress = milestone.stats && milestone.stats.total_issues > 0
                ? Math.round((milestone.stats.closed_issues / milestone.stats.total_issues) * 100)
                : 0
              const openIssues = milestone.stats ? milestone.stats.total_issues - milestone.stats.closed_issues : 0

              // Determine risk reason for at-risk milestones
              let riskReason = null
              if (milestone.status === 'at-risk') {
                if (milestone.daysUntil <= 3) {
                  riskReason = `Due in ${milestone.daysUntil} day${milestone.daysUntil !== 1 ? 's' : ''} with ${openIssues} open issue${openIssues !== 1 ? 's' : ''} (${progress}% complete)`
                } else if (progress < 50 && milestone.daysUntil <= 7) {
                  riskReason = `Only ${progress}% complete with ${milestone.daysUntil} days remaining`
                } else if (openIssues > 0) {
                  riskReason = `${openIssues} open issue${openIssues !== 1 ? 's' : ''} remaining (${progress}% complete)`
                }
              } else if (milestone.status === 'overdue') {
                riskReason = `Overdue with ${openIssues} open issue${openIssues !== 1 ? 's' : ''}`
              }

              return (
                <div
                  key={milestone.id}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    borderLeft: milestone.status === 'at-risk' || milestone.status === 'overdue'
                      ? `4px solid ${badge.color}`
                      : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: riskReason ? '8px' : '0' }}>
                        {milestone.description || 'No description'}
                      </div>

                      {/* Risk Context - only for at-risk or overdue milestones */}
                      {riskReason && (
                        <div style={{
                          padding: '8px 12px',
                          background: milestone.status === 'overdue' ? '#FEE2E2' : '#FEF3C7',
                          borderRadius: '6px',
                          marginTop: '8px'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: milestone.status === 'overdue' ? '#991B1B' : '#92400E',
                            marginBottom: '4px'
                          }}>
                            Risk Factor:
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: milestone.status === 'overdue' ? '#DC2626' : '#D97706',
                            lineHeight: '1.4'
                          }}>
                            {riskReason}
                          </div>
                        </div>
                      )}
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
                        gap: '4px',
                        alignSelf: 'flex-start'
                      }}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
