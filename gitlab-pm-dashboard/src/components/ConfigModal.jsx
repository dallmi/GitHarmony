import React, { useState } from 'react'
import { loadConfig, saveConfig, getAllProjects, saveProject, removeProject, setActiveProject } from '../services/storageService'

export default function ConfigModal({ show, onClose, onSave, onProjectSwitch }) {
  const existingConfig = loadConfig()
  const [activeTab, setActiveTab] = useState('connection')

  const [gitlabUrl, setGitlabUrl] = useState(existingConfig.gitlabUrl || 'https://gitlab.com')
  const [projectId, setProjectId] = useState(existingConfig.projectId || '')
  const [groupPath, setGroupPath] = useState(existingConfig.groupPath || '')
  const [token, setToken] = useState(existingConfig.token || '')
  const [filter2025, setFilter2025] = useState(existingConfig.filter2025 || false)

  // Portfolio management state
  const [projects, setProjects] = useState(getAllProjects())
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    gitlabUrl: 'https://gitlab.com',
    token: '',
    projectId: '',
    groupPath: ''
  })

  if (!show) return null

  const handleSave = () => {
    const config = {
      gitlabUrl,
      projectId,
      groupPath,
      token,
      filter2025
    }

    saveConfig(config)
    onSave()
    onClose()
  }

  // Portfolio management functions
  const handleAddProject = () => {
    if (!formData.name || !formData.token || !formData.projectId) {
      alert('Please fill in all required fields')
      return
    }

    const updatedProjects = saveProject(formData)
    setProjects(updatedProjects)
    setFormData({
      name: '',
      gitlabUrl: 'https://gitlab.com',
      token: '',
      projectId: '',
      groupPath: ''
    })
    setShowAddForm(false)
    setEditingProject(null)
  }

  const handleEditProject = (project) => {
    setEditingProject(project.id)
    setFormData({
      id: project.id,
      name: project.name,
      gitlabUrl: project.gitlabUrl,
      token: project.token,
      projectId: project.projectId,
      groupPath: project.groupPath || ''
    })
    setShowAddForm(true)
  }

  const handleCancelEdit = () => {
    setShowAddForm(false)
    setEditingProject(null)
    setFormData({
      name: '',
      gitlabUrl: 'https://gitlab.com',
      token: '',
      projectId: '',
      groupPath: ''
    })
  }

  const handleRemoveProject = (projectId) => {
    if (!confirm('Are you sure you want to remove this project?')) {
      return
    }

    const updatedProjects = removeProject(projectId)
    setProjects(updatedProjects)
  }

  const handleSwitchProject = (projectId) => {
    setActiveProject(projectId)
    if (onProjectSwitch) {
      onProjectSwitch(projectId)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>Configuration</h2>
          </div>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ borderBottom: '1px solid var(--border-light)', margin: 0 }}>
          <button
            className={`tab ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            Connection
          </button>
          <button
            className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'connection' && (
            <>
              <div className="form-group">
                <label className="form-label">GitLab URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={gitlabUrl}
                  onChange={e => setGitlabUrl(e.target.value)}
                  placeholder="https://gitlab.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  placeholder="123 or group/project"
                />
                <div className="text-small text-muted" style={{ marginTop: '4px' }}>
                  Find this in your GitLab project settings
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Group Path (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={groupPath}
                  onChange={e => setGroupPath(e.target.value)}
                  placeholder="my-group or parent-group/sub-group"
                />
                <div className="text-small text-muted" style={{ marginTop: '4px' }}>
                  Required for Epic support (Premium/Ultimate only)
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Access Token</label>
                <input
                  type="password"
                  className="form-input"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                />
                <div className="text-small text-muted" style={{ marginTop: '4px' }}>
                  Create a personal access token with 'api' and 'read_api' scopes
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <input
                    type="checkbox"
                    id="filter2025"
                    checked={filter2025}
                    onChange={e => setFilter2025(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="filter2025" style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                      Filter data by year 2025+
                    </div>
                    <div className="text-small text-muted">
                      When enabled, only shows issues, epics, and milestones with dates {'>='} 2025-01-01
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === 'projects' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      Manage Projects
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280' }}>
                      Add multiple projects and switch between them
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (showAddForm) {
                        handleCancelEdit()
                      } else {
                        setShowAddForm(true)
                      }
                    }}
                  >
                    {showAddForm ? 'Cancel' : '+ Add Project'}
                  </button>
                </div>

                {showAddForm && (
                  <div className="card" style={{ padding: '20px', marginBottom: '20px', background: '#F9FAFB' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                      {editingProject ? 'Edit Project' : 'Add New Project'}
                    </h4>

                    <div className="form-group">
                      <label className="form-label">Project Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="My Project"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">GitLab URL</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.gitlabUrl}
                        onChange={e => setFormData({ ...formData, gitlabUrl: e.target.value })}
                        placeholder="https://gitlab.com"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Project ID</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.projectId}
                        onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                        placeholder="123 or group/project"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Group Path (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.groupPath}
                        onChange={e => setFormData({ ...formData, groupPath: e.target.value })}
                        placeholder="my-group"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Access Token</label>
                      <input
                        type="password"
                        className="form-input"
                        value={formData.token}
                        onChange={e => setFormData({ ...formData, token: e.target.value })}
                        placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                      <button className="btn btn-primary" onClick={handleAddProject}>
                        {editingProject ? 'Update' : 'Add'} Project
                      </button>
                    </div>
                  </div>
                )}

                {projects.length === 0 ? (
                  <div className="card text-center" style={{ padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📁</div>
                    <h3 className="mb-2">No Projects</h3>
                    <p className="text-muted">
                      Add your first project to get started
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {projects.map(project => (
                      <div
                        key={project.id}
                        className="card"
                        style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                            {project.name}
                          </h4>
                          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                            {project.projectId} · {project.gitlabUrl}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn"
                            onClick={() => handleSwitchProject(project.id)}
                            style={{ fontSize: '13px' }}
                          >
                            Switch To
                          </button>
                          <button
                            className="btn"
                            onClick={() => handleEditProject(project)}
                            style={{ fontSize: '13px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn"
                            onClick={() => handleRemoveProject(project.id)}
                            style={{ fontSize: '13px', color: '#DC2626' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          {activeTab === 'connection' && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!gitlabUrl || !projectId || !token}
            >
              Save Configuration
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
