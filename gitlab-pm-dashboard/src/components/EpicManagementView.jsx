import React, { useState } from 'react'
import EpicDashboardView from './EpicDashboardView'
import GanttView from './GanttView'
import QuarterlyEpicTracker from './QuarterlyEpicTracker'

/**
 * Unified Epic Management View with Sub-Tabs
 * Combines:
 * - Epic Portfolio (table view with health scores)
 * - Gantt Chart (timeline with progress bars)
 * - Quarterly Tracker (quarterly planning grid)
 * Consolidates 3 tabs into 1 view with sub-navigation
 */
export default function EpicManagementView({ epics, issues }) {
  const [activeSubView, setActiveSubView] = useState('portfolio')

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Epic Management
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Manage epics across portfolio, timeline, and quarterly views
        </p>
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '2px solid #E5E7EB',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveSubView('portfolio')}
          style={{
            padding: '12px 24px',
            background: activeSubView === 'portfolio' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeSubView === 'portfolio' ? '3px solid #E60000' : '3px solid transparent',
            fontSize: '14px',
            fontWeight: activeSubView === 'portfolio' ? '600' : '500',
            color: activeSubView === 'portfolio' ? '#E60000' : '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          Portfolio
        </button>
        <button
          onClick={() => setActiveSubView('timeline')}
          style={{
            padding: '12px 24px',
            background: activeSubView === 'timeline' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeSubView === 'timeline' ? '3px solid #E60000' : '3px solid transparent',
            fontSize: '14px',
            fontWeight: activeSubView === 'timeline' ? '600' : '500',
            color: activeSubView === 'timeline' ? '#E60000' : '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          Timeline
        </button>
        <button
          onClick={() => setActiveSubView('quarterly')}
          style={{
            padding: '12px 24px',
            background: activeSubView === 'quarterly' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeSubView === 'quarterly' ? '3px solid #E60000' : '3px solid transparent',
            fontSize: '14px',
            fontWeight: activeSubView === 'quarterly' ? '600' : '500',
            color: activeSubView === 'quarterly' ? '#E60000' : '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          Quarterly
        </button>
      </div>

      {/* Sub-View Content */}
      <div>
        {activeSubView === 'portfolio' && (
          <EpicDashboardView epics={epics} issues={issues} />
        )}
        {activeSubView === 'timeline' && (
          <GanttView epics={epics} issues={issues} />
        )}
        {activeSubView === 'quarterly' && (
          <QuarterlyEpicTracker epics={epics} issues={issues} />
        )}
      </div>
    </div>
  )
}
