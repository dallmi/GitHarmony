/**
 * AI Insights Engine (100% Local - No External API)
 * Pattern detection, statistical analysis, and recommendations
 * All algorithms run in the browser - no data leaves the client
 */

import { calculateVelocity, getCurrentSprint } from './velocityService'
import { getSprintFromLabels } from '../utils/labelUtils'

/**
 * Generate comprehensive insights from project data
 * All analysis is performed locally in the browser
 */
export function generateInsights({ issues, milestones, epics, stats, healthScore, risks }) {
  const insights = []

  // 1. Velocity & Trend Analysis
  const velocityInsights = analyzeVelocity(issues)
  insights.push(...velocityInsights)

  // 2. Bottleneck Detection
  const bottleneckInsights = detectBottlenecks(issues)
  insights.push(...bottleneckInsights)

  // 3. Resource Overload Detection
  const resourceInsights = analyzeResourceAllocation(issues)
  insights.push(...resourceInsights)

  // 4. Milestone Risk Analysis
  const milestoneInsights = analyzeMilestones(issues, milestones)
  insights.push(...milestoneInsights)

  // 5. Epic Health Analysis
  const epicInsights = analyzeEpics(epics)
  insights.push(...epicInsights)

  // 6. Risk Trend Analysis
  const riskInsights = analyzeRisks(risks)
  insights.push(...riskInsights)

  // 7. Completion Forecast
  const forecastInsights = forecastCompletion(issues, stats)
  insights.push(...forecastInsights)

  // 8. Quality Metrics
  const qualityInsights = analyzeQuality(issues)
  insights.push(...qualityInsights)

  // Sort by severity (critical > warning > info > success)
  const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 }
  return insights.sort((a, b) => severityOrder[a.type] - severityOrder[b.type])
}

/**
 * Analyze velocity trends
 */
function analyzeVelocity(issues) {
  const insights = []
  const velocityData = calculateVelocity(issues)

  if (velocityData.length < 2) return insights

  // Calculate trend over last 3 sprints
  const recent = velocityData.slice(-3)
  const avgRecent = recent.reduce((sum, s) => sum + s.velocity, 0) / recent.length
  const older = velocityData.slice(-6, -3)

  if (older.length > 0) {
    const avgOlder = older.reduce((sum, s) => sum + s.velocity, 0) / older.length
    const change = ((avgRecent - avgOlder) / avgOlder) * 100

    if (change < -20) {
      insights.push({
        type: 'critical',
        category: 'Velocity',
        title: 'Significant Velocity Decline',
        description: `Team velocity has dropped by ${Math.abs(Math.round(change))}% over the last 3 sprints (${Math.round(avgRecent)} vs ${Math.round(avgOlder)} issues/sprint).`,
        impact: 'High - Delivery timeline at risk',
        recommendation: 'Conduct retrospective to identify blockers. Review team capacity and workload distribution.',
        confidence: 'High'
      })
    } else if (change < -10) {
      insights.push({
        type: 'warning',
        category: 'Velocity',
        title: 'Velocity Declining',
        description: `Team velocity decreased by ${Math.abs(Math.round(change))}% in recent sprints.`,
        impact: 'Medium - Monitor closely',
        recommendation: 'Review sprint planning and identify potential bottlenecks.',
        confidence: 'Medium'
      })
    } else if (change > 20) {
      insights.push({
        type: 'success',
        category: 'Velocity',
        title: 'Velocity Improvement',
        description: `Team velocity increased by ${Math.round(change)}% - excellent progress!`,
        impact: 'Positive - Ahead of schedule',
        recommendation: 'Document what is working well to maintain momentum.',
        confidence: 'High'
      })
    }
  }

  // Velocity consistency check
  const velocities = velocityData.map(v => v.velocity)
  const stdDev = calculateStdDev(velocities)
  const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length
  const coefficientOfVariation = (stdDev / mean) * 100

  if (coefficientOfVariation > 40) {
    insights.push({
      type: 'warning',
      category: 'Velocity',
      title: 'Inconsistent Velocity',
      description: `Velocity varies significantly between sprints (CV: ${Math.round(coefficientOfVariation)}%).`,
      impact: 'Medium - Unpredictable delivery',
      recommendation: 'Standardize sprint planning process. Ensure consistent team capacity.',
      confidence: 'Medium'
    })
  }

  return insights
}

/**
 * Detect bottlenecks in the workflow
 */
function detectBottlenecks(issues) {
  const insights = []
  const openIssues = issues.filter(i => i.state === 'opened')

  // Blocker analysis
  const blockedIssues = openIssues.filter(i =>
    i.labels.some(l => l.toLowerCase().includes('blocker') || l.toLowerCase().includes('blocked'))
  )

  const blockerRate = (blockedIssues.length / openIssues.length) * 100

  if (blockerRate > 20) {
    insights.push({
      type: 'critical',
      category: 'Bottlenecks',
      title: 'High Blocker Rate',
      description: `${blockedIssues.length} issues blocked (${Math.round(blockerRate)}% of open issues).`,
      impact: 'Critical - Team productivity severely impacted',
      recommendation: 'Immediate blocker resolution session required. Escalate to leadership if needed.',
      confidence: 'High'
    })
  } else if (blockerRate > 10) {
    insights.push({
      type: 'warning',
      category: 'Bottlenecks',
      title: 'Elevated Blocker Count',
      description: `${blockedIssues.length} issues are blocked.`,
      impact: 'Medium - Productivity impact',
      recommendation: 'Schedule daily blocker review. Assign owners to resolve each blocker.',
      confidence: 'High'
    })
  }

  // Long-running issues (open > 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const staleIssues = openIssues.filter(i => {
    const created = new Date(i.created_at)
    return created < thirtyDaysAgo
  })

  if (staleIssues.length > openIssues.length * 0.3) {
    insights.push({
      type: 'warning',
      category: 'Bottlenecks',
      title: 'High Number of Stale Issues',
      description: `${staleIssues.length} issues open for >30 days (${Math.round((staleIssues.length/openIssues.length)*100)}%).`,
      impact: 'Medium - Work in progress accumulation',
      recommendation: 'Review and close or update stale issues. Consider breaking down large issues.',
      confidence: 'Medium'
    })
  }

  return insights
}

/**
 * Analyze resource allocation and overload
 */
function analyzeResourceAllocation(issues) {
  const insights = []
  const memberMap = new Map()

  issues.forEach(issue => {
    if (issue.state !== 'opened') return

    const assignees = issue.assignees || []
    assignees.forEach(assignee => {
      const count = memberMap.get(assignee.username) || 0
      memberMap.set(assignee.username, count + 1)
    })
  })

  // Find overloaded team members (>8 open issues)
  const overloaded = Array.from(memberMap.entries())
    .filter(([_, count]) => count > 8)
    .sort((a, b) => b[1] - a[1])

  if (overloaded.length > 0) {
    insights.push({
      type: 'warning',
      category: 'Resources',
      title: 'Team Members Overloaded',
      description: `${overloaded.length} team member(s) have >8 open issues. Most loaded: ${overloaded[0][1]} issues.`,
      impact: 'High - Risk of burnout and delays',
      recommendation: `Rebalance workload. Redistribute ${Math.ceil(overloaded[0][1] * 0.3)} issues from most loaded member.`,
      confidence: 'High'
    })
  }

  // Unassigned issues
  const unassigned = issues.filter(i => i.state === 'opened' && (!i.assignees || i.assignees.length === 0))

  if (unassigned.length > 10) {
    insights.push({
      type: 'warning',
      category: 'Resources',
      title: 'Many Unassigned Issues',
      description: `${unassigned.length} issues are unassigned.`,
      impact: 'Medium - Unclear ownership',
      recommendation: 'Assign all issues to team members. Consider capacity planning.',
      confidence: 'High'
    })
  }

  return insights
}

/**
 * Analyze milestone health and risks
 */
function analyzeMilestones(issues, milestones) {
  const insights = []
  const activeMilestones = milestones.filter(m => m.state === 'active')

  activeMilestones.forEach(milestone => {
    const milestoneIssues = issues.filter(i => i.milestone?.id === milestone.id)
    const openIssues = milestoneIssues.filter(i => i.state === 'opened')
    const completionRate = ((milestoneIssues.length - openIssues.length) / milestoneIssues.length) * 100

    if (milestone.due_date) {
      const dueDate = new Date(milestone.due_date)
      const today = new Date()
      const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

      // At risk: <50% complete with <2 weeks remaining
      if (completionRate < 50 && daysRemaining < 14 && daysRemaining > 0) {
        insights.push({
          type: 'critical',
          category: 'Milestones',
          title: `Milestone At Risk: ${milestone.title}`,
          description: `Only ${Math.round(completionRate)}% complete with ${daysRemaining} days remaining.`,
          impact: 'Critical - Milestone deadline at risk',
          recommendation: `Escalate. Reduce scope or extend deadline. ${openIssues.length} issues need completion.`,
          confidence: 'High'
        })
      }

      // Overdue milestones
      if (daysRemaining < 0 && openIssues.length > 0) {
        insights.push({
          type: 'critical',
          category: 'Milestones',
          title: `Milestone Overdue: ${milestone.title}`,
          description: `${Math.abs(daysRemaining)} days overdue with ${openIssues.length} open issues.`,
          impact: 'Critical - Milestone missed',
          recommendation: 'Immediate action required. Update timeline or close incomplete work.',
          confidence: 'High'
        })
      }
    }
  })

  return insights
}

/**
 * Analyze epic health
 */
function analyzeEpics(epics) {
  const insights = []

  if (!epics || epics.length === 0) return insights

  epics.forEach(epic => {
    const issues = epic.issues || []
    const openIssues = issues.filter(i => i.state === 'opened')
    const completionRate = ((issues.length - openIssues.length) / issues.length) * 100

    if (epic.state === 'opened' && completionRate < 20 && issues.length > 5) {
      insights.push({
        type: 'info',
        category: 'Epics',
        title: `Epic Needs Attention: ${epic.title}`,
        description: `Only ${Math.round(completionRate)}% complete with ${openIssues.length} open issues.`,
        impact: 'Medium - Epic progress slow',
        recommendation: 'Review epic scope and prioritization. Consider breaking into smaller epics.',
        confidence: 'Medium'
      })
    }
  })

  return insights
}

/**
 * Analyze risk trends
 */
function analyzeRisks(risks) {
  const insights = []

  if (!risks || risks.length === 0) return insights

  const activeRisks = risks.filter(r => r.status === 'active')
  const highRisks = activeRisks.filter(r => r.probability === 'high' && r.impact === 'high')

  if (highRisks.length > 3) {
    insights.push({
      type: 'critical',
      category: 'Risks',
      title: 'Multiple High-Priority Risks',
      description: `${highRisks.length} active high-probability, high-impact risks.`,
      impact: 'Critical - Project success threatened',
      recommendation: 'Executive risk review required. Implement mitigation plans immediately.',
      confidence: 'High'
    })
  }

  return insights
}

/**
 * Forecast completion based on velocity
 */
function forecastCompletion(issues, stats) {
  const insights = []
  const velocityData = calculateVelocity(issues)

  if (velocityData.length < 2) return insights

  const avgVelocity = velocityData.slice(-3).reduce((sum, v) => sum + v.velocity, 0) / Math.min(3, velocityData.length)
  const openIssues = stats.openIssues

  if (avgVelocity > 0) {
    const weeksToComplete = Math.ceil(openIssues / (avgVelocity / 2)) // Assuming 2-week sprints
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + weeksToComplete * 14)

    if (weeksToComplete > 12) {
      insights.push({
        type: 'warning',
        category: 'Forecast',
        title: 'Extended Completion Timeline',
        description: `At current velocity (${Math.round(avgVelocity)} issues/sprint), ${weeksToComplete} weeks to complete.`,
        impact: 'Medium - Long delivery timeline',
        recommendation: 'Consider scope reduction or team augmentation.',
        confidence: 'Medium'
      })
    } else if (weeksToComplete < 4) {
      insights.push({
        type: 'success',
        category: 'Forecast',
        title: 'On Track for Completion',
        description: `Estimated ${weeksToComplete} weeks to complete at current velocity.`,
        impact: 'Positive - Delivery on schedule',
        recommendation: 'Maintain current pace. Prepare for release activities.',
        confidence: 'Medium'
      })
    }
  }

  return insights
}

/**
 * Analyze quality metrics
 */
function analyzeQuality(issues) {
  const insights = []
  const closedIssues = issues.filter(i => i.state === 'closed')

  // Bug ratio
  const bugs = issues.filter(i => i.labels.some(l => l.toLowerCase().includes('bug')))
  const bugRate = (bugs.length / issues.length) * 100

  if (bugRate > 30) {
    insights.push({
      type: 'warning',
      category: 'Quality',
      title: 'High Bug Rate',
      description: `${Math.round(bugRate)}% of issues are bugs (${bugs.length} total).`,
      impact: 'Medium - Quality concerns',
      recommendation: 'Review testing processes. Consider adding automated tests.',
      confidence: 'Medium'
    })
  }

  return insights
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Get insight statistics for dashboard
 */
export function getInsightStats(insights) {
  return {
    total: insights.length,
    critical: insights.filter(i => i.type === 'critical').length,
    warning: insights.filter(i => i.type === 'warning').length,
    info: insights.filter(i => i.type === 'info').length,
    success: insights.filter(i => i.type === 'success').length
  }
}
