import React, { useMemo, useState } from 'react'
import { useIterationFilter } from '../contexts/IterationFilterContext'

/**
 * Resource Capacity Planning View
 * Advanced resource management with capacity allocation and forecasting
 */
export default function ResourceCapacityView({ issues: allIssues }) {
  // Use filtered issues from iteration context
  const { filteredIssues: issues } = useIterationFilter()
  // Default capacity: 40 hours/week per person (5 days * 8 hours)
  const [capacitySettings, setCapacitySettings] = useState({
    hoursPerWeek: 40,
    hoursPerIssue: 8, // Estimated hours per issue
    planningHorizon: 4 // Weeks to forecast
  })

  // Calculate comprehensive team capacity metrics
  const capacityMetrics = useMemo(() => {
    if (!issues || issues.length === 0) {
      return { members: [], unassigned: 0, totalIssues: 0, teamMetrics: null }
    }

    const memberMap = new Map()
    let unassignedCount = 0

    issues.forEach((issue) => {
      const assignees = issue.assignees || []

      if (assignees.length === 0) {
        unassignedCount++
        return
      }

      assignees.forEach((assignee) => {
        const key = assignee.username
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            username: assignee.username,
            name: assignee.name,
            avatar: assignee.avatar_url,
            openIssues: 0,
            closedIssues: 0,
            totalIssues: 0,
            issues: []
          })
        }

        const member = memberMap.get(key)
        member.totalIssues++
        member.issues.push(issue)

        if (issue.state === 'opened') {
          member.openIssues++
        } else {
          member.closedIssues++
        }
      })
    })

    // Calculate capacity metrics for each member
    const members = Array.from(memberMap.values()).map((member) => {
      const weeklyCapacity = capacitySettings.hoursPerWeek
      const allocatedHours = member.openIssues * capacitySettings.hoursPerIssue
      const utilization = (allocatedHours / weeklyCapacity) * 100
      const availableHours = Math.max(0, weeklyCapacity - allocatedHours)
      const weeksToComplete = Math.ceil(allocatedHours / weeklyCapacity)

      // Determine capacity status
      let status = 'Available'
      let statusColor = '#059669'
      if (utilization >= 100) {
        status = 'Overloaded'
        statusColor = '#DC2626'
      } else if (utilization >= 80) {
        status = 'At Capacity'
        statusColor = '#D97706'
      } else if (utilization >= 60) {
        status = 'Busy'
        statusColor = '#2563EB'
      }

      return {
        ...member,
        capacity: {
          weeklyCapacity,
          allocatedHours,
          availableHours,
          utilization: Math.round(utilization),
          weeksToComplete,
          status,
          statusColor
        }
      }
    }).sort((a, b) => b.capacity.utilization - a.capacity.utilization)

    // Calculate team-level metrics
    const totalCapacity = members.length * capacitySettings.hoursPerWeek
    const totalAllocated = members.reduce((sum, m) => sum + m.capacity.allocatedHours, 0)
    const totalAvailable = totalCapacity - totalAllocated
    const teamUtilization = (totalAllocated / totalCapacity) * 100
    const overloadedMembers = members.filter(m => m.capacity.utilization >= 100).length
    const atCapacityMembers = members.filter(m => m.capacity.utilization >= 80 && m.capacity.utilization < 100).length

    const teamMetrics = {
      totalCapacity,
      totalAllocated,
      totalAvailable,
      teamUtilization: Math.round(teamUtilization),
      overloadedMembers,
      atCapacityMembers,
      avgUtilization: Math.round(members.reduce((sum, m) => sum + m.capacity.utilization, 0) / members.length || 0)
    }

    return {
      members,
      unassigned: unassignedCount,
      totalIssues: issues.length,
      teamMetrics
    }
  }, [issues, capacitySettings])

  const { members, unassigned, teamMetrics } = capacityMetrics

  // Get root cause analysis for capacity issues
  const getCapacityRootCause = (member) => {
    const causes = []
    const actions = []

    if (member.capacity.utilization >= 100) {
      // Analyze why overloaded
      const excessHours = member.capacity.allocatedHours - member.capacity.weeklyCapacity

      // Check issue distribution across epics
      const epicMap = new Map()
      member.issues.filter(i => i.state === 'opened').forEach(issue => {
        const epicId = issue.epic?.id || 'no-epic'
        const epicTitle = issue.epic?.title || 'No Epic'
        if (!epicMap.has(epicId)) {
          epicMap.set(epicId, { title: epicTitle, count: 0 })
        }
        epicMap.get(epicId).count++
      })

      const epicsArray = Array.from(epicMap.values()).sort((a, b) => b.count - a.count)

      if (epicsArray.length > 2) {
        causes.push({
          severity: 'critical',
          category: 'multi-epic',
          description: `Assigned to ${epicsArray.length} different epics simultaneously`,
          impact: `Spread across: ${epicsArray.slice(0, 3).map(e => `${e.title} (${e.count})`).join(', ')}`
        })
        actions.push({
          priority: 'high',
          title: 'Focus on fewer epics',
          description: `Reduce to 1-2 epics. Consider moving ${epicsArray[epicsArray.length - 1].title} issues to another team member`,
          estimatedImpact: `Reduce context switching, improve focus`
        })
      }

      if (member.openIssues > 8) {
        causes.push({
          severity: 'critical',
          category: 'wip',
          description: `Too many open issues (${member.openIssues}) - WIP limit exceeded`,
          impact: `${excessHours.toFixed(0)} hours over capacity`
        })
        actions.push({
          priority: 'high',
          title: 'Implement WIP limits',
          description: `Move ${Math.ceil(member.openIssues * 0.3)} issues to available team members`,
          estimatedImpact: `Free up ${(excessHours * 0.3).toFixed(0)} hours`
        })
      }

      // Check for blockers
      const blockedIssues = member.issues.filter(i =>
        i.state === 'opened' &&
        (i.labels?.some(l => l.toLowerCase().includes('blocked')) ||
         i.labels?.some(l => l.toLowerCase().includes('waiting')))
      )

      if (blockedIssues.length > 0) {
        causes.push({
          severity: 'warning',
          category: 'blockers',
          description: `${blockedIssues.length} blocked or waiting issues`,
          impact: `${blockedIssues.length * capacitySettings.hoursPerIssue} hours tied up in blocked work`
        })
        actions.push({
          priority: 'medium',
          title: 'Resolve blockers',
          description: `Escalate blocked issues: ${blockedIssues.slice(0, 2).map(i => i.title).join(', ')}`,
          estimatedImpact: `Free up ${(blockedIssues.length * capacitySettings.hoursPerIssue).toFixed(0)} hours`
        })
      }
    } else if (member.capacity.utilization >= 80) {
      causes.push({
        severity: 'warning',
        category: 'at-capacity',
        description: `Operating at ${member.capacity.utilization}% capacity`,
        impact: `Only ${member.capacity.availableHours} hours available`
      })
      actions.push({
        priority: 'medium',
        title: 'Monitor workload closely',
        description: 'Avoid assigning new work until current issues are completed',
        estimatedImpact: 'Prevent overload'
      })
    } else if (member.capacity.utilization < 50) {
      causes.push({
        severity: 'info',
        category: 'underutilized',
        description: `Operating at only ${member.capacity.utilization}% capacity`,
        impact: `${member.capacity.availableHours} hours available`
      })
      actions.push({
        priority: 'low',
        title: 'Assign more work',
        description: `Can take on ${Math.floor(member.capacity.availableHours / capacitySettings.hoursPerIssue)} more issues`,
        estimatedImpact: 'Better team balance'
      })
    }

    return { causes, actions }
  }

  // Get rebalancing recommendations
  const getRebalancingRecommendations = () => {
    if (!members || members.length < 2) return []

    const overloaded = members.filter(m => m.capacity.utilization > 100)
    const available = members.filter(m => m.capacity.utilization < 80)

    const recommendations = []

    overloaded.forEach(overloadedMember => {
      if (available.length > 0) {
        const bestMatch = available[0]
        const issuestoMove = Math.ceil(overloadedMember.openIssues * 0.3)

        recommendations.push({
          from: overloadedMember.name,
          to: bestMatch.name,
          issues: issuestoMove,
          impact: `Would reduce ${overloadedMember.name}'s utilization by ~30%`
        })
      }
    })

    return recommendations
  }

  const recommendations = getRebalancingRecommendations()

  return (
    <div className="container-fluid">
      {/* Capacity Settings */}
      <div className="card" style={{ marginBottom: '30px', background: '#F9FAFB' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Capacity Planning Settings
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
              Hours per Week (per person)
            </label>
            <input
              type="number"
              value={capacitySettings.hoursPerWeek}
              onChange={(e) => setCapacitySettings({ ...capacitySettings, hoursPerWeek: parseInt(e.target.value) || 40 })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
              Estimated Hours per Issue
            </label>
            <input
              type="number"
              value={capacitySettings.hoursPerIssue}
              onChange={(e) => setCapacitySettings({ ...capacitySettings, hoursPerIssue: parseInt(e.target.value) || 8 })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
              Planning Horizon (weeks)
            </label>
            <input
              type="number"
              value={capacitySettings.planningHorizon}
              onChange={(e) => setCapacitySettings({ ...capacitySettings, planningHorizon: parseInt(e.target.value) || 4 })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Team Summary Cards */}
      {teamMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Team Utilization</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: teamMetrics.teamUtilization >= 90 ? '#DC2626' : teamMetrics.teamUtilization >= 70 ? '#D97706' : '#059669' }}>
              {teamMetrics.teamUtilization}%
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Avg: {teamMetrics.avgUtilization}%
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Capacity</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>
              {teamMetrics.totalCapacity}h
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              per week
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Allocated</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#DC2626' }}>
              {teamMetrics.totalAllocated}h
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {teamMetrics.totalAvailable}h available
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Capacity Issues</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: teamMetrics.overloadedMembers > 0 ? '#DC2626' : '#059669' }}>
              {teamMetrics.overloadedMembers}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {teamMetrics.atCapacityMembers} at capacity
            </div>
          </div>
        </div>
      )}

      {/* Rebalancing Recommendations */}
      {recommendations.length > 0 && (
        <div className="card" style={{ marginBottom: '30px', background: '#FEF3C7', borderColor: '#D97706' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400E', marginBottom: '16px' }}>
            ⚖️ Workload Rebalancing Recommendations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'white', borderRadius: '6px', fontSize: '14px' }}>
                <div style={{ fontWeight: '600', color: '#78350F', marginBottom: '4px' }}>
                  Move {rec.issues} issue{rec.issues > 1 ? 's' : ''} from {rec.from} → {rec.to}
                </div>
                <div style={{ fontSize: '12px', color: '#92400E' }}>
                  {rec.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members Capacity */}
      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Team Capacity Planning</h2>

        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
            No team members found. Assign issues to team members to see capacity planning.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {members.map((member) => {
              const cap = member.capacity

              return (
                <div
                  key={member.username}
                  style={{
                    padding: '16px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    border: `2px solid ${cap.statusColor}20`
                  }}
                >
                  {/* Member Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    {member.avatar && (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6B7280' }}>
                        @{member.username}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '6px 16px',
                        background: cap.statusColor + '20',
                        color: cap.statusColor,
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      {cap.status}
                    </div>
                  </div>

                  {/* Capacity Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>UTILIZATION</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: cap.statusColor }}>
                        {cap.utilization}%
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>ALLOCATED</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626' }}>
                        {cap.allocatedHours}h
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>of {cap.weeklyCapacity}h/week</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>AVAILABLE</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                        {cap.availableHours}h
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>this week</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>TIME TO COMPLETE</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563EB' }}>
                        {cap.weeksToComplete}w
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>at current rate</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>OPEN ISSUES</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>
                        {member.openIssues}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>COMPLETION RATE</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                        {Math.round((member.closedIssues / member.totalIssues) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Utilization Bar */}
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                      Capacity Utilization: {cap.allocatedHours}h / {cap.weeklyCapacity}h
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '12px',
                        background: '#E5E7EB',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(cap.utilization, 100)}%`,
                          height: '100%',
                          background: cap.statusColor,
                          transition: 'width 0.3s ease'
                        }}
                      />
                      {cap.utilization > 100 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: `repeating-linear-gradient(45deg, ${cap.statusColor}, ${cap.statusColor} 10px, ${cap.statusColor}dd 10px, ${cap.statusColor}dd 20px)`
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Root Cause Analysis */}
                  {(() => {
                    const { causes, actions } = getCapacityRootCause(member)

                    if (causes.length === 0) return null

                    return (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#F3F4F6', borderRadius: '6px', fontSize: '13px' }}>
                        {/* Causes */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                            🔍 Root Cause Analysis:
                          </div>
                          {causes.map((cause, idx) => (
                            <div key={idx} style={{ marginBottom: '8px', paddingLeft: '8px', borderLeft: `3px solid ${cause.severity === 'critical' ? '#DC2626' : cause.severity === 'warning' ? '#D97706' : '#6B7280'}` }}>
                              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '2px' }}>
                                {cause.severity === 'critical' && '🔴'} {cause.severity === 'warning' && '🟡'} {cause.severity === 'info' && 'ℹ️'} {cause.description}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                {cause.impact}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        {actions.length > 0 && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                              💡 Recommended Actions:
                            </div>
                            {actions.map((action, idx) => (
                              <div key={idx} style={{ marginBottom: '8px', paddingLeft: '8px', borderLeft: '3px solid #2563EB' }}>
                                <div style={{ fontWeight: '600', color: '#374151', marginBottom: '2px' }}>
                                  {action.title}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
                                  {action.description}
                                </div>
                                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                  Impact: {action.estimatedImpact}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Unassigned Issues Warning */}
      {unassigned > 0 && (
        <div
          className="card"
          style={{
            marginTop: '20px',
            background: '#FEF3C7',
            borderColor: '#D97706'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>⚠️</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>
                {unassigned} Unassigned Issues
              </div>
              <div style={{ fontSize: '14px', color: '#78350F' }}>
                Estimated impact: {unassigned * capacitySettings.hoursPerIssue} hours of unallocated work
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
