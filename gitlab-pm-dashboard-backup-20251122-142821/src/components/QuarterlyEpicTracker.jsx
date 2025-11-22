import React, { useMemo, useState } from 'react'
import SearchBar from './SearchBar'
import { searchEpics } from '../utils/searchUtils'
import { exportEpicsToCSV, downloadCSV } from '../utils/csvExportUtils'

/**
 * Quarterly Epic Tracker with RAG Status
 * Track 3-5 key epics per quarter with iteration-based progress
 */
export default function QuarterlyEpicTracker({ epics, issues }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedQuarter, setSelectedQuarter] = useState('current')

  // Get quarters from epic dates
  const quarters = useMemo(() => {
    const quarterSet = new Set()
    const now = new Date()
    const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`

    quarterSet.add(currentQuarter) // Always include current quarter

    epics.forEach(epic => {
      if (epic.start_date || epic.due_date || epic.end_date) {
        const date = new Date(epic.start_date || epic.due_date || epic.end_date)
        const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
        quarterSet.add(quarter)
      }
    })

    // Sort by date (descending) instead of alphabetical string
    return Array.from(quarterSet).sort((a, b) => {
      // Parse "Q1 2024" format
      const [qA, yearA] = a.split(' ')
      const [qB, yearB] = b.split(' ')
      const quarterNumA = parseInt(qA.substring(1))
      const quarterNumB = parseInt(qB.substring(1))

      // Compare years first (descending)
      if (yearB !== yearA) {
        return parseInt(yearB) - parseInt(yearA)
      }
      // Then compare quarters (descending)
      return quarterNumB - quarterNumA
    })
  }, [epics])

  // Calculate epic progress and RAG status
  const epicStats = useMemo(() => {
    return epics.map(epic => {
      const epicIssues = epic.issues || []
      const totalIssues = epicIssues.length
      const closedIssues = epicIssues.filter(i => i.state === 'closed').length
      const completionRate = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0

      // Get unique iterations in this epic
      const iterations = new Set()
      epicIssues.forEach(issue => {
        if (issue.iteration) {
          const iterationTitle = typeof issue.iteration === 'object'
            ? issue.iteration.title
            : issue.iteration
          if (iterationTitle) iterations.add(iterationTitle)
        }
      })

      // Calculate RAG status
      let rag = 'green'
      let ragReason = []

      // Check timeline
      const now = new Date()
      const dueDate = epic.due_date || epic.end_date
      if (dueDate) {
        const due = new Date(dueDate)
        const daysUntilDue = Math.floor((due - now) / (1000 * 60 * 60 * 24))

        if (epic.state === 'opened') {
          if (daysUntilDue < 0) {
            rag = 'red'
            ragReason.push(`Overdue by ${Math.abs(daysUntilDue)} days`)
          } else if (daysUntilDue < 14 && completionRate < 80) {
            rag = rag === 'red' ? 'red' : 'amber'
            ragReason.push(`Due in ${daysUntilDue} days, only ${completionRate}% complete`)
          }
        }
      }

      // Check completion vs timeline
      if (completionRate < 30 && epic.state === 'opened') {
        rag = rag === 'red' ? 'red' : 'amber'
        ragReason.push(`Low completion rate: ${completionRate}%`)
      }

      // Check for blocked issues
      const blockedIssues = epicIssues.filter(i =>
        i.labels?.some(l => l.toLowerCase().includes('block'))
      ).length
      if (blockedIssues > 0) {
        rag = rag === 'red' ? 'red' : 'amber'
        ragReason.push(`${blockedIssues} blocked issue${blockedIssues > 1 ? 's' : ''}`)
      }

      // Determine quarter
      let quarter = null
      if (epic.start_date || epic.due_date || epic.end_date) {
        const date = new Date(epic.start_date || epic.due_date || epic.end_date)
        quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
      }

      return {
        ...epic,
        totalIssues,
        closedIssues,
        completionRate,
        iterations: Array.from(iterations).sort(),
        rag,
        ragReason: ragReason.length > 0 ? ragReason : ['On track'],
        quarter,
        blockedIssues
      }
    }).sort((a, b) => {
      // Sort: Red first, then Amber, then Green
      const ragOrder = { red: 0, amber: 1, green: 2 }
      if (ragOrder[a.rag] !== ragOrder[b.rag]) {
        return ragOrder[a.rag] - ragOrder[b.rag]
      }
      // Then by completion (lower first)
      return a.completionRate - b.completionRate
    })
  }, [epics])

  // Filter by quarter and search
  const filteredEpics = useMemo(() => {
    let filtered = epicStats

    // Filter by quarter
    if (selectedQuarter !== 'all') {
      if (selectedQuarter === 'current') {
        const now = new Date()
        const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
        filtered = filtered.filter(e => e.quarter === currentQuarter)
      } else {
        filtered = filtered.filter(e => e.quarter === selectedQuarter)
      }
    }

    // Apply search
    if (searchTerm) {
      filtered = searchEpics(filtered, searchTerm)
    }

    return filtered
  }, [epicStats, selectedQuarter, searchTerm])

  // RAG summary
  const ragSummary = useMemo(() => {
    const summary = { red: 0, amber: 0, green: 0, total: filteredEpics.length }
    filteredEpics.forEach(epic => {
      summary[epic.rag]++
    })
    return summary
  }, [filteredEpics])

  const getRagColor = (rag) => {
    switch (rag) {
      case 'red': return '#DC2626'
      case 'amber': return '#D97706'
      case 'green': return '#059669'
      default: return '#6B7280'
    }
  }

  const handleExport = () => {
    const csv = exportEpicsToCSV(filteredEpics)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `quarterly-epic-tracker-${selectedQuarter}-${date}.csv`)
  }

  if (!epics || epics.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
          <h3 className="mb-2">No Epics Found</h3>
          <p className="text-muted">
            Epic support requires GitLab Premium/Ultimate.
            <br />
            Configure your Group Path in settings to enable epic tracking.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Quarterly Epic Tracker
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Track key epics per quarter with RAG status and iteration progress
          </p>
        </div>
        {filteredEpics.length > 0 && (
          <button className="btn btn-primary" onClick={handleExport}>
            📊 Export CSV ({filteredEpics.length} epics)
          </button>
        )}
      </div>

      {/* Quarter Selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className={`btn ${selectedQuarter === 'current' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedQuarter('current')}
        >
          Current Quarter
        </button>
        {quarters.map(q => (
          <button
            key={q}
            className={`btn ${selectedQuarter === q ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedQuarter(q)}
          >
            {q}
          </button>
        ))}
        <button
          className={`btn ${selectedQuarter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedQuarter('all')}
        >
          All Quarters
        </button>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search epics by title, labels, description..."
      />

      {/* RAG Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Epics</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>
            {ragSummary.total}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            {selectedQuarter === 'current' ? 'This quarter' : selectedQuarter}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>🔴 Red</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#DC2626' }}>
            {ragSummary.red}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Critical attention needed
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #D97706' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>🟠 Amber</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#D97706' }}>
            {ragSummary.amber}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            At risk, needs monitoring
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>🟢 Green</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#059669' }}>
            {ragSummary.green}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            On track
          </div>
        </div>
      </div>

      {/* Epic Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredEpics.length === 0 ? (
          <div className="card text-center" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🔍</div>
            <h3 className="mb-2">No Epics Found</h3>
            <p className="text-muted">
              {searchTerm ? 'Try a different search term' : `No epics for ${selectedQuarter}`}
            </p>
          </div>
        ) : (
          filteredEpics.map(epic => (
            <div
              key={epic.id}
              className="card"
              style={{
                borderLeft: `6px solid ${getRagColor(epic.rag)}`,
                opacity: epic.state === 'closed' ? 0.7 : 1
              }}
            >
              {/* Epic Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
                      {epic.title}
                    </h3>
                    <span
                      style={{
                        padding: '4px 8px',
                        background: epic.state === 'opened' ? '#DBEAFE' : '#D1FAE5',
                        color: epic.state === 'opened' ? '#1E40AF' : '#065F46',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}
                    >
                      {epic.state}
                    </span>
                  </div>

                  {epic.description && (
                    <p style={{ fontSize: '14px', color: '#6B7280', margin: '8px 0', lineHeight: '1.5' }}>
                      {epic.description.substring(0, 200)}
                      {epic.description.length > 200 && '...'}
                    </p>
                  )}

                  {/* Dates and Quarter */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                    {epic.quarter && (
                      <div>
                        <strong>Quarter:</strong> {epic.quarter}
                      </div>
                    )}
                    {epic.start_date && (
                      <div>
                        <strong>Start:</strong> {new Date(epic.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    )}
                    {(epic.due_date || epic.end_date) && (
                      <div>
                        <strong>Due:</strong> {new Date(epic.due_date || epic.end_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    )}
                    {epic.web_url && (
                      <div>
                        <a href={epic.web_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB' }}>
                          View in GitLab →
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* RAG Status Badge */}
                <div
                  style={{
                    minWidth: '120px',
                    textAlign: 'center',
                    padding: '16px',
                    background: getRagColor(epic.rag) + '20',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>RAG Status</div>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: getRagColor(epic.rag) }}>
                    {epic.rag === 'red' ? '🔴' : epic.rag === 'amber' ? '🟠' : '🟢'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: getRagColor(epic.rag), textTransform: 'uppercase' }}>
                    {epic.rag}
                  </div>
                </div>
              </div>

              {/* Epic Progress Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Completion</div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#2563EB' }}>
                    {epic.completionRate}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Issues</div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937' }}>
                    {epic.totalIssues}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Completed</div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#059669' }}>
                    {epic.closedIssues}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Iterations</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                    {epic.iterations.length > 0 ? epic.iterations.join(', ') : 'None'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                  Progress: {epic.closedIssues} / {epic.totalIssues} issues completed
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '12px',
                    background: '#E5E7EB',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${epic.completionRate}%`,
                      height: '100%',
                      background: getRagColor(epic.rag),
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* RAG Reasons */}
              <div
                style={{
                  padding: '12px',
                  background: getRagColor(epic.rag) + '15',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}
              >
                <div style={{ fontWeight: '600', color: getRagColor(epic.rag), marginBottom: '6px' }}>
                  Status Details:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#1F2937' }}>
                  {epic.ragReason.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
