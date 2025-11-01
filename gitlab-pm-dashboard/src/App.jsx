import React, { useState } from 'react'
import { isConfigured, loadConfig } from './services/storageService'
import { exportToPowerPoint } from './services/pptExportService'
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
import StatusGeneratorModal from './components/StatusGeneratorModal'
import ExecutiveDashboard from './components/ExecutiveDashboard'
import CommunicationsDashboard from './components/CommunicationsDashboard'
import PortfolioView from './components/PortfolioView'
import RoadmapView from './components/RoadmapView'
import VelocityView from './components/VelocityView'
import ResourceCapacityView from './components/ResourceCapacityView'
import StakeholderHubView from './components/StakeholderHubView'
import InsightsView from './components/InsightsView'
import IssueComplianceView from './components/IssueComplianceView'
import CycleTimeView from './components/CycleTimeView'
// Consolidated views
import EpicManagementView from './components/EpicManagementView'
import RiskManagementView from './components/RiskManagementView'
import SprintManagementView from './components/SprintManagementView'

function App() {
  console.log('App: Component initializing...')

  const [activeView, setActiveView] = useState('executive')
  console.log('App: activeView state initialized:', activeView)

  const configured = isConfigured()
  console.log('App: Configuration check:', configured)

  const [showConfigModal, setShowConfigModal] = useState(!configured)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [useGroupedNav, setUseGroupedNav] = useState(getViewPreference() === 'grouped')
  console.log('App: showConfigModal:', !configured)

  console.log('App: Calling useGitLabData hook...')
  const { issues, milestones, epics, loading, error, refresh } = useGitLabData()
  console.log('App: GitLab data:', { issuesCount: issues?.length, milestonesCount: milestones?.length, epicsCount: epics?.length, loading, error })

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

  const handleExportPPT = async () => {
    console.log('App: handleExportPPT called')

    if (!stats || !healthScore) {
      alert('Please wait for data to load before exporting')
      return
    }

    try {
      const config = loadConfig()
      const filename = await exportToPowerPoint({
        projectId: config.projectId || 'Unknown Project',
        stats,
        healthScore,
        issues,
        milestones,
        risks
      })

      console.log('App: PowerPoint export successful:', filename)
      alert(`PowerPoint exported successfully: ${filename}`)
    } catch (error) {
      console.error('App: PowerPoint export failed:', error)
      alert(`Export failed: ${error.message}`)
    }
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
          onExportPPT={handleExportPPT}
          onGenerateStatus={() => setShowStatusModal(true)}
          onChangeRole={() => setShowRoleModal(true)}
          loading={loading}
        />

        {useGroupedNav ? (
          <GroupedTabs activeView={activeView} onViewChange={setActiveView} />
        ) : (
          <Tabs activeView={activeView} onViewChange={setActiveView} />
        )}

        {/* Portfolio Filter - Shows on all views when multiple projects configured */}
        {isConfigured() && (
          <PortfolioFilterDropdown
            onProjectChange={(projectId) => {
              if (projectId === 'portfolio-manage') {
                setActiveView('portfolio')
              } else if (projectId === 'cross-project') {
                // Cross-project mode: trigger data refresh to aggregate all projects
                console.log('Cross-project view activated - refreshing data')
                refresh()
              } else {
                // Project switched, data will reload
                handleProjectSwitch(projectId)
              }
            }}
          />
        )}

        {/* Iteration Filter - Shows on views that benefit from iteration filtering */}
        {isConfigured() && issues.length > 0 && (
          ['compliance', 'cycletime', 'resources', 'velocity', 'sprintmanagement'].includes(activeView)
        ) && (
          <IterationFilterDropdown />
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

        {/* Portfolio view is always available */}
        {activeView === 'portfolio' && <PortfolioView onProjectSwitch={handleProjectSwitch} />}

        {isConfigured() && issues.length > 0 && (
          <>
            {activeView === 'executive' && (
              <ExecutiveDashboard stats={stats} healthScore={healthScore} issues={issues} />
            )}
            {activeView === 'communications' && (
              <CommunicationsDashboard issues={issues} />
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
            {activeView === 'epicmanagement' && <EpicManagementView epics={epics} issues={issues} />}
            {activeView === 'riskmanagement' && <RiskManagementView epics={epics} issues={issues} />}
            {activeView === 'roadmap' && <RoadmapView issues={issues} milestones={milestones} />}
            {activeView === 'sprintmanagement' && <SprintManagementView issues={issues} />}
            {activeView === 'velocity' && <VelocityView issues={issues} />}
            {activeView === 'resources' && <ResourceCapacityView issues={issues} />}
            {activeView === 'stakeholders' && <StakeholderHubView stats={stats} healthScore={healthScore} />}
          </>
        )}
      </div>

      <ConfigModal
        show={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleConfigSave}
      />

      <StatusGeneratorModal
        show={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        projectId={loadConfig()?.projectId || 'Unknown Project'}
        stats={stats}
        healthScore={healthScore}
        issues={issues}
        milestones={milestones}
        risks={risks}
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
