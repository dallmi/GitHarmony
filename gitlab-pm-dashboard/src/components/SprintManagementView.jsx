import React, { useState } from 'react'
import SprintPlanningView from './SprintPlanningView'
import SprintBoardView from './SprintBoardView'
import SprintGoalSection from './SprintGoalSection'

/**
 * Unified Sprint Management View
 * Combines Sprint Planning + Sprint Board into one cohesive workflow
 * Planning section is collapsible, Board is always visible
 * Consolidates 2 tabs into 1 view
 */
export default function SprintManagementView({ issues }) {
  const [showPlanning, setShowPlanning] = useState(false)

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Sprint Management
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Plan sprints, manage board, and track team capacity
        </p>
      </div>

      {/* Sprint Goal Section */}
      <SprintGoalSection sprintId="current" sprintName="Current Sprint" />

      {/* Planning Section - Collapsible */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setShowPlanning(!showPlanning)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: '16px',
            background: '#F9FAFB',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#F9FAFB'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>
              {showPlanning ? '▼' : '▶'}
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                📋 Sprint Planning
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                Plan capacity, assign issues, and set up sprints
              </div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
            {showPlanning ? 'Click to collapse' : 'Click to expand'}
          </div>
        </button>

        {showPlanning && (
          <div style={{ padding: '20px', borderTop: '1px solid #E5E7EB' }}>
            <SprintPlanningView issues={issues} />
          </div>
        )}
      </div>

      {/* Board Section - Always Visible */}
      <div>
        <div style={{
          padding: '12px 16px',
          background: '#F9FAFB',
          borderBottom: '2px solid #E60000',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
            📊 Sprint Board
          </h3>
        </div>
        <SprintBoardView issues={issues} />
      </div>
    </div>
  )
}
