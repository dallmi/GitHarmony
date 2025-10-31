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
      case 'met': return '✅'
      case 'partial': return '⚡'
      case 'not-met': return '❌'
      default: return '⏳'
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
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)'
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              opacity: 0.9,
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '500'
            }}>
              Sprint Goal
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              {sprintName}
            </div>
          </div>

          {/* Stats Badge */}
          {stats && stats.hasGoals && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              backdropFilter: 'blur(10px)'
            }}>
              {stats.achievementRate}% Achievement Rate
            </div>
          )}
        </div>

        {/* Goal Display/Edit */}
        {!isEditing ? (
          <div>
            {goal && goal.goal ? (
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  lineHeight: '1.5',
                  marginBottom: '8px'
                }}>
                  {goal.goal}
                </div>

                {/* Achievement Status */}
                {goal.achievement && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: getAchievementColor(goal.achievement) + '20',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: getAchievementColor(goal.achievement),
                    border: `1px solid ${getAchievementColor(goal.achievement)}40`
                  }}>
                    {getAchievementIcon(goal.achievement)} {getAchievementLabel(goal.achievement)}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '12px',
                textAlign: 'center',
                opacity: 0.7,
                border: '2px dashed rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: '14px' }}>
                  No sprint goal set yet
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Click "Set Goal" to define your sprint objective
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                {goal && goal.goal ? 'Edit Goal' : 'Set Goal'}
              </button>

              {/* Achievement Selector */}
              {goal && goal.goal && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleAchievementChange('met')}
                    style={{
                      padding: '8px 12px',
                      background: goal.achievement === 'met' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: `1px solid ${goal.achievement === 'met' ? '#10B981' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Mark as Met"
                  >
                    ✅
                  </button>
                  <button
                    onClick={() => handleAchievementChange('partial')}
                    style={{
                      padding: '8px 12px',
                      background: goal.achievement === 'partial' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: `1px solid ${goal.achievement === 'partial' ? '#F59E0B' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Mark as Partially Met"
                  >
                    ⚡
                  </button>
                  <button
                    onClick={() => handleAchievementChange('not-met')}
                    style={{
                      padding: '8px 12px',
                      background: goal.achievement === 'not-met' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: `1px solid ${goal.achievement === 'not-met' ? '#EF4444' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Mark as Not Met"
                  >
                    ❌
                  </button>
                </div>
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
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
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
                style={{
                  padding: '8px 20px',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#10B981'}
              >
                Save Goal
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 20px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
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
