import React, { useState, useEffect } from 'react'
import { loadTeamConfig, saveTeamConfig, DEFAULT_ROLES } from '../../services/teamConfigService'
import { importTeamFromIssues, calculateTeamVelocity } from '../../services/teamImportService'
import { loadVelocityConfig, saveVelocityConfig, resetVelocityConfig } from '../../services/velocityConfigService'

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
  const [selectedMembers, setSelectedMembers] = useState([])
  const [velocityConfig, setVelocityConfig] = useState(loadVelocityConfig())
  const [showVelocityConfig, setShowVelocityConfig] = useState(false)

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
      setSelectedMembers([]) // Clear selection after delete

      // Auto-save after deleting
      const config = loadTeamConfig()
      config.teamMembers = updated
      saveTeamConfig(config)
      onTeamUpdate()
    }
  }

  const handleToggleMemberSelection = (index) => {
    setSelectedMembers(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      } else {
        return [...prev, index]
      }
    })
  }

  const handleToggleSelectAll = () => {
    if (selectedMembers.length === teamMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(teamMembers.map((_, index) => index))
    }
  }

  const handleBulkDelete = () => {
    if (selectedMembers.length === 0) return

    const memberNames = selectedMembers.map(index => teamMembers[index].username).join(', ')
    if (confirm(`Remove ${selectedMembers.length} team member(s)?\n\n${memberNames}`)) {
      const updated = teamMembers.filter((_, index) => !selectedMembers.includes(index))
      setTeamMembers(updated)
      setSelectedMembers([])

      // Auto-save after deleting
      const config = loadTeamConfig()
      config.teamMembers = updated
      saveTeamConfig(config)
      onTeamUpdate()
    }
  }

  const handleSaveVelocityConfig = () => {
    const success = saveVelocityConfig(velocityConfig)
    if (success) {
      // Trigger re-render of capacity cards by calling onTeamUpdate
      onTeamUpdate()
      alert('Velocity configuration saved successfully!')
    } else {
      alert('Failed to save velocity configuration')
    }
  }

  const handleResetVelocityConfig = () => {
    if (confirm('Reset velocity configuration to defaults?')) {
      const defaultConfig = resetVelocityConfig()
      setVelocityConfig(defaultConfig)
      onTeamUpdate()
      alert('Velocity configuration reset to defaults')
    }
  }

  const handleVelocityConfigChange = (field, value) => {
    setVelocityConfig(prev => ({
      ...prev,
      [field]: value
    }))
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

      {/* Velocity Configuration */}
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
            Capacity Calculation Settings
          </h3>
          <button
            onClick={() => setShowVelocityConfig(!showVelocityConfig)}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              color: '#3B82F6',
              border: 'none',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {showVelocityConfig ? 'Hide' : 'Configure'}
          </button>
        </div>

        {/* Current Configuration Display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          background: velocityConfig.mode === 'dynamic' ? '#EFF6FF' : '#F3F4F6',
          border: `1px solid ${velocityConfig.mode === 'dynamic' ? '#BFDBFE' : '#E5E7EB'}`,
          borderRadius: '6px',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: '600', color: '#374151' }}>Current Mode:</div>
          <div style={{
            padding: '4px 12px',
            background: velocityConfig.mode === 'dynamic' ? '#3B82F6' : '#6B7280',
            color: 'white',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {velocityConfig.mode === 'dynamic' ? 'Dynamic (Velocity-Based)' : 'Static'}
          </div>
          {velocityConfig.mode === 'static' && (
            <div style={{ color: '#6B7280' }}>
              Using {velocityConfig.metricType === 'points'
                ? `${velocityConfig.staticHoursPerStoryPoint}h per story point`
                : `${velocityConfig.staticHoursPerIssue}h per issue`}
            </div>
          )}
          {velocityConfig.mode === 'dynamic' && (
            <div style={{ color: '#6B7280' }}>
              Based on last {velocityConfig.velocityLookbackIterations} iterations ({velocityConfig.metricType === 'points' ? 'story points' : 'issue count'})
            </div>
          )}
        </div>

        {/* Configuration Panel */}
        {showVelocityConfig && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '8px'
          }}>
            {/* Mode Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Calculation Mode
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: velocityConfig.mode === 'dynamic' ? '#EFF6FF' : 'white',
                  border: `2px solid ${velocityConfig.mode === 'dynamic' ? '#3B82F6' : '#D1D5DB'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="velocityMode"
                    value="dynamic"
                    checked={velocityConfig.mode === 'dynamic'}
                    onChange={(e) => handleVelocityConfigChange('mode', e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                      Dynamic (Recommended)
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      Calculate hours per SP based on individual velocity
                    </div>
                  </div>
                </label>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: velocityConfig.mode === 'static' ? '#F3F4F6' : 'white',
                  border: `2px solid ${velocityConfig.mode === 'static' ? '#6B7280' : '#D1D5DB'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="velocityMode"
                    value="static"
                    checked={velocityConfig.mode === 'static'}
                    onChange={(e) => handleVelocityConfigChange('mode', e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                      Static
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      Use fixed hours per story point for all members
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Metric Type Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Velocity Metric
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: velocityConfig.metricType === 'points' ? '#F0FDF4' : 'white',
                  border: `2px solid ${velocityConfig.metricType === 'points' ? '#10B981' : '#D1D5DB'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="metricType"
                    value="points"
                    checked={velocityConfig.metricType === 'points'}
                    onChange={(e) => handleVelocityConfigChange('metricType', e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                      Story Points
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      Track velocity based on story points completed
                    </div>
                  </div>
                </label>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: velocityConfig.metricType === 'issues' ? '#F0FDF4' : 'white',
                  border: `2px solid ${velocityConfig.metricType === 'issues' ? '#10B981' : '#D1D5DB'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="metricType"
                    value="issues"
                    checked={velocityConfig.metricType === 'issues'}
                    onChange={(e) => handleVelocityConfigChange('metricType', e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                      Issue Count
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      Track velocity based on number of issues completed
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Static Hours Configuration */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Static Hours per Story Point
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  step="0.5"
                  value={velocityConfig.staticHoursPerStoryPoint}
                  onChange={(e) => handleVelocityConfigChange('staticHoursPerStoryPoint', parseFloat(e.target.value))}
                  disabled={velocityConfig.mode === 'dynamic'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: velocityConfig.mode === 'dynamic' ? '#F3F4F6' : 'white',
                    opacity: velocityConfig.mode === 'dynamic' ? 0.6 : 1
                  }}
                />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  Used as fallback when velocity data is unavailable
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Static Hours per Issue
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  step="0.5"
                  value={velocityConfig.staticHoursPerIssue}
                  onChange={(e) => handleVelocityConfigChange('staticHoursPerIssue', parseFloat(e.target.value))}
                  disabled={velocityConfig.mode === 'dynamic'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: velocityConfig.mode === 'dynamic' ? '#F3F4F6' : 'white',
                    opacity: velocityConfig.mode === 'dynamic' ? 0.6 : 1
                  }}
                />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  Used with issue count metric type
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Lookback Iterations
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={velocityConfig.velocityLookbackIterations}
                  onChange={(e) => handleVelocityConfigChange('velocityLookbackIterations', parseInt(e.target.value))}
                  disabled={velocityConfig.mode === 'static'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: velocityConfig.mode === 'static' ? '#F3F4F6' : 'white',
                    opacity: velocityConfig.mode === 'static' ? 0.6 : 1
                  }}
                />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  Number of past iterations to analyze for velocity
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #E5E7EB'
            }}>
              <button
                onClick={handleResetVelocityConfig}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleSaveVelocityConfig}
                style={{
                  padding: '8px 24px',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Save Configuration
              </button>
            </div>

            {/* Info Box */}
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#92400E'
            }}>
              <strong>Note:</strong> Dynamic mode calculates hours per story point based on each team member's historical performance.
              Individual velocity is used when available (≥2 iterations of data), otherwise team average or static value is used as fallback.
            </div>
          </div>
        )}
      </div>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
              Team Roster
            </h3>
            {teamMembers.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: '#6B7280',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.length === teamMembers.length && teamMembers.length > 0}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                  Select All
                </label>
                {selectedMembers.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    style={{
                      padding: '6px 12px',
                      background: '#FEE2E2',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Remove Selected ({selectedMembers.length})
                  </button>
                )}
              </div>
            )}
          </div>
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
                  background: selectedMembers.includes(index) ? '#F0F9FF' : 'white',
                  border: `1px solid ${selectedMembers.includes(index) ? '#BFDBFE' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                {/* Checkbox */}
                <div>
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(index)}
                    onChange={() => handleToggleMemberSelection(index)}
                    style={{
                      cursor: 'pointer',
                      width: '18px',
                      height: '18px'
                    }}
                  />
                </div>

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
