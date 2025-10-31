import React, { useState, useEffect } from 'react'
import { getAllProjects, getActiveProjectId, setActiveProject } from '../services/storageService'

/**
 * Portfolio Filter Dropdown
 * Sticky dropdown for switching between projects in portfolio
 * Appears on all tabs when multiple projects are configured
 */
export default function PortfolioFilterDropdown({ onProjectChange }) {
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = () => {
    const allProjects = getAllProjects()
    setProjects(allProjects)

    const currentActiveId = getActiveProjectId()
    setActiveProjectId(currentActiveId)
  }

  const handleProjectSelect = (projectId) => {
    setActiveProject(projectId)
    setActiveProjectId(projectId)
    setIsOpen(false)

    if (onProjectChange) {
      onProjectChange(projectId)
    }

    // Reload page to fetch new project data
    window.location.reload()
  }

  const handleCrossProjectView = () => {
    setActiveProjectId('cross-project')
    setIsOpen(false)

    if (onProjectChange) {
      onProjectChange('cross-project')
    }
  }

  // Don't show if no projects configured or only one project
  if (projects.length <= 1) {
    return null
  }

  const activeProject = projects.find(p => p.id === activeProjectId)
  const displayName = activeProjectId === 'cross-project'
    ? 'Cross-Project View'
    : activeProject?.name || 'Select Project'

  return (
    <div style={{
      position: 'sticky',
      top: '0',
      zIndex: 900,
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <label style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#1F2937',
        minWidth: '100px'
      }}>
        📁 Portfolio:
      </label>

      <div style={{ position: 'relative', minWidth: '300px' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            padding: '8px 36px 8px 12px',
            background: 'white',
            border: '2px solid #E60000',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1F2937',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {activeProjectId === 'cross-project' && '🔗 '}
            {displayName}
          </span>
          <span style={{
            position: 'absolute',
            right: '12px',
            fontSize: '12px',
            color: '#6B7280',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▼
          </span>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999
              }}
            />

            {/* Dropdown Menu */}
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {/* Cross-Project View Option */}
              <div
                onClick={handleCrossProjectView}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: activeProjectId === 'cross-project' ? '#FEF2F2' : 'white',
                  borderBottom: '1px solid #E5E7EB',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={(e) => {
                  if (activeProjectId !== 'cross-project') {
                    e.currentTarget.style.background = 'white'
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#E60000'
                }}>
                  <span style={{ fontSize: '16px' }}>🔗</span>
                  Cross-Project View
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  marginTop: '2px',
                  marginLeft: '24px'
                }}>
                  Aggregate data across all {projects.length} projects
                </div>
              </div>

              {/* Individual Projects */}
              <div style={{
                padding: '8px 0'
              }}>
                <div style={{
                  padding: '6px 16px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Projects ({projects.length})
                </div>

                {projects.map(project => {
                  const isActive = project.id === activeProjectId

                  return (
                    <div
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: isActive ? '#FEF2F2' : 'white',
                        borderLeft: isActive ? '3px solid #E60000' : '3px solid transparent',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'white'
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: isActive ? '600' : '500',
                            color: '#1F2937',
                            marginBottom: '2px'
                          }}>
                            {project.name}
                            {isActive && (
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '12px',
                                color: '#E60000',
                                fontWeight: '600'
                              }}>
                                ✓
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6B7280'
                          }}>
                            {project.projectId}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Manage Portfolio Link */}
              <div
                onClick={() => {
                  setIsOpen(false)
                  // Navigate to portfolio view
                  if (onProjectChange) {
                    onProjectChange('portfolio-manage')
                  }
                }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: '#F9FAFB',
                  borderTop: '1px solid #E5E7EB',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#E60000',
                  textAlign: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F9FAFB'}
              >
                ⚙️ Manage Portfolio Projects
              </div>
            </div>
          </>
        )}
      </div>

      {/* Project Count Badge */}
      <div style={{
        padding: '4px 10px',
        background: '#EFF6FF',
        color: '#1E40AF',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {projects.length} project{projects.length > 1 ? 's' : ''}
      </div>
    </div>
  )
}
