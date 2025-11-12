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
    decisions: 'decisions',
    documents: 'documents',

    // Health Score
    healthScoreConfig: 'healthScoreConfig',

    // Quality & Compliance
    criteriaConfig: 'criteriaConfig',
    dodTemplates: 'dodTemplates',

    // Sprint Management
    sprintGoals: 'sprint_goals',
    retroActions: 'retro_actions',

    // Backlog Health
    backlogHealthHistory: 'backlogHealthHistory',

    // User Preferences
    userRole: 'user_role',
    viewPreference: 'view_preference',
    favoriteViews: 'favorite_views',

    // UI State
    qualityShowOpenOnly: 'quality.showOpenOnly',
    qualityLegendCollapsed: 'quality.legendCollapsed',
    cycleTimeBottleneckCollapsed: 'cycleTime.bottleneckCollapsed'
  }
}

/**
 * Get all per-project keys for a base key pattern
 * @param {string} baseKey - Base key pattern (e.g., 'gitlab_team_config')
 * @returns {Object} Map of project IDs to localStorage keys
 */
function getPerProjectKeys(baseKey) {
  const projectKeys = {}

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(baseKey)) {
      if (key === baseKey) {
        // Base key without project suffix (default/global)
        projectKeys['default'] = key
      } else if (key.startsWith(`${baseKey}_`)) {
        // Extract project ID from key
        const projectId = key.substring(baseKey.length + 1)
        projectKeys[projectId] = key
      }
    }
  }

  return projectKeys
}

/**
 * Load data from localStorage
 */
function loadFromStorage(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.warn(`Failed to load ${key}:`, e)
    return null
  }
}

/**
 * Save data to localStorage
 */
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
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
  const { includeTokens = false, encrypt = false, password = null } = options

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
    if (!includeTokens && Array.isArray(portfolioProjects)) {
      // Mask access tokens in portfolio projects
      data.portfolioProjects = portfolioProjects.map(p => ({
        ...p,
        token: p.token ? maskToken(p.token) : null
      }))
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
    if (!includeTokens && Array.isArray(portfolioGroups)) {
      // Mask access tokens in portfolio groups (pods)
      data.portfolioGroups = portfolioGroups.map(g => ({
        ...g,
        token: g.token ? maskToken(g.token) : null
      }))
    } else {
      data.portfolioGroups = portfolioGroups
    }
    includedData.push('portfolioGroups')
  }

  addIfExists('activeGroup', keys.activeGroup)

  // 5. Risk Management
  addIfExists('risks', keys.risks)

  // 6. Team Configuration (per-project)
  const teamConfigKeys = getPerProjectKeys(keys.teamConfigBase)
  const sprintCapacityKeys = getPerProjectKeys(keys.sprintCapacityBase)
  const capacitySettingsKeys = getPerProjectKeys(keys.capacitySettingsBase)

  if (Object.keys(teamConfigKeys).length > 0 || Object.keys(sprintCapacityKeys).length > 0 || Object.keys(capacitySettingsKeys).length > 0) {
    data.teamConfiguration = {
      teamConfigs: {},
      sprintCapacities: {},
      capacitySettings: {}
    }

    // Load all project-specific team configs
    Object.entries(teamConfigKeys).forEach(([projectId, key]) => {
      const config = loadFromStorage(key)
      if (config) {
        data.teamConfiguration.teamConfigs[projectId] = config
      }
    })

    // Load all project-specific sprint capacities
    Object.entries(sprintCapacityKeys).forEach(([projectId, key]) => {
      const capacity = loadFromStorage(key)
      if (capacity) {
        data.teamConfiguration.sprintCapacities[projectId] = capacity
      }
    })

    // Load all project-specific capacity settings
    Object.entries(capacitySettingsKeys).forEach(([projectId, key]) => {
      const settings = loadFromStorage(key)
      if (settings) {
        data.teamConfiguration.capacitySettings[projectId] = settings
      }
    })

    if (Object.keys(data.teamConfiguration.teamConfigs).length > 0 ||
        Object.keys(data.teamConfiguration.sprintCapacities).length > 0 ||
        Object.keys(data.teamConfiguration.capacitySettings).length > 0) {
      includedData.push('teamConfiguration')
    } else {
      delete data.teamConfiguration
    }
  }

  // 7. Absences (per-project)
  const absenceKeys = getPerProjectKeys(keys.absencesBase)

  if (Object.keys(absenceKeys).length > 0) {
    data.absences = {}

    Object.entries(absenceKeys).forEach(([projectId, key]) => {
      const absenceData = loadFromStorage(key)
      if (absenceData) {
        data.absences[projectId] = absenceData
      }
    })

    if (Object.keys(data.absences).length > 0) {
      includedData.push('absences')
    } else {
      delete data.absences
    }
  }

  // 8. Stakeholder Hub Data
  const stakeholders = loadFromStorage(keys.stakeholders)
  const communicationHistory = loadFromStorage(keys.communicationHistory)
  const communicationTemplates = loadFromStorage(keys.communicationTemplates)
  const decisions = loadFromStorage(keys.decisions)
  const documents = loadFromStorage(keys.documents)

  if (stakeholders || communicationHistory || communicationTemplates || decisions || documents) {
    data.stakeholderHub = {
      stakeholders,
      communicationHistory,
      communicationTemplates,
      decisions,
      documents
    }
    includedData.push('stakeholderHub')
  }

  // 9. Health Score Configuration
  addIfExists('healthScoreConfig', keys.healthScoreConfig)

  // 10. Quality & Compliance
  addIfExists('criteriaConfig', keys.criteriaConfig)
  addIfExists('dodTemplates', keys.dodTemplates)

  // 11. Sprint Management
  addIfExists('sprintGoals', keys.sprintGoals)
  addIfExists('retroActions', keys.retroActions)

  // 12. Backlog Health
  addIfExists('backlogHealthHistory', keys.backlogHealthHistory)

  // 13. User Preferences
  addIfExists('userRole', keys.userRole)
  addIfExists('viewPreference', keys.viewPreference)
  addIfExists('favoriteViews', keys.favoriteViews)

  // 14. UI State
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
      backupType: encrypt ? 'encrypted' : 'plain',
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

    // Check portfolio projects tokens
    if (backup.data.portfolioProjects && Array.isArray(backup.data.portfolioProjects)) {
      if (backup.data.portfolioProjects.some(p => p.token && p.token.includes('***'))) {
        hasMaskedTokens = true
      }
    }

    // Check portfolio groups (pods) tokens
    if (backup.data.portfolioGroups && Array.isArray(backup.data.portfolioGroups)) {
      if (backup.data.portfolioGroups.some(g => g.token && g.token.includes('***'))) {
        hasMaskedTokens = true
      }
    }

    if (hasMaskedTokens) {
      result.warnings.push('Access tokens are masked - you will need to re-enter them manually')
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
            if (data.gitlabUrl) saveToStorage(keys.gitlabUrl, data.gitlabUrl)
            if (data.gitlabToken) saveToStorage(keys.gitlabToken, data.gitlabToken)
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

        case 'teamConfiguration':
          // Restore per-project team configurations
          let teamConfigCount = 0

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

          if (teamConfigCount > 0) {
            result.restored.push(`teamConfiguration (${teamConfigCount} items)`)
          }
          break

        case 'absences':
          // Restore per-project absences
          let absenceCount = 0

          Object.entries(data).forEach(([projectId, absenceData]) => {
            const key = projectId === 'default'
              ? keys.absencesBase
              : `${keys.absencesBase}_${projectId}`

            if (overwrite || !loadFromStorage(key)) {
              saveToStorage(key, absenceData)
              absenceCount++
            }
          })

          if (absenceCount > 0) {
            result.restored.push(`absences (${absenceCount} projects)`)
          }
          break

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
            if (overwrite || !loadFromStorage(keys.decisions)) {
              saveToStorage(keys.decisions, data.decisions)
              result.restored.push('decisions')
            }
          }
          if (data.documents) {
            if (overwrite || !loadFromStorage(keys.documents)) {
              saveToStorage(keys.documents, data.documents)
              result.restored.push('documents')
            }
          }
          break

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
