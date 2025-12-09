/**
 * Backup and Restore Service
 * Manages comprehensive application data backup and restore
 * Enables team collaboration by sharing configurations without a server
 */

const BACKUP_VERSION = '1.0.0'

/**
 * Get all localStorage keys used by the application
 */
function getAllStorageKeys() {
  return {
    // Core GitLab configuration
    gitlabUrl: 'gitlab_url',
    gitlabToken: 'gitlab_token',
    projectId: 'gitlab_project',
    groupPath: 'gitlab_group_path',
    filter2025: 'gitlab_filter_2025',
    mode: 'gitlab_mode',

    // Portfolio/Multi-project
    portfolioProjects: 'portfolio_projects',
    activeProject: 'active_project_id',

    // Project Groups
    projectGroups: 'gitlab-pm-project-groups',

    // Pods/Multi-group
    portfolioGroups: 'portfolio_groups',
    activeGroup: 'active_group_id',

    // Risk management
    risks: 'project_risks',

    // Team configuration (base keys - per-project variants handled dynamically)
    teamConfigBase: 'gitlab_team_config',
    sprintCapacityBase: 'gitlab_sprint_capacity',
    capacitySettingsBase: 'gitlab_capacity_settings',

    // Absences (base key - per-project variants handled dynamically)
    absencesBase: 'gitlab-pm-absences',

    // Stakeholder Hub
    stakeholders: 'stakeholders',
    communicationHistory: 'communication_history',
    communicationTemplates: 'communication_templates',
    stakeholderDecisions: 'decisions',  // Stakeholder hub decisions
    documents: 'documents',

    // Project Decisions (base key - per-project variants handled dynamically)
    projectDecisionsBase: 'gitlab-pm-decisions',

    // Health Score
    healthScoreConfig: 'healthScoreConfig',

    // Quality & Compliance
    criteriaConfig: 'gitlab-pm-quality-criteria-config',
    dodTemplates: 'dodTemplates',

    // Sprint Management
    sprintGoals: 'sprintGoals',
    retroActions: 'retroActions',

    // Release Planning
    releases: 'gitlab-pm-releases',
    featureToggles: 'gitlab-pm-feature-toggles',

    // Forecast Accuracy (base key - per-project variants handled dynamically)
    forecastsBase: 'gitlab-pm-forecasts',

    // Backlog Health
    backlogHealthHistory: 'backlogHealthHistory',

    // User Preferences
    userRole: 'user_role',
    viewPreference: 'view_preference',
    favoriteViews: 'favorite_views',

    // Velocity Configuration
    velocityConfig: 'velocityConfig',

    // UI State
    qualityShowOpenOnly: 'quality.showOpenOnly',
    qualityLegendCollapsed: 'quality.legendCollapsed',
    cycleTimeBottleneckCollapsed: 'cycleTime.bottleneckCollapsed'
  }
}

/**
 * Get all per-project and per-pod keys for a base key pattern
 * @param {string} baseKey - Base key pattern (e.g., 'gitlab_team_config')
 * @returns {Object} Map with project and pod keys separated
 */
function getPerProjectKeys(baseKey) {
  const result = {
    projectKeys: {},
    podKeys: {}
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(baseKey)) {
      if (key === baseKey) {
        // Base key without suffix (default/global)
        result.projectKeys['default'] = key
      } else if (key.startsWith(`${baseKey}_pod_`)) {
        // Pod-level key
        const podId = key.substring(`${baseKey}_pod_`.length)
        result.podKeys[podId] = key
      } else if (key.startsWith(`${baseKey}_`)) {
        // Project-level key (but not pod)
        const projectId = key.substring(baseKey.length + 1)
        // Skip if it's actually a pod key that we already captured
        if (!projectId.startsWith('pod_')) {
          result.projectKeys[projectId] = key
        }
      }
    }
  }

  return result
}

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @param {boolean} isRawString - If true, return raw string without JSON parsing (for tokens, URLs)
 */
function loadFromStorage(key, isRawString = false) {
  try {
    const data = localStorage.getItem(key)
    if (!data) return null
    if (isRawString) return data
    return JSON.parse(data)
  } catch (e) {
    // If JSON parse fails, return raw string (backwards compatibility)
    const rawData = localStorage.getItem(key)
    if (rawData) return rawData
    console.warn(`Failed to load ${key}:`, e)
    return null
  }
}

/**
 * Save data to localStorage
 * @param {string} key - Storage key
 * @param {*} data - Data to save
 * @param {boolean} isRawString - If true, save as raw string without JSON stringifying
 */
function saveToStorage(key, data, isRawString = false) {
  try {
    if (isRawString && typeof data === 'string') {
      localStorage.setItem(key, data)
    } else {
      localStorage.setItem(key, JSON.stringify(data))
    }
    return true
  } catch (e) {
    console.error(`Failed to save ${key}:`, e)
    return false
  }
}

/**
 * Mask sensitive data (access tokens)
 */
function maskToken(token) {
  if (!token || token.length < 8) return '***'
  return token.substring(0, 4) + '***' + token.substring(token.length - 4)
}

/**
 * Create a complete backup of application data
 * @param {Object} options - Backup options
 * @param {boolean} options.includeTokens - Include access tokens (default: false for security)
 * @param {boolean} options.encrypt - Encrypt backup (future feature)
 * @param {string} options.password - Encryption password (future feature)
 * @returns {Object} Backup object
 */
export function createBackup(options = {}) {
  const { includeTokens = false } = options

  const keys = getAllStorageKeys()
  const includedData = []
  const data = {}

  // Helper to add data if it exists
  const addIfExists = (category, storageKey, transform = null) => {
    const value = loadFromStorage(storageKey)
    if (value !== null) {
      data[category] = transform ? transform(value) : value
      includedData.push(category)
    }
  }

  // 1. Core GitLab Configuration
  const gitlabToken = loadFromStorage(keys.gitlabToken)
  const gitlabUrl = loadFromStorage(keys.gitlabUrl)
  const projectId = loadFromStorage(keys.projectId)
  const groupPath = loadFromStorage(keys.groupPath)
  const filter2025 = loadFromStorage(keys.filter2025)
  const mode = loadFromStorage(keys.mode)

  if (gitlabToken || gitlabUrl || projectId || groupPath || filter2025 || mode) {
    data.gitlabConfig = {
      gitlabUrl,
      gitlabToken: includeTokens ? gitlabToken : (gitlabToken ? maskToken(gitlabToken) : null),
      projectId,
      groupPath,
      filter2025,
      mode
    }
    includedData.push('gitlabConfig')
  }

  // 2. Portfolio/Multi-project Configuration
  const portfolioProjects = loadFromStorage(keys.portfolioProjects)
  if (portfolioProjects) {
    // Remove token field from projects since we use centralized token
    if (Array.isArray(portfolioProjects)) {
      data.portfolioProjects = portfolioProjects.map(p => {
        const { token: _token, ...projectWithoutToken } = p
        return projectWithoutToken
      })
    } else {
      data.portfolioProjects = portfolioProjects
    }
    includedData.push('portfolioProjects')
  }

  addIfExists('activeProject', keys.activeProject)

  // 3. Project Groups
  addIfExists('projectGroups', keys.projectGroups)

  // 4. Pods/Multi-group Configuration
  const portfolioGroups = loadFromStorage(keys.portfolioGroups)
  if (portfolioGroups) {
    // Remove token field from groups since we use centralized token
    if (Array.isArray(portfolioGroups)) {
      data.portfolioGroups = portfolioGroups.map(g => {
        const { token: _token, ...groupWithoutToken } = g
        return groupWithoutToken
      })
    } else {
      data.portfolioGroups = portfolioGroups
    }
    includedData.push('portfolioGroups')
  }

  addIfExists('activeGroup', keys.activeGroup)

  // 5. Risk Management
  addIfExists('risks', keys.risks)

  // 6. Team Configuration (per-project and per-pod)
  const teamConfigKeys = getPerProjectKeys(keys.teamConfigBase)
  const sprintCapacityKeys = getPerProjectKeys(keys.sprintCapacityBase)
  const capacitySettingsKeys = getPerProjectKeys(keys.capacitySettingsBase)

  const hasTeamData =
    Object.keys(teamConfigKeys.projectKeys).length > 0 ||
    Object.keys(teamConfigKeys.podKeys).length > 0 ||
    Object.keys(sprintCapacityKeys.projectKeys).length > 0 ||
    Object.keys(sprintCapacityKeys.podKeys).length > 0 ||
    Object.keys(capacitySettingsKeys.projectKeys).length > 0 ||
    Object.keys(capacitySettingsKeys.podKeys).length > 0

  if (hasTeamData) {
    data.teamConfiguration = {
      projectLevel: {
        teamConfigs: {},
        sprintCapacities: {},
        capacitySettings: {}
      },
      podLevel: {
        teamConfigs: {},
        sprintCapacities: {},
        capacitySettings: {}
      }
    }

    // Load project-level team configs
    Object.entries(teamConfigKeys.projectKeys).forEach(([projectId, key]) => {
      const config = loadFromStorage(key)
      if (config) {
        data.teamConfiguration.projectLevel.teamConfigs[projectId] = config
      }
    })

    // Load pod-level team configs
    Object.entries(teamConfigKeys.podKeys).forEach(([podId, key]) => {
      const config = loadFromStorage(key)
      if (config) {
        data.teamConfiguration.podLevel.teamConfigs[podId] = config
      }
    })

    // Load project-level sprint capacities
    Object.entries(sprintCapacityKeys.projectKeys).forEach(([projectId, key]) => {
      const capacity = loadFromStorage(key)
      if (capacity) {
        data.teamConfiguration.projectLevel.sprintCapacities[projectId] = capacity
      }
    })

    // Load pod-level sprint capacities
    Object.entries(sprintCapacityKeys.podKeys).forEach(([podId, key]) => {
      const capacity = loadFromStorage(key)
      if (capacity) {
        data.teamConfiguration.podLevel.sprintCapacities[podId] = capacity
      }
    })

    // Load project-level capacity settings
    Object.entries(capacitySettingsKeys.projectKeys).forEach(([projectId, key]) => {
      const settings = loadFromStorage(key)
      if (settings) {
        data.teamConfiguration.projectLevel.capacitySettings[projectId] = settings
      }
    })

    // Load pod-level capacity settings
    Object.entries(capacitySettingsKeys.podKeys).forEach(([podId, key]) => {
      const settings = loadFromStorage(key)
      if (settings) {
        data.teamConfiguration.podLevel.capacitySettings[podId] = settings
      }
    })

    // Check if we actually have data
    const hasProjectData =
      Object.keys(data.teamConfiguration.projectLevel.teamConfigs).length > 0 ||
      Object.keys(data.teamConfiguration.projectLevel.sprintCapacities).length > 0 ||
      Object.keys(data.teamConfiguration.projectLevel.capacitySettings).length > 0

    const hasPodData =
      Object.keys(data.teamConfiguration.podLevel.teamConfigs).length > 0 ||
      Object.keys(data.teamConfiguration.podLevel.sprintCapacities).length > 0 ||
      Object.keys(data.teamConfiguration.podLevel.capacitySettings).length > 0

    if (hasProjectData || hasPodData) {
      includedData.push('teamConfiguration')
    } else {
      delete data.teamConfiguration
    }
  }

  // 7. Absences (per-project and per-pod)
  const absenceKeys = getPerProjectKeys(keys.absencesBase)

  const hasAbsenceData =
    Object.keys(absenceKeys.projectKeys).length > 0 ||
    Object.keys(absenceKeys.podKeys).length > 0

  if (hasAbsenceData) {
    data.absences = {
      projectLevel: {},
      podLevel: {}
    }

    // Load project-level absences
    Object.entries(absenceKeys.projectKeys).forEach(([projectId, key]) => {
      const absenceData = loadFromStorage(key)
      if (absenceData) {
        data.absences.projectLevel[projectId] = absenceData
      }
    })

    // Load pod-level absences
    Object.entries(absenceKeys.podKeys).forEach(([podId, key]) => {
      const absenceData = loadFromStorage(key)
      if (absenceData) {
        data.absences.podLevel[podId] = absenceData
      }
    })

    const hasProjectAbsences = Object.keys(data.absences.projectLevel).length > 0
    const hasPodAbsences = Object.keys(data.absences.podLevel).length > 0

    if (hasProjectAbsences || hasPodAbsences) {
      includedData.push('absences')
    } else {
      delete data.absences
    }
  }

  // 8. Stakeholder Hub Data
  const stakeholders = loadFromStorage(keys.stakeholders)
  const communicationHistory = loadFromStorage(keys.communicationHistory)
  const communicationTemplates = loadFromStorage(keys.communicationTemplates)
  const stakeholderDecisions = loadFromStorage(keys.stakeholderDecisions)
  const documents = loadFromStorage(keys.documents)

  if (stakeholders || communicationHistory || communicationTemplates || stakeholderDecisions || documents) {
    data.stakeholderHub = {
      stakeholders,
      communicationHistory,
      communicationTemplates,
      decisions: stakeholderDecisions,  // Keep as 'decisions' for backward compatibility
      documents
    }
    includedData.push('stakeholderHub')
  }

  // 9. Project Decisions (per-project)
  const projectDecisionKeys = getPerProjectKeys(keys.projectDecisionsBase)
  const hasProjectDecisions =
    Object.keys(projectDecisionKeys.projectKeys).length > 0 ||
    Object.keys(projectDecisionKeys.podKeys).length > 0

  if (hasProjectDecisions) {
    data.projectDecisions = {
      projectLevel: {},
      podLevel: {}
    }

    // Load project-level decisions
    Object.entries(projectDecisionKeys.projectKeys).forEach(([projectId, key]) => {
      const decisionData = loadFromStorage(key)
      if (decisionData) {
        data.projectDecisions.projectLevel[projectId] = decisionData
      }
    })

    // Load pod-level decisions
    Object.entries(projectDecisionKeys.podKeys).forEach(([podId, key]) => {
      const decisionData = loadFromStorage(key)
      if (decisionData) {
        data.projectDecisions.podLevel[podId] = decisionData
      }
    })

    const hasProjectData = Object.keys(data.projectDecisions.projectLevel).length > 0
    const hasPodData = Object.keys(data.projectDecisions.podLevel).length > 0

    if (hasProjectData || hasPodData) {
      includedData.push('projectDecisions')
    } else {
      delete data.projectDecisions
    }
  }

  // 10. Health Score Configuration
  addIfExists('healthScoreConfig', keys.healthScoreConfig)

  // 11. Quality & Compliance
  addIfExists('criteriaConfig', keys.criteriaConfig)
  addIfExists('dodTemplates', keys.dodTemplates)

  // 12. Sprint Management
  addIfExists('sprintGoals', keys.sprintGoals)
  addIfExists('retroActions', keys.retroActions)

  // 13. Release Planning
  addIfExists('releases', keys.releases)
  addIfExists('featureToggles', keys.featureToggles)

  // 14. Forecast Accuracy (per-project)
  const forecastKeys = getPerProjectKeys(keys.forecastsBase)
  const hasForecastData =
    Object.keys(forecastKeys.projectKeys).length > 0 ||
    Object.keys(forecastKeys.podKeys).length > 0

  if (hasForecastData) {
    data.forecasts = {
      projectLevel: {},
      podLevel: {}
    }

    // Load project-level forecasts
    Object.entries(forecastKeys.projectKeys).forEach(([projectId, key]) => {
      const forecastData = loadFromStorage(key)
      if (forecastData) {
        data.forecasts.projectLevel[projectId] = forecastData
      }
    })

    // Load pod-level forecasts
    Object.entries(forecastKeys.podKeys).forEach(([podId, key]) => {
      const forecastData = loadFromStorage(key)
      if (forecastData) {
        data.forecasts.podLevel[podId] = forecastData
      }
    })

    const hasProjectForecasts = Object.keys(data.forecasts.projectLevel).length > 0
    const hasPodForecasts = Object.keys(data.forecasts.podLevel).length > 0

    if (hasProjectForecasts || hasPodForecasts) {
      includedData.push('forecasts')
    } else {
      delete data.forecasts
    }
  }

  // 15. Backlog Health
  addIfExists('backlogHealthHistory', keys.backlogHealthHistory)

  // 16. User Preferences
  addIfExists('userRole', keys.userRole)
  addIfExists('viewPreference', keys.viewPreference)
  addIfExists('favoriteViews', keys.favoriteViews)

  // 17. Velocity Configuration
  addIfExists('velocityConfig', keys.velocityConfig)

  // 18. UI State
  const uiState = {}
  const qualityShowOpenOnly = loadFromStorage(keys.qualityShowOpenOnly)
  const qualityLegendCollapsed = loadFromStorage(keys.qualityLegendCollapsed)
  const cycleTimeBottleneckCollapsed = loadFromStorage(keys.cycleTimeBottleneckCollapsed)

  if (qualityShowOpenOnly !== null || qualityLegendCollapsed !== null || cycleTimeBottleneckCollapsed !== null) {
    uiState.qualityShowOpenOnly = qualityShowOpenOnly
    uiState.qualityLegendCollapsed = qualityLegendCollapsed
    uiState.cycleTimeBottleneckCollapsed = cycleTimeBottleneckCollapsed
    data.uiState = uiState
    includedData.push('uiState')
  }

  // Create backup object
  const backup = {
    metadata: {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0',
      backupType: 'plain',
      includedData,
      tokensIncluded: includeTokens,
      itemCount: Object.keys(data).length
    },
    data
  }

  return backup
}

/**
 * Export backup to downloadable file
 * @param {Object} backup - Backup object from createBackup()
 * @param {string} filename - Optional custom filename
 * @returns {string} Downloaded filename
 */
export function exportBackupToFile(backup, filename = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const defaultFilename = `gitlab-pm-backup-${timestamp}.json`

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || defaultFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return filename || defaultFilename
}

/**
 * Import backup from file
 * @param {File} file - File object from input
 * @returns {Promise<Object>} Parsed backup object
 */
export async function importBackupFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result)

        // Validate backup structure
        if (!backup.metadata || !backup.data) {
          reject(new Error('Invalid backup file structure'))
          return
        }

        // Check version compatibility
        if (backup.metadata.version !== BACKUP_VERSION) {
          console.warn(`Backup version ${backup.metadata.version} may not be fully compatible with current version ${BACKUP_VERSION}`)
        }

        resolve(backup)
      } catch (error) {
        reject(new Error('Failed to parse backup file: ' + error.message))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

/**
 * Validate backup before restore
 * @param {Object} backup - Backup object
 * @returns {Object} Validation result with warnings/errors
 */
export function validateBackup(backup) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    info: {}
  }

  // Check structure
  if (!backup.metadata || !backup.data) {
    result.valid = false
    result.errors.push('Invalid backup structure: missing metadata or data')
    return result
  }

  // Check version
  if (backup.metadata.version !== BACKUP_VERSION) {
    result.warnings.push(`Backup version (${backup.metadata.version}) differs from current version (${BACKUP_VERSION})`)
  }

  // Check if tokens are masked
  if (!backup.metadata.tokensIncluded) {
    let hasMaskedTokens = false

    // Check GitLab config token
    if (backup.data.gitlabConfig && backup.data.gitlabConfig.gitlabToken &&
        backup.data.gitlabConfig.gitlabToken.includes('***')) {
      hasMaskedTokens = true
    }

    // No need to check portfolio projects/groups tokens since we use centralized token

    if (hasMaskedTokens) {
      result.warnings.push('Access token is masked for security - you will need to re-enter it after import')
    }
  }

  // Provide info about backup
  result.info = {
    createdAt: backup.metadata.timestamp,
    itemCount: backup.metadata.itemCount,
    includedData: backup.metadata.includedData || [],
    backupAge: Math.floor((Date.now() - new Date(backup.metadata.timestamp).getTime()) / (1000 * 60 * 60 * 24)) + ' days'
  }

  return result
}

/**
 * Restore data from backup
 * @param {Object} backup - Backup object
 * @param {Object} options - Restore options
 * @param {boolean} options.overwrite - Overwrite existing data (default: true)
 * @param {boolean} options.merge - Merge with existing data (default: false)
 * @param {Array<string>} options.selectiveRestore - Only restore specific data types
 * @returns {Object} Restore result with success/failure counts
 */
export function restoreFromBackup(backup, options = {}) {
  const {
    overwrite = true,
    merge = false,
    selectiveRestore = null
  } = options

  const keys = getAllStorageKeys()
  const result = {
    success: true,
    restored: [],
    failed: [],
    skipped: []
  }

  // Determine which data to restore
  const dataToRestore = selectiveRestore || Object.keys(backup.data)

  // Restore each data category
  dataToRestore.forEach(category => {
    const data = backup.data[category]
    if (!data && data !== false && data !== 0 && data !== '') {
      result.skipped.push(category)
      return
    }

    try {
      switch (category) {
        case 'gitlabConfig':
          if (overwrite || !loadFromStorage(keys.gitlabUrl)) {
            // Token and URL are stored as raw strings, not JSON
            if (data.gitlabUrl) saveToStorage(keys.gitlabUrl, data.gitlabUrl, true)
            if (data.gitlabToken) saveToStorage(keys.gitlabToken, data.gitlabToken, true)
            if (data.projectId) saveToStorage(keys.projectId, data.projectId)
            if (data.groupPath) saveToStorage(keys.groupPath, data.groupPath)
            if (data.filter2025 !== null && data.filter2025 !== undefined) saveToStorage(keys.filter2025, data.filter2025)
            if (data.mode) saveToStorage(keys.mode, data.mode)
            result.restored.push('gitlabConfig')
          } else {
            result.skipped.push('gitlabConfig (already exists)')
          }
          break

        case 'portfolioProjects':
          if (overwrite || !loadFromStorage(keys.portfolioProjects)) {
            saveToStorage(keys.portfolioProjects, data)
            result.restored.push('portfolioProjects')
          } else if (merge && Array.isArray(data)) {
            const existing = loadFromStorage(keys.portfolioProjects) || []
            const merged = [...existing, ...data]
            saveToStorage(keys.portfolioProjects, merged)
            result.restored.push('portfolioProjects (merged)')
          } else {
            result.skipped.push('portfolioProjects (already exists)')
          }
          break

        case 'activeProject':
          if (overwrite || !loadFromStorage(keys.activeProject)) {
            saveToStorage(keys.activeProject, data)
            result.restored.push('activeProject')
          }
          break

        case 'projectGroups':
          if (overwrite || !loadFromStorage(keys.projectGroups)) {
            saveToStorage(keys.projectGroups, data)
            result.restored.push('projectGroups')
          } else if (merge && Array.isArray(data)) {
            const existing = loadFromStorage(keys.projectGroups) || []
            const merged = [...existing, ...data]
            saveToStorage(keys.projectGroups, merged)
            result.restored.push('projectGroups (merged)')
          } else {
            result.skipped.push('projectGroups (already exists)')
          }
          break

        case 'portfolioGroups':
          if (overwrite || !loadFromStorage(keys.portfolioGroups)) {
            saveToStorage(keys.portfolioGroups, data)
            result.restored.push('portfolioGroups')
          } else if (merge && Array.isArray(data)) {
            const existing = loadFromStorage(keys.portfolioGroups) || []
            const merged = [...existing, ...data]
            saveToStorage(keys.portfolioGroups, merged)
            result.restored.push('portfolioGroups (merged)')
          } else {
            result.skipped.push('portfolioGroups (already exists)')
          }
          break

        case 'activeGroup':
          if (overwrite || !loadFromStorage(keys.activeGroup)) {
            saveToStorage(keys.activeGroup, data)
            result.restored.push('activeGroup')
          }
          break

        case 'risks':
          if (overwrite || !loadFromStorage(keys.risks)) {
            saveToStorage(keys.risks, data)
            result.restored.push('risks')
          }
          break

        case 'teamConfiguration': {
          // Restore project and pod-level team configurations
          let teamConfigCount = 0

          // Handle new structure (projectLevel/podLevel)
          if (data.projectLevel || data.podLevel) {
            // Restore project-level configs
            if (data.projectLevel) {
              if (data.projectLevel.teamConfigs) {
                Object.entries(data.projectLevel.teamConfigs).forEach(([projectId, config]) => {
                  const key = projectId === 'default'
                    ? keys.teamConfigBase
                    : `${keys.teamConfigBase}_${projectId}`

                  if (overwrite || !loadFromStorage(key)) {
                    saveToStorage(key, config)
                    teamConfigCount++
                  }
                })
              }

              if (data.projectLevel.sprintCapacities) {
                Object.entries(data.projectLevel.sprintCapacities).forEach(([projectId, capacity]) => {
                  const key = projectId === 'default'
                    ? keys.sprintCapacityBase
                    : `${keys.sprintCapacityBase}_${projectId}`

                  if (overwrite || !loadFromStorage(key)) {
                    saveToStorage(key, capacity)
                    teamConfigCount++
                  }
                })
              }

              if (data.projectLevel.capacitySettings) {
                Object.entries(data.projectLevel.capacitySettings).forEach(([projectId, settings]) => {
                  const key = projectId === 'default'
                    ? keys.capacitySettingsBase
                    : `${keys.capacitySettingsBase}_${projectId}`

                  if (overwrite || !loadFromStorage(key)) {
                    saveToStorage(key, settings)
                    teamConfigCount++
                  }
                })
              }
            }

            // Restore pod-level configs
            if (data.podLevel) {
              if (data.podLevel.teamConfigs) {
                Object.entries(data.podLevel.teamConfigs).forEach(([podId, config]) => {
                  const key = `${keys.teamConfigBase}_pod_${podId}`

                  if (overwrite || !loadFromStorage(key)) {
                    saveToStorage(key, config)
                    teamConfigCount++
                  }
                })
              }

              if (data.podLevel.sprintCapacities) {
                Object.entries(data.podLevel.sprintCapacities).forEach(([podId, capacity]) => {
                  const key = `${keys.sprintCapacityBase}_pod_${podId}`

                  if (overwrite || !loadFromStorage(key)) {
                    saveToStorage(key, capacity)
                    teamConfigCount++
                  }
                })
              }

              if (data.podLevel.capacitySettings) {
                Object.entries(data.podLevel.capacitySettings).forEach(([podId, settings]) => {
                  const key = `${keys.capacitySettingsBase}_pod_${podId}`

                  if (overwrite || !loadFromStorage(key)) {
                    saveToStorage(key, settings)
                    teamConfigCount++
                  }
                })
              }
            }
          }
          // Handle old structure (backwards compatibility)
          else {
            if (data.teamConfigs) {
              Object.entries(data.teamConfigs).forEach(([projectId, config]) => {
                const key = projectId === 'default'
                  ? keys.teamConfigBase
                  : `${keys.teamConfigBase}_${projectId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, config)
                  teamConfigCount++
                }
              })
            }

            if (data.sprintCapacities) {
              Object.entries(data.sprintCapacities).forEach(([projectId, capacity]) => {
                const key = projectId === 'default'
                  ? keys.sprintCapacityBase
                  : `${keys.sprintCapacityBase}_${projectId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, capacity)
                  teamConfigCount++
                }
              })
            }

            if (data.capacitySettings) {
              Object.entries(data.capacitySettings).forEach(([projectId, settings]) => {
                const key = projectId === 'default'
                  ? keys.capacitySettingsBase
                  : `${keys.capacitySettingsBase}_${projectId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, settings)
                  teamConfigCount++
                }
              })
            }
          }

          if (teamConfigCount > 0) {
            result.restored.push(`teamConfiguration (${teamConfigCount} items)`)
          }
          break
        }

        case 'absences': {
          // Restore project and pod-level absences
          let absenceCount = 0

          // Handle new structure (projectLevel/podLevel)
          if (data.projectLevel || data.podLevel) {
            // Restore project-level absences
            if (data.projectLevel) {
              Object.entries(data.projectLevel).forEach(([projectId, absenceData]) => {
                const key = projectId === 'default'
                  ? keys.absencesBase
                  : `${keys.absencesBase}_${projectId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, absenceData)
                  absenceCount++
                }
              })
            }

            // Restore pod-level absences
            if (data.podLevel) {
              Object.entries(data.podLevel).forEach(([podId, absenceData]) => {
                const key = `${keys.absencesBase}_pod_${podId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, absenceData)
                  absenceCount++
                }
              })
            }
          }
          // Handle old structure (backwards compatibility)
          else {
            Object.entries(data).forEach(([projectId, absenceData]) => {
              const key = projectId === 'default'
                ? keys.absencesBase
                : `${keys.absencesBase}_${projectId}`

              if (overwrite || !loadFromStorage(key)) {
                saveToStorage(key, absenceData)
                absenceCount++
              }
            })
          }

          if (absenceCount > 0) {
            result.restored.push(`absences (${absenceCount} items)`)
          }
          break
        }

        case 'stakeholderHub':
          if (data.stakeholders) {
            if (overwrite || !loadFromStorage(keys.stakeholders)) {
              saveToStorage(keys.stakeholders, data.stakeholders)
              result.restored.push('stakeholders')
            }
          }
          if (data.communicationHistory) {
            if (overwrite || !loadFromStorage(keys.communicationHistory)) {
              saveToStorage(keys.communicationHistory, data.communicationHistory)
              result.restored.push('communicationHistory')
            }
          }
          if (data.communicationTemplates) {
            if (overwrite || !loadFromStorage(keys.communicationTemplates)) {
              saveToStorage(keys.communicationTemplates, data.communicationTemplates)
              result.restored.push('communicationTemplates')
            }
          }
          if (data.decisions) {
            if (overwrite || !loadFromStorage(keys.stakeholderDecisions)) {
              saveToStorage(keys.stakeholderDecisions, data.decisions)
              result.restored.push('stakeholderDecisions')
            }
          }
          if (data.documents) {
            if (overwrite || !loadFromStorage(keys.documents)) {
              saveToStorage(keys.documents, data.documents)
              result.restored.push('documents')
            }
          }
          break

        case 'projectDecisions': {
          // Restore project and pod-level decisions
          let decisionCount = 0

          // Handle new structure (projectLevel/podLevel)
          if (data.projectLevel || data.podLevel) {
            // Restore project-level decisions
            if (data.projectLevel) {
              Object.entries(data.projectLevel).forEach(([projectId, decisionData]) => {
                const key = projectId === 'default'
                  ? keys.projectDecisionsBase
                  : `${keys.projectDecisionsBase}_${projectId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, decisionData)
                  decisionCount++
                }
              })
            }

            // Restore pod-level decisions
            if (data.podLevel) {
              Object.entries(data.podLevel).forEach(([podId, decisionData]) => {
                const key = `${keys.projectDecisionsBase}_pod_${podId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, decisionData)
                  decisionCount++
                }
              })
            }
          }

          if (decisionCount > 0) {
            result.restored.push(`projectDecisions (${decisionCount} items)`)
          }
          break
        }

        case 'healthScoreConfig':
          if (overwrite || !loadFromStorage(keys.healthScoreConfig)) {
            saveToStorage(keys.healthScoreConfig, data)
            result.restored.push('healthScoreConfig')
          }
          break

        case 'criteriaConfig':
          if (overwrite || !loadFromStorage(keys.criteriaConfig)) {
            saveToStorage(keys.criteriaConfig, data)
            result.restored.push('criteriaConfig')
          }
          break

        case 'dodTemplates':
          if (overwrite || !loadFromStorage(keys.dodTemplates)) {
            saveToStorage(keys.dodTemplates, data)
            result.restored.push('dodTemplates')
          }
          break

        case 'sprintGoals':
          if (overwrite || !loadFromStorage(keys.sprintGoals)) {
            saveToStorage(keys.sprintGoals, data)
            result.restored.push('sprintGoals')
          }
          break

        case 'retroActions':
          if (overwrite || !loadFromStorage(keys.retroActions)) {
            saveToStorage(keys.retroActions, data)
            result.restored.push('retroActions')
          }
          break

        case 'releases':
          if (overwrite || !loadFromStorage(keys.releases)) {
            saveToStorage(keys.releases, data)
            result.restored.push('releases')
          }
          break

        case 'featureToggles':
          if (overwrite || !loadFromStorage(keys.featureToggles)) {
            saveToStorage(keys.featureToggles, data)
            result.restored.push('featureToggles')
          }
          break

        case 'forecasts': {
          // Restore project and pod-level forecasts
          let forecastCount = 0

          // Handle new structure (projectLevel/podLevel)
          if (data.projectLevel || data.podLevel) {
            // Restore project-level forecasts
            if (data.projectLevel) {
              Object.entries(data.projectLevel).forEach(([projectId, forecastData]) => {
                const key = projectId === 'default'
                  ? keys.forecastsBase
                  : `${keys.forecastsBase}_${projectId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, forecastData)
                  forecastCount++
                }
              })
            }

            // Restore pod-level forecasts
            if (data.podLevel) {
              Object.entries(data.podLevel).forEach(([podId, forecastData]) => {
                const key = `${keys.forecastsBase}_pod_${podId}`

                if (overwrite || !loadFromStorage(key)) {
                  saveToStorage(key, forecastData)
                  forecastCount++
                }
              })
            }
          }

          if (forecastCount > 0) {
            result.restored.push(`forecasts (${forecastCount} items)`)
          }
          break
        }

        case 'backlogHealthHistory':
          if (overwrite || !loadFromStorage(keys.backlogHealthHistory)) {
            saveToStorage(keys.backlogHealthHistory, data)
            result.restored.push('backlogHealthHistory')
          }
          break

        case 'userRole':
          if (overwrite || !loadFromStorage(keys.userRole)) {
            saveToStorage(keys.userRole, data)
            result.restored.push('userRole')
          }
          break

        case 'viewPreference':
          if (overwrite || !loadFromStorage(keys.viewPreference)) {
            saveToStorage(keys.viewPreference, data)
            result.restored.push('viewPreference')
          }
          break

        case 'favoriteViews':
          if (overwrite || !loadFromStorage(keys.favoriteViews)) {
            saveToStorage(keys.favoriteViews, data)
            result.restored.push('favoriteViews')
          }
          break

        case 'velocityConfig':
          if (overwrite || !loadFromStorage(keys.velocityConfig)) {
            saveToStorage(keys.velocityConfig, data)
            result.restored.push('velocityConfig')
            // Trigger velocity config changed event so components update
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('velocityConfigChanged'))
            }
          }
          break

        case 'uiState':
          if (data.qualityShowOpenOnly !== null && data.qualityShowOpenOnly !== undefined) {
            saveToStorage(keys.qualityShowOpenOnly, data.qualityShowOpenOnly)
          }
          if (data.qualityLegendCollapsed !== null && data.qualityLegendCollapsed !== undefined) {
            saveToStorage(keys.qualityLegendCollapsed, data.qualityLegendCollapsed)
          }
          if (data.cycleTimeBottleneckCollapsed !== null && data.cycleTimeBottleneckCollapsed !== undefined) {
            saveToStorage(keys.cycleTimeBottleneckCollapsed, data.cycleTimeBottleneckCollapsed)
          }
          result.restored.push('uiState')
          break

        default:
          result.skipped.push(category + ' (unknown category)')
      }
    } catch (error) {
      console.error(`Failed to restore ${category}:`, error)
      result.failed.push(category)
      result.success = false
    }
  })

  return result
}

/**
 * Get backup statistics
 * @returns {Object} Statistics about current data
 */
export function getBackupStatistics() {
  const keys = getAllStorageKeys()
  const stats = {
    totalItems: 0,
    categories: [],
    estimatedSize: 0
  }

  Object.entries(keys).forEach(([category, key]) => {
    const data = loadFromStorage(key)
    if (data) {
      stats.totalItems++
      stats.categories.push(category)

      // Estimate size in bytes
      const jsonStr = JSON.stringify(data)
      stats.estimatedSize += jsonStr.length
    }
  })

  // Convert to KB
  stats.estimatedSizeKB = Math.round(stats.estimatedSize / 1024)

  return stats
}

/**
 * Clear all application data (use with caution!)
 * @param {boolean} confirm - Must be true to execute
 * @returns {boolean} Success
 */
export function clearAllData(confirm = false) {
  if (!confirm) {
    throw new Error('Must confirm clearAllData operation')
  }

  const keys = getAllStorageKeys()
  Object.values(keys).forEach(key => {
    localStorage.removeItem(key)
  })

  return true
}

/**
 * Compare two backups and show differences
 * @param {Object} backup1 - First backup
 * @param {Object} backup2 - Second backup
 * @returns {Object} Comparison result
 */
export function compareBackups(backup1, backup2) {
  const result = {
    differences: [],
    added: [],
    removed: [],
    modified: []
  }

  const categories1 = new Set(Object.keys(backup1.data))
  const categories2 = new Set(backup2.data)

  // Find added categories
  categories2.forEach(cat => {
    if (!categories1.has(cat)) {
      result.added.push(cat)
    }
  })

  // Find removed categories
  categories1.forEach(cat => {
    if (!categories2.has(cat)) {
      result.removed.push(cat)
    }
  })

  // Find modified categories (simple length check)
  categories1.forEach(cat => {
    if (categories2.has(cat)) {
      const json1 = JSON.stringify(backup1.data[cat])
      const json2 = JSON.stringify(backup2.data[cat])
      if (json1 !== json2) {
        result.modified.push(cat)
      }
    }
  })

  return result
}
