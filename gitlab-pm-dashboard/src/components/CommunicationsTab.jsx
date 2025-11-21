import React, { useState, useMemo } from 'react'
import {
  COMMUNICATION_TYPES,
  logCommunication,
  saveDecision,
  getCommunicationType
} from '../services/stakeholderService'

/**
 * Unified Communications Tab
 * Combines all communication types including decisions
 * Timeline view as default with creation mode
 */
export default function CommunicationsTab({
  history,
  stakeholders,
  onHistoryUpdate,
  onStakeholderSelect
}) {
  const [viewMode, setViewMode] = useState('timeline') // 'timeline' or 'create'
  const [timelineView, setTimelineView] = useState('list') // 'list' or 'gantt'
  const [filterType, setFilterType] = useState('all')
  const [filterDateRange, setFilterDateRange] = useState('all') // all, today, week, month
  const [searchQuery, setSearchQuery] = useState('')
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [ganttRange, setGanttRange] = useState({ start: null, end: null })

  // Gantt specific filters
  const [ganttYear, setGanttYear] = useState(new Date().getFullYear())
  const [ganttQuarters, setGanttQuarters] = useState([1, 2, 3, 4]) // All quarters by default

  // Form state - simplified with progressive disclosure
  const [communicationForm, setCommunicationForm] = useState({
    type: 'email',
    // Basic fields (always shown)
    title: '',
    date: new Date().toISOString().slice(0, 16),
    priority: 'medium', // low, medium, high, critical

    // Common fields
    description: '',
    stakeholderIds: [],
    linkedIssues: [],
    linkedEpics: [],

    // Type-specific fields
    // Email
    from: '',
    to: '',
    cc: '',
    subject: '',
    body: '',

    // Decision
    decisionDate: new Date().toISOString().split('T')[0],
    approvedBy: [],
    documentUrl: '',
    documentVersion: '',

    // Meeting
    attendees: '',
    meetingNotes: '',
    actionItems: '',

    // Incident
    severity: 'medium',
    itoTicketNumber: '',
    itoTicketLink: '',
    resolution: '',
    resolutionDate: '',

    // Advanced fields (collapsed by default)
    tags: [],
    attachments: [],
    supersedes: '',
    timeImpact: '',
    rootCause: ''
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  // Filter history based on current filters
  const filteredHistory = useMemo(() => {
    let filtered = [...history]

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType)
    }

    // Date range filter
    if (filterDateRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()

      switch (filterDateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoff.setDate(cutoff.getDate() - 7)
          break
        case 'month':
          cutoff.setMonth(cutoff.getMonth() - 1)
          break
      }

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.sentAt || item.createdAt)
        return itemDate >= cutoff
      })
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => {
        return (
          (item.subject && item.subject.toLowerCase().includes(query)) ||
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.content && item.content.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query))
        )
      })
    }

    return filtered
  }, [history, filterType, filterDateRange, searchQuery])

  // Group history by date for timeline view
  const groupedHistory = useMemo(() => {
    const groups = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    filteredHistory.forEach(item => {
      const itemDate = new Date(item.sentAt || item.createdAt)
      let groupKey

      if (itemDate >= today) {
        groupKey = 'Today'
      } else if (itemDate >= yesterday) {
        groupKey = 'Yesterday'
      } else {
        groupKey = itemDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
    })

    // Sort groups by date (most recent first)
    const sortedGroups = Object.entries(groups).sort((a, b) => {
      if (a[0] === 'Today') return -1
      if (b[0] === 'Today') return 1
      if (a[0] === 'Yesterday') return -1
      if (b[0] === 'Yesterday') return 1
      return new Date(b[0]) - new Date(a[0])
    })

    return sortedGroups
  }, [filteredHistory])

  const handleSubmit = () => {
    const form = communicationForm

    // Build communication object based on type
    const communication = {
      type: form.type,
      sentAt: new Date(form.date).toISOString(),
      priority: form.priority,
      stakeholderIds: form.stakeholderIds,
      linkedIssues: form.linkedIssues,
      linkedEpics: form.linkedEpics,
      tags: form.tags,
      attachments: form.attachments
    }

    // Add type-specific fields
    switch (form.type) {
      case 'email':
        communication.subject = form.subject
        communication.content = form.body
        communication.from = form.from
        communication.to = form.to
        communication.cc = form.cc
        break

      case 'decision':
        communication.title = form.title
        communication.description = form.description
        communication.decisionDate = form.decisionDate
        communication.approvedBy = form.approvedBy
        communication.documentUrl = form.documentUrl
        communication.documentVersion = form.documentVersion
        break

      case 'meeting_notes':
        communication.title = form.title
        communication.content = form.meetingNotes
        communication.attendees = form.attendees
        communication.actionItems = form.actionItems
        break

      case 'incident':
        communication.title = form.title
        communication.description = form.description
        communication.severity = form.severity
        communication.itoTicketNumber = form.itoTicketNumber
        communication.itoTicketLink = form.itoTicketLink
        communication.resolution = form.resolution
        communication.resolutionDate = form.resolutionDate
        break

      default:
        communication.title = form.title
        communication.description = form.description
        break
    }

    // Save based on type
    if (form.type === 'decision') {
      saveDecision(communication)
    } else {
      logCommunication(communication)
    }

    // Update history
    if (onHistoryUpdate) {
      onHistoryUpdate()
    }

    // Reset form and switch back to timeline
    resetForm()
    setViewMode('timeline')
  }

  const resetForm = () => {
    setCommunicationForm({
      type: 'email',
      title: '',
      date: new Date().toISOString().slice(0, 16),
      priority: 'medium',
      description: '',
      stakeholderIds: [],
      linkedIssues: [],
      linkedEpics: [],
      from: '',
      to: '',
      cc: '',
      subject: '',
      body: '',
      decisionDate: new Date().toISOString().split('T')[0],
      approvedBy: [],
      documentUrl: '',
      documentVersion: '',
      attendees: '',
      meetingNotes: '',
      actionItems: '',
      severity: 'medium',
      itoTicketNumber: '',
      itoTicketLink: '',
      resolution: '',
      resolutionDate: '',
      tags: [],
      attachments: [],
      supersedes: '',
      timeImpact: '',
      rootCause: ''
    })
    setShowAdvanced(false)
  }

  const getTypeColor = (type) => {
    const typeConfig = Object.values(COMMUNICATION_TYPES).find(t => t.id === type)
    return typeConfig ? typeConfig.color : '#6B7280'
  }

  const getTypeLabel = (type) => {
    const typeConfig = Object.values(COMMUNICATION_TYPES).find(t => t.id === type)
    return typeConfig ? typeConfig.label : type
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#DC2626'
      case 'high': return '#F59E0B'
      case 'medium': return '#3B82F6'
      case 'low': return '#6B7280'
      default: return '#6B7280'
    }
  }

  // Calculate duration for Gantt chart items
  const getItemDuration = (item) => {
    const startDate = new Date(item.sentAt || item.createdAt || item.decisionDate)
    let endDate = null

    // Determine end date based on type
    if (item.type === 'incident' && item.resolutionDate) {
      endDate = new Date(item.resolutionDate)
    } else if (item.type === 'scope_change' && item.newDate) {
      endDate = new Date(item.newDate)
    } else if (item.type === 'decision' && item.implementationDate) {
      endDate = new Date(item.implementationDate)
    } else if (item.timeImpact) {
      // Parse time impact (e.g., "+2 days", "1 week")
      const impact = item.timeImpact.toLowerCase()
      endDate = new Date(startDate)
      if (impact.includes('day')) {
        const days = parseInt(impact.match(/\d+/)?.[0] || 1)
        endDate.setDate(endDate.getDate() + days)
      } else if (impact.includes('week')) {
        const weeks = parseInt(impact.match(/\d+/)?.[0] || 1)
        endDate.setDate(endDate.getDate() + (weeks * 7))
      }
    }

    // Default duration for items without explicit end date
    if (!endDate) {
      endDate = new Date(startDate)
      // Single-day events show as 1-day bars
      endDate.setDate(endDate.getDate() + 1)
    }

    return { startDate, endDate }
  }

  // Calculate date range based on year and quarters
  const getQuarterDateRange = (year, quarters) => {
    const minQuarter = Math.min(...quarters)
    const maxQuarter = Math.max(...quarters)

    const start = new Date(year, (minQuarter - 1) * 3, 1)
    const end = new Date(year, maxQuarter * 3, 0) // Last day of the last quarter

    return { start, end }
  }

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set()
    const currentYear = new Date().getFullYear()

    filteredHistory.forEach(item => {
      const itemDate = new Date(item.sentAt || item.createdAt || item.decisionDate)
      years.add(itemDate.getFullYear())
    })

    // Always include current year and next year
    years.add(currentYear)
    years.add(currentYear + 1)
    years.add(currentYear - 1)

    return Array.from(years).sort((a, b) => b - a)
  }, [filteredHistory])

  // Prepare data for Gantt chart
  const ganttData = useMemo(() => {
    if (timelineView !== 'gantt') return []

    // Get date range based on selected year and quarters
    const { start: rangeStart, end: rangeEnd } = getQuarterDateRange(ganttYear, ganttQuarters)

    // Filter items to those within the selected date range
    const items = filteredHistory
      .map(item => {
        const { startDate, endDate } = getItemDuration(item)
        return {
          ...item,
          startDate,
          endDate,
          duration: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) // days
        }
      })
      .filter(item => {
        // Show items that overlap with the selected date range
        return item.startDate <= rangeEnd && item.endDate >= rangeStart
      })

    // Set the gantt range to the quarter range with some padding
    const paddedStart = new Date(rangeStart)
    const paddedEnd = new Date(rangeEnd)
    paddedStart.setDate(paddedStart.getDate() - 7)
    paddedEnd.setDate(paddedEnd.getDate() + 7)

    setGanttRange({ start: paddedStart, end: paddedEnd })

    return items
  }, [filteredHistory, timelineView, ganttYear, ganttQuarters])

  return (
    <div>
      {/* Header with view toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
            Communications
          </h2>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>
            {viewMode === 'timeline'
              ? 'View and manage all communications and decisions'
              : 'Log new communication or decision'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Quick Create Button */}
          <button
            onClick={() => {
              if (viewMode === 'create') {
                // When going back to timeline, reset Gantt filters to show current period
                const now = new Date()
                const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
                setGanttYear(now.getFullYear())
                setGanttQuarters([currentQuarter])
              }
              setViewMode(viewMode === 'timeline' ? 'create' : 'timeline')
            }}
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {viewMode === 'timeline' ? '+ New Entry' : '← Back to Timeline'}
          </button>

          {/* View Mode Toggle */}
          {viewMode === 'timeline' && (
            <div style={{
              display: 'flex',
              background: '#F3F4F6',
              borderRadius: '6px',
              padding: '2px'
            }}>
              <button
                onClick={() => setViewMode('timeline')}
                style={{
                  padding: '6px 12px',
                  background: viewMode === 'timeline' ? 'white' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: viewMode === 'timeline' ? '#111827' : '#6B7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('create')}
                style={{
                  padding: '6px 12px',
                  background: viewMode === 'create' ? 'white' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: viewMode === 'create' ? '#111827' : '#6B7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Create
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <>
          {/* Filters Bar */}
          <div style={{
            marginBottom: '16px',
            padding: '16px',
            background: '#F9FAFB',
            borderRadius: '8px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '13px',
                background: 'white'
              }}
            >
              <option value="all">All Types</option>
              {Object.values(COMMUNICATION_TYPES).map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '13px',
                background: 'white'
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search communications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            />

            {/* Results Count */}
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              {filteredHistory.length} {filteredHistory.length === 1 ? 'item' : 'items'}
            </div>
          </div>

          {/* View Toggle (List/Gantt) */}
          <div style={{
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              display: 'flex',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              padding: '2px'
            }}>
              <button
                onClick={() => setTimelineView('list')}
                style={{
                  padding: '6px 16px',
                  background: timelineView === 'list' ? '#374151' : 'transparent',
                  color: timelineView === 'list' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                List View
              </button>
              <button
                onClick={() => setTimelineView('gantt')}
                style={{
                  padding: '6px 16px',
                  background: timelineView === 'gantt' ? '#374151' : 'transparent',
                  color: timelineView === 'gantt' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Gantt View
              </button>
            </div>
          </div>

          {/* Timeline Content - List or Gantt */}
          {timelineView === 'list' && groupedHistory.length === 0 ? (
            <div className="card text-center" style={{ padding: '60px 20px' }}>
              <h3 style={{ marginBottom: '8px', color: '#374151' }}>No Communications Yet</h3>
              <p style={{ color: '#6B7280', marginBottom: '16px' }}>
                Start logging communications to build your activity timeline
              </p>
              <button
                onClick={() => setViewMode('create')}
                className="btn btn-primary"
              >
                Create First Entry
              </button>
            </div>
          ) : timelineView === 'list' ? (
            <div>
              {groupedHistory.map(([date, items]) => (
                <div key={date} style={{ marginBottom: '32px' }}>
                  {/* Date Header */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    {date}
                  </div>

                  {/* Items for this date */}
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        background: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        ':hover': {
                          borderColor: '#D1D5DB',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#D1D5DB'
                        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          {/* Type and Time */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{
                              padding: '2px 8px',
                              background: getTypeColor(item.type) + '20',
                              color: getTypeColor(item.type),
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {getTypeLabel(item.type)}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>
                              {new Date(item.sentAt || item.createdAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {item.priority && item.priority !== 'medium' && (
                              <span style={{
                                padding: '2px 6px',
                                background: getPriorityColor(item.priority) + '20',
                                color: getPriorityColor(item.priority),
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}>
                                {item.priority}
                              </span>
                            )}
                          </div>

                          {/* Title/Subject */}
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#111827',
                            marginBottom: '4px'
                          }}>
                            {item.subject || item.title || 'Untitled'}
                          </div>

                          {/* Preview/Description */}
                          {(item.content || item.description) && (
                            <div style={{
                              fontSize: '13px',
                              color: '#6B7280',
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {item.content || item.description}
                            </div>
                          )}

                          {/* Meta Info */}
                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '8px',
                            fontSize: '12px',
                            color: '#9CA3AF'
                          }}>
                            {item.from && (
                              <span>From: {item.from}</span>
                            )}
                            {item.stakeholderIds && item.stakeholderIds.length > 0 && (
                              <span>{item.stakeholderIds.length} stakeholder(s)</span>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              <span>{item.tags.length} tag(s)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            // Gantt Chart View
            <div className="card" style={{ padding: '20px', overflowX: 'auto' }}>
              {ganttData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                  No data available for Gantt chart
                </div>
              ) : (
                <div>
                  {/* Gantt Chart Header */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      Communication Timeline
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>
                      Showing {ganttData.length} items with duration information
                    </p>
                  </div>

                  {/* Year and Quarter Filters */}
                  <div style={{
                    marginBottom: '20px',
                    padding: '16px',
                    background: '#F9FAFB',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    {/* Year Selector */}
                    <div>
                      <label style={{ fontSize: '12px', color: '#374151', fontWeight: '500', marginRight: '8px' }}>
                        Year:
                      </label>
                      <select
                        value={ganttYear}
                        onChange={(e) => setGanttYear(parseInt(e.target.value))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #D1D5DB',
                          fontSize: '13px',
                          background: 'white'
                        }}
                      >
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quarter Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#374151', fontWeight: '500', marginRight: '8px' }}>
                        Period:
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {/* Full Year Button */}
                        <button
                          onClick={() => setGanttQuarters([1, 2, 3, 4])}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid',
                            borderColor: ganttQuarters.length === 4 ? '#10B981' : '#D1D5DB',
                            background: ganttQuarters.length === 4 ? '#10B981' : 'white',
                            color: ganttQuarters.length === 4 ? 'white' : '#374151',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Full Year
                        </button>

                        <div style={{ width: '1px', background: '#E5E7EB', margin: '0 4px' }} />

                        {/* Quarter Buttons */}
                        {[1, 2, 3, 4].map(quarter => (
                          <button
                            key={quarter}
                            onClick={() => {
                              if (ganttQuarters.includes(quarter)) {
                                // Don't allow deselecting the last quarter
                                if (ganttQuarters.length > 1) {
                                  setGanttQuarters(ganttQuarters.filter(q => q !== quarter))
                                }
                              } else {
                                setGanttQuarters([...ganttQuarters, quarter].sort())
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: '1px solid',
                              borderColor: ganttQuarters.includes(quarter) ? '#3B82F6' : '#D1D5DB',
                              background: ganttQuarters.includes(quarter) ? '#3B82F6' : 'white',
                              color: ganttQuarters.includes(quarter) ? 'white' : '#374151',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Q{quarter}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range Info */}
                    <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280' }}>
                      {(() => {
                        const range = getQuarterDateRange(ganttYear, ganttQuarters)
                        return `${range.start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${range.end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      })()}
                    </div>
                  </div>

                  {/* Gantt Chart */}
                  <div style={{ position: 'relative', minWidth: '800px' }}>
                    {/* Date Header */}
                    {ganttRange.start && ganttRange.end && (
                      <div style={{
                        display: 'flex',
                        borderBottom: '2px solid #E5E7EB',
                        marginBottom: '8px',
                        paddingBottom: '8px'
                      }}>
                        <div style={{ width: '200px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                          Item
                        </div>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
                          {(() => {
                            // Calculate the duration in days
                            const durationDays = Math.ceil((ganttRange.end - ganttRange.start) / (1000 * 60 * 60 * 24))

                            // Smart display logic based on timeframe
                            if (ganttQuarters.length === 1) {
                              // Single quarter: show weeks
                              const weeks = []
                              const current = new Date(ganttRange.start)
                              let weekNum = 1

                              while (current <= ganttRange.end) {
                                const weekStart = new Date(current)
                                const weekEnd = new Date(current)
                                weekEnd.setDate(weekEnd.getDate() + 6)

                                if (weekEnd > ganttRange.end) {
                                  weekEnd.setTime(ganttRange.end.getTime())
                                }

                                weeks.push({
                                  label: `W${weekNum}`,
                                  tooltip: `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                })

                                current.setDate(current.getDate() + 7)
                                weekNum++
                              }

                              return weeks.map((week, i) => (
                                <div
                                  key={i}
                                  style={{ flex: 1, textAlign: 'center', cursor: 'help' }}
                                  title={week.tooltip}
                                >
                                  {week.label}
                                </div>
                              ))
                            } else if (ganttQuarters.length === 2) {
                              // Two quarters: show months with week indicators
                              const monthsData = []
                              const current = new Date(ganttRange.start)

                              while (current <= ganttRange.end) {
                                const monthLabel = current.toLocaleDateString('en-GB', { month: 'short' })
                                const monthStart = new Date(current)
                                const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)

                                // Calculate weeks in this month
                                const weeks = []
                                let weekDate = new Date(monthStart)
                                weekDate.setDate(1) // Start from first of month

                                while (weekDate <= monthEnd && weekDate <= ganttRange.end) {
                                  weeks.push(weekDate.getDate())
                                  weekDate.setDate(weekDate.getDate() + 7)
                                }

                                monthsData.push({
                                  month: monthLabel,
                                  weeks: weeks
                                })

                                current.setMonth(current.getMonth() + 1)
                              }

                              return (
                                <div style={{ display: 'flex', flex: 1 }}>
                                  {monthsData.map((item, i) => (
                                    <div key={i} style={{ flex: 1, borderRight: i < monthsData.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                                      <div style={{ textAlign: 'center', fontWeight: '600', marginBottom: '4px' }}>
                                        {item.month}
                                      </div>
                                      <div style={{ display: 'flex', fontSize: '9px', color: '#9CA3AF' }}>
                                        {item.weeks.map((week, wi) => (
                                          <div key={wi} style={{ flex: 1, textAlign: 'center' }}>{week}</div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            } else {
                              // Three or four quarters: show months
                              const months = []
                              const current = new Date(ganttRange.start)

                              while (current <= ganttRange.end) {
                                const isFirstOfYear = current.getMonth() === 0
                                const label = isFirstOfYear
                                  ? current.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                                  : current.toLocaleDateString('en-GB', { month: 'short' })
                                months.push(label)
                                current.setMonth(current.getMonth() + 1)
                              }

                              return months.map((month, i) => (
                                <div key={i} style={{ flex: 1, textAlign: 'center' }}>{month}</div>
                              ))
                            }
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Gantt Rows */}
                    {ganttData.map((item, index) => {
                      const totalDays = ganttRange.end ? Math.ceil((ganttRange.end - ganttRange.start) / (1000 * 60 * 60 * 24)) : 1
                      const startOffset = Math.ceil((item.startDate - ganttRange.start) / (1000 * 60 * 60 * 24))
                      const widthPercent = (item.duration / totalDays) * 100
                      const leftPercent = (startOffset / totalDays) * 100

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '4px',
                            minHeight: '32px',
                            background: index % 2 === 0 ? 'white' : '#F9FAFB',
                            borderRadius: '4px'
                          }}
                        >
                          {/* Item Label */}
                          <div style={{
                            width: '200px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            color: '#374151',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            <span style={{
                              padding: '1px 4px',
                              background: getTypeColor(item.type) + '20',
                              color: getTypeColor(item.type),
                              borderRadius: '2px',
                              fontSize: '10px',
                              fontWeight: '600',
                              marginRight: '6px'
                            }}>
                              {getTypeLabel(item.type).substring(0, 3).toUpperCase()}
                            </span>
                            {item.subject || item.title || 'Untitled'}
                          </div>

                          {/* Gantt Bar */}
                          <div style={{ flex: 1, position: 'relative', height: '24px' }}>
                            <div
                              style={{
                                position: 'absolute',
                                left: `${leftPercent}%`,
                                width: `${Math.max(widthPercent, 0.5)}%`,
                                height: '20px',
                                background: getTypeColor(item.type),
                                opacity: 0.8,
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                              title={`${item.subject || item.title}\n${item.startDate.toLocaleDateString()} - ${item.endDate.toLocaleDateString()}\n(${item.duration} day${item.duration !== 1 ? 's' : ''})`}
                            >
                              {widthPercent > 5 && (
                                <span style={{ fontSize: '10px', color: 'white', fontWeight: '500' }}>
                                  {item.duration}d
                                </span>
                              )}
                            </div>

                            {/* Today Line for this row */}
                            {index === 0 && (() => {
                              const today = new Date()
                              const totalDays = Math.ceil((ganttRange.end - ganttRange.start) / (1000 * 60 * 60 * 24))
                              const todayOffset = Math.ceil((today - ganttRange.start) / (1000 * 60 * 60 * 24))
                              const todayPercent = (todayOffset / totalDays) * 100

                              if (today >= ganttRange.start && today <= ganttRange.end) {
                                return (
                                  <div style={{
                                    position: 'absolute',
                                    left: `${todayPercent}%`,
                                    top: '-8px',
                                    bottom: '-1000px',
                                    width: '2px',
                                    background: '#EF4444',
                                    opacity: 0.5,
                                    pointerEvents: 'none',
                                    zIndex: 10
                                  }}>
                                    <div style={{
                                      position: 'absolute',
                                      top: '-12px',
                                      left: '-20px',
                                      fontSize: '10px',
                                      color: '#EF4444',
                                      fontWeight: '600',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      Today
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{
                    marginTop: '24px',
                    paddingTop: '16px',
                    borderTop: '1px solid #E5E7EB',
                    display: 'flex',
                    gap: '20px',
                    flexWrap: 'wrap',
                    fontSize: '11px'
                  }}>
                    {Object.values(COMMUNICATION_TYPES).slice(0, 5).map(type => (
                      <div key={type.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          background: type.color,
                          borderRadius: '2px'
                        }} />
                        <span style={{ color: '#6B7280' }}>{type.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create View */}
      {viewMode === 'create' && (
        <div className="card" lang="de-DE">
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
            Create New Entry
          </h3>

          {/* Basic Fields */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase' }}>
              Basic Information
            </h4>

            {/* Type Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Type
              </label>
              <select
                value={communicationForm.type}
                onChange={(e) => setCommunicationForm({ ...communicationForm, type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {Object.values(COMMUNICATION_TYPES).map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Title/Subject (dynamic based on type) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                {communicationForm.type === 'email' ? 'Subject' : 'Title'}
              </label>
              <input
                type="text"
                value={communicationForm.type === 'email' ? communicationForm.subject : communicationForm.title}
                onChange={(e) => setCommunicationForm({
                  ...communicationForm,
                  [communicationForm.type === 'email' ? 'subject' : 'title']: e.target.value
                })}
                placeholder={communicationForm.type === 'email' ? 'Email subject...' : 'Brief title...'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Date and Priority in same row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Date & Time (DD.MM.YYYY HH:MM)
                </label>
                <input
                  type="datetime-local"
                  value={communicationForm.date}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                  onFocus={(e) => {
                    // Force locale format hint
                    e.target.setAttribute('lang', 'de-DE')
                    e.target.setAttribute('data-locale', 'de-DE')
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Priority
                </label>
                <select
                  value={communicationForm.priority}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, priority: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Type-Specific Fields */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase' }}>
              Details
            </h4>

            {/* Dynamic fields based on type */}
            {communicationForm.type === 'email' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    From
                  </label>
                  <input
                    type="text"
                    value={communicationForm.from}
                    onChange={(e) => setCommunicationForm({ ...communicationForm, from: e.target.value })}
                    placeholder="sender@example.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    To
                  </label>
                  <input
                    type="text"
                    value={communicationForm.to}
                    onChange={(e) => setCommunicationForm({ ...communicationForm, to: e.target.value })}
                    placeholder="recipient@example.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Message
                  </label>
                  <textarea
                    value={communicationForm.body}
                    onChange={(e) => setCommunicationForm({ ...communicationForm, body: e.target.value })}
                    placeholder="Email content..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </>
            )}

            {communicationForm.type === 'decision' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    value={communicationForm.description}
                    onChange={(e) => setCommunicationForm({ ...communicationForm, description: e.target.value })}
                    placeholder="Describe the decision and its rationale..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Approved By
                  </label>
                  <input
                    type="text"
                    value={communicationForm.approvedBy.join(', ')}
                    onChange={(e) => setCommunicationForm({
                      ...communicationForm,
                      approvedBy: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="John Doe, Jane Smith"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </>
            )}

            {/* Add more type-specific fields as needed */}
            {!['email', 'decision'].includes(communicationForm.type) && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={communicationForm.description}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, description: e.target.value })}
                  placeholder="Enter details..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Advanced Options (Collapsible) */}
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: '#6B7280',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>

            {showAdvanced && (
              <div style={{ marginTop: '12px', paddingLeft: '16px' }}>
                {/* Tags, Links, Attachments, etc. */}
                <p style={{ fontSize: '13px', color: '#6B7280' }}>
                  Advanced options for tags, links, and attachments will be shown here
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                resetForm()
                setViewMode('timeline')
              }}
              style={{
                padding: '8px 16px',
                background: 'white',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Save Entry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}