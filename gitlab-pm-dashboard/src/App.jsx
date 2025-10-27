import React, { useState } from 'react'
import { isConfigured, loadConfig } from './services/storageService'
import { exportToPowerPoint } from './services/pptExportService'
import useGitLabData from './hooks/useGitLabData'
import useHealthScore from './hooks/useHealthScore'
import useRisks from './hooks/useRisks'
import Header from './components/Header'
import Tabs from './components/Tabs'
import ConfigModal from './components/ConfigModal'
import ExecutiveDashboard from './components/ExecutiveDashboard'
import GanttView from './components/GanttView'
import RoadmapView from './components/RoadmapView'
import SprintBoardView from './components/SprintBoardView'
import DependencyGraphView from './components/DependencyGraphView'
import RiskRegisterView from './components/RiskRegisterView'
import TeamResourcesView from './components/TeamResourcesView'

function App() {
  console.log('App: Component initializing...')

  const [activeView, setActiveView] = useState('executive')
  console.log('App: activeView state initialized:', activeView)

  const configured = isConfigured()
  console.log('App: Configuration check:', configured)

  const [showConfigModal, setShowConfigModal] = useState(!configured)
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        stats={stats}
        healthScore={healthScore}
        onRefresh={refresh}
        onConfigure={() => setShowConfigModal(true)}
        onExportPPT={handleExportPPT}
        loading={loading}
      />

      <Tabs activeView={activeView} onViewChange={setActiveView} />

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

        {isConfigured() && issues.length > 0 && (
          <>
            {activeView === 'executive' && (
              <ExecutiveDashboard stats={stats} healthScore={healthScore} />
            )}
            {activeView === 'gantt' && <GanttView issues={issues} />}
            {activeView === 'roadmap' && <RoadmapView issues={issues} milestones={milestones} />}
            {activeView === 'sprint' && <SprintBoardView issues={issues} />}
            {activeView === 'dependencies' && <DependencyGraphView issues={issues} />}
            {activeView === 'risks' && <RiskRegisterView />}
            {activeView === 'resources' && <TeamResourcesView issues={issues} />}
          </>
        )}
      </div>

      <ConfigModal
        show={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleConfigSave}
      />
    </div>
  )
}

export default App
