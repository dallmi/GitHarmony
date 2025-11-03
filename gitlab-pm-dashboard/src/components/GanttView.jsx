import React, { useMemo, useState } from 'react'
import { calculateEpicRAG, getHistoricalData } from '../services/ragAnalysisService'
import { isBlocked } from '../utils/labelUtils'
import { getPhaseLabel, getPhaseColor, detectIssuePhase } from '../services/cycleTimeService'

/**
 * Calculate issue progress percentage based on state and phase
 */
function getIssueProgressPercent(issue) {
  if (issue.state === 'closed') return 100

  const phase = detectIssuePhase(issue)
  if (phase === 'testing') return 85
  if (phase === 'review') return 70
  if (phase === 'inProgress') return 40
  if (phase === 'todo') return 5

  return 0
}

/**
 * Generate tooltip text explaining RAG status
 */
function generateRAGTooltip(analysis) {
  if (!analysis) return ''

  const lines = [`Status: ${analysis.status.toUpperCase()}`]
  lines.push(`Reason: ${analysis.reason}`)

  // Add top 2 factors
  if (analysis.factors.length > 0) {
    lines.push('') // blank line
    lines.push('Key Factors:')
    analysis.factors.slice(0, 2).forEach((factor, idx) => {
      lines.push(`${idx + 1}. ${factor.title}`)
      lines.push(`   ${factor.description}`)
    })
  }

  return lines.join('\n')
}

/**
 * Executive-Ready Gantt Chart
 * Epic-first view with RAG status, root cause analysis, and actionable insights
 */
export default function GanttView({ issues, epics: allEpics }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedQuarter, setSelectedQuarter] = useState('all')
  const [expandedEpics, setExpandedEpics] = useState(new Set())
  const [expandedDiagnostics, setExpandedDiagnostics] = useState(new Set())
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(true)

  // Get epics with issues, filtered by year
  const { epics, epicIssuesMap } = useMemo(() => {
    if (!allEpics || !issues) {
      return { epics: [], epicIssuesMap: new Map() }
    }

    const yearStart = new Date(selectedYear, 0, 1)
    const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59)

    const issuesMap = new Map()

    // Group issues by epic
    issues.forEach(issue => {
      const epicId = issue.epic?.id

      if (!epicId) return

      // Check if issue falls within selected year (by creation, due date, or milestone)
      const created = new Date(issue.created_at)
      const dueDate = issue.due_date ? new Date(issue.due_date) : null
      const milestoneDate = issue.milestone?.due_date ? new Date(issue.milestone.due_date) : null

      const inYear = (created >= yearStart && created <= yearEnd) ||
                     (dueDate && dueDate >= yearStart && dueDate <= yearEnd) ||
                     (milestoneDate && milestoneDate >= yearStart && milestoneDate <= yearEnd)

      if (!inYear) return

      if (!issuesMap.has(epicId)) {
        issuesMap.set(epicId, [])
      }
      issuesMap.get(epicId).push(issue)
    })

    // Filter epics that have issues in this year
    const filteredEpics = allEpics
      .filter(epic => issuesMap.has(epic.id))
      .filter(epic => {
        // Additional epic-level year filtering
        if (epic.start_date || epic.end_date) {
          const epicStart = epic.start_date ? new Date(epic.start_date) : null
          const epicEnd = epic.end_date ? new Date(epic.end_date) : null

          const epicInYear = (epicStart && epicStart >= yearStart && epicStart <= yearEnd) ||
                            (epicEnd && epicEnd >= yearStart && epicEnd <= yearEnd) ||
                            (epicStart && epicEnd && epicStart <= yearEnd && epicEnd >= yearStart)

          return epicInYear
        }
        return true // Include if no dates
      })

    return { epics: filteredEpics, epicIssuesMap: issuesMap }
  }, [allEpics, issues, selectedYear])

  // Calculate RAG status for each epic
  const epicAnalysis = useMemo(() => {
    const historicalData = getHistoricalData(issues.filter(i => i.state === 'closed'))
    const analysis = new Map()

    epics.forEach(epic => {
      const epicIssues = epicIssuesMap.get(epic.id) || []
      const rag = calculateEpicRAG(epic, epicIssues, historicalData)
      analysis.set(epic.id, rag)
    })

    return analysis
  }, [epics, epicIssuesMap, issues])

  // Executive summary stats
  const executiveSummary = useMemo(() => {
    const total = epics.length
    const red = Array.from(epicAnalysis.values()).filter(r => r.status === 'red').length
    const amber = Array.from(epicAnalysis.values()).filter(r => r.status === 'amber').length
    const green = Array.from(epicAnalysis.values()).filter(r => r.status === 'green').length

    const totalIssues = Array.from(epicIssuesMap.values()).flat().length
    const openIssues = Array.from(epicIssuesMap.values()).flat().filter(i => i.state === 'opened').length
    const closedIssues = totalIssues - openIssues
    const overallProgress = totalIssues > 0 ? (closedIssues / totalIssues) * 100 : 0

    return {
      total,
      red,
      amber,
      green,
      totalIssues,
      openIssues,
      closedIssues,
      overallProgress
    }
  }, [epics, epicAnalysis, epicIssuesMap])

  // Available years for filter
  const availableYears = useMemo(() => {
    const years = new Set()
    issues.forEach(issue => {
      const year = new Date(issue.created_at).getFullYear()
      years.add(year)
      if (issue.due_date) {
        years.add(new Date(issue.due_date).getFullYear())
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [issues])

  const toggleEpic = (epicId) => {
    const newExpanded = new Set(expandedEpics)
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId)
    } else {
      newExpanded.add(epicId)
    }
    setExpandedEpics(newExpanded)
  }

  const toggleDiagnostics = (epicId) => {
    const newExpanded = new Set(expandedDiagnostics)
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId)
    } else {
      newExpanded.add(epicId)
    }
    setExpandedDiagnostics(newExpanded)
  }

  const getRAGColor = (status) => {
    if (status === 'red') return '#EF4444'
    if (status === 'amber') return '#F59E0B'
    return '#10B981'
  }

  const getRAGBgColor = (status) => {
    if (status === 'red') return '#FEE2E2'
    if (status === 'amber') return '#FEF3C7'
    return '#D1FAE5'
  }

  const getRAGLabel = (status) => {
    if (status === 'red') return 'Critical'
    if (status === 'amber') return 'At Risk'
    return 'On Track'
  }

  // Timeline calculations for horizontal bars
  const timelineRange = useMemo(() => {
    const yearStart = new Date(selectedYear, 0, 1)
    const yearEnd = new Date(selectedYear, 11, 31)
    return { start: yearStart, end: yearEnd }
  }, [selectedYear])

  const getTimelinePosition = (startDate, endDate) => {
    if (!startDate || !endDate) return null

    const start = new Date(startDate)
    const end = new Date(endDate)
    const { start: yearStart, end: yearEnd } = timelineRange

    const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24)
    const startDays = Math.max(0, (start - yearStart) / (1000 * 60 * 60 * 24))
    const duration = (end - start) / (1000 * 60 * 60 * 24)

    return {
      left: `${Math.min(100, (startDays / totalDays) * 100)}%`,
      width: `${Math.max(2, Math.min(100 - (startDays / totalDays) * 100, (duration / totalDays) * 100))}%`
    }
  }

  const getTodayPosition = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to midnight for accurate calculation
    if (today.getFullYear() !== selectedYear) return null

    const { start: yearStart, end: yearEnd } = timelineRange
    const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24)
    const todayDays = (today - yearStart) / (1000 * 60 * 60 * 24)

    return `${(todayDays / totalDays) * 100}%`
  }

  const todayPosition = getTodayPosition()

  if (epics.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📅</div>
          <h3 className="mb-2">No Epics Found</h3>
          <p className="text-muted">
            {selectedYear !== new Date().getFullYear()
              ? `No epics with work in ${selectedYear}. Try selecting a different year.`
              : 'Add epics with start/end dates to see the executive Gantt chart.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid" style={{ padding: '20px' }}>
      {/* Header Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            Executive Gantt Chart
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Epic-level timeline with RAG status and risk analysis
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowExecutiveSummary(!showExecutiveSummary)}
            style={{
              padding: '8px 16px',
              background: showExecutiveSummary ? '#3B82F6' : 'white',
              color: showExecutiveSummary ? 'white' : '#1F2937',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            {showExecutiveSummary ? '▼' : '▶'} Executive Summary
          </button>
        </div>
      </div>

      {/* Executive Summary Panel */}
      {showExecutiveSummary && (
        <div className="card" style={{ marginBottom: '30px', background: '#F9FAFB', borderColor: '#E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            {selectedYear} Portfolio Health
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Epics</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937' }}>
                {executiveSummary.total}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#EF4444' }}>🔴 {executiveSummary.red}</span>
                <span style={{ color: '#F59E0B' }}>🟡 {executiveSummary.amber}</span>
                <span style={{ color: '#10B981' }}>🟢 {executiveSummary.green}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Issues</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937' }}>
                {executiveSummary.totalIssues}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                {executiveSummary.openIssues} open, {executiveSummary.closedIssues} closed
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Overall Progress</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937' }}>
                {executiveSummary.overallProgress.toFixed(0)}%
              </div>
              <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: `${executiveSummary.overallProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3B82F6, #10B981)',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Header */}
      <div className="card" style={{ marginBottom: '20px', overflow: 'visible', position: 'relative' }}>
        {/* Today marker - extended to cover all epic rows */}
        {todayPosition && (
          <div
            style={{
              position: 'absolute',
              left: `calc(350px + ${todayPosition})`,
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#EF4444',
              zIndex: 5,
              cursor: 'help'
            }}
            title={`Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
          >
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '-18px',
              fontSize: '10px',
              color: '#EF4444',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              background: 'white',
              padding: '2px 4px',
              borderRadius: '3px',
              border: '1px solid #EF4444',
              pointerEvents: 'none'
            }}>
              ↓ TODAY
            </div>
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', paddingBottom: '4px', marginBottom: '12px' }}>
          <div style={{ width: '350px', fontWeight: '600', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>
            Epic
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: '48px' }}>
            {/* Quarter Headers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>
              {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
                <div key={q} style={{ flex: 1, textAlign: 'center', borderRight: idx < 3 ? '1px dashed #D1D5DB' : 'none' }}>
                  {q} {selectedYear}
                </div>
              ))}
            </div>
            {/* Month Subdivisions */}
            <div style={{ display: 'flex', fontSize: '10px', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: '4px' }}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                <div
                  key={month}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    borderRight: idx < 11 ? '1px dotted #E5E7EB' : 'none',
                    padding: '2px 0'
                  }}
                >
                  {month}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Epic Rows */}
        {epics.map(epic => {
          const epicIssues = epicIssuesMap.get(epic.id) || []
          const analysis = epicAnalysis.get(epic.id)
          const isExpanded = expandedEpics.has(epic.id)
          const timelinePos = getTimelinePosition(epic.start_date, epic.end_date)

          const openIssues = epicIssues.filter(i => i.state === 'opened')
          const closedIssues = epicIssues.filter(i => i.state === 'closed')
          const inProgressIssues = openIssues.filter(i => {
            const phase = detectIssuePhase(i)
            return phase === 'inProgress' || phase === 'review' || phase === 'testing'
          })

          const progressPercent = analysis.metrics.progressPercent

          return (
            <div key={epic.id} style={{ marginBottom: '24px' }}>
              {/* Epic Header Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #E5E7EB'
              }}>
                {/* Epic Info */}
                <div style={{ width: '350px', paddingRight: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <button
                      onClick={() => toggleEpic(epic.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '0 4px',
                        color: '#6B7280'
                      }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <a
                          href={epic.web_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#1F2937',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                        >
                          {epic.title}
                        </a>

                        <div style={{
                          padding: '2px 8px',
                          background: getRAGBgColor(analysis.status),
                          color: getRAGColor(analysis.status),
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {getRAGLabel(analysis.status)}
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {closedIssues.length}/{epicIssues.length} closed
                        {' | '}
                        {openIssues.length} open
                        {inProgressIssues.length > 0 && ` | ${inProgressIssues.length} in progress`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Bar with Progress Fill */}
                <div style={{ flex: 1, position: 'relative', height: '40px' }}>
                  {timelinePos && (
                    <div
                      style={{
                        position: 'absolute',
                        left: timelinePos.left,
                        width: timelinePos.width,
                        height: '32px',
                        background: '#E5E7EB',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        border: `1px solid ${getRAGColor(analysis.status)}40`
                      }}
                      onClick={() => window.open(epic.web_url, '_blank')}
                      title={generateRAGTooltip(analysis)}
                    >
                      {/* Filled Progress Portion */}
                      <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${getRAGColor(analysis.status)}, ${getRAGColor(analysis.status)}DD)`,
                        transition: 'width 0.3s ease'
                      }} />
                      {/* Percentage Label */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{
                          color: progressPercent > 30 ? 'white' : '#1F2937',
                          fontSize: '12px',
                          fontWeight: '600',
                          textShadow: progressPercent > 30 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          padding: '0 8px'
                        }}>
                          {progressPercent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded: Issues List */}
              {isExpanded && (
                <div style={{
                  marginTop: '12px',
                  marginLeft: '32px',
                  paddingLeft: '16px',
                  borderLeft: '2px solid #E5E7EB'
                }}>
                  {epicIssues.slice(0, 10).map(issue => {
                    const issueProgress = getIssueProgressPercent(issue)
                    const issueTimelinePos = getTimelinePosition(
                      issue.created_at,
                      issue.due_date || issue.milestone?.due_date || epic.end_date
                    )
                    const phase = detectIssuePhase(issue)
                    const phaseColor = getPhaseColor(phase)

                    return (
                      <div
                        key={issue.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px solid #F3F4F6'
                        }}
                      >
                        {/* Issue Info */}
                        <div style={{ width: '318px', paddingRight: '16px' }}>
                          <a
                            href={issue.web_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '12px',
                              color: issue.state === 'closed' ? '#6B7280' : '#1F2937',
                              textDecoration: 'none',
                              display: 'block',
                              marginBottom: '4px',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                          >
                            #{issue.iid} {issue.title}
                          </a>
                          <div style={{ fontSize: '10px', color: '#6B7280' }}>
                            {issue.assignees?.[0]?.name || 'Unassigned'}
                            {' • '}
                            <span style={{ color: phaseColor, fontWeight: '600' }}>
                              {getPhaseLabel(phase)}
                            </span>
                          </div>
                        </div>

                        {/* Issue Timeline Bar */}
                        <div style={{ flex: 1, position: 'relative', height: '24px' }}>
                          {issueTimelinePos && (
                            <div
                              style={{
                                position: 'absolute',
                                left: issueTimelinePos.left,
                                width: issueTimelinePos.width,
                                height: '20px',
                                background: '#F3F4F6',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                border: `1px solid ${phaseColor}40`
                              }}
                              onClick={() => window.open(issue.web_url, '_blank')}
                              title={`${issue.title} - ${issueProgress}% complete`}
                            >
                              {/* Filled Progress Portion */}
                              <div style={{
                                width: `${issueProgress}%`,
                                height: '100%',
                                background: phaseColor,
                                transition: 'width 0.3s ease'
                              }} />
                              {/* Percentage Label */}
                              {issueProgress > 20 && (
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <span style={{
                                    color: issueProgress > 30 ? 'white' : '#1F2937',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    textShadow: issueProgress > 30 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                                  }}>
                                    {issueProgress}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {epicIssues.length > 10 && (
                    <div style={{
                      padding: '8px 0',
                      fontSize: '11px',
                      color: '#6B7280',
                      fontStyle: 'italic'
                    }}>
                      + {epicIssues.length - 10} more issues
                    </div>
                  )}
                </div>
              )}

              {/* Expanded: Diagnostics Panel (Collapsible) */}
              {isExpanded && analysis.factors.length > 0 && (
                <div style={{ marginTop: '12px', marginLeft: '32px' }}>
                  {/* Diagnostics Toggle Button */}
                  <button
                    onClick={() => toggleDiagnostics(epic.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1F2937',
                      width: '100%',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>⚠️</span>
                      <span>Analysis & Recommendations</span>
                      <span style={{ fontSize: '11px', fontWeight: '400', color: '#6B7280' }}>
                        ({analysis.factors.length} factors, {analysis.actions.length} actions)
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                      {expandedDiagnostics.has(epic.id) ? '▼' : '▶'}
                    </span>
                  </button>

                  {/* Diagnostics Content */}
                  {expandedDiagnostics.has(epic.id) && (
                <div style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  padding: '16px',
                  marginTop: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
                      Why {getRAGLabel(analysis.status)}?
                    </h4>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', marginBottom: '8px' }}>
                      🎯 Primary Issue: {analysis.reason}
                    </div>

                    {analysis.factors.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', marginTop: '12px', marginBottom: '8px' }}>
                          🔍 Contributing Factors:
                        </div>
                        {analysis.factors.slice(0, 3).map((factor, idx) => (
                          <div key={idx} style={{
                            padding: '10px',
                            background: 'white',
                            borderLeft: `3px solid ${factor.severity === 'critical' ? '#EF4444' : '#F59E0B'}`,
                            borderRadius: '4px',
                            marginBottom: '8px'
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                              {idx + 1}. [{factor.severity === 'critical' ? '🔴 Critical' : '🟡 Medium'}] {factor.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>
                              {factor.description}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', fontStyle: 'italic' }}>
                              Impact: {factor.impact}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {analysis.actions.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', marginBottom: '8px' }}>
                        💡 Recommended Actions:
                      </div>
                      {analysis.actions.slice(0, 3).map((action, idx) => (
                        <div key={idx} style={{
                          padding: '10px',
                          background: 'white',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          borderLeft: `3px solid ${action.priority === 'critical' ? '#EF4444' : action.priority === 'high' ? '#F59E0B' : '#3B82F6'}`
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                            {action.priority === 'critical' ? '✅ [Critical]' : action.priority === 'high' ? '⚠️ [High]' : '📋 [Medium]'} {action.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>
                            {action.description}
                          </div>
                          <div style={{ fontSize: '10px', color: '#6B7280' }}>
                            Effort: {action.estimatedEffort} • Impact: {action.impact}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {analysis.projection && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      background: analysis.projection.onTime ? '#D1FAE5' : '#FEE2E2',
                      borderRadius: '4px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: analysis.projection.onTime ? '#065F46' : '#991B1B' }}>
                        📈 Projection: {analysis.projection.onTime ? 'On time' : `${Math.abs(Math.round(analysis.projection.daysVariance))} days late`}
                      </div>
                      <div style={{ fontSize: '11px', color: analysis.projection.onTime ? '#065F46' : '#991B1B', marginTop: '2px' }}>
                        Expected completion: {analysis.projection.date.toLocaleDateString()} ({analysis.projection.iterationsNeeded} iterations at current velocity)
                      </div>
                    </div>
                  )}
                </div>
                  )}
                </div>
              )}

              {/* Old Issue Breakdown - REMOVED, replaced with new hierarchical view above */}
              {false && isExpanded && (
                <div style={{ marginLeft: '40px', marginTop: '12px' }}>
                  {/* Open Issues */}
                  {openIssues.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Open Issues ({openIssues.length})
                      </div>
                      {openIssues.slice(0, 5).map(issue => (
                        <div key={issue.id} style={{
                          padding: '8px',
                          background: '#F9FAFB',
                          borderRadius: '4px',
                          marginBottom: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <a
                            href={issue.web_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: '600' }}
                          >
                            #{issue.iid}
                          </a>
                          <span style={{ flex: 1, color: '#1F2937' }}>{issue.title}</span>
                          {isBlocked(issue.labels) && (
                            <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: '600' }}>🚫 BLOCKED</span>
                          )}
                          {issue.assignees?.[0] && (
                            <span style={{ color: '#6B7280', fontSize: '11px' }}>{issue.assignees[0].name}</span>
                          )}
                        </div>
                      ))}
                      {openIssues.length > 5 && (
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', fontStyle: 'italic' }}>
                          ... and {openIssues.length - 5} more open issues
                        </div>
                      )}
                    </div>
                  )}

                  {/* Closed Issues (collapsed by default) */}
                  {closedIssues.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#10B981', marginBottom: '8px' }}>
                        ✅ Closed ({closedIssues.length})
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
