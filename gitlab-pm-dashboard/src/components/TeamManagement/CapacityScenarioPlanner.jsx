import React, { useState, useMemo, useEffect } from 'react'
import { loadAbsences } from '../../services/absenceService'
import { calculateVelocity } from '../../services/capacityAnalysisService'
import { DEFAULT_ROLES } from '../../services/teamConfigService'

/**
 * Advanced Capacity Scenario Planner
 * Enables "what if" analysis for team changes, hiring, and attrition
 */
export default function CapacityScenarioPlanner({ teamMembers, issues, milestones }) {
  const [scenarios, setScenarios] = useState([])
  const [activeScenarioId, setActiveScenarioId] = useState(null)
  const [showScenarioModal, setShowScenarioModal] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [selectedScenarios, setSelectedScenarios] = useState([])
  const [forecastWeeks, setForecastWeeks] = useState(12)

  // Modal state for team changes
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [changeModalType, setChangeModalType] = useState('hire') // 'hire', 'departure', 'capacity'
  const [changeFormData, setChangeFormData] = useState({
    week: 1,
    name: '',
    username: '',
    role: 'Developer',
    capacity: 40,
    rampUpWeeks: 4,
    memberUsername: '',
    newCapacity: 40
  })

  // Initialize with baseline scenario
  useEffect(() => {
    if (scenarios.length === 0) {
      const baselineScenario = createBaselineScenario()
      setScenarios([baselineScenario])
      setActiveScenarioId(baselineScenario.id)
    }
  }, [teamMembers])

  // Create baseline scenario from current team
  const createBaselineScenario = () => {
    return {
      id: 'baseline',
      name: 'Current Team (Baseline)',
      description: 'Current team configuration without changes',
      teamChanges: [],
      createdAt: new Date().toISOString()
    }
  }

  // Get active scenario
  const activeScenario = scenarios.find(s => s.id === activeScenarioId)

  // Add a new scenario
  const addScenario = (name, description) => {
    const newScenario = {
      id: `scenario-${Date.now()}`,
      name,
      description,
      teamChanges: [],
      createdAt: new Date().toISOString()
    }
    setScenarios([...scenarios, newScenario])
    setActiveScenarioId(newScenario.id)
    setShowScenarioModal(false)
  }

  // Delete a scenario
  const deleteScenario = (scenarioId) => {
    if (scenarioId === 'baseline') return

    setScenarios(scenarios.filter(s => s.id !== scenarioId))
    if (activeScenarioId === scenarioId) {
      setActiveScenarioId('baseline')
    }
  }

  // Add a team change to the active scenario
  const addTeamChange = (type, details) => {
    if (!activeScenario || activeScenario.id === 'baseline') {
      alert('Please create a new scenario first. Cannot modify baseline.')
      return
    }

    const change = {
      id: `change-${Date.now()}`,
      type, // 'hire', 'departure', 'capacity_change'
      ...details
    }

    const updatedScenario = {
      ...activeScenario,
      teamChanges: [...activeScenario.teamChanges, change]
    }

    setScenarios(scenarios.map(s =>
      s.id === activeScenario.id ? updatedScenario : s
    ))
  }

  // Remove a team change
  const removeTeamChange = (changeId) => {
    if (!activeScenario || activeScenario.id === 'baseline') return

    const updatedScenario = {
      ...activeScenario,
      teamChanges: activeScenario.teamChanges.filter(c => c.id !== changeId)
    }

    setScenarios(scenarios.map(s =>
      s.id === activeScenario.id ? updatedScenario : s
    ))
  }

  // Calculate forecast with scenario applied
  const forecastData = useMemo(() => {
    if (!activeScenario) return []

    const weeks = []
    const today = new Date()
    const absences = loadAbsences()?.absences || []

    for (let i = 0; i < forecastWeeks; i++) {
      const weekNum = i + 1
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() + (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      // Apply scenario changes to get team state for this week
      let currentTeam = [...teamMembers]

      // Apply all changes up to and including this week
      activeScenario.teamChanges.forEach(change => {
        if (change.week <= weekNum) {
          switch (change.type) {
            case 'hire':
              currentTeam.push({
                username: change.username,
                name: change.name,
                role: change.role,
                defaultCapacity: change.capacity,
                startWeek: weekNum,
                rampUpWeeks: change.rampUpWeeks || 4,
                endWeek: null
              })
              break

            case 'departure':
              currentTeam = currentTeam.map(m =>
                m.username === change.username
                  ? { ...m, endWeek: weekNum }
                  : m
              )
              break

            case 'capacity_change':
              currentTeam = currentTeam.map(m =>
                m.username === change.username
                  ? { ...m, defaultCapacity: change.newCapacity }
                  : m
              )
              break
          }
        }
      })

      // Calculate active team for this week
      const activeTeam = currentTeam.filter(m =>
        (m.startWeek <= weekNum) && (!m.endWeek || m.endWeek > weekNum)
      )

      // Calculate capacity with ramp-up consideration
      let totalCapacity = 0
      let effectiveCapacity = 0

      activeTeam.forEach(member => {
        const baseCapacity = member.defaultCapacity !== undefined && member.defaultCapacity !== null ? member.defaultCapacity : 40
        totalCapacity += baseCapacity

        // Apply ramp-up factor for new hires
        const weeksActive = weekNum - member.startWeek
        const rampUpFactor = member.rampUpWeeks > 0
          ? Math.min(1, (weeksActive + 1) / member.rampUpWeeks)
          : 1

        let memberEffectiveCapacity = baseCapacity * rampUpFactor

        // Check for absences
        const memberAbsences = absences.filter(absence =>
          absence.username === member.username &&
          new Date(absence.startDate) <= weekEnd &&
          new Date(absence.endDate) >= weekStart
        )

        // Calculate absence impact
        if (memberAbsences.length > 0) {
          const dailyCapacity = baseCapacity / 5
          let workingDaysOff = 0

          memberAbsences.forEach(absence => {
            const absStart = new Date(Math.max(new Date(absence.startDate).getTime(), weekStart.getTime()))
            const absEnd = new Date(Math.min(new Date(absence.endDate).getTime(), weekEnd.getTime()))

            let current = new Date(absStart)
            while (current <= absEnd) {
              if (current.getDay() !== 0 && current.getDay() !== 6) {
                workingDaysOff++
              }
              current.setDate(current.getDate() + 1)
            }
          })

          memberEffectiveCapacity -= (workingDaysOff * dailyCapacity)
        }

        effectiveCapacity += Math.max(0, memberEffectiveCapacity)
      })

      // Estimate workload
      const upcomingIssues = issues.filter(issue => {
        if (!issue.due_date) return false
        const dueDate = new Date(issue.due_date)
        return dueDate >= weekStart && dueDate <= weekEnd
      })

      const storyPoints = upcomingIssues.reduce((sum, issue) => {
        const sp = issue.labels?.find(l => l.startsWith('sp::'))?.replace('sp::', '') || '0'
        return sum + parseInt(sp)
      }, 0)

      const estimatedWorkload = storyPoints * 6 // 6 hours per story point

      // Find milestones
      const weekMilestones = milestones.filter(m => {
        if (!m.due_date) return false
        const dueDate = new Date(m.due_date)
        return dueDate >= weekStart && dueDate <= weekEnd
      })

      weeks.push({
        weekNum,
        weekStart,
        weekEnd,
        teamCount: activeTeam.length,
        totalCapacity,
        effectiveCapacity,
        estimatedWorkload,
        utilization: effectiveCapacity > 0 ? Math.round((estimatedWorkload / effectiveCapacity) * 100) : 0,
        milestones: weekMilestones,
        issues: upcomingIssues,
        teamChanges: activeScenario.teamChanges.filter(c => c.week === weekNum)
      })
    }

    return weeks
  }, [activeScenario, forecastWeeks, teamMembers, issues, milestones])

  // Submit change modal
  const handleSubmitChange = () => {
    if (changeModalType === 'hire') {
      const username = changeFormData.username ||
        changeFormData.name.toLowerCase().replace(/\s+/g, '.')

      addTeamChange('hire', {
        week: parseInt(changeFormData.week),
        name: changeFormData.name,
        username: username,
        role: changeFormData.role,
        capacity: parseInt(changeFormData.capacity),
        rampUpWeeks: parseInt(changeFormData.rampUpWeeks)
      })
    } else if (changeModalType === 'departure') {
      const member = teamMembers.find(m => m.username === changeFormData.memberUsername)
      if (member) {
        addTeamChange('departure', {
          week: parseInt(changeFormData.week),
          name: member.name || member.username,
          username: member.username
        })
      }
    } else if (changeModalType === 'capacity') {
      const member = teamMembers.find(m => m.username === changeFormData.memberUsername)
      if (member) {
        addTeamChange('capacity_change', {
          week: parseInt(changeFormData.week),
          name: member.name || member.username,
          username: member.username,
          oldCapacity: member.defaultCapacity !== undefined && member.defaultCapacity !== null ? member.defaultCapacity : 40,
          newCapacity: parseInt(changeFormData.newCapacity)
        })
      }
    }

    setShowChangeModal(false)
  }

  return (
    <div>
      {/* Scenario Management Header */}
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
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
            Scenario Planning
          </h3>
          <button
            onClick={() => setShowScenarioModal(true)}
            style={{
              padding: '8px 16px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            + New Scenario
          </button>
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            style={{
              padding: '8px 16px',
              background: comparisonMode ? '#10B981' : 'white',
              color: comparisonMode ? 'white' : '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {comparisonMode ? 'Exit Comparison' : 'Compare Scenarios'}
          </button>
        </div>
      </div>

      {/* Scenario Selector */}
      <div style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
            Active Scenario:
          </label>
          <select
            value={activeScenarioId}
            onChange={(e) => setActiveScenarioId(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px',
              flex: 1,
              maxWidth: '300px'
            }}
          >
            {scenarios.map(scenario => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>

          {activeScenario && activeScenario.id !== 'baseline' && (
            <button
              onClick={() => {
                if (confirm('Delete this scenario?')) {
                  deleteScenario(activeScenario.id)
                }
              }}
              style={{
                padding: '6px 12px',
                background: '#FEE2E2',
                color: '#DC2626',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          )}
        </div>

        {/* Scenario Actions */}
        {activeScenario && activeScenario.id !== 'baseline' && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <button
              onClick={() => {
                setChangeModalType('hire')
                setChangeFormData({
                  week: 1,
                  name: '',
                  username: '',
                  role: 'Developer',
                  capacity: 40,
                  rampUpWeeks: 4,
                  memberUsername: '',
                  newCapacity: 40
                })
                setShowChangeModal(true)
              }}
              style={{
                padding: '6px 12px',
                background: '#EFF6FF',
                color: '#3B82F6',
                border: '1px solid #3B82F6',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              + Add Hiring
            </button>
            <button
              onClick={() => {
                setChangeModalType('departure')
                setChangeFormData({
                  week: 1,
                  name: '',
                  username: '',
                  role: 'Developer',
                  capacity: 40,
                  rampUpWeeks: 4,
                  memberUsername: teamMembers[0]?.username || '',
                  newCapacity: 40
                })
                setShowChangeModal(true)
              }}
              style={{
                padding: '6px 12px',
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #DC2626',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              + Add Departure
            </button>
            <button
              onClick={() => {
                setChangeModalType('capacity')
                setChangeFormData({
                  week: 1,
                  name: '',
                  username: '',
                  role: 'Developer',
                  capacity: 40,
                  rampUpWeeks: 4,
                  memberUsername: teamMembers[0]?.username || '',
                  newCapacity: teamMembers[0]?.defaultCapacity !== undefined && teamMembers[0]?.defaultCapacity !== null ? teamMembers[0].defaultCapacity : 40
                })
                setShowChangeModal(true)
              }}
              style={{
                padding: '6px 12px',
                background: '#FEF3C7',
                color: '#F59E0B',
                border: '1px solid #F59E0B',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              + Capacity Change
            </button>
          </div>
        )}
      </div>

      {/* Team Changes List */}
      {activeScenario && activeScenario.teamChanges.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1F2937' }}>
            Planned Changes
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeScenario.teamChanges.sort((a, b) => a.week - b.week).map(change => (
              <div
                key={change.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#F9FAFB',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 8px',
                    background: '#E5E7EB',
                    color: '#374151',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    Week {change.week}
                  </span>
                  {change.type === 'hire' && (
                    <span style={{ color: '#3B82F6' }}>
                      + Hire {change.name} ({change.role}, {change.capacity}h/week)
                    </span>
                  )}
                  {change.type === 'departure' && (
                    <span style={{ color: '#DC2626' }}>
                      - {change.name} leaves
                    </span>
                  )}
                  {change.type === 'capacity_change' && (
                    <span style={{ color: '#F59E0B' }}>
                      {change.name}: {change.oldCapacity}h → {change.newCapacity}h
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeTeamChange(change.id)}
                  style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    color: '#DC2626',
                    border: 'none',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast Visualization */}
      <div style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
            Capacity Forecast
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', color: '#6B7280' }}>Weeks:</label>
            <select
              value={forecastWeeks}
              onChange={(e) => setForecastWeeks(parseInt(e.target.value))}
              style={{
                padding: '4px 8px',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
              <option value={16}>16 weeks</option>
              <option value={24}>24 weeks</option>
            </select>
          </div>
        </div>

        {/* Forecast Grid */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: '#6B7280' }}>Week</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#6B7280' }}>Team</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#6B7280' }}>Capacity</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#6B7280' }}>Effective</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#6B7280' }}>Workload</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#6B7280' }}>Utilization</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#6B7280' }}>Events</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.map((week, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #F3F4F6',
                    background: week.utilization > 100 ? '#FEE2E2' :
                               week.utilization > 80 ? '#FEF3C7' :
                               'white'
                  }}
                >
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: '500' }}>Week {week.weekNum}</div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      {week.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {week.teamCount}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {Math.round(week.totalCapacity)}h
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: '500' }}>
                    {Math.round(week.effectiveCapacity)}h
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {Math.round(week.estimatedWorkload)}h
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 6px',
                      background: week.utilization > 100 ? '#DC2626' :
                                 week.utilization > 80 ? '#F59E0B' :
                                 '#10B981',
                      color: 'white',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {week.utilization}%
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {week.teamChanges.map(change => (
                        <span
                          key={change.id}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            background: change.type === 'hire' ? '#DBEAFE' :
                                       change.type === 'departure' ? '#FEE2E2' :
                                       '#FEF3C7',
                            color: change.type === 'hire' ? '#1E40AF' :
                                  change.type === 'departure' ? '#991B1B' :
                                  '#92400E',
                            borderRadius: '4px'
                          }}
                        >
                          {change.type === 'hire' ? `+${change.name}` :
                           change.type === 'departure' ? `-${change.name}` :
                           `${change.name} capacity`}
                        </span>
                      ))}
                      {week.milestones.map(m => (
                        <span
                          key={m.id}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            background: '#EDE9FE',
                            color: '#5B21B6',
                            borderRadius: '4px'
                          }}
                        >
                          {m.title}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Scenario Modal */}
      {showScenarioModal && (
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
        }}
        onClick={() => setShowScenarioModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Create New Scenario
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                Scenario Name
              </label>
              <input
                id="scenario-name"
                type="text"
                placeholder="e.g., Aggressive Hiring Plan"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                Description (optional)
              </label>
              <textarea
                id="scenario-description"
                placeholder="Describe the scenario..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowScenarioModal(false)}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = document.getElementById('scenario-name').value
                  const description = document.getElementById('scenario-description').value

                  if (!name) {
                    alert('Please enter a scenario name')
                    return
                  }

                  addScenario(name, description)
                }}
                style={{
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
                Create Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Change Modal */}
      {showChangeModal && (
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
        }}
        onClick={() => setShowChangeModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              {changeModalType === 'hire' && 'Add New Hire'}
              {changeModalType === 'departure' && 'Add Team Departure'}
              {changeModalType === 'capacity' && 'Change Team Member Capacity'}
            </h3>

            {/* Week Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                Week
              </label>
              <select
                value={changeFormData.week}
                onChange={(e) => setChangeFormData({ ...changeFormData, week: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {Array.from({ length: forecastWeeks }, (_, i) => i + 1).map(week => (
                  <option key={week} value={week}>
                    Week {week} ({new Date(Date.now() + (week - 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </option>
                ))}
              </select>
            </div>

            {/* Hire Form */}
            {changeModalType === 'hire' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={changeFormData.name}
                    onChange={(e) => setChangeFormData({ ...changeFormData, name: e.target.value })}
                    placeholder="Full Name"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                    Username (optional)
                  </label>
                  <input
                    type="text"
                    value={changeFormData.username}
                    onChange={(e) => setChangeFormData({ ...changeFormData, username: e.target.value })}
                    placeholder="Will be generated from name if empty"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                    Role
                  </label>
                  <select
                    value={changeFormData.role}
                    onChange={(e) => setChangeFormData({ ...changeFormData, role: e.target.value })}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                      Weekly Capacity (hours)
                    </label>
                    <input
                      type="number"
                      value={changeFormData.capacity}
                      onChange={(e) => setChangeFormData({ ...changeFormData, capacity: parseInt(e.target.value) })}
                      min="0"
                      max="60"
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                      Ramp-up Period (weeks)
                    </label>
                    <input
                      type="number"
                      value={changeFormData.rampUpWeeks}
                      onChange={(e) => setChangeFormData({ ...changeFormData, rampUpWeeks: parseInt(e.target.value) })}
                      min="0"
                      max="12"
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
              </>
            )}

            {/* Departure Form */}
            {changeModalType === 'departure' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  Team Member
                </label>
                <select
                  value={changeFormData.memberUsername}
                  onChange={(e) => setChangeFormData({ ...changeFormData, memberUsername: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  {teamMembers.map(member => (
                    <option key={member.username} value={member.username}>
                      {member.name || member.username} ({member.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Capacity Change Form */}
            {changeModalType === 'capacity' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                    Team Member
                  </label>
                  <select
                    value={changeFormData.memberUsername}
                    onChange={(e) => {
                      const member = teamMembers.find(m => m.username === e.target.value)
                      setChangeFormData({
                        ...changeFormData,
                        memberUsername: e.target.value,
                        newCapacity: member?.defaultCapacity !== undefined && member?.defaultCapacity !== null ? member.defaultCapacity : 40
                      })
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    {teamMembers.map(member => (
                      <option key={member.username} value={member.username}>
                        {member.name || member.username} ({member.role}) - Current: {member.defaultCapacity !== undefined && member.defaultCapacity !== null ? member.defaultCapacity : 40}h
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                    New Weekly Capacity (hours)
                  </label>
                  <input
                    type="number"
                    value={changeFormData.newCapacity}
                    onChange={(e) => setChangeFormData({ ...changeFormData, newCapacity: parseInt(e.target.value) })}
                    min="0"
                    max="60"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#6B7280' }}>
                    Current capacity: {(() => {
                      const member = teamMembers.find(m => m.username === changeFormData.memberUsername)
                      return member?.defaultCapacity !== undefined && member?.defaultCapacity !== null ? member.defaultCapacity : 40
                    })()}h/week
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowChangeModal(false)}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitChange}
                style={{
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
                {changeModalType === 'hire' && 'Add Hire'}
                {changeModalType === 'departure' && 'Add Departure'}
                {changeModalType === 'capacity' && 'Update Capacity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}