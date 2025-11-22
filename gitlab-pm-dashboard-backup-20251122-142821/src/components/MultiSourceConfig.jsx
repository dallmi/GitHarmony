import React, { useState, useEffect } from 'react'
import { fetchFromMultipleSources, createUnifiedIssueEpicView } from '../services/multiSourceGitlabApi'

/**
 * Multi-Source Configuration Component
 * Allows configuration of multiple projects and groups for comprehensive data aggregation
 */
export default function MultiSourceConfig({ onSave, onClose, initialSources = [] }) {
  const [sources, setSources] = useState(initialSources)
  const [editingIndex, setEditingIndex] = useState(null)
  const [testResults, setTestResults] = useState(null)
  const [testing, setTesting] = useState(false)

  const [formData, setFormData] = useState({
    type: 'project-group',
    name: '',
    gitlabUrl: 'https://gitlab.com',
    token: '',
    projectId: '',
    groupPaths: [''],
    includeSubgroups: true
  })

  const sourceTypes = [
    {
      value: 'project',
      label: 'Project Only',
      description: 'Fetch issues and milestones from a project'
    },
    {
      value: 'group',
      label: 'Group Only',
      description: 'Fetch epics from one or more groups'
    },
    {
      value: 'project-group',
      label: 'Project + Groups',
      description: 'Fetch issues from project and epics from groups'
    }
  ]

  const handleAddSource = () => {
    if (!formData.name || !formData.token) {
      alert('Please provide a name and token')
      return
    }

    if (formData.type !== 'group' && !formData.projectId) {
      alert('Please provide a project ID')
      return
    }

    if (formData.type !== 'project' && formData.groupPaths.filter(g => g).length === 0) {
      alert('Please provide at least one group path')
      return
    }

    const newSource = {
      ...formData,
      groupPaths: formData.groupPaths.filter(g => g) // Remove empty strings
    }

    if (editingIndex !== null) {
      const updated = [...sources]
      updated[editingIndex] = newSource
      setSources(updated)
      setEditingIndex(null)
    } else {
      setSources([...sources, newSource])
    }

    // Reset form
    setFormData({
      type: 'project-group',
      name: '',
      gitlabUrl: 'https://gitlab.com',
      token: '',
      projectId: '',
      groupPaths: [''],
      includeSubgroups: true
    })
  }

  const handleEditSource = (index) => {
    setFormData(sources[index])
    setEditingIndex(index)
  }

  const handleDeleteSource = (index) => {
    setSources(sources.filter((_, i) => i !== index))
  }

  const handleAddGroupPath = () => {
    setFormData({
      ...formData,
      groupPaths: [...formData.groupPaths, '']
    })
  }

  const handleUpdateGroupPath = (index, value) => {
    const updated = [...formData.groupPaths]
    updated[index] = value
    setFormData({ ...formData, groupPaths: updated })
  }

  const handleRemoveGroupPath = (index) => {
    setFormData({
      ...formData,
      groupPaths: formData.groupPaths.filter((_, i) => i !== index)
    })
  }

  const handleTestConfiguration = async () => {
    if (sources.length === 0) {
      alert('Please add at least one source')
      return
    }

    setTesting(true)
    setTestResults(null)

    try {
      const data = await fetchFromMultipleSources(sources, { test: true })
      setTestResults({
        success: true,
        statistics: data.statistics,
        sources: data.sourceMetadata,
        errors: data.errors
      })
    } catch (error) {
      setTestResults({
        success: false,
        error: error.message
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    if (sources.length === 0) {
      alert('Please add at least one source')
      return
    }

    onSave(sources)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2>Multi-Source Configuration</h2>
          <button onClick={onClose} style={{ fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        {/* Source Type Selection */}
        <div style={{
          background: '#F9FAFB',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginBottom: '16px' }}>Add Data Source</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Source Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
            >
              {sourceTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Source Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Frontend Team"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>GitLab URL</label>
              <input
                type="text"
                value={formData.gitlabUrl}
                onChange={e => setFormData({ ...formData, gitlabUrl: e.target.value })}
                placeholder="https://gitlab.com"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
              />
            </div>
          </div>

          {formData.type !== 'group' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Project ID</label>
              <input
                type="text"
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                placeholder="123 or namespace/project"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
              />
            </div>
          )}

          {formData.type !== 'project' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Group Paths
                <button
                  onClick={handleAddGroupPath}
                  style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    background: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  + Add Group
                </button>
              </label>
              {formData.groupPaths.map((path, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={path}
                    onChange={e => handleUpdateGroupPath(index, e.target.value)}
                    placeholder="my-group or parent/subgroup"
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                  />
                  {formData.groupPaths.length > 1 && (
                    <button
                      onClick={() => handleRemoveGroupPath(index)}
                      style={{
                        padding: '8px',
                        background: '#DC2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.includeSubgroups}
                  onChange={e => setFormData({ ...formData, includeSubgroups: e.target.checked })}
                />
                Include subgroups
              </label>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Access Token</label>
            <input
              type="password"
              value={formData.token}
              onChange={e => setFormData({ ...formData, token: e.target.value })}
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
            />
          </div>

          <button
            onClick={handleAddSource}
            style={{
              padding: '10px 20px',
              background: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {editingIndex !== null ? 'Update Source' : 'Add Source'}
          </button>
        </div>

        {/* Configured Sources List */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Configured Sources ({sources.length})</h3>
          {sources.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: '#F9FAFB',
              borderRadius: '8px',
              color: '#6B7280'
            }}>
              No sources configured yet. Add your first source above.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {sources.map((source, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{source.name}</div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>
                      Type: {source.type} |
                      {source.projectId && ` Project: ${source.projectId} | `}
                      {source.groupPaths?.length > 0 && ` Groups: ${source.groupPaths.join(', ')}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditSource(index)}
                      style={{
                        padding: '6px 12px',
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSource(index)}
                      style={{
                        padding: '6px 12px',
                        background: '#DC2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults && (
          <div style={{
            padding: '16px',
            background: testResults.success ? '#D1FAE5' : '#FEE2E2',
            border: `1px solid ${testResults.success ? '#10B981' : '#DC2626'}`,
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <h4 style={{ marginBottom: '12px' }}>Test Results</h4>
            {testResults.success ? (
              <>
                <div style={{ marginBottom: '8px' }}>
                  ✅ Successfully connected to {testResults.statistics.successfulSources} of {testResults.statistics.sourceCount} sources
                </div>
                <div style={{ fontSize: '14px', color: '#374151' }}>
                  <div>📋 Issues: {testResults.statistics.totalIssues}</div>
                  <div>📊 Epics: {testResults.statistics.totalEpics}</div>
                  <div>🎯 Milestones: {testResults.statistics.totalMilestones}</div>
                  <div>🔗 Issues with Epics: {testResults.statistics.issuesWithEpics}</div>
                </div>
                {testResults.errors?.length > 0 && (
                  <div style={{ marginTop: '12px', color: '#DC2626' }}>
                    ⚠️ Errors: {testResults.errors.map(e => e.source).join(', ')}
                  </div>
                )}
              </>
            ) : (
              <div>❌ Test failed: {testResults.error}</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={handleTestConfiguration}
            disabled={testing || sources.length === 0}
            style={{
              padding: '10px 20px',
              background: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: testing || sources.length === 0 ? 'not-allowed' : 'pointer',
              opacity: testing || sources.length === 0 ? 0.5 : 1,
              fontWeight: '600'
            }}
          >
            {testing ? 'Testing...' : 'Test Configuration'}
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={sources.length === 0}
              style={{
                padding: '10px 20px',
                background: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: sources.length === 0 ? 'not-allowed' : 'pointer',
                opacity: sources.length === 0 ? 0.5 : 1,
                fontWeight: '600'
              }}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}