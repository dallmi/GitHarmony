import React, { useState } from 'react'
import {
  loadConfig, saveConfig,
  getAllProjects, saveProject, removeProject, setActiveProject,
  getAllGroups, saveGroup, removeGroup, setActiveGroup
} from '../services/storageService'
import ProjectGroupManager from './ProjectGroupManager'

export default function ConfigModal({ show, onClose, onSave, onProjectSwitch }) {
  const existingConfig = loadConfig()
  const [activeTab, setActiveTab] = useState('connection')

  const [mode, setMode] = useState(existingConfig.mode || 'project')
  const [gitlabUrl, setGitlabUrl] = useState(existingConfig.gitlabUrl || 'https://gitlab.com')
  const [projectId, setProjectId] = useState(existingConfig.projectId || '')
  const [groupPaths, setGroupPaths] = useState(
    existingConfig.groupPaths && Array.isArray(existingConfig.groupPaths)
      ? existingConfig.groupPaths
      : (existingConfig.groupPath ? [existingConfig.groupPath] : [''])
  )
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
    groupPaths: ['']
  })

  // Group/Pod management state
  const [groups, setGroups] = useState(getAllGroups())
  const [showAddGroupForm, setShowAddGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    gitlabUrl: 'https://gitlab.com',
    token: '',
    groupPath: ''
  })

  if (!show) return null

  const handleSave = () => {
    // Filter out empty group paths and save both formats for compatibility
    const filteredGroupPaths = groupPaths.filter(path => path.trim() !== '')
    const config = {
      gitlabUrl,
      projectId,
      groupPath: filteredGroupPaths[0] || '', // For backward compatibility
      groupPaths: filteredGroupPaths, // New format supporting multiple paths
      token,
      mode,
      filter2025
    }

    saveConfig(config)
    onSave()
    onClose()
  }

  const handleAddGroupPath = () => {
    setGroupPaths([...groupPaths, ''])
  }

  const handleUpdateGroupPath = (index, value) => {
    const updated = [...groupPaths]
    updated[index] = value
    setGroupPaths(updated)
  }

  const handleRemoveGroupPath = (index) => {
    if (groupPaths.length > 1) {
      setGroupPaths(groupPaths.filter((_, i) => i !== index))
    }
  }

  const handleAddFormGroupPath = () => {
    setFormData({ ...formData, groupPaths: [...formData.groupPaths, ''] })
  }

  const handleUpdateFormGroupPath = (index, value) => {
    const updated = [...formData.groupPaths]
    updated[index] = value
    setFormData({ ...formData, groupPaths: updated })
  }

  const handleRemoveFormGroupPath = (index) => {
    if (formData.groupPaths.length > 1) {
      setFormData({ ...formData, groupPaths: formData.groupPaths.filter((_, i) => i !== index) })
    }
  }

  // Portfolio management functions
  const handleAddProject = () => {
    if (!formData.name || !formData.token || !formData.projectId) {
      alert('Please fill in all required fields')
      return
    }

    const filteredGroupPaths = formData.groupPaths.filter(path => path.trim() !== '')
    const projectData = {
      ...formData,
      groupPath: filteredGroupPaths[0] || '', // For backward compatibility
      groupPaths: filteredGroupPaths
    }

    const updatedProjects = saveProject(projectData)
    setProjects(updatedProjects)
    setFormData({
      name: '',
      gitlabUrl: 'https://gitlab.com',
      token: '',
      projectId: '',
      groupPaths: ['']
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
      groupPaths: project.groupPaths && Array.isArray(project.groupPaths) && project.groupPaths.length > 0
        ? project.groupPaths
        : (project.groupPath ? [project.groupPath] : [''])
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

  // Group/Pod management functions
  const handleAddGroup = () => {
    if (!groupFormData.name || !groupFormData.token || !groupFormData.groupPath) {
      alert('Please fill in all required fields (Name, Token, and Group Path/ID)')
      return
    }

    const updatedGroups = saveGroup(groupFormData)
    setGroups(updatedGroups)
    setGroupFormData({
      name: '',
      gitlabUrl: 'https://gitlab.com',
      token: '',
      groupPath: ''
    })
    setShowAddGroupForm(false)
    setEditingGroup(null)
  }

  const handleEditGroup = (group) => {
    setEditingGroup(group.id)
    setGroupFormData({
      id: group.id,
      name: group.name,
      gitlabUrl: group.gitlabUrl,
      token: group.token,
      groupPath: group.groupPath
    })
    setShowAddGroupForm(true)
  }

  const handleCancelGroupEdit = () => {
    setShowAddGroupForm(false)
    setEditingGroup(null)
    setGroupFormData({
      name: '',
      gitlabUrl: 'https://gitlab.com',
      token: '',
      groupPath: ''
    })
  }

  const handleRemoveGroup = (groupId) => {
    if (!confirm('Are you sure you want to remove this group/pod?')) {
      return
    }

    const updatedGroups = removeGroup(groupId)
    setGroups(updatedGroups)
  }

  const handleSwitchGroup = (groupId) => {
    setActiveGroup(groupId)
    if (onProjectSwitch) {
      onProjectSwitch(`pod:${groupId}`)
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
          <button
            className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            Project Groups
          </button>
          <button
            className={`tab ${activeTab === 'pods' ? 'active' : ''}`}
            onClick={() => setActiveTab('pods')}
          >
            Pods
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
                <label className="form-label">Mode</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', border: `2px solid ${mode === 'project' ? '#3B82F6' : '#E5E7EB'}`, borderRadius: '8px', cursor: 'pointer', flex: 1, background: mode === 'project' ? '#EFF6FF' : 'white' }}>
                    <input
                      type="radio"
                      name="mode"
                      value="project"
                      checked={mode === 'project'}
                      onChange={e => setMode(e.target.value)}
                      style={{ accentColor: '#3B82F6' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1F2937' }}>Single Project</div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        Fetch data from one specific project
                      </div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', border: `2px solid ${mode === 'group' ? '#3B82F6' : '#E5E7EB'}`, borderRadius: '8px', cursor: 'pointer', flex: 1, background: mode === 'group' ? '#EFF6FF' : 'white' }}>
                    <input
                      type="radio"
                      name="mode"
                      value="group"
                      checked={mode === 'group'}
                      onChange={e => setMode(e.target.value)}
                      style={{ accentColor: '#3B82F6' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1F2937' }}>Entire Group</div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        Aggregate data from all projects in a group
                      </div>
                    </div>
                  </label>
                </div>
                <div className="text-small text-muted" style={{ marginTop: '8px', padding: '8px', background: '#F0F9FF', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                  <strong>💡 Tip:</strong> Use <strong>Group Mode</strong> for multi-project pods/teams. This will automatically fetch issues from all projects and subgroups.
                </div>
              </div>

              {mode === 'project' && (
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
              )}

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    {mode === 'group' ? 'Group Path (Required)' : 'Group Paths (Optional)'}
                  </label>
                  {mode === 'project' && (
                    <button
                      type="button"
                      onClick={handleAddGroupPath}
                      style={{
                        padding: '4px 12px',
                        background: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      + Add Group
                    </button>
                  )}
                </div>
                {groupPaths.map((path, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={path}
                      onChange={e => handleUpdateGroupPath(index, e.target.value)}
                      placeholder={mode === 'group' ? '12345 or GMDP Nova or parent-group/gmdp-nova' : 'my-group or parent-group/sub-group'}
                      style={{ flex: 1 }}
                    />
                    {mode === 'project' && groupPaths.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGroupPath(index)}
                        style={{
                          padding: '8px 12px',
                          background: '#DC2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <div className="text-small text-muted" style={{ marginTop: '4px' }}>
                  {mode === 'group'
                    ? 'Use numeric group ID (e.g., "12345") or group path (e.g., "GMDP Nova"). All projects in subgroups will be included automatically.'
                    : 'Required for Epic support (Premium/Ultimate only). Add multiple groups to fetch epics from different parts of your hierarchy.'
                  }
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
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Required:</strong> Personal access token with <code>api</code> and <code>read_api</code> scopes
                  </div>
                  <div style={{ color: '#DC2626', fontSize: '13px' }}>
                    ⚠️ <strong>For Epic support:</strong> Token must have group-level access. Project-only tokens cannot fetch epics.
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '12px' }}>
                    Create at: GitLab → User Settings → Access Tokens (not Project Settings)
                  </div>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Group Paths (Optional)</label>
                        <button
                          type="button"
                          onClick={handleAddFormGroupPath}
                          style={{
                            padding: '4px 12px',
                            background: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          + Add Group
                        </button>
                      </div>
                      {formData.groupPaths.map((path, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={path}
                            onChange={e => handleUpdateFormGroupPath(index, e.target.value)}
                            placeholder="my-group or parent-group/sub-group"
                            style={{ flex: 1 }}
                          />
                          {formData.groupPaths.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFormGroupPath(index)}
                              style={{
                                padding: '8px 12px',
                                background: '#DC2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
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

          {activeTab === 'groups' && (
            <ProjectGroupManager
              onSelect={(groupId) => {
                // Switch to the project group
                if (onProjectSwitch) {
                  setActiveProject(`group:${groupId}`)
                  onProjectSwitch(`group:${groupId}`)
                  onClose()
                }
              }}
              onClose={onClose}
            />
          )}

          {activeTab === 'pods' && (
            <>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '4px' }}>GitLab Groups (Pods)</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                    Configure multiple GitLab groups to track different teams/pods separately
                  </p>
                </div>
                <button
                  onClick={() => setShowAddGroupForm(!showAddGroupForm)}
                  style={{
                    padding: '8px 16px',
                    background: showAddGroupForm ? '#6B7280' : '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {showAddGroupForm ? 'Cancel' : '+ Add Pod'}
                </button>
              </div>

              {showAddGroupForm && (
                <div style={{
                  background: '#F9FAFB',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #E5E7EB'
                }}>
                  <h4 style={{ marginTop: 0 }}>
                    {editingGroup ? 'Edit Pod' : 'Add New Pod'}
                  </h4>

                  <div className="form-group">
                    <label className="form-label">Pod Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={groupFormData.name}
                      onChange={e => setGroupFormData({ ...groupFormData, name: e.target.value })}
                      placeholder="e.g., Nova Pod, Astro Team"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GitLab URL</label>
                    <input
                      type="text"
                      className="form-input"
                      value={groupFormData.gitlabUrl}
                      onChange={e => setGroupFormData({ ...groupFormData, gitlabUrl: e.target.value })}
                      placeholder="https://gitlab.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Group ID or Path</label>
                    <input
                      type="text"
                      className="form-input"
                      value={groupFormData.groupPath}
                      onChange={e => setGroupFormData({ ...groupFormData, groupPath: e.target.value })}
                      placeholder="12345 or GMDP Nova or parent-group/gmdp-nova"
                    />
                    <div className="text-small text-muted" style={{ marginTop: '4px' }}>
                      Use numeric group ID (e.g., "12345") or group path (e.g., "GMDP Nova"). All projects in subgroups will be included automatically.
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Access Token</label>
                    <input
                      type="password"
                      className="form-input"
                      value={groupFormData.token}
                      onChange={e => setGroupFormData({ ...groupFormData, token: e.target.value })}
                      placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    />
                    <div className="text-small text-muted" style={{ marginTop: '4px' }}>
                      Requires read_api scope
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleAddGroup}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {editingGroup ? 'Update Pod' : 'Add Pod'}
                    </button>
                    <button
                      onClick={handleCancelGroupEdit}
                      style={{
                        padding: '10px 20px',
                        background: '#6B7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {groups.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  color: '#6B7280'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏢</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                    No Pods Configured
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Add your first GitLab group to track team metrics
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {groups.map(group => (
                    <div
                      key={group.id}
                      style={{
                        padding: '16px',
                        background: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, marginBottom: '4px' }}>{group.name}</h4>
                          <div style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'monospace' }}>
                            {group.groupPath}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                            {group.gitlabUrl}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleSwitchGroup(group.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#10B981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditGroup(group)}
                            style={{
                              padding: '6px 12px',
                              background: '#3B82F6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveGroup(group.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#DC2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
