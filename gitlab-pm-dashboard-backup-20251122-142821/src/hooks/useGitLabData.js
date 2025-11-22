/**
 * Custom hook for fetching and managing GitLab data
 * Handles loading states, errors, and data caching
 * Supports both single-project and cross-project aggregation
 */

import { useState, useEffect, useCallback } from 'react'
import { fetchAllData } from '../services/gitlabApi'
import { loadConfig, isConfigured, getActiveProjectId, getAllProjects, getActiveGroupId, getActiveGroup } from '../services/storageService'
import { getProjectGroup, getProjectsForGroup } from '../services/projectGroupService'

export default function useGitLabData() {
  const [data, setData] = useState({
    issues: [],
    milestones: [],
    epics: [],
    crossProjectData: null
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

  // Fetch data from GitLab (single project, project group, or cross-project aggregation)
  const fetchData = useCallback(async () => {
    const activeProjectId = getActiveProjectId()
    const activeGroupId = getActiveGroupId()

    // Check if POD mode is active (GitLab Group/Pod)
    if (activeGroupId) {
      console.log('useGitLabData: Pod mode detected, activeGroupId:', activeGroupId)
      const activePod = getActiveGroup()

      if (!activePod) {
        console.warn('useGitLabData: Pod not found:', activeGroupId)
        return
      }

      setLoading(true)
      setError(null)

      try {
        console.log(`useGitLabData: Fetching data for pod "${activePod.name}"...`)
        console.log('  Pod config:', activePod)

        const mainConfig = loadConfig()
        const podConfig = {
          gitlabUrl: activePod.gitlabUrl,
          token: mainConfig.token, // Use centralized token
          groupPath: activePod.groupPath,
          mode: 'group',
          filter2025: mainConfig.filter2025
        }

        const result = await fetchAllData(podConfig)

        console.log(`useGitLabData: Pod data fetch complete:`)
        console.log(`  Pod: ${activePod.name}`)
        console.log(`  Total issues: ${result.issues.length}`)
        console.log(`  Total milestones: ${result.milestones.length}`)
        console.log(`  Total epics: ${result.epics.length}`)

        setData(result)
      } catch (err) {
        console.error('Pod data fetch failed:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
      return
    }

    // Check if project group mode is active
    if (activeProjectId?.startsWith('group:')) {
      console.log('useGitLabData: Project group mode detected')
      const groupId = activeProjectId.replace('group:', '')
      const group = getProjectGroup(groupId)

      if (!group) {
        console.warn('useGitLabData: Project group not found:', groupId)
        return
      }

      const allProjects = getAllProjects()
      const groupProjects = getProjectsForGroup(groupId, allProjects)

      if (groupProjects.length === 0) {
        console.warn('useGitLabData: No projects in group:', group.name)
        return
      }

      setLoading(true)
      setError(null)

      try {
        console.log(`useGitLabData: Fetching data for project group "${group.name}" (${groupProjects.length} projects)...`)

        // Fetch data from all projects in the group
        const mainConfig = loadConfig()
        const projectDataPromises = groupProjects.map(async (project) => {
          try {
            console.log(`  Fetching project: ${project.name}`)
            const projectConfig = {
              gitlabUrl: project.gitlabUrl,
              token: mainConfig.token, // Use centralized token
              projectId: project.projectId,
              groupPath: project.groupPath,
              groupPaths: project.groupPaths, // Support multiple group paths per project
              filter2025: loadConfig().filter2025
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

        // If the group has shared group paths, fetch additional epics
        let sharedEpics = []
        if (group.sharedGroupPaths && group.sharedGroupPaths.length > 0) {
          console.log(`  Fetching epics from ${group.sharedGroupPaths.length} shared group paths...`)

          // Use the first project's config as base for shared group fetches
          const baseProject = groupProjects[0]
          const sharedEpicPromises = group.sharedGroupPaths.map(async (groupPath) => {
            try {
              console.log(`    Fetching shared group: ${groupPath}`)
              const sharedConfig = {
                gitlabUrl: baseProject.gitlabUrl,
                token: baseProject.token,
                projectId: baseProject.projectId, // Still need a project for base URL
                groupPaths: [groupPath],
                filter2025: loadConfig().filter2025
              }
              const data = await fetchAllData(sharedConfig)
              return data.epics.map(epic => ({ ...epic, _sharedSource: groupPath }))
            } catch (err) {
              console.error(`    Failed to fetch shared group ${groupPath}:`, err)
              return []
            }
          })

          const sharedEpicsResults = await Promise.all(sharedEpicPromises)
          sharedEpics = sharedEpicsResults.flat()
          console.log(`  Found ${sharedEpics.length} epics from shared groups`)
        }

        // Import cross-project linking functions
        const { linkCrossProjectIssues, buildEpicHierarchy } = await import('../services/crossProjectLinkingService.js')

        // Aggregate all data
        const allIssues = projectsData.flatMap(p => p.issues)
        const allEpics = [...projectsData.flatMap(p => p.epics), ...sharedEpics]
        const allMilestones = projectsData.flatMap(p => p.milestones)

        // Deduplicate epics (in case of overlap between project groups and shared groups)
        const uniqueEpicsMap = new Map()
        allEpics.forEach(epic => {
          if (!uniqueEpicsMap.has(epic.id)) {
            uniqueEpicsMap.set(epic.id, epic)
          }
        })
        const uniqueEpics = Array.from(uniqueEpicsMap.values())

        // Build cross-project relationships
        const crossProjectData = linkCrossProjectIssues(allIssues, uniqueEpics)
        const epicHierarchy = buildEpicHierarchy(uniqueEpics)

        // Mark as project group mode
        crossProjectData.singleProjectMode = false
        crossProjectData.limitedView = false
        crossProjectData.projectGroupMode = true
        crossProjectData.projectGroupName = group.name
        crossProjectData.projectCount = groupProjects.length

        const aggregatedData = {
          issues: allIssues,
          milestones: allMilestones,
          epics: uniqueEpics,
          crossProjectData: {
            ...crossProjectData,
            epicHierarchy
          }
        }

        console.log(`useGitLabData: Project group aggregation complete:`)
        console.log(`  Group: ${group.name}`)
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
        console.error('Project group data fetch failed:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    // Check if cross-project mode is active
    else if (activeProjectId === 'cross-project') {
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
        const mainConfig = loadConfig()
        const projectDataPromises = allProjects.map(async (project) => {
          try {
            console.log(`  Fetching project: ${project.name}`)
            const projectConfig = {
              gitlabUrl: project.gitlabUrl,
              token: mainConfig.token, // Use centralized token
              projectId: project.projectId,
              groupPath: project.groupPath,
              groupPaths: project.groupPaths, // Support multiple group paths
              filter2025: mainConfig.filter2025 // Use global filter setting
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

        // Import cross-project linking functions
        const { linkCrossProjectIssues, buildEpicHierarchy } = await import('../services/crossProjectLinkingService.js')

        // Aggregate all data
        const allIssues = projectsData.flatMap(p => p.issues)
        const allEpics = projectsData.flatMap(p => p.epics)
        const allMilestones = projectsData.flatMap(p => p.milestones)

        // Build cross-project relationships
        const crossProjectData = linkCrossProjectIssues(allIssues, allEpics)
        const epicHierarchy = buildEpicHierarchy(allEpics)

        // Mark as full cross-project mode (all projects loaded)
        crossProjectData.singleProjectMode = false
        crossProjectData.limitedView = false
        crossProjectData.projectCount = allProjects.length

        const aggregatedData = {
          issues: allIssues,
          milestones: allMilestones,
          epics: allEpics,
          crossProjectData: {
            ...crossProjectData,
            epicHierarchy
          }
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

  // Auto-fetch on config change or when entering cross-project/group/pod mode
  useEffect(() => {
    console.log('🔄 useGitLabData: useEffect triggered (config changed)')
    console.log('  Current config:', config)

    const activeProjectId = getActiveProjectId()
    const activeGroupId = getActiveGroupId()
    const configured = isConfigured()

    console.log('  activeProjectId:', activeProjectId)
    console.log('  activeGroupId:', activeGroupId)
    console.log('  isConfigured():', configured)

    // Fetch if in pod mode OR cross-project mode OR project group mode OR if single project is configured
    if (activeGroupId || activeProjectId === 'cross-project' || activeProjectId?.startsWith('group:') || (config && configured)) {
      console.log('✅ Conditions met, calling fetchData()')
      fetchData()
    } else {
      console.log('❌ Conditions NOT met, skipping fetchData()')
      console.log('  Reasons:')
      console.log('    - activeGroupId:', !!activeGroupId)
      console.log('    - cross-project mode:', activeProjectId === 'cross-project')
      console.log('    - group mode:', activeProjectId?.startsWith('group:'))
      console.log('    - config exists:', !!config)
      console.log('    - isConfigured:', configured)
    }
  }, [config, fetchData])

  // Refresh function for manual reloading
  const refresh = useCallback(() => {
    console.log('🔄 REFRESH CALLED')
    console.log('  Current config state:', config)

    // Reload config from storage before fetching (important for portfolio switching)
    const freshConfig = loadConfig()
    console.log('  Fresh config from localStorage:', freshConfig)
    console.log('  Fresh groupPath:', freshConfig.groupPath)
    console.log('  Fresh projectId:', freshConfig.projectId)
    console.log('  Fresh token exists:', !!freshConfig.token)

    setConfig(freshConfig)
    console.log('  Config state updated, useEffect should trigger...')
    // fetchData will be called automatically via the useEffect when config changes
  }, [])

  return {
    issues: data.issues,
    milestones: data.milestones,
    epics: data.epics,
    crossProjectData: data.crossProjectData,
    loading,
    error,
    refresh,
    isConfigured: isConfigured()
  }
}
