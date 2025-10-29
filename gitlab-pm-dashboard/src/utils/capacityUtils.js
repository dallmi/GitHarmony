/**
 * Capacity Planning Utilities
 * Calculate team member workload, identify overallocation, suggest load balancing
 */

/**
 * Calculate working days in an iteration
 * Excludes weekends, assumes 5-day work week
 */
export function calculateWorkingDays(startDate, endDate) {
  if (!startDate || !endDate) return 10 // Default 2-week sprint

  const start = new Date(startDate)
  const end = new Date(endDate)
  let workingDays = 0

  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++
    }
    current.setDate(current.getDate() + 1)
  }

  return workingDays
}

/**
 * Get issue weight (days of work)
 * Weight field represents story points or days
 */
export function getIssueWeight(issue) {
  // Check GitLab weight field
  if (issue.weight && issue.weight > 0) {
    return issue.weight
  }

  // Fallback: estimate from labels
  const weightLabel = issue.labels?.find(l => {
    const lower = l.toLowerCase()
    return lower.includes('weight') || lower.includes('points') || lower.includes('days')
  })

  if (weightLabel) {
    const match = weightLabel.match(/\d+/)
    if (match) return parseInt(match[0], 10)
  }

  // Default: 1 day for small tasks, 3 for others
  if (issue.state === 'closed') return 0 // Completed work doesn't count
  return issue.labels?.some(l => l.toLowerCase().includes('small')) ? 1 : 3
}

/**
 * Calculate team member workload for a sprint
 */
export function calculateTeamWorkload(issues, iterationDays = 10) {
  const teamMembers = new Map()

  issues.forEach(issue => {
    if (issue.state === 'closed') return // Skip completed issues

    const weight = getIssueWeight(issue)
    const assignees = issue.assignees || []

    if (assignees.length === 0) {
      // Unassigned work
      if (!teamMembers.has('Unassigned')) {
        teamMembers.set('Unassigned', {
          name: 'Unassigned',
          username: null,
          issues: [],
          totalWeight: 0,
          capacity: 0,
          utilizationPercent: 0,
          status: 'unassigned'
        })
      }
      const unassigned = teamMembers.get('Unassigned')
      unassigned.issues.push(issue)
      unassigned.totalWeight += weight
    } else {
      // Distribute weight across assignees
      const weightPerPerson = weight / assignees.length

      assignees.forEach(assignee => {
        const key = assignee.username || assignee.name

        if (!teamMembers.has(key)) {
          teamMembers.set(key, {
            name: assignee.name,
            username: assignee.username,
            avatar: assignee.avatar_url,
            issues: [],
            totalWeight: 0,
            capacity: iterationDays, // Assume 1 person = iteration days capacity
            utilizationPercent: 0,
            status: 'ok'
          })
        }

        const member = teamMembers.get(key)
        member.issues.push(issue)
        member.totalWeight += weightPerPerson
      })
    }
  })

  // Calculate utilization and status for each member
  teamMembers.forEach((member, key) => {
    if (key === 'Unassigned') return

    member.utilizationPercent = Math.round((member.totalWeight / member.capacity) * 100)

    // Determine status
    if (member.utilizationPercent > 120) {
      member.status = 'critical' // Severely overallocated
    } else if (member.utilizationPercent > 100) {
      member.status = 'overallocated' // Overallocated
    } else if (member.utilizationPercent > 80) {
      member.status = 'full' // At or near capacity
    } else if (member.utilizationPercent < 50) {
      member.status = 'underutilized' // Under-capacity
    } else {
      member.status = 'ok' // Healthy load
    }
  })

  return Array.from(teamMembers.values()).sort((a, b) => {
    // Sort: critical first, then by utilization
    const statusOrder = { critical: 0, overallocated: 1, full: 2, ok: 3, underutilized: 4, unassigned: 5 }
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    return b.utilizationPercent - a.utilizationPercent
  })
}

/**
 * Generate smart recommendations for load balancing
 */
export function generateRecommendations(teamWorkload) {
  const recommendations = []

  // Find overallocated members
  const overallocated = teamWorkload.filter(m =>
    m.username && (m.status === 'critical' || m.status === 'overallocated')
  )

  // Find underutilized members
  const underutilized = teamWorkload.filter(m =>
    m.username && m.status === 'underutilized'
  )

  // Find unassigned work
  const unassigned = teamWorkload.find(m => m.name === 'Unassigned')

  // Recommendation 1: Balance overallocated to underutilized
  overallocated.forEach(overloaded => {
    const excessLoad = overloaded.totalWeight - overloaded.capacity
    const availableMembers = underutilized.filter(m =>
      (m.capacity - m.totalWeight) >= 2 // Has at least 2 days capacity
    )

    if (availableMembers.length > 0) {
      const target = availableMembers[0]
      const targetCapacity = target.capacity - target.totalWeight

      // Find issues to move
      const movableIssues = overloaded.issues
        .filter(i => i.state === 'opened')
        .sort((a, b) => getIssueWeight(a) - getIssueWeight(b)) // Smallest first

      const issuesToMove = []
      let movedWeight = 0

      for (const issue of movableIssues) {
        const weight = getIssueWeight(issue)
        if (movedWeight + weight <= Math.min(excessLoad, targetCapacity)) {
          issuesToMove.push(issue)
          movedWeight += weight
        }
        if (movedWeight >= excessLoad * 0.5) break // Move ~50% of excess
      }

      if (issuesToMove.length > 0) {
        recommendations.push({
          type: 'rebalance',
          priority: 'high',
          from: overloaded.name,
          to: target.name,
          issues: issuesToMove,
          weight: movedWeight,
          reason: `${overloaded.name} is ${overloaded.utilizationPercent}% utilized (${Math.round(excessLoad)} days over). Move ${movedWeight} days to ${target.name} (${target.utilizationPercent}% utilized).`
        })
      }
    } else {
      // No underutilized members available
      recommendations.push({
        type: 'warning',
        priority: 'high',
        person: overloaded.name,
        weight: Math.round(overloaded.totalWeight - overloaded.capacity),
        reason: `${overloaded.name} is overallocated by ${Math.round(overloaded.totalWeight - overloaded.capacity)} days (${overloaded.utilizationPercent}% capacity). Consider reducing scope or extending timeline.`
      })
    }
  })

  // Recommendation 2: Assign unassigned work
  if (unassigned && unassigned.totalWeight > 0) {
    const availableMembers = teamWorkload.filter(m =>
      m.username && m.utilizationPercent < 90
    ).sort((a, b) => a.utilizationPercent - b.utilizationPercent) // Least loaded first

    if (availableMembers.length > 0) {
      unassigned.issues.forEach(issue => {
        const weight = getIssueWeight(issue)
        const target = availableMembers.find(m =>
          (m.capacity - m.totalWeight) >= weight
        ) || availableMembers[0]

        recommendations.push({
          type: 'assign',
          priority: 'medium',
          to: target.name,
          toUsername: target.username,
          issues: [issue],
          weight: weight,
          reason: `Assign unassigned issue "${issue.title}" (${weight} days) to ${target.name} (${target.utilizationPercent}% utilized).`
        })

        // Update target's utilization for next assignment
        target.totalWeight += weight
        target.utilizationPercent = Math.round((target.totalWeight / target.capacity) * 100)
      })
    } else {
      recommendations.push({
        type: 'warning',
        priority: 'medium',
        weight: Math.round(unassigned.totalWeight),
        reason: `${unassigned.totalWeight} days of unassigned work. All team members are at capacity.`
      })
    }
  }

  // Recommendation 3: Highlight underutilized members
  underutilized.forEach(member => {
    if (member.utilizationPercent < 30) {
      recommendations.push({
        type: 'info',
        priority: 'low',
        person: member.name,
        capacity: Math.round(member.capacity - member.totalWeight),
        reason: `${member.name} has ${Math.round(member.capacity - member.totalWeight)} days available (${member.utilizationPercent}% utilized). Consider assigning more work.`
      })
    }
  })

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/**
 * Get status color for team member
 */
export function getStatusColor(status) {
  switch (status) {
    case 'critical': return '#DC2626' // Red
    case 'overallocated': return '#D97706' // Amber
    case 'full': return '#2563EB' // Blue
    case 'ok': return '#059669' // Green
    case 'underutilized': return '#6B7280' // Gray
    case 'unassigned': return '#9CA3AF' // Light gray
    default: return '#6B7280'
  }
}

/**
 * Get status label for team member
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'critical': return '🔴 Critical'
    case 'overallocated': return '🟠 Overallocated'
    case 'full': return '🔵 At Capacity'
    case 'ok': return '🟢 Healthy'
    case 'underutilized': return '⚪ Underutilized'
    case 'unassigned': return '❓ Unassigned'
    default: return 'Unknown'
  }
}

/**
 * Format recommendation for display
 */
export function formatRecommendation(rec) {
  const icons = {
    rebalance: '🔄',
    assign: '👤',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return {
    icon: icons[rec.type] || '•',
    ...rec
  }
}
