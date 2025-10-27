/**
 * Custom hook for calculating health scores
 * Works with both project-level and epic-level data
 */

import { useMemo } from 'react'
import { calculateHealthScore, calculateStats } from '../services/metricsService'

export default function useHealthScore(issues, milestones = []) {
  const stats = useMemo(() => {
    if (!issues || issues.length === 0) {
      return null
    }

    return calculateStats(issues, milestones)
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
