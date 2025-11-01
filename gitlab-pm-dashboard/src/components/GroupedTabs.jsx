import React, { useState } from 'react'
import { VIEW_GROUPS } from '../constants/config'
import { getUserRole, isViewAccessible } from '../services/userPreferencesService'

/**
 * Grouped Navigation Tabs
 * Organizes views into logical groups with role-based filtering
 * Includes keyboard navigation and ARIA labels for accessibility
 */
export default function GroupedTabs({ activeView, onViewChange }) {
  const [expandedGroup, setExpandedGroup] = useState(null)
  const userRole = getUserRole()

  // Filter views based on user role
  const accessibleGroups = VIEW_GROUPS.map(group => ({
    ...group,
    views: group.views.filter(view => isViewAccessible(view))
  })).filter(group => group.views.length > 0)

  const handleGroupClick = (groupId) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null)
    } else {
      setExpandedGroup(groupId)
    }
  }

  const handleViewClick = (viewId) => {
    onViewChange(viewId)
    setExpandedGroup(null) // Close dropdown after selection
  }

  const handleKeyDown = (e, groupId, views) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleGroupClick(groupId)
    } else if (e.key === 'Escape' && expandedGroup === groupId) {
      setExpandedGroup(null)
    } else if (e.key === 'ArrowDown' && expandedGroup === groupId && views.length > 0) {
      e.preventDefault()
      // Focus first item in dropdown
      const firstItem = e.currentTarget.parentElement.querySelector('[data-dropdown-item]')
      if (firstItem) firstItem.focus()
    }
  }

  const handleDropdownKeyDown = (e, viewId, views, currentIndex) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleViewClick(viewId)
    } else if (e.key === 'Escape') {
      setExpandedGroup(null)
      // Return focus to group button
      e.currentTarget.closest('[style]').querySelector('button').focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = Math.min(currentIndex + 1, views.length - 1)
      const items = e.currentTarget.parentElement.querySelectorAll('[data-dropdown-item]')
      if (items[nextIndex]) items[nextIndex].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = Math.max(currentIndex - 1, 0)
      const items = e.currentTarget.parentElement.querySelectorAll('[data-dropdown-item]')
      if (items[prevIndex]) items[prevIndex].focus()
    }
  }

  // Find which group contains the active view
  const activeGroup = VIEW_GROUPS.find(group =>
    group.views.some(view => view.id === activeView)
  )

  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      borderBottom: '1px solid var(--border-light)',
      background: 'var(--bg-primary)',
      padding: '0 20px',
      position: 'relative'
    }}>
      {accessibleGroups.map(group => {
        const isActive = activeGroup?.id === group.id
        const isExpanded = expandedGroup === group.id

        return (
          <div key={group.id} style={{ position: 'relative' }}>
            {/* Group Tab Button */}
            <button
              onClick={() => handleGroupClick(group.id)}
              onKeyDown={(e) => handleKeyDown(e, group.id, group.views)}
              aria-label={`${group.label} navigation group`}
              aria-expanded={isExpanded}
              aria-haspopup="true"
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.target.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.target.style.color = 'var(--text-secondary)'
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 0 0 2px var(--primary)'
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none'
              }}
            >
              <span>{group.label}</span>
              <span style={{
                fontSize: '10px',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </button>

            {/* Dropdown Menu */}
            {isExpanded && (
              <div
                role="menu"
                aria-label={`${group.label} views`}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  border: '1px solid var(--border-light)',
                  borderRadius: '0 0 6px 6px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  minWidth: '200px',
                  zIndex: 1000,
                  marginTop: '-1px'
                }}
              >
                {group.views.map((view, index) => (
                  <button
                    key={view.id}
                    data-dropdown-item
                    role="menuitem"
                    aria-label={`Navigate to ${view.label} view`}
                    onClick={() => handleViewClick(view.id)}
                    onKeyDown={(e) => handleDropdownKeyDown(e, view.id, group.views, index)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: view.id === activeView ? '600' : '400',
                      color: view.id === activeView ? 'var(--primary)' : 'var(--text-primary)',
                      background: view.id === activeView ? 'var(--bg-secondary)' : 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderBottom: '1px solid var(--border-light)',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (view.id !== activeView) {
                        e.target.style.background = 'var(--bg-secondary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (view.id !== activeView) {
                        e.target.style.background = 'white'
                      }
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = 'inset 0 0 0 2px var(--primary)'
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Role Indicator */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <span style={{
          background: 'var(--bg-tertiary)',
          padding: '4px 12px',
          borderRadius: '12px',
          fontWeight: '600'
        }}>
          {userRole === 'executive' && 'Executive'}
          {userRole === 'manager' && 'Manager'}
          {userRole === 'team' && 'Team'}
        </span>
      </div>
    </div>
  )
}
