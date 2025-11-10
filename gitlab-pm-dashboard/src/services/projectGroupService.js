/**
 * Project Group Service
 * Manages custom groupings of projects for flexible portfolio views
 */

const STORAGE_KEY = 'gitlab-pm-project-groups'

/**
 * Project Group structure:
 * {
 *   id: string,
 *   name: string,
 *   projectIds: string[], // Array of project IDs included in this group
 *   sharedGroupPaths: string[], // Optional: Additional group paths to fetch epics from
 *   createdAt: string
 * }
 */

/**
 * Load all project groups
 */
export function loadProjectGroups() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading project groups:', error)
  }
  return []
}

/**
 * Save project groups
 */
export function saveProjectGroups(groups) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
    return true
  } catch (error) {
    console.error('Error saving project groups:', error)
    return false
  }
}

/**
 * Add or update a project group
 */
export function saveProjectGroup(group) {
  const groups = loadProjectGroups()

  if (group.id) {
    // Update existing
    const index = groups.findIndex(g => g.id === group.id)
    if (index >= 0) {
      groups[index] = { ...group, updatedAt: new Date().toISOString() }
    } else {
      groups.push({ ...group, createdAt: new Date().toISOString() })
    }
  } else {
    // Create new
    const newGroup = {
      ...group,
      id: `group-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    groups.push(newGroup)
  }

  saveProjectGroups(groups)
  return groups
}

/**
 * Delete a project group
 */
export function deleteProjectGroup(groupId) {
  const groups = loadProjectGroups()
  const filtered = groups.filter(g => g.id !== groupId)
  saveProjectGroups(filtered)
  return filtered
}

/**
 * Get a specific project group
 */
export function getProjectGroup(groupId) {
  const groups = loadProjectGroups()
  return groups.find(g => g.id === groupId)
}

/**
 * Get projects for a group
 */
export function getProjectsForGroup(groupId, allProjects) {
  const group = getProjectGroup(groupId)
  if (!group) return []

  return allProjects.filter(p => group.projectIds.includes(p.id))
}