/**
 * Team Configuration Service
 * Manages team member roles, capacities, and sprint planning
 * Now project-aware: stores separate configurations per project
 */

import { getActiveProjectId } from './storageService'

const TEAM_CONFIG_KEY = 'gitlab_team_config'
const SPRINT_CAPACITY_KEY = 'gitlab_sprint_capacity'
const CAPACITY_SETTINGS_KEY = 'gitlab_capacity_settings'

/**
 * Get project-specific key for localStorage
 * @param {string} baseKey - Base key name
 * @returns {string} Project-specific key
 */
function getProjectKey(baseKey) {
  const projectId = getActiveProjectId()

  // If no active project or cross-project view, use global key
  if (!projectId || projectId === 'cross-project') {
    return baseKey
  }

  return `${baseKey}_${projectId}`
}

// Default roles available
export const DEFAULT_ROLES = [
  'Data Engineer',
  'Business Analyst',
  'Scrum Master',
  'SRE',
  'Product Owner',
  'Initiative Manager',
  'Developer',
  'QA Engineer',
  'DevOps Engineer',
  'Custom'
]

/**
 * Calculate historical hours per story point from completed issues
 * This provides a data-driven default conversion rate
 */
export function calculateHistoricalVelocity(issues) {
  const completedIssues = issues.filter(issue =>
    issue.state === 'closed' &&
    issue.weight > 0 &&
    issue.time_stats?.total_time_spent > 0
  )

  if (completedIssues.length === 0) {
    return {
      hoursPerStoryPoint: 8, // Default fallback
      sampleSize: 0,
      totalHours: 0,
      totalPoints: 0,
      confidence: 'low'
    }
  }

  const totalHours = completedIssues.reduce((sum, issue) =>
    sum + (issue.time_stats.total_time_spent / 3600), // Convert seconds to hours
    0
  )

  const totalPoints = completedIssues.reduce((sum, issue) =>
    sum + issue.weight,
    0
  )

  const hoursPerStoryPoint = totalHours / totalPoints

  // Determine confidence level based on sample size
  let confidence = 'low'
  if (completedIssues.length >= 50) confidence = 'high'
  else if (completedIssues.length >= 20) confidence = 'medium'

  return {
    hoursPerStoryPoint: Math.round(hoursPerStoryPoint * 100) / 100, // Round to 2 decimals
    sampleSize: completedIssues.length,
    totalHours: Math.round(totalHours * 10) / 10,
    totalPoints,
    confidence
  }
}

/**
 * Get estimated hours for an issue
 */
export function getEstimatedHours(issue, capacitySettings, manualEstimates = {}) {
  // 1. Check for manual estimate first
  if (manualEstimates[issue.id]) {
    return manualEstimates[issue.id]
  }

  // 2. Calculate from story points/weight
  if (issue.weight && issue.weight > 0) {
    return issue.weight * capacitySettings.hoursPerStoryPoint
  }

  // 3. Use default hours per issue
  return capacitySettings.defaultHoursPerIssue || 4
}

/**
 * Load team configuration (project-specific)
 */
export function loadTeamConfig() {
  try {
    const key = getProjectKey(TEAM_CONFIG_KEY)
    const saved = localStorage.getItem(key)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading team config:', error)
  }

  // Default empty config
  return {
    teamMembers: [],
    lastUpdated: null
  }
}

/**
 * Save team configuration (project-specific)
 */
export function saveTeamConfig(config) {
  try {
    const key = getProjectKey(TEAM_CONFIG_KEY)
    const configToSave = {
      ...config,
      lastUpdated: new Date().toISOString()
    }
    localStorage.setItem(key, JSON.stringify(configToSave))
    return true
  } catch (error) {
    console.error('Error saving team config:', error)
    return false
  }
}

/**
 * Add or update team member
 */
export function saveTeamMember(member) {
  const config = loadTeamConfig()

  const existingIndex = config.teamMembers.findIndex(m => m.username === member.username)

  if (existingIndex >= 0) {
    config.teamMembers[existingIndex] = member
  } else {
    config.teamMembers.push(member)
  }

  return saveTeamConfig(config)
}

/**
 * Remove team member
 */
export function removeTeamMember(username) {
  const config = loadTeamConfig()
  config.teamMembers = config.teamMembers.filter(m => m.username !== username)
  return saveTeamConfig(config)
}

/**
 * Load sprint capacity configuration (project-specific)
 */
export function loadSprintCapacity() {
  try {
    const key = getProjectKey(SPRINT_CAPACITY_KEY)
    const saved = localStorage.getItem(key)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading sprint capacity:', error)
  }

  return {
    sprints: [] // Array of sprint capacity objects
  }
}

/**
 * Save sprint capacity configuration (project-specific)
 */
export function saveSprintCapacity(capacity) {
  try {
    const key = getProjectKey(SPRINT_CAPACITY_KEY)
    localStorage.setItem(key, JSON.stringify(capacity))
    return true
  } catch (error) {
    console.error('Error saving sprint capacity:', error)
    return false
  }
}

/**
 * Update capacity for specific sprint and member
 */
export function updateSprintMemberCapacity(sprintId, sprintName, username, availableHours, reason = '') {
  const capacity = loadSprintCapacity()

  // Find or create sprint
  let sprint = capacity.sprints.find(s => s.sprintId === sprintId)
  if (!sprint) {
    sprint = {
      sprintId,
      sprintName,
      memberCapacity: []
    }
    capacity.sprints.push(sprint)
  }

  // Find or create member capacity
  let memberCap = sprint.memberCapacity.find(m => m.username === username)
  if (memberCap) {
    memberCap.availableHours = availableHours
    memberCap.reason = reason
  } else {
    sprint.memberCapacity.push({
      username,
      availableHours,
      reason
    })
  }

  return saveSprintCapacity(capacity)
}

/**
 * Get capacity for specific sprint and member
 */
export function getSprintMemberCapacity(sprintId, username, defaultCapacity = 40) {
  const capacity = loadSprintCapacity()
  const sprint = capacity.sprints.find(s => s.sprintId === sprintId)

  if (!sprint) return defaultCapacity

  const memberCap = sprint.memberCapacity.find(m => m.username === username)
  return memberCap ? memberCap.availableHours : defaultCapacity
}

/**
 * Load capacity settings (conversion rates, defaults) (project-specific)
 */
export function loadCapacitySettings() {
  try {
    const key = getProjectKey(CAPACITY_SETTINGS_KEY)
    const saved = localStorage.getItem(key)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading capacity settings:', error)
  }

  // Default settings
  return {
    hoursPerStoryPoint: 8,
    defaultHoursPerIssue: 4,
    defaultWeeklyCapacity: 40,
    lastCalculated: null,
    historicalData: null
  }
}

/**
 * Save capacity settings (project-specific)
 */
export function saveCapacitySettings(settings) {
  try {
    const key = getProjectKey(CAPACITY_SETTINGS_KEY)
    localStorage.setItem(key, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Error saving capacity settings:', error)
    return false
  }
}

/**
 * Update capacity settings with historical data
 */
export function updateCapacitySettingsFromHistory(issues) {
  const historicalData = calculateHistoricalVelocity(issues)

  const settings = loadCapacitySettings()
  settings.hoursPerStoryPoint = historicalData.hoursPerStoryPoint
  settings.lastCalculated = new Date().toISOString()
  settings.historicalData = historicalData

  saveCapacitySettings(settings)

  return settings
}

/**
 * Calculate total capacity for a sprint
 */
export function calculateSprintCapacity(sprintId, sprintName, teamMembers) {
  const capacity = loadSprintCapacity()
  const sprint = capacity.sprints.find(s => s.sprintId === sprintId)

  let totalCapacity = 0
  const memberDetails = []

  teamMembers.forEach(member => {
    const memberCap = sprint?.memberCapacity.find(m => m.username === member.username)
    const hours = memberCap ? memberCap.availableHours : member.defaultCapacity

    totalCapacity += hours
    memberDetails.push({
      username: member.username,
      name: member.name,
      role: member.role,
      availableHours: hours,
      reason: memberCap?.reason || ''
    })
  })

  return {
    sprintId,
    sprintName,
    totalCapacity,
    memberDetails
  }
}

/**
 * Get all team members assigned to issues
 */
export function getTeamMembersFromIssues(issues) {
  const members = new Set()

  issues.forEach(issue => {
    issue.assignees?.forEach(assignee => {
      members.add(JSON.stringify({
        username: assignee.username,
        name: assignee.name,
        avatar: assignee.avatar_url
      }))
    })
  })

  return Array.from(members).map(m => JSON.parse(m))
}

/**
 * Get issues assigned to a team member with estimates
 */
export function getMemberIssues(username, issues, capacitySettings, manualEstimates = {}) {
  const memberIssues = issues.filter(issue =>
    issue.assignees?.some(a => a.username === username)
  )

  return memberIssues.map(issue => ({
    ...issue,
    estimatedHours: getEstimatedHours(issue, capacitySettings, manualEstimates)
  }))
}

/**
 * Calculate member workload for a sprint
 */
export function calculateMemberWorkload(username, sprintId, issues, capacitySettings, manualEstimates = {}) {
  // Filter issues for this sprint
  const sprintIssues = issues.filter(issue =>
    issue.iteration?.id === sprintId &&
    issue.assignees?.some(a => a.username === username) &&
    issue.state === 'opened'
  )

  const totalEstimatedHours = sprintIssues.reduce((sum, issue) =>
    sum + getEstimatedHours(issue, capacitySettings, manualEstimates),
    0
  )

  const totalWeight = sprintIssues.reduce((sum, issue) =>
    sum + (issue.weight || 0),
    0
  )

  return {
    issueCount: sprintIssues.length,
    totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
    totalWeight,
    issues: sprintIssues
  }
}
