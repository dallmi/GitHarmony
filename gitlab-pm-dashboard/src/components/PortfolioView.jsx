import React, { useState } from 'react'
import { getAllProjects, saveProject, removeProject, setActiveProject } from '../services/storageService'

/**
 * Portfolio Dashboard View
 * Manage multiple projects and view portfolio overview
 */
export default function PortfolioView({ onProjectSwitch }) {
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
    if (!confirm('Are you sure you want to remove this project from the portfolio?')) {
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
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Project Portfolio
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Manage multiple projects and switch between them
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

      {/* Add/Edit Project Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '30px', background: '#F9FAFB' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Project"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
                GitLab URL *
              </label>
              <input
                type="text"
                value={formData.gitlabUrl}
                onChange={(e) => setFormData({ ...formData, gitlabUrl: e.target.value })}
                placeholder="https://gitlab.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
                Project ID *
              </label>
              <input
                type="text"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                placeholder="12345 or namespace/project"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
                Group Path (Optional)
              </label>
              <input
                type="text"
                value={formData.groupPath}
                onChange={(e) => setFormData({ ...formData, groupPath: e.target.value })}
                placeholder="my-group"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
                Access Token *
              </label>
              <input
                type="password"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddProject}
            >
              {editingProject ? 'Save Changes' : 'Add Project'}
            </button>
          </div>
        </div>
      )}

      {/* Portfolio Overview */}
      {projects.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <h3 className="mb-2">No Projects Yet</h3>
          <p className="text-muted" style={{ marginBottom: '20px' }}>
            Add your first project to start managing your portfolio
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            + Add Project
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="card">
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Projects</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>
                {projects.length}
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Recent Projects</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#2563EB' }}>
                {projects.filter(p => {
                  const addedDate = new Date(p.addedAt)
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  return addedDate > weekAgo
                }).length}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                Added in last 7 days
              </div>
            </div>
          </div>

          {/* Project List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {projects.map((project) => (
              <div
                key={project.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  ':hover': { transform: 'translateY(-2px)' }
                }}
              >
                {/* Project Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                      {project.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {project.projectId}
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>URL:</strong> {project.gitlabUrl}
                  </div>
                  {project.groupPath && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Group:</strong> {project.groupPath}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '11px' }}>
                    Added: {new Date(project.addedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleSwitchProject(project.id)}
                  >
                    Open Project
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEditProject(project)}
                    style={{ padding: '8px 16px' }}
                    title="Edit Project"
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleRemoveProject(project.id)}
                    style={{ padding: '8px 16px' }}
                    title="Delete Project"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Info Card */}
      <div
        className="card"
        style={{
          marginTop: '30px',
          background: '#EFF6FF',
          borderColor: '#BFDBFE'
        }}
      >
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', marginBottom: '4px' }}>
              Portfolio Management
            </div>
            <div style={{ fontSize: '13px', color: '#1E40AF', lineHeight: '1.5' }}>
              Add multiple GitLab projects to your portfolio. Click "Open Project" to switch between them.
              All project configurations are stored locally in your browser.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
