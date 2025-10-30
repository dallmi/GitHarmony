import React, { useState } from 'react'
import { loadConfig, saveConfig } from '../services/storageService'

export default function ConfigModal({ show, onClose, onSave }) {
  const existingConfig = loadConfig()

  const [gitlabUrl, setGitlabUrl] = useState(existingConfig.gitlabUrl || 'https://gitlab.com')
  const [projectId, setProjectId] = useState(existingConfig.projectId || '')
  const [groupPath, setGroupPath] = useState(existingConfig.groupPath || '')
  const [token, setToken] = useState(existingConfig.token || '')
  const [filter2025, setFilter2025] = useState(existingConfig.filter2025 !== undefined ? existingConfig.filter2025 : true)

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>GitLab Configuration</h2>
          </div>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
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
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!gitlabUrl || !projectId || !token}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}
