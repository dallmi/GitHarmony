import React, { useState, useEffect } from 'react'
import { loadTeamConfig, saveTeamConfig, DEFAULT_ROLES } from '../../services/teamConfigService'
import { importTeamFromIssues, calculateTeamVelocity } from '../../services/teamImportService'

/**
 * Team Setup Tab
 * Inline team member management (replaces ConfigModal for team config)
 */
export default function TeamSetupTab({ isCrossProject, onTeamUpdate, issues = [] }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [editingMember, setEditingMember] = useState(null)
  const [newMember, setNewMember] = useState({ username: '', name: '', gpn: '', tNumber: '', avatarUrl: '', role: 'Developer', defaultCapacity: 40 })
  const [importStatus, setImportStatus] = useState(null)
  const [showVelocity, setShowVelocity] = useState(false)
  const [teamVelocity, setTeamVelocity] = useState(null)

  useEffect(() => {
    loadTeam()
  }, [])

  useEffect(() => {
    // Calculate team velocity when members or issues change
    if (teamMembers.length > 0 && issues.length > 0) {
      const velocity = calculateTeamVelocity(issues, teamMembers)
      setTeamVelocity(velocity)
    }
  }, [teamMembers, issues])

  const loadTeam = () => {
    const config = loadTeamConfig()
    setTeamMembers(config.teamMembers || [])
  }

  const handleSave = () => {
    const config = loadTeamConfig()
    config.teamMembers = teamMembers
    saveTeamConfig(config)
    onTeamUpdate()
  }

  const handleImportFromIssues = () => {
    if (issues.length === 0) {
      setImportStatus({ type: 'error', message: 'No issues available to import from' })
      return
    }

    const result = importTeamFromIssues(issues, {
      autoDetectRoles: true,
      preserveCustomSettings: true,
      velocityPeriodDays: 90
    })

    setTeamMembers(result.members)
    setImportStatus({
      type: 'success',
      message: `Imported ${result.imported} members (${result.new} new, ${result.existing} existing)`
    })

    // Auto-save after import
    const config = loadTeamConfig()
    config.teamMembers = result.members
    saveTeamConfig(config)
    onTeamUpdate()

    // Clear status after 5 seconds
    setTimeout(() => setImportStatus(null), 5000)
  }

  const handleAddMember = () => {
    if (!newMember.username.trim()) {
      alert('Please enter a username')
      return
    }

    const exists = teamMembers.find(m => m.username === newMember.username)
    if (exists) {
      alert('Team member already exists')
      return
    }

    const updatedMembers = [...teamMembers, { ...newMember }]
    setTeamMembers(updatedMembers)
    setNewMember({ username: '', name: '', gpn: '', tNumber: '', avatarUrl: '', role: 'Developer', defaultCapacity: 40 })

    // Auto-save after adding
    const config = loadTeamConfig()
    config.teamMembers = updatedMembers
    saveTeamConfig(config)
    onTeamUpdate()
  }

  const handleUpdateMember = (index, field, value) => {
    const updated = [...teamMembers]
    updated[index] = { ...updated[index], [field]: value }
    setTeamMembers(updated)

    // Auto-save after updating
    const config = loadTeamConfig()
    config.teamMembers = updated
    saveTeamConfig(config)
    onTeamUpdate()
  }

  const handleDeleteMember = (index) => {
    if (confirm(`Remove ${teamMembers[index].username} from the team?`)) {
      const updated = teamMembers.filter((_, i) => i !== index)
      setTeamMembers(updated)

      // Auto-save after deleting
      const config = loadTeamConfig()
      config.teamMembers = updated
      saveTeamConfig(config)
      onTeamUpdate()
    }
  }

  if (isCrossProject) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#F9FAFB',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ color: '#374151', marginBottom: '8px' }}>Team Configuration Unavailable</h3>
        <p style={{ color: '#6B7280' }}>
          Please select a specific project to manage team members.
          Different projects have different teams.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Import Status Message */}
      {importStatus && (
        <div style={{
          padding: '12px 16px',
          background: importStatus.type === 'error' ? '#FEE2E2' : '#D1FAE5',
          color: importStatus.type === 'error' ? '#DC2626' : '#065F46',
          border: `1px solid ${importStatus.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`,
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {importStatus.message}
        </div>
      )}

      {/* Team Velocity Stats */}
      {teamVelocity && (
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
              Team Velocity (Last 90 Days)
            </h3>
            <button
              onClick={() => setShowVelocity(!showVelocity)}
              style={{
                padding: '4px 8px',
                background: 'transparent',
                color: '#3B82F6',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {showVelocity ? 'Hide' : 'Show'} Details
            </button>
          </div>
          {showVelocity && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Closed Issues</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937' }}>
                  {teamVelocity.closedIssues}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Total Points</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#3B82F6' }}>
                  {teamVelocity.totalPoints}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Avg Points/Week</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#10B981' }}>
                  {teamVelocity.averagePointsPerWeek}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Hours/Story Point</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#F59E0B' }}>
                  {teamVelocity.hoursPerStoryPoint}h
                </div>
              </div>
              {teamVelocity.estimateAccuracy !== null && (
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Estimate Accuracy</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: teamVelocity.estimateAccuracy > 120 ? '#DC2626' :
                           teamVelocity.estimateAccuracy < 80 ? '#F59E0B' : '#10B981'
                  }}>
                    {teamVelocity.estimateAccuracy}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
            Team Roster
          </h3>
          <button
            onClick={handleImportFromIssues}
            style={{
              padding: '8px 16px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Import from Issues
          </button>
        </div>

        {teamMembers.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
            <p>No team members configured yet. Add your first team member below.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {teamMembers.map((member, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                {/* Avatar */}
                <div>
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name || member.username}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #E5E7EB'
                      }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      color: '#9CA3AF',
                      fontWeight: '600'
                    }}>
                      {(member.name || member.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Member Info */}
                <div style={{ flex: 1 }}>
                  {editingMember === index ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>Name</label>
                        <input
                          type="text"
                          value={member.name || ''}
                          onChange={(e) => handleUpdateMember(index, 'name', e.target.value)}
                          placeholder="Full Name"
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            fontSize: '13px',
                            width: '100%'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>Username</label>
                        <input
                          type="text"
                          value={member.username}
                          onChange={(e) => handleUpdateMember(index, 'username', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            fontSize: '13px',
                            width: '100%'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>GPN</label>
                        <input
                          type="text"
                          value={member.gpn || ''}
                          onChange={(e) => handleUpdateMember(index, 'gpn', e.target.value)}
                          placeholder="Employee Number"
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            fontSize: '13px',
                            width: '100%'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>T-Number</label>
                        <input
                          type="text"
                          value={member.tNumber || ''}
                          onChange={(e) => handleUpdateMember(index, 'tNumber', e.target.value)}
                          placeholder="T-Number"
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            fontSize: '13px',
                            width: '100%'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>Avatar URL</label>
                        <input
                          type="text"
                          value={member.avatarUrl || ''}
                          onChange={(e) => handleUpdateMember(index, 'avatarUrl', e.target.value)}
                          placeholder="https://..."
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            fontSize: '13px',
                            width: '100%'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>Role</label>
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMember(index, 'role', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            fontSize: '13px',
                            width: '100%'
                          }}
                        >
                          {DEFAULT_ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>Weekly Capacity</label>
                        <input
                          type="number"
                          value={member.defaultCapacity}
                          onChange={(e) => handleUpdateMember(index, 'defaultCapacity', parseInt(e.target.value))}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            fontSize: '13px',
                            width: '100%'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                          {member.name || member.username}
                        </div>
                        <span style={{
                          padding: '3px 10px',
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {member.role}
                        </span>
                        <span style={{
                          padding: '3px 10px',
                          background: '#F3F4F6',
                          color: '#6B7280',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {member.defaultCapacity}h/week
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {member.username && <span>@{member.username}</span>}
                        {member.gpn && <span>GPN: {member.gpn}</span>}
                        {member.tNumber && <span>T-Number: {member.tNumber}</span>}
                        {member.velocity && member.velocity.averagePointsPerWeek > 0 && (
                          <span style={{ color: '#10B981' }}>
                            {member.velocity.averagePointsPerWeek} pts/week
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingMember === index ? (
                    <button
                      onClick={() => setEditingMember(null)}
                      style={{
                        padding: '8px 16px',
                        background: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingMember(index)}
                        style={{
                          padding: '8px 16px',
                          background: '#F3F4F6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMember(index)}
                        style={{
                          padding: '8px 16px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Member */}
      <div style={{
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
          Add Team Member
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Name
            </label>
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              placeholder="Full Name"
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Username
            </label>
            <input
              type="text"
              value={newMember.username}
              onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
              placeholder="e.g., john.doe"
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              GPN <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={newMember.gpn}
              onChange={(e) => setNewMember({ ...newMember, gpn: e.target.value })}
              placeholder="Employee Number"
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              T-Number <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={newMember.tNumber}
              onChange={(e) => setNewMember({ ...newMember, tNumber: e.target.value })}
              placeholder="T-Number"
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Avatar URL <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={newMember.avatarUrl}
              onChange={(e) => setNewMember({ ...newMember, avatarUrl: e.target.value })}
              placeholder="https://..."
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Role
            </label>
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%'
              }}
            >
              {DEFAULT_ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Hours/Week
            </label>
            <input
              type="number"
              value={newMember.defaultCapacity}
              onChange={(e) => setNewMember({ ...newMember, defaultCapacity: parseInt(e.target.value) })}
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
          <button
            onClick={handleAddMember}
            style={{
              padding: '8px 20px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Auto-save notice with reset button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: '6px',
        marginTop: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#065F46' }}>
            ✓ Changes are saved automatically and update all views
          </span>
        </div>
        <button
          onClick={() => {
            if (confirm('Reset all team settings? This will clear the entire team roster.')) {
              setTeamMembers([])
              const config = loadTeamConfig()
              config.teamMembers = []
              saveTeamConfig(config)
              onTeamUpdate()
            }
          }}
          style={{
            padding: '6px 12px',
            background: 'white',
            color: '#DC2626',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Reset All
        </button>
      </div>
    </div>
  )
}
