/**
 * GitLab API Service
 * Handles all communication with GitLab REST API
 */

const isDev = import.meta.env.MODE === 'development'

/**
 * Validate and fetch project information
 * Helps diagnose 404 errors by checking if project exists and is accessible
 */
export async function validateProject(gitlabUrl, projectId, token) {
  const encodedProjectId = encodeURIComponent(projectId)
  const url = `${gitlabUrl}/api/v4/projects/${encodedProjectId}`

  if (isDev) {
    console.log('Validating project access...')
    console.log('  URL:', url)
  }

  const response = await fetch(url, {
    headers: { 'PRIVATE-TOKEN': token }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Project validation failed:', errorText)

    if (response.status === 404) {
      throw new Error(`Project not found: "${projectId}"\n\nPossible issues:\n- Project ID might be incorrect\n- Use either numeric ID (e.g., "12345") or full path (e.g., "namespace/project-name")\n- Check if the token has access to this project\n- Verify the GitLab URL is correct`)
    } else if (response.status === 401) {
      throw new Error(`Authentication failed: Invalid or expired access token`)
    } else {
      throw new Error(`Project validation error: ${response.status} - ${response.statusText}`)
    }
  }

  const project = await response.json()
  if (isDev) {
    console.log('✓ Project validated:', project.name)
    console.log('  Full path:', project.path_with_namespace)
    console.log('  Numeric ID:', project.id)
  }

  return project
}

/**
 * Fetch issues from a GitLab project with pagination
 */
export async function fetchIssues(gitlabUrl, projectId, token) {
  const encodedProjectId = encodeURIComponent(projectId)
  let allIssues = []
  let page = 1
  const perPage = 100

  if (isDev) {
    console.log('Fetching issues with pagination...')
    console.log('  GitLab URL:', gitlabUrl)
    console.log('  Project ID:', projectId)
    console.log('  Encoded Project ID:', encodedProjectId)
  }

  while (true) {
    const url = `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues?per_page=${perPage}&page=${page}&scope=all&with_iterations=true`
    if (isDev) {
      console.log('  API Request URL:', url)
    }

    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': token }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error Response:', errorText)
      throw new Error(`Issues API Error: ${response.status} - ${response.statusText}\nURL: ${url}\nProject ID: ${projectId}\nEncoded: ${encodedProjectId}\nResponse: ${errorText}`)
    }

    const issues = await response.json()

    if (issues.length === 0) {
      break // No more issues
    }

    allIssues = allIssues.concat(issues)
    if (isDev) {
      console.log(`  Fetched page ${page}: ${issues.length} issues (total: ${allIssues.length})`)
    }

    if (issues.length < perPage) {
      break // Last page (partial results)
    }

    page++
  }

  if (isDev) {
    console.log(`✓ Loaded ${allIssues.length} total issues from ${page} page(s)`)

    // Debug: Check iteration data on first few issues
    if (allIssues.length > 0) {
      console.log('=== ITERATION DEBUG ===')
      const sampleSize = Math.min(3, allIssues.length)
      for (let i = 0; i < sampleSize; i++) {
        const issue = allIssues[i]
        console.log(`Issue #${issue.iid} (${issue.title}):`)
        console.log('  - iteration field:', issue.iteration)
        console.log('  - labels:', issue.labels)
      }

      // Count how many issues have iteration data
      const withIteration = allIssues.filter(i => i.iteration).length
      const withIterationLabels = allIssues.filter(i =>
        i.labels && i.labels.some(l => l.toLowerCase().startsWith('sprint') || l.toLowerCase().startsWith('iteration'))
      ).length
      console.log(`Summary: ${withIteration} issues with iteration field, ${withIterationLabels} with iteration/sprint labels`)
      console.log('======================')
    }
  }

  return allIssues
}

/**
 * Fetch milestones from a GitLab project with pagination
 */
export async function fetchMilestones(gitlabUrl, projectId, token) {
  const encodedProjectId = encodeURIComponent(projectId)
  let allMilestones = []
  let page = 1
  const perPage = 100

  if (isDev) {
    console.log('Fetching milestones with pagination...')
  }

  while (true) {
    const response = await fetch(
      `${gitlabUrl}/api/v4/projects/${encodedProjectId}/milestones?per_page=${perPage}&page=${page}`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )

    if (!response.ok) {
      throw new Error(`Milestones API Error: ${response.status}`)
    }

    const milestones = await response.json()

    if (milestones.length === 0) {
      break // No more milestones
    }

    allMilestones = allMilestones.concat(milestones)
    if (isDev) {
      console.log(`  Fetched page ${page}: ${milestones.length} milestones (total: ${allMilestones.length})`)
    }

    if (milestones.length < perPage) {
      break // Last page (partial results)
    }

    page++
  }

  if (isDev) {
    console.log(`✓ Loaded ${allMilestones.length} total milestones from ${page} page(s)`)
  }
  return allMilestones
}

/**
 * Update issue assignee
 * @param {string} gitlabUrl - GitLab instance URL
 * @param {string} projectId - Project ID or path
 * @param {number} issueIid - Issue IID
 * @param {number} assigneeId - New assignee's user ID
 * @param {string} token - GitLab API token
 * @returns {Promise<object>} Updated issue object
 */
export async function updateIssueAssignee(gitlabUrl, projectId, issueIid, assigneeId, token) {
  const encodedProjectId = encodeURIComponent(projectId)
  const url = `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues/${issueIid}`

  if (isDev) {
    console.log(`Updating issue #${issueIid} assignee to user ${assigneeId}`)
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      assignee_id: assigneeId
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to update issue assignee:', errorText)

    if (response.status === 404) {
      throw new Error(`Issue #${issueIid} not found in project ${projectId}`)
    } else if (response.status === 401) {
      throw new Error('Unauthorized: Invalid or expired access token')
    } else if (response.status === 403) {
      throw new Error('Forbidden: You do not have permission to update this issue')
    } else {
      throw new Error(`Failed to update assignee: ${response.status} - ${errorText}`)
    }
  }

  const updatedIssue = await response.json()
  if (isDev) {
    console.log(`✓ Successfully updated issue #${issueIid} assignee`)
  }
  return updatedIssue
}

/**
 * Batch update multiple issues with new assignee
 * @param {string} gitlabUrl - GitLab instance URL
 * @param {string} projectId - Project ID or path
 * @param {array} issues - Array of issues to update
 * @param {number} assigneeId - New assignee's user ID
 * @param {string} token - GitLab API token
 * @param {function} onProgress - Progress callback (optional)
 * @returns {Promise<object>} Results object with success/failed arrays
 */
export async function batchUpdateIssueAssignees(gitlabUrl, projectId, issues, assigneeId, token, onProgress = null) {
  const results = {
    successful: [],
    failed: []
  }

  if (isDev) {
    console.log(`Starting batch update for ${issues.length} issues`)
  }

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i]

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: issues.length,
        issue: issue
      })
    }

    try {
      const updated = await updateIssueAssignee(gitlabUrl, projectId, issue.iid, assigneeId, token)
      results.successful.push({
        issue: issue,
        updated: updated
      })
    } catch (error) {
      console.error(`Failed to update issue #${issue.iid}:`, error.message)
      results.failed.push({
        issue: issue,
        error: error.message
      })
    }

    // Add small delay to avoid rate limiting
    if (i < issues.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  if (isDev) {
    console.log(`Batch update completed: ${results.successful.length} successful, ${results.failed.length} failed`)
  }
  return results
}

/**
 * Fetch epics from a GitLab group (Premium/Ultimate only) with pagination
 */
export async function fetchEpics(gitlabUrl, groupPath, token) {
  if (!groupPath) {
    return [] // No group path configured
  }

  const encodedGroupPath = encodeURIComponent(groupPath)
  let allEpics = []
  let page = 1
  const perPage = 100

  if (isDev) {
    console.log('Fetching epics with pagination...')
    console.log('  GitLab URL:', gitlabUrl)
    console.log('  Group Path:', groupPath)
    console.log('  Encoded Group Path:', encodedGroupPath)
  }

  try {
    while (true) {
      const url = `${gitlabUrl}/api/v4/groups/${encodedGroupPath}/epics?per_page=${perPage}&page=${page}`
      if (isDev) {
        console.log('  Epic API Request URL:', url)
      }

      const response = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } })

      if (isDev) {
        console.log(`  Epic API Response Status: ${response.status}`)
      }

      if (response.status === 404) {
        console.warn('Epics not available (requires Premium/Ultimate)')
        return []
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Epic API Error Response:', errorText)
        throw new Error(`Epics API Error: ${response.status} - ${errorText}`)
      }

      const epics = await response.json()
      if (isDev) {
        console.log(`  Epics returned on page ${page}:`, epics.length)
      }

      if (epics.length === 0) {
        break // No more epics
      }

      allEpics = allEpics.concat(epics)
      if (isDev) {
        console.log(`  Fetched page ${page}: ${epics.length} epics (total: ${allEpics.length})`)
      }

      if (epics.length < perPage) {
        break // Last page (partial results)
      }

      page++
    }

    if (isDev) {
      console.log(`✓ Loaded ${allEpics.length} total epics from ${page} page(s)`)
    }
    return allEpics
  } catch (error) {
    console.error('Epic fetch failed:', error)
    return []
  }
}

/**
 * Fetch issues for a specific epic
 */
export async function fetchEpicIssues(gitlabUrl, groupPath, epicId, token) {
  const encodedGroupPath = encodeURIComponent(groupPath)

  const response = await fetch(
    `${gitlabUrl}/api/v4/groups/${encodedGroupPath}/epics/${epicId}/issues`,
    { headers: { 'PRIVATE-TOKEN': token } }
  )

  if (!response.ok) {
    throw new Error(`Epic Issues API Error: ${response.status}`)
  }

  return response.json()
}

/**
 * Check if Resource State Events API is available (Premium/Ultimate feature)
 */
export async function checkPremiumFeatures(gitlabUrl, projectId, token) {
  const encodedProjectId = encodeURIComponent(projectId)

  try {
    // Try to fetch resource state events for the project
    const response = await fetch(
      `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues?per_page=1`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )

    if (!response.ok) {
      return { hasLabelHistory: false, hasResourceEvents: false }
    }

    const issues = await response.json()
    if (issues.length === 0) {
      return { hasLabelHistory: false, hasResourceEvents: false }
    }

    // Try to fetch resource state events for first issue
    const testIssueIid = issues[0].iid
    const eventsResponse = await fetch(
      `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues/${testIssueIid}/resource_state_events`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )

    // Try to fetch resource label events (check both independently)
    const labelEventsResponse = await fetch(
      `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues/${testIssueIid}/resource_label_events`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )

    const hasLabelHistory = labelEventsResponse.ok
    const hasResourceEvents = eventsResponse.ok

    if (isDev) {
      console.log(`GitLab Premium Features for project ${projectId}:`, {
        hasLabelHistory,
        hasResourceEvents
      })
    }

    return { hasLabelHistory, hasResourceEvents, projectId }
  } catch (error) {
    console.error(`Premium feature check failed for project ${projectId}:`, error)
    return { hasLabelHistory: false, hasResourceEvents: false, projectId }
  }
}

/**
 * Check Premium features for multiple projects
 * Used in Pods/multi-project mode to determine which projects have Premium
 */
export async function checkPremiumFeaturesForProjects(gitlabUrl, projectIds, token) {
  const results = await Promise.all(
    projectIds.map(projectId => checkPremiumFeatures(gitlabUrl, projectId, token))
  )

  // Build a map of projectId -> features
  const featuresMap = {}
  results.forEach(result => {
    featuresMap[result.projectId] = {
      hasLabelHistory: result.hasLabelHistory,
      hasResourceEvents: result.hasResourceEvents
    }
  })

  // Determine overall status
  const anyPremium = results.some(r => r.hasLabelHistory || r.hasResourceEvents)
  const allPremium = results.every(r => r.hasLabelHistory && r.hasResourceEvents)
  const premiumCount = results.filter(r => r.hasLabelHistory || r.hasResourceEvents).length

  if (isDev) {
    console.log('Multi-project Premium check:', {
      totalProjects: projectIds.length,
      premiumCount,
      allPremium,
      anyPremium
    })
  }

  return {
    featuresMap,
    anyPremium,
    allPremium,
    premiumCount,
    totalProjects: projectIds.length
  }
}

/**
 * Fetch resource label events for an issue (Premium/Ultimate only)
 * Returns label add/remove history with timestamps
 */
export async function fetchIssueLabelHistory(gitlabUrl, projectId, issueIid, token) {
  const encodedProjectId = encodeURIComponent(projectId)

  try {
    const response = await fetch(
      `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues/${issueIid}/resource_label_events`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )

    if (!response.ok) {
      return null // Not available
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to fetch label history for issue ${issueIid}:`, error)
    return null
  }
}

/**
 * Fetch resource state events for an issue (Premium/Ultimate only)
 * Returns state change history (opened/closed) with timestamps
 */
export async function fetchIssueStateHistory(gitlabUrl, projectId, issueIid, token) {
  const encodedProjectId = encodeURIComponent(projectId)

  try {
    const response = await fetch(
      `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues/${issueIid}/resource_state_events`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )

    if (!response.ok) {
      return null // Not available
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to fetch state history for issue ${issueIid}:`, error)
    return null
  }
}

/**
 * Validate and fetch group information
 */
export async function validateGroup(gitlabUrl, groupPath, token) {
  const encodedGroupPath = encodeURIComponent(groupPath)
  const url = `${gitlabUrl}/api/v4/groups/${encodedGroupPath}`

  if (isDev) {
    console.log('Validating group access...')
    console.log('  URL:', url)
  }

  const response = await fetch(url, {
    headers: { 'PRIVATE-TOKEN': token }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Group validation failed:', errorText)

    if (response.status === 404) {
      throw new Error(`Group not found: "${groupPath}"\n\nPossible issues:\n- Group ID/path might be incorrect\n- Use either numeric ID (e.g., "12345") or full path (e.g., "my-group" or "parent/child-group")\n- Check if the token has access to this group\n- Verify the GitLab URL is correct`)
    } else if (response.status === 401) {
      throw new Error(`Authentication failed: Invalid or expired access token`)
    } else {
      throw new Error(`Group validation error: ${response.status} - ${response.statusText}`)
    }
  }

  const group = await response.json()
  if (isDev) {
    console.log('✓ Group validated:', group.name)
    console.log('  Full path:', group.full_path)
    console.log('  Numeric ID:', group.id)
  }

  return group
}

/**
 * Fetch all projects under a group (including subgroups recursively)
 */
export async function fetchGroupProjects(gitlabUrl, groupPath, token) {
  const encodedGroupPath = encodeURIComponent(groupPath)
  let allProjects = []
  let page = 1
  const perPage = 100

  if (isDev) {
    console.log('Fetching all projects in group (including subgroups)...')
    console.log('  Group Path:', groupPath)
  }

  while (true) {
    // include_subgroups=true fetches all projects from subgroups recursively
    const url = `${gitlabUrl}/api/v4/groups/${encodedGroupPath}/projects?per_page=${perPage}&page=${page}&include_subgroups=true&archived=false`

    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': token }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Group Projects API Error:', errorText)
      throw new Error(`Group Projects API Error: ${response.status} - ${errorText}`)
    }

    const projects = await response.json()

    if (projects.length === 0) {
      break
    }

    allProjects = allProjects.concat(projects)
    if (isDev) {
      console.log(`  Fetched page ${page}: ${projects.length} projects (total: ${allProjects.length})`)
    }

    if (projects.length < perPage) {
      break
    }

    page++
  }

  if (isDev) {
    console.log(`✓ Found ${allProjects.length} projects in group "${groupPath}"`)

    // Log project summary
    if (allProjects.length > 0) {
      console.log('  Projects:')
      allProjects.forEach(p => {
        console.log(`    - ${p.path_with_namespace} (ID: ${p.id})`)
      })
    }
  }

  return allProjects
}

/**
 * Fetch issues from multiple projects in parallel
 */
export async function fetchIssuesFromProjects(gitlabUrl, projects, token, onProgress = null) {
  if (isDev) {
    console.log(`Fetching issues from ${projects.length} projects...`)
  }

  const batchSize = 5 // Process 5 projects at a time to avoid overwhelming the API
  let allIssues = []
  let processed = 0

  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (project) => {
        try {
          const issues = await fetchIssues(gitlabUrl, project.id, token)
          return { projectId: project.id, projectPath: project.path_with_namespace, issues }
        } catch (error) {
          console.warn(`Failed to fetch issues from project ${project.path_with_namespace}:`, error)
          return { projectId: project.id, projectPath: project.path_with_namespace, issues: [] }
        }
      })
    )

    batchResults.forEach(({ projectPath, issues }) => {
      if (isDev && issues.length > 0) {
        console.log(`  ✓ ${projectPath}: ${issues.length} issues`)
      }
      allIssues = allIssues.concat(issues)
    })

    processed += batch.length
    if (onProgress) {
      onProgress(processed, projects.length)
    }
  }

  if (isDev) {
    console.log(`✓ Loaded ${allIssues.length} total issues from ${projects.length} projects`)
  }
  return allIssues
}

/**
 * Fetch milestones from multiple projects in parallel
 */
export async function fetchMilestonesFromProjects(gitlabUrl, projects, token) {
  if (isDev) {
    console.log(`Fetching milestones from ${projects.length} projects...`)
  }

  const batchSize = 5
  let allMilestones = []

  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (project) => {
        try {
          const milestones = await fetchMilestones(gitlabUrl, project.id, token)
          return { projectPath: project.path_with_namespace, milestones }
        } catch (error) {
          console.warn(`Failed to fetch milestones from project ${project.path_with_namespace}:`, error)
          return { projectPath: project.path_with_namespace, milestones: [] }
        }
      })
    )

    batchResults.forEach(({ milestones }) => {
      allMilestones = allMilestones.concat(milestones)
    })
  }

  // Remove duplicate milestones (same title and dates)
  const uniqueMilestones = Array.from(
    new Map(allMilestones.map(m => [m.id, m])).values()
  )

  if (isDev) {
    console.log(`✓ Loaded ${uniqueMilestones.length} unique milestones from ${projects.length} projects`)
  }
  return uniqueMilestones
}

/**
 * Filter data to only include items from 2025 onwards
 */
function filterByYear2025(data, dateFields) {
  const year2025Start = new Date('2025-01-01').getTime()

  return data.filter(item => {
    // Check if any of the date fields is >= 2025
    return dateFields.some(field => {
      const dateValue = item[field]
      if (!dateValue) return false

      const itemDate = new Date(dateValue).getTime()
      return itemDate >= year2025Start
    })
  })
}

/**
 * Fetch all data needed for the dashboard
 */
export async function fetchAllData(config) {
  const { gitlabUrl, projectId, groupPath, groupPaths, token, filter2025, mode } = config

  if (isDev) {
    console.log('=== Starting GitLab Data Fetch ===')
    console.log('Full config object:', config)
    console.log('Mode:', mode || 'project (default)')
  }

  let allIssues, allMilestones, projects = []
  const isSingleProjectMode = mode !== 'group'

  // GROUP MODE: Fetch all projects from group, then fetch all issues
  if (mode === 'group') {
    if (!groupPath && (!groupPaths || groupPaths.length === 0)) {
      throw new Error('Group mode requires groupPath or groupPaths to be configured')
    }

    // Use the first groupPath for fetching projects
    const primaryGroupPath = groupPaths && groupPaths.length > 0 ? groupPaths[0] : groupPath

    // Validate group access
    await validateGroup(gitlabUrl, primaryGroupPath, token)

    // Fetch all projects in the group
    projects = await fetchGroupProjects(gitlabUrl, primaryGroupPath, token)

    if (isDev) {
      console.log(`\n📊 GROUP MODE: Fetching data from ${projects.length} projects in "${primaryGroupPath}"\n`)
    }

    // Fetch issues and milestones from all projects
    const [issuesResult, milestonesResult] = await Promise.all([
      fetchIssuesFromProjects(gitlabUrl, projects, token),
      fetchMilestonesFromProjects(gitlabUrl, projects, token)
    ])

    allIssues = issuesResult
    allMilestones = milestonesResult
  }
  // PROJECT MODE: Fetch from single project (existing behavior)
  else {
    if (isDev) {
      console.log('Config values:', {
        gitlabUrl,
        projectId,
        groupPath: groupPath || '(none)',
        groupPathType: typeof groupPath,
        groupPathLength: groupPath?.length
      })
    }

    // Validate project access
    await validateProject(gitlabUrl, projectId, token)

    if (isDev) {
      console.log(`\n📊 PROJECT MODE: Fetching data from single project "${projectId}"\n`)
    }

    // Fetch issues and milestones from single project
    const [issuesResult, milestonesResult] = await Promise.all([
      fetchIssues(gitlabUrl, projectId, token),
      fetchMilestones(gitlabUrl, projectId, token)
    ])

    allIssues = issuesResult
    allMilestones = milestonesResult
  }

  // Fetch epics from all configured groups
  const groupPathsToFetch = groupPaths && Array.isArray(groupPaths) && groupPaths.length > 0
    ? groupPaths
    : (groupPath ? [groupPath] : [])

  const epicResults = await Promise.all(
    groupPathsToFetch.map(path => fetchEpics(gitlabUrl, path, token))
  )

  // Merge epics from all groups and remove duplicates
  const allEpics = epicResults.flat()
  const uniqueEpics = Array.from(
    new Map(allEpics.map(epic => [epic.id, epic])).values()
  )

  // Apply 2025 filter if enabled (default: true for backwards compatibility)
  const shouldFilter = filter2025 !== false

  // Filter issues: show if created_at, updated_at, or due_date >= 2025
  const issues = shouldFilter
    ? filterByYear2025(allIssues, ['created_at', 'updated_at', 'due_date'])
    : allIssues

  // Filter milestones: show if start_date, due_date, or created_at >= 2025
  const milestones = shouldFilter
    ? filterByYear2025(allMilestones, ['start_date', 'due_date', 'created_at'])
    : allMilestones

  // Filter epics: show if start_date, end_date, or created_at >= 2025
  const epics = shouldFilter
    ? filterByYear2025(uniqueEpics, ['start_date', 'end_date', 'created_at'])
    : uniqueEpics

  if (isDev) {
    console.log(`Filtered data: ${allIssues.length} → ${issues.length} issues, ${allMilestones.length} → ${milestones.length} milestones, ${uniqueEpics.length} → ${epics.length} epics ${shouldFilter ? '(>= 2025)' : '(no filter)'}`)

    if (mode === 'group') {
      console.log(`  Aggregated from ${projects.length} projects in group`)
    }
  }

  // Import cross-project linking functions
  const {
    linkCrossProjectIssues,
    enhanceEpicsWithCrossProjectData,
    buildEpicHierarchy,
    findOrphanedIssues
  } = await import('./crossProjectLinkingService.js')

  // Build cross-project relationships with available data
  const linkingData = linkCrossProjectIssues(issues, epics)

  // Add metadata about mode
  linkingData.singleProjectMode = isSingleProjectMode
  linkingData.selectedProjectId = isSingleProjectMode ? projectId : null
  linkingData.limitedView = isSingleProjectMode // Only showing issues from selected project in project mode
  linkingData.mode = mode || 'project'
  linkingData.projectCount = mode === 'group' ? projects.length : 1

  // Build epic hierarchy
  const { rootEpics, epicMap } = buildEpicHierarchy(epics)

  // Enhance epics with cross-project metadata
  const enhancedEpics = enhanceEpicsWithCrossProjectData(epics, linkingData)

  // Find orphaned issues that might need epic assignment
  const orphanedIssues = findOrphanedIssues(issues)

  // Enrich epics with their issues from issue data (workaround for 403 on Epic Issues API)
  const epicsWithIssues = enhancedEpics.map((epic) => {
    // Find all issues that belong to this epic
    const epicIssues = issues.filter(issue =>
      issue.epic && issue.epic.id === epic.id
    )

    return { ...epic, issues: epicIssues }
  })

  if (isDev) {
    console.log(`✓ Loaded ${epics.length} epics with ${epicsWithIssues.reduce((sum, e) => sum + e.issues.length, 0)} total issues`)
    console.log(`✓ Cross-project statistics:`, linkingData.statistics)
    if (orphanedIssues.length > 0) {
      console.log(`  Found ${orphanedIssues.length} orphaned issues that might need epic assignment`)
    }
  }

  return {
    issues,
    milestones,
    epics: epicsWithIssues,
    projects, // Include projects list for group mode
    crossProjectData: {
      ...linkingData,
      epicHierarchy: { rootEpics, epicMap },
      orphanedIssues
    }
  }
}
