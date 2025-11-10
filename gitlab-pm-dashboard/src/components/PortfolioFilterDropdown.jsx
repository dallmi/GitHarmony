import React, { useState, useEffect } from 'react'
import { getAllProjects, getActiveProjectId, setActiveProject } from '../services/storageService'
import { loadProjectGroups } from '../services/projectGroupService'

/**
 * Portfolio Filter Dropdown
 * Sticky dropdown for switching between projects in portfolio
 * Appears on all tabs when multiple projects are configured
 */
export default function PortfolioFilterDropdown({ onProjectChange }) {
  const [projects, setProjects] = useState([])
  const [projectGroups, setProjectGroups] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = () => {
    const allProjects = getAllProjects()
    setProjects(allProjects)

    const allGroups = loadProjectGroups()
    setProjectGroups(allGroups)

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
    // Store cross-project mode in localStorage
    setActiveProject('cross-project')
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
  const activeGroup = activeProjectId?.startsWith('group:')
    ? projectGroups.find(g => `group:${g.id}` === activeProjectId)
    : null

  const displayName = activeProjectId === 'cross-project'
    ? 'Cross-Project View'
    : activeGroup
    ? activeGroup.name
    : activeProject?.name || 'Select Project'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <label style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#6B7280'
      }}>
        Project:
      </label>

      <div style={{ position: 'relative', minWidth: '200px' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            padding: '6px 28px 6px 10px',
            background: 'white',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#1F2937',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F9FAFB'
            e.currentTarget.style.borderColor = '#9CA3AF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.borderColor = '#D1D5DB'
          }}
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

              {/* Project Groups */}
              {projectGroups.length > 0 && (
                <div style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    padding: '6px 16px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Project Groups ({projectGroups.length})
                  </div>

                  {projectGroups.map(group => {
                    const groupId = `group:${group.id}`
                    const isActive = activeProjectId === groupId

                    return (
                      <div
                        key={group.id}
                        onClick={() => handleProjectSelect(groupId)}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          background: isActive ? '#EFF6FF' : 'white',
                          borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#EFF6FF'}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'white'
                          }
                        }}
                      >
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1F2937',
                          marginBottom: '2px'
                        }}>
                          📁 {group.name}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#6B7280'
                        }}>
                          {projects.filter(p => group.projectIds.includes(p.id)).length} projects
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

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
    </div>
  )
}
