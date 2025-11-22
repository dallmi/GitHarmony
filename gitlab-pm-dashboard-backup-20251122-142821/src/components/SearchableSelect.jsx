import React, { useState, useRef, useEffect } from 'react'

/**
 * Searchable Select Component
 * A dropdown with built-in search functionality
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  label,
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === value)
  const displayText = selectedOption ? selectedOption.label : placeholder

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          marginBottom: '6px',
          color: '#6B7280'
        }}>
          {label}
        </label>
      )}

      {/* Selected value display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: value ? '#1F2937' : '#9CA3AF'
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {displayText}
        </span>
        <span style={{ fontSize: '10px', color: '#6B7280' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: '300px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search input */}
          <div style={{ padding: '8px', borderBottom: '1px solid #E5E7EB' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '13px',
                outline: 'none'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div style={{
            overflowY: 'auto',
            maxHeight: '250px'
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '12px',
                textAlign: 'center',
                color: '#9CA3AF',
                fontSize: '13px'
              }}>
                No results found
              </div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                    setSearchTerm('')
                  }}
                  style={{
                    padding: '10px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    background: value === option.value ? '#EFF6FF' : 'white',
                    color: value === option.value ? '#2563EB' : '#1F2937',
                    fontWeight: value === option.value ? '600' : '400',
                    borderBottom: '1px solid #F3F4F6',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => {
                    if (value !== option.value) {
                      e.currentTarget.style.background = '#F9FAFB'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== option.value) {
                      e.currentTarget.style.background = 'white'
                    }
                  }}
                >
                  {option.label}
                  {option.subtitle && (
                    <div style={{
                      fontSize: '11px',
                      color: '#6B7280',
                      marginTop: '2px'
                    }}>
                      {option.subtitle}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
