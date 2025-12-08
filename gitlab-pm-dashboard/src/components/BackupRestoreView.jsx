import React, { useState, useRef } from 'react'
import {
  createBackup,
  exportBackupToFile,
  importBackupFromFile,
  restoreFromBackup,
  validateBackup,
  getBackupStatistics
} from '../services/backupService.js'

export default function BackupRestoreView() {
  const [includeTokens, setIncludeTokens] = useState(false)
  const [stats, setStats] = useState(null)
  const [backupInfo, setBackupInfo] = useState(null)
  const [restoreResult, setRestoreResult] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Load statistics on mount
  React.useEffect(() => {
    loadStats()
  }, [])

  const loadStats = () => {
    const statistics = getBackupStatistics()
    setStats(statistics)
  }

  const handleExportBackup = () => {
    try {
      setLoading(true)
      setError(null)

      const backup = createBackup({ includeTokens })
      const filename = exportBackupToFile(backup)

      setBackupInfo({
        filename,
        timestamp: backup.metadata.timestamp,
        itemCount: backup.metadata.itemCount,
        includedData: backup.metadata.includedData,
        tokensIncluded: includeTokens
      })

      loadStats()
    } catch (err) {
      setError('Failed to create backup: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError(null)
      setValidationResult(null)
      setRestoreResult(null)

      const backup = await importBackupFromFile(file)
      const validation = validateBackup(backup)

      setValidationResult(validation)

      if (!validation.valid) {
        setError('Backup validation failed: ' + validation.errors.join(', '))
        return
      }

      // Show validation info and wait for user confirmation
      // Store backup for restore
      window.__pendingBackup = backup
    } catch (err) {
      setError('Failed to import backup: ' + err.message)
    } finally {
      setLoading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleRestoreBackup = (overwrite = true) => {
    try {
      setLoading(true)
      setError(null)

      const backup = window.__pendingBackup
      if (!backup) {
        setError('No backup loaded. Please import a backup file first.')
        return
      }

      const result = restoreFromBackup(backup, { overwrite })

      setRestoreResult(result)

      if (result.success) {
        // Clear pending backup
        delete window.__pendingBackup
        setValidationResult(null)

        // Reload stats
        loadStats()

        // Notify user to refresh page
        setTimeout(() => {
          if (window.confirm('Backup restored successfully! Refresh the page to apply changes?')) {
            window.location.reload()
          }
        }, 500)
      }
    } catch (err) {
      setError('Failed to restore backup: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRestore = () => {
    delete window.__pendingBackup
    setValidationResult(null)
    setRestoreResult(null)
  }

  return (
    <div className="backup-restore-view">
      <div className="view-header">
        <h2>Backup & Restore</h2>
        <p className="subtitle">
          Export and import all your configurations to share with team members or backup your settings
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Current Data Statistics */}
      <div className="card">
        <h3>Current Data</h3>
        {stats && (
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Categories</div>
              <div className="stat-value">{stats.totalItems}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Estimated Size</div>
              <div className="stat-value">{stats.estimatedSizeKB} KB</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Categories</div>
              <div className="stat-value-small">
                {stats.categories.join(', ')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Backup Section */}
      <div className="card">
        <h3>Export Backup</h3>
        <p>Create a backup file that can be shared with team members or stored for safekeeping.</p>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={includeTokens}
              onChange={(e) => setIncludeTokens(e.target.checked)}
            />
            Include access tokens (sensitive data)
          </label>
          <p className="help-text">
            By default, access tokens are masked for security. Enable this only if you need to share
            functional configurations with trusted team members.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleExportBackup}
          disabled={loading}
        >
          {loading ? 'Creating Backup...' : 'Export Backup'}
        </button>

        {backupInfo && (
          <div className="alert alert-success" style={{ marginTop: '1rem' }}>
            <strong>Backup Created!</strong>
            <ul style={{ margin: '0.5rem 0 0 1rem' }}>
              <li>File: {backupInfo.filename}</li>
              <li>Items: {backupInfo.itemCount} categories</li>
              <li>Tokens: {backupInfo.tokensIncluded ? 'Included' : 'Masked'}</li>
              <li>Time: {new Date(backupInfo.timestamp).toLocaleString()}</li>
            </ul>
          </div>
        )}
      </div>

      {/* Import Backup Section */}
      <div className="card">
        <h3>Import Backup</h3>
        <p>Restore configurations from a backup file. This can overwrite existing data.</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />

        <button
          className="btn btn-secondary"
          onClick={handleImportClick}
          disabled={loading}
        >
          {loading ? 'Loading Backup...' : 'Select Backup File'}
        </button>

        {/* Validation Results */}
        {validationResult && (
          <div className="validation-results" style={{ marginTop: '1rem' }}>
            <div className={`alert ${validationResult.valid ? 'alert-info' : 'alert-error'}`}>
              <h4>Backup Validation</h4>

              {validationResult.errors.length > 0 && (
                <div>
                  <strong>Errors:</strong>
                  <ul>
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div>
                  <strong>Warnings:</strong>
                  <ul>
                    {validationResult.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.info && (
                <div>
                  <strong>Backup Info:</strong>
                  <ul>
                    <li>Created: {new Date(validationResult.info.createdAt).toLocaleString()}</li>
                    <li>Age: {validationResult.info.backupAge}</li>
                    <li>Items: {validationResult.info.itemCount}</li>
                    <li>Categories: {validationResult.info.includedData.join(', ')}</li>
                  </ul>
                </div>
              )}
            </div>

            {validationResult.valid && (
              <div className="restore-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handleRestoreBackup(true)}
                  disabled={loading}
                >
                  Restore & Overwrite
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelRestore}
                  disabled={loading}
                >
                  Cancel
                </button>
                <p className="help-text">
                  "Restore & Overwrite" will replace existing data with backup data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Restore Results */}
        {restoreResult && (
          <div className="alert alert-success" style={{ marginTop: '1rem' }}>
            <h4>Restore Complete</h4>
            <ul>
              <li>Restored: {restoreResult.restored.join(', ')}</li>
              {restoreResult.skipped.length > 0 && (
                <li>Skipped: {restoreResult.skipped.join(', ')}</li>
              )}
              {restoreResult.failed.length > 0 && (
                <li style={{ color: 'red' }}>Failed: {restoreResult.failed.join(', ')}</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Instructions for Team Sharing */}
      <div className="card">
        <h3>Team Collaboration</h3>
        <p>
          <strong>To share configurations with team members:</strong>
        </p>
        <ol>
          <li>Export a backup using the "Export Backup" button above</li>
          <li>Share the downloaded JSON file with your team member (via email, Slack, etc.)</li>
          <li>Team member opens the GitLab PM Dashboard in their browser</li>
          <li>Team member imports the file using "Select Backup File"</li>
          <li>Team member clicks "Restore & Overwrite" to apply your configurations</li>
        </ol>

        <div className="alert alert-warning">
          <strong>Important:</strong>
          <ul>
            <li>Access tokens are masked by default for security</li>
            <li>Team members will need to enter their own GitLab access tokens after restore</li>
            <li>Backup files contain all project configurations, team settings, and custom rules</li>
            <li>Restoring will overwrite existing configurations</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .backup-restore-view {
          padding: 1rem;
          max-width: 1000px;
        }

        .view-header {
          margin-bottom: 2rem;
        }

        .view-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
        }

        .subtitle {
          color: #666;
          margin: 0;
        }

        .card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.3rem;
        }

        .card p {
          margin: 0 0 1rem 0;
          color: #666;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .stat-item {
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 6px;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #333;
        }

        .stat-value-small {
          font-size: 0.9rem;
          color: #333;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .help-text {
          font-size: 0.85rem;
          color: #666;
          margin: 0.5rem 0 0 1.5rem;
        }

        .btn {
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 6px;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #1f77b4;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #155a8a;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          margin-left: 0.5rem;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .alert {
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .alert h4 {
          margin: 0 0 0.5rem 0;
        }

        .alert ul {
          margin: 0.5rem 0 0 1rem;
        }

        .alert-success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .alert-error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .alert-warning {
          background: #fff3cd;
          border: 1px solid #ffeeba;
          color: #856404;
        }

        .alert-info {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          color: #0c5460;
        }

        .restore-actions {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #ddd;
        }

        .validation-results {
          border-top: 1px solid #ddd;
          padding-top: 1rem;
        }

        ol {
          margin: 0.5rem 0 1rem 1.5rem;
        }

        ol li {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  )
}
