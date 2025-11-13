import React, { useState, useMemo } from 'react'
import { analyzeCapacityIssues } from '../../services/capacityAnalysisService'
import { calculateAbsenceImpact, getUserAbsences } from '../../services/absenceService'
import { getSprintFromLabels } from '../../utils/labelUtils'
import IssueReallocationDialog from './IssueReallocationDialog'
import { batchUpdateIssueAssignees } from '../../services/gitlabApi'
import { loadConfig } from '../../services/storageService'

/**
 * Team Capacity Cards
 * Shows team members in card view with current capacity and workload
 * Adapted from ResourceCapacityView but focused on current state
 */
export default function TeamCapacityCards({ teamMembers, issues, milestones, sprintCapacity, crossProjectMode }) {
  const [selectedMember, setSelectedMember] = useState(null)
  const [viewMode, setViewMode] = useState('cards') // cards or table
  const [showOnlyOpen, setShowOnlyOpen] = useState(true) // Default to showing only open issues
  const [showReallocationSuggestions, setShowReallocationSuggestions] = useState(false)
  const [reallocationDialog, setReallocationDialog] = useState(null)

  // Detect current iteration from filtered issues
  const currentIterationDates = useMemo(() => {
    if (!issues || issues.length === 0) return null

    // Get all iterations from issues and find the most common one (likely the current)
    const iterationMap = new Map()
    issues.forEach(issue => {
      const iterationName = getSprintFromLabels(issue.labels, issue.iteration)
      if (iterationName && issue.iteration?.start_date && issue.iteration?.due_date) {
        if (!iterationMap.has(iterationName)) {
          iterationMap.set(iterationName, {
            name: iterationName,
            startDate: new Date(issue.iteration.start_date),
            dueDate: new Date(issue.iteration.due_date),
            count: 0
          })
        }
        iterationMap.get(iterationName).count++
      }
    })

    // If we have iterations, return the most common one
    if (iterationMap.size > 0) {
      const iterations = Array.from(iterationMap.values())
      iterations.sort((a, b) => b.count - a.count)
      return iterations[0]
    }

    // Fallback to current 2-week period
    const today = new Date()
    const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    return {
      name: 'Current Period',
      startDate: today,
      dueDate: twoWeeksFromNow
    }
  }, [issues])

  // Calculate member capacity and workload
  const memberCapacityData = useMemo(() => {
    if (!teamMembers || !issues) return []

    // Filter issues based on open/closed state
    const workingIssues = showOnlyOpen
      ? issues.filter(issue => issue.state === 'opened')
      : issues

    return teamMembers.map(member => {
      // Get issues assigned to this member
      const memberIssues = workingIssues.filter(issue =>
        issue.assignee?.username === member.username
      )

      // Calculate story points
      const storyPoints = memberIssues.reduce((sum, issue) => {
        const sp = issue.labels?.find(l => l.startsWith('sp::'))?.replace('sp::', '') || '0'
        return sum + parseInt(sp)
      }, 0)

      // Get member's default capacity
      const memberDefaultCapacity = member.defaultCapacity !== undefined && member.defaultCapacity !== null ? member.defaultCapacity : 40

      // Calculate absence impact for current iteration
      let absenceHours = 0
      let absenceDays = 0
      let memberAbsences = []

      if (currentIterationDates) {
        absenceHours = calculateAbsenceImpact(
          member.username,
          currentIterationDates.startDate,
          currentIterationDates.dueDate,
          memberDefaultCapacity
        )

        memberAbsences = getUserAbsences(
          member.username,
          currentIterationDates.startDate,
          currentIterationDates.dueDate
        )

        // Calculate working days for absences
        memberAbsences.forEach(absence => {
          const overlapStart = absence.startDate > currentIterationDates.startDate
            ? absence.startDate : currentIterationDates.startDate
          const overlapEnd = absence.endDate < currentIterationDates.dueDate
            ? absence.endDate : currentIterationDates.dueDate

          let workDays = 0
          const current = new Date(overlapStart)
          while (current <= overlapEnd) {
            const dayOfWeek = current.getDay()
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              workDays++
            }
            current.setDate(current.getDate() + 1)
          }
          absenceDays += workDays
        })
      }

      // Calculate actual available capacity (default - absences)
      const currentCapacity = Math.max(0, memberDefaultCapacity - absenceHours)

      // Calculate utilization based on actual available capacity
      const hoursAllocated = storyPoints * 6 // Assuming 6 hours per story point
      const utilization = currentCapacity > 0 ? Math.round((hoursAllocated / currentCapacity) * 100) : 0

      // Determine status
      let status = 'available'
      let statusColor = '#10B981'
      if (utilization >= 100) {
        status = 'overloaded'
        statusColor = '#DC2626'
      } else if (utilization >= 80) {
        status = 'at-capacity'
        statusColor = '#F59E0B'
      } else if (utilization >= 60) {
        status = 'busy'
        statusColor = '#3B82F6'
      }

      // Count issue states
      const issueStates = {
        open: memberIssues.filter(i => i.state === 'opened').length,
        inProgress: memberIssues.filter(i =>
          i.labels?.some(l => l.toLowerCase().includes('doing') || l.toLowerCase().includes('progress'))
        ).length,
        blocked: memberIssues.filter(i =>
          i.labels?.some(l => l.toLowerCase() === 'blocker' || l.toLowerCase().includes('blocked'))
        ).length
      }

      return {
        ...member,
        storyPoints,
        hoursAllocated,
        currentCapacity,
        baseCapacity: memberDefaultCapacity,
        absenceHours,
        absenceDays,
        absences: memberAbsences,
        utilization,
        status,
        statusColor,
        issueCount: memberIssues.length,
        issueStates,
        issues: memberIssues
      }
    })
  }, [teamMembers, issues, currentIterationDates, showOnlyOpen])

  // Analyze capacity issues for recommendations
  const capacityAnalysis = useMemo(() => {
    if (!memberCapacityData.length) return null
    return analyzeCapacityIssues(memberCapacityData)
  }, [memberCapacityData])

  // Group members by status for better visualization
  const membersByStatus = useMemo(() => {
    return {
      overloaded: memberCapacityData.filter(m => m.status === 'overloaded'),
      atCapacity: memberCapacityData.filter(m => m.status === 'at-capacity'),
      busy: memberCapacityData.filter(m => m.status === 'busy'),
      available: memberCapacityData.filter(m => m.status === 'available')
    }
  }, [memberCapacityData])

  // Calculate reallocation suggestions
  const reallocationSuggestions = useMemo(() => {
    if (!memberCapacityData.length) return []

    const suggestions = []

    // Find overloaded members
    const overloadedMembers = memberCapacityData.filter(m => m.utilization >= 100)

    // Find underutilized members with same role
    overloadedMembers.forEach(overloaded => {
      const availableMembers = memberCapacityData.filter(m =>
        m.role === overloaded.role &&
        m.utilization < 60 &&
        m.username !== overloaded.username
      )

      if (availableMembers.length > 0) {
        // Calculate how many hours need to be reallocated
        const excessHours = overloaded.hoursAllocated - overloaded.currentCapacity
        const excessStoryPoints = Math.ceil(excessHours / 6)

        availableMembers.forEach(available => {
          const availableHours = available.currentCapacity - available.hoursAllocated
          const canTakeStoryPoints = Math.floor(availableHours / 6)

          if (canTakeStoryPoints > 0) {
            suggestions.push({
              from: overloaded,
              to: available,
              suggestedStoryPoints: Math.min(excessStoryPoints, canTakeStoryPoints),
              suggestedHours: Math.min(excessHours, availableHours),
              reason: `${overloaded.name || overloaded.username} is at ${overloaded.utilization}% utilization while ${available.name || available.username} is only at ${available.utilization}%`
            })
          }
        })
      }
    })

    return suggestions
  }, [memberCapacityData])

  // Handle issue reassignment
  const handleReassignIssues = async (issuesToReassign, fromMember, toMember) => {
    console.log(`Reassigning ${issuesToReassign.length} issues from ${fromMember.username} to ${toMember.username}`)

    // Get GitLab configuration
    const config = loadConfig()
    if (!config.token) {
      alert('GitLab API token not configured. Please configure your GitLab connection first.')
      return
    }

    // Check if we have the assignee ID
    if (!toMember.id) {
      alert(`Cannot reassign: User ${toMember.username} does not have a GitLab user ID. Please ensure team members are properly configured with their GitLab user IDs.`)
      return
    }

    try {
      // Call GitLab API to update assignees
      const results = await batchUpdateIssueAssignees(
        config.gitlabUrl,
        config.projectId,
        issuesToReassign,
        toMember.id,
        config.token,
        (progress) => {
          // Could update UI with progress here if needed
          console.log(`Updating issue ${progress.current}/${progress.total}: #${progress.issue.iid}`)
        }
      )

      // Show results
      if (results.failed.length === 0) {
        alert(`Successfully reassigned ${results.successful.length} issue(s) from ${fromMember.name || fromMember.username} to ${toMember.name || toMember.username}.\n\nThe changes have been applied in GitLab.`)
      } else {
        alert(`Reassignment partially completed:\n\n✓ ${results.successful.length} issues successfully reassigned\n✗ ${results.failed.length} issues failed\n\nFailed issues:\n${results.failed.map(f => `#${f.issue.iid}: ${f.error}`).join('\n')}\n\nPlease check the console for details.`)
        console.error('Failed reassignments:', results.failed)
      }

      // Close dialog
      setReallocationDialog(null)

      // Trigger a refresh of the data
      // In a real app, you'd probably want to refresh the issues list here
      // For now, just log that we should refresh
      console.log('Note: You may need to refresh the page to see updated assignments')

    } catch (error) {
      console.error('Error during reassignment:', error)
      alert(`Error reassigning issues: ${error.message}\n\nPlease check the console for details.`)
    }
  }

  const renderMemberCard = (member) => (
    <div
      key={member.username}
      onClick={() => setSelectedMember(member)}
      style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        borderLeft: `4px solid ${member.statusColor}`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header with Avatar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', width: '48px', height: '48px' }}>
          {member.avatarUrl && (
            <img
              src={member.avatarUrl}
              alt={member.name || member.username}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #E5E7EB',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          )}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: '#6B7280',
            fontWeight: '600'
          }}>
            {(member.name || member.username || '?').charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Name and Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
            {member.name || member.username}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
            {member.username && <span>@{member.username}</span>}
            {member.gpn && <span> • GPN: {member.gpn}</span>}
            {member.tNumber && <span> • T: {member.tNumber}</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <span style={{
              padding: '2px 8px',
              background: '#EEF2FF',
              color: '#4F46E5',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {member.role}
            </span>
            <span style={{
              padding: '2px 8px',
              background: member.statusColor + '20',
              color: member.statusColor,
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {member.status.replace('-', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Utilization Badge */}
        <div style={{
          textAlign: 'center',
          minWidth: '60px'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: member.statusColor
          }}>
            {member.utilization}%
          </div>
          <div style={{ fontSize: '10px', color: '#6B7280' }}>Utilization</div>
        </div>
      </div>

      {/* Capacity Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '12px',
        padding: '12px',
        background: '#F9FAFB',
        borderRadius: '6px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Capacity</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
            {member.currentCapacity}h
            {member.absenceHours > 0 && (
              <span style={{ fontSize: '11px', color: '#DC2626' }}>
                {' '}(-{member.absenceHours}h)
              </span>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Allocated</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
            {member.hoursAllocated}h
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Available</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#10B981' }}>
            {Math.max(0, member.currentCapacity - member.hoursAllocated)}h
          </div>
        </div>
      </div>

      {/* Absence Warning if applicable */}
      {member.absenceDays > 0 && (
        <div style={{
          marginBottom: '12px',
          padding: '8px 12px',
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#92400E'
        }}>
          <strong>Absence Impact:</strong> {member.absenceDays} day{member.absenceDays !== 1 ? 's' : ''} ({member.absenceHours}h)
          {member.absences.length > 0 && (
            <div style={{ marginTop: '4px', fontSize: '11px' }}>
              {member.absences.map((absence, idx) => (
                <div key={idx}>
                  • {absence.reason || absence.type}: {new Date(absence.startDate).toLocaleDateString('de-DE')} - {new Date(absence.endDate).toLocaleDateString('de-DE')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Issue Summary */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '12px',
        borderTop: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          <span style={{ color: '#6B7280' }}>
            <strong>{member.issueCount}</strong> {showOnlyOpen ? 'open' : 'total'} issues
          </span>
          <span style={{ color: '#6B7280' }}>
            <strong>{member.storyPoints}</strong> SP
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {member.issueStates.blocked > 0 && (
            <div style={{
              padding: '2px 8px',
              background: '#FEE2E2',
              color: '#DC2626',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {member.issueStates.blocked} BLOCKED
            </div>
          )}
          {showOnlyOpen && member.status === 'overloaded' && (
            <div style={{
              padding: '2px 8px',
              background: '#FEF3C7',
              color: '#92400E',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              NEEDS HELP
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Iteration Context */}
      {currentIterationDates && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#1E40AF'
        }}>
          <strong>Capacity for {currentIterationDates.name}:</strong>{' '}
          {currentIterationDates.startDate.toLocaleDateString('de-DE')} - {currentIterationDates.dueDate.toLocaleDateString('de-DE')}
          {' '}• Absence impacts are calculated for this period
        </div>
      )}

      {/* Controls Section */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: '#F9FAFB',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        {/* View Mode and Filters */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'cards' ? '#3B82F6' : 'white',
                color: viewMode === 'cards' ? 'white' : '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'table' ? '#3B82F6' : 'white',
                color: viewMode === 'table' ? 'white' : '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Table View
            </button>
          </div>

          {/* Summary Stats */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            {membersByStatus.overloaded.length > 0 && (
              <span style={{ color: '#DC2626', fontWeight: '600' }}>
                {membersByStatus.overloaded.length} Overloaded
              </span>
            )}
            {membersByStatus.atCapacity.length > 0 && (
              <span style={{ color: '#F59E0B', fontWeight: '600' }}>
                {membersByStatus.atCapacity.length} At Capacity
              </span>
            )}
            <span style={{ color: '#10B981', fontWeight: '600' }}>
              {membersByStatus.available.length} Available
            </span>
          </div>
        </div>

        {/* Filter Options */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Show only open issues checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#374151',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showOnlyOpen}
                onChange={(e) => setShowOnlyOpen(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Show only open issues</span>
              <span style={{
                padding: '2px 8px',
                background: showOnlyOpen ? '#DCFCE7' : '#F3F4F6',
                color: showOnlyOpen ? '#166534' : '#6B7280',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: '500'
              }}>
                {showOnlyOpen ? 'Active' : 'All'}
              </span>
            </label>

            {/* Show reallocation suggestions checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#374151',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showReallocationSuggestions}
                onChange={(e) => setShowReallocationSuggestions(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Show reallocation suggestions</span>
              {reallocationSuggestions.length > 0 && (
                <span style={{
                  padding: '2px 8px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {reallocationSuggestions.length} available
                </span>
              )}
            </label>
          </div>

          {/* Issue count summary */}
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            Showing {memberCapacityData.reduce((sum, m) => sum + m.issueCount, 0)} {showOnlyOpen ? 'open' : 'total'} issues
          </div>
        </div>
      </div>

      {/* Reallocation Suggestions */}
      {showReallocationSuggestions && reallocationSuggestions.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', marginBottom: '12px' }}>
            Workload Rebalancing Suggestions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reallocationSuggestions.map((suggestion, index) => (
              <div key={index} style={{
                padding: '12px',
                background: 'white',
                border: '1px solid #DBEAFE',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#DC2626' }}>
                      {suggestion.from.name || suggestion.from.username}
                    </strong>
                    <span style={{ color: '#6B7280', fontSize: '12px', marginLeft: '8px' }}>
                      ({suggestion.from.utilization}% utilized)
                    </span>
                  </div>
                  <div style={{ color: '#6B7280' }}>→</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#10B981' }}>
                      {suggestion.to.name || suggestion.to.username}
                    </strong>
                    <span style={{ color: '#6B7280', fontSize: '12px', marginLeft: '8px' }}>
                      ({suggestion.to.utilization}% utilized)
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#374151' }}>
                  Suggested reallocation: <strong>{suggestion.suggestedStoryPoints} SP</strong> (~{suggestion.suggestedHours}h)
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  {suggestion.reason}
                </div>
                <button
                  onClick={() => setReallocationDialog({
                    fromMember: suggestion.from,
                    toMember: suggestion.to,
                    suggestedStoryPoints: suggestion.suggestedStoryPoints
                  })}
                  style={{
                    marginTop: '8px',
                    padding: '4px 12px',
                    background: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Review Issues for Reallocation
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capacity Analysis Warnings */}
      {capacityAnalysis && capacityAnalysis.issues.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '8px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#92400E', marginBottom: '8px' }}>
            Capacity Issues Detected
          </h4>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            {capacityAnalysis.issues.slice(0, 3).map((issue, index) => (
              <li key={index} style={{ fontSize: '13px', color: '#78350F', marginBottom: '4px' }}>
                {issue.description}
              </li>
            ))}
          </ul>
          {capacityAnalysis.recommendations.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#92400E' }}>
              <strong>Recommendation:</strong> {capacityAnalysis.recommendations[0]}
            </div>
          )}
        </div>
      )}

      {/* Member Cards or Table */}
      {viewMode === 'cards' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {memberCapacityData.map(renderMemberCard)}
        </div>
      ) : (
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  Team Member
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  Role
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  Capacity
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  Absences
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  Allocated
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  Utilization
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  Issues
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {memberCapacityData.map((member, index) => (
                <tr
                  key={member.username}
                  style={{
                    borderTop: index > 0 ? '1px solid #E5E7EB' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedMember(member)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F9FAFB'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Avatar */}
                      <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                        {member.avatarUrl && (
                          <img
                            src={member.avatarUrl}
                            alt={member.name || member.username}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid #E5E7EB',
                              position: 'absolute',
                              top: 0,
                              left: 0
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        )}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          color: '#6B7280',
                          fontWeight: '600'
                        }}>
                          {(member.name || member.username || '?').charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>
                          {member.name || member.username}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {member.username && <span>@{member.username}</span>}
                          {member.gpn && <span> • {member.gpn}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      background: '#EEF2FF',
                      color: '#4F46E5',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                    {member.currentCapacity}h
                    {member.absenceHours > 0 && (
                      <span style={{ fontSize: '11px', color: '#DC2626' }}>
                        {' '}(base: {member.baseCapacity}h)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {member.absenceDays > 0 ? (
                      <span style={{
                        padding: '2px 8px',
                        background: '#FEF3C7',
                        color: '#92400E',
                        borderRadius: '10px',
                        fontSize: '12px'
                      }}>
                        {member.absenceDays}d (-{member.absenceHours}h)
                      </span>
                    ) : (
                      <span style={{ color: '#10B981', fontSize: '13px' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                    {member.hoursAllocated}h
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: member.statusColor
                    }}>
                      {member.utilization}%
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                    {member.issueCount}
                    {member.issueStates.blocked > 0 && (
                      <span style={{ color: '#DC2626', marginLeft: '4px' }}>
                        ({member.issueStates.blocked} blocked)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      background: member.statusColor + '20',
                      color: member.statusColor,
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {member.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedMember(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {selectedMember.name || selectedMember.username} - Issue Details
            </h3>

            {/* Issue List */}
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                Assigned Issues ({selectedMember.issues.length})
              </h4>
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                {selectedMember.issues.map(issue => (
                  <div
                    key={issue.iid}
                    style={{
                      padding: '12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <a
                        href={issue.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#3B82F6',
                          textDecoration: 'none'
                        }}
                      >
                        #{issue.iid} {issue.title}
                      </a>
                      {issue.labels?.some(l => l.toLowerCase() === 'blocker') && (
                        <span style={{
                          padding: '2px 8px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {issue.labels?.map(label => (
                        <span
                          key={label}
                          style={{
                            padding: '2px 6px',
                            background: '#F3F4F6',
                            color: '#374151',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedMember(null)}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                background: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Issue Reallocation Dialog */}
      {reallocationDialog && (
        <IssueReallocationDialog
          isOpen={!!reallocationDialog}
          onClose={() => setReallocationDialog(null)}
          fromMember={reallocationDialog.fromMember}
          toMember={reallocationDialog.toMember}
          suggestedStoryPoints={reallocationDialog.suggestedStoryPoints}
          onReassign={handleReassignIssues}
        />
      )}
    </div>
  )
}