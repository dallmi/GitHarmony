import React, { useState } from 'react'
import { USER_ROLES } from '../constants/config'
import { getUserRole, setUserRole, getRoleInfo } from '../services/userPreferencesService'

/**
 * Role Selector Modal
 * Allows users to select their role for personalized navigation
 */
export default function RoleSelectorModal({ show, onClose }) {
  const [selectedRole, setSelectedRole] = useState(getUserRole())

  if (!show) return null

  const handleSave = () => {
    setUserRole(selectedRole)
    onClose()
    // Reload to apply role-based filtering
    window.location.reload()
  }

  const roles = [
    { id: USER_ROLES.EXECUTIVE, ...getRoleInfo(USER_ROLES.EXECUTIVE) },
    { id: USER_ROLES.MANAGER, ...getRoleInfo(USER_ROLES.MANAGER) },
    { id: USER_ROLES.TEAM, ...getRoleInfo(USER_ROLES.TEAM) }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Select Your Role</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
            Choose your role to customize the navigation and features you see. This helps reduce clutter
            and focuses on the views most relevant to your responsibilities.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            {roles.map(role => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                style={{
                  padding: '20px',
                  border: `2px solid ${selectedRole === role.id ? 'var(--primary)' : 'var(--border-medium)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedRole === role.id ? 'var(--bg-secondary)' : 'white',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{role.icon}</span>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {role.label}
                    </div>
                  </div>
                  {selectedRole === role.id && (
                    <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '20px' }}>
                      ✓
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '36px' }}>
                  {role.description}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'var(--bg-tertiary)',
            borderRadius: '6px',
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}>
            <strong>Note:</strong> You can change your role anytime from the settings menu in the header.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Role
          </button>
        </div>
      </div>
    </div>
  )
}
