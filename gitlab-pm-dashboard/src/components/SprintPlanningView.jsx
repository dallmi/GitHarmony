import React, { useState, useMemo, useEffect } from 'react'
import { useIterationFilter } from '../contexts/IterationFilterContext'
import {
  loadTeamConfig,
  loadCapacitySettings,
  loadSprintCapacity,
  getEstimatedHours,
  calculateMemberWorkload
} from '../services/teamConfigService'
import { getUniqueIterations } from '../services/velocityService'
import { getIterationName } from '../utils/labelUtils'

/**
 * Sprint Planning View
 * Interactive sprint planning with capacity tracking and issue assignment
 */
export default function SprintPlanningView({ issues: allIssues }) {
  const { filteredIssues: issues } = useIterationFilter()

  // Configuration
  const [teamConfig, setTeamConfig] = useState({ teamMembers: [] })
  const [capacitySettings, setCapacitySettings] = useState({})
  const [sprintCapacity, setSprintCapacity] = useState({ sprints: [] })

  // UI State
  const [selectedSprint, setSelectedSprint] = useState(null)
  const [expandedMember, setExpandedMember] = useState(null)
  const [showBacklog, setShowBacklog] = useState(true)

  // Filters
  const [filterEpic, setFilterEpic] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterWeight, setFilterWeight] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Load configuration
  useEffect(() => {
    setTeamConfig(loadTeamConfig())
    setCapacitySettings(loadCapacitySettings())
    setSprintCapacity(loadSprintCapacity())
  }, [])

  // Get all sprints
  const sprints = useMemo(() => {
    const iterations = getUniqueIterations(issues)
    return iterations
      .map(name => {
        // Find the first issue with this iteration name
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
        return new Date(a.startDate) - new Date(b.startDate) // Upcoming first
      })
  }, [issues])

  // Default to first upcoming sprint
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprint) {
      const today = new Date()
      const upcomingSprint = sprints.find(s => s.startDate && new Date(s.startDate) >= today)
      setSelectedSprint(upcomingSprint || sprints[0])
    }
  }, [sprints, selectedSprint])

  // Get unique epics
  const epics = useMemo(() => {
    const epicMap = new Map()
    issues.forEach(issue => {
      if (issue.epic) {
        epicMap.set(issue.epic.id, issue.epic)
      }
    })
    return Array.from(epicMap.values()).sort((a, b) => a.title.localeCompare(b.title))
  }, [issues])

  // Get unique assignees
  const assignees = useMemo(() => {
    const assigneeMap = new Map()
    issues.forEach(issue => {
      issue.assignees?.forEach(assignee => {
        assigneeMap.set(assignee.username, assignee)
      })
    })
    return Array.from(assigneeMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [issues])

  // Split issues into sprint-assigned and backlog
  const { sprintIssues, backlogIssues } = useMemo(() => {
    const sprint = []
    const backlog = []

    issues.forEach(issue => {
      // Apply filters
      if (filterEpic !== 'all' && issue.epic?.id !== filterEpic) return
      if (filterAssignee !== 'all' && !issue.assignees?.some(a => a.username === filterAssignee)) return
      if (filterWeight !== 'all') {
        if (filterWeight === 'none' && issue.weight) return
        if (filterWeight === 'low' && (!issue.weight || issue.weight > 3)) return
        if (filterWeight === 'medium' && (!issue.weight || issue.weight < 4 || issue.weight > 7)) return
        if (filterWeight === 'high' && (!issue.weight || issue.weight < 8)) return
      }
      if (searchTerm && !issue.title.toLowerCase().includes(searchTerm.toLowerCase())) return

      // Only consider open issues
      if (issue.state !== 'opened') return

      // Check if assigned to selected sprint
      if (selectedSprint && issue.iteration?.id === selectedSprint.id) {
        sprint.push(issue)
      } else {
        backlog.push(issue)
      }
    })

    return { sprintIssues: sprint, backlogIssues: backlog }
  }, [issues, selectedSprint, filterEpic, filterAssignee, filterWeight, searchTerm])

  // Calculate sprint capacity and workload
  const sprintCapacityData = useMemo(() => {
    if (!selectedSprint || teamConfig.teamMembers.length === 0) return null

    const sprint = sprintCapacity.sprints.find(s => s.sprintId === selectedSprint.id)
    const members = teamConfig.teamMembers.map(member => {
      // Get capacity for this sprint (with holiday adjustments)
      const memberCap = sprint?.memberCapacity.find(m => m.username === member.username)
      const availableHours = memberCap ? memberCap.availableHours : member.defaultCapacity
      const reason = memberCap?.reason || ''

      // Calculate allocated hours from sprint issues
      const memberIssues = sprintIssues.filter(issue =>
        issue.assignees?.some(a => a.username === member.username)
      )
      const allocatedHours = memberIssues.reduce((sum, issue) =>
        sum + getEstimatedHours(issue, capacitySettings), 0
      )

      const utilization = availableHours > 0 ? (allocatedHours / availableHours) * 100 : 0

      return {
        ...member,
        availableHours,
        allocatedHours: Math.round(allocatedHours * 10) / 10,
        remainingHours: Math.round((availableHours - allocatedHours) * 10) / 10,
        utilization: Math.round(utilization),
        reason,
        issueCount: memberIssues.length,
        issues: memberIssues
      }
    })

    const totalAvailable = members.reduce((sum, m) => sum + m.availableHours, 0)
    const totalAllocated = members.reduce((sum, m) => sum + m.allocatedHours, 0)
    const totalRemaining = totalAvailable - totalAllocated

    return {
      members,
      totalAvailable: Math.round(totalAvailable),
      totalAllocated: Math.round(totalAllocated * 10) / 10,
      totalRemaining: Math.round(totalRemaining * 10) / 10,
      teamUtilization: totalAvailable > 0 ? Math.round((totalAllocated / totalAvailable) * 100) : 0
    }
  }, [selectedSprint, teamConfig, capacitySettings, sprintCapacity, sprintIssues])

  // Calculate backlog metrics
  const backlogMetrics = useMemo(() => {
    const totalWeight = backlogIssues.reduce((sum, i) => sum + (i.weight || 0), 0)
    const totalHours = backlogIssues.reduce((sum, i) => sum + getEstimatedHours(i, capacitySettings), 0)
    const unassigned = backlogIssues.filter(i => !i.assignees || i.assignees.length === 0).length

    return {
      count: backlogIssues.length,
      totalWeight,
      totalHours: Math.round(totalHours * 10) / 10,
      unassigned
    }
  }, [backlogIssues, capacitySettings])

  if (!selectedSprint) {
    return (
      <div className="container-fluid">
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Sprints Found</div>
          <div style={{ fontSize: '14px' }}>
            Make sure your issues have iterations assigned to see sprint planning
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Header with Sprint Selector */}
      <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
              Sprint Planning
            </h2>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              Plan your sprints with real-time capacity tracking
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', opacity: 0.9 }}>
                Select Sprint
              </label>
              <select
                value={selectedSprint?.name || ''}
                onChange={(e) => {
                  const sprint = sprints.find(s => s.name === e.target.value)
                  setSelectedSprint(sprint)
                }}
                style={{
                  padding: '10px 16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: '500',
                  minWidth: '250px'
                }}
              >
                {sprints.map(sprint => {
                  const isPast = sprint.dueDate && new Date(sprint.dueDate) < new Date()
                  const isCurrent = sprint.startDate && sprint.dueDate &&
                    new Date(sprint.startDate) <= new Date() && new Date(sprint.dueDate) >= new Date()

                  return (
                    <option key={sprint.id} value={sprint.name} style={{ color: '#1F2937' }}>
                      {sprint.name}
                      {isCurrent && ' (Current)'}
                      {isPast && ' (Past)'}
                      {sprint.startDate && ` - ${new Date(sprint.startDate).toLocaleDateString()}`}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Sprint Dates */}
        {selectedSprint.startDate && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            gap: '24px'
          }}>
            <div>
              <span style={{ opacity: 0.8 }}>Start:</span>{' '}
              <strong>{new Date(selectedSprint.startDate).toLocaleDateString()}</strong>
            </div>
            {selectedSprint.dueDate && (
              <>
                <div>
                  <span style={{ opacity: 0.8 }}>End:</span>{' '}
                  <strong>{new Date(selectedSprint.dueDate).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span style={{ opacity: 0.8 }}>Duration:</span>{' '}
                  <strong>
                    {Math.ceil((new Date(selectedSprint.dueDate) - new Date(selectedSprint.startDate)) / (1000 * 60 * 60 * 24))} days
                  </strong>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Capacity Overview Cards */}
      {sprintCapacityData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card">
            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Team Capacity</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937' }}>
              {sprintCapacityData.totalAvailable}h
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {teamConfig.teamMembers.length} team members
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Allocated</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#DC2626' }}>
              {sprintCapacityData.totalAllocated}h
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {sprintIssues.length} issues
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Remaining</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: sprintCapacityData.totalRemaining < 0 ? '#DC2626' : '#059669' }}>
              {sprintCapacityData.totalRemaining}h
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {sprintCapacityData.totalRemaining < 0 ? 'Over capacity!' : 'Available'}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Utilization</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: sprintCapacityData.teamUtilization >= 100 ? '#DC2626' : sprintCapacityData.teamUtilization >= 80 ? '#D97706' : '#059669' }}>
              {sprintCapacityData.teamUtilization}%
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {sprintCapacityData.teamUtilization >= 100 ? 'Overloaded' : sprintCapacityData.teamUtilization >= 80 ? 'At capacity' : 'Healthy'}
            </div>
          </div>
        </div>
      )}

      {/* Main Planning Area */}
      <div style={{ display: 'grid', gridTemplateColumns: showBacklog ? '1fr 400px' : '1fr', gap: '24px' }}>
        {/* Sprint Details */}
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom: '20px', background: '#F9FAFB' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6B7280' }}>
                  Search Issues
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title..."
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6B7280' }}>
                  Filter by Epic
                </label>
                <select
                  value={filterEpic}
                  onChange={(e) => setFilterEpic(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Epics</option>
                  {epics.map(epic => (
                    <option key={epic.id} value={epic.id}>{epic.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6B7280' }}>
                  Filter by Assignee
                </label>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Assignees</option>
                  {assignees.map(assignee => (
                    <option key={assignee.username} value={assignee.username}>{assignee.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6B7280' }}>
                  Filter by Weight
                </label>
                <select
                  value={filterWeight}
                  onChange={(e) => setFilterWeight(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Weights</option>
                  <option value="none">No Weight</option>
                  <option value="low">Low (1-3)</option>
                  <option value="medium">Medium (4-7)</option>
                  <option value="high">High (8+)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Team Member Capacity Breakdown */}
          {sprintCapacityData && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  Team Capacity Breakdown
                </h3>
                <button
                  onClick={() => setShowBacklog(!showBacklog)}
                  style={{
                    padding: '8px 16px',
                    background: showBacklog ? '#DC2626' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {showBacklog ? 'Hide' : 'Show'} Backlog
                </button>
              </div>

              {sprintCapacityData.members.map(member => {
                const isOverloaded = member.utilization >= 100
                const isAtCapacity = member.utilization >= 80 && member.utilization < 100
                const isExpanded = expandedMember === member.username

                return (
                  <div
                    key={member.username}
                    style={{
                      marginBottom: '16px',
                      padding: '16px',
                      background: isOverloaded ? '#FEF2F2' : isAtCapacity ? '#FEF3C7' : '#F9FAFB',
                      borderRadius: '8px',
                      border: `2px solid ${isOverloaded ? '#FEE2E2' : isAtCapacity ? '#FDE68A' : '#E5E7EB'}`
                    }}
                  >
                    {/* Member Header */}
                    <div
                      onClick={() => setExpandedMember(isExpanded ? null : member.username)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                            {member.name}
                          </span>
                          <span style={{
                            padding: '3px 8px',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {member.role}
                          </span>
                          {member.reason && (
                            <span style={{
                              padding: '3px 8px',
                              background: '#FEF3C7',
                              color: '#92400E',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {member.reason}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6B7280' }}>
                          {member.allocatedHours}h / {member.availableHours}h
                          {' • '}
                          {member.issueCount} issues
                          {' • '}
                          <span style={{ fontWeight: '600', color: isOverloaded ? '#DC2626' : isAtCapacity ? '#D97706' : '#059669' }}>
                            {member.utilization}% utilization
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '20px', color: '#9CA3AF' }}>
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{
                        width: '100%',
                        height: '10px',
                        background: '#E5E7EB',
                        borderRadius: '5px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(member.utilization, 100)}%`,
                          height: '100%',
                          background: isOverloaded ? '#DC2626' : isAtCapacity ? '#D97706' : '#059669',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>

                    {/* Expanded Issue List */}
                    {isExpanded && member.issues.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                              <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>ID</th>
                              <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>Title</th>
                              <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>Weight</th>
                              <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {member.issues.map(issue => {
                              const estHours = getEstimatedHours(issue, capacitySettings)
                              return (
                                <tr key={issue.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                  <td style={{ padding: '8px', color: '#6B7280' }}>#{issue.iid}</td>
                                  <td style={{ padding: '8px', color: '#374151' }}>
                                    <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {issue.title}
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    {issue.weight ? (
                                      <span style={{ padding: '2px 6px', background: '#DBEAFE', color: '#1E40AF', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                                        {issue.weight}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                                    {estHours.toFixed(1)}h
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Backlog Sidebar */}
        {showBacklog && (
          <div>
            <div className="card" style={{ position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 40px)', overflow: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                  Backlog
                </h3>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {backlogMetrics.count} issues • {backlogMetrics.totalWeight} points • {backlogMetrics.totalHours}h
                  {backlogMetrics.unassigned > 0 && (
                    <span style={{ color: '#D97706', fontWeight: '600' }}>
                      {' '} • {backlogMetrics.unassigned} unassigned
                    </span>
                  )}
                </div>
              </div>

              {backlogIssues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontSize: '14px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                  <div>All issues are assigned to sprints!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {backlogIssues.map(issue => {
                    const estHours = getEstimatedHours(issue, capacitySettings)
                    return (
                      <div
                        key={issue.id}
                        style={{
                          padding: '12px',
                          background: '#F9FAFB',
                          borderRadius: '6px',
                          border: '1px solid #E5E7EB',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                              #{issue.iid} {issue.title}
                            </div>
                            {issue.epic && (
                              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                                📦 {issue.epic.title}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {issue.weight && (
                                <span style={{ padding: '2px 6px', background: '#DBEAFE', color: '#1E40AF', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                                  {issue.weight} pts
                                </span>
                              )}
                              <span style={{ padding: '2px 6px', background: '#F3F4F6', color: '#6B7280', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                                {estHours.toFixed(1)}h
                              </span>
                              {issue.assignees && issue.assignees.length > 0 && (
                                <span style={{ padding: '2px 6px', background: '#DCFCE7', color: '#166534', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                                  {issue.assignees[0].name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                          💡 Tip: Assign to sprint in GitLab to move from backlog
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
