import React, { useMemo } from 'react'

/**
 * Team Resources View
 * Shows workload distribution across team members
 */
export default function TeamResourcesView({ issues }) {
  // Calculate team workload statistics
  const teamStats = useMemo(() => {
    if (!issues || issues.length === 0) {
      return { members: [], unassigned: 0, totalIssues: 0 }
    }

    const memberMap = new Map()
    let unassignedCount = 0

    issues.forEach((issue) => {
      const assignees = issue.assignees || []

      // Handle unassigned issues
      if (assignees.length === 0) {
        unassignedCount++
        return
      }

      // Count issues per assignee
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

    // Convert map to sorted array (by total issues descending)
    const members = Array.from(memberMap.values()).sort(
      (a, b) => b.totalIssues - a.totalIssues
    )

    return {
      members,
      unassigned: unassignedCount,
      totalIssues: issues.length
    }
  }, [issues])

  const { members, unassigned, totalIssues } = teamStats

  // Helper function to determine workload status
  const getWorkloadStatus = (openIssues) => {
    if (openIssues === 0) return { color: '#059669', label: 'Available' }
    if (openIssues <= 3) return { color: '#2563EB', label: 'Normal' }
    if (openIssues <= 5) return { color: '#D97706', label: 'Busy' }
    return { color: '#DC2626', label: 'Overloaded' }
  }

  // Helper function to calculate completion rate
  const getCompletionRate = (closedIssues, totalIssues) => {
    if (totalIssues === 0) return 0
    return Math.round((closedIssues / totalIssues) * 100)
  }

  return (
    <div className="container-fluid">
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Team Members</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>{members.length}</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Issues</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>{totalIssues}</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Avg. Issues per Member</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#1F2937' }}>
            {members.length > 0 ? Math.round(totalIssues / members.length) : 0}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Unassigned Issues</div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: unassigned > 0 ? '#DC2626' : '#059669' }}>
            {unassigned}
          </div>
        </div>
      </div>

      {/* Team Members Workload */}
      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Team Workload</h2>

        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
            No team members found. Assign issues to team members to see workload distribution.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {members.map((member) => {
              const status = getWorkloadStatus(member.openIssues)
              const completionRate = getCompletionRate(member.closedIssues, member.totalIssues)

              return (
                <div
                  key={member.username}
                  style={{
                    padding: '16px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB'
                  }}
                >
                  {/* Member Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {member.avatar && (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        style={{
                          width: '40px',
                          height: '40px',
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
                        padding: '4px 12px',
                        background: status.color + '20',
                        color: status.color,
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      {status.label}
                    </div>
                  </div>

                  {/* Workload Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Open Issues</div>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#DC2626' }}>
                        {member.openIssues}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Closed Issues</div>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#059669' }}>
                        {member.closedIssues}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Issues</div>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937' }}>
                        {member.totalIssues}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Completion Rate</div>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#2563EB' }}>
                        {completionRate}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                      Progress: {member.closedIssues} / {member.totalIssues} issues completed
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        background: '#E5E7EB',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${completionRate}%`,
                          height: '100%',
                          background: completionRate < 30 ? '#DC2626' : completionRate < 70 ? '#D97706' : '#059669',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
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
                Unassigned Issues
              </div>
              <div style={{ fontSize: '14px', color: '#78350F' }}>
                There are <strong>{unassigned}</strong> issues without assignees. Consider distributing them to team members.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
