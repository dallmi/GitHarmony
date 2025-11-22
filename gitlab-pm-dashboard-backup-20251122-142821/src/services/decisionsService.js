/**
 * Decisions Log Service
 * Tracks strategic decisions, ADRs (Architecture Decision Records), and key project choices
 * Helps executives understand what decisions were made, when, and why
 */

import { getActiveProjectId } from './storageService'

const STORAGE_KEY = 'gitlab-pm-decisions'

/**
 * Get project-specific key for localStorage
 */
function getProjectKey(baseKey) {
  const projectId = getActiveProjectId()
  if (!projectId || projectId === 'cross-project') {
    return baseKey
  }
  return `${baseKey}_${projectId}`
}

/**
 * Load all decisions from storage (project-specific)
 */
export function loadDecisions() {
  try {
    const stored = localStorage.getItem(getProjectKey(STORAGE_KEY))
    if (stored) {
      const data = JSON.parse(stored)
      // Convert date strings back to Date objects
      if (data.decisions) {
        data.decisions = data.decisions.map(decision => ({
          ...decision,
          date: new Date(decision.date),
          lastUpdated: decision.lastUpdated ? new Date(decision.lastUpdated) : null
        }))
      }
      return data
    }
  } catch (error) {
    console.error('Error loading decisions:', error)
  }

  return {
    decisions: [],
    lastModified: new Date().toISOString()
  }
}

/**
 * Save decisions to storage (project-specific)
 */
export function saveDecisions(decisionsData) {
  try {
    const toSave = {
      ...decisionsData,
      lastModified: new Date().toISOString()
    }
    localStorage.setItem(getProjectKey(STORAGE_KEY), JSON.stringify(toSave))
    return true
  } catch (error) {
    console.error('Error saving decisions:', error)
    return false
  }
}

/**
 * Add a new decision
 */
export function addDecision(title, description, category, impact, stakeholders = []) {
  const data = loadDecisions()

  const decision = {
    id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    description,
    category, // 'technical', 'business', 'process', 'resource', 'strategic'
    impact, // 'low', 'medium', 'high', 'critical'
    stakeholders,
    date: new Date(),
    lastUpdated: null,
    status: 'active', // 'active', 'implemented', 'superseded', 'cancelled'
    createdAt: new Date().toISOString()
  }

  data.decisions.push(decision)
  saveDecisions(data)

  return decision
}

/**
 * Update an existing decision
 */
export function updateDecision(decisionId, updates) {
  const data = loadDecisions()
  const index = data.decisions.findIndex(d => d.id === decisionId)

  if (index === -1) {
    return null
  }

  data.decisions[index] = {
    ...data.decisions[index],
    ...updates,
    lastUpdated: new Date()
  }

  saveDecisions(data)
  return data.decisions[index]
}

/**
 * Remove a decision by ID
 */
export function removeDecision(decisionId) {
  const data = loadDecisions()
  data.decisions = data.decisions.filter(d => d.id !== decisionId)
  saveDecisions(data)
}

/**
 * Get recent decisions (last N days)
 */
export function getRecentDecisions(days = 30) {
  const data = loadDecisions()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  return data.decisions
    .filter(d => d.date >= cutoffDate)
    .sort((a, b) => b.date - a.date)
}

/**
 * Get decisions by category
 */
export function getDecisionsByCategory(category) {
  const data = loadDecisions()
  return data.decisions
    .filter(d => d.category === category)
    .sort((a, b) => b.date - a.date)
}

/**
 * Get decisions by impact level
 */
export function getDecisionsByImpact(impact) {
  const data = loadDecisions()
  return data.decisions
    .filter(d => d.impact === impact)
    .sort((a, b) => b.date - a.date)
}

/**
 * Get decisions statistics
 */
export function getDecisionsStats() {
  const data = loadDecisions()

  const stats = {
    total: data.decisions.length,
    byCategory: {
      technical: 0,
      business: 0,
      process: 0,
      resource: 0,
      strategic: 0
    },
    byImpact: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    byStatus: {
      active: 0,
      implemented: 0,
      superseded: 0,
      cancelled: 0
    },
    recent30Days: 0
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  data.decisions.forEach(decision => {
    // Count by category
    if (decision.category && stats.byCategory.hasOwnProperty(decision.category)) {
      stats.byCategory[decision.category]++
    }

    // Count by impact
    if (decision.impact && stats.byImpact.hasOwnProperty(decision.impact)) {
      stats.byImpact[decision.impact]++
    }

    // Count by status
    if (decision.status && stats.byStatus.hasOwnProperty(decision.status)) {
      stats.byStatus[decision.status]++
    }

    // Count recent decisions
    if (decision.date >= thirtyDaysAgo) {
      stats.recent30Days++
    }
  })

  return stats
}

/**
 * Export decisions to CSV
 */
export function exportDecisionsToCSV(startDate = null, endDate = null) {
  const data = loadDecisions()
  let decisions = data.decisions

  if (startDate || endDate) {
    decisions = decisions.filter(decision => {
      if (startDate && decision.date < startDate) return false
      if (endDate && decision.date > endDate) return false
      return true
    })
  }

  const header = 'Date,Title,Category,Impact,Status,Stakeholders,Description\n'
  const rows = decisions.map(d => {
    const date = d.date.toISOString().split('T')[0]
    const stakeholders = (d.stakeholders || []).join('; ')
    const description = `"${(d.description || '').replace(/"/g, '""')}"`
    return `${date},"${d.title}",${d.category},${d.impact},${d.status},"${stakeholders}",${description}`
  }).join('\n')

  return header + rows
}
