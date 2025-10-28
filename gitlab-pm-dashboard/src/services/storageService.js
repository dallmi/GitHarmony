/**
 * LocalStorage Service
 * Handles all browser storage operations
 */

const KEYS = {
  GITLAB_URL: 'gitlab_url',
  GITLAB_TOKEN: 'gitlab_token',
  PROJECT_ID: 'gitlab_project',
  GROUP_PATH: 'gitlab_group_path',
  RISKS: 'project_risks',
  PROJECTS: 'portfolio_projects', // Multi-project configuration
  ACTIVE_PROJECT: 'active_project_id' // Currently active project
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
    gitlabUrl: localStorage.getItem(KEYS.GITLAB_URL) || 'https://gitlab.com',
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

/**
 * PORTFOLIO MANAGEMENT
 */

/**
 * Get all configured projects
 */
export function getAllProjects() {
  const stored = localStorage.getItem(KEYS.PROJECTS)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save project to portfolio
 */
export function saveProject(project) {
  const projects = getAllProjects()
  const existingIndex = projects.findIndex(p => p.id === project.id)

  if (existingIndex >= 0) {
    // Update existing project
    projects[existingIndex] = { ...projects[existingIndex], ...project }
  } else {
    // Add new project
    projects.push({
      id: project.id || Date.now().toString(),
      name: project.name,
      gitlabUrl: project.gitlabUrl,
      token: project.token,
      projectId: project.projectId,
      groupPath: project.groupPath || '',
      addedAt: new Date().toISOString()
    })
  }

  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects))
  return projects
}

/**
 * Remove project from portfolio
 */
export function removeProject(projectId) {
  const projects = getAllProjects()
  const filtered = projects.filter(p => p.id !== projectId)
  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(filtered))
  return filtered
}

/**
 * Get active project ID
 */
export function getActiveProjectId() {
  return localStorage.getItem(KEYS.ACTIVE_PROJECT)
}

/**
 * Set active project
 */
export function setActiveProject(projectId) {
  localStorage.setItem(KEYS.ACTIVE_PROJECT, projectId)

  // Also update the current config for backwards compatibility
  const projects = getAllProjects()
  const project = projects.find(p => p.id === projectId)

  if (project) {
    saveConfig({
      gitlabUrl: project.gitlabUrl,
      token: project.token,
      projectId: project.projectId,
      groupPath: project.groupPath
    })
  }
}

/**
 * Get active project configuration
 */
export function getActiveProject() {
  const activeId = getActiveProjectId()
  if (!activeId) return null

  const projects = getAllProjects()
  return projects.find(p => p.id === activeId) || null
}
