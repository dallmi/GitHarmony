import React, { useState, useEffect } from 'react'
import { useIterationFilter } from '../contexts/IterationFilterContext'
import { loadTeamConfig, loadSprintCapacity } from '../services/teamConfigService'
import { getTeamAbsenceStats } from '../services/absenceService'

// Import sub-components
import TeamCapacityCards from './TeamManagement/TeamCapacityCards'
import TeamSetupTab from './ResourcePlanning/TeamSetupTab'
import AbsenceCalendarTab from './ResourcePlanning/AbsenceCalendarTab'
import CapacityForecast from './TeamManagement/CapacityForecast'
import CapacityScenarioPlanner from './TeamManagement/CapacityScenarioPlanner'

/**
 * Unified Team Management View
 * Combines the best of Resources and Resource Planning
 * - Card view for current capacity (from Resources)
 * - Team setup and absence planning (from Resource Planning)
 * - New capacity forecasting to see bottlenecks coming
 */
export default function TeamManagementView({ issues: allIssues = [], milestones = [], crossProjectMode = false }) {
  // Use filtered issues from iteration context
  const { filteredIssues } = useIterationFilter()
  const issues = filteredIssues.length > 0 ? filteredIssues : allIssues

  const [activeTab, setActiveTab] = useState('current')
  const [teamData, setTeamData] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Debug cross-project mode
  console.log('TeamManagementView - crossProjectMode:', crossProjectMode)

  useEffect(() => {
    loadTeamData()
  }, [refreshTrigger, issues, milestones])

  const loadTeamData = () => {
    try {
      const config = loadTeamConfig()
      const teamMembers = config.teamMembers || []
      const sprintCapacity = loadSprintCapacity()
      const absenceStats = getTeamAbsenceStats(teamMembers)

      // Calculate total capacity
      const totalCapacity = teamMembers.reduce((sum, m) => {
        const capacity = m.defaultCapacity !== undefined && m.defaultCapacity !== null ? m.defaultCapacity : 40
        return sum + capacity
      }, 0)

      setTeamData({
        teamMembers,
        sprintCapacity,
        absenceStats,
        totalCapacity,
        availableCapacity: totalCapacity - (absenceStats?.totalImpact || 0)
      })
    } catch (error) {
      console.error('Error loading team data:', error)
    }
  }

  const handleTeamUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const tabs = [
    { id: 'current', label: 'Current Capacity', icon: '📊' },
    { id: 'forecast', label: 'Capacity Forecast', icon: '📈' },
    { id: 'scenarios', label: 'Scenario Planning', icon: '🔮' },
    { id: 'team', label: 'Team Setup', icon: '👥' },
    { id: 'absences', label: 'Absence Calendar', icon: '📅' }
  ]

  // Remove icons for corporate environment
  const corporateTabs = tabs.map(tab => ({ ...tab, icon: null }))

  return (
    <div style={{ padding: '20px', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
          Team Management
        </h2>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>
          Manage team capacity, plan absences, and forecast resource availability
        </p>

        {/* Quick Stats */}
        {teamData && (
          <div style={{
            display: 'flex',
            gap: '24px',
            marginTop: '16px',
            padding: '16px',
            background: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Team Size</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937' }}>
                {teamData.teamMembers.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Weekly Capacity</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937' }}>
                {teamData.totalCapacity}h
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Available This Sprint</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#10B981' }}>
                {Math.round(teamData.availableCapacity)}h
              </div>
            </div>
            {teamData.absenceStats.upcomingAbsences > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Upcoming Absences</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#F59E0B' }}>
                  {teamData.absenceStats.upcomingAbsences}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid #E5E7EB',
        marginBottom: '24px'
      }}>
        {corporateTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
              color: activeTab === tab.id ? '#3B82F6' : '#6B7280',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.color = '#1F2937'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.color = '#6B7280'
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {/* Current Capacity - Card View from Resources */}
        {activeTab === 'current' && teamData && (
          <TeamCapacityCards
            teamMembers={teamData.teamMembers}
            issues={issues}
            milestones={milestones}
            sprintCapacity={teamData.sprintCapacity}
            crossProjectMode={crossProjectMode}
          />
        )}

        {/* Capacity Forecast - New view to see bottlenecks coming */}
        {activeTab === 'forecast' && teamData && (
          <CapacityForecast
            teamMembers={teamData.teamMembers}
            issues={issues}
            milestones={milestones}
            absenceStats={teamData.absenceStats}
          />
        )}

        {/* Scenario Planning - Advanced "what if" analysis */}
        {activeTab === 'scenarios' && teamData && (
          <CapacityScenarioPlanner
            teamMembers={teamData.teamMembers}
            issues={issues}
            milestones={milestones}
          />
        )}

        {/* Team Setup */}
        {activeTab === 'team' && (
          <TeamSetupTab
            isCrossProject={crossProjectMode}
            onTeamUpdate={handleTeamUpdate}
            issues={issues}
          />
        )}

        {/* Absence Calendar */}
        {activeTab === 'absences' && (
          <AbsenceCalendarTab
            issues={issues}
            isCrossProject={crossProjectMode}
            onAbsenceUpdate={handleTeamUpdate}
          />
        )}
      </div>

      {/* Cross-Project Mode Warning */}
      {crossProjectMode && (
        <div style={{
          marginTop: '24px',
          padding: '12px 16px',
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '14px', color: '#92400E' }}>
            Note: Team configuration is read-only in cross-project view. Switch to a specific project to edit team settings.
          </span>
        </div>
      )}
    </div>
  )
}