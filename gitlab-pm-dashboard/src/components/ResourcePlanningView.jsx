import React, { useState, useEffect } from 'react'
import { getActiveProjectId } from '../services/storageService'
import TeamSetupTab from './ResourcePlanning/TeamSetupTab'
import AbsenceCalendarTab from './ResourcePlanning/AbsenceCalendarTab'

/**
 * Integrated Resource Planning View
 * Consolidates team management, absence planning, and sprint capacity in one place
 * Replaces: ConfigModal (team config) + CapacityCalendarView + Sprint Capacity Modal
 */
export default function ResourcePlanningView({ issues, initialTab = 'team' }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const activeProjectId = getActiveProjectId()
  const isCrossProject = activeProjectId === 'cross-project'

  // Refresh trigger for cross-tab communication
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(prev => prev + 1)

  const tabs = [
    { id: 'team', label: 'Team Setup' },
    { id: 'absences', label: 'Absence Calendar' },
    { id: 'forecast', label: 'Capacity Forecast' },
    { id: 'scenario', label: 'Scenario Planning' }
  ]

  return (
    <div className="container" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1>👥 Resource Planning</h1>
        <p style={{ color: '#6B7280', marginBottom: '20px' }}>
          Manage your team, plan absences, and monitor sprint capacity in one integrated view
        </p>

        {/* Cross-Project Mode Notice */}
        {isCrossProject && (
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <div>
              <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>
                Cross-Project View
              </div>
              <div style={{ fontSize: '13px', color: '#92400E' }}>
                You're viewing data from all projects. Team configuration and absence editing are disabled in cross-project mode.
                Select a specific project to manage resources.
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '2px solid #E5E7EB',
          marginBottom: '24px'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#3B82F6' : '#6B7280',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #3B82F6' : '3px solid transparent',
                borderRadius: '6px 6px 0 0',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-2px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'team' && (
          <TeamSetupTab
            isCrossProject={isCrossProject}
            onTeamUpdate={triggerRefresh}
          />
        )}
        {activeTab === 'absences' && (
          <AbsenceCalendarTab
            issues={issues}
            isCrossProject={isCrossProject}
            refreshKey={refreshKey}
            onAbsenceUpdate={triggerRefresh}
          />
        )}
        {activeTab === 'forecast' && (
          <div className="card">
            <h2>Capacity Forecast</h2>
            <p style={{ color: '#6B7280' }}>
              Coming soon: Forecast future sprint capacity based on historical velocity, planned absences, and team changes.
            </p>
          </div>
        )}
        {activeTab === 'scenario' && (
          <div className="card">
            <h2>Scenario Planning</h2>
            <p style={{ color: '#6B7280' }}>
              Coming soon: What-if scenario planning for resource allocation and capacity forecasting.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
