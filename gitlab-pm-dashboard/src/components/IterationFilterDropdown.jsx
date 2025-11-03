import React, { useState, useRef, useEffect } from 'react'
import { useIterationFilter } from '../contexts/IterationFilterContext'

/**
 * Multi-select dropdown for filtering by iterations
 * Positioned as a sticky header bar across all views
 */
export default function IterationFilterDropdown() {
  const {
    selectedIterations,
    availableIterations,
    toggleIteration,
    clearSelection,
    isFiltered
  } = useIterationFilter()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (availableIterations.length === 0) {
    return null // Don't show filter if no iterations available
  }

  const displayText = selectedIterations.length === 0
    ? 'All Iterations'
    : selectedIterations.length === 1
    ? selectedIterations[0]
    : `${selectedIterations.length} iterations selected`

  const formatDateRange = (iteration) => {
    if (!iteration.startDate || !iteration.dueDate) return null

    const start = new Date(iteration.startDate)
    const end = new Date(iteration.dueDate)

    const startFormatted = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endFormatted = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    return `${startFormatted} - ${endFormatted}`
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            padding: '8px 36px 8px 12px',
            background: 'white',
            border: `2px solid ${isFiltered ? '#3B82F6' : '#D1D5DB'}`,
            borderRadius: '6px',
            fontSize: '14px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            color: isFiltered ? '#1F2937' : '#6B7280',
            fontWeight: isFiltered ? '600' : '400'
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayText}
          </span>
          <span style={{ position: 'absolute', right: '12px', fontSize: '12px' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'white',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000
          }}>
            {/* Select All Option */}
            <div
              onClick={() => {
                clearSelection()
                setIsOpen(false)
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                background: selectedIterations.length === 0 ? '#EFF6FF' : 'white',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600',
                fontSize: '13px',
                color: '#1F2937'
              }}
              onMouseEnter={(e) => {
                if (selectedIterations.length > 0) {
                  e.target.style.background = '#F9FAFB'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = selectedIterations.length === 0 ? '#EFF6FF' : 'white'
              }}
            >
              <input
                type="checkbox"
                checked={selectedIterations.length === 0}
                readOnly
                style={{ cursor: 'pointer' }}
              />
              <span>All Iterations ({availableIterations.reduce((sum, iter) => sum + iter.issueCount, 0)} issues)</span>
            </div>

            {/* Individual Iterations */}
            {availableIterations.map((iteration) => {
              const isSelected = selectedIterations.includes(iteration.name)
              const dateRange = formatDateRange(iteration)

              return (
                <div
                  key={iteration.name}
                  onClick={() => toggleIteration(iteration.name)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    background: isSelected ? '#EFF6FF' : 'white',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.target.style.background = '#F9FAFB'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = isSelected ? '#EFF6FF' : 'white'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    style={{ marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1F2937',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {iteration.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', gap: '8px' }}>
                      {dateRange && <span>{dateRange}</span>}
                      <span>•</span>
                      <span>{iteration.issueCount} issue{iteration.issueCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
