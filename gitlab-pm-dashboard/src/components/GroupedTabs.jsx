import React, { useState } from 'react'
import { VIEW_GROUPS } from '../constants/config'
import { getUserRole, isViewAccessible } from '../services/userPreferencesService'

/**
 * Grouped Navigation Tabs
 * Organizes views into logical groups with role-based filtering
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
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.target.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.target.style.color = 'var(--text-secondary)'
              }}
            >
              <span>{group.icon}</span>
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
              <div style={{
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
              }}>
                {group.views.map(view => (
                  <button
                    key={view.id}
                    onClick={() => handleViewClick(view.id)}
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
                      borderBottom: '1px solid var(--border-light)'
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
          {userRole === 'executive' && '👔 Executive'}
          {userRole === 'manager' && '📋 Manager'}
          {userRole === 'team' && '👥 Team'}
        </span>
      </div>
    </div>
  )
}
