/**
 * Custom hook for calculating health scores
 * Works with both project-level and epic-level data
 * Now respects timeframe configuration from health score settings
 */

import { useMemo } from 'react'
import { calculateHealthScore, calculateStats } from '../services/metricsService'
import { HEALTH_SCORE_TIMEFRAME } from '../constants/config'

/**
 * Filter issues based on timeframe configuration
 */
function filterIssuesByTimeframe(issues, timeframeConfig) {
  if (!timeframeConfig || timeframeConfig.mode === 'all') {
    return issues
  }

  if (timeframeConfig.mode === 'days') {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - timeframeConfig.days)

    return issues.filter(issue => {
      // Include all open issues
      if (issue.state === 'opened') return true

      // For closed issues, only include if closed recently
      if (issue.closed_at) {
        const closedDate = new Date(issue.closed_at)
        return closedDate >= cutoffDate
      }

      // For issues without closed_at but marked closed, check updated_at
      if (issue.state === 'closed' && issue.updated_at) {
        const updatedDate = new Date(issue.updated_at)
        return updatedDate >= cutoffDate
      }

      return false
    })
  }

  // For 'iteration' mode, the filtering is handled by IterationFilterContext
  // so we just return all issues as-is
  return issues
}

export default function useHealthScore(issues, milestones = []) {
  const stats = useMemo(() => {
    if (!issues || issues.length === 0) {
      return null
    }

    // Load timeframe config
    const savedConfig = localStorage.getItem('healthScoreConfig')
    let timeframeConfig = HEALTH_SCORE_TIMEFRAME

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        timeframeConfig = parsed.timeframe || HEALTH_SCORE_TIMEFRAME
      } catch (e) {
        console.error('Failed to load health score timeframe config:', e)
      }
    }

    // Filter issues based on timeframe
    const filteredIssues = filterIssuesByTimeframe(issues, timeframeConfig)

    return calculateStats(filteredIssues, milestones)
  }, [issues, milestones])

  const healthScore = useMemo(() => {
    if (!stats) {
      return null
    }

    return calculateHealthScore(stats)
  }, [stats])

  return {
    stats,
    healthScore,
    hasData: stats !== null
  }
}
