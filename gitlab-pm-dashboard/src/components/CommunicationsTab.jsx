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
  const [filterType, setFilterType] = useState('all')
  const [filterDateRange, setFilterDateRange] = useState('all') // all, today, week, month
  const [searchQuery, setSearchQuery] = useState('')
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

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
            onClick={() => setViewMode(viewMode === 'timeline' ? 'create' : 'timeline')}
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
            marginBottom: '20px',
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

          {/* Timeline List */}
          {groupedHistory.length === 0 ? (
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
          ) : (
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
          )}
        </>
      )}

      {/* Create View */}
      {viewMode === 'create' && (
        <div className="card">
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
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={communicationForm.date}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                  lang="de-DE"
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