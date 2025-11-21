/**
 * LocalStorage Service
 * Handles all browser storage operations
 */

const KEYS = {
  GITLAB_URL: 'gitlab_url',
  GITLAB_TOKEN: 'gitlab_token',
  PROJECT_ID: 'gitlab_project',
  GROUP_PATH: 'gitlab_group_path',
  FILTER_2025: 'gitlab_filter_2025',
  MODE: 'gitlab_mode', // 'project' or 'group'
  RISKS: 'project_risks',
  PROJECTS: 'portfolio_projects', // Multi-project configuration
  ACTIVE_PROJECT: 'active_project_id', // Currently active project
  GROUPS: 'portfolio_groups', // Multi-group configuration (for pods)
  ACTIVE_GROUP: 'active_group_id' // Currently active group
}

/**
 * Save GitLab configuration
 */
export function saveConfig(config) {
  localStorage.setItem(KEYS.GITLAB_URL, config.gitlabUrl || '')
  localStorage.setItem(KEYS.GITLAB_TOKEN, config.token || '')
  localStorage.setItem(KEYS.PROJECT_ID, config.projectId || '')
  localStorage.setItem(KEYS.GROUP_PATH, config.groupPath || '')
  localStorage.setItem(KEYS.MODE, config.mode || 'project')
  // Save filter2025 setting (store as string to handle boolean properly)
  if (config.filter2025 !== undefined) {
    localStorage.setItem(KEYS.FILTER_2025, config.filter2025.toString())
  }
  // Save default token if provided
  if (config.defaultToken !== undefined) {
    localStorage.setItem('gitlab_default_token', config.defaultToken || '')
  }
}

/**
 * Load GitLab configuration
 */
export function loadConfig() {
  // Load filter2025 setting from localStorage (default to false if not set)
  const filter2025Stored = localStorage.getItem(KEYS.FILTER_2025)
  const filter2025 = filter2025Stored !== null ? filter2025Stored === 'true' : false

  const mode = localStorage.getItem(KEYS.MODE) || 'project'

  return {
    gitlabUrl: localStorage.getItem(KEYS.GITLAB_URL) || 'https://gitlab.com',
    token: localStorage.getItem(KEYS.GITLAB_TOKEN) || '',
    projectId: localStorage.getItem(KEYS.PROJECT_ID) || '',
    groupPath: localStorage.getItem(KEYS.GROUP_PATH) || '',
    mode,
    filter2025,
    defaultToken: localStorage.getItem('gitlab_default_token') || ''
  }
}

/**
 * Check if configuration is complete
 */
export function isConfigured() {
  const config = loadConfig()

  // In group mode, groupPath is required instead of projectId
  if (config.mode === 'group') {
    return !!(config.gitlabUrl && config.token && config.groupPath)
  }

  // In project mode, projectId is required
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
  localStorage.removeItem(KEYS.MODE)
  localStorage.removeItem(KEYS.FILTER_2025)
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

/**
 * GROUP MANAGEMENT (for multi-pod configurations)
 */

/**
 * Get all configured groups
 */
export function getAllGroups() {
  const stored = localStorage.getItem(KEYS.GROUPS)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save group to portfolio
 */
export function saveGroup(group) {
  const groups = getAllGroups()
  const existingIndex = groups.findIndex(g => g.id === group.id)

  if (existingIndex >= 0) {
    // Update existing group
    groups[existingIndex] = { ...groups[existingIndex], ...group }
  } else {
    // Add new group
    groups.push({
      id: group.id || Date.now().toString(),
      name: group.name,
      gitlabUrl: group.gitlabUrl,
      token: group.token,
      groupPath: group.groupPath,
      addedAt: new Date().toISOString()
    })
  }

  localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups))
  return groups
}

/**
 * Remove group from portfolio
 */
export function removeGroup(groupId) {
  const groups = getAllGroups()
  const filtered = groups.filter(g => g.id !== groupId)
  localStorage.setItem(KEYS.GROUPS, JSON.stringify(filtered))
  return filtered
}

/**
 * Get active group ID
 */
export function getActiveGroupId() {
  return localStorage.getItem(KEYS.ACTIVE_GROUP)
}

/**
 * Set active group
 */
export function setActiveGroup(groupId) {
  localStorage.setItem(KEYS.ACTIVE_GROUP, groupId)

  // Also update the current config for backwards compatibility
  const groups = getAllGroups()
  const group = groups.find(g => g.id === groupId)

  if (group) {
    saveConfig({
      gitlabUrl: group.gitlabUrl,
      token: group.token,
      groupPath: group.groupPath,
      mode: 'group'
    })
  }
}

/**
 * Get active group configuration
 */
export function getActiveGroup() {
  const activeId = getActiveGroupId()
  if (!activeId) return null

  const groups = getAllGroups()
  return groups.find(g => g.id === activeId) || null
}
