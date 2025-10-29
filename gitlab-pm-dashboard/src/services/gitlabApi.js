/**
 * GitLab API Service
 * Handles all communication with GitLab REST API
 */

/**
 * Fetch issues from a GitLab project
 */
export async function fetchIssues(gitlabUrl, projectId, token) {
  const encodedProjectId = encodeURIComponent(projectId)
  const response = await fetch(
    `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues?per_page=200&scope=all`,
    { headers: { 'PRIVATE-TOKEN': token } }
  )

  if (!response.ok) {
    throw new Error(`Issues API Error: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch milestones from a GitLab project
 */
export async function fetchMilestones(gitlabUrl, projectId, token) {
  const encodedProjectId = encodeURIComponent(projectId)
  const response = await fetch(
    `${gitlabUrl}/api/v4/projects/${encodedProjectId}/milestones`,
    { headers: { 'PRIVATE-TOKEN': token } }
  )

  if (!response.ok) {
    throw new Error(`Milestones API Error: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch epics from a GitLab group (Premium/Ultimate only)
 */
export async function fetchEpics(gitlabUrl, groupPath, token) {
  if (!groupPath) {
    return [] // No group path configured
  }

  const encodedGroupPath = encodeURIComponent(groupPath)

  try {
    const response = await fetch(
      `${gitlabUrl}/api/v4/groups/${encodedGroupPath}/epics?per_page=100`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )

    if (response.status === 404) {
      console.warn('Epics not available (requires Premium/Ultimate)')
      return []
    }

    if (!response.ok) {
      throw new Error(`Epics API Error: ${response.status}`)
    }

    return response.json()
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

    if (eventsResponse.status === 404 || eventsResponse.status === 403) {
      console.log('Resource State Events API not available (requires Premium/Ultimate)')
      return { hasLabelHistory: false, hasResourceEvents: false }
    }

    // Try to fetch resource label events
    const labelEventsResponse = await fetch(
      `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues/${testIssueIid}/resource_label_events`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )

    const hasLabelHistory = labelEventsResponse.ok
    const hasResourceEvents = eventsResponse.ok

    console.log('GitLab Premium Features:', {
      hasLabelHistory,
      hasResourceEvents
    })

    return { hasLabelHistory, hasResourceEvents }
  } catch (error) {
    console.error('Premium feature check failed:', error)
    return { hasLabelHistory: false, hasResourceEvents: false }
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
  const { gitlabUrl, projectId, groupPath, token } = config

  const [allIssues, allMilestones, allEpics] = await Promise.all([
    fetchIssues(gitlabUrl, projectId, token),
    fetchMilestones(gitlabUrl, projectId, token),
    groupPath ? fetchEpics(gitlabUrl, groupPath, token) : Promise.resolve([])
  ])

  // Filter issues: show if created_at, updated_at, or due_date >= 2025
  const issues = filterByYear2025(allIssues, ['created_at', 'updated_at', 'due_date'])

  // Filter milestones: show if start_date, due_date, or created_at >= 2025
  const milestones = filterByYear2025(allMilestones, ['start_date', 'due_date', 'created_at'])

  // Filter epics: show if start_date, end_date, or created_at >= 2025
  const epics = filterByYear2025(allEpics, ['start_date', 'end_date', 'created_at'])

  console.log(`Filtered data: ${allIssues.length} → ${issues.length} issues, ${allMilestones.length} → ${milestones.length} milestones, ${allEpics.length} → ${epics.length} epics (>= 2025)`)

  // Enrich epics with their issues from issue data (workaround for 403 on Epic Issues API)
  const epicsWithIssues = epics.map((epic) => {
    // Find all issues that belong to this epic
    const epicIssues = issues.filter(issue =>
      issue.epic && issue.epic.id === epic.id
    )

    return { ...epic, issues: epicIssues }
  })

  console.log(`Loaded ${epics.length} epics with ${epicsWithIssues.reduce((sum, e) => sum + e.issues.length, 0)} total issues`)

  return {
    issues,
    milestones,
    epics: epicsWithIssues
  }
}
