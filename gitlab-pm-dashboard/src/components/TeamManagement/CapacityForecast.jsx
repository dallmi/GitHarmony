import React, { useState, useMemo } from 'react'
import { loadAbsences } from '../../services/absenceService'

/**
 * Capacity Forecast Component
 * Shows future capacity predictions and identifies upcoming bottlenecks
 */
export default function CapacityForecast({ teamMembers, issues, milestones, absenceStats }) {
  const [forecastWeeks, setForecastWeeks] = useState(8)
  const [selectedWeek, setSelectedWeek] = useState(null)

  // Generate forecast data for the next N weeks
  const forecastData = useMemo(() => {
    const weeks = []
    const today = new Date()
    const absenceData = loadAbsences()
    const absences = absenceData?.absences || []

    for (let i = 0; i < forecastWeeks; i++) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() + (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      // Calculate capacity for this week
      let totalCapacity = 0
      let absenceImpact = 0
      const memberCapacities = []

      teamMembers.forEach(member => {
        const baseCapacity = member.defaultCapacity || 40

        // Check for absences in this week
        const memberAbsences = absences.filter(absence =>
          absence.username === member.username &&
          new Date(absence.startDate) <= weekEnd &&
          new Date(absence.endDate) >= weekStart
        )

        // Calculate working days affected
        let workingDaysOff = 0
        memberAbsences.forEach(absence => {
          const absStart = new Date(Math.max(new Date(absence.startDate).getTime(), weekStart.getTime()))
          const absEnd = new Date(Math.min(new Date(absence.endDate).getTime(), weekEnd.getTime()))

          // Count working days (Monday-Friday)
          let current = new Date(absStart)
          while (current <= absEnd) {
            const dayOfWeek = current.getDay()
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              workingDaysOff++
            }
            current.setDate(current.getDate() + 1)
          }
        })

        const dailyCapacity = baseCapacity / 5
        const weekAbsenceImpact = workingDaysOff * dailyCapacity
        const availableCapacity = baseCapacity - weekAbsenceImpact

        totalCapacity += baseCapacity
        absenceImpact += weekAbsenceImpact

        memberCapacities.push({
          member,
          baseCapacity,
          absenceImpact: weekAbsenceImpact,
          availableCapacity,
          absences: memberAbsences
        })
      })

      // Estimate workload for this week (simplified - could be enhanced with velocity data)
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

      // Identify bottlenecks
      const utilization = Math.round(((estimatedWorkload / (totalCapacity - absenceImpact)) * 100))
      let status = 'healthy'
      let statusColor = '#10B981'

      if (utilization >= 100) {
        status = 'critical'
        statusColor = '#DC2626'
      } else if (utilization >= 80) {
        status = 'warning'
        statusColor = '#F59E0B'
      } else if (absenceImpact / totalCapacity > 0.3) {
        status = 'reduced'
        statusColor = '#6B7280'
      }

      // Find milestones in this week
      const weekMilestones = milestones.filter(m => {
        if (!m.due_date) return false
        const dueDate = new Date(m.due_date)
        return dueDate >= weekStart && dueDate <= weekEnd
      })

      weeks.push({
        weekNumber: i + 1,
        weekStart,
        weekEnd,
        totalCapacity,
        absenceImpact,
        availableCapacity: totalCapacity - absenceImpact,
        estimatedWorkload,
        utilization,
        status,
        statusColor,
        memberCapacities,
        upcomingIssues,
        weekMilestones,
        absenceCount: memberCapacities.filter(m => m.absenceImpact > 0).length
      })
    }

    return weeks
  }, [teamMembers, issues, milestones, forecastWeeks])

  // Identify critical weeks
  const criticalWeeks = forecastData.filter(w => w.status === 'critical' || w.status === 'warning')

  return (
    <div>
      {/* Forecast Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
            Capacity Forecast
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Predict resource availability and identify upcoming bottlenecks
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', color: '#374151' }}>Forecast Period:</label>
          <select
            value={forecastWeeks}
            onChange={(e) => setForecastWeeks(parseInt(e.target.value))}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            <option value="4">4 weeks</option>
            <option value="8">8 weeks</option>
            <option value="12">12 weeks</option>
            <option value="16">16 weeks</option>
          </select>
        </div>
      </div>

      {/* Critical Weeks Alert */}
      {criticalWeeks.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '8px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#92400E', marginBottom: '8px' }}>
            Bottlenecks Detected in {criticalWeeks.length} Week{criticalWeeks.length > 1 ? 's' : ''}
          </h4>
          <div style={{ fontSize: '13px', color: '#78350F' }}>
            {criticalWeeks.slice(0, 3).map((week, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                Week {week.weekNumber} ({week.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}):
                {' '}{week.utilization}% utilization
                {week.absenceCount > 0 && ` with ${week.absenceCount} team member${week.absenceCount > 1 ? 's' : ''} on leave`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast Timeline */}
      <div style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
          Weekly Capacity Timeline
        </h4>

        {/* Timeline Chart */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '800px' }}>
            {/* Chart Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(' + forecastWeeks + ', 1fr)',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>METRIC</div>
              {forecastData.map(week => (
                <div
                  key={week.weekNumber}
                  style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedWeek(week)}
                >
                  Week {week.weekNumber}
                  <div style={{ fontSize: '10px' }}>
                    {week.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Capacity Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(' + forecastWeeks + ', 1fr)',
              gap: '8px',
              marginBottom: '8px',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>Team Capacity</div>
              {forecastData.map(week => (
                <div
                  key={week.weekNumber}
                  style={{
                    textAlign: 'center',
                    padding: '8px 4px',
                    background: '#F9FAFB',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#1F2937'
                  }}
                >
                  {Math.round(week.availableCapacity)}h
                  {week.absenceImpact > 0 && (
                    <div style={{ fontSize: '10px', color: '#F59E0B', marginTop: '2px' }}>
                      -{Math.round(week.absenceImpact)}h
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Workload Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(' + forecastWeeks + ', 1fr)',
              gap: '8px',
              marginBottom: '8px',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>Est. Workload</div>
              {forecastData.map(week => (
                <div
                  key={week.weekNumber}
                  style={{
                    textAlign: 'center',
                    padding: '8px 4px',
                    background: '#F9FAFB',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#1F2937'
                  }}
                >
                  {week.estimatedWorkload}h
                  {week.upcomingIssues.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                      {week.upcomingIssues.length} issues
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Utilization Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(' + forecastWeeks + ', 1fr)',
              gap: '8px',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>Utilization</div>
              {forecastData.map(week => (
                <div
                  key={week.weekNumber}
                  style={{
                    textAlign: 'center',
                    padding: '8px 4px',
                    background: week.statusColor + '20',
                    borderRadius: '4px',
                    border: `1px solid ${week.statusColor}40`
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: week.statusColor
                  }}>
                    {week.utilization}%
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: week.statusColor,
                    marginTop: '2px',
                    textTransform: 'uppercase'
                  }}>
                    {week.status}
                  </div>
                </div>
              ))}
            </div>

            {/* Milestones Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(' + forecastWeeks + ', 1fr)',
              gap: '8px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>Milestones</div>
              {forecastData.map(week => (
                <div
                  key={week.weekNumber}
                  style={{
                    textAlign: 'center',
                    fontSize: '11px'
                  }}
                >
                  {week.weekMilestones.length > 0 ? (
                    week.weekMilestones.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '4px',
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          borderRadius: '4px',
                          marginBottom: '4px',
                          fontWeight: '500'
                        }}
                      >
                        {m.title}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: '#D1D5DB' }}>-</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div style={{
        background: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0369A1', marginBottom: '8px' }}>
          Recommendations
        </h4>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#0C4A6E' }}>
          {criticalWeeks.length > 0 && (
            <li style={{ marginBottom: '4px' }}>
              Consider redistributing work from weeks {criticalWeeks.map(w => w.weekNumber).join(', ')} to earlier periods
            </li>
          )}
          {forecastData.some(w => w.absenceCount >= 2) && (
            <li style={{ marginBottom: '4px' }}>
              Plan for reduced capacity during vacation periods - consider bringing in temporary resources
            </li>
          )}
          {forecastData.some(w => w.weekMilestones.length > 1) && (
            <li style={{ marginBottom: '4px' }}>
              Multiple milestones in the same week may create delivery risks - consider staggering deadlines
            </li>
          )}
          <li>
            Maintain a 20% capacity buffer for unplanned work and technical debt
          </li>
        </ul>
      </div>

      {/* Week Detail Modal */}
      {selectedWeek && (
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
          onClick={() => setSelectedWeek(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Week {selectedWeek.weekNumber} Details
            </h3>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
              {selectedWeek.weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -
              {' '}{selectedWeek.weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            {/* Capacity Breakdown */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Team Capacity</h4>
              {selectedWeek.memberCapacities.map(mc => (
                <div
                  key={mc.member.username}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px',
                    borderBottom: '1px solid #E5E7EB'
                  }}
                >
                  <div style={{ fontSize: '13px' }}>
                    {mc.member.name || mc.member.username}
                    {mc.absences.length > 0 && (
                      <span style={{ color: '#F59E0B', marginLeft: '8px' }}>
                        (absent {Math.round(mc.absenceImpact / (mc.baseCapacity / 5))} days)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>
                    {Math.round(mc.availableCapacity)}h / {mc.baseCapacity}h
                  </div>
                </div>
              ))}
            </div>

            {/* Issues Due */}
            {selectedWeek.upcomingIssues.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Issues Due ({selectedWeek.upcomingIssues.length})
                </h4>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {selectedWeek.upcomingIssues.map(issue => (
                    <div
                      key={issue.iid}
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #E5E7EB',
                        fontSize: '13px'
                      }}
                    >
                      #{issue.iid} {issue.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedWeek(null)}
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
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}