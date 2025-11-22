/**
 * Team Attribution Service
 *
 * Analyzes team assignments across initiatives using multiple data sources:
 * 1. Labels (team::name, squad::name)
 * 2. Assignees
 * 3. Issue/Epic metadata
 *
 * Provides insights for:
 * - Resource allocation across initiatives
 * - Team workload and capacity
 * - Cross-team dependencies
 * - Resource contention detection
 */

/**
 * Extract team name from labels
 * Supports patterns: team::name, squad::name, group::name
 */
export function extractTeamFromLabels(labels) {
  if (!labels || labels.length === 0) return null

  const teamPatterns = ['team::', 'squad::', 'group::']

  for (const pattern of teamPatterns) {
    const teamLabel = labels.find(l => l.toLowerCase().startsWith(pattern))
    if (teamLabel) {
      return teamLabel
        .replace(new RegExp(pattern, 'i'), '')
        .split('::')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()) // Title case
    }
  }

  return null
}

/**
 * Get all teams from issues
 */
export function extractAllTeams(issues) {
  const teamMap = new Map()

  issues.forEach(issue => {
    const teamName = extractTeamFromLabels(issue.labels)

    if (teamName) {
      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, {
          name: teamName,
          issueCount: 0,
          openIssueCount: 0,
          closedIssueCount: 0,
          members: new Set(),
          issues: []
        })
      }

      const team = teamMap.get(teamName)
      team.issueCount++
      if (issue.state === 'opened') team.openIssueCount++
      if (issue.state === 'closed') team.closedIssueCount++
      team.issues.push(issue)

      // Track team members from assignees
      issue.assignees?.forEach(assignee => {
        team.members.add(assignee.username)
      })
    }
  })

  // Convert Sets to Arrays
  return Array.from(teamMap.values()).map(team => ({
    ...team,
    members: Array.from(team.members),
    memberCount: team.members.size
  }))
}

/**
 * Attribute initiatives to teams based on epic and issue assignments
 */
export function attributeInitiativesToTeams(initiatives, issues) {
  const attributions = []

  initiatives.forEach(initiative => {
    const teamMap = new Map()

    // Analyze all issues in this initiative
    initiative.issues.forEach(issue => {
      const teamName = extractTeamFromLabels(issue.labels)

      if (teamName) {
        if (!teamMap.has(teamName)) {
          teamMap.set(teamName, {
            team: teamName,
            issueCount: 0,
            openIssues: 0,
            closedIssues: 0,
            storyPoints: 0,
            members: new Set(),
            issues: []
          })
        }

        const teamData = teamMap.get(teamName)
        teamData.issueCount++
        teamData.issues.push(issue)

        if (issue.state === 'opened') teamData.openIssues++
        if (issue.state === 'closed') teamData.closedIssues++

        // Extract story points if available (from labels like "sp::5")
        const spLabel = issue.labels?.find(l => l.toLowerCase().startsWith('sp::'))
        if (spLabel) {
          const sp = parseInt(spLabel.split('::')[1], 10)
          if (!isNaN(sp)) teamData.storyPoints += sp
        }

        // Track team members
        issue.assignees?.forEach(assignee => {
          teamData.members.add(assignee.username)
        })
      }
    })

    // Convert to array and calculate percentages
    const teams = Array.from(teamMap.values()).map(team => ({
      ...team,
      members: Array.from(team.members),
      memberCount: team.members.size,
      percentage: Math.round((team.issueCount / initiative.issues.length) * 100),
      completionRate: team.issueCount > 0
        ? Math.round((team.closedIssues / team.issueCount) * 100)
        : 0
    }))

    // Sort by issue count (primary contributor first)
    teams.sort((a, b) => b.issueCount - a.issueCount)

    attributions.push({
      initiativeId: initiative.id,
      initiativeName: initiative.name,
      teams,
      primaryTeam: teams[0]?.team || 'Unassigned',
      isMultiTeam: teams.length > 1,
      teamCount: teams.length,
      unassignedIssues: initiative.issues.filter(i => !extractTeamFromLabels(i.labels)).length
    })
  })

  return attributions
}

/**
 * Detect resource contention - same people assigned to multiple high-priority initiatives
 */
export function detectResourceContention(initiatives, issues) {
  const assigneeMap = new Map()

  initiatives.forEach(initiative => {
    // Only consider active initiatives (not completed)
    if (initiative.progress >= 100) return

    initiative.issues.forEach(issue => {
      // Only consider open issues
      if (issue.state !== 'opened') return

      const isHighPriority =
        issue.labels?.some(l => l.toLowerCase().includes('priority::high') ||
                              l.toLowerCase().includes('priority::critical'))

      issue.assignees?.forEach(assignee => {
        if (!assigneeMap.has(assignee.username)) {
          assigneeMap.set(assignee.username, {
            username: assignee.username,
            name: assignee.name,
            avatar: assignee.avatar_url,
            initiatives: new Set(),
            highPriorityInitiatives: new Set(),
            totalIssues: 0,
            highPriorityIssues: 0,
            teams: new Set()
          })
        }

        const assigneeData = assigneeMap.get(assignee.username)
        assigneeData.initiatives.add(initiative.id)
        assigneeData.totalIssues++

        if (isHighPriority) {
          assigneeData.highPriorityInitiatives.add(initiative.id)
          assigneeData.highPriorityIssues++
        }

        // Track teams this person works with
        const teamName = extractTeamFromLabels(issue.labels)
        if (teamName) assigneeData.teams.add(teamName)
      })
    })
  })

  // Convert to array and identify contention
  const contentionList = Array.from(assigneeMap.values())
    .map(assignee => ({
      ...assignee,
      initiatives: Array.from(assignee.initiatives),
      highPriorityInitiatives: Array.from(assignee.highPriorityInitiatives),
      teams: Array.from(assignee.teams),
      initiativeCount: assignee.initiatives.size,
      highPriorityCount: assignee.highPriorityInitiatives.size,
      isContended: assignee.initiatives.size >= 3 || assignee.highPriorityInitiatives.size >= 2,
      contentionLevel: calculateContentionLevel(
        assignee.initiatives.size,
        assignee.highPriorityInitiatives.size,
        assignee.totalIssues
      )
    }))
    .filter(a => a.isContended)
    .sort((a, b) => b.contentionLevel - a.contentionLevel)

  return contentionList
}

/**
 * Calculate contention level (0-100 score)
 */
function calculateContentionLevel(initiativeCount, highPriorityCount, totalIssues) {
  // Base score from initiative count (3+ initiatives = contention)
  let score = Math.min((initiativeCount - 2) * 20, 50)

  // Add points for high-priority initiatives
  score += highPriorityCount * 15

  // Add points for total issue load
  if (totalIssues >= 10) score += 20
  else if (totalIssues >= 5) score += 10

  return Math.min(score, 100)
}

/**
 * Get team capacity overview
 */
export function getTeamCapacityOverview(teams, initiatives) {
  return teams.map(team => {
    // Find all initiatives this team is involved in
    const teamInitiatives = initiatives.filter(initiative =>
      initiative.issues.some(issue =>
        extractTeamFromLabels(issue.labels) === team.name
      )
    )

    // Calculate active initiative count (not completed)
    const activeInitiatives = teamInitiatives.filter(i => i.progress < 100)

    // Calculate workload metrics
    const openIssues = team.issues.filter(i => i.state === 'opened').length
    const completionRate = team.issueCount > 0
      ? Math.round((team.closedIssueCount / team.issueCount) * 100)
      : 0

    // Determine capacity status
    let capacityStatus = 'available'
    if (activeInitiatives.length >= 4 || openIssues >= 30) {
      capacityStatus = 'overloaded'
    } else if (activeInitiatives.length >= 2 || openIssues >= 15) {
      capacityStatus = 'at-capacity'
    }

    return {
      teamName: team.name,
      memberCount: team.members.length || team.memberCount,
      initiativeCount: teamInitiatives.length,
      activeInitiativeCount: activeInitiatives.length,
      openIssueCount: openIssues,
      totalIssueCount: team.issueCount,
      completionRate,
      capacityStatus,
      capacityScore: calculateCapacityScore(activeInitiatives.length, openIssues, team.members.length || team.memberCount),
      initiatives: teamInitiatives.map(i => ({
        id: i.id,
        name: i.name,
        progress: i.progress,
        status: i.status
      }))
    }
  }).sort((a, b) => {
    // Sort by capacity status (overloaded first)
    const statusOrder = { overloaded: 3, 'at-capacity': 2, available: 1 }
    return statusOrder[b.capacityStatus] - statusOrder[a.capacityStatus]
  })
}

/**
 * Calculate capacity score (0-100, higher = more loaded)
 */
function calculateCapacityScore(activeInitiatives, openIssues, memberCount) {
  const memberFactor = memberCount > 0 ? 1 / Math.sqrt(memberCount) : 1

  // Initiatives contribute 30 points each (scaled by team size)
  const initiativeScore = Math.min((activeInitiatives * 30) * memberFactor, 60)

  // Issues contribute based on load (scaled by team size)
  const issueScore = Math.min((openIssues * 2) * memberFactor, 40)

  return Math.min(Math.round(initiativeScore + issueScore), 100)
}

/**
 * Get shared assignees between initiatives (cross-initiative resource overlap)
 */
export function getSharedResources(initiatives) {
  const assigneeToInitiatives = new Map()

  initiatives.forEach(initiative => {
    const assignees = new Set()

    initiative.issues.forEach(issue => {
      issue.assignees?.forEach(assignee => {
        assignees.add(assignee.username)
      })
    })

    assignees.forEach(username => {
      if (!assigneeToInitiatives.has(username)) {
        assigneeToInitiatives.set(username, [])
      }
      assigneeToInitiatives.get(username).push({
        id: initiative.id,
        name: initiative.name,
        status: initiative.status,
        progress: initiative.progress
      })
    })
  })

  // Filter to only people working on multiple initiatives
  const sharedResources = []
  assigneeToInitiatives.forEach((initiatives, username) => {
    if (initiatives.length > 1) {
      sharedResources.push({
        username,
        initiativeCount: initiatives.length,
        initiatives: initiatives.sort((a, b) => a.name.localeCompare(b.name))
      })
    }
  })

  return sharedResources.sort((a, b) => b.initiativeCount - a.initiativeCount)
}

/**
 * Export team attribution report to CSV
 */
export function exportTeamAttributionCSV(attributions) {
  const headers = [
    'Initiative',
    'Primary Team',
    'Team Count',
    'Is Multi-Team',
    'Unassigned Issues',
    'Team',
    'Issue Count',
    'Open Issues',
    'Closed Issues',
    'Completion Rate %',
    'Story Points',
    'Member Count',
    'Percentage of Initiative'
  ]

  const rows = []
  attributions.forEach(attr => {
    if (attr.teams.length === 0) {
      rows.push([
        attr.initiativeName,
        attr.primaryTeam,
        attr.teamCount,
        attr.isMultiTeam ? 'Yes' : 'No',
        attr.unassignedIssues,
        'No teams assigned',
        '-', '-', '-', '-', '-', '-', '-'
      ])
    } else {
      attr.teams.forEach((team, idx) => {
        rows.push([
          idx === 0 ? attr.initiativeName : '',
          idx === 0 ? attr.primaryTeam : '',
          idx === 0 ? attr.teamCount : '',
          idx === 0 ? (attr.isMultiTeam ? 'Yes' : 'No') : '',
          idx === 0 ? attr.unassignedIssues : '',
          team.team,
          team.issueCount,
          team.openIssues,
          team.closedIssues,
          `${team.completionRate}%`,
          team.storyPoints,
          team.memberCount,
          `${team.percentage}%`
        ])
      })
    }
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n')

  return csvContent
}

/**
 * Export resource contention report to CSV
 */
export function exportResourceContentionCSV(contention) {
  const headers = [
    'Name',
    'Username',
    'Initiative Count',
    'High Priority Initiatives',
    'Total Open Issues',
    'High Priority Issues',
    'Teams',
    'Contention Level',
    'Status'
  ]

  const rows = contention.map(person => [
    person.name,
    person.username,
    person.initiativeCount,
    person.highPriorityCount,
    person.totalIssues,
    person.highPriorityIssues,
    `"${person.teams.join(', ')}"`,
    person.contentionLevel,
    person.contentionLevel >= 70 ? 'Critical' : person.contentionLevel >= 40 ? 'High' : 'Medium'
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Export team capacity report to CSV
 */
export function exportTeamCapacityCSV(capacityOverview) {
  const headers = [
    'Team',
    'Member Count',
    'Total Initiatives',
    'Active Initiatives',
    'Open Issues',
    'Total Issues',
    'Completion Rate %',
    'Capacity Status',
    'Capacity Score',
    'Initiative List'
  ]

  const rows = capacityOverview.map(team => [
    team.teamName,
    team.memberCount,
    team.initiativeCount,
    team.activeInitiativeCount,
    team.openIssueCount,
    team.totalIssueCount,
    `${team.completionRate}%`,
    team.capacityStatus,
    team.capacityScore,
    `"${team.initiatives.map(i => `${i.name} (${i.progress}%)`).join('; ')}"`
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}
