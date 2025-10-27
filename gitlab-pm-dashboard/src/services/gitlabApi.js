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
 * Fetch all data needed for the dashboard
 */
export async function fetchAllData(config) {
  const { gitlabUrl, projectId, groupPath, token } = config

  const [issues, milestones, epics] = await Promise.all([
    fetchIssues(gitlabUrl, projectId, token),
    fetchMilestones(gitlabUrl, projectId, token),
    groupPath ? fetchEpics(gitlabUrl, groupPath, token) : Promise.resolve([])
  ])

  // Enrich epics with their issues
  const epicsWithIssues = await Promise.all(
    epics.map(async (epic) => {
      try {
        const epicIssues = await fetchEpicIssues(gitlabUrl, groupPath, epic.id, token)
        return { ...epic, issues: epicIssues }
      } catch (error) {
        console.error(`Failed to fetch issues for epic ${epic.id}:`, error)
        return { ...epic, issues: [] }
      }
    })
  )

  return {
    issues,
    milestones,
    epics: epicsWithIssues
  }
}
