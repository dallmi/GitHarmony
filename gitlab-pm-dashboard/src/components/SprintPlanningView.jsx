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
import SearchableSelect from './SearchableSelect'

/**
 * Sprint Planning View
 * Interactive sprint planning with capacity tracking and issue assignment
 */
export default function SprintPlanningView({ issues: allIssues }) {
  const { filteredIssues } = useIterationFilter()

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

  // PERFORMANCE OPTIMIZATION: Filter issues by timeframe FIRST
  // Only process issues from last 6 months + future (sprint planning doesn't need old history)
  // This dramatically reduces the dataset for all subsequent calculations
  const issues = useMemo(() => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    return filteredIssues.filter(issue => {
      // Always include open issues (regardless of date)
      if (issue.state === 'opened') return true

      // For closed issues, only include recent ones (last 6 months)
      if (issue.closed_at) {
        const closedDate = new Date(issue.closed_at)
        return closedDate >= sixMonthsAgo
      }

      // For issues with updated_at but no closed_at
      if (issue.updated_at) {
        const updatedDate = new Date(issue.updated_at)
        return updatedDate >= sixMonthsAgo
      }

      // Include issues with future dates
      if (issue.due_date) {
        const dueDate = new Date(issue.due_date)
        return dueDate >= sixMonthsAgo
      }

      // Default: exclude very old issues without dates
      return false
    })
  }, [filteredIssues])

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
        return new Date(b.startDate) - new Date(a.startDate) // Most recent first (descending)
      })
  }, [issues])

  // Default to current or most recent sprint
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprint) {
      const today = new Date()
      // Find current sprint (start <= today <= due)
      const currentSprint = sprints.find(s =>
        s.startDate && s.dueDate &&
        new Date(s.startDate) <= today &&
        new Date(s.dueDate) >= today
      )
      // Otherwise use most recent sprint (first in descending list)
      setSelectedSprint(currentSprint || sprints[0])
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

      // Enhanced search: title, epic, assignees, weight, issue ID
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const titleMatch = issue.title.toLowerCase().includes(search)
        const epicMatch = issue.epic?.title.toLowerCase().includes(search)
        const assigneeMatch = issue.assignees?.some(a =>
          a.name.toLowerCase().includes(search) || a.username.toLowerCase().includes(search)
        )
        const weightMatch = issue.weight && issue.weight.toString().includes(search)
        const idMatch = issue.iid.toString().includes(search)

        if (!titleMatch && !epicMatch && !assigneeMatch && !weightMatch && !idMatch) return
      }

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
      {/* Header */}
      <div className="card" style={{ marginBottom: '24px', background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#1F2937' }}>
            Sprint Planning: {selectedSprint?.name}
          </h2>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>
            Plan your sprints with real-time capacity tracking. Use the iteration filter at the top to switch sprints.
          </div>
        </div>

        {/* Sprint Dates */}
        {selectedSprint.startDate && (() => {
          const today = new Date()
          const startDate = new Date(selectedSprint.startDate)
          const dueDate = selectedSprint.dueDate ? new Date(selectedSprint.dueDate) : null
          const totalDays = dueDate ? Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24)) : 0
          const daysElapsed = Math.max(0, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)))
          const daysRemaining = dueDate ? Math.max(0, Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))) : 0
          const progressPercent = dueDate && totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0
          const isOverdue = dueDate && today > dueDate
          const isCurrent = startDate <= today && (!dueDate || dueDate >= today)

          return (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#F9FAFB',
              borderRadius: '8px',
              fontSize: '13px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ display: 'flex', gap: '24px', marginBottom: dueDate ? '12px' : '0' }}>
                <div>
                  <span style={{ color: '#6B7280' }}>Start:</span>{' '}
                  <strong style={{ color: '#1F2937' }}>{startDate.toLocaleDateString()}</strong>
                </div>
                {dueDate && (
                  <>
                    <div>
                      <span style={{ color: '#6B7280' }}>End:</span>{' '}
                      <strong style={{ color: '#1F2937' }}>{dueDate.toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Duration:</span>{' '}
                      <strong style={{ color: '#1F2937' }}>{totalDays} days</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>
                        {isOverdue ? 'Overdue:' : isCurrent ? 'Remaining:' : 'Starts in:'}
                      </span>{' '}
                      <strong style={{ color: isOverdue ? '#DC2626' : '#E60000' }}>
                        {isOverdue
                          ? `${Math.abs(daysRemaining)} days`
                          : isCurrent
                          ? `${daysRemaining} days`
                          : `${Math.abs(daysElapsed)} days`}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Progress:</span>{' '}
                      <strong style={{ color: '#1F2937' }}>{Math.round(progressPercent)}%</strong>
                    </div>
                  </>
                )}
              </div>
              {dueDate && (
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: '#E5E7EB',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: isOverdue ? '#DC2626' : '#E60000',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Team Configuration Required Message */}
      {teamConfig.teamMembers.length === 0 && (
        <div className="card" style={{ marginBottom: '24px', background: '#FEF3C7', border: '2px solid #F59E0B' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#92400E' }}>
                Team Configuration Required
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#78350F', lineHeight: '1.5' }}>
                To use Sprint Planning and capacity tracking, you need to configure your team members first.
                Team configuration is project-specific, so each project in your portfolio needs its own team setup.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'white',
                  borderRadius: '6px',
                  fontSize: '13px',
                  border: '1px solid #F59E0B'
                }}>
                  <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>
                    Step 1: Configure Team
                  </div>
                  <div style={{ color: '#78350F' }}>
                    Go to <strong>Resources → Team Configuration</strong> and add team members
                  </div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  background: 'white',
                  borderRadius: '6px',
                  fontSize: '13px',
                  border: '1px solid #F59E0B'
                }}>
                  <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>
                    Step 2: Set Capacity
                  </div>
                  <div style={{ color: '#78350F' }}>
                    Configure weekly capacity and story point conversion rates
                  </div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  background: 'white',
                  borderRadius: '6px',
                  fontSize: '13px',
                  border: '1px solid #F59E0B'
                }}>
                  <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>
                    Quick Start
                  </div>
                  <div style={{ color: '#78350F' }}>
                    Use <strong>"Import from Issues"</strong> to automatically detect team members
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  placeholder="Search by title, epic, assignee, weight, or #ID..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <SearchableSelect
                label="Filter by Epic"
                value={filterEpic}
                onChange={setFilterEpic}
                placeholder="All Epics"
                options={[
                  { value: 'all', label: 'All Epics' },
                  ...epics.map(epic => ({
                    value: epic.id,
                    label: epic.title
                  }))
                ]}
              />

              <SearchableSelect
                label="Filter by Assignee"
                value={filterAssignee}
                onChange={setFilterAssignee}
                placeholder="All Assignees"
                options={[
                  { value: 'all', label: 'All Assignees' },
                  ...assignees.map(assignee => ({
                    value: assignee.username,
                    label: assignee.name,
                    subtitle: assignee.username
                  }))
                ]}
              />

              <SearchableSelect
                label="Filter by Weight"
                value={filterWeight}
                onChange={setFilterWeight}
                placeholder="All Weights"
                options={[
                  { value: 'all', label: 'All Weights' },
                  { value: 'none', label: 'No Weight' },
                  { value: 'low', label: 'Low (1-3)' },
                  { value: 'medium', label: 'Medium (4-7)' },
                  { value: 'high', label: 'High (8+)' }
                ]}
              />
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
