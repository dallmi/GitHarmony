import React from 'react'

/**
 * Universal Search Bar Component
 * Supports multi-field search across issues, epics, labels, assignees, etc.
 */
export default function SearchBar({ value, onChange, placeholder = "Search...", onClear }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ position: 'relative', maxWidth: '600px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 45px 12px 45px',
            fontSize: '14px',
            border: '2px solid #D1D5DB',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#2563EB'}
          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
        />
        {/* Search Icon */}
        <div style={{
          position: 'absolute',
          left: '15px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#6B7280',
          fontSize: '18px'
        }}>
          🔍
        </div>
        {/* Clear Button */}
        {value && (
          <button
            onClick={() => {
              onChange('')
              if (onClear) onClear()
            }}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#F3F4F6',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#E5E7EB'}
            onMouseLeave={(e) => e.target.style.background = '#F3F4F6'}
          >
            ✕
          </button>
        )}
      </div>
      {value && (
        <div style={{
          fontSize: '12px',
          color: '#6B7280',
          marginTop: '8px',
          marginLeft: '4px'
        }}>
          💡 Searching: title, labels, assignees, epic, milestone, description, ID
        </div>
      )}
    </div>
  )
}
