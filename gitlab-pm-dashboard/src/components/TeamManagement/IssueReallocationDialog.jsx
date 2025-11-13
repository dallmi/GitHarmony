import React, { useState, useMemo } from 'react'

/**
 * Issue Reallocation Dialog
 * Allows selecting and reassigning issues from an overloaded member to an available member
 */
export default function IssueReallocationDialog({
  isOpen,
  onClose,
  fromMember,
  toMember,
  suggestedStoryPoints,
  onReassign
}) {
  const [selectedIssues, setSelectedIssues] = useState([])
  const [isReassigning, setIsReassigning] = useState(false)
  const [reassignProgress, setReassignProgress] = useState(null)

  // Filter to show only open issues with story points
  const reassignableIssues = useMemo(() => {
    if (!fromMember?.issues) return []

    return fromMember.issues.filter(issue => {
      const sp = issue.labels?.find(l => l.startsWith('sp::'))?.replace('sp::', '') || '0'
      return issue.state === 'opened' && parseInt(sp) > 0
    }).sort((a, b) => {
      // Sort by story points (highest first) to make it easier to reach target
      const spA = parseInt(a.labels?.find(l => l.startsWith('sp::'))?.replace('sp::', '') || '0')
      const spB = parseInt(b.labels?.find(l => l.startsWith('sp::'))?.replace('sp::', '') || '0')
      return spB - spA
    })
  }, [fromMember])

  // Calculate total story points of selected issues
  const selectedStoryPoints = useMemo(() => {
    return selectedIssues.reduce((sum, issueId) => {
      const issue = reassignableIssues.find(i => i.iid === issueId)
      if (issue) {
        const sp = issue.labels?.find(l => l.startsWith('sp::'))?.replace('sp::', '') || '0'
        return sum + parseInt(sp)
      }
      return sum
    }, 0)
  }, [selectedIssues, reassignableIssues])

  const handleToggleIssue = (issueId) => {
    setSelectedIssues(prev => {
      if (prev.includes(issueId)) {
        return prev.filter(id => id !== issueId)
      } else {
        return [...prev, issueId]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedIssues.length === reassignableIssues.length) {
      setSelectedIssues([])
    } else {
      setSelectedIssues(reassignableIssues.map(i => i.iid))
    }
  }

  const handleReassign = async () => {
    if (selectedIssues.length === 0) return

    setIsReassigning(true)
    setReassignProgress({ current: 0, total: selectedIssues.length, message: 'Starting reassignment...' })

    // Get the actual issue objects
    const issuesToReassign = reassignableIssues.filter(i =>
      selectedIssues.includes(i.iid)
    )

    try {
      // Call the parent's reassignment handler
      if (onReassign) {
        await onReassign(issuesToReassign, fromMember, toMember)
      }

      setReassignProgress({ current: selectedIssues.length, total: selectedIssues.length, message: 'Completed!' })

      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (error) {
      console.error('Reassignment error:', error)
      setReassignProgress({
        current: 0,
        total: selectedIssues.length,
        message: `Error: ${error.message}`,
        isError: true
      })
      // Keep dialog open on error
      setIsReassigning(false)
      return
    }

    setIsReassigning(false)
    setReassignProgress(null)
    setSelectedIssues([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '900px',
        maxHeight: '80vh',
        width: '90%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
            Reallocate Issues
          </h2>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>
            Select issues to reassign from <strong>{fromMember?.name || fromMember?.username}</strong> to{' '}
            <strong>{toMember?.name || toMember?.username}</strong>
          </div>

          {/* Capacity Summary */}
          <div style={{
            display: 'flex',
            gap: '24px',
            marginTop: '16px',
            padding: '12px',
            background: '#F9FAFB',
            borderRadius: '6px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>From (Current Load)</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#DC2626' }}>
                {fromMember?.utilization}% ({fromMember?.hoursAllocated}h / {fromMember?.currentCapacity}h)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>To (Current Load)</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#10B981' }}>
                {toMember?.utilization}% ({toMember?.hoursAllocated}h / {toMember?.currentCapacity}h)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Suggested Transfer</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#3B82F6' }}>
                {suggestedStoryPoints} SP
              </div>
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          padding: '12px',
          background: selectedStoryPoints > 0 ? '#EFF6FF' : '#F9FAFB',
          border: `1px solid ${selectedStoryPoints > 0 ? '#BFDBFE' : '#E5E7EB'}`,
          borderRadius: '6px'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={handleSelectAll}
              style={{
                padding: '4px 12px',
                background: 'white',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {selectedIssues.length === reassignableIssues.length ? 'Deselect All' : 'Select All'}
            </button>
            <span style={{ fontSize: '14px', color: '#374151' }}>
              {selectedIssues.length} of {reassignableIssues.length} issues selected
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: selectedStoryPoints > 0 ? '#1E40AF' : '#6B7280' }}>
            {selectedStoryPoints} SP selected
            {suggestedStoryPoints > 0 && (
              <span style={{ fontWeight: '400', marginLeft: '8px' }}>
                ({Math.round((selectedStoryPoints / suggestedStoryPoints) * 100)}% of suggested)
              </span>
            )}
          </div>
        </div>

        {/* Issues List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          {reassignableIssues.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
              No reassignable issues found (no open issues with story points)
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '12px', width: '40px' }}></th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                    Issue
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151', width: '80px' }}>
                    SP
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151', width: '100px' }}>
                    Priority
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                    Labels
                  </th>
                </tr>
              </thead>
              <tbody>
                {reassignableIssues.map((issue, index) => {
                  const sp = issue.labels?.find(l => l.startsWith('sp::'))?.replace('sp::', '') || '0'
                  const priority = issue.labels?.find(l => l.startsWith('Priority::'))?.replace('Priority::', '') || '-'
                  const isSelected = selectedIssues.includes(issue.iid)
                  const isBlocked = issue.labels?.some(l => l.toLowerCase() === 'blocker' || l.toLowerCase().includes('blocked'))

                  return (
                    <tr
                      key={issue.iid}
                      style={{
                        borderTop: index > 0 ? '1px solid #E5E7EB' : 'none',
                        background: isSelected ? '#F0F9FF' : 'white',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleToggleIssue(issue.iid)}
                    >
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleIssue(issue.iid)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                          <span style={{ color: '#6B7280', fontSize: '13px' }}>#{issue.iid}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>
                              {issue.title}
                            </div>
                            {isBlocked && (
                              <span style={{
                                display: 'inline-block',
                                marginTop: '4px',
                                padding: '2px 6px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                BLOCKED
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          {sp}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {priority !== '-' && (
                          <span style={{
                            padding: '2px 8px',
                            background: priority === 'High' ? '#FEE2E2' : priority === 'Medium' ? '#FEF3C7' : '#F3F4F6',
                            color: priority === 'High' ? '#DC2626' : priority === 'Medium' ? '#92400E' : '#6B7280',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}>
                            {priority}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {issue.labels?.filter(l =>
                            !l.startsWith('sp::') &&
                            !l.startsWith('Priority::') &&
                            !l.toLowerCase().includes('block')
                          ).slice(0, 3).map(label => (
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          {/* Progress Display */}
          {reassignProgress ? (
            <div style={{
              flex: 1,
              marginRight: '16px'
            }}>
              <div style={{
                fontSize: '13px',
                color: reassignProgress.isError ? '#DC2626' : '#6B7280',
                marginBottom: '4px'
              }}>
                {reassignProgress.message}
              </div>
              {!reassignProgress.isError && (
                <div style={{
                  height: '6px',
                  background: '#E5E7EB',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    background: '#3B82F6',
                    borderRadius: '3px',
                    width: `${(reassignProgress.current / reassignProgress.total) * 100}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              {toMember?.id
                ? 'Ready to reassign issues via GitLab API'
                : 'Warning: Target user needs GitLab ID configured'}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              disabled={isReassigning}
              style={{
                padding: '8px 16px',
                background: 'white',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isReassigning ? 'not-allowed' : 'pointer',
                opacity: isReassigning ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleReassign}
              disabled={selectedIssues.length === 0 || isReassigning || !toMember?.id}
              style={{
                padding: '8px 16px',
                background: selectedIssues.length > 0 && toMember?.id ? '#3B82F6' : '#E5E7EB',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: selectedIssues.length > 0 && toMember?.id && !isReassigning ? 'pointer' : 'not-allowed',
                opacity: isReassigning ? 0.6 : 1
              }}
            >
              {isReassigning ? `Reassigning... (${reassignProgress?.current || 0}/${reassignProgress?.total || 0})` : `Reassign ${selectedIssues.length} Issue${selectedIssues.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}