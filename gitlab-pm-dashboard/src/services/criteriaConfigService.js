/**
 * Quality Criteria Configuration Service
 * Manages localStorage persistence for custom quality criteria settings
 */

const STORAGE_KEY = 'gitlab-pm-quality-criteria-config'

/**
 * Default quality criteria configuration
 */
const DEFAULT_CONFIG = {
  staleThresholds: {
    warning: 30,
    critical: 60
  },
  criteria: {
    assignee: {
      name: 'Assignee',
      description: 'Issue must be assigned to a team member',
      enabled: true,
      severity: 'high'
    },
    weight: {
      name: 'Weight/Estimation',
      description: 'Issue must have story points or time estimate',
      enabled: true,
      severity: 'high'
    },
    epic: {
      name: 'Epic Assignment',
      description: 'Issue must be assigned to an epic',
      enabled: true,
      severity: 'medium'
    },
    description: {
      name: 'Description',
      description: 'Issue must have a meaningful description',
      enabled: true,
      severity: 'high',
      threshold: 20 // minimum character count
    },
    labels: {
      name: 'Type Label',
      description: 'Issue must have a type label (Bug, Feature, etc.)',
      enabled: true,
      severity: 'high'
    },
    milestone: {
      name: 'Milestone',
      description: 'Issue should be assigned to a milestone',
      enabled: true,
      severity: 'medium'
    },
    dueDate: {
      name: 'Due Date',
      description: 'Issue should have a due date (for tracking)',
      enabled: true,
      severity: 'low'
    },
    priority: {
      name: 'Priority',
      description: 'Issue should have a priority label',
      enabled: true,
      severity: 'medium'
    },
    stale: {
      name: 'Stale Issue',
      description: 'Issue has been open too long',
      enabled: true,
      severity: 'low'
    }
  }
}

/**
 * Load criteria configuration from localStorage
 * Returns default config if none exists
 */
export function loadCriteriaConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return DEFAULT_CONFIG
    }

    const config = JSON.parse(stored)

    // Merge with defaults to ensure all fields exist
    return {
      staleThresholds: {
        ...DEFAULT_CONFIG.staleThresholds,
        ...(config.staleThresholds || {})
      },
      criteria: {
        ...DEFAULT_CONFIG.criteria,
        ...(config.criteria || {})
      }
    }
  } catch (error) {
    console.error('Error loading criteria config:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * Save criteria configuration to localStorage
 */
export function saveCriteriaConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    return true
  } catch (error) {
    console.error('Error saving criteria config:', error)
    return false
  }
}

/**
 * Reset criteria configuration to defaults
 */
export function resetCriteriaConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Error resetting criteria config:', error)
    return false
  }
}

/**
 * Get enabled criteria as QUALITY_CRITERIA format for complianceService
 */
export function getEnabledCriteria() {
  const config = loadCriteriaConfig()
  const enabledCriteria = {}

  Object.entries(config.criteria).forEach(([key, criterion]) => {
    if (criterion.enabled) {
      enabledCriteria[key] = {
        name: criterion.name,
        description: criterion.description,
        severity: criterion.severity,
        threshold: criterion.threshold
      }
    }
  })

  return enabledCriteria
}

/**
 * Get stale thresholds from config
 */
export function getStaleThresholds() {
  const config = loadCriteriaConfig()
  return config.staleThresholds
}
