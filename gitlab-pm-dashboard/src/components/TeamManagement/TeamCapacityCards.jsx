import React, { useState, useMemo } from 'react'
import { analyzeCapacityIssues } from '../../services/capacityAnalysisService'

/**
 * Team Capacity Cards
 * Shows team members in card view with current capacity and workload
 * Adapted from ResourceCapacityView but focused on current state
 */
export default function TeamCapacityCards({ teamMembers, issues, milestones, sprintCapacity, crossProjectMode }) {
  const [selectedMember, setSelectedMember] = useState(null)
  const [viewMode, setViewMode] = useState('cards') // cards or table

  // Calculate member capacity and workload
  const memberCapacityData = useMemo(() => {
    if (!teamMembers || !issues) return []

    return teamMembers.map(member => {
      // Get issues assigned to this member
      const memberIssues = issues.filter(issue =>
        issue.assignee?.username === member.username
      )

      // Calculate story points
      const storyPoints = memberIssues.reduce((sum, issue) => {
        const sp = issue.labels?.find(l => l.startsWith('sp::'))?.replace('sp::', '') || '0'
        return sum + parseInt(sp)
      }, 0)

      // Get current sprint capacity (with absences)
      const currentCapacity = sprintCapacity?.breakdown?.find(
        b => b.username === member.username
      )?.availableCapacity || member.defaultCapacity || 40

      // Calculate utilization
      const hoursAllocated = storyPoints * 6 // Assuming 6 hours per story point
      const utilization = Math.round((hoursAllocated / currentCapacity) * 100)

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
        utilization,
        status,
        statusColor,
        issueCount: memberIssues.length,
        issueStates,
        issues: memberIssues
      }
    })
  }, [teamMembers, issues, sprintCapacity])

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
            <strong>{member.issueCount}</strong> issues
          </span>
          <span style={{ color: '#6B7280' }}>
            <strong>{member.storyPoints}</strong> SP
          </span>
        </div>
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
      </div>
    </div>
  )

  return (
    <div>
      {/* View Mode Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
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
    </div>
  )
}