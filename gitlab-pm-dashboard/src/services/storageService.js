/**
 * LocalStorage Service
 * Handles all browser storage operations
 */

const KEYS = {
  GITLAB_URL: 'gitlab_url',
  GITLAB_TOKEN: 'gitlab_token',
  PROJECT_ID: 'gitlab_project',
  GROUP_PATH: 'gitlab_group_path',
  RISKS: 'project_risks'
}

/**
 * Save GitLab configuration
 */
export function saveConfig(config) {
  localStorage.setItem(KEYS.GITLAB_URL, config.gitlabUrl || '')
  localStorage.setItem(KEYS.GITLAB_TOKEN, config.token || '')
  localStorage.setItem(KEYS.PROJECT_ID, config.projectId || '')
  localStorage.setItem(KEYS.GROUP_PATH, config.groupPath || '')
}

/**
 * Load GitLab configuration
 */
export function loadConfig() {
  return {
    gitlabUrl: localStorage.getItem(KEYS.GITLAB_URL) || 'https://devcloud.ubs.net',
    token: localStorage.getItem(KEYS.GITLAB_TOKEN) || '',
    projectId: localStorage.getItem(KEYS.PROJECT_ID) || '',
    groupPath: localStorage.getItem(KEYS.GROUP_PATH) || ''
  }
}

/**
 * Check if configuration is complete
 */
export function isConfigured() {
  const config = loadConfig()
  return !!(config.gitlabUrl && config.token && config.projectId)
}

/**
 * Clear all stored configuration
 */
export function clearConfig() {
  localStorage.removeItem(KEYS.GITLAB_URL)
  localStorage.removeItem(KEYS.GITLAB_TOKEN)
  localStorage.removeItem(KEYS.PROJECT_ID)
  localStorage.removeItem(KEYS.GROUP_PATH)
}

/**
 * Load risks from storage
 */
export function loadRisks() {
  const stored = localStorage.getItem(KEYS.RISKS)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save risks to storage
 */
export function saveRisks(risks) {
  localStorage.setItem(KEYS.RISKS, JSON.stringify(risks))
}

/**
 * Clear all data (config + risks)
 */
export function clearAll() {
  localStorage.clear()
}
