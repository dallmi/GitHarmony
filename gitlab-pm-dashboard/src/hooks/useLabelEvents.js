import { useState, useEffect } from 'react'
import { loadConfig } from '../services/storageService'
import { getOrFetchLabelEvents, clearLabelEventsCache } from '../services/enhancedCycleTimeService'

/**
 * Hook to fetch and manage label events for accurate cycle time tracking
 * Only fetches if GitLab Premium/Ultimate is available
 */
export default function useLabelEvents(issues) {
  const [labelEventsMap, setLabelEventsMap] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!issues || issues.length === 0) {
      return
    }

    const fetchLabelEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        const config = loadConfig()
        if (!config) {
          console.log('No config available, skipping label events fetch')
          return
        }

        // Only fetch for closed issues
        const closedIssuesCount = issues.filter(i => i.state === 'closed').length
        if (closedIssuesCount === 0) {
          console.log('No closed issues, skipping label events fetch')
          return
        }

        console.log(`Fetching label events for ${closedIssuesCount} closed issues...`)

        const eventsMap = await getOrFetchLabelEvents(
          issues,
          {
            gitlabUrl: config.gitlabUrl,
            projectId: config.projectId,
            token: config.token
          },
          (current, total) => {
            setProgress({ current, total })
          }
        )

        setLabelEventsMap(eventsMap)
        console.log(`✓ Label events loaded: ${eventsMap.size} issues`)
      } catch (err) {
        console.error('Failed to fetch label events:', err)
        setError(err.message)
        // Don't fail completely - fall back to estimated cycle times
      } finally {
        setLoading(false)
      }
    }

    fetchLabelEvents()

    // Cleanup function to clear cache when component unmounts
    return () => {
      // Keep cache for 5 minutes (handled by service)
    }
  }, [issues])

  const refresh = () => {
    clearLabelEventsCache()
    setLabelEventsMap(null)
    setProgress({ current: 0, total: 0 })
  }

  return {
    labelEventsMap,
    loading,
    progress,
    error,
    refresh,
    hasData: labelEventsMap !== null && labelEventsMap.size > 0
  }
}
