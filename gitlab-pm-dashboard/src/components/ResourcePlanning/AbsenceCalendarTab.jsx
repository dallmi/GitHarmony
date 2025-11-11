import React, { useState, useMemo, useRef, useEffect } from 'react'
import { loadTeamConfig } from '../../services/teamConfigService'
import {
  loadAbsences,
  loadAllProjectAbsences,
  addAbsence,
  removeAbsence,
  getUserAbsences,
  calculateSprintCapacityWithAbsences,
  getTeamAbsenceStats,
  exportAbsencesToCSV,
  calculateWorkingDays
} from '../../services/absenceService'
import { getUniqueIterations } from '../../services/velocityService'
import { getIterationName } from '../../utils/labelUtils'

/**
 * Absence Calendar Tab
 * Interactive Gantt-style absence planning (tab component for Resource Planning)
 */
export default function AbsenceCalendarTab({ issues, isCrossProject, refreshKey, onAbsenceUpdate }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [absences, setAbsences] = useState([])
  const [monthsToView, setMonthsToView] = useState(3) // 1-12 months
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-11
  const [dragState, setDragState] = useState(null) // { username, startDate }
  const [selectedAbsence, setSelectedAbsence] = useState(null)
  const [selectedAbsenceType, setSelectedAbsenceType] = useState('vacation') // vacation, training, sick, other
  const scrollContainerRef = useRef(null)

  // Absence type configurations
  const absenceTypes = [
    { id: 'vacation', label: 'Vacation', color: '#3B82F6', bgColor: '#DBEAFE' },
    { id: 'training', label: 'Training', color: '#8B5CF6', bgColor: '#EDE9FE' },
    { id: 'sick', label: 'Sick Leave', color: '#F59E0B', bgColor: '#FEF3C7' },
    { id: 'other', label: 'Other', color: '#6B7280', bgColor: '#F3F4F6' }
  ]

  // Load data - reload when refreshKey changes (from parent)
  useEffect(() => {
    const config = loadTeamConfig()
    setTeamMembers(config.teamMembers || [])
    refreshAbsences()
  }, [refreshKey])

  const refreshAbsences = () => {
    if (isCrossProject) {
      // In cross-project mode, load all absences from all projects
      const allAbsences = loadAllProjectAbsences()
      setAbsences(allAbsences)
    } else {
      // In single project mode, load only this project's absences
      const data = loadAbsences()
      setAbsences(data.absences || [])
    }
  }

  // Calculate date range based on selected year, month, and months to view
  const dateRange = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1)
    const end = new Date(selectedYear, selectedMonth + monthsToView, 0) // Last day of last month

    return { start, end }
  }, [selectedYear, selectedMonth, monthsToView])

  // Generate days array for the date range
  const days = useMemo(() => {
    const result = []
    const current = new Date(dateRange.start)

    while (current <= dateRange.end) {
      result.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return result
  }, [dateRange])

  // Get sprints in the date range
  const sprints = useMemo(() => {
    if (!issues) return []

    const iterations = getUniqueIterations(issues)
    return iterations
      .map(name => {
        const issue = issues.find(i => getIterationName(i.iteration) === name)
        return {
          name,
          id: issue?.iteration?.id || name,
          startDate: issue?.iteration?.start_date ? new Date(issue.iteration.start_date) : null,
          dueDate: issue?.iteration?.due_date ? new Date(issue.iteration.due_date) : null
        }
      })
      .filter(s => s.startDate && s.dueDate)
      .filter(s => s.startDate <= dateRange.end && s.dueDate >= dateRange.start)
      .sort((a, b) => a.startDate - b.startDate)
  }, [issues, dateRange])

  // Handle date cell click - start absence selection
  const handleDateClick = (username, date) => {
    // Disable editing in cross-project mode
    if (isCrossProject) {
      return
    }

    if (dragState) {
      // End drag - create absence
      const startDate = dragState.startDate < date ? dragState.startDate : date
      const endDate = dragState.startDate < date ? date : dragState.startDate

      addAbsence(dragState.username, startDate, endDate, 'Absence', selectedAbsenceType)
      refreshAbsences()
      onAbsenceUpdate()
      setDragState(null)
    } else {
      // Start drag
      setDragState({ username, startDate: date })
    }
  }

  // Handle mouse enter during drag
  const handleDateEnter = (username, date) => {
    if (dragState && dragState.username === username) {
      // Update drag preview
      setDragState({ ...dragState, currentDate: date })
    }
  }

  // Cancel drag
  const handleCancelDrag = () => {
    setDragState(null)
  }

  // Delete absence
  const handleDeleteAbsence = (absenceId) => {
    removeAbsence(absenceId)
    refreshAbsences()
    onAbsenceUpdate()
    setSelectedAbsence(null)
  }

  // Check if a date is within an absence
  const isDateInAbsence = (username, date, excludeId = null) => {
    return absences.some(a =>
      a.username === username &&
      a.id !== excludeId &&
      date >= a.startDate &&
      date <= a.endDate
    )
  }

  // Check if date is in drag selection
  const isDateInDragSelection = (username, date) => {
    if (!dragState || dragState.username !== username) return false

    const currentDate = dragState.currentDate || dragState.startDate
    const start = dragState.startDate < currentDate ? dragState.startDate : currentDate
    const end = dragState.startDate < currentDate ? currentDate : dragState.startDate

    return date >= start && date <= end
  }

  // Get absence for a date
  const getAbsenceForDate = (username, date) => {
    return absences.find(a =>
      a.username === username &&
      date >= a.startDate &&
      date <= a.endDate
    )
  }

  // Is weekend
  const isWeekend = (date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  // Export absences
  const handleExport = () => {
    const csv = exportAbsencesToCSV(dateRange.start, dateRange.end)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `absences-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Calculate team stats
  const teamStats = useMemo(() => {
    return getTeamAbsenceStats(teamMembers, dateRange.start, dateRange.end)
  }, [teamMembers, absences, dateRange])

  // Group days by month for column headers
  const monthGroups = useMemo(() => {
    const groups = []
    let currentMonth = null
    let dayCount = 0

    days.forEach(day => {
      const monthKey = `${day.getFullYear()}-${day.getMonth()}`
      if (monthKey !== currentMonth) {
        if (currentMonth !== null) {
          groups.push({ ...groups[groups.length - 1], dayCount })
        }
        currentMonth = monthKey
        dayCount = 1
        groups.push({
          year: day.getFullYear(),
          month: day.getMonth(),
          monthName: day.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          dayCount: 0
        })
      } else {
        dayCount++
      }
    })

    if (groups.length > 0) {
      groups[groups.length - 1].dayCount = dayCount
    }

    return groups
  }, [days])

  if (teamMembers.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
        <h3 style={{ color: '#374151', marginBottom: '8px' }}>No Team Members</h3>
        <p style={{ color: '#6B7280' }}>
          Please add team members in the Team Setup tab first.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>

        {/* Compact Controls - Single Row */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          {/* Year Selector - Compact */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginRight: '4px' }}>Year</span>
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              style={{
                padding: '4px 8px',
                background: 'white',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151'
              }}
            >
              ◀
            </button>
            <span style={{ fontSize: '16px', fontWeight: '700', minWidth: '60px', textAlign: 'center', color: '#1F2937' }}>
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              style={{
                padding: '4px 8px',
                background: 'white',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151'
              }}
            >
              ▶
            </button>
          </div>

          {/* Month Selector - Inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedMonth(idx)}
                style={{
                  padding: '4px 8px',
                  background: selectedMonth === idx ? '#3B82F6' : 'white',
                  color: selectedMonth === idx ? 'white' : '#374151',
                  border: selectedMonth === idx ? 'none' : '1px solid #D1D5DB',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: selectedMonth === idx ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {month}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '24px', background: '#D1D5DB' }} />

          {/* Months to View - Compact */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginRight: '4px' }}>Months</span>
            {[1, 2, 3, 6, 9, 12].map(months => (
              <button
                key={months}
                onClick={() => setMonthsToView(months)}
                style={{
                  padding: '4px 8px',
                  background: monthsToView === months ? '#3B82F6' : 'white',
                  color: monthsToView === months ? 'white' : '#374151',
                  border: monthsToView === months ? 'none' : '1px solid #D1D5DB',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: monthsToView === months ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  minWidth: '28px'
                }}
              >
                {months}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Export */}
          <button
            onClick={handleExport}
            style={{
              padding: '6px 14px',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Export CSV</span>
          </button>
        </div>

        {/* Absence Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Absence Type</span>
          {absenceTypes.map(type => (
            <button
              key={type.id}
              onClick={() => {
                if (!isCrossProject) {
                  setSelectedAbsenceType(type.id)
                }
              }}
              disabled={isCrossProject}
              style={{
                padding: '6px 14px',
                background: selectedAbsenceType === type.id ? type.color : 'white',
                color: selectedAbsenceType === type.id ? 'white' : type.color,
                border: selectedAbsenceType === type.id ? `2px solid ${type.color}` : `1px solid ${type.color}`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: isCrossProject ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: isCrossProject ? 0.5 : 1,
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isCrossProject && selectedAbsenceType !== type.id) {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="card" style={{ marginBottom: '20px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>TOTAL ABSENCES</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>
              {teamStats.totalAbsences}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>DAYS OFF</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563EB' }}>
              {teamStats.totalDaysOff}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>CAPACITY IMPACT</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626' }}>
              {teamStats.totalHoursImpact}h
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {dragState && (
        <div className="card" style={{ marginBottom: '20px', background: '#EFF6FF', border: '1px solid #3B82F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>👆</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#1E40AF' }}>Selecting absence period</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1E40AF' }}>
                Click on another date to complete the selection, or press ESC to cancel
              </p>
            </div>
            <button
              onClick={handleCancelDrag}
              style={{
                padding: '6px 12px',
                background: 'white',
                border: '1px solid #3B82F6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                color: '#1E40AF'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div
        ref={scrollContainerRef}
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          background: 'white'
        }}
        onMouseLeave={handleCancelDrag}
      >
        <div style={{ minWidth: `${Math.max(1200, days.length * 24)}px` }}>
          {/* Header Row - Month Groups */}
          <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 10 }}>
            {/* Team Member Column Header */}
            <div style={{
              width: '200px',
              minWidth: '200px',
              padding: '12px',
              fontWeight: '600',
              fontSize: '12px',
              color: '#6B7280',
              borderRight: '2px solid #E5E7EB',
              background: '#F9FAFB',
              position: 'sticky',
              left: 0,
              zIndex: 11
            }}>
              TEAM MEMBER
            </div>

            {/* Month Groups */}
            <div style={{ display: 'flex', flex: 1 }}>
              {monthGroups.map((group, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${group.dayCount * 24}px`,
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: '12px',
                    color: '#1F2937',
                    borderRight: idx < monthGroups.length - 1 ? '1px solid #D1D5DB' : 'none'
                  }}
                >
                  {group.monthName}
                </div>
              ))}
            </div>
          </div>

          {/* Header Row - Day Numbers */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
            <div style={{
              width: '200px',
              minWidth: '200px',
              borderRight: '2px solid #E5E7EB',
              background: '#FAFAFA',
              position: 'sticky',
              left: 0,
              zIndex: 9
            }} />
            <div style={{ display: 'flex', flex: 1 }}>
              {days.map((day, idx) => {
                const isWknd = isWeekend(day)
                return (
                  <div
                    key={idx}
                    style={{
                      width: '24px',
                      minWidth: '24px',
                      padding: '4px 0',
                      textAlign: 'center',
                      fontSize: '10px',
                      color: isWknd ? '#DC2626' : '#6B7280',
                      fontWeight: isWknd ? '600' : '400',
                      background: isWknd ? '#FEF2F2' : 'transparent'
                    }}
                  >
                    {day.getDate()}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sprint Overlay Row */}
          {sprints.length > 0 && (
            <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F0F9FF', height: '24px' }}>
              <div style={{
                width: '200px',
                minWidth: '200px',
                borderRight: '2px solid #E5E7EB',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: '600',
                color: '#1E40AF',
                background: '#F0F9FF',
                position: 'sticky',
                left: 0,
                zIndex: 9
              }}>
                SPRINTS
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                {sprints.map((sprint, idx) => {
                  const sprintStartIndex = days.findIndex(d => d >= sprint.startDate)
                  const sprintEndIndex = days.findIndex(d => d > sprint.dueDate)
                  const endIdx = sprintEndIndex === -1 ? days.length : sprintEndIndex
                  const width = (endIdx - sprintStartIndex) * 24

                  if (sprintStartIndex === -1 || width <= 0) return null

                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${sprintStartIndex * 24}px`,
                        width: `${width}px`,
                        height: '20px',
                        background: '#DBEAFE',
                        border: '1px solid #3B82F6',
                        borderRadius: '4px',
                        fontSize: '9px',
                        padding: '2px 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#1E40AF',
                        fontWeight: '600'
                      }}
                      title={sprint.name}
                    >
                      {sprint.name}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Member Rows */}
          {teamMembers.map((member, memberIdx) => {
            const memberAbsences = absences.filter(a => a.username === member.username)

            return (
              <div
                key={member.username}
                style={{
                  display: 'flex',
                  borderBottom: memberIdx < teamMembers.length - 1 ? '1px solid #E5E7EB' : 'none'
                }}
              >
                {/* Member Info */}
                <div style={{
                  width: '200px',
                  minWidth: '200px',
                  padding: '12px',
                  borderRight: '2px solid #E5E7EB',
                  background: 'white',
                  position: 'sticky',
                  left: 0,
                  zIndex: 8
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937', marginBottom: '2px' }}>
                    {member.name || member.username}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>
                    {member.role || 'Team Member'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>
                    {member.defaultCapacity !== undefined && member.defaultCapacity !== null ? member.defaultCapacity : 40}h/week
                  </div>
                </div>

                {/* Day Cells */}
                <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                  {days.map((day, dayIdx) => {
                    const isWknd = isWeekend(day)
                    const isInAbsence = isDateInAbsence(member.username, day)
                    const isInDrag = isDateInDragSelection(member.username, day)
                    const absence = getAbsenceForDate(member.username, day)

                    // Get the color for the selected absence type
                    const selectedTypeColor = absenceTypes.find(t => t.id === selectedAbsenceType)?.bgColor || '#DBEAFE'

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => !isInAbsence && !isCrossProject && handleDateClick(member.username, day)}
                        onMouseEnter={() => !isCrossProject && handleDateEnter(member.username, day)}
                        style={{
                          width: '24px',
                          minWidth: '24px',
                          height: '60px',
                          background: isInDrag ? selectedTypeColor :
                                      isInAbsence ? '#FEE2E2' :
                                      isWknd ? '#F9FAFB' :
                                      'white',
                          borderRight: dayIdx < days.length - 1 ? '1px solid #F3F4F6' : 'none',
                          cursor: isCrossProject ? 'default' : (isInAbsence ? 'pointer' : 'crosshair'),
                          position: 'relative',
                          opacity: isCrossProject ? 0.7 : 1
                        }}
                        title={absence ? `${absence.reason} (${absence.type})` : (isCrossProject ? 'Select a project to edit absences' : '')}
                      />
                    )
                  })}

                  {/* Absence Blocks Overlay */}
                  {memberAbsences.map((absence, absIdx) => {
                    const startIdx = days.findIndex(d => d >= absence.startDate)
                    const endIdx = days.findIndex(d => d > absence.endDate)
                    const end = endIdx === -1 ? days.length : endIdx
                    const width = (end - startIdx) * 24

                    if (startIdx === -1 || width <= 0) return null

                    const typeColors = {
                      vacation: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
                      training: { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6' },
                      sick: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
                      other: { bg: '#F3F4F6', border: '#6B7280', text: '#374151' }
                    }

                    const colors = typeColors[absence.type] || typeColors.other

                    return (
                      <div
                        key={absIdx}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isCrossProject) {
                            setSelectedAbsence(absence)
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: `${startIdx * 24}px`,
                          top: '8px',
                          width: `${width}px`,
                          height: '44px',
                          background: colors.bg,
                          border: `2px solid ${colors.border}`,
                          borderRadius: '6px',
                          padding: '4px 6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: colors.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: isCrossProject ? 'default' : 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          zIndex: 5,
                          opacity: isCrossProject ? 0.7 : 1
                        }}
                        title={isCrossProject
                          ? `${absence.reason || absence.type} (Project: ${absence._projectId || 'default'})\nRead-only in cross-project view`
                          : `${absence.reason || absence.type}\nClick to edit`
                        }
                      >
                        {absence.reason || absence.type}
                        {isCrossProject && absence._projectId && (
                          <span style={{ fontSize: '9px', opacity: 0.7, marginLeft: '4px' }}>
                            [{absence._projectId}]
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Absence Detail Modal */}
      {selectedAbsence && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedAbsence(null)}
        >
          <div
            className="card"
            style={{
              width: '400px',
              maxWidth: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '16px' }}>Absence Details</h3>

            <div style={{ marginBottom: '12px' }}>
              <strong>Team Member:</strong> {selectedAbsence.username}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Period:</strong> {selectedAbsence.startDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {selectedAbsence.endDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Type:</strong> {selectedAbsence.type}
            </div>
            {selectedAbsence.reason && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Reason:</strong> {selectedAbsence.reason}
              </div>
            )}
            <div style={{ marginBottom: '12px' }}>
              <strong>Working Days:</strong> {(() => {
                const member = teamMembers.find(m => m.username === selectedAbsence.username)
                const days = calculateWorkingDays(selectedAbsence.startDate, selectedAbsence.endDate)
                return days
              })()}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Capacity Impact:</strong> {(() => {
                const member = teamMembers.find(m => m.username === selectedAbsence.username)
                const memberCapacity = member?.defaultCapacity !== undefined && member?.defaultCapacity !== null ? member.defaultCapacity : 40
                const days = calculateWorkingDays(selectedAbsence.startDate, selectedAbsence.endDate)
                const dailyCapacity = memberCapacity / 5
                const impact = Math.round(days * dailyCapacity * 10) / 10
                return `${impact}h`
              })()}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => handleDeleteAbsence(selectedAbsence.id)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#DC2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedAbsence(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#F3F4F6',
                  color: '#1F2937',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card" style={{ marginTop: '20px', background: '#F9FAFB' }}>
        <h4 style={{ marginBottom: '12px' }}>How to use</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
          <li>Click on a day to start marking an absence</li>
          <li>Click on another day to complete the absence period</li>
          <li>Click on an existing absence to view details or delete</li>
          <li>Weekends are automatically excluded from capacity calculations</li>
          <li>Absences automatically reduce sprint capacity based on affected days</li>
        </ul>
      </div>
    </div>
  )
}
