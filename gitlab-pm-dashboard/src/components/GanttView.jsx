import React, { useMemo, useState } from 'react'
import { calculateEpicRAG, getHistoricalData } from '../services/ragAnalysisService'
import { isBlocked } from '../utils/labelUtils'
import { getPhaseLabel, getPhaseColor, detectIssuePhase } from '../services/cycleTimeService'
import { buildEpicHierarchy } from '../services/crossProjectLinkingService'

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
 * Now includes cross-project child issues inline when expanding epics
 */
export default function GanttView({ issues, epics: allEpics, crossProjectData }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedQuarters, setSelectedQuarters] = useState([1, 2, 3, 4]) // Array of selected quarters (1-4)
  const [expandedEpics, setExpandedEpics] = useState(new Set()) // For showing issues
  const [expandedChildEpics, setExpandedChildEpics] = useState(new Set()) // For showing child epics
  const [expandedDiagnostics, setExpandedDiagnostics] = useState(new Set())
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(true)
  const [selectedPhases, setSelectedPhases] = useState([]) // Empty = show all phases
  const [issuesPerEpic, setIssuesPerEpic] = useState(new Map()) // Track how many issues to show per epic (default: 20)

  // Quarter selection handler - consecutive quarters only
  const handleQuarterToggle = (quarter, event) => {
    // Check if Ctrl (or Cmd on Mac) is pressed
    const isCtrlPressed = event.ctrlKey || event.metaKey

    if (!isCtrlPressed) {
      // Without Ctrl: replace selection with just this quarter
      setSelectedQuarters([quarter])
    } else {
      // With Ctrl: multi-select behavior
      if (selectedQuarters.includes(quarter)) {
        // Clicking an already selected quarter: shrink selection
        if (selectedQuarters.length === 1) return // Don't deselect the last one

        // Remove from start or end to maintain consecutiveness
        if (quarter === Math.min(...selectedQuarters)) {
          setSelectedQuarters(selectedQuarters.filter(q => q !== quarter))
        } else if (quarter === Math.max(...selectedQuarters)) {
          setSelectedQuarters(selectedQuarters.filter(q => q !== quarter))
        }
      } else {
        // Add to selection maintaining consecutiveness
        const newQuarters = [...selectedQuarters, quarter].sort((a, b) => a - b)
        // Fill gaps to ensure consecutive quarters
        const min = Math.min(...newQuarters)
        const max = Math.max(...newQuarters)
        const consecutive = []
        for (let q = min; q <= max; q++) {
          consecutive.push(q)
        }
        setSelectedQuarters(consecutive)
      }
    }
  }

  const handleFullYearToggle = () => {
    setSelectedQuarters([1, 2, 3, 4])
  }

  const handlePhaseToggle = (phase) => {
    setSelectedPhases(prev => {
      if (prev.includes(phase)) {
        return prev.filter(p => p !== phase)
      } else {
        return [...prev, phase]
      }
    })
  }

  const handleClearPhaseFilters = () => {
    setSelectedPhases([])
  }

  const handleLoadMoreIssues = (epicId) => {
    setIssuesPerEpic(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(epicId) || 20
      newMap.set(epicId, current + 10)
      return newMap
    })
  }

  // Calculate date range based on selected quarters
  const timelineRange = useMemo(() => {
    const minQuarter = Math.min(...selectedQuarters)
    const maxQuarter = Math.max(...selectedQuarters)

    // Quarter to month mapping: Q1=0-2, Q2=3-5, Q3=6-8, Q4=9-11
    const startMonth = (minQuarter - 1) * 3
    const endMonth = maxQuarter * 3 - 1

    const start = new Date(selectedYear, startMonth, 1)
    start.setHours(0, 0, 0, 0)

    const end = new Date(selectedYear, endMonth + 1, 0) // Last day of end month
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }, [selectedYear, selectedQuarters])

  // Determine granularity based on quarter selection
  const granularity = useMemo(() => {
    const quarterCount = selectedQuarters.length
    if (quarterCount === 4) return 'year' // Full year: show quarters + months
    if (quarterCount >= 2) return 'quarter' // 2-3 quarters: show months + weeks
    return 'month' // 1 quarter: show weeks + days
  }, [selectedQuarters])

  // Get epics with issues, filtered by date range
  const { epics, epicIssuesMap, rootEpics, epicMap, normalizeId } = useMemo(() => {
    if (!allEpics || !issues) {
      return { epics: [], epicIssuesMap: new Map() }
    }

    // Helper to normalize ID (handle string/number mismatch from GitLab API)
    const normalizeId = (id) => id != null ? Number(id) : null

    const rangeStart = timelineRange.start
    const rangeEnd = timelineRange.end

    const issuesMap = new Map()

    // DEBUG: Log all issues with epic assignments to find epic 81's issues
    const issuesWithEpic81 = issues.filter(i => normalizeId(i.epic?.id) === 81)
    console.log('=== EPIC 81 ISSUE INVESTIGATION ===')
    console.log('Issues with epic.id = 81:', issuesWithEpic81.map(i => ({
      id: i.id,
      iid: i.iid,
      title: i.title?.substring(0, 40),
      epicId: normalizeId(i.epic?.id),
      epicTitle: i.epic?.title,
      created_at: i.created_at,
      due_date: i.due_date,
      milestone: i.milestone?.title
    })))
    console.log('Date range:', { rangeStart: rangeStart.toISOString(), rangeEnd: rangeEnd.toISOString() })

    // Group issues by epic
    issues.forEach(issue => {
      const epicId = normalizeId(issue.epic?.id)

      if (!epicId) return

      // Find the parent epic to check its dates too
      const parentEpic = allEpics.find(e => normalizeId(e.id) === epicId)
      const epicStart = parentEpic?.start_date ? new Date(parentEpic.start_date) : null
      const epicEnd = parentEpic?.end_date ? new Date(parentEpic.end_date) : null

      // Check if issue falls within selected date range (by creation, due date, milestone, OR parent epic dates)
      const created = new Date(issue.created_at)
      const dueDate = issue.due_date ? new Date(issue.due_date) : null
      const milestoneDate = issue.milestone?.due_date ? new Date(issue.milestone.due_date) : null

      const inRange = (created >= rangeStart && created <= rangeEnd) ||
                      (dueDate && dueDate >= rangeStart && dueDate <= rangeEnd) ||
                      (milestoneDate && milestoneDate >= rangeStart && milestoneDate <= rangeEnd) ||
                      // Also include if parent epic falls within the time range
                      (epicStart && epicStart >= rangeStart && epicStart <= rangeEnd) ||
                      (epicEnd && epicEnd >= rangeStart && epicEnd <= rangeEnd) ||
                      // Also include if epic spans across the time range
                      (epicStart && epicEnd && epicStart <= rangeEnd && epicEnd >= rangeStart)

      // DEBUG: Log epic 81 issues specifically
      if (epicId === 81) {
        console.log('Epic 81 issue check:', {
          issueId: issue.iid,
          title: issue.title?.substring(0, 30),
          created: created.toISOString(),
          dueDate: dueDate?.toISOString(),
          milestoneDate: milestoneDate?.toISOString(),
          epicStart: epicStart?.toISOString(),
          epicEnd: epicEnd?.toISOString(),
          inRange,
          parentEpicFound: !!parentEpic
        })
      }

      if (!inRange) return

      if (!issuesMap.has(epicId)) {
        issuesMap.set(epicId, [])
      }
      issuesMap.get(epicId).push(issue)
    })

    // Filter epics that have issues in this date range OR are parents of such epics
    const epicsWithIssues = new Set(issuesMap.keys())

    // Also include parent epics of epics that have issues (so hierarchy is complete)
    allEpics.forEach(epic => {
      const normalizedEpicId = normalizeId(epic.id)
      const normalizedParentId = normalizeId(epic.parent_id)
      if (epicsWithIssues.has(normalizedEpicId) && normalizedParentId) {
        // Find all ancestors
        let currentParentId = normalizedParentId
        while (currentParentId) {
          epicsWithIssues.add(currentParentId)
          const parentEpic = allEpics.find(e => normalizeId(e.id) === currentParentId)
          currentParentId = normalizeId(parentEpic?.parent_id)
        }
      }
    })

    const filteredEpics = allEpics
      .filter(epic => epicsWithIssues.has(normalizeId(epic.id)))
      .filter(epic => {
        // Additional epic-level date range filtering
        if (epic.start_date || epic.end_date) {
          const epicStart = epic.start_date ? new Date(epic.start_date) : null
          const epicEnd = epic.end_date ? new Date(epic.end_date) : null

          const epicInRange = (epicStart && epicStart >= rangeStart && epicStart <= rangeEnd) ||
                              (epicEnd && epicEnd >= rangeStart && epicEnd <= rangeEnd) ||
                              (epicStart && epicEnd && epicStart <= rangeEnd && epicEnd >= rangeStart)

          return epicInRange
        }
        return true // Include if no dates
      })

    // DEBUG: Log filtering steps
    console.log('=== EPIC HIERARCHY DEBUG ===')
    console.log('1. All epics from API:', allEpics.map(e => ({ id: e.id, parent_id: e.parent_id, title: e.title })))
    console.log('2. Issues grouped by epic ID:', Array.from(issuesMap.entries()).map(([id, issues]) => ({ epicId: id, issueCount: issues.length })))
    console.log('3. Epics with issues (Set):', Array.from(epicsWithIssues))
    console.log('4. Filtered epics (after date filter):', filteredEpics.map(e => ({ id: e.id, parent_id: e.parent_id, title: e.title })))

    // Build hierarchy from filtered epics
    const { rootEpics, epicMap } = buildEpicHierarchy(filteredEpics)

    console.log('5. Root epics:', rootEpics.map(e => ({ id: e.id, title: e.title, childrenCount: e.children?.length })))
    console.log('6. Epic map entries:', Array.from(epicMap.entries()).map(([id, e]) => ({ id, title: e.title, parent_id: e.parent_id, level: e.level })))
    console.log('=== END DEBUG ===')

    // Return epics with normalized IDs from epicMap for consistency
    const normalizedEpics = Array.from(epicMap.values())

    return { epics: normalizedEpics, epicIssuesMap: issuesMap, rootEpics, epicMap, normalizeId }
  }, [allEpics, issues, timelineRange])

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

  // Available years for filter - include both issues and epics
  const availableYears = useMemo(() => {
    const years = new Set()

    // Add years from issues
    issues.forEach(issue => {
      const year = new Date(issue.created_at).getFullYear()
      years.add(year)
      if (issue.due_date) {
        years.add(new Date(issue.due_date).getFullYear())
      }
    })

    // Add years from epics
    epics.forEach(epic => {
      if (epic.start_date) {
        years.add(new Date(epic.start_date).getFullYear())
      }
      if (epic.due_date) {
        years.add(new Date(epic.due_date).getFullYear())
      }
      if (epic.created_at) {
        years.add(new Date(epic.created_at).getFullYear())
      }
    })

    // Always include current year and next year to ensure future planning
    const currentYear = new Date().getFullYear()
    years.add(currentYear)
    years.add(currentYear + 1)

    return Array.from(years).sort((a, b) => b - a)
  }, [issues, epics])

  const toggleEpic = (epicId) => {
    const newExpanded = new Set(expandedEpics)
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId)
    } else {
      newExpanded.add(epicId)
    }
    setExpandedEpics(newExpanded)
  }

  const toggleChildEpics = (epicId) => {
    const newExpanded = new Set(expandedChildEpics)
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId)
    } else {
      newExpanded.add(epicId)
    }
    setExpandedChildEpics(newExpanded)
  }

  /**
   * Get all issues for an epic, including cross-project children
   * @param {string} epicId - Epic ID
   * @returns {Array} Array of issues with metadata about cross-project status
   */
  const getAllIssuesForEpic = (epicId) => {
    // Get issues from current project
    const localIssues = (epicIssuesMap.get(epicId) || []).map(issue => ({
      ...issue,
      _isCrossProject: false,
      _sourceProject: null
    }))

    // Get cross-project issues if available
    let crossProjectIssues = []
    if (crossProjectData && crossProjectData.epicToIssuesMap) {
      const allIssuesForEpic = crossProjectData.epicToIssuesMap.get(epicId) || []

      // Filter out issues we already have locally and mark others as cross-project
      crossProjectIssues = allIssuesForEpic
        .filter(issue => !localIssues.some(local => local.id === issue.id))
        .map(issue => ({
          ...issue,
          _isCrossProject: true,
          _sourceProject: issue._projectName || issue._projectId || 'Other Project'
        }))
    }

    // Combine and sort by created date
    return [...localIssues, ...crossProjectIssues].sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    )
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

  // Timeline position calculations for horizontal bars
  const getTimelinePosition = (startDate, endDate) => {
    if (!startDate || !endDate) return null

    const start = new Date(startDate)
    const end = new Date(endDate)
    const { start: rangeStart, end: rangeEnd } = timelineRange

    const totalDays = (rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)
    const startDays = Math.max(0, (start - rangeStart) / (1000 * 60 * 60 * 24))
    const duration = (end - start) / (1000 * 60 * 60 * 24)

    return {
      left: `${Math.min(100, (startDays / totalDays) * 100)}%`,
      width: `${Math.max(2, Math.min(100 - (startDays / totalDays) * 100, (duration / totalDays) * 100))}%`
    }
  }

  const getTodayPosition = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to midnight for accurate calculation

    // Check if today falls within the selected range
    if (today < timelineRange.start || today > timelineRange.end) return null

    const { start: yearStart, end: yearEnd } = timelineRange
    const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24)
    const todayDays = (today - yearStart) / (1000 * 60 * 60 * 24)

    return `${(todayDays / totalDays) * 100}%`
  }

  const todayPosition = getTodayPosition()

  // Recursive function to render epic with hierarchy
  const renderEpicRow = (epicData, level = 0) => {
    // epicData comes from epicMap, so it has children, level, etc.
    const epic = epicData
    const epicIssues = epicIssuesMap.get(epic.id) || []
    const analysis = epicAnalysis.get(epic.id)

    // Safety check - if no analysis, skip this epic
    if (!analysis) return null

    const isExpanded = expandedEpics.has(epic.id)
    const isChildrenExpanded = expandedChildEpics.has(epic.id)
    const timelinePos = getTimelinePosition(epic.start_date, epic.end_date)
    const hasChildren = epic.children && epic.children.length > 0

    const openIssues = epicIssues.filter(i => i.state === 'opened')
    const closedIssues = epicIssues.filter(i => i.state === 'closed')
    const inProgressIssues = openIssues.filter(i => {
      const phase = detectIssuePhase(i)
      return phase === 'inProgress' || phase === 'review' || phase === 'testing'
    })

    const progressPercent = analysis.metrics.progressPercent
    const indentPx = level * 24 // 24px per level

    return (
      <div key={epic.id} style={{ marginBottom: level === 0 ? '24px' : '8px' }}>
        {/* Epic Header Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 0',
          paddingLeft: `${indentPx}px`,
          borderBottom: '1px solid #E5E7EB',
          background: level > 0 ? '#FAFBFC' : 'transparent'
        }}>
          {/* Epic Info */}
          <div style={{ width: `${350 - indentPx}px`, paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              {/* Child epics toggle button */}
              {hasChildren && (
                <button
                  onClick={() => toggleChildEpics(epic.id)}
                  style={{
                    background: '#E0E7FF',
                    border: '1px solid #A5B4FC',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px 6px',
                    color: '#4F46E5',
                    fontWeight: '600',
                    marginRight: '4px'
                  }}
                  title={isChildrenExpanded ? 'Collapse child epics' : `Show ${epic.children.length} child epic(s)`}
                >
                  {isChildrenExpanded ? '−' : '+'}{epic.children.length}
                </button>
              )}

              {/* Issues toggle button */}
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
                title={isExpanded ? 'Collapse issues' : 'Show issues'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  {/* Level indicator for child epics */}
                  {level > 0 && (
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      background: '#E0E7FF',
                      color: '#4F46E5',
                      borderRadius: '3px',
                      fontWeight: '600'
                    }}>
                      L{level}
                    </span>
                  )}

                  <a
                    href={epic.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: level === 0 ? '14px' : '13px',
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
                  {hasChildren && (
                    <span style={{ color: '#4F46E5', fontWeight: '500' }}>
                      {' | '}{epic.children.length} sub-epic{epic.children.length > 1 ? 's' : ''}
                    </span>
                  )}
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
                  height: level === 0 ? '32px' : '26px',
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
                    fontSize: level === 0 ? '12px' : '11px',
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

        {/* Child Epics (hierarchical) */}
        {hasChildren && isChildrenExpanded && (
          <div style={{
            marginLeft: `${indentPx + 16}px`,
            borderLeft: '3px solid #A5B4FC',
            paddingLeft: '8px',
            marginTop: '4px'
          }}>
            {epic.children.map(childEpic => renderEpicRow(childEpic, level + 1))}
          </div>
        )}

        {/* Expanded: Issues List (including cross-project children) */}
        {isExpanded && (() => {
          const allIssues = getAllIssuesForEpic(epic.id)
          const localCount = allIssues.filter(i => !i._isCrossProject).length
          const crossProjectCount = allIssues.filter(i => i._isCrossProject).length

          return (
            <div style={{
              marginTop: '12px',
              marginLeft: `${indentPx + 32}px`,
              paddingLeft: '16px',
              borderLeft: '2px solid #E5E7EB'
            }}>
              {/* Info header if there are cross-project issues */}
              {crossProjectCount > 0 && (
                <div style={{
                  padding: '8px 12px',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: '#1E40AF'
                }}>
                  <strong>Showing {localCount} local + {crossProjectCount} cross-project issues</strong>
                  <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>
                    Cross-project issues are highlighted with a blue left border
                  </div>
                </div>
              )}

              {(() => {
                // Apply phase filter
                const filteredIssues = selectedPhases.length === 0
                  ? allIssues
                  : allIssues.filter(issue => selectedPhases.includes(detectIssuePhase(issue)))

                // Get limit for this epic
                const limit = issuesPerEpic.get(epic.id) || 20
                const visibleIssues = filteredIssues.slice(0, limit)
                const hasMore = filteredIssues.length > limit

                return (
                  <>
                    {visibleIssues.map(issue => {
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
                            paddingLeft: issue._isCrossProject ? '12px' : '0',
                            borderBottom: '1px solid #F3F4F6',
                            borderLeft: issue._isCrossProject ? '4px solid #3B82F6' : 'none',
                            background: issue._isCrossProject ? '#F0F9FF' : 'transparent',
                            marginLeft: issue._isCrossProject ? '-12px' : '0',
                            borderRadius: issue._isCrossProject ? '4px' : '0'
                          }}
                        >
                          {/* Issue Info */}
                          <div style={{ width: `${318 - indentPx}px`, paddingRight: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <a
                                href={issue.web_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '12px',
                                  color: issue.state === 'closed' ? '#6B7280' : '#1F2937',
                                  textDecoration: 'none',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  flex: 1
                                }}
                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                              >
                                #{issue.iid} {issue.title}
                              </a>
                              {issue._isCrossProject && (
                                <span style={{
                                  fontSize: '9px',
                                  padding: '2px 5px',
                                  background: '#3B82F6',
                                  color: 'white',
                                  borderRadius: '3px',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap'
                                }} title={`From: ${issue._sourceProject}`}>
                                  {issue._sourceProject}
                                </span>
                              )}
                            </div>
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
                    {hasMore && (
                      <button
                        onClick={() => handleLoadMoreIssues(epic.id)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          marginTop: '8px',
                          background: '#F3F4F6',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#3B82F6',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#E5E7EB'
                          e.currentTarget.style.borderColor = '#3B82F6'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#F3F4F6'
                          e.currentTarget.style.borderColor = '#D1D5DB'
                        }}
                      >
                        Load +10 More Issues ({filteredIssues.length - limit} remaining)
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          )
        })()}

        {/* Expanded: Diagnostics Panel (Collapsible) */}
        {isExpanded && analysis.factors.length > 0 && (
          <div style={{ marginTop: '12px', marginLeft: `${indentPx + 32}px` }}>
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
                      Expected completion: {analysis.projection.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} ({analysis.projection.iterationsNeeded} iterations at current velocity)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (epics.length === 0) {
    return (
      <div className="container-fluid" style={{ padding: '20px' }}>
        {/* Header Controls - Always visible even when no epics */}
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

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            {/* Year Selector */}
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

            {/* Quarter Tiles Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Time Range</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4].map(quarter => {
                  const isSelected = selectedQuarters.includes(quarter)
                  return (
                    <button
                      key={quarter}
                      onClick={(e) => handleQuarterToggle(quarter, e)}
                      style={{
                        padding: '8px 16px',
                        background: isSelected ? '#3B82F6' : 'white',
                        color: isSelected ? 'white' : '#374151',
                        border: isSelected ? 'none' : '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: isSelected ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        minWidth: '48px'
                      }}
                    >
                      Q{quarter}
                    </button>
                  )
                })}
                <button
                  onClick={handleFullYearToggle}
                  style={{
                    padding: '8px 16px',
                    background: selectedQuarters.length === 4 ? '#10B981' : 'white',
                    color: selectedQuarters.length === 4 ? 'white' : '#374151',
                    border: selectedQuarters.length === 4 ? 'none' : '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: selectedQuarters.length === 4 ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Full Year
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* No Epics Message */}
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <h3 className="mb-2">No Epics Found</h3>
          <p className="text-muted">
            {selectedQuarters.length === 4
              ? `No epics with work in ${selectedYear}. Try selecting a different year or time range.`
              : `No epics with work in ${selectedYear} Q${Math.min(...selectedQuarters)}${selectedQuarters.length > 1 ? `-Q${Math.max(...selectedQuarters)}` : ''}. Try selecting a different time range.`}
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

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Year Selector */}
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

          {/* Quarter Tiles Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Time Range</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4].map(quarter => {
                const isSelected = selectedQuarters.includes(quarter)

                return (
                  <button
                    key={quarter}
                    onClick={(e) => handleQuarterToggle(quarter, e)}
                    style={{
                      padding: '8px 16px',
                      background: isSelected ? '#3B82F6' : 'white',
                      color: isSelected ? 'white' : '#374151',
                      border: isSelected ? 'none' : '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: isSelected ? '600' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      minWidth: '48px'
                    }}
                    title={`Quarter ${quarter}`}
                  >
                    Q{quarter}
                  </button>
                )
              })}
              <button
                onClick={handleFullYearToggle}
                style={{
                  padding: '8px 16px',
                  background: selectedQuarters.length === 4 ? '#10B981' : 'white',
                  color: selectedQuarters.length === 4 ? 'white' : '#374151',
                  border: selectedQuarters.length === 4 ? 'none' : '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: selectedQuarters.length === 4 ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="View full year"
              >
                Full Year
              </button>
            </div>
          </div>

          {/* Phase Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Filter by Status</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '400px' }}>
              {['backlog', 'inProgress', 'review', 'testing', 'awaitingRelease', 'blocked', 'done'].map(phase => {
                const isSelected = selectedPhases.includes(phase)
                const phaseColor = getPhaseColor(phase)
                return (
                  <button
                    key={phase}
                    onClick={() => handlePhaseToggle(phase)}
                    style={{
                      padding: '6px 12px',
                      background: isSelected ? phaseColor : 'white',
                      color: isSelected ? 'white' : '#374151',
                      border: isSelected ? 'none' : '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: isSelected ? '600' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
                    }}
                    title={`Filter ${getPhaseLabel(phase)} issues`}
                  >
                    {getPhaseLabel(phase)}
                  </button>
                )
              })}
              {selectedPhases.length > 0 && (
                <button
                  onClick={handleClearPhaseFilters}
                  style={{
                    padding: '6px 12px',
                    background: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title="Clear all filters"
                >
                  Clear ({selectedPhases.length})
                </button>
              )}
            </div>
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
            {selectedYear} {selectedQuarters.length === 4 ? 'Portfolio Health' :
              selectedQuarters.length === 1 ? `Q${selectedQuarters[0]} Portfolio Health` :
              `Q${Math.min(...selectedQuarters)}-Q${Math.max(...selectedQuarters)} Portfolio Health`}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Epics</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#1F2937' }}>
                {executiveSummary.total}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#EF4444' }}>Red: {executiveSummary.red}</span>
                <span style={{ color: '#F59E0B' }}>Amber: {executiveSummary.amber}</span>
                <span style={{ color: '#10B981' }}>Green: {executiveSummary.green}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Issues</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#1F2937' }}>
                {executiveSummary.totalIssues}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                {executiveSummary.openIssues} open, {executiveSummary.closedIssues} closed
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Overall Progress</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#1F2937' }}>
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
              left: `calc(350px + (100% - 350px) * ${parseFloat(todayPosition) / 100})`,
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#EF4444',
              zIndex: 5,
              cursor: 'help'
            }}
            title={`Today: ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
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
            {/* Adaptive Timeline Headers based on granularity */}
            {granularity === 'year' && (
              <>
                {/* Full Year View: Quarter Headers */}
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
              </>
            )}

            {granularity === 'quarter' && (() => {
              // 2-3 Quarters View: Month Headers + Week Subdivisions
              const startMonth = (Math.min(...selectedQuarters) - 1) * 3
              const endMonth = Math.max(...selectedQuarters) * 3 - 1
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              const months = []
              for (let m = startMonth; m <= endMonth; m++) {
                months.push({ name: monthNames[m], index: m })
              }

              // Calculate weeks for the entire range
              const weeks = []
              let currentDate = new Date(timelineRange.start)
              while (currentDate <= timelineRange.end) {
                weeks.push(new Date(currentDate))
                currentDate.setDate(currentDate.getDate() + 7)
              }

              return (
                <>
                  {/* Month Headers */}
                  <div style={{ display: 'flex', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>
                    {months.map((month, idx) => (
                      <div key={month.index} style={{ flex: 1, textAlign: 'center', borderRight: idx < months.length - 1 ? '1px dashed #D1D5DB' : 'none' }}>
                        {month.name}
                      </div>
                    ))}
                  </div>
                  {/* Week Subdivisions */}
                  <div style={{ display: 'flex', fontSize: '9px', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: '4px' }}>
                    {weeks.map((week, idx) => (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          borderRight: idx < weeks.length - 1 ? '1px dotted #E5E7EB' : 'none',
                          padding: '2px 0',
                          fontSize: '9px'
                        }}
                        title={week.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      >
                        {week.getDate()}/{week.getMonth() + 1}
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}

            {granularity === 'month' && (() => {
              // 1 Quarter View: Week Headers + Day subdivisions
              const weeks = []
              let currentDate = new Date(timelineRange.start)
              while (currentDate <= timelineRange.end) {
                weeks.push(new Date(currentDate))
                currentDate.setDate(currentDate.getDate() + 7)
              }

              return (
                <>
                  {/* Week Headers */}
                  <div style={{ display: 'flex', fontSize: '11px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>
                    {weeks.map((week, idx) => (
                      <div key={idx} style={{ flex: 1, textAlign: 'center', borderRight: idx < weeks.length - 1 ? '1px dashed #D1D5DB' : 'none' }}>
                        Week {idx + 1}
                      </div>
                    ))}
                  </div>
                  {/* Date Labels (start of each week) */}
                  <div style={{ display: 'flex', fontSize: '9px', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: '4px' }}>
                    {weeks.map((week, idx) => (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          borderRight: idx < weeks.length - 1 ? '1px dotted #E5E7EB' : 'none',
                          padding: '2px 0'
                        }}
                      >
                        {week.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Epic Rows - Hierarchical rendering */}
        {rootEpics.map(rootEpic => renderEpicRow(rootEpic, 0))}
      </div>
    </div>
  )
}
