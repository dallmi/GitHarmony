/**
 * Enhanced Cycle Time Service
 * Uses GitLab Premium/Ultimate label events API for accurate cycle time tracking
 */

import { fetchIssueLabelHistory } from './gitlabApi.js'
import { DEFAULT_PHASE_PATTERNS } from './cycleTimeService.js'

/**
 * Calculate accurate cycle time using label event history
 * Tracks when issue moved from backlog to active work (in progress, analysis, etc.)
 *
 * @param {Object} issue - GitLab issue object
 * @param {Array} labelEvents - Label event history from GitLab API
 * @returns {Object} { cycleTime, workStartedAt, workEndedAt, timeline }
 */
export function calculateAccurateCycleTime(issue, labelEvents) {
  if (!issue.closed_at || !labelEvents || labelEvents.length === 0) {
    return {
      cycleTime: null,
      workStartedAt: null,
      workEndedAt: new Date(issue.closed_at || Date.now()),
      timeline: [],
      method: 'none'
    }
  }

  // Sort events by created_at (chronological order)
  const sortedEvents = [...labelEvents].sort((a, b) =>
    new Date(a.created_at) - new Date(b.created_at)
  )

  // Build timeline of label changes
  const timeline = []
  let currentLabels = new Set()

  // Start with issue creation
  if (issue.labels) {
    issue.labels.forEach(label => currentLabels.add(label.toLowerCase()))
  }

  // Process each label event
  sortedEvents.forEach(event => {
    const labelLower = event.label.name.toLowerCase()

    if (event.action === 'add') {
      currentLabels.add(labelLower)
      timeline.push({
        timestamp: new Date(event.created_at),
        action: 'add',
        label: event.label.name,
        labelLower,
        labels: Array.from(currentLabels)
      })
    } else if (event.action === 'remove') {
      currentLabels.delete(labelLower)
      timeline.push({
        timestamp: new Date(event.created_at),
        action: 'remove',
        label: event.label.name,
        labelLower,
        labels: Array.from(currentLabels)
      })
    }
  })

  // Find when work actually started (moved from backlog to active work)
  const workStartLabels = [
    ...DEFAULT_PHASE_PATTERNS.analysis,
    ...DEFAULT_PHASE_PATTERNS.inProgress,
    ...DEFAULT_PHASE_PATTERNS.review,
    ...DEFAULT_PHASE_PATTERNS.testing
  ]

  let workStartedAt = null

  // Find first time an "active work" label was added
  for (const event of timeline) {
    if (event.action === 'add') {
      const isWorkLabel = workStartLabels.some(pattern =>
        event.labelLower.includes(pattern)
      )

      if (isWorkLabel) {
        workStartedAt = event.timestamp
        break
      }
    }
  }

  // If no work start found in events, fall back to created_at
  if (!workStartedAt) {
    workStartedAt = new Date(issue.created_at)
  }

  const workEndedAt = new Date(issue.closed_at)
  const cycleTimeMs = workEndedAt - workStartedAt
  const cycleTimeDays = Math.ceil(cycleTimeMs / (1000 * 60 * 60 * 24))

  return {
    cycleTime: cycleTimeDays,
    workStartedAt,
    workEndedAt,
    timeline,
    method: 'label_events'
  }
}

/**
 * Batch fetch label events for multiple issues
 *
 * @param {Array} issues - Array of GitLab issues
 * @param {Object} config - { gitlabUrl, projectId, token }
 * @param {Function} onProgress - Optional callback (current, total)
 * @returns {Map} Map of issue IID to label events
 */
export async function fetchBatchLabelEvents(issues, config, onProgress = null) {
  const { gitlabUrl, projectId, token } = config
  const labelEventsMap = new Map()

  // Only fetch for closed issues
  const closedIssues = issues.filter(i => i.state === 'closed')

  console.log(`Fetching label events for ${closedIssues.length} closed issues...`)

  // Batch requests to avoid overwhelming the API
  const batchSize = 10
  let processed = 0

  for (let i = 0; i < closedIssues.length; i += batchSize) {
    const batch = closedIssues.slice(i, i + batchSize)

    const results = await Promise.all(
      batch.map(async (issue) => {
        try {
          const events = await fetchIssueLabelHistory(gitlabUrl, projectId, issue.iid, token)
          return { iid: issue.iid, events }
        } catch (error) {
          console.warn(`Failed to fetch label events for issue #${issue.iid}:`, error)
          return { iid: issue.iid, events: null }
        }
      })
    )

    results.forEach(({ iid, events }) => {
      if (events) {
        labelEventsMap.set(iid, events)
      }
    })

    processed += batch.length
    if (onProgress) {
      onProgress(processed, closedIssues.length)
    }
  }

  console.log(`✓ Fetched label events for ${labelEventsMap.size} issues`)
  return labelEventsMap
}

/**
 * Get enhanced cycle time statistics using label event history
 *
 * @param {Array} issues - Array of GitLab issues
 * @param {Map} labelEventsMap - Map of issue IID to label events
 * @returns {Object} Enhanced cycle time statistics
 */
export function getEnhancedCycleTimeStats(issues, labelEventsMap) {
  const closedIssues = issues.filter(i => i.state === 'closed')

  if (closedIssues.length === 0) {
    return {
      count: 0,
      avgCycleTime: 0,
      medianCycleTime: 0,
      minCycleTime: 0,
      maxCycleTime: 0,
      cycleTimes: [],
      accurateCount: 0,
      estimatedCount: 0,
      method: 'none'
    }
  }

  // Calculate cycle times with label event data
  const cycleTimeData = closedIssues.map(issue => {
    const labelEvents = labelEventsMap.get(issue.iid)
    const result = calculateAccurateCycleTime(issue, labelEvents)

    return {
      issue,
      cycleTime: result.cycleTime,
      workStartedAt: result.workStartedAt,
      workEndedAt: result.workEndedAt,
      method: result.method
    }
  }).filter(d => d.cycleTime !== null)

  if (cycleTimeData.length === 0) {
    return {
      count: 0,
      avgCycleTime: 0,
      medianCycleTime: 0,
      minCycleTime: 0,
      maxCycleTime: 0,
      cycleTimes: [],
      accurateCount: 0,
      estimatedCount: 0,
      method: 'none'
    }
  }

  // Sort cycle times
  const cycleTimes = cycleTimeData.map(d => d.cycleTime).sort((a, b) => a - b)

  // Calculate statistics
  const avgCycleTime = Math.round(cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length)

  let medianCycleTime
  if (cycleTimes.length % 2 === 0) {
    const mid1 = cycleTimes[cycleTimes.length / 2 - 1]
    const mid2 = cycleTimes[cycleTimes.length / 2]
    medianCycleTime = Math.round((mid1 + mid2) / 2)
  } else {
    medianCycleTime = cycleTimes[Math.floor(cycleTimes.length / 2)]
  }

  const minCycleTime = cycleTimes[0]
  const maxCycleTime = cycleTimes[cycleTimes.length - 1]

  // Count accurate vs estimated
  const accurateCount = cycleTimeData.filter(d => d.method === 'label_events').length
  const estimatedCount = cycleTimeData.filter(d => d.method !== 'label_events').length

  // Calculate lead times for comparison
  const leadTimes = closedIssues.map(issue => {
    const created = new Date(issue.created_at)
    const closed = new Date(issue.closed_at)
    const diffMs = closed - created
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }).sort((a, b) => a - b)

  const avgLeadTime = Math.round(leadTimes.reduce((sum, t) => sum + t, 0) / leadTimes.length)

  let medianLeadTime
  if (leadTimes.length % 2 === 0) {
    const mid1 = leadTimes[leadTimes.length / 2 - 1]
    const mid2 = leadTimes[leadTimes.length / 2]
    medianLeadTime = Math.round((mid1 + mid2) / 2)
  } else {
    medianLeadTime = leadTimes[Math.floor(leadTimes.length / 2)]
  }

  return {
    count: closedIssues.length,
    avgCycleTime,
    medianCycleTime,
    minCycleTime,
    maxCycleTime,
    cycleTimes,
    avgLeadTime,
    medianLeadTime,
    leadTimes,
    avgWaitTime: Math.max(0, avgLeadTime - avgCycleTime),
    accurateCount,
    estimatedCount,
    method: accurateCount > 0 ? 'label_events' : 'estimated',
    dataQuality: accurateCount > 0 ? `${Math.round((accurateCount / cycleTimeData.length) * 100)}% accurate` : 'estimated'
  }
}

/**
 * Cache for label events to avoid repeated API calls
 */
let labelEventsCache = null
let cacheTimestamp = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get or fetch label events with caching
 */
export async function getOrFetchLabelEvents(issues, config, onProgress = null) {
  const now = Date.now()

  // Return cached data if still valid
  if (labelEventsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('Using cached label events')
    return labelEventsCache
  }

  // Fetch fresh data
  labelEventsCache = await fetchBatchLabelEvents(issues, config, onProgress)
  cacheTimestamp = now

  return labelEventsCache
}

/**
 * Clear the label events cache (call when data is refreshed)
 */
export function clearLabelEventsCache() {
  labelEventsCache = null
  cacheTimestamp = null
}
