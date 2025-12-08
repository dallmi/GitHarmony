import React, { useState, useEffect } from 'react'
import { loadConfig, getAllProjects, getAllGroups } from '../services/storageService'

/**
 * Debug Panel - Shows diagnostic information
 * Press Ctrl+Alt+D to toggle (or Cmd+Alt+D on Mac)
 */
export default function DebugPanel({ externalVisible, onToggle }) {
  const [visible, setVisible] = useState(false)
  const [debugInfo, setDebugInfo] = useState({})

  // Use external visibility if provided
  const isVisible = externalVisible !== undefined ? externalVisible : visible

  // Toggle panel with Ctrl+Alt+D (or Cmd+Alt+D on Mac)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Use metaKey for Mac (Cmd) or ctrlKey for Windows/Linux
      const modifierKey = e.metaKey || e.ctrlKey
      if (modifierKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault() // Prevent any default browser behavior
        const newVisible = !isVisible
        if (onToggle) {
          onToggle(newVisible)
        } else {
          setVisible(newVisible)
        }
        if (newVisible) {
          collectDebugInfo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isVisible, onToggle])

  const collectDebugInfo = () => {
    console.log('🔍 DEBUG PANEL: Collecting diagnostic information...')

    const info = {
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      localStorage: {
        available: typeof localStorage !== 'undefined',
        itemCount: 0,
        keys: [],
        totalSize: 0
      },
      config: null,
      projects: [],
      groups: [],
      errors: []
    }

    // Check localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        info.localStorage.itemCount = localStorage.length
        info.localStorage.keys = Object.keys(localStorage)

        // Calculate total size
        let totalSize = 0
        for (let key in localStorage) {
          if (Object.hasOwn(localStorage, key)) {
            totalSize += localStorage[key].length + key.length
          }
        }
        info.localStorage.totalSize = totalSize

        console.log('✅ localStorage available:', info.localStorage)
      } else {
        console.error('❌ localStorage NOT available')
        info.errors.push('localStorage is not available')
      }
    } catch (err) {
      console.error('❌ Error accessing localStorage:', err)
      info.errors.push(`localStorage error: ${err.message}`)
    }

    // Load configuration
    try {
      info.config = loadConfig()
      console.log('✅ Configuration loaded:', info.config)
    } catch (err) {
      console.error('❌ Error loading config:', err)
      info.errors.push(`Config error: ${err.message}`)
    }

    // Load projects
    try {
      info.projects = getAllProjects()
      console.log('✅ Projects loaded:', info.projects.length)
    } catch (err) {
      console.error('❌ Error loading projects:', err)
      info.errors.push(`Projects error: ${err.message}`)
    }

    // Load groups
    try {
      info.groups = getAllGroups()
      console.log('✅ Groups loaded:', info.groups.length)
    } catch (err) {
      console.error('❌ Error loading groups:', err)
      info.errors.push(`Groups error: ${err.message}`)
    }

    // Check React
    info.react = {
      version: React.version,
      mode: import.meta.env.MODE
    }

    console.log('🔍 Complete debug info:', info)
    setDebugInfo(info)
  }

  const copyToClipboard = () => {
    const text = JSON.stringify(debugInfo, null, 2)
    navigator.clipboard.writeText(text).then(() => {
      alert('Debug info copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Failed to copy. Check console for debug info.')
    })
  }

  const exportDebugInfo = () => {
    const text = JSON.stringify(debugInfo, null, 2)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-info-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      background: '#1F2937',
      color: '#F3F4F6',
      borderRadius: '8px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      zIndex: 10000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: '#111827',
        borderBottom: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            🔍 Debug Panel
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>
            Press Ctrl+Alt+D (or Cmd+Alt+D) to close
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={collectDebugInfo}
            style={{
              padding: '6px 12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
          <button
            onClick={copyToClipboard}
            style={{
              padding: '6px 12px',
              background: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Copy
          </button>
          <button
            onClick={exportDebugInfo}
            style={{
              padding: '6px 12px',
              background: '#F59E0B',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Export
          </button>
          <button
            onClick={() => {
              if (onToggle) {
                onToggle(false)
              } else {
                setVisible(false)
              }
            }}
            style={{
              padding: '6px 12px',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '20px',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        {/* Errors */}
        {debugInfo.errors && debugInfo.errors.length > 0 && (
          <div style={{
            padding: '12px',
            background: '#7F1D1D',
            border: '1px solid #DC2626',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#FCA5A5' }}>
              ⚠️ Errors ({debugInfo.errors.length})
            </div>
            {debugInfo.errors.map((error, i) => (
              <div key={i} style={{ marginLeft: '16px', color: '#FEE2E2' }}>• {error}</div>
            ))}
          </div>
        )}

        {/* Browser Info */}
        <Section title="Browser Information">
          <KeyValue label="User Agent" value={debugInfo.browser?.userAgent} />
          <KeyValue label="Platform" value={debugInfo.browser?.platform} />
          <KeyValue label="Language" value={debugInfo.browser?.language} />
          <KeyValue label="Cookies Enabled" value={String(debugInfo.browser?.cookiesEnabled)} />
          <KeyValue label="Online" value={String(debugInfo.browser?.onLine)} />
        </Section>

        {/* React Info */}
        <Section title="React Information">
          <KeyValue label="React Version" value={debugInfo.react?.version} />
          <KeyValue label="Mode" value={debugInfo.react?.mode} />
        </Section>

        {/* localStorage Info */}
        <Section title="localStorage Status">
          <KeyValue
            label="Available"
            value={String(debugInfo.localStorage?.available)}
            highlight={!debugInfo.localStorage?.available}
          />
          <KeyValue label="Item Count" value={debugInfo.localStorage?.itemCount} />
          <KeyValue label="Total Size" value={`${debugInfo.localStorage?.totalSize} bytes`} />
          {debugInfo.localStorage?.keys && debugInfo.localStorage.keys.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ color: '#9CA3AF', marginBottom: '4px' }}>Keys:</div>
              {debugInfo.localStorage.keys.map((key, i) => (
                <div key={i} style={{ marginLeft: '16px', color: '#D1D5DB' }}>• {key}</div>
              ))}
            </div>
          )}
        </Section>

        {/* Configuration */}
        <Section title="GitLab Configuration">
          {debugInfo.config ? (
            <>
              <KeyValue label="GitLab URL" value={debugInfo.config.gitlabUrl} />
              <KeyValue label="Mode" value={debugInfo.config.mode} />
              <KeyValue label="Project ID" value={debugInfo.config.projectId || '(not set)'} />
              <KeyValue label="Group Path" value={debugInfo.config.groupPath || '(not set)'} />
              <KeyValue label="Token" value={debugInfo.config.token ? `${debugInfo.config.token.substring(0, 10)}...` : '(not set)'} />
              <KeyValue label="Filter 2025" value={String(debugInfo.config.filter2025)} />
            </>
          ) : (
            <div style={{ color: '#F59E0B' }}>No configuration found</div>
          )}
        </Section>

        {/* Projects */}
        <Section title="Projects">
          {debugInfo.projects && debugInfo.projects.length > 0 ? (
            debugInfo.projects.map((project, i) => (
              <div key={i} style={{ marginBottom: '8px', paddingLeft: '16px' }}>
                <div style={{ color: '#60A5FA' }}>• {project.name}</div>
                <div style={{ marginLeft: '16px', fontSize: '11px', color: '#9CA3AF' }}>
                  ID: {project.projectId} | URL: {project.gitlabUrl}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#9CA3AF' }}>No projects configured</div>
          )}
        </Section>

        {/* Groups/Pods */}
        <Section title="Groups/Pods">
          {debugInfo.groups && debugInfo.groups.length > 0 ? (
            debugInfo.groups.map((group, i) => (
              <div key={i} style={{ marginBottom: '8px', paddingLeft: '16px' }}>
                <div style={{ color: '#34D399' }}>• {group.name}</div>
                <div style={{ marginLeft: '16px', fontSize: '11px', color: '#9CA3AF' }}>
                  Path: {group.groupPath} | URL: {group.gitlabUrl}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#9CA3AF' }}>No groups/pods configured</div>
          )}
        </Section>

        {/* Raw Data */}
        <Section title="Raw Debug Data (JSON)">
          <pre style={{
            background: '#111827',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '11px',
            color: '#D1D5DB'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h4 style={{
        margin: '0 0 12px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#60A5FA',
        borderBottom: '1px solid #374151',
        paddingBottom: '8px'
      }}>
        {title}
      </h4>
      {children}
    </div>
  )
}

function KeyValue({ label, value, highlight }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '200px 1fr',
      gap: '12px',
      marginBottom: '8px',
      padding: '4px 0'
    }}>
      <div style={{ color: '#9CA3AF' }}>{label}:</div>
      <div style={{
        color: highlight ? '#F87171' : '#F3F4F6',
        fontWeight: highlight ? '600' : 'normal',
        wordBreak: 'break-all'
      }}>
        {value || '(empty)'}
      </div>
    </div>
  )
}
