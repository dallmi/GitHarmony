import React, { useState } from 'react'
import { isConfigured } from './services/storageService'
import useGitLabData from './hooks/useGitLabData'
import useHealthScore from './hooks/useHealthScore'
import Header from './components/Header'
import Tabs from './components/Tabs'
import ConfigModal from './components/ConfigModal'
import ExecutiveDashboard from './components/ExecutiveDashboard'
import PlaceholderView from './components/PlaceholderView'

function App() {
  const [activeView, setActiveView] = useState('executive')
  const [showConfigModal, setShowConfigModal] = useState(!isConfigured())

  const { issues, milestones, epics, loading, error, refresh } = useGitLabData()
  const { stats, healthScore } = useHealthScore(issues, milestones)

  const handleConfigSave = () => {
    setShowConfigModal(false)
    refresh()
  }

  const handleExportPPT = () => {
    // TODO: Implement PowerPoint export
    alert('PowerPoint export coming soon!')
  }

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
            {activeView === 'gantt' && <PlaceholderView viewName="Gantt Chart" />}
            {activeView === 'roadmap' && <PlaceholderView viewName="Roadmap" />}
            {activeView === 'sprint' && <PlaceholderView viewName="Sprint Board" />}
            {activeView === 'dependencies' && <PlaceholderView viewName="Dependencies" />}
            {activeView === 'risks' && <PlaceholderView viewName="Risk Register" />}
            {activeView === 'resources' && <PlaceholderView viewName="Team Resources" />}
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
