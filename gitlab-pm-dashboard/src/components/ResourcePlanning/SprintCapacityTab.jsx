import React, { useState, useEffect, useMemo } from 'react'
import { loadTeamConfig, getSprintMemberCapacity, loadSprintCapacity, saveSprintCapacity } from '../../services/teamConfigService'
import { calculateSprintCapacityWithAbsences } from '../../services/absenceService'
import { getUniqueIterations } from '../../services/velocityService'
import { getIterationName } from '../../utils/labelUtils'

/**
 * Sprint Capacity Tab
 * Shows the cascade: Default Capacity → Absence Impact → Manual Override → Final Capacity
 */
export default function SprintCapacityTab({ issues, isCrossProject, refreshKey }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [sprints, setSprints] = useState([])
  const [selectedSprint, setSelectedSprint] = useState(null)
  const [manualOverrides, setManualOverrides] = useState({})
  const [editingMember, setEditingMember] = useState(null)

  // Debug cross-project detection
  console.log('SprintCapacityTab - isCrossProject:', isCrossProject)

  useEffect(() => {
    loadData()
  }, [refreshKey])

  useEffect(() => {
    if (issues && issues.length > 0) {
      loadSprints()
    }
  }, [issues])

  const loadData = () => {
    const config = loadTeamConfig()
    setTeamMembers(config.teamMembers || [])
  }

  const loadSprints = () => {
    const iterations = getUniqueIterations(issues)
    const sprintList = iterations
      .map(name => {
        const issue = issues.find(i => getIterationName(i.iteration) === name)
        return {
          name,
          id: issue?.iteration?.id || name,
          startDate: issue?.iteration?.start_date ? new Date(issue.iteration.start_date) : null,
          dueDate: issue?.iteration?.due_date ? new Date(issue.iteration.due_date) : null
        }
      })
      .filter(s => s.startDate && s.dueDate)
      .sort((a, b) => b.startDate - a.startDate) // Most recent first

    setSprints(sprintList)
    if (sprintList.length > 0 && !selectedSprint) {
      setSelectedSprint(sprintList[0])
    }
  }

  // Calculate capacity breakdown for each member in selected sprint
  const capacityBreakdown = useMemo(() => {
    if (!selectedSprint || teamMembers.length === 0) return []

    return teamMembers.map(member => {
      const defaultCapacity = member.defaultCapacity || 0

      // Calculate sprint duration in weeks
      const sprintDays = Math.ceil((selectedSprint.dueDate - selectedSprint.startDate) / (1000 * 60 * 60 * 24))
      const workingDays = Math.floor(sprintDays * (5/7)) // Rough estimate excluding weekends
      const sprintWeeks = workingDays / 5
      const sprintDefaultCapacity = Math.round(sprintWeeks * defaultCapacity)

      // Calculate absence impact
      const absenceCalc = calculateSprintCapacityWithAbsences(member.username, selectedSprint, defaultCapacity)
      const hoursLost = absenceCalc.hoursLost || 0
      const autoAdjustedCapacity = Math.max(0, sprintDefaultCapacity - hoursLost)

      // Check for manual override
      const sprintCapacityData = loadSprintCapacity()
      const sprintData = sprintCapacityData.sprints.find(s => s.sprintId === selectedSprint.id)
      const memberOverride = sprintData?.memberCapacity?.find(m => m.username === member.username)
      const manualCapacity = memberOverride?.availableHours

      const finalCapacity = manualCapacity !== undefined ? manualCapacity : autoAdjustedCapacity

      return {
        username: member.username,
        name: member.name,
        gpn: member.gpn,
        tNumber: member.tNumber,
        avatarUrl: member.avatarUrl,
        role: member.role,
        weeklyDefault: defaultCapacity,
        sprintDefault: sprintDefaultCapacity,
        absenceHours: hoursLost,
        absenceDays: absenceCalc.workingDaysLost || 0,
        autoAdjusted: autoAdjustedCapacity,
        manualOverride: manualCapacity,
        final: finalCapacity,
        hasOverride: manualCapacity !== undefined,
        absences: absenceCalc.absences || []
      }
    })
  }, [selectedSprint, teamMembers, refreshKey])

  const totals = useMemo(() => {
    return capacityBreakdown.reduce((acc, member) => ({
      sprintDefault: acc.sprintDefault + member.sprintDefault,
      absenceHours: acc.absenceHours + member.absenceHours,
      autoAdjusted: acc.autoAdjusted + member.autoAdjusted,
      manualAdjustment: acc.manualAdjustment + (member.hasOverride ? (member.manualOverride - member.autoAdjusted) : 0),
      final: acc.final + member.final
    }), { sprintDefault: 0, absenceHours: 0, autoAdjusted: 0, manualAdjustment: 0, final: 0 })
  }, [capacityBreakdown])

  const handleSetManualOverride = (username, hours) => {
    const sprintCapacityData = loadSprintCapacity()
    let sprintData = sprintCapacityData.sprints.find(s => s.sprintId === selectedSprint.id)

    if (!sprintData) {
      sprintData = {
        sprintId: selectedSprint.id,
        sprintName: selectedSprint.name,
        memberCapacity: []
      }
      sprintCapacityData.sprints.push(sprintData)
    }

    const existingIndex = sprintData.memberCapacity.findIndex(m => m.username === username)
    if (existingIndex >= 0) {
      if (hours === null) {
        // Remove override
        sprintData.memberCapacity.splice(existingIndex, 1)
      } else {
        sprintData.memberCapacity[existingIndex].availableHours = hours
      }
    } else if (hours !== null) {
      sprintData.memberCapacity.push({ username, availableHours: hours })
    }

    saveSprintCapacity(sprintCapacityData)
    setEditingMember(null)
    loadData() // Refresh to show new values
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
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3 style={{ color: '#374151', marginBottom: '8px' }}>Sprint Capacity Unavailable</h3>
        <p style={{ color: '#6B7280' }}>
          Sprint capacity planning is only available for individual projects.
          Please select a specific project.
        </p>
      </div>
    )
  }

  if (teamMembers.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#F9FAFB',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ color: '#374151', marginBottom: '8px' }}>No Team Members</h3>
        <p style={{ color: '#6B7280' }}>
          Please add team members in the Team Setup tab first.
        </p>
      </div>
    )
  }

  if (sprints.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#F9FAFB',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
        <h3 style={{ color: '#374151', marginBottom: '8px' }}>No Sprints Found</h3>
        <p style={{ color: '#6B7280' }}>
          No sprint iterations found in your issues.
          Make sure your issues have iteration/sprint assignments.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Sprint Selector */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
          Select Sprint
        </label>
        <select
          value={selectedSprint?.id || ''}
          onChange={(e) => {
            const sprint = sprints.find(s => s.id === e.target.value)
            setSelectedSprint(sprint)
          }}
          style={{
            padding: '10px 14px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '300px',
            background: 'white'
          }}
        >
          {sprints.map(sprint => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.name} ({sprint.startDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {sprint.dueDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })})
            </option>
          ))}
        </select>
      </div>

      {/* Capacity Breakdown Table */}
      <div style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                Member
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                Default<br/><span style={{ fontWeight: '400', fontSize: '11px', color: '#6B7280' }}>(Sprint Total)</span>
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                Absences<br/><span style={{ fontWeight: '400', fontSize: '11px', color: '#6B7280' }}>(Hours Lost)</span>
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                Auto-Adjusted<br/><span style={{ fontWeight: '400', fontSize: '11px', color: '#6B7280' }}>(After Absences)</span>
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                Manual Override<br/><span style={{ fontWeight: '400', fontSize: '11px', color: '#6B7280' }}>(Optional)</span>
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                Final Capacity
              </th>
            </tr>
          </thead>
          <tbody>
            {capacityBreakdown.map((member, idx) => (
              <tr key={member.username} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div>
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name || member.username}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #E5E7EB'
                          }}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          color: '#9CA3AF',
                          fontWeight: '600'
                        }}>
                          {(member.name || member.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Member Info */}
                    <div>
                      <div style={{ fontWeight: '500', color: '#1F2937', marginBottom: '2px' }}>
                        {member.name || member.username}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                        {member.username && <span>@{member.username}</span>}
                        {member.gpn && <span>GPN: {member.gpn}</span>}
                        {member.tNumber && <span>T-Number: {member.tNumber}</span>}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#6B7280',
                        background: '#F3F4F6',
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '3px'
                      }}>
                        {member.role} • {member.weeklyDefault}h/week
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#374151' }}>
                  {member.sprintDefault}h
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {member.absenceHours > 0 ? (
                    <div>
                      <div style={{ fontSize: '14px', color: '#DC2626', fontWeight: '500' }}>
                        -{member.absenceHours}h
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        ({member.absenceDays} days)
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  {member.autoAdjusted}h
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {editingMember === member.username ? (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <input
                        type="number"
                        defaultValue={member.manualOverride !== undefined ? member.manualOverride : member.autoAdjusted}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSetManualOverride(member.username, parseInt(e.target.value))
                          } else if (e.key === 'Escape') {
                            setEditingMember(null)
                          }
                        }}
                        style={{
                          width: '70px',
                          padding: '4px 8px',
                          border: '1px solid #3B82F6',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => setEditingMember(null)}
                        style={{
                          padding: '4px 8px',
                          background: '#F3F4F6',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : member.hasOverride ? (
                    <div>
                      <div style={{ fontSize: '14px', color: '#3B82F6', fontWeight: '500' }}>
                        {member.manualOverride}h
                      </div>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                          onClick={() => setEditingMember(member.username)}
                          style={{
                            padding: '2px 6px',
                            background: '#F3F4F6',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            color: '#374151'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSetManualOverride(member.username, null)}
                          style={{
                            padding: '2px 6px',
                            background: '#FEE2E2',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            color: '#DC2626'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingMember(member.username)}
                      style={{
                        padding: '4px 12px',
                        background: '#F3F4F6',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#6B7280'
                      }}
                    >
                      + Set Override
                    </button>
                  )}
                </td>
                <td style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: member.hasOverride ? '#3B82F6' : '#10B981'
                }}>
                  {member.final}h
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr style={{ background: '#F9FAFB', fontWeight: '600' }}>
              <td style={{ padding: '12px', fontSize: '14px', color: '#1F2937' }}>
                Total Team Capacity
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#374151' }}>
                {totals.sprintDefault}h
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#DC2626' }}>
                -{totals.absenceHours}h
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#374151' }}>
                {totals.autoAdjusted}h
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: totals.manualAdjustment < 0 ? '#DC2626' : '#10B981' }}>
                {totals.manualAdjustment > 0 ? '+' : ''}{totals.manualAdjustment}h
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontSize: '18px', fontWeight: '700', color: '#1F2937' }}>
                {totals.final}h
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Help Text */}
      <div style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '6px',
        padding: '12px 16px',
        fontSize: '13px',
        color: '#1E40AF'
      }}>
        <strong>How it works:</strong> Default capacity is calculated based on weekly hours and sprint duration.
        Absences automatically reduce capacity. You can add manual overrides for exceptional cases (e.g., team member working part-time during sprint).
      </div>
    </div>
  )
}
