import React, { useState } from 'react'
import { isConfigured, loadConfig, getActiveProjectId } from './services/storageService'
import useGitLabData from './hooks/useGitLabData'
import useHealthScore from './hooks/useHealthScore'
import useRisks from './hooks/useRisks'
import { IterationFilterProvider } from './contexts/IterationFilterContext'
import Header from './components/Header'
import Tabs from './components/Tabs'
import GroupedTabs from './components/GroupedTabs'
import RoleSelectorModal from './components/RoleSelectorModal'
import IterationFilterDropdown from './components/IterationFilterDropdown'
import { getViewPreference } from './services/userPreferencesService'
import PortfolioFilterDropdown from './components/PortfolioFilterDropdown'
import ConfigModal from './components/ConfigModal'
import ExecutiveDashboard from './components/ExecutiveDashboard'
import EnhancedExecutiveDashboard from './components/EnhancedExecutiveDashboard'
import RoadmapView from './components/RoadmapView'
import VelocityView from './components/VelocityView'
import ResourceCapacityView from './components/ResourceCapacityView'
import StakeholderHubView from './components/StakeholderHubView'
import InsightsView from './components/InsightsView'
import IssueComplianceView from './components/IssueComplianceView'
import CycleTimeView from './components/CycleTimeView'
import BackupRestoreView from './components/BackupRestoreView'
// Consolidated views
import EpicManagementView from './components/EpicManagementView'
import RiskManagementView from './components/RiskManagementView'
import SprintManagementView from './components/SprintManagementView'
import CrossTeamCoordinationView from './components/CrossTeamCoordinationView'
import ResourcePlanningView from './components/ResourcePlanningView'
import TeamManagementView from './components/TeamManagementView'
import DependencyManagementView from './components/DependencyManagementView'
import ReleasePlanningView from './components/ReleasePlanningView'

function App() {
  console.log('App: Component initializing...')

  const [activeView, setActiveView] = useState('executive')
  console.log('App: activeView state initialized:', activeView)

  const configured = isConfigured()
  console.log('App: Configuration check:', configured)

  const [showConfigModal, setShowConfigModal] = useState(!configured)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [useGroupedNav, setUseGroupedNav] = useState(getViewPreference() === 'grouped')
  console.log('App: showConfigModal:', !configured)

  console.log('App: Calling useGitLabData hook...')
  const { issues, milestones, epics, crossProjectData, loading, error, refresh } = useGitLabData()
  console.log('App: GitLab data:', { issuesCount: issues?.length, milestonesCount: milestones?.length, epicsCount: epics?.length, loading, error })
  if (crossProjectData) {
    console.log('App: Cross-project data available:', crossProjectData.statistics)
  }

  console.log('App: Calling useHealthScore hook...')
  const { stats, healthScore } = useHealthScore(issues, milestones)
  console.log('App: Health data:', { stats, healthScore })

  console.log('App: Calling useRisks hook...')
  const { risks } = useRisks()
  console.log('App: Risks data:', { risksCount: risks?.length })

  const handleConfigSave = () => {
    console.log('App: handleConfigSave called')
    setShowConfigModal(false)
    refresh()
  }

  const handleProjectSwitch = (projectId) => {
    console.log('App: handleProjectSwitch called with:', projectId)
    // Refresh data after switching project
    refresh()
    // Switch to executive view
    setActiveView('executive')
  }

  console.log('App: About to render, current state:', { activeView, showConfigModal, configured, issuesCount: issues?.length, loading })

  return (
    <IterationFilterProvider issues={issues}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header
          stats={stats}
          healthScore={healthScore}
          onRefresh={refresh}
          onConfigure={() => setShowConfigModal(true)}
          onChangeRole={() => setShowRoleModal(true)}
          loading={loading}
        />

        {useGroupedNav ? (
          <GroupedTabs
            activeView={activeView}
            onViewChange={setActiveView}
            onProjectChange={isConfigured() ? (projectId) => {
              if (projectId === 'cross-project') {
                // Cross-project mode: trigger data refresh to aggregate all projects
                console.log('Cross-project view activated - refreshing data')
                refresh()
              } else {
                // Project switched, data will reload
                handleProjectSwitch(projectId)
              }
            } : null}
          />
        ) : (
          <Tabs activeView={activeView} onViewChange={setActiveView} />
        )}

        {/* Iteration Filter - Shows on views that benefit from iteration filtering */}
        {/* Positioned consistently in top-right across all views */}
        {isConfigured() && issues.length > 0 && (
          [
            'executive',
            'insights',
            'compliance',
            'cycletime',
            'resources',
            'teamsetup',
            'absencecalendar',
            'capacityforecast',
            'scenarioplanning',
            'resourceplanning',
            'teammanagement',
            'velocity',
            'sprintmanagement',
            'epicmanagement',
            'riskmanagement',
            'roadmap',
            'stakeholders',
            'crossteam',
            'dependencies',
            'releases'
            // Note: 'backup' view doesn't need iteration filter
          ].includes(activeView)
        ) && (
          <div style={{
            position: 'sticky',
            top: '0',
            zIndex: 800,
            background: 'white',
            padding: '12px 20px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <IterationFilterDropdown />
          </div>
        )}

        <div style={{ flex: 1, paddingTop: '20px' }}>
        {error && (
          <div className="container">
            <div className="card" style={{ background: '#FEE2E2', borderColor: '#DC2626', color: '#DC2626' }}>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {loading && !issues.length && (
          <div className="container">
            <div className="card text-center">
              <p>Loading GitLab data...</p>
            </div>
          </div>
        )}

        {!loading && !error && !issues.length && isConfigured() && (
          <div className="container">
            <div className="card text-center">
              <p>No issues found. Please check your configuration.</p>
            </div>
          </div>
        )}

        {!isConfigured() && !showConfigModal && (
          <div className="container">
            <div className="card text-center">
              <h2 className="mb-2">Welcome to GitLab Project Management</h2>
              <p className="mb-2">Please configure your GitLab connection to get started.</p>
              <button className="btn btn-primary" onClick={() => setShowConfigModal(true)}>
                Configure Now
              </button>
            </div>
          </div>
        )}

        {/* Backup view is always accessible, even without configuration */}
        {activeView === 'backup' && <BackupRestoreView />}

        {isConfigured() && issues.length > 0 && (
          <>
            {activeView === 'executive' && (
              <EnhancedExecutiveDashboard
                stats={stats}
                healthScore={healthScore}
                issues={issues}
                milestones={milestones}
                epics={epics}
                risks={risks}
              />
            )}
            {activeView === 'insights' && (
              <InsightsView
                issues={issues}
                milestones={milestones}
                epics={epics}
                stats={stats}
                healthScore={healthScore}
                risks={risks}
              />
            )}
            {activeView === 'compliance' && <IssueComplianceView issues={issues} />}
            {activeView === 'cycletime' && <CycleTimeView issues={issues} />}
            {activeView === 'epicmanagement' && <EpicManagementView epics={epics} issues={issues} crossProjectData={crossProjectData} />}
            {activeView === 'riskmanagement' && <RiskManagementView epics={epics} issues={issues} />}
            {activeView === 'roadmap' && <RoadmapView issues={issues} milestones={milestones} />}
            {activeView === 'sprintmanagement' && <SprintManagementView issues={issues} onNavigate={setActiveView} />}
            {activeView === 'velocity' && <VelocityView issues={issues} />}
            {activeView === 'resources' && <ResourceCapacityView issues={issues} />}
            {activeView === 'teamsetup' && <ResourcePlanningView issues={issues} initialTab="team" />}
            {activeView === 'absencecalendar' && <ResourcePlanningView issues={issues} initialTab="absences" />}
            {activeView === 'capacityforecast' && <ResourcePlanningView issues={issues} initialTab="capacity" />}
            {activeView === 'scenarioplanning' && (
              <div className="container" style={{ padding: '20px' }}>
                <div className="card">
                  <h2>Scenario Planning</h2>
                  <p>Coming soon: What-if scenario planning for resource allocation and capacity forecasting.</p>
                </div>
              </div>
            )}
            {activeView === 'resourceplanning' && <ResourcePlanningView issues={issues} />}
            {activeView === 'teammanagement' && <TeamManagementView issues={issues} milestones={milestones} crossProjectMode={getActiveProjectId() === 'cross-project'} />}
            {activeView === 'stakeholders' && <StakeholderHubView stats={stats} healthScore={healthScore} />}
            {activeView === 'crossteam' && <CrossTeamCoordinationView issues={issues} epics={epics} milestones={milestones} />}
            {activeView === 'dependencies' && <DependencyManagementView issues={issues} epics={epics} milestones={milestones} />}
            {activeView === 'releases' && <ReleasePlanningView issues={issues} milestones={milestones} epics={epics} />}
          </>
        )}
      </div>

      <ConfigModal
        show={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleConfigSave}
        onProjectSwitch={handleProjectSwitch}
      />

      <RoleSelectorModal
        show={showRoleModal}
        onClose={() => setShowRoleModal(false)}
      />
      </div>
    </IterationFilterProvider>
  )
}

export default App
