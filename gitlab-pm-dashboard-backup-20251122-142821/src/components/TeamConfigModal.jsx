import React, { useState, useEffect } from 'react'
import {
  loadTeamConfig,
  saveTeamMember,
  removeTeamMember,
  DEFAULT_ROLES,
  getTeamMembersFromIssues,
  loadCapacitySettings,
  saveCapacitySettings,
  updateCapacitySettingsFromHistory
} from '../services/teamConfigService'

/**
 * Team Configuration Modal
 * Allows defining team members, roles, and capacity settings
 */
export default function TeamConfigModal({ isOpen, onClose, issues }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [capacitySettings, setCapacitySettings] = useState({})
  const [historicalData, setHistoricalData] = useState(null)

  // Form state for adding/editing member
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: DEFAULT_ROLES[0],
    customRole: '',
    defaultCapacity: 40,
    email: ''
  })

  // Tab state
  const [activeTab, setActiveTab] = useState('members') // 'members' or 'settings'

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      const config = loadTeamConfig()
      setTeamMembers(config.teamMembers || [])

      const settings = loadCapacitySettings()
      setCapacitySettings(settings)
      setHistoricalData(settings.historicalData)

      // Reset form state when modal opens
      setShowForm(false)
      setEditingMember(null)
    }
  }, [isOpen])

  const handleAddMember = () => {
    setShowForm(true)
    setEditingMember(null)
    setFormData({
      username: '',
      name: '',
      role: DEFAULT_ROLES[0],
      customRole: '',
      defaultCapacity: 40,
      email: ''
    })
  }

  const handleEditMember = (member) => {
    setShowForm(true)
    setEditingMember(member)
    setFormData({
      username: member.username,
      name: member.name,
      role: member.role,
      customRole: member.customRole || '',
      defaultCapacity: member.defaultCapacity,
      email: member.email || ''
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingMember(null)
    setFormData({
      username: '',
      name: '',
      role: DEFAULT_ROLES[0],
      customRole: '',
      defaultCapacity: 40,
      email: ''
    })
  }

  const handleSaveMember = () => {
    const finalRole = formData.role === 'Custom' ? formData.customRole : formData.role

    if (!formData.username || !formData.name || !finalRole) {
      alert('Username, name, and role are required')
      return
    }

    const member = {
      username: formData.username,
      name: formData.name,
      role: finalRole,
      customRole: formData.role === 'Custom' ? formData.customRole : '',
      defaultCapacity: formData.defaultCapacity,
      email: formData.email
    }

    saveTeamMember(member)

    // Reload team members
    const config = loadTeamConfig()
    setTeamMembers(config.teamMembers || [])

    // Reset form and hide it
    setShowForm(false)
    setEditingMember(null)
    setFormData({
      username: '',
      name: '',
      role: DEFAULT_ROLES[0],
      customRole: '',
      defaultCapacity: 40,
      email: ''
    })
  }

  const handleDeleteMember = (username) => {
    if (confirm(`Remove ${username} from team?`)) {
      removeTeamMember(username)
      const config = loadTeamConfig()
      setTeamMembers(config.teamMembers || [])
    }
  }

  const handleImportFromIssues = () => {
    const issueMembers = getTeamMembersFromIssues(issues)

    if (issueMembers.length === 0) {
      alert('No assignees found in issues')
      return
    }

    // Add all members not already in team
    issueMembers.forEach(member => {
      const exists = teamMembers.some(m => m.username === member.username)
      if (!exists) {
        const newMember = {
          username: member.username,
          name: member.name,
          role: 'Developer', // Default role
          customRole: '',
          defaultCapacity: 40,
          email: ''
        }
        saveTeamMember(newMember)
      }
    })

    const config = loadTeamConfig()
    setTeamMembers(config.teamMembers || [])

    alert(`Imported ${issueMembers.length} team members from issues`)
  }

  const handleRecalculateVelocity = () => {
    const settings = updateCapacitySettingsFromHistory(issues)
    setCapacitySettings(settings)
    setHistoricalData(settings.historicalData)

    alert(`Updated hours per story point to ${settings.hoursPerStoryPoint} (based on ${settings.historicalData.sampleSize} completed issues)`)
  }

  const handleUpdateCapacitySettings = () => {
    saveCapacitySettings(capacitySettings)
    alert('Capacity settings saved')
  }

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
            Team Configuration
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E5E7EB',
          padding: '0 24px'
        }}>
          <button
            onClick={() => setActiveTab('members')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'members' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'members' ? '#2563EB' : '#6B7280',
              fontWeight: activeTab === 'members' ? '600' : '400',
              cursor: 'pointer'
            }}
          >
            Team Members ({teamMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'settings' ? '#2563EB' : '#6B7280',
              fontWeight: activeTab === 'settings' ? '600' : '400',
              cursor: 'pointer'
            }}
          >
            Capacity Settings
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'members' && (
            <>
              {/* Action Buttons */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleAddMember}
                  style={{
                    padding: '8px 16px',
                    background: '#2563EB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  + Add Team Member
                </button>
                <button
                  onClick={handleImportFromIssues}
                  style={{
                    padding: '8px 16px',
                    background: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Import from Issues
                </button>
              </div>

              {/* Add/Edit Form */}
              {showForm && (
                <div style={{
                  border: '2px solid #2563EB',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                  backgroundColor: '#EFF6FF'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
                    {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Username *
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        disabled={editingMember !== null}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Role *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        {DEFAULT_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    {formData.role === 'Custom' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                          Custom Role Name *
                        </label>
                        <input
                          type="text"
                          value={formData.customRole}
                          onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Default Weekly Capacity (hours)
                      </label>
                      <input
                        type="number"
                        value={formData.defaultCapacity}
                        onChange={(e) => setFormData({ ...formData, defaultCapacity: parseFloat(e.target.value) })}
                        min="0"
                        max="80"
                        step="0.5"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSaveMember}
                      style={{
                        padding: '8px 16px',
                        background: '#2563EB',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Save Member
                    </button>
                    <button
                      onClick={handleCancel}
                      style={{
                        padding: '8px 16px',
                        background: '#9CA3AF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Team Members Table */}
              {teamMembers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6B7280',
                  fontSize: '14px'
                }}>
                  No team members configured. Click "Add Team Member" or "Import from Issues" to get started.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Username</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Role</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Weekly Capacity</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map(member => (
                      <tr key={member.username} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{member.username}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{member.name}</td>
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
                        <td style={{ padding: '12px', fontSize: '14px' }}>{member.defaultCapacity}h</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <button
                            onClick={() => handleEditMember(member)}
                            style={{
                              marginRight: '8px',
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
                          <button
                            onClick={() => handleDeleteMember(member.username)}
                            style={{
                              padding: '4px 8px',
                              background: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <div>
              {/* Historical Velocity Data */}
              {historicalData && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#F0F9FF',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #BAE6FD'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0369A1' }}>
                    Historical Velocity Data
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '14px' }}>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '12px' }}>Sample Size</div>
                      <div style={{ fontWeight: '600', fontSize: '18px', color: '#0369A1' }}>
                        {historicalData.sampleSize} issues
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '12px' }}>Total Hours</div>
                      <div style={{ fontWeight: '600', fontSize: '18px', color: '#0369A1' }}>
                        {historicalData.totalHours}h
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '12px' }}>Total Story Points</div>
                      <div style={{ fontWeight: '600', fontSize: '18px', color: '#0369A1' }}>
                        {historicalData.totalPoints}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '12px' }}>Confidence</div>
                      <div style={{ fontWeight: '600', fontSize: '18px', color: historicalData.confidence === 'high' ? '#059669' : historicalData.confidence === 'medium' ? '#D97706' : '#DC2626' }}>
                        {historicalData.confidence.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Capacity Settings Form */}
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                    Hours per Story Point
                  </label>
                  <input
                    type="number"
                    value={capacitySettings.hoursPerStoryPoint || 8}
                    onChange={(e) => setCapacitySettings({ ...capacitySettings, hoursPerStoryPoint: parseFloat(e.target.value) })}
                    min="0.5"
                    max="40"
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Used to convert story points to estimated hours for capacity planning
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                    Default Hours per Issue (without weight)
                  </label>
                  <input
                    type="number"
                    value={capacitySettings.defaultHoursPerIssue || 4}
                    onChange={(e) => setCapacitySettings({ ...capacitySettings, defaultHoursPerIssue: parseFloat(e.target.value) })}
                    min="0.5"
                    max="40"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Used for issues that don't have story points assigned
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                    Default Weekly Capacity
                  </label>
                  <input
                    type="number"
                    value={capacitySettings.defaultWeeklyCapacity || 40}
                    onChange={(e) => setCapacitySettings({ ...capacitySettings, defaultWeeklyCapacity: parseFloat(e.target.value) })}
                    min="1"
                    max="80"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Default hours per week for new team members
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleRecalculateVelocity}
                  style={{
                    padding: '10px 16px',
                    background: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Recalculate from History
                </button>
                <button
                  onClick={handleUpdateCapacitySettings}
                  style={{
                    padding: '10px 16px',
                    background: '#2563EB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Save Settings
                </button>
              </div>

              {capacitySettings.lastCalculated && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
                  Last calculated: {new Date(capacitySettings.lastCalculated).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
