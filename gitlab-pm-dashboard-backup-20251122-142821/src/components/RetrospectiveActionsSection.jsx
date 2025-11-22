import React, { useState, useEffect } from 'react'
import {
  getAllRetroActions,
  getActionsForSprint,
  getOpenActions,
  getOverdueActions,
  saveRetroAction,
  deleteRetroAction,
  completeAction,
  getRetroActionStats,
  exportRetroActionsCSV,
  downloadRetroActionsCSV,
  createDefaultAction
} from '../services/retroActionService'

/**
 * Retrospective Action Items Section
 * Manages continuous improvement actions from sprint retrospectives
 */
export default function RetrospectiveActionsSection({ sprintId = 'current', sprintName = 'Current Sprint' }) {
  const [actions, setActions] = useState([])
  const [stats, setStats] = useState(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingAction, setEditingAction] = useState(null)
  const [filter, setFilter] = useState('all') // all, open, overdue

  useEffect(() => {
    loadActions()
    loadStats()
  }, [sprintId])

  const loadActions = () => {
    const allActions = getActionsForSprint(sprintId)
    setActions(allActions)
  }

  const loadStats = () => {
    const actionStats = getRetroActionStats()
    setStats(actionStats)
  }

  const handleSave = (action) => {
    saveRetroAction({
      ...action,
      sprintId,
      sprintName
    })
    loadActions()
    loadStats()
    setIsAddingNew(false)
    setEditingAction(null)
  }

  const handleDelete = (actionId) => {
    if (confirm('Are you sure you want to delete this action?')) {
      deleteRetroAction(actionId)
      loadActions()
      loadStats()
    }
  }

  const handleStatusChange = (actionId, newStatus) => {
    if (newStatus === 'done') {
      completeAction(actionId)
    } else {
      const action = actions.find(a => a.id === actionId)
      if (action) {
        saveRetroAction({ ...action, status: newStatus })
      }
    }
    loadActions()
    loadStats()
  }

  const handleExportCSV = () => {
    const csvContent = exportRetroActionsCSV()
    downloadRetroActionsCSV(csvContent)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return '#10B981'
      case 'in-progress': return '#3B82F6'
      case 'open': return '#6B7280'
      case 'wont-do': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'done': return '✓ Done'
      case 'in-progress': return '⚡ In Progress'
      case 'open': return '○ Open'
      case 'wont-do': return '✕ Won\'t Do'
      default: return status
    }
  }

  const isOverdue = (action) => {
    if (!action.dueDate || action.status === 'done' || action.status === 'wont-do') return false
    const dueDate = new Date(action.dueDate)
    const now = new Date()
    return dueDate < now
  }

  const filteredActions = actions.filter(action => {
    if (filter === 'open') return action.status === 'open' || action.status === 'in-progress'
    if (filter === 'overdue') return isOverdue(action)
    return true
  })

  return (
    <div>
      {/* Stats Summary */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              Total Actions
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#1F2937' }}>
              {stats.totalActions}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              Open Actions
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#3B82F6' }}>
              {stats.openActions + stats.inProgressActions}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              Completion Rate
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: '700',
              color: stats.completionRate >= 70 ? '#10B981' : stats.completionRate >= 50 ? '#F59E0B' : '#EF4444'
            }}>
              {stats.completionRate}%
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              Overdue
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: stats.overdueActions > 0 ? '#EF4444' : '#10B981' }}>
              {stats.overdueActions}
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 14px',
              background: filter === 'all' ? '#E60000' : '#F3F4F6',
              color: filter === 'all' ? 'white' : '#4B5563',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            All ({actions.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            style={{
              padding: '6px 14px',
              background: filter === 'open' ? '#E60000' : '#F3F4F6',
              color: filter === 'open' ? 'white' : '#4B5563',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Open ({actions.filter(a => a.status === 'open' || a.status === 'in-progress').length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            style={{
              padding: '6px 14px',
              background: filter === 'overdue' ? '#E60000' : '#F3F4F6',
              color: filter === 'overdue' ? 'white' : '#4B5563',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Overdue ({getOverdueActions().length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '6px 12px',
              background: '#F3F4F6',
              color: '#4B5563',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              setIsAddingNew(true)
              setEditingAction(createDefaultAction(sprintId, sprintName))
            }}
            style={{
              padding: '6px 16px',
              background: '#E60000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            + Add Action
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingAction) && editingAction && (
        <div className="card" style={{
          marginBottom: '20px',
          background: '#F9FAFB',
          border: '2px solid #E60000'
        }}>
          <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
            {isAddingNew ? '➕ Add New Action' : '✏️ Edit Action'}
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#4B5563', marginBottom: '6px' }}>
                Action Item *
              </label>
              <textarea
                value={editingAction.action}
                onChange={(e) => setEditingAction({ ...editingAction, action: e.target.value })}
                placeholder="Describe the improvement action..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#4B5563', marginBottom: '6px' }}>
                  Owner
                </label>
                <input
                  type="text"
                  value={editingAction.owner}
                  onChange={(e) => setEditingAction({ ...editingAction, owner: e.target.value })}
                  placeholder="Assignee name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#4B5563', marginBottom: '6px' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={editingAction.dueDate}
                  onChange={(e) => setEditingAction({ ...editingAction, dueDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#4B5563', marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  value={editingAction.status}
                  onChange={(e) => setEditingAction({ ...editingAction, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="wont-do">Won't Do</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setIsAddingNew(false)
                  setEditingAction(null)
                }}
                style={{
                  padding: '8px 16px',
                  background: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editingAction)}
                disabled={!editingAction.action.trim()}
                style={{
                  padding: '8px 20px',
                  background: editingAction.action.trim() ? '#10B981' : '#D1D5DB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: editingAction.action.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                {isAddingNew ? 'Add Action' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions List */}
      {filteredActions.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredActions.map(action => {
            const overdueFlag = isOverdue(action)

            return (
              <div
                key={action.id}
                className="card"
                style={{
                  border: overdueFlag ? '2px solid #EF4444' : '1px solid #E5E7EB',
                  background: overdueFlag ? '#FEF2F2' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {/* Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        background: getStatusColor(action.status) + '20',
                        color: getStatusColor(action.status),
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {getStatusLabel(action.status)}
                      </span>

                      {overdueFlag && (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ⚠️ Overdue
                        </span>
                      )}

                      {action.carriedFrom && (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: '#FEF3C7',
                          color: '#D97706',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ↻ Carried Over
                        </span>
                      )}
                    </div>

                    {/* Action Text */}
                    <div style={{
                      fontSize: '14px',
                      color: '#1F2937',
                      marginBottom: '12px',
                      lineHeight: '1.5',
                      textDecoration: action.status === 'done' ? 'line-through' : 'none',
                      opacity: action.status === 'done' ? 0.6 : 1
                    }}>
                      {action.action}
                    </div>

                    {/* Metadata */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280' }}>
                      {action.owner && (
                        <div>
                          <strong>Owner:</strong> {action.owner}
                        </div>
                      )}
                      {action.dueDate && (
                        <div>
                          <strong>Due:</strong> {new Date(action.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      )}
                      <div>
                        <strong>Created:</strong> {new Date(action.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '16px' }}>
                    {action.status !== 'done' && action.status !== 'wont-do' && (
                      <>
                        {action.status === 'open' && (
                          <button
                            onClick={() => handleStatusChange(action.id, 'in-progress')}
                            style={{
                              padding: '6px 12px',
                              background: '#3B82F6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                            title="Start"
                          >
                            ▶
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(action.id, 'done')}
                          style={{
                            padding: '6px 12px',
                            background: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                          title="Complete"
                        >
                          ✓
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setIsAddingNew(false)
                        setEditingAction(action)
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#F3F4F6',
                        color: '#4B5563',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(action.id)}
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
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{
          padding: '40px',
          textAlign: 'center',
          background: '#F9FAFB',
          border: '2px dashed #D1D5DB'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#4B5563', marginBottom: '8px' }}>
            No {filter !== 'all' ? filter : ''} actions yet
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>
            Add retrospective action items to track continuous improvements
          </div>
        </div>
      )}
    </div>
  )
}
