import React, { useMemo, useState, useEffect } from 'react'
import {
  getCycleTimeStats,
  getPhaseDistribution,
  getAverageTimePerPhase,
  identifyBottlenecks,
  getLeadTimeDistribution,
  getControlChartData,
  getDetectedLabels,
  getIssueLifecycleData,
  exportCycleTimeToCSV,
  downloadCSV,
  getPhaseLabel,
  getPhaseColor
} from '../services/cycleTimeService'
import { getEnhancedCycleTimeStats } from '../services/enhancedCycleTimeService'
import useLabelEvents from '../hooks/useLabelEvents'
import { useIterationFilter } from '../contexts/IterationFilterContext'
import { checkPremiumFeatures } from '../services/gitlabApi'
import { loadConfig } from '../services/storageService'
import SearchBar from './SearchBar'
import { searchIssues } from '../utils/searchUtils'

/**
 * Cycle Time & Issue Lifecycle Analytics View
 * Shows how long issues spend in different phases
 */
export default function CycleTimeView({ issues: allIssues }) {
  // Use filtered issues from iteration context
  const { filteredIssues: issuesFromIteration } = useIterationFilter()
  const [selectedPhase, setSelectedPhase] = useState('all')
  const [showLabelConfig, setShowLabelConfig] = useState(false)
  const [premiumFeatures, setPremiumFeatures] = useState(null)
  const [checkingPremium, setCheckingPremium] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [controlChartMetric, setControlChartMetric] = useState('leadTime') // 'leadTime' or 'cycleTime'

  // Collapsible bottleneck analysis with persistent state
  const [isBottleneckCollapsed, setIsBottleneckCollapsed] = useState(() => {
    const saved = localStorage.getItem('cycleTime.bottleneckCollapsed')
    return saved === 'true'
  })

  const toggleBottleneck = () => {
    setIsBottleneckCollapsed(prev => {
      const newValue = !prev
      localStorage.setItem('cycleTime.bottleneckCollapsed', String(newValue))
      return newValue
    })
  }

  // Apply search filter on top of iteration filter
  const issues = useMemo(() => {
    if (!searchTerm) return issuesFromIteration
    return searchIssues(issuesFromIteration, searchTerm)
  }, [issuesFromIteration, searchTerm])

  // Fetch label events for enhanced cycle time tracking (GitLab Premium/Ultimate)
  const { labelEventsMap, loading: labelEventsLoading, hasData: hasLabelEvents } = useLabelEvents(issues)

  // Check for GitLab Premium features on mount
  useEffect(() => {
    async function checkPremium() {
      const config = loadConfig()
      if (!config) {
        setCheckingPremium(false)
        return
      }

      const features = await checkPremiumFeatures(
        config.gitlabUrl,
        config.projectId,
        config.token
      )
      setPremiumFeatures(features)
      setCheckingPremium(false)
    }

    checkPremium()
  }, [])

  const analytics = useMemo(() => {
    if (!issues || issues.length === 0) {
      return null
    }

    // Use enhanced cycle time if label events are available
    let cycleTimeStats
    if (hasLabelEvents && labelEventsMap) {
      cycleTimeStats = getEnhancedCycleTimeStats(issues, labelEventsMap)
      console.log('CycleTimeView: Using enhanced cycle time with label events:', {
        accurateCount: cycleTimeStats.accurateCount,
        estimatedCount: cycleTimeStats.estimatedCount
      })
    } else {
      cycleTimeStats = getCycleTimeStats(issues)
    }

    return {
      cycleTimeStats,
      phaseDistribution: getPhaseDistribution(issues),
      avgTimePerPhase: getAverageTimePerPhase(issues),
      bottlenecks: identifyBottlenecks(issues),
      leadTimeDistribution: getLeadTimeDistribution(issues),
      controlChartData: getControlChartData(issues, controlChartMetric),
      detectedLabels: getDetectedLabels(issues)
    }
  }, [issues, controlChartMetric, hasLabelEvents, labelEventsMap])

  const filteredIssues = useMemo(() => {
    if (!issues || selectedPhase === 'all') return issues

    return issues.filter(issue => {
      const lifecycle = getIssueLifecycleData(issue)
      return lifecycle.currentPhase === selectedPhase
    })
  }, [issues, selectedPhase])

  const handleExportCSV = () => {
    const csvContent = exportCycleTimeToCSV(issues)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csvContent, `cycle-time-report-${date}.csv`)
  }

  if (!analytics) {
    return (
      <div className="container">
        <div className="card text-center">
          <p>No data available</p>
        </div>
      </div>
    )
  }

  const openIssues = issues.filter(i => i.state === 'opened')
  const totalInProgress = Object.entries(analytics.phaseDistribution)
    .filter(([phase]) => phase !== 'done' && phase !== 'cancelled')
    .reduce((sum, [_, issuesList]) => sum + issuesList.length, 0)
  const totalCancelled = analytics.phaseDistribution.cancelled?.length || 0

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Cycle Time Analytics
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Issue lifecycle and workflow efficiency metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowLabelConfig(!showLabelConfig)}
          >
            🏷️ Detected Labels
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search issues by title, labels, assignees, epic, milestone, description..."
      />

      {/* Premium Feature Detection Status */}
      {!checkingPremium && premiumFeatures && (
        <div className="card" style={{
          marginBottom: '30px',
          background: premiumFeatures.hasLabelHistory ? '#D1FAE5' : '#FEF3C7',
          borderColor: premiumFeatures.hasLabelHistory ? '#10B981' : '#F59E0B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>
              {premiumFeatures.hasLabelHistory ? '✅' : 'ℹ️'}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: premiumFeatures.hasLabelHistory ? '#065F46' : '#92400E',
                marginBottom: '4px'
              }}>
                {premiumFeatures.hasLabelHistory
                  ? 'GitLab Premium/Ultimate Detected'
                  : 'GitLab Free/Community Edition Detected'}
              </h3>
              <p style={{
                fontSize: '12px',
                color: premiumFeatures.hasLabelHistory ? '#065F46' : '#92400E',
                margin: 0
              }}>
                {premiumFeatures.hasLabelHistory
                  ? '✓ Label history API available - Precise cycle time tracking enabled'
                  : '⚠ Using estimated cycle times. Upgrade to Premium/Ultimate for exact label-change history and more accurate metrics.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Avg Lead Time</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#3B82F6' }}>
            {analytics.cycleTimeStats.avgLeadTime}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            days (created → closed)
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Avg Cycle Time</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#8B5CF6' }}>
            {analytics.cycleTimeStats.avgCycleTime}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            days (work started → closed)
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Avg Wait Time</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#F59E0B' }}>
            {analytics.cycleTimeStats.avgWaitTime}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            days in backlog
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Median Lead Time</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#3B82F6' }}>
            {analytics.cycleTimeStats.medianLeadTime}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            days (50th percentile)
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Median Cycle Time</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#8B5CF6' }}>
            {analytics.cycleTimeStats.medianCycleTime}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            days (50th percentile)
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Completed Issues</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#10B981' }}>
            {analytics.cycleTimeStats.count}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            closed
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>In Progress</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#F59E0B' }}>
            {totalInProgress}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            currently active
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Cancelled</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#6B7280' }}>
            {totalCancelled}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            rejected/cancelled
          </div>
        </div>
      </div>

      {/* Label Detection Info */}
      {showLabelConfig && (
        <div className="card" style={{ marginBottom: '30px', background: '#F0F9FF', borderColor: '#BFDBFE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1E40AF' }}>
              🏷️ Detected Labels in Your Project
            </h3>
            <button
              onClick={() => setShowLabelConfig(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6B7280'
              }}
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#1E40AF', marginBottom: '16px' }}>
            Cycle time detection uses these labels to identify issue phases. If your labels don't match,
            the system will use fallback detection based on issue state.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {Object.entries(analytics.detectedLabels).map(([category, labels]) => (
              labels.length > 0 && (
                <div key={category}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1E40AF', marginBottom: '8px', textTransform: 'capitalize' }}>
                    {category} Labels
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {labels.map(label => (
                      <span key={label} style={{
                        padding: '4px 8px',
                        background: '#DBEAFE',
                        color: '#1E40AF',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Bottleneck Analysis */}
      {analytics.bottlenecks.length > 0 && (
        <div className="card" style={{ marginBottom: '30px', background: '#FEF3C7', borderColor: '#FCD34D' }}>
          <div
            onClick={toggleBottleneck}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              marginBottom: isBottleneckCollapsed ? '0' : '16px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400E', margin: 0 }}>
              ⚠️ Bottleneck Analysis
            </h3>
            <span style={{
              fontSize: '14px',
              color: '#92400E',
              transform: isBottleneckCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              display: 'inline-block'
            }}>
              ▼
            </span>
          </div>
          {!isBottleneckCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analytics.bottlenecks.map(bottleneck => (
              <div key={bottleneck.phase} style={{
                padding: '12px',
                background: 'white',
                borderRadius: '6px',
                borderLeft: `4px solid ${bottleneck.severity === 'high' ? '#DC2626' : bottleneck.severity === 'medium' ? '#F59E0B' : '#3B82F6'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                      {getPhaseLabel(bottleneck.phase)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {bottleneck.reason}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937' }}>
                        {bottleneck.count}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B7280' }}>issues</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#F59E0B' }}>
                        {bottleneck.avgTimeInPhase}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B7280' }}>avg days</div>
                    </div>
                  </div>
                </div>

                {/* Root Causes & Actions */}
                {(bottleneck.rootCauses?.length > 0 || bottleneck.recommendedActions?.length > 0) && (
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px', marginTop: '12px' }}>
                    {bottleneck.rootCauses?.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#92400E', marginBottom: '4px', textTransform: 'uppercase' }}>
                          🔍 Likely Root Cause:
                        </div>
                        {bottleneck.rootCauses.map((cause, idx) => (
                          <div key={idx} style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
                            • {cause}
                          </div>
                        ))}
                      </div>
                    )}

                    {bottleneck.recommendedActions?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#92400E', marginBottom: '4px', textTransform: 'uppercase' }}>
                          💡 Recommended Action:
                        </div>
                        {bottleneck.recommendedActions.map((action, idx) => (
                          <div key={idx} style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
                            • {action}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Phase Distribution */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Phase Distribution (Open Issues)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {Object.entries(analytics.phaseDistribution)
            .filter(([phase]) => phase !== 'done' && phase !== 'cancelled')
            .map(([phase, issuesList]) => (
              <div
                key={phase}
                onClick={() => setSelectedPhase(selectedPhase === phase ? 'all' : phase)}
                style={{
                  padding: '16px',
                  background: selectedPhase === phase ? getPhaseColor(phase) + '20' : '#F9FAFB',
                  borderRadius: '8px',
                  border: `2px solid ${selectedPhase === phase ? getPhaseColor(phase) : '#E5E7EB'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                  {getPhaseLabel(phase)}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: getPhaseColor(phase) }}>
                  {issuesList.length}
                </div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
                  {totalInProgress > 0 ? Math.round((issuesList.length / totalInProgress) * 100) : 0}% of open
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Average Time Per Phase (Estimates) */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
          Estimated Time Per Phase
        </h3>
        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
          Based on closed issues (averages). Note: These are estimates without full label history.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {Object.entries(analytics.avgTimePerPhase)
            .filter(([phase]) => phase !== 'total')
            .map(([phase, days]) => (
              <div key={phase} style={{ textAlign: 'center', padding: '12px', background: '#F9FAFB', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase' }}>
                  {getPhaseLabel(phase)}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: getPhaseColor(phase) }}>
                  {days}
                </div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>days avg</div>
              </div>
            ))}
        </div>
      </div>

      {/* Control Chart (Run Chart) */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
            Control Chart - {controlChartMetric === 'leadTime' ? 'Lead Time' : 'Cycle Time'} Trends
          </h3>
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '8px', padding: '4px' }}>
            <button
              onClick={() => setControlChartMetric('leadTime')}
              style={{
                padding: '6px 16px',
                background: controlChartMetric === 'leadTime' ? 'white' : 'transparent',
                color: controlChartMetric === 'leadTime' ? '#1F2937' : '#6B7280',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: controlChartMetric === 'leadTime' ? '600' : '400',
                cursor: 'pointer',
                boxShadow: controlChartMetric === 'leadTime' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Lead Time
            </button>
            <button
              onClick={() => setControlChartMetric('cycleTime')}
              style={{
                padding: '6px 16px',
                background: controlChartMetric === 'cycleTime' ? 'white' : 'transparent',
                color: controlChartMetric === 'cycleTime' ? '#1F2937' : '#6B7280',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: controlChartMetric === 'cycleTime' ? '600' : '400',
                cursor: 'pointer',
                boxShadow: controlChartMetric === 'cycleTime' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Cycle Time
            </button>
          </div>
        </div>

        {analytics.controlChartData.dataPoints.length > 0 ? (
          <>
            {/* Chart Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px', padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Average</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937' }}>{analytics.controlChartData.average}d</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Median (50th)</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#3B82F6' }}>{analytics.controlChartData.median}d</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>85th Percentile</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#8B5CF6' }}>{analytics.controlChartData.percentile85}d</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>95th Percentile</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#EF4444' }}>{analytics.controlChartData.percentile95}d</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Std Dev</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#6B7280' }}>{analytics.controlChartData.stdDev}d</div>
              </div>
            </div>

            {/* Control Chart Visualization */}
            <div style={{ position: 'relative', height: '450px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '20px' }}>
              {/* Y-axis labels and horizontal grid lines */}
              <div style={{ position: 'absolute', left: '0', top: '20px', bottom: '70px', width: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {[analytics.controlChartData.upperControlLimit, analytics.controlChartData.percentile95, analytics.controlChartData.average, analytics.controlChartData.lowerControlLimit].map((value, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#6B7280', textAlign: 'right', paddingRight: '8px' }}>
                    {value}d
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div style={{ position: 'absolute', left: '60px', right: '20px', top: '20px', bottom: '70px' }}>
                {/* Control limits and percentile lines */}
                {[
                  { value: analytics.controlChartData.upperControlLimit, color: '#EF4444', label: 'Upper Control Limit', dash: true },
                  { value: analytics.controlChartData.percentile95, color: '#F59E0B', label: '95th %ile', dash: false },
                  { value: analytics.controlChartData.percentile85, color: '#8B5CF6', label: '85th %ile', dash: false },
                  { value: analytics.controlChartData.median, color: '#3B82F6', label: 'Median', dash: false },
                  { value: analytics.controlChartData.average, color: '#10B981', label: 'Average', dash: false },
                  { value: analytics.controlChartData.lowerControlLimit, color: '#EF4444', label: 'Lower Control Limit', dash: true }
                ].map((line, i) => {
                  const maxValue = Math.max(analytics.controlChartData.upperControlLimit, ...analytics.controlChartData.dataPoints.map(dp => dp.value))
                  const yPosition = 100 - ((line.value / maxValue) * 100)
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${yPosition}%`,
                        height: '1px',
                        background: line.color,
                        borderTop: line.dash ? `2px dashed ${line.color}` : `1px solid ${line.color}`,
                        opacity: 0.6
                      }}
                      title={`${line.label}: ${line.value} days`}
                    />
                  )
                })}

                {/* Data points */}
                {analytics.controlChartData.dataPoints.map((point, index) => {
                  const maxValue = Math.max(analytics.controlChartData.upperControlLimit, ...analytics.controlChartData.dataPoints.map(dp => dp.value))
                  const xPosition = (index / (analytics.controlChartData.dataPoints.length - 1)) * 100
                  const yPosition = 100 - ((point.value / maxValue) * 100)
                  const isOutlier = point.value > analytics.controlChartData.upperControlLimit || point.value < analytics.controlChartData.lowerControlLimit

                  return (
                    <div
                      key={index}
                      onClick={() => window.open(point.issue.web_url, '_blank')}
                      style={{
                        position: 'absolute',
                        left: `${xPosition}%`,
                        top: `${yPosition}%`,
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isOutlier ? '#EF4444' : '#3B82F6',
                        border: '2px solid white',
                        cursor: 'pointer',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.5)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%)'
                      }}
                      title={`#${point.issue.iid}: ${point.issue.title}\n${point.value} days (${point.dateStr})`}
                    />
                  )
                })}
              </div>

              {/* X-axis date labels */}
              <div style={{ position: 'absolute', left: '60px', right: '20px', bottom: '0px', height: '40px' }}>
                {(() => {
                  const dataPoints = analytics.controlChartData.dataPoints
                  if (dataPoints.length === 0) return null

                  // Calculate time span
                  const firstDate = dataPoints[0].date
                  const lastDate = dataPoints[dataPoints.length - 1].date
                  const daysDiff = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24))

                  // Determine time indicator and label interval
                  let timeIndicator = ''
                  let labelInterval = 1
                  let dateFormat = {}

                  if (daysDiff <= 7) {
                    timeIndicator = 'Daily View'
                    labelInterval = 1
                    dateFormat = { month: 'short', day: 'numeric' }
                  } else if (daysDiff <= 31) {
                    timeIndicator = 'Weekly View'
                    labelInterval = Math.ceil(dataPoints.length / 7)
                    dateFormat = { month: 'short', day: 'numeric' }
                  } else if (daysDiff <= 90) {
                    timeIndicator = 'Monthly View'
                    labelInterval = Math.ceil(dataPoints.length / 12)
                    dateFormat = { month: 'short', day: 'numeric' }
                  } else if (daysDiff <= 365) {
                    timeIndicator = 'Quarterly View'
                    labelInterval = Math.ceil(dataPoints.length / 16)
                    dateFormat = { month: 'short', year: 'numeric' }
                  } else {
                    timeIndicator = 'Yearly View'
                    labelInterval = Math.ceil(dataPoints.length / 20)
                    dateFormat = { month: 'short', year: 'numeric' }
                  }

                  // Generate labels
                  const labels = []

                  // Always show first date
                  labels.push(
                    <div
                      key={0}
                      style={{
                        position: 'absolute',
                        left: '0%',
                        fontSize: '10px',
                        color: '#6B7280',
                        transform: 'translateX(0)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {dataPoints[0].date.toLocaleDateString('de-DE', dateFormat)}
                    </div>
                  )

                  // Show intermediate labels
                  for (let i = labelInterval; i < dataPoints.length - 1; i += labelInterval) {
                    const xPos = (i / (dataPoints.length - 1)) * 100
                    labels.push(
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: `${xPos}%`,
                          fontSize: '10px',
                          color: '#6B7280',
                          transform: 'translateX(-50%)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {dataPoints[i].date.toLocaleDateString('de-DE', dateFormat)}
                      </div>
                    )
                  }

                  // Always show last date
                  labels.push(
                    <div
                      key={dataPoints.length - 1}
                      style={{
                        position: 'absolute',
                        right: '0%',
                        fontSize: '10px',
                        color: '#6B7280',
                        transform: 'translateX(0)',
                        whiteSpace: 'nowrap',
                        textAlign: 'right'
                      }}
                    >
                      {dataPoints[dataPoints.length - 1].date.toLocaleDateString('de-DE', dateFormat)}
                    </div>
                  )

                  return (
                    <>
                      <div style={{ position: 'relative', height: '18px', marginTop: '4px' }}>
                        {labels}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center', marginTop: '2px', fontStyle: 'italic' }}>
                        {timeIndicator} ({daysDiff} days span)
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3B82F6' }} />
                <span style={{ color: '#6B7280' }}>Normal Issue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ color: '#6B7280' }}>Outlier (Outside Control Limits)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '2px', background: '#10B981' }} />
                <span style={{ color: '#6B7280' }}>Average</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '2px', background: '#3B82F6' }} />
                <span style={{ color: '#6B7280' }}>Median</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '2px', background: '#8B5CF6' }} />
                <span style={{ color: '#6B7280' }}>85th Percentile</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '2px', background: '#F59E0B' }} />
                <span style={{ color: '#6B7280' }}>95th Percentile</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '2px', borderTop: '2px dashed #EF4444' }} />
                <span style={{ color: '#6B7280' }}>Control Limits (±3σ)</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            Not enough closed issues to generate control chart
          </div>
        )}
      </div>

      {/* Lead Time Distribution */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Lead Time Distribution (Closed Issues)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(analytics.leadTimeDistribution).map(([bucket, count]) => {
            const maxCount = Math.max(...Object.values(analytics.leadTimeDistribution))
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0

            return (
              <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ minWidth: '90px', fontSize: '12px', color: '#6B7280' }}>
                  {bucket}
                </div>
                <div style={{ flex: 1, height: '24px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: '#6B7280',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ minWidth: '40px', fontSize: '14px', fontWeight: '600', color: '#1F2937', textAlign: 'right' }}>
                  {count}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Issue List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
            Issue Lifecycle Details
            {selectedPhase !== 'all' && ` - ${getPhaseLabel(selectedPhase)}`}
          </h3>
          {selectedPhase !== 'all' && (
            <button
              onClick={() => setSelectedPhase('all')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              Show All
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                  Issue
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                  Phase
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                  Lead Time
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                  Cycle Time
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                  Time in Phase
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                  Assignees
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.slice(0, 50).map(issue => {
                const lifecycle = getIssueLifecycleData(issue)
                return (
                  <tr
                    key={issue.id}
                    onClick={() => window.open(issue.web_url, '_blank')}
                    style={{
                      borderBottom: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
                          #{lifecycle.iid}
                        </span>
                        <span style={{ fontSize: '13px', color: '#1F2937' }}>
                          {lifecycle.title}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        background: getPhaseColor(lifecycle.currentPhase) + '20',
                        color: getPhaseColor(lifecycle.currentPhase),
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {getPhaseLabel(lifecycle.currentPhase)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                      {lifecycle.leadTime}d
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#8B5CF6' }}>
                      {lifecycle.cycleTime !== null ? `${lifecycle.cycleTime}d` : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
                      {lifecycle.timeInCurrentPhase}d
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#6B7280' }}>
                      {lifecycle.assignees.length > 0
                        ? lifecycle.assignees.map(a => a.name).join(', ')
                        : 'Unassigned'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#6B7280' }}>
                      {new Date(lifecycle.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredIssues.length > 50 && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#6B7280', background: '#F9FAFB' }}>
              Showing first 50 of {filteredIssues.length} issues
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
