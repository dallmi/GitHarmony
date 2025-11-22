/**
 * Capacity Analysis Service
 * Analyzes team capacity and provides recommendations
 */

export function analyzeCapacityIssues(memberCapacityData) {
  const issues = []
  const recommendations = []

  // Check for overloaded members
  const overloadedMembers = memberCapacityData.filter(m => m.utilization >= 100)
  if (overloadedMembers.length > 0) {
    issues.push({
      severity: 'critical',
      type: 'overload',
      description: `${overloadedMembers.length} team member${overloadedMembers.length > 1 ? 's are' : ' is'} overloaded (100%+ utilization)`,
      affectedMembers: overloadedMembers.map(m => m.name || m.username)
    })

    // Find available members for redistribution
    const availableMembers = memberCapacityData.filter(m => m.utilization < 60)
    if (availableMembers.length > 0) {
      recommendations.push(
        `Redistribute work from overloaded members to available team members: ${availableMembers.map(m => m.name || m.username).join(', ')}`
      )
    }
  }

  // Check for at-capacity members
  const atCapacityMembers = memberCapacityData.filter(m => m.utilization >= 80 && m.utilization < 100)
  if (atCapacityMembers.length > 0) {
    issues.push({
      severity: 'warning',
      type: 'at-capacity',
      description: `${atCapacityMembers.length} team member${atCapacityMembers.length > 1 ? 's are' : ' is'} at capacity (80-99% utilization)`,
      affectedMembers: atCapacityMembers.map(m => m.name || m.username)
    })
  }

  // Check for blocked issues
  const membersWithBlockers = memberCapacityData.filter(m => m.issueStates?.blocked > 0)
  if (membersWithBlockers.length > 0) {
    const totalBlocked = membersWithBlockers.reduce((sum, m) => sum + m.issueStates.blocked, 0)
    issues.push({
      severity: 'warning',
      type: 'blocked',
      description: `${totalBlocked} blocked issue${totalBlocked > 1 ? 's' : ''} affecting ${membersWithBlockers.length} team member${membersWithBlockers.length > 1 ? 's' : ''}`,
      affectedMembers: membersWithBlockers.map(m => m.name || m.username)
    })

    recommendations.push('Prioritize unblocking issues to free up capacity')
  }

  // Check for underutilized members
  const underutilizedMembers = memberCapacityData.filter(m => m.utilization < 40 && m.currentCapacity > 0)
  if (underutilizedMembers.length > 0) {
    issues.push({
      severity: 'info',
      type: 'underutilized',
      description: `${underutilizedMembers.length} team member${underutilizedMembers.length > 1 ? 's have' : ' has'} low utilization (<40%)`,
      affectedMembers: underutilizedMembers.map(m => m.name || m.username)
    })

    if (overloadedMembers.length > 0) {
      recommendations.push(
        `Consider reassigning work to underutilized members: ${underutilizedMembers.map(m => m.name || m.username).join(', ')}`
      )
    }
  }

  // Check for team-wide capacity issues
  const totalUtilization = memberCapacityData.reduce((sum, m) => sum + m.utilization, 0) / memberCapacityData.length
  if (totalUtilization >= 85) {
    issues.push({
      severity: 'critical',
      type: 'team-capacity',
      description: `Team-wide utilization is critically high (${Math.round(totalUtilization)}% average)`,
      affectedMembers: []
    })

    recommendations.push('Consider deferring lower-priority work or bringing in additional resources')
  }

  // Sort issues by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    issues,
    recommendations,
    summary: {
      overloadedCount: overloadedMembers.length,
      atCapacityCount: atCapacityMembers.length,
      availableCount: memberCapacityData.filter(m => m.utilization < 60).length,
      blockedIssues: membersWithBlockers.reduce((sum, m) => sum + m.issueStates.blocked, 0),
      avgUtilization: Math.round(totalUtilization)
    }
  }
}

/**
 * Calculate sprint velocity based on historical data
 */
export function calculateVelocity(completedSprints) {
  if (!completedSprints || completedSprints.length === 0) {
    return { average: 0, trend: 'stable' }
  }

  const velocities = completedSprints.map(sprint => sprint.completedPoints || 0)
  const average = velocities.reduce((sum, v) => sum + v, 0) / velocities.length

  // Calculate trend (last 3 sprints vs previous 3)
  let trend = 'stable'
  if (velocities.length >= 6) {
    const recent = velocities.slice(-3).reduce((sum, v) => sum + v, 0) / 3
    const previous = velocities.slice(-6, -3).reduce((sum, v) => sum + v, 0) / 3

    if (recent > previous * 1.1) {
      trend = 'improving'
    } else if (recent < previous * 0.9) {
      trend = 'declining'
    }
  }

  return { average: Math.round(average), trend }
}

/**
 * Forecast capacity needs based on upcoming work
 */
export function forecastCapacityNeeds(upcomingWork, teamVelocity, teamCapacity) {
  const totalPoints = upcomingWork.reduce((sum, item) => sum + (item.storyPoints || 0), 0)
  const weeksNeeded = totalPoints / teamVelocity
  const capacityNeeded = weeksNeeded * teamCapacity

  return {
    totalPoints,
    weeksNeeded: Math.ceil(weeksNeeded),
    capacityNeeded: Math.round(capacityNeeded),
    recommendation: weeksNeeded > 4 ? 'Consider breaking down work into smaller milestones' : null
  }
}