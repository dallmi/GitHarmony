import React, { useState, useEffect } from 'react'
import { loadTeamConfig, saveTeamConfig, DEFAULT_ROLES } from '../../services/teamConfigService'

/**
 * Team Setup Tab
 * Inline team member management (replaces ConfigModal for team config)
 */
export default function TeamSetupTab({ isCrossProject, onTeamUpdate }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [editingMember, setEditingMember] = useState(null)
  const [newMember, setNewMember] = useState({ username: '', role: 'Developer', defaultCapacity: 40 })

  useEffect(() => {
    loadTeam()
  }, [])

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

    setTeamMembers([...teamMembers, { ...newMember }])
    setNewMember({ username: '', role: 'Developer', defaultCapacity: 40 })
  }

  const handleUpdateMember = (index, field, value) => {
    const updated = [...teamMembers]
    updated[index] = { ...updated[index], [field]: value }
    setTeamMembers(updated)
  }

  const handleDeleteMember = (index) => {
    if (confirm(`Remove ${teamMembers[index].username} from the team?`)) {
      const updated = teamMembers.filter((_, i) => i !== index)
      setTeamMembers(updated)
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
      <div style={{
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
          Team Roster
        </h3>

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
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                  Username
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                  Role
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                  Weekly Capacity (hours)
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1F2937', fontWeight: '500' }}>
                    {editingMember === index ? (
                      <input
                        type="text"
                        value={member.username}
                        onChange={(e) => handleUpdateMember(index, 'username', e.target.value)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          fontSize: '14px',
                          width: '100%'
                        }}
                      />
                    ) : (
                      member.username
                    )}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#6B7280' }}>
                    {editingMember === index ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateMember(index, 'role', e.target.value)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          fontSize: '14px',
                          width: '100%'
                        }}
                      >
                        {DEFAULT_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{
                        padding: '4px 10px',
                        background: '#EEF2FF',
                        color: '#4F46E5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {member.role}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#6B7280' }}>
                    {editingMember === index ? (
                      <input
                        type="number"
                        value={member.defaultCapacity}
                        onChange={(e) => handleUpdateMember(index, 'defaultCapacity', parseInt(e.target.value))}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          fontSize: '14px',
                          width: '100px'
                        }}
                      />
                    ) : (
                      `${member.defaultCapacity}h/week`
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {editingMember === index ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingMember(null)}
                          style={{
                            padding: '6px 12px',
                            background: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingMember(index)}
                          style={{
                            padding: '6px 12px',
                            background: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '4px',
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
                            padding: '6px 12px',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '12px', alignItems: 'end' }}>
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
              cursor: 'pointer'
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          onClick={loadTeam}
          style={{
            padding: '10px 20px',
            background: '#F3F4F6',
            color: '#374151',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '10px 20px',
            background: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          💾 Save Team Configuration
        </button>
      </div>
    </div>
  )
}
