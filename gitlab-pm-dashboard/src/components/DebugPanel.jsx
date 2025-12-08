import React, { useState, useEffect } from 'react'
import { loadConfig, getAllProjects, getAllGroups } from '../services/storageService'

/**
 * Enhanced Debug Panel - Comprehensive diagnostic information
 * Press Ctrl+Alt+D to toggle (or Cmd+Alt+D on Mac)
 *
 * Features:
 * - Quick Health Check with clear status indicators
 * - API Connection Test
 * - Token Validation
 * - Configuration Verification
 * - Human-readable problem descriptions with solutions
 */
export default function DebugPanel({ externalVisible, onToggle }) {
  const [visible, setVisible] = useState(false)
  const [debugInfo, setDebugInfo] = useState({})
  const [apiTestResult, setApiTestResult] = useState(null)
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Use external visibility if provided
  const isVisible = externalVisible !== undefined ? externalVisible : visible

  // Toggle panel with Ctrl+Alt+D (or Cmd+Alt+D on Mac)
  useEffect(() => {
    const handleKeyPress = (e) => {
      const modifierKey = e.metaKey || e.ctrlKey
      if (modifierKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
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

  // Auto-collect info when panel opens
  useEffect(() => {
    if (isVisible && !debugInfo.timestamp) {
      collectDebugInfo()
    }
  }, [isVisible])

  const collectDebugInfo = async () => {
    console.log('🔍 DEBUG PANEL: Collecting diagnostic information...')

    const info = {
      timestamp: new Date().toISOString(),
      checks: [],
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      localStorage: {
        available: false,
        itemCount: 0,
        keys: [],
        totalSize: 0
      },
      config: null,
      projects: [],
      groups: [],
      errors: []
    }

    // ============================================
    // CHECK 1: Internet Connection
    // ============================================
    if (navigator.onLine) {
      info.checks.push({
        name: 'Internet-Verbindung',
        status: 'ok',
        message: 'Online - Verbindung verfügbar',
        icon: '🌐'
      })
    } else {
      info.checks.push({
        name: 'Internet-Verbindung',
        status: 'error',
        message: 'OFFLINE - Keine Internet-Verbindung!',
        solution: 'Bitte prüfen Sie Ihre Netzwerkverbindung.',
        icon: '🌐'
      })
    }

    // ============================================
    // CHECK 2: localStorage
    // ============================================
    try {
      if (typeof localStorage !== 'undefined') {
        // Test write/read
        localStorage.setItem('__debug_test__', 'test')
        localStorage.removeItem('__debug_test__')

        info.localStorage.available = true
        info.localStorage.itemCount = localStorage.length
        info.localStorage.keys = Object.keys(localStorage).filter(k => !k.startsWith('__'))

        let totalSize = 0
        for (let key in localStorage) {
          if (Object.hasOwn(localStorage, key)) {
            totalSize += localStorage[key].length + key.length
          }
        }
        info.localStorage.totalSize = totalSize
        info.localStorage.totalSizeFormatted = formatBytes(totalSize)

        info.checks.push({
          name: 'Browser-Speicher (localStorage)',
          status: 'ok',
          message: `Verfügbar - ${info.localStorage.itemCount} Einträge (${info.localStorage.totalSizeFormatted})`,
          icon: '💾'
        })
      } else {
        throw new Error('localStorage not available')
      }
    } catch (err) {
      info.localStorage.available = false
      info.errors.push(`localStorage error: ${err.message}`)
      info.checks.push({
        name: 'Browser-Speicher (localStorage)',
        status: 'error',
        message: 'NICHT VERFÜGBAR - Daten können nicht gespeichert werden!',
        solution: 'Prüfen Sie ob Cookies/localStorage in Ihrem Browser blockiert sind. Versuchen Sie einen anderen Browser oder deaktivieren Sie den Inkognito-Modus.',
        icon: '💾'
      })
    }

    // ============================================
    // CHECK 3: GitLab Configuration
    // ============================================
    try {
      info.config = loadConfig()

      if (!info.config) {
        info.checks.push({
          name: 'GitLab Konfiguration',
          status: 'error',
          message: 'NICHT KONFIGURIERT - Keine GitLab-Einstellungen gefunden!',
          solution: 'Klicken Sie auf "Configure" im Header um GitLab URL, Projekt und Token einzurichten.',
          icon: '⚙️'
        })
      } else {
        const configIssues = []

        if (!info.config.gitlabUrl) {
          configIssues.push('GitLab URL fehlt')
        }
        if (!info.config.token) {
          configIssues.push('Access Token fehlt')
        }
        if (!info.config.projectId && !info.config.groupPath) {
          configIssues.push('Weder Projekt noch Gruppe konfiguriert')
        }

        if (configIssues.length > 0) {
          info.checks.push({
            name: 'GitLab Konfiguration',
            status: 'warning',
            message: `UNVOLLSTÄNDIG - ${configIssues.join(', ')}`,
            solution: 'Öffnen Sie die Konfiguration (Configure-Button) und vervollständigen Sie die Einstellungen.',
            icon: '⚙️'
          })
        } else {
          info.checks.push({
            name: 'GitLab Konfiguration',
            status: 'ok',
            message: `OK - ${info.config.mode === 'group' ? 'Gruppen' : 'Projekt'}-Modus aktiv`,
            details: [
              `URL: ${info.config.gitlabUrl}`,
              info.config.projectId ? `Projekt: ${info.config.projectId}` : null,
              info.config.groupPath ? `Gruppe: ${info.config.groupPath}` : null
            ].filter(Boolean),
            icon: '⚙️'
          })
        }
      }
    } catch (err) {
      info.errors.push(`Config error: ${err.message}`)
      info.checks.push({
        name: 'GitLab Konfiguration',
        status: 'error',
        message: `FEHLER beim Laden: ${err.message}`,
        solution: 'Die Konfigurationsdaten sind möglicherweise beschädigt. Versuchen Sie die App neu zu konfigurieren.',
        icon: '⚙️'
      })
    }

    // ============================================
    // CHECK 4: Token Format
    // ============================================
    if (info.config?.token) {
      const token = info.config.token
      const tokenInfo = analyzeToken(token)

      if (tokenInfo.valid) {
        info.checks.push({
          name: 'Access Token Format',
          status: 'ok',
          message: `OK - ${tokenInfo.type} erkannt`,
          details: [
            `Typ: ${tokenInfo.type}`,
            `Länge: ${token.length} Zeichen`,
            `Prefix: ${token.substring(0, 10)}...`
          ],
          icon: '🔑'
        })
      } else {
        info.checks.push({
          name: 'Access Token Format',
          status: 'warning',
          message: `UNBEKANNTES FORMAT - Token beginnt nicht mit glpat- oder ähnlich`,
          solution: 'Erstellen Sie einen neuen Personal Access Token in GitLab unter Settings > Access Tokens. Benötigte Scopes: read_api, read_repository',
          details: [
            `Länge: ${token.length} Zeichen`,
            `Prefix: ${token.substring(0, 5)}...`
          ],
          icon: '🔑'
        })
      }
    } else {
      info.checks.push({
        name: 'Access Token',
        status: 'error',
        message: 'FEHLT - Kein Access Token konfiguriert!',
        solution: 'Erstellen Sie einen Personal Access Token in GitLab (Settings > Access Tokens) mit den Scopes: read_api, read_repository. Fügen Sie ihn dann in der Konfiguration ein.',
        icon: '🔑'
      })
    }

    // ============================================
    // CHECK 5: Projects & Groups
    // ============================================
    try {
      info.projects = getAllProjects() || []
      info.groups = getAllGroups() || []

      const totalSources = info.projects.length + info.groups.length
      if (totalSources > 0) {
        info.checks.push({
          name: 'Datenquellen',
          status: 'ok',
          message: `OK - ${info.projects.length} Projekt(e), ${info.groups.length} Gruppe(n)`,
          icon: '📁'
        })
      } else {
        info.checks.push({
          name: 'Datenquellen',
          status: 'warning',
          message: 'Keine zusätzlichen Projekte/Gruppen konfiguriert',
          solution: 'Sie können weitere Projekte oder Gruppen hinzufügen für Cross-Project-Analysen.',
          icon: '📁'
        })
      }
    } catch (err) {
      info.errors.push(`Data sources error: ${err.message}`)
    }

    // ============================================
    // CHECK 6: Team Configuration
    // ============================================
    const teamConfigKey = Object.keys(localStorage).find(k => k.startsWith('teamConfig_'))
    if (teamConfigKey) {
      try {
        const teamConfig = JSON.parse(localStorage.getItem(teamConfigKey))
        const memberCount = teamConfig?.teamMembers?.length || 0
        info.checks.push({
          name: 'Team Konfiguration',
          status: memberCount > 0 ? 'ok' : 'warning',
          message: memberCount > 0
            ? `OK - ${memberCount} Team-Mitglied(er) konfiguriert`
            : 'Keine Team-Mitglieder konfiguriert',
          solution: memberCount === 0 ? 'Fügen Sie Team-Mitglieder unter "Team Management" hinzu für Kapazitätsplanung.' : null,
          icon: '👥'
        })
      } catch (err) {
        info.checks.push({
          name: 'Team Konfiguration',
          status: 'warning',
          message: 'Team-Daten vorhanden aber möglicherweise fehlerhaft',
          icon: '👥'
        })
      }
    } else {
      info.checks.push({
        name: 'Team Konfiguration',
        status: 'info',
        message: 'Noch nicht eingerichtet',
        solution: 'Optional: Richten Sie Ihr Team unter "Team Management" ein für Kapazitätsplanung.',
        icon: '👥'
      })
    }

    // ============================================
    // CHECK 7: Backup vorhanden?
    // ============================================
    const hasBackupData = localStorage.getItem('stakeholderHub') ||
                          localStorage.getItem('projectDecisions') ||
                          localStorage.getItem('healthScoreConfig')

    info.checks.push({
      name: 'Lokale Daten',
      status: hasBackupData ? 'ok' : 'info',
      message: hasBackupData
        ? 'Lokale Einstellungen vorhanden'
        : 'Keine lokalen Einstellungen - Frische Installation oder nach Backup-Import',
      icon: '📦'
    })

    // React Info
    info.react = {
      version: React.version,
      mode: import.meta.env.MODE
    }

    console.log('🔍 Complete debug info:', info)
    setDebugInfo(info)
  }

  // ============================================
  // API Connection Test
  // ============================================
  const testApiConnection = async () => {
    setIsTestingApi(true)
    setApiTestResult(null)

    const config = loadConfig()
    if (!config?.gitlabUrl || !config?.token) {
      setApiTestResult({
        success: false,
        error: 'Keine GitLab-Konfiguration vorhanden',
        solution: 'Bitte zuerst GitLab URL und Token konfigurieren.'
      })
      setIsTestingApi(false)
      return
    }

    const results = {
      steps: [],
      success: false,
      error: null,
      timing: {}
    }

    const startTime = Date.now()

    // Step 1: Test basic connectivity
    try {
      results.steps.push({ name: 'Verbindung zu GitLab', status: 'testing' })

      const pingStart = Date.now()
      const response = await fetch(`${config.gitlabUrl}/api/v4/version`, {
        headers: { 'PRIVATE-TOKEN': config.token }
      })
      results.timing.ping = Date.now() - pingStart

      if (response.ok) {
        const version = await response.json()
        results.steps[0] = {
          name: 'Verbindung zu GitLab',
          status: 'ok',
          detail: `GitLab ${version.version} (${results.timing.ping}ms)`
        }
      } else if (response.status === 401) {
        results.steps[0] = {
          name: 'Verbindung zu GitLab',
          status: 'error',
          detail: 'Token ungültig oder abgelaufen (401 Unauthorized)'
        }
        results.error = 'TOKEN_INVALID'
        results.solution = 'Der Access Token ist ungültig oder abgelaufen. Bitte erstellen Sie einen neuen Token in GitLab.'
      } else if (response.status === 403) {
        results.steps[0] = {
          name: 'Verbindung zu GitLab',
          status: 'error',
          detail: 'Keine Berechtigung (403 Forbidden)'
        }
        results.error = 'TOKEN_FORBIDDEN'
        results.solution = 'Der Token hat nicht die nötigen Berechtigungen. Erstellen Sie einen neuen Token mit den Scopes: read_api, read_repository'
      } else {
        results.steps[0] = {
          name: 'Verbindung zu GitLab',
          status: 'error',
          detail: `HTTP ${response.status}`
        }
        results.error = 'HTTP_ERROR'
      }
    } catch (err) {
      results.steps[0] = {
        name: 'Verbindung zu GitLab',
        status: 'error',
        detail: err.message
      }

      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        results.error = 'NETWORK_ERROR'
        results.solution = 'Netzwerkfehler - GitLab ist nicht erreichbar. Prüfen Sie: 1) Internet-Verbindung, 2) GitLab URL korrekt?, 3) VPN erforderlich?, 4) Firewall-Einstellungen'
      } else if (err.message.includes('CORS')) {
        results.error = 'CORS_ERROR'
        results.solution = 'CORS-Fehler - Der Browser blockiert die Anfrage. Dies passiert oft bei selbst-gehosteten GitLab-Instanzen. Kontaktieren Sie Ihren GitLab-Administrator.'
      } else {
        results.error = 'UNKNOWN_ERROR'
        results.solution = `Unbekannter Fehler: ${err.message}`
      }
    }

    // Step 2: Test project/group access (only if Step 1 succeeded)
    if (!results.error) {
      results.steps.push({ name: 'Projekt/Gruppen-Zugriff', status: 'testing' })

      try {
        const accessStart = Date.now()
        let testUrl

        if (config.mode === 'group' && config.groupPath) {
          testUrl = `${config.gitlabUrl}/api/v4/groups/${encodeURIComponent(config.groupPath)}`
        } else if (config.projectId) {
          testUrl = `${config.gitlabUrl}/api/v4/projects/${encodeURIComponent(config.projectId)}`
        }

        if (testUrl) {
          const response = await fetch(testUrl, {
            headers: { 'PRIVATE-TOKEN': config.token }
          })
          results.timing.access = Date.now() - accessStart

          if (response.ok) {
            const data = await response.json()
            results.steps[1] = {
              name: 'Projekt/Gruppen-Zugriff',
              status: 'ok',
              detail: `"${data.name}" gefunden (${results.timing.access}ms)`
            }
          } else if (response.status === 404) {
            results.steps[1] = {
              name: 'Projekt/Gruppen-Zugriff',
              status: 'error',
              detail: 'Projekt/Gruppe nicht gefunden (404)'
            }
            results.error = 'NOT_FOUND'
            results.solution = config.mode === 'group'
              ? `Die Gruppe "${config.groupPath}" wurde nicht gefunden. Prüfen Sie den Gruppen-Pfad.`
              : `Das Projekt "${config.projectId}" wurde nicht gefunden. Prüfen Sie die Projekt-ID oder den Pfad.`
          } else {
            results.steps[1] = {
              name: 'Projekt/Gruppen-Zugriff',
              status: 'error',
              detail: `HTTP ${response.status}`
            }
          }
        } else {
          results.steps[1] = {
            name: 'Projekt/Gruppen-Zugriff',
            status: 'warning',
            detail: 'Kein Projekt/Gruppe konfiguriert'
          }
        }
      } catch (err) {
        results.steps[1] = {
          name: 'Projekt/Gruppen-Zugriff',
          status: 'error',
          detail: err.message
        }
      }
    }

    // Step 3: Test issues API (only if Steps 1+2 succeeded)
    if (!results.error && results.steps[1]?.status === 'ok') {
      results.steps.push({ name: 'Issues API', status: 'testing' })

      try {
        const issuesStart = Date.now()
        let issuesUrl

        if (config.mode === 'group' && config.groupPath) {
          issuesUrl = `${config.gitlabUrl}/api/v4/groups/${encodeURIComponent(config.groupPath)}/issues?per_page=1`
        } else if (config.projectId) {
          issuesUrl = `${config.gitlabUrl}/api/v4/projects/${encodeURIComponent(config.projectId)}/issues?per_page=1`
        }

        if (issuesUrl) {
          const response = await fetch(issuesUrl, {
            headers: { 'PRIVATE-TOKEN': config.token }
          })
          results.timing.issues = Date.now() - issuesStart

          if (response.ok) {
            const totalHeader = response.headers.get('x-total')
            results.steps[2] = {
              name: 'Issues API',
              status: 'ok',
              detail: `${totalHeader || '?'} Issues verfügbar (${results.timing.issues}ms)`
            }
            results.success = true
          } else {
            results.steps[2] = {
              name: 'Issues API',
              status: 'error',
              detail: `HTTP ${response.status}`
            }
          }
        }
      } catch (err) {
        results.steps[2] = {
          name: 'Issues API',
          status: 'error',
          detail: err.message
        }
      }
    }

    results.totalTime = Date.now() - startTime
    setApiTestResult(results)
    setIsTestingApi(false)
  }

  const copyToClipboard = () => {
    // Create human-readable report
    const report = generateTextReport()
    navigator.clipboard.writeText(report).then(() => {
      alert('Debug-Bericht wurde in die Zwischenablage kopiert!')
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Kopieren fehlgeschlagen. Bitte nutzen Sie den Export-Button.')
    })
  }

  const generateTextReport = () => {
    const lines = [
      '═══════════════════════════════════════════════════════════════',
      '                    GitLab PM Dashboard - Debug Report',
      '═══════════════════════════════════════════════════════════════',
      '',
      `Erstellt: ${new Date().toLocaleString('de-DE')}`,
      '',
      '── SCHNELL-CHECK ──────────────────────────────────────────────',
      ''
    ]

    debugInfo.checks?.forEach(check => {
      const statusIcon = check.status === 'ok' ? '✅' : check.status === 'error' ? '❌' : check.status === 'warning' ? '⚠️' : 'ℹ️'
      lines.push(`${statusIcon} ${check.name}: ${check.message}`)
      if (check.solution) {
        lines.push(`   → Lösung: ${check.solution}`)
      }
      if (check.details) {
        check.details.forEach(d => lines.push(`   • ${d}`))
      }
    })

    if (apiTestResult) {
      lines.push('')
      lines.push('── API-VERBINDUNGSTEST ────────────────────────────────────────')
      lines.push('')
      apiTestResult.steps.forEach(step => {
        const icon = step.status === 'ok' ? '✅' : step.status === 'error' ? '❌' : '⏳'
        lines.push(`${icon} ${step.name}: ${step.detail || step.status}`)
      })
      if (apiTestResult.solution) {
        lines.push('')
        lines.push(`→ Lösung: ${apiTestResult.solution}`)
      }
    }

    lines.push('')
    lines.push('── KONFIGURATION ──────────────────────────────────────────────')
    lines.push('')
    if (debugInfo.config) {
      lines.push(`GitLab URL: ${debugInfo.config.gitlabUrl || '(nicht gesetzt)'}`)
      lines.push(`Modus: ${debugInfo.config.mode || '(nicht gesetzt)'}`)
      lines.push(`Projekt: ${debugInfo.config.projectId || '(nicht gesetzt)'}`)
      lines.push(`Gruppe: ${debugInfo.config.groupPath || '(nicht gesetzt)'}`)
      lines.push(`Token: ${debugInfo.config.token ? debugInfo.config.token.substring(0, 10) + '...' : '(nicht gesetzt)'}`)
    } else {
      lines.push('Keine Konfiguration gefunden')
    }

    lines.push('')
    lines.push('── BROWSER & SYSTEM ───────────────────────────────────────────')
    lines.push('')
    lines.push(`Browser: ${debugInfo.browser?.userAgent}`)
    lines.push(`Platform: ${debugInfo.browser?.platform}`)
    lines.push(`Online: ${debugInfo.browser?.onLine ? 'Ja' : 'Nein'}`)
    lines.push(`localStorage: ${debugInfo.localStorage?.available ? 'Verfügbar' : 'NICHT VERFÜGBAR'}`)

    if (debugInfo.errors?.length > 0) {
      lines.push('')
      lines.push('── FEHLER ─────────────────────────────────────────────────────')
      lines.push('')
      debugInfo.errors.forEach(err => lines.push(`❌ ${err}`))
    }

    lines.push('')
    lines.push('═══════════════════════════════════════════════════════════════')

    return lines.join('\n')
  }

  const exportDebugInfo = () => {
    const report = generateTextReport()
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gitlab-pm-debug-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isVisible) return null

  const okChecks = debugInfo.checks?.filter(c => c.status === 'ok').length || 0
  const errorChecks = debugInfo.checks?.filter(c => c.status === 'error').length || 0
  const warningChecks = debugInfo.checks?.filter(c => c.status === 'warning').length || 0
  const totalChecks = debugInfo.checks?.length || 0

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '95%',
      maxWidth: '900px',
      maxHeight: '90vh',
      background: '#1F2937',
      color: '#F3F4F6',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      zIndex: 10000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: errorChecks > 0 ? '#7F1D1D' : warningChecks > 0 ? '#78350F' : '#064E3B',
        borderBottom: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔍 Diagnose-Panel
            {errorChecks > 0 && <span style={{
              background: '#DC2626',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px'
            }}>{errorChecks} Fehler</span>}
            {warningChecks > 0 && <span style={{
              background: '#D97706',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px'
            }}>{warningChecks} Warnungen</span>}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>
            Drücken Sie Ctrl+Alt+D (Mac: Cmd+Alt+D) zum Schließen
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={collectDebugInfo} style={buttonStyle('#3B82F6')}>Aktualisieren</button>
          <button onClick={copyToClipboard} style={buttonStyle('#10B981')}>Kopieren</button>
          <button onClick={exportDebugInfo} style={buttonStyle('#8B5CF6')}>Export</button>
          <button
            onClick={() => onToggle ? onToggle(false) : setVisible(false)}
            style={buttonStyle('#DC2626')}
          >
            Schließen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '12px 24px',
        background: '#111827',
        borderBottom: '1px solid #374151'
      }}>
        {[
          { id: 'overview', label: 'Übersicht', icon: '📋' },
          { id: 'api', label: 'API-Test', icon: '🔌' },
          { id: 'config', label: 'Konfiguration', icon: '⚙️' },
          { id: 'raw', label: 'Rohdaten', icon: '🔧' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab.id ? '#374151' : 'transparent',
              color: activeTab === tab.id ? '#F3F4F6' : '#9CA3AF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px'
      }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <SummaryCard
                label="Erfolgreich"
                value={okChecks}
                color="#10B981"
                icon="✅"
              />
              <SummaryCard
                label="Warnungen"
                value={warningChecks}
                color="#F59E0B"
                icon="⚠️"
              />
              <SummaryCard
                label="Fehler"
                value={errorChecks}
                color="#EF4444"
                icon="❌"
              />
            </div>

            {/* Check Results */}
            <h4 style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              System-Checks
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {debugInfo.checks?.map((check, i) => (
                <CheckResult key={i} check={check} />
              ))}
            </div>
          </div>
        )}

        {/* API Test Tab */}
        {activeTab === 'api' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={testApiConnection}
                disabled={isTestingApi}
                style={{
                  ...buttonStyle('#3B82F6'),
                  padding: '12px 24px',
                  fontSize: '14px',
                  opacity: isTestingApi ? 0.7 : 1
                }}
              >
                {isTestingApi ? '⏳ Teste Verbindung...' : '🔌 GitLab API-Verbindung testen'}
              </button>
            </div>

            {apiTestResult && (
              <div>
                {/* Result Summary */}
                <div style={{
                  padding: '16px',
                  background: apiTestResult.success ? '#064E3B' : '#7F1D1D',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    {apiTestResult.success ? '✅ Verbindung erfolgreich!' : '❌ Verbindung fehlgeschlagen'}
                  </div>
                  {apiTestResult.totalTime && (
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      Gesamtzeit: {apiTestResult.totalTime}ms
                    </div>
                  )}
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {apiTestResult.steps.map((step, i) => (
                    <div key={i} style={{
                      padding: '12px 16px',
                      background: '#111827',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${step.status === 'ok' ? '#10B981' : step.status === 'error' ? '#EF4444' : '#F59E0B'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500' }}>
                          {step.status === 'ok' ? '✅' : step.status === 'error' ? '❌' : '⏳'} {step.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{step.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Solution */}
                {apiTestResult.solution && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#1E3A5F',
                    borderRadius: '8px',
                    borderLeft: '4px solid #3B82F6'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px', color: '#60A5FA' }}>
                      💡 Lösung
                    </div>
                    <div style={{ color: '#D1D5DB', lineHeight: '1.5' }}>
                      {apiTestResult.solution}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!apiTestResult && !isTestingApi && (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                color: '#6B7280',
                background: '#111827',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
                <div>Klicken Sie auf den Button oben, um die GitLab API-Verbindung zu testen.</div>
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  Dies prüft: Token-Gültigkeit, Projekt-Zugriff, API-Erreichbarkeit
                </div>
              </div>
            )}
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div>
            <Section title="GitLab Konfiguration">
              {debugInfo.config ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <ConfigRow label="GitLab URL" value={debugInfo.config.gitlabUrl} />
                  <ConfigRow label="Modus" value={debugInfo.config.mode === 'group' ? 'Gruppen-Modus' : 'Projekt-Modus'} />
                  <ConfigRow label="Projekt ID/Pfad" value={debugInfo.config.projectId} />
                  <ConfigRow label="Gruppen-Pfad" value={debugInfo.config.groupPath} />
                  <ConfigRow
                    label="Access Token"
                    value={debugInfo.config.token ? `${debugInfo.config.token.substring(0, 15)}... (${debugInfo.config.token.length} Zeichen)` : null}
                    sensitive
                  />
                  <ConfigRow label="2025 Filter" value={debugInfo.config.filter2025 ? 'Aktiv' : 'Inaktiv'} />
                </div>
              ) : (
                <div style={{ color: '#F59E0B', padding: '16px', background: '#78350F', borderRadius: '8px' }}>
                  ⚠️ Keine Konfiguration gefunden. Bitte klicken Sie auf "Configure" im Header.
                </div>
              )}
            </Section>

            <Section title="Gespeicherte Projekte">
              {debugInfo.projects?.length > 0 ? (
                debugInfo.projects.map((p, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #374151' }}>
                    <div style={{ color: '#60A5FA', fontWeight: '500' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {p.gitlabUrl} • {p.projectId}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#6B7280' }}>Keine zusätzlichen Projekte</div>
              )}
            </Section>

            <Section title="Gespeicherte Gruppen">
              {debugInfo.groups?.length > 0 ? (
                debugInfo.groups.map((g, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #374151' }}>
                    <div style={{ color: '#34D399', fontWeight: '500' }}>{g.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {g.gitlabUrl} • {g.groupPath}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#6B7280' }}>Keine Gruppen/Pods</div>
              )}
            </Section>

            <Section title="localStorage Inhalt">
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
                {debugInfo.localStorage?.itemCount} Einträge, {debugInfo.localStorage?.totalSizeFormatted}
              </div>
              <div style={{
                maxHeight: '200px',
                overflow: 'auto',
                background: '#111827',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px'
              }}>
                {debugInfo.localStorage?.keys?.map((key, i) => (
                  <div key={i} style={{ padding: '2px 0', color: '#D1D5DB' }}>• {key}</div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Raw Data Tab */}
        {activeTab === 'raw' && (
          <div>
            <Section title="Debug-Daten (JSON)">
              <pre style={{
                background: '#111827',
                padding: '16px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '11px',
                color: '#D1D5DB',
                maxHeight: '500px'
              }}>
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </Section>

            {apiTestResult && (
              <Section title="API-Test Ergebnisse (JSON)">
                <pre style={{
                  background: '#111827',
                  padding: '16px',
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '11px',
                  color: '#D1D5DB',
                  maxHeight: '300px'
                }}>
                  {JSON.stringify(apiTestResult, null, 2)}
                </pre>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Helper Components
// ============================================

function SummaryCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: '#111827',
      padding: '16px',
      borderRadius: '8px',
      textAlign: 'center',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ fontSize: '32px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{label}</div>
    </div>
  )
}

function CheckResult({ check }) {
  const [expanded, setExpanded] = useState(false)

  const colors = {
    ok: { bg: '#064E3B', border: '#10B981', icon: '✅' },
    warning: { bg: '#78350F', border: '#F59E0B', icon: '⚠️' },
    error: { bg: '#7F1D1D', border: '#EF4444', icon: '❌' },
    info: { bg: '#1E3A5F', border: '#3B82F6', icon: 'ℹ️' }
  }

  const style = colors[check.status] || colors.info

  return (
    <div
      style={{
        background: style.bg,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: '8px',
        padding: '12px 16px',
        cursor: check.solution || check.details ? 'pointer' : 'default'
      }}
      onClick={() => (check.solution || check.details) && setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
            {check.icon} {check.name}
          </div>
          <div style={{ fontSize: '13px', color: '#D1D5DB' }}>
            {style.icon} {check.message}
          </div>
        </div>
        {(check.solution || check.details) && (
          <span style={{ color: '#6B7280', fontSize: '12px' }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {check.solution && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#60A5FA', fontWeight: '600' }}>💡 Lösung: </span>
              <span style={{ color: '#D1D5DB' }}>{check.solution}</span>
            </div>
          )}
          {check.details && (
            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
              {check.details.map((d, i) => (
                <div key={i}>• {d}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h4 style={{
        margin: '0 0 12px 0',
        fontSize: '13px',
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        {title}
      </h4>
      {children}
    </div>
  )
}

function ConfigRow({ label, value, sensitive }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 12px',
      background: '#111827',
      borderRadius: '4px'
    }}>
      <span style={{ color: '#9CA3AF' }}>{label}</span>
      <span style={{
        color: value ? '#F3F4F6' : '#EF4444',
        fontFamily: sensitive ? 'monospace' : 'inherit'
      }}>
        {value || '(nicht gesetzt)'}
      </span>
    </div>
  )
}

// ============================================
// Helper Functions
// ============================================

function buttonStyle(bg) {
  return {
    padding: '8px 16px',
    background: bg,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function analyzeToken(token) {
  if (!token) return { valid: false, type: 'none' }

  // GitLab Personal Access Token (new format)
  if (token.startsWith('glpat-')) {
    return { valid: true, type: 'Personal Access Token (glpat)' }
  }

  // GitLab Project Access Token
  if (token.startsWith('glpat_') || token.startsWith('gldt-')) {
    return { valid: true, type: 'Project/Deploy Token' }
  }

  // GitLab CI Job Token
  if (token.startsWith('glcbt-')) {
    return { valid: true, type: 'CI Job Token' }
  }

  // Older GitLab tokens (20 char alphanumeric)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(token)) {
    return { valid: true, type: 'Legacy Token Format' }
  }

  return { valid: false, type: 'Unbekanntes Format' }
}
