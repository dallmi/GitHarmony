import React, { useState, useEffect } from 'react'
import { getCurrentSprintGoal, saveSprintGoal, getSprintGoalStats } from '../services/sprintGoalService'

/**
 * Sprint Goal Section for Sprint Management
 * Displays and edits the current sprint goal
 */
export default function SprintGoalSection({ sprintId = 'current', sprintName = 'Current Sprint' }) {
  const [goal, setGoal] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedGoal, setEditedGoal] = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadGoal()
    loadStats()
  }, [sprintId])

  const loadGoal = () => {
    const currentGoal = getCurrentSprintGoal(sprintId)
    setGoal(currentGoal)
    if (currentGoal) {
      setEditedGoal(currentGoal.goal || '')
    }
  }

  const loadStats = () => {
    const goalStats = getSprintGoalStats()
    setStats(goalStats)
  }

  const handleSave = () => {
    const updatedGoal = {
      sprintId,
      sprintName,
      goal: editedGoal,
      achievement: goal?.achievement || null,
      notes: goal?.notes || ''
    }

    saveSprintGoal(updatedGoal)
    loadGoal()
    loadStats()
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedGoal(goal?.goal || '')
    setIsEditing(false)
  }

  const handleAchievementChange = (achievement) => {
    const updatedGoal = {
      ...goal,
      sprintId,
      sprintName,
      achievement
    }

    saveSprintGoal(updatedGoal)
    loadGoal()
    loadStats()
  }

  const getAchievementColor = (achievement) => {
    switch (achievement) {
      case 'met': return '#10B981'
      case 'partial': return '#F59E0B'
      case 'not-met': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getAchievementIcon = (achievement) => {
    switch (achievement) {
      case 'met': return '●'
      case 'partial': return '◐'
      case 'not-met': return '○'
      default: return '○'
    }
  }

  const getAchievementLabel = (achievement) => {
    switch (achievement) {
      case 'met': return 'Met'
      case 'partial': return 'Partially Met'
      case 'not-met': return 'Not Met'
      default: return 'In Progress'
    }
  }

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      {/* Content */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '2px solid #E5E7EB'
        }}>
          <div>
            <div style={{
              fontSize: '16px',
              marginBottom: '4px',
              fontWeight: '600',
              color: '#1F2937'
            }}>
              Sprint Goal
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              {sprintName}
            </div>
          </div>

          {/* Stats Badge */}
          {stats && stats.hasGoals && (
            <div style={{
              background: '#F3F4F6',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Achievement: {stats.achievementRate}%
            </div>
          )}
        </div>

        {/* Goal Display/Edit */}
        {!isEditing ? (
          <div>
            {goal && goal.goal ? (
              <div style={{
                background: '#F9FAFB',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '500',
                  lineHeight: '1.6',
                  marginBottom: '12px',
                  color: '#1F2937'
                }}>
                  {goal.goal}
                </div>

                {/* Achievement Status */}
                {goal.achievement && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: getAchievementColor(goal.achievement),
                    border: `2px solid ${getAchievementColor(goal.achievement)}`
                  }}>
                    {getAchievementIcon(goal.achievement)} {getAchievementLabel(goal.achievement)}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#F9FAFB',
                padding: '24px',
                borderRadius: '6px',
                marginBottom: '16px',
                textAlign: 'center',
                border: '2px dashed #D1D5DB'
              }}>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>
                  No sprint goal set yet
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Click "Set Goal" to define your sprint objective
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                {goal && goal.goal ? 'Edit Goal' : 'Set Goal'}
              </button>

              {/* Achievement Selector */}
              {goal && goal.goal && (
                <>
                  <div style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    fontWeight: '500',
                    marginLeft: '4px'
                  }}>
                    Mark as:
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleAchievementChange('met')}
                      style={{
                        padding: '6px 12px',
                        background: goal.achievement === 'met' ? '#D1FAE5' : 'white',
                        color: goal.achievement === 'met' ? '#059669' : '#6B7280',
                        border: `2px solid ${goal.achievement === 'met' ? '#10B981' : '#E5E7EB'}`,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Mark as Met"
                    >
                      ✅ Met
                    </button>
                    <button
                      onClick={() => handleAchievementChange('partial')}
                      style={{
                        padding: '6px 12px',
                        background: goal.achievement === 'partial' ? '#FEF3C7' : 'white',
                        color: goal.achievement === 'partial' ? '#D97706' : '#6B7280',
                        border: `2px solid ${goal.achievement === 'partial' ? '#F59E0B' : '#E5E7EB'}`,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Mark as Partially Met"
                    >
                      ⚡ Partial
                    </button>
                    <button
                      onClick={() => handleAchievementChange('not-met')}
                      style={{
                        padding: '6px 12px',
                        background: goal.achievement === 'not-met' ? '#FEE2E2' : 'white',
                        color: goal.achievement === 'not-met' ? '#DC2626' : '#6B7280',
                        border: `2px solid ${goal.achievement === 'not-met' ? '#EF4444' : '#E5E7EB'}`,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Mark as Not Met"
                    >
                      ❌ Not Met
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <textarea
              value={editedGoal}
              onChange={(e) => setEditedGoal(e.target.value)}
              placeholder="Enter your sprint goal (e.g., 'Deliver MVP user authentication with OAuth and email verification')"
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                background: 'white',
                border: '2px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#1F2937',
                resize: 'vertical',
                marginBottom: '12px',
                fontFamily: 'inherit'
              }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                Save Goal
              </button>
              <button
                onClick={handleCancel}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
