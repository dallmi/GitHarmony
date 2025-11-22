/**
 * Multi-Source GitLab API Service
 * Enhanced service for fetching data from multiple projects and groups
 * Handles complex organizational structures with scattered issues and epics
 */

import { validateProject, fetchIssues, fetchMilestones, fetchEpics } from './gitlabApi'

/**
 * Configuration for a data source
 * @typedef {Object} DataSource
 * @property {string} type - 'project' | 'group' | 'project-group'
 * @property {string} name - Display name for this source
 * @property {string} gitlabUrl - GitLab instance URL
 * @property {string} token - Access token
 * @property {string} [projectId] - Project ID (for 'project' and 'project-group' types)
 * @property {string[]} [groupPaths] - Array of group paths to fetch epics from
 * @property {boolean} [includeSubgroups] - Whether to include subgroups when fetching epics
 */

/**
 * Fetch data from multiple sources with flexible configuration
 * @param {DataSource[]} sources - Array of data sources to fetch from
 * @param {Object} options - Additional options
 * @returns {Promise} Aggregated data from all sources
 */
export async function fetchFromMultipleSources(sources, options = {}) {
  console.log(`Fetching data from ${sources.length} sources...`)

  const results = {
    issues: [],
    milestones: [],
    epics: [],
    epicIssueMap: new Map(), // Map epic IDs to their issues
    sourceMetadata: [],
    errors: []
  }

  // Process each source
  for (const source of sources) {
    console.log(`\nProcessing source: ${source.name} (${source.type})`)

    try {
      switch (source.type) {
        case 'project':
          // Fetch issues and milestones from project only
          await fetchProjectData(source, results)
          break

        case 'group':
          // Fetch epics from group only
          await fetchGroupData(source, results)
          break

        case 'project-group':
          // Fetch issues/milestones from project AND epics from associated groups
          await fetchProjectData(source, results)
          await fetchGroupData(source, results)
          break

        default:
          console.warn(`Unknown source type: ${source.type}`)
      }

      results.sourceMetadata.push({
        name: source.name,
        type: source.type,
        status: 'success'
      })
    } catch (error) {
      console.error(`Error processing source ${source.name}:`, error)
      results.errors.push({
        source: source.name,
        error: error.message
      })
      results.sourceMetadata.push({
        name: source.name,
        type: source.type,
        status: 'error',
        error: error.message
      })
    }
  }

  // Post-process: Link epics to issues
  console.log('\nLinking epics to issues...')
  results.issues = results.issues.map(issue => {
    if (issue.epic) {
      // Find the full epic data
      const fullEpic = results.epics.find(e => e.id === issue.epic.id)
      if (fullEpic) {
        // Add issue to epic's issue list
        if (!results.epicIssueMap.has(fullEpic.id)) {
          results.epicIssueMap.set(fullEpic.id, [])
        }
        results.epicIssueMap.get(fullEpic.id).push(issue)

        // Enhance issue with full epic data
        return {
          ...issue,
          epic: fullEpic,
          _epicSource: fullEpic._source
        }
      }
    }
    return issue
  })

  // Add issue arrays to epics
  results.epics = results.epics.map(epic => ({
    ...epic,
    issues: results.epicIssueMap.get(epic.id) || []
  }))

  // Calculate statistics
  const stats = {
    totalIssues: results.issues.length,
    totalEpics: results.epics.length,
    totalMilestones: results.milestones.length,
    issuesWithEpics: results.issues.filter(i => i.epic).length,
    epicsWithIssues: results.epics.filter(e => e.issues.length > 0).length,
    orphanedIssues: results.issues.filter(i => !i.epic).length,
    emptyEpics: results.epics.filter(e => e.issues.length === 0).length,
    sourceCount: sources.length,
    successfulSources: results.sourceMetadata.filter(s => s.status === 'success').length
  }

  console.log('\n=== Multi-Source Fetch Complete ===')
  console.log('Statistics:', stats)

  return {
    ...results,
    statistics: stats
  }
}

/**
 * Fetch project data (issues and milestones)
 */
async function fetchProjectData(source, results) {
  if (!source.projectId) {
    console.warn(`No projectId for source ${source.name}`)
    return
  }

  console.log(`  Fetching issues and milestones from project: ${source.projectId}`)

  // Validate project first
  const project = await validateProject(source.gitlabUrl, source.projectId, source.token)

  // Fetch issues and milestones in parallel
  const [issues, milestones] = await Promise.all([
    fetchIssues(source.gitlabUrl, source.projectId, source.token),
    fetchMilestones(source.gitlabUrl, source.projectId, source.token)
  ])

  // Tag with source metadata
  const taggedIssues = issues.map(issue => ({
    ...issue,
    _source: source.name,
    _projectId: source.projectId,
    _projectPath: project.path_with_namespace
  }))

  const taggedMilestones = milestones.map(milestone => ({
    ...milestone,
    _source: source.name,
    _projectId: source.projectId,
    _projectPath: project.path_with_namespace
  }))

  results.issues.push(...taggedIssues)
  results.milestones.push(...taggedMilestones)

  console.log(`    ✓ Fetched ${issues.length} issues, ${milestones.length} milestones`)
}

/**
 * Fetch group data (epics)
 */
async function fetchGroupData(source, results) {
  const groupPaths = source.groupPaths || (source.groupPath ? [source.groupPath] : [])

  if (groupPaths.length === 0) {
    console.warn(`No group paths for source ${source.name}`)
    return
  }

  for (const groupPath of groupPaths) {
    console.log(`  Fetching epics from group: ${groupPath}`)

    try {
      const epics = await fetchEpics(source.gitlabUrl, groupPath, source.token)

      // Tag with source metadata
      const taggedEpics = epics.map(epic => ({
        ...epic,
        _source: source.name,
        _groupPath: groupPath,
        _includesSubgroups: source.includeSubgroups || false
      }))

      results.epics.push(...taggedEpics)
      console.log(`    ✓ Fetched ${epics.length} epics`)

      // If includeSubgroups is true, we might want to recursively fetch subgroups
      // GitLab API already includes subgroup epics by default in many cases

    } catch (error) {
      console.error(`    ✗ Failed to fetch epics from ${groupPath}:`, error.message)
      // Continue with other groups
    }
  }
}

/**
 * Create a unified view of issues and their parent epics
 * Useful for displaying all issues with epic context regardless of source
 */
export function createUnifiedIssueEpicView(data) {
  const { issues, epics } = data

  // Group issues by epic
  const epicGroups = new Map()

  // Add all epics first
  epics.forEach(epic => {
    epicGroups.set(epic.id, {
      epic,
      issues: []
    })
  })

  // Add orphaned issues group
  epicGroups.set('orphaned', {
    epic: null,
    issues: []
  })

  // Distribute issues to their epics
  issues.forEach(issue => {
    if (issue.epic && epicGroups.has(issue.epic.id)) {
      epicGroups.get(issue.epic.id).issues.push(issue)
    } else if (!issue.epic) {
      epicGroups.get('orphaned').issues.push(issue)
    }
  })

  // Convert to array and sort
  const groups = Array.from(epicGroups.values())
    .filter(group => group.epic || group.issues.length > 0) // Remove empty groups
    .sort((a, b) => {
      // Orphaned issues at the end
      if (!a.epic) return 1
      if (!b.epic) return -1
      // Sort epics by title
      return a.epic.title.localeCompare(b.epic.title)
    })

  return groups
}

/**
 * Example configuration for complex multi-source setup
 */
export const EXAMPLE_MULTI_SOURCE_CONFIG = [
  {
    type: 'project-group',
    name: 'Frontend Team',
    gitlabUrl: 'https://gitlab.com',
    token: 'glpat-xxx',
    projectId: 'company/frontend/webapp',
    groupPaths: ['company/frontend', 'company/shared'],
    includeSubgroups: true
  },
  {
    type: 'project',
    name: 'Backend API',
    gitlabUrl: 'https://gitlab.com',
    token: 'glpat-xxx',
    projectId: 'company/backend/api'
  },
  {
    type: 'group',
    name: 'Platform Epics',
    gitlabUrl: 'https://gitlab.com',
    token: 'glpat-xxx',
    groupPaths: ['company/platform'],
    includeSubgroups: true
  }
]