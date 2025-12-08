import React, { useState, useEffect } from 'react'
import { loadProjectGroups, saveProjectGroup, deleteProjectGroup } from '../services/projectGroupService'
import { getAllProjects } from '../services/storageService'

/**
 * Project Group Manager
 * Allows creating custom groupings of projects for flexible portfolio views
 */
export default function ProjectGroupManager({ onSelect }) {
  const [projectGroups, setProjectGroups] = useState(loadProjectGroups())
  const [allProjects, setAllProjects] = useState(getAllProjects())
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    projectIds: [],
    sharedGroupPaths: ['']
  })

  useEffect(() => {
    setAllProjects(getAllProjects())
  }, [])

  const handleSaveGroup = () => {
    if (!formData.name || formData.projectIds.length === 0) {
      alert('Please provide a name and select at least one project')
      return
    }

    const groupData = {
      ...formData,
      id: editingGroup?.id,
      sharedGroupPaths: formData.sharedGroupPaths.filter(p => p.trim() !== '')
    }

    const updated = saveProjectGroup(groupData)
    setProjectGroups(updated)
    setFormData({ name: '', projectIds: [], sharedGroupPaths: [''] })
    setShowForm(false)
    setEditingGroup(null)
  }

  const handleEditGroup = (group) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      projectIds: group.projectIds || [],
      sharedGroupPaths: group.sharedGroupPaths && group.sharedGroupPaths.length > 0
        ? group.sharedGroupPaths
        : ['']
    })
    setShowForm(true)
  }

  const handleDeleteGroup = (groupId) => {
    if (confirm('Delete this project group?')) {
      const updated = deleteProjectGroup(groupId)
      setProjectGroups(updated)
    }
  }

  const handleToggleProject = (projectId) => {
    if (formData.projectIds.includes(projectId)) {
      setFormData({
        ...formData,
        projectIds: formData.projectIds.filter(id => id !== projectId)
      })
    } else {
      setFormData({
        ...formData,
        projectIds: [...formData.projectIds, projectId]
      })
    }
  }

  const handleAddSharedGroupPath = () => {
    setFormData({
      ...formData,
      sharedGroupPaths: [...formData.sharedGroupPaths, '']
    })
  }

  const handleUpdateSharedGroupPath = (index, value) => {
    const updated = [...formData.sharedGroupPaths]
    updated[index] = value
    setFormData({ ...formData, sharedGroupPaths: updated })
  }

  const handleRemoveSharedGroupPath = (index) => {
    if (formData.sharedGroupPaths.length > 1) {
      setFormData({
        ...formData,
        sharedGroupPaths: formData.sharedGroupPaths.filter((_, i) => i !== index)
      })
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: '4px' }}>Project Groups</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            Create custom groupings of projects for flexible portfolio views
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) {
              setEditingGroup(null)
              setFormData({ name: '', projectIds: [], sharedGroupPaths: [''] })
            }
          }}
          style={{
            padding: '8px 16px',
            background: showForm ? '#6B7280' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          {showForm ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: '#F9FAFB',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #E5E7EB'
        }}>
          <h4 style={{ marginTop: 0 }}>
            {editingGroup ? 'Edit Project Group' : 'Create New Project Group'}
          </h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
              Group Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Astro Team Projects"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
              Select Projects ({formData.projectIds.length} selected)
            </label>
            {allProjects.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                background: 'white',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                color: '#6B7280'
              }}>
                No projects configured. Add projects first in the Projects tab.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '8px',
                background: 'white',
                borderRadius: '6px',
                border: '1px solid #E5E7EB'
              }}>
                {allProjects.map(project => (
                  <label
                    key={project.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: formData.projectIds.includes(project.id) ? '#EFF6FF' : 'white',
                      border: `1px solid ${formData.projectIds.includes(project.id) ? '#3B82F6' : '#E5E7EB'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      if (!formData.projectIds.includes(project.id)) {
                        e.currentTarget.style.background = '#F9FAFB'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!formData.projectIds.includes(project.id)) {
                        e.currentTarget.style.background = 'white'
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.projectIds.includes(project.id)}
                      onChange={() => handleToggleProject(project.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{project.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{project.projectId}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px' }}>
                Shared Group Paths (Optional)
              </label>
              <button
                type="button"
                onClick={handleAddSharedGroupPath}
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
                + Add Path
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
              Add group paths to fetch additional epics beyond what's configured in individual projects
            </div>
            {formData.sharedGroupPaths.map((path, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={path}
                  onChange={e => handleUpdateSharedGroupPath(index, e.target.value)}
                  placeholder="e.g., ubs-ag/shared-epics"
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                {formData.sharedGroupPaths.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSharedGroupPath(index)}
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

          <button
            onClick={handleSaveGroup}
            disabled={!formData.name || formData.projectIds.length === 0}
            style={{
              width: '100%',
              padding: '10px',
              background: !formData.name || formData.projectIds.length === 0 ? '#9CA3AF' : '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !formData.name || formData.projectIds.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {editingGroup ? 'Update Group' : 'Create Group'}
          </button>
        </div>
      )}

      {/* Project Groups List */}
      <div>
        {projectGroups.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            color: '#6B7280'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
              No Project Groups Yet
            </div>
            <div style={{ fontSize: '14px' }}>
              Create custom groupings to view subsets of your projects together
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {projectGroups.map(group => {
              const groupProjects = allProjects.filter(p => group.projectIds.includes(p.id))
              return (
                <div
                  key={group.id}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, marginBottom: '4px' }}>{group.name}</h4>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>
                        {groupProjects.length} project{groupProjects.length !== 1 ? 's' : ''}
                        {group.sharedGroupPaths && group.sharedGroupPaths.length > 0 && (
                          <span> • {group.sharedGroupPaths.length} shared group{group.sharedGroupPaths.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          if (onSelect) {
                            onSelect(group.id)
                          }
                        }}
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
                        onClick={() => handleDeleteGroup(group.id)}
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

                  {/* Project List */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {groupProjects.map(project => (
                      <div
                        key={project.id}
                        style={{
                          padding: '4px 8px',
                          background: '#EFF6FF',
                          color: '#1E40AF',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {project.name}
                      </div>
                    ))}
                  </div>

                  {/* Shared Group Paths */}
                  {group.sharedGroupPaths && group.sharedGroupPaths.length > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        Shared epic sources:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {group.sharedGroupPaths.map((path, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '4px 8px',
                              background: '#FEF3C7',
                              color: '#92400E',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}
                          >
                            {path}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}