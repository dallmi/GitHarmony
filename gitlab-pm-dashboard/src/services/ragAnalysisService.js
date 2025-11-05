/**
 * RAG (Red/Amber/Green) Analysis Service
 * Calculates epic health status with detailed root cause analysis
 */

import { getSprintFromLabels } from '../utils/labelUtils'
import { isBlocked } from '../utils/labelUtils'
import { getIssueWeight } from '../utils/capacityUtils'

/**
 * Calculate remaining iterations for an epic based on current date and iteration data
 */
export function calculateRemainingIterations(epic, issues) {
  if (!epic.end_date) return null

  const today = new Date()
  const endDate = new Date(epic.end_date)

  // Get all unique iterations for this epic's issues
  const iterations = new Map()

  issues.forEach(issue => {
    if (issue.iteration?.start_date) {
      const iterName = getSprintFromLabels(issue.labels, issue.iteration)
      if (iterName && !iterations.has(iterName)) {
        iterations.set(iterName, {
          name: iterName,
          startDate: new Date(issue.iteration.start_date),
          dueDate: issue.iteration.due_date ? new Date(issue.iteration.due_date) : null
        })
      }
    }
  })

  // Count future iterations (start date > today and <= epic end date)
  const futureIterations = Array.from(iterations.values()).filter(iter =>
    iter.startDate > today && iter.startDate <= endDate
  )

  // If we have iteration data, use that
  if (futureIterations.length > 0) {
    return futureIterations.length
  }

  // Fallback: estimate based on 2-week iterations
  const daysRemaining = Math.max(0, (endDate - today) / (1000 * 60 * 60 * 24))
  return Math.max(0, Math.floor(daysRemaining / 14))
}

/**
 * Calculate current velocity (issues closed per iteration) for last 3 iterations
 */
export function calculateCurrentVelocity(epic, issues) {
  const closedIssues = issues.filter(i => i.state === 'closed' && i.closed_at)

  if (closedIssues.length === 0) return 0

  // Group by iteration
  const iterationMap = new Map()

  closedIssues.forEach(issue => {
    const iterName = getSprintFromLabels(issue.labels, issue.iteration)
    if (iterName) {
      if (!iterationMap.has(iterName)) {
        iterationMap.set(iterName, {
          name: iterName,
          count: 0,
          startDate: issue.iteration?.start_date || null
        })
      }
      iterationMap.get(iterName).count++
    }
  })

  // Get last 3 iterations (sorted by start date)
  const iterations = Array.from(iterationMap.values())
    .filter(i => i.startDate)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .slice(0, 3)

  if (iterations.length === 0) {
    // Fallback: assume all closed in one iteration
    return closedIssues.length
  }

  // Calculate average
  const totalClosed = iterations.reduce((sum, iter) => sum + iter.count, 0)
  return totalClosed / iterations.length
}

/**
 * Calculate how many days an issue has been blocked
 */
export function getDaysBlocked(issue) {
  if (!isBlocked(issue.labels)) return 0

  // Use updated_at as proxy for when it became blocked
  const now = new Date()
  const updated = new Date(issue.updated_at)
  const days = Math.ceil((now - updated) / (1000 * 60 * 60 * 24))

  return Math.max(0, days)
}

/**
 * Get team capacity utilization for epic
 */
export function getTeamCapacityIssues(issues) {
  const memberMap = new Map()

  issues
    .filter(i => i.state === 'opened')
    .forEach(issue => {
      const assignees = issue.assignees || []
      const weight = getIssueWeight(issue)

      assignees.forEach(assignee => {
        if (!memberMap.has(assignee.username)) {
          memberMap.set(assignee.username, {
            name: assignee.name,
            username: assignee.username,
            totalWeight: 0,
            issueCount: 0
          })
        }

        const member = memberMap.get(assignee.username)
        member.totalWeight += weight / assignees.length // Split weight among assignees
        member.issueCount++
      })
    })

  return Array.from(memberMap.values())
}

/**
 * Calculate comprehensive RAG status with root cause analysis
 */
export function calculateEpicRAG(epic, issues, historicalData = null) {
  const openIssues = issues.filter(i => i.state === 'opened')
  const closedIssues = issues.filter(i => i.state === 'closed')
  const totalIssues = issues.length

  if (totalIssues === 0) {
    return {
      status: 'green',
      reason: 'No issues in epic',
      severity: 'healthy',
      factors: [],
      actions: [],
      projection: null
    }
  }

  const progressPercent = (closedIssues.length / totalIssues) * 100
  const remainingIssues = openIssues.length
  const remainingIterations = calculateRemainingIterations(epic, issues)
  const currentVelocity = calculateCurrentVelocity(epic, issues)
  const requiredVelocity = remainingIterations > 0 ? remainingIssues / remainingIterations : remainingIssues
  const velocityRatio = requiredVelocity > 0 ? currentVelocity / requiredVelocity : 1

  // Blocker analysis
  const blockedIssues = openIssues.filter(i => isBlocked(i.labels))
  const blockedCount = blockedIssues.length
  const oldBlockedIssues = blockedIssues.filter(i => getDaysBlocked(i) > 15)
  const oldBlockedCount = oldBlockedIssues.length

  // Weight analysis
  const totalWeight = openIssues.reduce((sum, i) => sum + getIssueWeight(i), 0)
  let weightVariance = 0
  if (historicalData?.avgCycleTime) {
    const historicalEstimate = historicalData.avgCycleTime * remainingIssues
    weightVariance = historicalEstimate > 0
      ? ((totalWeight - historicalEstimate) / historicalEstimate) * 100
      : 0
  }

  // Timeline analysis
  const daysUntilDue = epic.end_date
    ? (new Date(epic.end_date) - new Date()) / (1000 * 60 * 60 * 24)
    : null
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0

  // Team capacity
  const teamMembers = getTeamCapacityIssues(issues)
  const overallocatedMembers = teamMembers.filter(m => {
    const assumedCapacity = 10 // 10 days per iteration
    const utilization = (m.totalWeight / assumedCapacity) * 100
    return utilization > 120
  }).length

  // Contributing factors array
  const factors = []
  const actions = []

  // Collect all factors with severity

  // RED CONDITIONS
  if (isOverdue && openIssues.length > 0) {
    // Only mark as overdue if there are still open issues
    factors.push({
      severity: 'critical',
      category: 'timeline',
      title: 'Epic is overdue',
      description: `Due date ${new Date(epic.end_date).toLocaleDateString()} has passed with ${openIssues.length} issue${openIssues.length > 1 ? 's' : ''} still open`,
      impact: 'Cannot deliver on committed timeline'
    })
    actions.push({
      priority: 'critical',
      title: 'Negotiate timeline extension',
      description: 'Schedule stakeholder meeting to extend deadline',
      estimatedEffort: '1 day',
      impact: 'Align expectations with reality'
    })
  } else if (isOverdue && openIssues.length === 0) {
    // Epic completed but check if it was late
    const allClosedBeforeDue = closedIssues.every(issue => {
      if (!issue.closed_at) return false
      const closedDate = new Date(issue.closed_at)
      return closedDate <= new Date(epic.end_date)
    })

    if (!allClosedBeforeDue) {
      // Completed after the due date - warning level
      factors.push({
        severity: 'warning',
        category: 'timeline',
        title: 'Epic completed late',
        description: `All issues closed but some finished after due date ${new Date(epic.end_date).toLocaleDateString()}`,
        impact: 'Delivered late but complete'
      })
      actions.push({
        priority: 'medium',
        title: 'Review timeline planning',
        description: 'Analyze why epic took longer than expected to improve future estimates',
        estimatedEffort: '1 day',
        impact: 'Better planning for future epics'
      })
    }
    // If all completed before due date, don't add any overdue factor - it's GREEN
  }

  if (velocityRatio < 0.7 && requiredVelocity > 0) {
    factors.push({
      severity: 'critical',
      category: 'velocity',
      title: 'Velocity crisis',
      description: `Need ${requiredVelocity.toFixed(1)} issues/iter, currently ${currentVelocity.toFixed(1)} issues/iter (${(velocityRatio * 100).toFixed(0)}% of required)`,
      impact: `${Math.abs(remainingIterations * (requiredVelocity - currentVelocity)).toFixed(0)} issues short at current pace`
    })
    actions.push({
      priority: 'critical',
      title: 'Increase team capacity or reduce scope',
      description: `Option A: Add ${Math.ceil((requiredVelocity - currentVelocity) / 2)} developers. Option B: Reduce scope by ${Math.ceil(remainingIssues * (1 - velocityRatio))} issues`,
      estimatedEffort: '1 week',
      impact: `Achieve required velocity of ${requiredVelocity.toFixed(1)} issues/iter`
    })
  }

  if (oldBlockedCount > 0 || blockedCount >= 4) {
    factors.push({
      severity: 'critical',
      category: 'blockers',
      title: `${blockedCount} blocked issues`,
      description: oldBlockedCount > 0
        ? `${oldBlockedCount} blocked for >15 days, ${blockedCount} total blocked`
        : `${blockedCount} issues currently blocked`,
      impact: `${(blockedCount / totalIssues * 100).toFixed(0)}% of epic work is blocked`
    })
    actions.push({
      priority: 'critical',
      title: 'Executive escalation for blockers',
      description: `Escalate to CTO/VP level: ${blockedIssues.slice(0, 3).map(i => `#${i.iid}`).join(', ')}`,
      estimatedEffort: '2 days',
      impact: `Unblock ${blockedCount} issues, potential +${(blockedCount / (remainingIterations || 1)).toFixed(1)} issues/iter`
    })
  }

  if (weightVariance < -40) {
    factors.push({
      severity: 'critical',
      category: 'estimation',
      title: 'Severe underestimation',
      description: `Team estimated ${totalWeight} days, historical data suggests ${(totalWeight / (1 + weightVariance / 100)).toFixed(0)} days (${Math.abs(weightVariance).toFixed(0)}% variance)`,
      impact: 'Estimates not grounded in reality'
    })
    actions.push({
      priority: 'high',
      title: 'Re-estimate with senior team',
      description: 'Conduct estimation workshop with team leads and historical data',
      estimatedEffort: '1 day',
      impact: 'Realistic timeline and scope expectations'
    })
  }

  if (remainingIterations !== null && remainingIterations < 1 && remainingIssues > 3) {
    factors.push({
      severity: 'critical',
      category: 'timeline',
      title: 'Insufficient time remaining',
      description: `${remainingIssues} issues remaining, less than 1 iteration left`,
      impact: 'Mathematically impossible to complete'
    })
    actions.push({
      priority: 'critical',
      title: 'Emergency scope reduction',
      description: `Reduce to ${Math.ceil(currentVelocity)} must-have issues, defer ${remainingIssues - Math.ceil(currentVelocity)} to next release`,
      estimatedEffort: '2 days',
      impact: 'Deliver core value on time'
    })
  }

  if (progressPercent < 30 && remainingIterations !== null && remainingIterations < 3) {
    factors.push({
      severity: 'critical',
      category: 'progress',
      title: 'Critically behind schedule',
      description: `Only ${progressPercent.toFixed(0)}% complete with ${remainingIterations} iterations left`,
      impact: 'Epic has barely started with deadline approaching'
    })
    actions.push({
      priority: 'critical',
      title: 'Scope reduction or timeline extension',
      description: 'Stakeholder decision needed: reduce scope by 60% OR extend deadline by 8 weeks',
      estimatedEffort: '1 day',
      impact: 'Align scope with reality'
    })
  }

  // AMBER CONDITIONS
  if (velocityRatio >= 0.7 && velocityRatio < 1.0 && requiredVelocity > 0) {
    factors.push({
      severity: 'warning',
      category: 'velocity',
      title: 'Velocity gap',
      description: `Need ${requiredVelocity.toFixed(1)} issues/iter, currently ${currentVelocity.toFixed(1)} issues/iter (${(velocityRatio * 100).toFixed(0)}% of required)`,
      impact: `${(requiredVelocity - currentVelocity).toFixed(1)} issues/iter shortfall`
    })
    actions.push({
      priority: 'high',
      title: 'Focus team and remove distractions',
      description: 'Eliminate non-essential meetings, defer low-priority work on other epics',
      estimatedEffort: '1 day',
      impact: `Close velocity gap of ${(requiredVelocity - currentVelocity).toFixed(1)} issues/iter`
    })
  }

  if (blockedCount >= 2 && blockedCount < 4) {
    factors.push({
      severity: 'warning',
      category: 'blockers',
      title: `${blockedCount} blocked issues`,
      description: `Issues: ${blockedIssues.slice(0, 2).map(i => `#${i.iid}`).join(', ')}`,
      impact: 'Slowing team progress'
    })
    actions.push({
      priority: 'medium',
      title: 'Escalate blockers to team leads',
      description: `Work with dependent teams to unblock: ${blockedIssues.slice(0, 2).map(i => `#${i.iid} ${i.title.substring(0, 30)}`).join(', ')}`,
      estimatedEffort: '2 days',
      impact: `Unblock ${blockedCount} issues`
    })
  }

  if (weightVariance < -20 && weightVariance >= -40) {
    factors.push({
      severity: 'warning',
      category: 'estimation',
      title: 'Optimistic estimates',
      description: `Team estimated ${totalWeight} days, historical average suggests ${(totalWeight / (1 + weightVariance / 100)).toFixed(0)} days (${Math.abs(weightVariance).toFixed(0)}% lower than history)`,
      impact: 'May need more time than planned'
    })
    actions.push({
      priority: 'medium',
      title: 'Add buffer to timeline',
      description: 'Add 3-5 day buffer per remaining issue based on historical data',
      estimatedEffort: '1 day',
      impact: 'Realistic expectations'
    })
  }

  if (remainingIterations !== null && remainingIterations <= 1.5 && remainingIssues > 0) {
    factors.push({
      severity: 'warning',
      category: 'timeline',
      title: 'No schedule buffer',
      description: `Will finish in last iteration, no room for delays`,
      impact: 'Any setback will cause delay'
    })
    actions.push({
      priority: 'medium',
      title: 'Prevent scope creep',
      description: 'Lock scope, defer all new requests to next release, close issues faster than starting new ones',
      estimatedEffort: 'Ongoing',
      impact: 'Protect timeline'
    })
  }

  if (progressPercent < 50 && remainingIterations !== null && remainingIterations < 4 && remainingIterations >= 3) {
    factors.push({
      severity: 'warning',
      category: 'progress',
      title: 'Behind schedule',
      description: `${progressPercent.toFixed(0)}% complete with ${remainingIterations} iterations left`,
      impact: 'Need to accelerate'
    })
    actions.push({
      priority: 'high',
      title: 'Accelerate closures',
      description: 'Focus on closing in-progress issues before starting new work, identify quick wins',
      estimatedEffort: 'Ongoing',
      impact: 'Increase completion rate'
    })
  }

  if (overallocatedMembers >= 1) {
    factors.push({
      severity: 'warning',
      category: 'capacity',
      title: `${overallocatedMembers} team member(s) overallocated`,
      description: 'Team members at >120% capacity',
      impact: 'Burnout risk, quality issues'
    })
    actions.push({
      priority: 'medium',
      title: 'Re-balance workload',
      description: 'Move issues from overallocated to underutilized team members',
      estimatedEffort: '1 day',
      impact: 'Sustainable pace, better quality'
    })
  }

  // Sort factors by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  factors.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Sort actions by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // Determine final RAG status
  let status = 'green'
  let primaryReason = `On track: ${currentVelocity.toFixed(1)} issues/iter`
  let severity = 'healthy'

  const hasCritical = factors.some(f => f.severity === 'critical')
  const hasWarning = factors.some(f => f.severity === 'warning')

  if (hasCritical) {
    status = 'red'
    severity = 'critical'
    const criticalFactor = factors.find(f => f.severity === 'critical')
    primaryReason = criticalFactor.title
  } else if (hasWarning) {
    status = 'amber'
    severity = 'warning'
    const warningFactor = factors.find(f => f.severity === 'warning')
    primaryReason = warningFactor.title
  } else if (requiredVelocity > 0) {
    primaryReason = `On track: ${currentVelocity.toFixed(1)} issues/iter (need ${requiredVelocity.toFixed(1)})`
  }

  // Calculate projection
  let projection = null
  if (remainingIterations !== null && currentVelocity > 0) {
    const iterationsNeeded = Math.ceil(remainingIssues / currentVelocity)
    const weeksNeeded = iterationsNeeded * 2 // Assume 2-week iterations
    const projectedDate = new Date()
    projectedDate.setDate(projectedDate.getDate() + (weeksNeeded * 7))

    const variance = daysUntilDue !== null
      ? (projectedDate - new Date(epic.end_date)) / (1000 * 60 * 60 * 24)
      : null

    projection = {
      date: projectedDate,
      iterationsNeeded,
      weeksNeeded,
      daysVariance: variance,
      onTime: variance !== null && variance <= 0
    }
  }

  return {
    status,
    reason: primaryReason,
    severity,
    factors,
    actions,
    metrics: {
      progressPercent,
      remainingIssues,
      closedIssues: closedIssues.length,
      totalIssues,
      remainingIterations,
      currentVelocity,
      requiredVelocity,
      velocityRatio,
      blockedCount,
      totalWeight,
      weightVariance,
      daysUntilDue,
      overallocatedMembers
    },
    projection
  }
}

/**
 * Get historical cycle time data for comparison
 */
export function getHistoricalData(allClosedIssues) {
  if (!allClosedIssues || allClosedIssues.length === 0) {
    return { avgCycleTime: 7, medianCycleTime: 5 } // Default estimates
  }

  const cycleTimes = allClosedIssues
    .filter(i => i.created_at && i.closed_at)
    .map(i => {
      const created = new Date(i.created_at)
      const closed = new Date(i.closed_at)
      return (closed - created) / (1000 * 60 * 60 * 24) // Days
    })
    .filter(days => days > 0 && days < 365) // Filter outliers

  if (cycleTimes.length === 0) {
    return { avgCycleTime: 7, medianCycleTime: 5 }
  }

  const avg = cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
  const sorted = cycleTimes.sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  return {
    avgCycleTime: Math.round(avg),
    medianCycleTime: Math.round(median)
  }
}
