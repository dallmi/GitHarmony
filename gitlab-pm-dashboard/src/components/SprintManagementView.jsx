import React, { useState, lazy, Suspense } from 'react'
import SprintBoardView from './SprintBoardView'
import SprintGoalSection from './SprintGoalSection'
import RetrospectiveActionsSection from './RetrospectiveActionsSection'
import IterationFilterDropdown from './IterationFilterDropdown'

// Lazy load heavy components to improve initial render performance
// Only loads when user expands the section
const SprintPlanningView = lazy(() => import('./SprintPlanningView'))

/**
 * Unified Sprint Management View
 * Combines Sprint Planning + Sprint Board into one cohesive workflow
 * Planning section is collapsible, Board is always visible
 * Consolidates 2 tabs into 1 view
 * Performance: Uses React.lazy() to defer loading heavy SprintPlanningView
 */
export default function SprintManagementView({ issues, onNavigate }) {
  const [showPlanning, setShowPlanning] = useState(false)
  const [showRetro, setShowRetro] = useState(false)

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Sprint Management
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Plan sprints, manage board, and track team capacity
          </p>
        </div>
        <IterationFilterDropdown />
      </div>

      {/* Sprint Goal Section */}
      <SprintGoalSection sprintId="current" sprintName="Current Sprint" />

      {/* Retrospective Actions Section - Collapsible */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setShowRetro(!showRetro)}
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
              {showRetro ? '▼' : '▶'}
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                🔄 Retrospective Actions
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                Track continuous improvement actions from retros
              </div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
            {showRetro ? 'Click to collapse' : 'Click to expand'}
          </div>
        </button>

        {showRetro && (
          <div style={{ padding: '20px', borderTop: '1px solid #E5E7EB' }}>
            <RetrospectiveActionsSection sprintId="current" sprintName="Current Sprint" />
          </div>
        )}
      </div>

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
            <Suspense fallback={
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#6B7280'
              }}>
                <div style={{
                  display: 'inline-block',
                  width: '32px',
                  height: '32px',
                  border: '3px solid #E5E7EB',
                  borderTop: '3px solid #E60000',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  marginBottom: '12px'
                }}></div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  Loading Sprint Planning...
                </div>
              </div>
            }>
              <SprintPlanningView issues={issues} onNavigate={onNavigate} />
            </Suspense>
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
