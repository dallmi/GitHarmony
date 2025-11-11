import React, { useMemo, useState } from 'react'
import { getInitiatives, getStatusBadge, formatDate } from '../services/initiativeService'
import { getUpcomingMilestones, getMilestoneStatusBadge } from '../services/milestoneTimelineService'
import { calculateCommunicationsMetrics } from '../services/communicationsMetricsService'
import { exportExecutiveDashboardToPDF } from '../utils/pdfExportUtils'
import { useIterationFilter } from '../contexts/IterationFilterContext'
import HealthScoreConfigModal from './HealthScoreConfigModal'
import { isBlocker } from '../services/metricsService'
import { calculateBurnupData, calculateVelocity, calculateVelocityTrend, getCurrentSprint, calculateDeliveryConfidence, calculateMonthOverMonthMetrics } from '../services/velocityService'
import { getCycleTimeStats } from '../services/cycleTimeService'
import { getRecentDecisions, getDecisionsStats } from '../services/decisionsService'
import { getTeamPerformanceSummary } from '../services/teamPerformanceService'
import { getForecastAccuracyStats, getForecastAccuracyTrends, calculateForecastReliability, getRecentForecasts } from '../services/forecastAccuracyService'
import BurnupChart from './BurnupChart'

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

  // Calculate burnup chart data
  const burnupData = useMemo(() => {
    if (!issues || issues.length === 0) return null
    return calculateBurnupData(issues)
  }, [issues])

  // Calculate iteration-based velocity trend (last 6 iterations)
  const velocityTrend = useMemo(() => {
    if (!issues || issues.length === 0) return null

    const velocityData = calculateVelocity(issues)
    if (velocityData.length === 0) return null

    const currentSprint = getCurrentSprint(issues)
    const trend = calculateVelocityTrend(velocityData, currentSprint)

    // Get last 6 sprints for display
    let currentIndex = velocityData.length - 1
    if (currentSprint) {
      const foundIndex = velocityData.findIndex(s => s.sprint === currentSprint)
      if (foundIndex >= 0) currentIndex = foundIndex
    }

    const startIndex = Math.max(0, currentIndex - 5)
    const last6Sprints = velocityData.slice(startIndex, currentIndex + 1)

    // Calculate averages and stats
    const avgVelocity = last6Sprints.reduce((sum, s) => sum + s.velocity, 0) / last6Sprints.length
    const peakVelocity = Math.max(...last6Sprints.map(s => s.velocity))
    const lowVelocity = Math.min(...last6Sprints.map(s => s.velocity))

    // Calculate recent 3 vs previous 3 totals
    const recent3Sprints = last6Sprints.slice(-3)
    const previous3Sprints = last6Sprints.slice(0, 3)

    const recent3Total = recent3Sprints.reduce((sum, s) => sum + s.velocity, 0)
    const previous3Total = previous3Sprints.reduce((sum, s) => sum + s.velocity, 0)
    const trendPercent = previous3Total > 0
      ? Math.round(((recent3Total - previous3Total) / previous3Total) * 100)
      : 0

    return {
      avgVelocity: Math.round(avgVelocity),
      trend: trend.longTerm,
      peakVelocity,
      lowVelocity,
      last6Sprints,
      recent3Total,
      previous3Total,
      trendPercent
    }
  }, [issues])

  // Calculate cycle time metrics
  const cycleTimeMetrics = useMemo(() => {
    if (!issues || issues.length === 0) return null
    return getCycleTimeStats(issues)
  }, [issues])

  // Calculate delivery confidence score
  const deliveryConfidence = useMemo(() => {
    if (!issues || issues.length === 0) return null
    return calculateDeliveryConfidence(issues)
  }, [issues])

  // Calculate month-over-month metrics
  const monthOverMonthMetrics = useMemo(() => {
    if (!issues || issues.length === 0) return null
    return calculateMonthOverMonthMetrics(issues)
  }, [issues])

  // Get recent decisions
  const recentDecisions = useMemo(() => {
    return getRecentDecisions(30) // Last 30 days
  }, [])

  const decisionsStats = useMemo(() => {
    return getDecisionsStats()
  }, [])

  // Get team performance summary
  const teamPerformance = useMemo(() => {
    if (!issues || issues.length === 0) return null
    return getTeamPerformanceSummary(issues, 30)
  }, [issues])

  // Get forecast accuracy data
  const forecastAccuracy = useMemo(() => {
    const stats = getForecastAccuracyStats()
    const trends = getForecastAccuracyTrends(6)
    const reliability = calculateForecastReliability()
    const recent = getRecentForecasts(5)
    return { stats, trends, reliability, recent }
  }, [])


  const handleExportPDF = () => {
    const exportData = {
      initiatives,
      healthScore,
      burnupData,
      velocityTrend,
      cycleTimeMetrics,
      deliveryConfidence,
      monthOverMonthMetrics,
      recentDecisions,
      upcomingMilestones,
      stats,
      teamPerformance,
      forecastAccuracy
    }
    exportExecutiveDashboardToPDF(exportData)
  }

  const handleConfigSave = (newConfig) => {
    setConfigKey(prev => prev + 1) // Force re-render
    window.location.reload() // Reload to apply new health score calculation
  }

  return (
    <div className="container-fluid">
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
            onClick={handleExportPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📄 Export PDF</span>
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

      {/* Sprint Performance Section - Burnup Chart, Velocity Trend, Cycle Time */}
      <div className="grid grid-3" style={{ gap: '20px', marginBottom: '30px' }}>
        {/* Burnup Chart - Scope Tracking */}
        {burnupData && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
              Scope Tracking
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Total scope vs completed work over time
            </div>

            {/* Key Metrics */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  Total Scope
                </div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
                  {burnupData.totalScope}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  Completed
                </div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--success)' }}>
                  {burnupData.completed}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  Remaining
                </div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  {burnupData.remaining}
                </div>
              </div>
            </div>

            {/* Visual Burnup Chart */}
            <div style={{ marginBottom: '16px', width: '100%' }}>
              <BurnupChart burnupData={burnupData} width={undefined} height={200} />
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '12px' }}>
              <div className="progress-bar" style={{ height: '8px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${burnupData.totalScope > 0 ? (burnupData.completed / burnupData.totalScope) * 100 : 0}%`,
                    background: 'var(--success)'
                  }}
                />
              </div>
            </div>

            {/* Scope Growth Warning */}
            {burnupData.scopeGrowthPercent > 0 && (
              <div style={{
                padding: '8px 12px',
                background: burnupData.scopeGrowthPercent > 25 ? '#FEF3C7' : '#EFF6FF',
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: burnupData.scopeGrowthPercent > 25 ? '#92400E' : '#1E40AF',
                  marginBottom: '2px'
                }}>
                  Scope Growth: +{burnupData.scopeGrowthPercent}%
                </div>
                <div style={{
                  fontSize: '11px',
                  color: burnupData.scopeGrowthPercent > 25 ? '#D97706' : '#3B82F6'
                }}>
                  +{burnupData.scopeGrowth} items added since start
                </div>
              </div>
            )}

            {/* Projection */}
            {burnupData.projectedCompletion && (
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Projected completion: {new Date(burnupData.projectedCompletion).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            )}
          </div>
        )}

        {/* Iteration-Based Velocity Trend */}
        {velocityTrend && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
              Velocity Trend (6 Iterations)
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Historical delivery performance
            </div>

            {/* Key Metrics */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  Average Velocity
                </div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
                  {velocityTrend.avgVelocity}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  issues per iteration
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  Recent 3 Iterations
                </div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#374151' }}>
                  {velocityTrend.recent3Total}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  vs {velocityTrend.previous3Total} previous
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '8px' }}>
                <span style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: velocityTrend.trendPercent >= 0 ? '#059669' : '#DC2626'
                }}>
                  {velocityTrend.trendPercent >= 0 ? '▲' : '▼'} {Math.abs(velocityTrend.trendPercent)}%
                </span>
              </div>
            </div>

            {/* Mini Sprint Velocity Chart */}
            {velocityTrend.last6Sprints && velocityTrend.last6Sprints.length > 0 && (
              <div style={{ marginBottom: '12px', height: '120px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                {velocityTrend.last6Sprints.map((sprint, idx) => {
                  const maxVelocity = Math.max(...velocityTrend.last6Sprints.map(s => s.velocity))
                  const heightPercent = maxVelocity > 0 ? (sprint.velocity / maxVelocity) * 100 : 0
                  const isLatest = idx === velocityTrend.last6Sprints.length - 1

                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        height: `${heightPercent}%`,
                        minHeight: '12px',
                        background: isLatest ? '#2563EB' : '#93C5FD',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        paddingBottom: '4px'
                      }}
                      title={`${sprint.sprint}: ${sprint.velocity} issues`}
                    >
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        color: isLatest ? 'white' : '#1E40AF'
                      }}>
                        {sprint.velocity}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Peak and Low */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <div>
                <span style={{ fontWeight: '600' }}>Low:</span> {velocityTrend.lowVelocity}
              </div>
              <div>
                <span style={{ fontWeight: '600' }}>Peak:</span> {velocityTrend.peakVelocity}
              </div>
            </div>
          </div>
        )}

        {/* Cycle Time Metrics */}
        {cycleTimeMetrics && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
              Delivery Efficiency
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              How quickly work flows through the system
            </div>

            {cycleTimeMetrics.count > 0 ? (
              <>
                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      Avg Cycle Time
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
                      {cycleTimeMetrics.avgCycleTime}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      days (start to done)
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      Avg Lead Time
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#374151' }}>
                      {cycleTimeMetrics.avgLeadTime}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      days (created to done)
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      Median Cycle Time
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#6B7280' }}>
                      {cycleTimeMetrics.medianCycleTime} days
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      Issues Closed
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#6B7280' }}>
                      {cycleTimeMetrics.count}
                    </div>
                  </div>
                </div>

                {/* Status Indicator - Subtle colored text without box */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: cycleTimeMetrics.avgCycleTime < 7 ? '#059669' :
                           cycleTimeMetrics.avgCycleTime < 14 ? '#D97706' : '#6B7280'
                  }}>
                    {cycleTimeMetrics.avgCycleTime < 7 ? 'Excellent efficiency (<7 days)' :
                     cycleTimeMetrics.avgCycleTime < 14 ? 'Good efficiency (7-14 days)' : 'Target: <14 days for optimal flow'}
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#9CA3AF'
              }}>
                <div style={{ fontSize: '13px' }}>
                  No closed issues yet
                </div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  Complete some issues to see delivery metrics
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delivery Confidence Score - Featured Section */}
      {deliveryConfidence && (
        <div className="card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%)', border: '2px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Delivery Confidence Score
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Will we hit our target? Comprehensive confidence analysis
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                color: deliveryConfidence.statusColor
              }}>
                {deliveryConfidence.score}%
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: deliveryConfidence.statusColor,
                letterSpacing: '0.5px'
              }}>
                {deliveryConfidence.status} Confidence
              </div>
            </div>
          </div>

          {/* Confidence Factors Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {deliveryConfidence.factors.map((factor, index) => {
              const percentage = Math.round((factor.score / factor.maxScore) * 100)
              return (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '8px',
                    border: `1px solid ${factor.status === 'good' ? '#D1FAE5' : factor.status === 'warning' ? '#FEF3C7' : '#FEE2E2'}`
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                    {factor.name}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: factor.status === 'good' ? '#16A34A' : factor.status === 'warning' ? '#EAB308' : '#DC2626',
                    marginBottom: '4px'
                  }}>
                    {percentage}%
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {factor.detail}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recommendations */}
          {deliveryConfidence.recommendations.length > 0 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Top Recommendations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {deliveryConfidence.recommendations.slice(0, 3).map((rec, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '10px 12px',
                      background: 'white',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${rec.priority === 'critical' ? '#DC2626' : rec.priority === 'high' ? '#F97316' : '#3B82F6'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: rec.priority === 'critical' ? '#DC2626' : rec.priority === 'high' ? '#F97316' : '#3B82F6',
                        letterSpacing: '0.5px'
                      }}>
                        {rec.priority}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {rec.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {rec.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Forecast Accuracy Tracking */}
      {forecastAccuracy.reliability.score !== null && (
        <div className="card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)', border: '2px solid #BFDBFE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Forecast Accuracy Tracking
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                How reliable are our predictions? Historical performance
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                color: forecastAccuracy.reliability.score >= 80 ? '#16A34A' : forecastAccuracy.reliability.score >= 60 ? '#EAB308' : '#DC2626'
              }}>
                {forecastAccuracy.reliability.score}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: forecastAccuracy.reliability.score >= 80 ? '#16A34A' : forecastAccuracy.reliability.score >= 60 ? '#EAB308' : '#DC2626',
                letterSpacing: '0.5px'
              }}>
                Reliability Score
              </div>
            </div>
          </div>

          {/* Key Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Total Forecasts
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
                {forecastAccuracy.stats.completedForecasts}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                On Time
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#16A34A' }}>
                {forecastAccuracy.stats.onTimePercentage}%
              </div>
            </div>
            <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Avg Days Off
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--warning)' }}>
                {forecastAccuracy.stats.avgDaysOff}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Early
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#3B82F6' }}>
                {forecastAccuracy.stats.earlyCount}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Late
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#DC2626' }}>
                {forecastAccuracy.stats.lateCount}
              </div>
            </div>
          </div>

          {/* Reliability Factors */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
              Reliability Factors
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {forecastAccuracy.reliability.factors.map((factor, index) => {
                const percentage = Math.round((factor.points / factor.maxPoints) * 100)
                return (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                      {factor.name}
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: percentage >= 80 ? '#16A34A' : percentage >= 60 ? '#EAB308' : '#DC2626',
                      marginBottom: '4px'
                    }}>
                      {percentage}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {factor.detail}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recommendation */}
          <div style={{
            padding: '12px 16px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #BFDBFE'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1E40AF', marginBottom: '4px' }}>
              Recommendation
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {forecastAccuracy.reliability.recommendation}
            </div>
          </div>
        </div>
      )}

      {/* Forecast Accuracy - Insufficient Data State */}
      {forecastAccuracy.reliability.score === null && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Forecast Accuracy Tracking
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Track prediction accuracy to build confidence in forecasting
              </div>
            </div>
          </div>
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>📊</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {forecastAccuracy.reliability.reason}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {forecastAccuracy.reliability.recommendation}
            </div>
          </div>
        </div>
      )}

      {/* Trailing 30-Day Comparison & Recent Decisions */}
      <div className="grid grid-2" style={{ gap: '30px', marginBottom: '30px' }}>
        {/* Trailing 30-Day Metrics */}
        {monthOverMonthMetrics && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
              Trailing 30-Day Trends
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Comparing {monthOverMonthMetrics.currentPeriod.name} vs {monthOverMonthMetrics.previousPeriod.name}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* Issues Created */}
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                  Issues Created
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
                    {monthOverMonthMetrics.currentPeriod.issues}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: monthOverMonthMetrics.changes.issues >= 0 ? '#16A34A' : '#DC2626'
                  }}>
                    {monthOverMonthMetrics.changes.issues >= 0 ? '↑' : '↓'} {Math.abs(monthOverMonthMetrics.percentChanges.issues)}%
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  vs {monthOverMonthMetrics.previousPeriod.issues} previous period
                </div>
              </div>

              {/* Issues Completed */}
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                  Issues Completed
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--success)' }}>
                    {monthOverMonthMetrics.currentPeriod.completed}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: monthOverMonthMetrics.changes.completed >= 0 ? '#16A34A' : '#DC2626'
                  }}>
                    {monthOverMonthMetrics.changes.completed >= 0 ? '↑' : '↓'} {Math.abs(monthOverMonthMetrics.percentChanges.completed)}%
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  vs {monthOverMonthMetrics.previousPeriod.completed} previous period
                </div>
              </div>

              {/* Story Points */}
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                  Story Points
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
                    {monthOverMonthMetrics.currentPeriod.points}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: monthOverMonthMetrics.changes.points >= 0 ? '#16A34A' : '#DC2626'
                  }}>
                    {monthOverMonthMetrics.changes.points >= 0 ? '↑' : '↓'} {Math.abs(monthOverMonthMetrics.percentChanges.points)}%
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  vs {monthOverMonthMetrics.previousPeriod.points} previous period
                </div>
              </div>
            </div>

            {/* Trend Summary */}
            <div style={{ marginTop: '16px', padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
                30-Day Trend Summary
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {monthOverMonthMetrics.changes.completed > 0
                  ? `Delivery velocity increased by ${Math.abs(monthOverMonthMetrics.changes.completed)} issues in the last 30 days.`
                  : monthOverMonthMetrics.changes.completed < 0
                  ? `Delivery velocity decreased by ${Math.abs(monthOverMonthMetrics.changes.completed)} issues in the last 30 days.`
                  : 'Delivery velocity remained stable in the last 30 days.'}
                {' '}
                {monthOverMonthMetrics.changes.issues > 0 && `New scope increased by ${Math.abs(monthOverMonthMetrics.changes.issues)} issues.`}
              </div>
            </div>
          </div>
        )}

        {/* Recent Decisions */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
              Recent Decisions
            </h3>
            <div style={{
              padding: '4px 12px',
              background: '#DBEAFE',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#1E40AF'
            }}>
              {decisionsStats.recent30Days} this month
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Key strategic and technical decisions
          </div>

          {recentDecisions.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                No decisions recorded
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Track strategic decisions for better transparency
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentDecisions.slice(0, 5).map((decision, index) => {
                const impactColors = {
                  critical: '#DC2626',
                  high: '#F97316',
                  medium: '#EAB308',
                  low: '#10B981'
                }
                const impactColor = impactColors[decision.impact] || '#6B7280'

                return (
                  <div
                    key={decision.id}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${impactColor}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}>
                        {decision.title}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        color: impactColor,
                        marginLeft: '12px'
                      }}>
                        {decision.impact}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      {decision.description}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        background: '#E5E7EB',
                        borderRadius: '4px',
                        color: '#6B7280'
                      }}>
                        {decision.category}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        {decision.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Decision Stats */}
          {decisionsStats.total > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', gap: '16px' }}>
                <div>
                  <span style={{ fontWeight: '600' }}>Total:</span> {decisionsStats.total}
                </div>
                <div>
                  <span style={{ fontWeight: '600' }}>Active:</span> {decisionsStats.byStatus.active}
                </div>
                <div>
                  <span style={{ fontWeight: '600' }}>Implemented:</span> {decisionsStats.byStatus.implemented}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Performance Section */}
      {teamPerformance && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Team Performance & Workload
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Individual contributions, workload distribution, and burnout risks
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
                {teamPerformance.summary.activeMembers}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                active members
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Completed (30d)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--success)' }}>
                {teamPerformance.summary.totalCompleted}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Story Points
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>
                {teamPerformance.summary.totalStoryPoints}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Avg per Member
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--info)' }}>
                {teamPerformance.summary.avgVelocityPerMember}
              </div>
            </div>
            <div style={{ padding: '12px', background: teamPerformance.summary.membersAtRisk > 0 ? '#FEE2E2' : 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                At Risk
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: teamPerformance.summary.membersAtRisk > 0 ? '#DC2626' : 'var(--success)' }}>
                {teamPerformance.summary.membersAtRisk}
              </div>
            </div>
          </div>

          {/* Top Contributors */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              Top Contributors (Last 30 Days)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {teamPerformance.topContributors.slice(0, 5).map((contributor, index) => (
                <div
                  key={contributor.name}
                  style={{
                    padding: '12px',
                    background: index === 0 ? 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)' : 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: index === 0 ? '2px solid #F59E0B' : '1px solid var(--border-light)',
                    position: 'relative'
                  }}
                >
                  {index === 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '24px',
                      height: '24px',
                      background: '#F59E0B',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      🏆
                    </div>
                  )}
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {contributor.name}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#16A34A', marginBottom: '4px' }}>
                    {contributor.issuesCompleted}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                    issues completed
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {contributor.storyPoints} pts · {contributor.avgCycleTime}d avg
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Burnout Risks Alert */}
          {teamPerformance.burnoutRisks.length > 0 && (
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)',
              border: '2px solid #DC2626',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  fontSize: '24px',
                  width: '40px',
                  height: '40px',
                  background: '#DC2626',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  ⚠️
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#991B1B' }}>
                    Burnout Risk Alert
                  </div>
                  <div style={{ fontSize: '12px', color: '#DC2626' }}>
                    {teamPerformance.burnoutRisks.length} team member{teamPerformance.burnoutRisks.length !== 1 ? 's' : ''} at risk
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teamPerformance.burnoutRisks.map(risk => (
                  <div
                    key={risk.name}
                    style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${risk.riskLevel === 'high' ? '#DC2626' : risk.riskLevel === 'medium' ? '#F97316' : '#EAB308'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {risk.name}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: risk.riskLevel === 'high' ? '#DC2626' : risk.riskLevel === 'medium' ? '#F97316' : '#EAB308',
                        padding: '2px 8px',
                        background: risk.riskLevel === 'high' ? '#FEE2E2' : risk.riskLevel === 'medium' ? '#FFEDD5' : '#FEF3C7',
                        borderRadius: '4px'
                      }}>
                        {risk.riskLevel} risk
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      {risk.role} · {risk.openIssues} open · {risk.storyPoints} pts
                      {risk.overdueIssues > 0 && ` · ${risk.overdueIssues} overdue`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#DC2626' }}>
                      <strong>Factors:</strong> {risk.riskFactors.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workload Distribution */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              Current Workload Distribution
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teamPerformance.workloadDistribution.slice(0, 8).map(member => {
                const isOverloaded = member.openIssues > 10 || member.storyPoints > 30
                return (
                  <div
                    key={member.name}
                    style={{
                      padding: '10px 12px',
                      background: member.isOnLeave ? '#F3F4F6' : isOverloaded ? '#FEF3C7' : 'var(--bg-secondary)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: member.isOnLeave ? 0.6 : 1
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {member.name} {member.isOnLeave && '(On Leave)'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {member.role}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: isOverloaded ? '#D97706' : 'var(--primary)' }}>
                          {member.openIssues}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          open
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--info)' }}>
                          {member.storyPoints}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          points
                        </div>
                      </div>
                      {member.overdueIssues > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: '#DC2626' }}>
                            {member.overdueIssues}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                            overdue
                          </div>
                        </div>
                      )}
                      {member.avgIssueAge > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {member.avgIssueAge}d
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                            avg age
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

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
                  return isBlocker(i.labels || [])
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
