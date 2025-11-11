import React, { useState, useEffect, useMemo } from 'react'
import {
  loadTeamConfig,
  loadSprintCapacity,
  updateSprintMemberCapacity,
  getSprintMemberCapacity,
  calculateSprintCapacity
} from '../services/teamConfigService'
import { getUniqueIterations } from '../services/velocityService'
import { getIterationName } from '../utils/labelUtils'

/**
 * Sprint Capacity Planning Modal
 * Allows adjusting team member capacity for specific sprints (holidays, PTO, etc.)
 */
export default function SprintCapacityModal({ isOpen, onClose, issues }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedSprint, setSelectedSprint] = useState(null)
  const [sprintCapacities, setSprintCapacities] = useState({})
  const [editMode, setEditMode] = useState({}) // Track which members are being edited

  // Get all unique sprints/iterations
  const sprints = useMemo(() => {
    const iterations = getUniqueIterations(issues)
    return iterations
      .map(name => {
        // Find the first issue with this iteration to get dates
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
        return new Date(b.startDate) - new Date(a.startDate) // Most recent first
      })
  }, [issues])

  // Load team config on mount
  useEffect(() => {
    if (isOpen) {
      const config = loadTeamConfig()
      setTeamMembers(config.teamMembers || [])

      // Default to most recent sprint
      if (sprints.length > 0 && !selectedSprint) {
        setSelectedSprint(sprints[0])
      }
    }
  }, [isOpen, sprints, selectedSprint])

  // Load capacity data when sprint changes
  useEffect(() => {
    if (selectedSprint) {
      const capacities = {}
      teamMembers.forEach(member => {
        const capacity = getSprintMemberCapacity(
          selectedSprint.id,
          member.username,
          member.defaultCapacity
        )
        capacities[member.username] = {
          hours: capacity,
          reason: '' // We'll load reason from storage if needed
        }
      })
      setSprintCapacities(capacities)

      // Load full sprint data to get reasons
      const sprintData = loadSprintCapacity()
      const sprint = sprintData.sprints.find(s => s.sprintId === selectedSprint.id)
      if (sprint) {
        sprint.memberCapacity.forEach(mc => {
          if (capacities[mc.username]) {
            capacities[mc.username].reason = mc.reason || ''
          }
        })
      }
      setSprintCapacities(capacities)
    }
  }, [selectedSprint, teamMembers])

  const handleSprintChange = (sprintName) => {
    const sprint = sprints.find(s => s.name === sprintName)
    setSelectedSprint(sprint)
    setEditMode({}) // Clear edit mode when changing sprints
  }

  const handleEditMember = (username) => {
    setEditMode({ ...editMode, [username]: true })
  }

  const handleSaveMember = (username) => {
    const capacity = sprintCapacities[username]
    updateSprintMemberCapacity(
      selectedSprint.id,
      selectedSprint.name,
      username,
      capacity.hours,
      capacity.reason
    )
    setEditMode({ ...editMode, [username]: false })
  }

  const handleCancelEdit = (username, member) => {
    // Restore original capacity
    const originalCapacity = getSprintMemberCapacity(
      selectedSprint.id,
      username,
      member.defaultCapacity
    )
    setSprintCapacities({
      ...sprintCapacities,
      [username]: { ...sprintCapacities[username], hours: originalCapacity }
    })
    setEditMode({ ...editMode, [username]: false })
  }

  const handleUpdateCapacity = (username, hours, reason) => {
    setSprintCapacities({
      ...sprintCapacities,
      [username]: { hours: parseFloat(hours), reason }
    })
  }

  // Calculate total capacity
  const totalCapacity = useMemo(() => {
    return Object.values(sprintCapacities).reduce((sum, cap) => sum + cap.hours, 0)
  }, [sprintCapacities])

  // Calculate default total (without adjustments)
  const defaultTotalCapacity = useMemo(() => {
    return teamMembers.reduce((sum, member) => sum + member.defaultCapacity, 0)
  }, [teamMembers])

  const capacityDifference = totalCapacity - defaultTotalCapacity

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Sprint Capacity Planning
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {teamMembers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6B7280',
              fontSize: '14px'
            }}>
              No team members configured. Please configure your team first in Team Configuration.
            </div>
          ) : sprints.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6B7280',
              fontSize: '14px'
            }}>
              No sprints found. Make sure your issues have iterations assigned.
            </div>
          ) : (
            <>
              {/* Sprint Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Select Sprint
                </label>
                <select
                  value={selectedSprint?.name || ''}
                  onChange={(e) => handleSprintChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.name}>
                      {sprint.name} {sprint.startDate && `(${new Date(sprint.startDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Capacity Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Default Capacity</div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#374151' }}>
                    {defaultTotalCapacity}h
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Adjusted Capacity</div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#2563EB' }}>
                    {totalCapacity}h
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Difference</div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: capacityDifference < 0 ? '#DC2626' : capacityDifference > 0 ? '#059669' : '#6B7280'
                  }}>
                    {capacityDifference > 0 ? '+' : ''}{capacityDifference}h
                  </div>
                </div>
              </div>

              {/* Team Members Capacity Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
                      Team Member
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
                      Role
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
                      Default
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
                      Sprint Capacity
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
                      Reason
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map(member => {
                    const capacity = sprintCapacities[member.username] || { hours: member.defaultCapacity, reason: '' }
                    const isEditing = editMode[member.username]
                    const isDifferent = capacity.hours !== member.defaultCapacity

                    return (
                      <tr key={member.username} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <div style={{ fontWeight: '500' }}>{member.name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{member.username}</div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {member.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#6B7280' }}>
                          {member.defaultCapacity}h
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={capacity.hours}
                              onChange={(e) => handleUpdateCapacity(member.username, e.target.value, capacity.reason)}
                              min="0"
                              max={member.defaultCapacity * 2}
                              step="0.5"
                              style={{
                                width: '80px',
                                padding: '6px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            />
                          ) : (
                            <span style={{
                              fontWeight: '600',
                              color: isDifferent ? (capacity.hours < member.defaultCapacity ? '#DC2626' : '#059669') : '#374151'
                            }}>
                              {capacity.hours}h
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={capacity.reason}
                              onChange={(e) => handleUpdateCapacity(member.username, capacity.hours, e.target.value)}
                              placeholder="Holiday, PTO, training..."
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '13px', color: '#6B7280', fontStyle: capacity.reason ? 'normal' : 'italic' }}>
                              {capacity.reason || 'Standard capacity'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveMember(member.username)}
                                style={{
                                  marginRight: '4px',
                                  padding: '4px 8px',
                                  background: '#10B981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => handleCancelEdit(member.username, member)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#9CA3AF',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEditMember(member.username)}
                              style={{
                                padding: '4px 8px',
                                background: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Help Text */}
              <div style={{
                marginTop: '20px',
                padding: '12px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#92400E'
              }}>
                <strong>Tip:</strong> Adjust capacity for team members who will be on holiday, PTO, training, or have other commitments during this sprint. The system will use these values for capacity planning calculations.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
