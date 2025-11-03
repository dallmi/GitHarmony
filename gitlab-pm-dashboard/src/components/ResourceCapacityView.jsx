import React, { useMemo, useState, useEffect } from 'react'
import { useIterationFilter } from '../contexts/IterationFilterContext'
import TeamConfigModal from './TeamConfigModal'
import SprintCapacityModal from './SprintCapacityModal'
import {
  loadTeamConfig,
  loadCapacitySettings,
  getEstimatedHours,
  getMemberIssues,
  calculateMemberWorkload
} from '../services/teamConfigService'
import { getUniqueIterations } from '../services/velocityService'
import { getIterationName } from '../utils/labelUtils'

/**
 * Resource Capacity Planning View
 * Advanced resource management with capacity allocation and forecasting
 */
export default function ResourceCapacityView({ issues: allIssues }) {
  // Use filtered issues from iteration context
  const { filteredIssues: issues } = useIterationFilter()

  // Modal states
  const [showTeamConfig, setShowTeamConfig] = useState(false)
  const [showSprintCapacity, setShowSprintCapacity] = useState(false)

  // Team and capacity configuration
  const [teamConfig, setTeamConfig] = useState({ teamMembers: [] })
  const [capacitySettings, setCapacitySettings] = useState({
    hoursPerStoryPoint: 8,
    defaultHoursPerIssue: 4,
    defaultWeeklyCapacity: 40
  })

  // Selected sprint for detailed view
  const [selectedSprint, setSelectedSprint] = useState(null)

  // Load configuration on mount and when modals close
  useEffect(() => {
    const config = loadTeamConfig()
    const settings = loadCapacitySettings()
    setTeamConfig(config)
    setCapacitySettings(settings)
  }, [showTeamConfig, showSprintCapacity])

  // Get unique sprints
  const sprints = useMemo(() => {
    const iterations = getUniqueIterations(issues)
    return iterations
      .map(name => {
        const issue = issues.find(i => getIterationName(i.iteration) === name)
        return {
          name,
          id: issue?.iteration?.id || name,
          startDate: issue?.iteration?.start_date,
          dueDate: issue?.iteration?.due_date
        }
      })
      .sort((a, b) => {
        if (!a.startDate) return 1
        if (!b.startDate) return -1
        return new Date(b.startDate) - new Date(a.startDate)
      })
  }, [issues])

  // Default to most recent sprint
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprint) {
      setSelectedSprint(sprints[0])
    }
  }, [sprints, selectedSprint])

  // Calculate comprehensive team capacity metrics
  const capacityMetrics = useMemo(() => {
    if (!issues || issues.length === 0) {
      return { members: [], unassigned: 0, totalIssues: 0, teamMetrics: null }
    }

    const memberMap = new Map()
    let unassignedCount = 0

    // Build member issue map from assignees in issues
    issues.forEach((issue) => {
      const assignees = issue.assignees || []

      if (assignees.length === 0) {
        unassignedCount++
        return
      }

      assignees.forEach((assignee) => {
        const key = assignee.username
        if (!memberMap.has(key)) {
          // Find team config for this member
          const teamMember = teamConfig.teamMembers.find(tm => tm.username === assignee.username)

          memberMap.set(key, {
            username: assignee.username,
            name: assignee.name,
            avatar: assignee.avatar_url,
            role: teamMember?.role || 'Unknown',
            defaultCapacity: teamMember?.defaultCapacity || capacitySettings.defaultWeeklyCapacity,
            openIssues: 0,
            closedIssues: 0,
            totalIssues: 0,
            totalWeight: 0,
            issues: []
          })
        }

        const member = memberMap.get(key)
        member.totalIssues++
        member.issues.push(issue)
        member.totalWeight += (issue.weight || 0)

        if (issue.state === 'opened') {
          member.openIssues++
        } else {
          member.closedIssues++
        }
      })
    })

    // Calculate capacity metrics for each member using hours estimation
    const members = Array.from(memberMap.values()).map((member) => {
      const weeklyCapacity = member.defaultCapacity

      // Calculate allocated hours using story points and estimation
      const allocatedHours = member.issues
        .filter(i => i.state === 'opened')
        .reduce((sum, issue) => {
          return sum + getEstimatedHours(issue, capacitySettings)
        }, 0)

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
          allocatedHours: Math.round(allocatedHours * 10) / 10,
          availableHours: Math.round(availableHours * 10) / 10,
          utilization: Math.round(utilization),
          weeksToComplete,
          status,
          statusColor
        }
      }
    }).sort((a, b) => b.capacity.utilization - a.capacity.utilization)

    // Calculate team-level metrics
    const totalCapacity = members.reduce((sum, m) => sum + m.capacity.weeklyCapacity, 0)
    const totalAllocated = members.reduce((sum, m) => sum + m.capacity.allocatedHours, 0)
    const totalAvailable = totalCapacity - totalAllocated
    const teamUtilization = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0
    const overloadedMembers = members.filter(m => m.capacity.utilization >= 100).length
    const atCapacityMembers = members.filter(m => m.capacity.utilization >= 80 && m.capacity.utilization < 100).length

    const teamMetrics = {
      totalCapacity: Math.round(totalCapacity),
      totalAllocated: Math.round(totalAllocated * 10) / 10,
      totalAvailable: Math.round(totalAvailable * 10) / 10,
      teamUtilization: Math.round(teamUtilization),
      overloadedMembers,
      atCapacityMembers,
      avgUtilization: members.length > 0 ? Math.round(members.reduce((sum, m) => sum + m.capacity.utilization, 0) / members.length) : 0
    }

    return {
      members,
      unassigned: unassignedCount,
      totalIssues: issues.length,
      teamMetrics
    }
  }, [issues, capacitySettings, teamConfig])

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
          epicMap.set(epicId, { title: epicTitle, count: 0, weight: 0 })
        }
        const epic = epicMap.get(epicId)
        epic.count++
        epic.weight += (issue.weight || 0)
      })

      const epicsArray = Array.from(epicMap.values()).sort((a, b) => b.count - a.count)

      if (epicsArray.length > 2) {
        causes.push({
          severity: 'critical',
          category: 'multi-epic',
          description: `Assigned to ${epicsArray.length} different epics simultaneously`,
          impact: `Spread across: ${epicsArray.slice(0, 3).map(e => `${e.title} (${e.count} issues, ${e.weight} pts)`).join(', ')}`
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
          impact: `${excessHours.toFixed(1)} hours over capacity`
        })
        actions.push({
          priority: 'high',
          title: 'Implement WIP limits',
          description: `Move ${Math.ceil(member.openIssues * 0.3)} issues to available team members`,
          estimatedImpact: `Free up ${(excessHours * 0.3).toFixed(1)} hours`
        })
      }

      // Check for blockers
      const blockedIssues = member.issues.filter(i =>
        i.state === 'opened' &&
        (i.labels?.some(l => l.toLowerCase().includes('blocked')) ||
         i.labels?.some(l => l.toLowerCase().includes('waiting')))
      )

      if (blockedIssues.length > 0) {
        const blockedHours = blockedIssues.reduce((sum, i) => sum + getEstimatedHours(i, capacitySettings), 0)
        causes.push({
          severity: 'warning',
          category: 'blockers',
          description: `${blockedIssues.length} blocked or waiting issues`,
          impact: `${blockedHours.toFixed(1)} hours tied up in blocked work`
        })
        actions.push({
          priority: 'medium',
          title: 'Resolve blockers',
          description: `Escalate blocked issues: ${blockedIssues.slice(0, 2).map(i => i.title).join(', ')}`,
          estimatedImpact: `Free up ${blockedHours.toFixed(1)} hours`
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
        description: `Can take on additional work`,
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
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Resource Capacity Planning
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Advanced resource management with capacity allocation and forecasting
        </p>
      </div>

      {/* Configuration Actions */}
      <div className="card" style={{ marginBottom: '30px', background: '#F0F9FF', borderColor: '#BFDBFE' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#1E40AF' }}>
              Team Resource Management
            </h3>
            <div style={{ fontSize: '13px', color: '#1E40AF' }}>
              Configure your team, roles, and capacity settings to get accurate resource planning
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowTeamConfig(true)}
              style={{
                padding: '10px 20px',
                background: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Team Configuration
            </button>
            <button
              onClick={() => setShowSprintCapacity(true)}
              style={{
                padding: '10px 20px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Sprint Capacity
            </button>
          </div>
        </div>

        {/* Current Settings Display */}
        {capacitySettings.historicalData && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'white',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            <div>
              <span style={{ color: '#6B7280' }}>Hours per Story Point:</span>{' '}
              <strong style={{ color: '#1E40AF' }}>{capacitySettings.hoursPerStoryPoint}h</strong>
              <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
                (based on {capacitySettings.historicalData.sampleSize} issues)
              </span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Default Hours per Issue:</span>{' '}
              <strong style={{ color: '#1E40AF' }}>{capacitySettings.defaultHoursPerIssue}h</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Team Members:</span>{' '}
              <strong style={{ color: '#1E40AF' }}>{teamConfig.teamMembers.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TeamConfigModal
        isOpen={showTeamConfig}
        onClose={() => setShowTeamConfig(false)}
        issues={issues}
      />
      <SprintCapacityModal
        isOpen={showSprintCapacity}
        onClose={() => setShowSprintCapacity(false)}
        issues={issues}
      />

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                          {member.name}
                        </div>
                        {member.role && member.role !== 'Unknown' && (
                          <span style={{
                            padding: '3px 10px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {member.role}
                          </span>
                        )}
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

                  {/* Detailed Issue Breakdown */}
                  {member.openIssues > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>
                        Open Issues ({member.openIssues}) - {member.totalWeight} story points
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', whiteSpace: 'nowrap' }}>ID</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>Title</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>Epic</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', whiteSpace: 'nowrap' }}>Weight</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', whiteSpace: 'nowrap' }}>Est. Hours</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', whiteSpace: 'nowrap' }}>Due Date</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>State</th>
                            </tr>
                          </thead>
                          <tbody>
                            {member.issues
                              .filter(issue => issue.state === 'opened')
                              .sort((a, b) => {
                                // Sort by due date (earliest first), then weight (highest first)
                                if (a.due_date && b.due_date) {
                                  return new Date(a.due_date) - new Date(b.due_date)
                                }
                                if (a.due_date) return -1
                                if (b.due_date) return 1
                                return (b.weight || 0) - (a.weight || 0)
                              })
                              .map(issue => {
                                const estHours = getEstimatedHours(issue, capacitySettings)
                                const isOverdue = issue.due_date && new Date(issue.due_date) < new Date()
                                const isDueSoon = issue.due_date && !isOverdue && (new Date(issue.due_date) - new Date()) < (7 * 24 * 60 * 60 * 1000)

                                return (
                                  <tr key={issue.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                    <td style={{ padding: '8px 12px', color: '#6B7280' }}>
                                      #{issue.iid}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' }}>
                                        {issue.title}
                                      </div>
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '12px', color: '#6B7280' }}>
                                      <div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {issue.epic?.title || '-'}
                                      </div>
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                      {issue.weight ? (
                                        <span style={{ padding: '3px 8px', background: '#DBEAFE', color: '#1E40AF', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                                          {issue.weight}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#9CA3AF', fontSize: '12px' }}>-</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                                      {estHours.toFixed(1)}h
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '12px' }}>
                                      {issue.due_date ? (
                                        <span style={{
                                          color: isOverdue ? '#DC2626' : isDueSoon ? '#D97706' : '#6B7280',
                                          fontWeight: isOverdue || isDueSoon ? '600' : '400'
                                        }}>
                                          {new Date(issue.due_date).toLocaleDateString()}
                                          {isOverdue && ' ⚠️'}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#9CA3AF' }}>-</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '12px' }}>
                                      <span style={{
                                        padding: '3px 8px',
                                        background: '#FEF3C7',
                                        color: '#92400E',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '500'
                                      }}>
                                        {issue.state}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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
                Estimated impact: {(unassigned * capacitySettings.defaultHoursPerIssue).toFixed(1)} hours of unallocated work
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
