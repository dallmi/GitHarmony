/**
 * User Preferences Service
 * Manages user role, view preferences, and settings
 */

const STORAGE_KEYS = {
  USER_ROLE: 'githarmony_user_role',
  VIEW_PREFERENCE: 'githarmony_view_preference',
  FAVORITE_VIEWS: 'githarmony_favorite_views'
}

/**
 * Get the current user role
 * @returns {string} - 'executive', 'manager', or 'team'
 */
export function getUserRole() {
  const stored = localStorage.getItem(STORAGE_KEYS.USER_ROLE)
  return stored || 'manager' // Default to manager role
}

/**
 * Set the user role
 * @param {string} role - 'executive', 'manager', or 'team'
 */
export function setUserRole(role) {
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, role)
}

/**
 * Get view preference (grouped vs flat)
 * @returns {string} - 'grouped' or 'flat'
 */
export function getViewPreference() {
  const stored = localStorage.getItem(STORAGE_KEYS.VIEW_PREFERENCE)
  return stored || 'grouped' // Default to grouped navigation
}

/**
 * Set view preference
 * @param {string} preference - 'grouped' or 'flat'
 */
export function setViewPreference(preference) {
  localStorage.setItem(STORAGE_KEYS.VIEW_PREFERENCE, preference)
}

/**
 * Get favorite/pinned views
 * @returns {Array<string>} - Array of view IDs
 */
export function getFavoriteViews() {
  const stored = localStorage.getItem(STORAGE_KEYS.FAVORITE_VIEWS)
  return stored ? JSON.parse(stored) : []
}

/**
 * Toggle a view as favorite
 * @param {string} viewId - The view ID to toggle
 * @returns {Array<string>} - Updated favorites list
 */
export function toggleFavoriteView(viewId) {
  const favorites = getFavoriteViews()
  const index = favorites.indexOf(viewId)

  if (index > -1) {
    favorites.splice(index, 1) // Remove
  } else {
    favorites.push(viewId) // Add
  }

  localStorage.setItem(STORAGE_KEYS.FAVORITE_VIEWS, JSON.stringify(favorites))
  return favorites
}

/**
 * Check if a view is accessible for the current user role
 * @param {Object} view - View object with roles array
 * @returns {boolean}
 */
export function isViewAccessible(view) {
  const userRole = getUserRole()
  return view.roles && view.roles.includes(userRole)
}

/**
 * Get role display information
 * @param {string} role
 * @returns {Object}
 */
export function getRoleInfo(role) {
  const roleMap = {
    executive: {
      label: 'Executive',
      description: 'High-level overview, strategic insights, and stakeholder reporting'
    },
    manager: {
      label: 'Manager',
      description: 'Full access to planning, execution, and team analytics'
    },
    team: {
      label: 'Team Member',
      description: 'Focus on execution, sprints, and operational metrics'
    }
  }

  return roleMap[role] || roleMap.manager
}
