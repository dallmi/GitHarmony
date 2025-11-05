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
    projectConfig: 'gitlab_projects',
    teamMembers: 'team_members',
    absences: 'absences',
    stakeholders: 'stakeholders',
    communicationHistory: 'communication_history',
    communicationTemplates: 'communication_templates',
    decisions: 'decisions',
    documents: 'documents',
    healthConfig: 'health_config',
    dataQualityRules: 'data_quality_rules',
    ragSettings: 'rag_settings',
    velocitySettings: 'velocity_settings',
    capacitySettings: 'capacity_settings',
    customLabels: 'custom_labels',
    savedFilters: 'saved_filters',
    uiPreferences: 'ui_preferences',
    cycleTimeSettings: 'cycle_time_settings',
    complianceRules: 'compliance_rules',
    roadmapSettings: 'roadmap_settings',
    insightsConfig: 'insights_config'
  }
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

  // Load all data categories
  const data = {}

  // 1. Project Configuration
  const projects = loadFromStorage(keys.projectConfig)
  if (projects) {
    if (!includeTokens && projects.length > 0) {
      // Mask access tokens for security
      data.projectConfig = projects.map(p => ({
        ...p,
        accessToken: p.accessToken ? maskToken(p.accessToken) : null
      }))
    } else {
      data.projectConfig = projects
    }
    includedData.push('projectConfig')
  }

  // 2. Team Configuration
  const teamMembers = loadFromStorage(keys.teamMembers)
  if (teamMembers) {
    data.teamConfig = teamMembers
    includedData.push('teamConfig')
  }

  // 3. Absence/Holiday Planning
  const absences = loadFromStorage(keys.absences)
  if (absences) {
    data.absences = absences
    includedData.push('absences')
  }

  // 4. Stakeholder Hub Data
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

  // 5. Health Score Configuration
  const healthConfig = loadFromStorage(keys.healthConfig)
  if (healthConfig) {
    data.healthConfig = healthConfig
    includedData.push('healthConfig')
  }

  // 6. Data Quality Rules
  const dataQualityRules = loadFromStorage(keys.dataQualityRules)
  if (dataQualityRules) {
    data.dataQualityRules = dataQualityRules
    includedData.push('dataQualityRules')
  }

  // 7. RAG Analysis Settings
  const ragSettings = loadFromStorage(keys.ragSettings)
  if (ragSettings) {
    data.ragSettings = ragSettings
    includedData.push('ragSettings')
  }

  // 8. Velocity Settings
  const velocitySettings = loadFromStorage(keys.velocitySettings)
  if (velocitySettings) {
    data.velocitySettings = velocitySettings
    includedData.push('velocitySettings')
  }

  // 9. Capacity Settings
  const capacitySettings = loadFromStorage(keys.capacitySettings)
  if (capacitySettings) {
    data.capacitySettings = capacitySettings
    includedData.push('capacitySettings')
  }

  // 10. Cycle Time Settings
  const cycleTimeSettings = loadFromStorage(keys.cycleTimeSettings)
  if (cycleTimeSettings) {
    data.cycleTimeSettings = cycleTimeSettings
    includedData.push('cycleTimeSettings')
  }

  // 11. Compliance Rules
  const complianceRules = loadFromStorage(keys.complianceRules)
  if (complianceRules) {
    data.complianceRules = complianceRules
    includedData.push('complianceRules')
  }

  // 12. Custom Labels
  const customLabels = loadFromStorage(keys.customLabels)
  if (customLabels) {
    data.customLabels = customLabels
    includedData.push('customLabels')
  }

  // 13. Saved Filters
  const savedFilters = loadFromStorage(keys.savedFilters)
  if (savedFilters) {
    data.savedFilters = savedFilters
    includedData.push('savedFilters')
  }

  // 14. UI Preferences
  const uiPreferences = loadFromStorage(keys.uiPreferences)
  if (uiPreferences) {
    data.uiPreferences = uiPreferences
    includedData.push('uiPreferences')
  }

  // 15. Roadmap Settings
  const roadmapSettings = loadFromStorage(keys.roadmapSettings)
  if (roadmapSettings) {
    data.roadmapSettings = roadmapSettings
    includedData.push('roadmapSettings')
  }

  // 16. Insights Configuration
  const insightsConfig = loadFromStorage(keys.insightsConfig)
  if (insightsConfig) {
    data.insightsConfig = insightsConfig
    includedData.push('insightsConfig')
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
  if (!backup.metadata.tokensIncluded && backup.data.projectConfig) {
    const hasMaskedTokens = backup.data.projectConfig.some(p =>
      p.accessToken && p.accessToken.includes('***')
    )
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
    if (!data) {
      result.skipped.push(category)
      return
    }

    try {
      switch (category) {
        case 'projectConfig':
          if (overwrite || !loadFromStorage(keys.projectConfig)) {
            saveToStorage(keys.projectConfig, data)
            result.restored.push('projectConfig')
          } else if (merge) {
            const existing = loadFromStorage(keys.projectConfig) || []
            const merged = [...existing, ...data]
            saveToStorage(keys.projectConfig, merged)
            result.restored.push('projectConfig (merged)')
          } else {
            result.skipped.push('projectConfig (already exists)')
          }
          break

        case 'teamConfig':
          if (overwrite || !loadFromStorage(keys.teamMembers)) {
            saveToStorage(keys.teamMembers, data)
            result.restored.push('teamConfig')
          } else {
            result.skipped.push('teamConfig (already exists)')
          }
          break

        case 'absences':
          if (overwrite || !loadFromStorage(keys.absences)) {
            saveToStorage(keys.absences, data)
            result.restored.push('absences')
          } else {
            result.skipped.push('absences (already exists)')
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

        case 'healthConfig':
          if (overwrite || !loadFromStorage(keys.healthConfig)) {
            saveToStorage(keys.healthConfig, data)
            result.restored.push('healthConfig')
          }
          break

        case 'dataQualityRules':
          if (overwrite || !loadFromStorage(keys.dataQualityRules)) {
            saveToStorage(keys.dataQualityRules, data)
            result.restored.push('dataQualityRules')
          }
          break

        case 'ragSettings':
          if (overwrite || !loadFromStorage(keys.ragSettings)) {
            saveToStorage(keys.ragSettings, data)
            result.restored.push('ragSettings')
          }
          break

        case 'velocitySettings':
          if (overwrite || !loadFromStorage(keys.velocitySettings)) {
            saveToStorage(keys.velocitySettings, data)
            result.restored.push('velocitySettings')
          }
          break

        case 'capacitySettings':
          if (overwrite || !loadFromStorage(keys.capacitySettings)) {
            saveToStorage(keys.capacitySettings, data)
            result.restored.push('capacitySettings')
          }
          break

        case 'cycleTimeSettings':
          if (overwrite || !loadFromStorage(keys.cycleTimeSettings)) {
            saveToStorage(keys.cycleTimeSettings, data)
            result.restored.push('cycleTimeSettings')
          }
          break

        case 'complianceRules':
          if (overwrite || !loadFromStorage(keys.complianceRules)) {
            saveToStorage(keys.complianceRules, data)
            result.restored.push('complianceRules')
          }
          break

        case 'customLabels':
          if (overwrite || !loadFromStorage(keys.customLabels)) {
            saveToStorage(keys.customLabels, data)
            result.restored.push('customLabels')
          }
          break

        case 'savedFilters':
          if (overwrite || !loadFromStorage(keys.savedFilters)) {
            saveToStorage(keys.savedFilters, data)
            result.restored.push('savedFilters')
          }
          break

        case 'uiPreferences':
          if (overwrite || !loadFromStorage(keys.uiPreferences)) {
            saveToStorage(keys.uiPreferences, data)
            result.restored.push('uiPreferences')
          }
          break

        case 'roadmapSettings':
          if (overwrite || !loadFromStorage(keys.roadmapSettings)) {
            saveToStorage(keys.roadmapSettings, data)
            result.restored.push('roadmapSettings')
          }
          break

        case 'insightsConfig':
          if (overwrite || !loadFromStorage(keys.insightsConfig)) {
            saveToStorage(keys.insightsConfig, data)
            result.restored.push('insightsConfig')
          }
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
