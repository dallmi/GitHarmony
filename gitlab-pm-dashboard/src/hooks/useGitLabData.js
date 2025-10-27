/**
 * Custom hook for fetching and managing GitLab data
 * Handles loading states, errors, and data caching
 */

import { useState, useEffect, useCallback } from 'react'
import { fetchAllData } from '../services/gitlabApi'
import { loadConfig, isConfigured } from '../services/storageService'

export default function useGitLabData() {
  const [data, setData] = useState({
    issues: [],
    milestones: [],
    epics: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [config, setConfig] = useState(null)

  // Load configuration
  useEffect(() => {
    const savedConfig = loadConfig()
    setConfig(savedConfig)
  }, [])

  // Fetch data from GitLab
  const fetchData = useCallback(async () => {
    if (!config || !isConfigured()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchAllData(
        config.gitlabUrl,
        config.projectId,
        config.groupPath,
        config.token
      )

      setData(result)
    } catch (err) {
      console.error('GitLab data fetch failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config])

  // Auto-fetch on config change
  useEffect(() => {
    if (config && isConfigured()) {
      fetchData()
    }
  }, [config, fetchData])

  // Refresh function for manual reloading
  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    issues: data.issues,
    milestones: data.milestones,
    epics: data.epics,
    loading,
    error,
    refresh,
    isConfigured: isConfigured()
  }
}
