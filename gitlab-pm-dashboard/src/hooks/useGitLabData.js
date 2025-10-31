/**
 * Custom hook for fetching and managing GitLab data
 * Handles loading states, errors, and data caching
 * Supports both single-project and cross-project aggregation
 */

import { useState, useEffect, useCallback } from 'react'
import { fetchAllData } from '../services/gitlabApi'
import { loadConfig, isConfigured, getActiveProjectId, getAllProjects } from '../services/storageService'

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
    console.log('useGitLabData: Loading config from storage:', savedConfig)
    console.log('  groupPath value:', savedConfig.groupPath)
    console.log('  groupPath type:', typeof savedConfig.groupPath)
    console.log('  groupPath length:', savedConfig.groupPath?.length)
    setConfig(savedConfig)
  }, [])

  // Fetch data from GitLab (single project or cross-project aggregation)
  const fetchData = useCallback(async () => {
    const activeProjectId = getActiveProjectId()

    // Check if cross-project mode is active
    if (activeProjectId === 'cross-project') {
      console.log('useGitLabData: Cross-project mode detected')
      const allProjects = getAllProjects()

      if (allProjects.length === 0) {
        console.warn('useGitLabData: No projects configured for cross-project view')
        return
      }

      setLoading(true)
      setError(null)

      try {
        console.log(`useGitLabData: Fetching data from ${allProjects.length} projects...`)

        // Fetch data from all projects in parallel
        const projectDataPromises = allProjects.map(async (project) => {
          try {
            console.log(`  Fetching project: ${project.name}`)
            const projectConfig = {
              gitlabUrl: project.gitlabUrl,
              token: project.token,
              projectId: project.projectId,
              groupPath: project.groupPath,
              filter2025: loadConfig().filter2025 // Use global filter setting
            }
            const data = await fetchAllData(projectConfig)

            // Tag each item with its source project
            return {
              projectId: project.id,
              projectName: project.name,
              issues: data.issues.map(issue => ({ ...issue, _projectId: project.id, _projectName: project.name })),
              milestones: data.milestones.map(ms => ({ ...ms, _projectId: project.id, _projectName: project.name })),
              epics: data.epics.map(epic => ({ ...epic, _projectId: project.id, _projectName: project.name }))
            }
          } catch (err) {
            console.error(`  Failed to fetch project ${project.name}:`, err)
            return {
              projectId: project.id,
              projectName: project.name,
              issues: [],
              milestones: [],
              epics: [],
              error: err.message
            }
          }
        })

        const projectsData = await Promise.all(projectDataPromises)

        // Aggregate all data
        const aggregatedData = {
          issues: projectsData.flatMap(p => p.issues),
          milestones: projectsData.flatMap(p => p.milestones),
          epics: projectsData.flatMap(p => p.epics)
        }

        console.log(`useGitLabData: Cross-project aggregation complete:`)
        console.log(`  Total issues: ${aggregatedData.issues.length}`)
        console.log(`  Total milestones: ${aggregatedData.milestones.length}`)
        console.log(`  Total epics: ${aggregatedData.epics.length}`)

        // Log any project failures
        const failedProjects = projectsData.filter(p => p.error)
        if (failedProjects.length > 0) {
          console.warn(`  Failed projects: ${failedProjects.map(p => p.projectName).join(', ')}`)
        }

        setData(aggregatedData)
      } catch (err) {
        console.error('Cross-project data fetch failed:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    } else {
      // Single project mode
      if (!config || !isConfigured()) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchAllData(config)
        setData(result)
      } catch (err) {
        console.error('GitLab data fetch failed:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }, [config])

  // Auto-fetch on config change or when entering cross-project mode
  useEffect(() => {
    const activeProjectId = getActiveProjectId()

    // Fetch if in cross-project mode OR if single project is configured
    if (activeProjectId === 'cross-project' || (config && isConfigured())) {
      fetchData()
    }
  }, [config, fetchData])

  // Refresh function for manual reloading
  const refresh = useCallback(() => {
    // Reload config from storage before fetching (important for portfolio switching)
    const freshConfig = loadConfig()
    console.log('useGitLabData: Refreshing with fresh config:', freshConfig)
    console.log('  Fresh groupPath:', freshConfig.groupPath)
    setConfig(freshConfig)
    // fetchData will be called automatically via the useEffect when config changes
  }, [])

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
