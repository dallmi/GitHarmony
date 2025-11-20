import React, { useState, useMemo, useEffect } from 'react'

/**
 * Release Planning View
 * Manage release trains, deployment windows, and generate release notes
 */
export default function ReleasePlanningView({ issues = [], milestones = [], epics = [] }) {
  const [releases, setReleases] = useState([])
  const [activeRelease, setActiveRelease] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRelease, setEditingRelease] = useState(null) // For editing existing releases
  const [viewMode, setViewMode] = useState('calendar') // calendar, timeline
  const [featureToggles, setFeatureToggles] = useState({})
  const [selectedRelease, setSelectedRelease] = useState(null)

  // Load releases from localStorage
  useEffect(() => {
    loadReleases()
    loadFeatureToggles()
  }, [])

  const loadReleases = () => {
    try {
      const stored = localStorage.getItem('gitlab-pm-releases')
      if (stored) {
        const data = JSON.parse(stored)
        setReleases(data.releases || [])
        if (data.releases?.length > 0 && !activeRelease) {
          setActiveRelease(data.releases[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading releases:', error)
    }
  }

  const saveReleases = (newReleases) => {
    try {
      localStorage.setItem('gitlab-pm-releases', JSON.stringify({
        releases: newReleases,
        updatedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Error saving releases:', error)
    }
  }

  const loadFeatureToggles = () => {
    try {
      const stored = localStorage.getItem('gitlab-pm-feature-toggles')
      if (stored) {
        setFeatureToggles(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading feature toggles:', error)
    }
  }

  const saveFeatureToggles = (toggles) => {
    try {
      localStorage.setItem('gitlab-pm-feature-toggles', JSON.stringify(toggles))
      setFeatureToggles(toggles)
    } catch (error) {
      console.error('Error saving feature toggles:', error)
    }
  }

  // Create new release
  const createRelease = (releaseData) => {
    const newRelease = {
      id: `release-${Date.now()}`,
      ...releaseData,
      createdAt: new Date().toISOString(),
      status: 'planning',
      deploymentWindows: [],
      includedIssues: [],
      includedEpics: [],
      featureFlags: []
    }

    // Use functional update to ensure we have the latest releases state
    setReleases(prevReleases => {
      const updatedReleases = [...prevReleases, newRelease]
      saveReleases(updatedReleases)
      return updatedReleases
    })
    setActiveRelease(newRelease.id)
    return newRelease
  }

  // Update existing release
  const updateRelease = (releaseId, releaseData) => {
    setReleases(prevReleases => {
      const updatedReleases = prevReleases.map(release =>
        release.id === releaseId
          ? { ...release, ...releaseData, updatedAt: new Date().toISOString() }
          : release
      )
      saveReleases(updatedReleases)
      return updatedReleases
    })
  }

  // Delete release
  const deleteRelease = (releaseId) => {
    if (window.confirm('Are you sure you want to delete this release? This action cannot be undone.')) {
      setReleases(prevReleases => {
        const updatedReleases = prevReleases.filter(release => release.id !== releaseId)
        saveReleases(updatedReleases)
        return updatedReleases
      })
      // Clear active release if deleted
      if (activeRelease === releaseId) {
        setActiveRelease(null)
      }
      setShowCreateModal(false)
      setEditingRelease(null)
    }
  }

  // Get active release object
  const currentRelease = releases.find(r => r.id === activeRelease)

  // Calculate release content
  const releaseContent = useMemo(() => {
    if (!currentRelease) return { issues: [], epics: [], milestones: [] }

    // Filter issues for this release
    const releaseIssues = issues.filter(issue => {
      // Check if issue is tagged for this release
      if (issue.labels?.includes(`release::${currentRelease.version}`)) return true

      // Check if issue's milestone matches release milestone
      if (currentRelease.milestone && issue.milestone?.title === currentRelease.milestone) return true

      // Check if issue is manually included
      if (currentRelease.includedIssues?.includes(issue.iid)) return true

      // Check if issue is within release date range
      if (issue.due_date) {
        const dueDate = new Date(issue.due_date)
        const releaseDate = new Date(currentRelease.targetDate)
        const startDate = new Date(currentRelease.startDate)
        return dueDate >= startDate && dueDate <= releaseDate
      }

      return false
    })

    // Filter epics for this release
    const releaseEpics = epics.filter(epic => {
      if (epic.labels?.includes(`release::${currentRelease.version}`)) return true
      if (currentRelease.includedEpics?.includes(epic.id)) return true

      if (epic.due_date) {
        const dueDate = new Date(epic.due_date)
        const releaseDate = new Date(currentRelease.targetDate)
        return dueDate <= releaseDate
      }

      return false
    })

    // Get related milestones
    const releaseMilestones = milestones.filter(m => {
      if (m.title === currentRelease.milestone) return true

      if (m.due_date) {
        const dueDate = new Date(m.due_date)
        const releaseDate = new Date(currentRelease.targetDate)
        const startDate = new Date(currentRelease.startDate)
        return dueDate >= startDate && dueDate <= releaseDate
      }

      return false
    })

    return {
      issues: releaseIssues,
      epics: releaseEpics,
      milestones: releaseMilestones
    }
  }, [currentRelease, issues, epics, milestones])

  // Group issues by category for release notes
  const categorizedIssues = useMemo(() => {
    const categories = {
      features: [],
      enhancements: [],
      bugFixes: [],
      security: [],
      performance: [],
      documentation: [],
      other: []
    }

    releaseContent.issues.forEach(issue => {
      const labels = issue.labels || []

      if (labels.some(l => l.toLowerCase().includes('feature') || l.toLowerCase().includes('new'))) {
        categories.features.push(issue)
      } else if (labels.some(l => l.toLowerCase().includes('enhancement') || l.toLowerCase().includes('improvement'))) {
        categories.enhancements.push(issue)
      } else if (labels.some(l => l.toLowerCase().includes('bug') || l.toLowerCase().includes('fix'))) {
        categories.bugFixes.push(issue)
      } else if (labels.some(l => l.toLowerCase().includes('security'))) {
        categories.security.push(issue)
      } else if (labels.some(l => l.toLowerCase().includes('performance'))) {
        categories.performance.push(issue)
      } else if (labels.some(l => l.toLowerCase().includes('documentation') || l.toLowerCase().includes('docs'))) {
        categories.documentation.push(issue)
      } else {
        categories.other.push(issue)
      }
    })

    return categories
  }, [releaseContent])

  // Generate release notes
  const generateReleaseNotes = () => {
    if (!currentRelease) return ''

    let notes = `# Release ${currentRelease.version}\n\n`
    notes += `**Release Date:** ${new Date(currentRelease.targetDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}\n`
    notes += `**Status:** ${currentRelease.status}\n\n`

    if (currentRelease.description) {
      notes += `## Overview\n${currentRelease.description}\n\n`
    }

    // Add categorized issues
    if (categorizedIssues.features.length > 0) {
      notes += `## 🎉 New Features\n`
      categorizedIssues.features.forEach(issue => {
        notes += `- ${issue.title} (#${issue.iid})\n`
      })
      notes += '\n'
    }

    if (categorizedIssues.enhancements.length > 0) {
      notes += `## ✨ Enhancements\n`
      categorizedIssues.enhancements.forEach(issue => {
        notes += `- ${issue.title} (#${issue.iid})\n`
      })
      notes += '\n'
    }

    if (categorizedIssues.bugFixes.length > 0) {
      notes += `## 🐛 Bug Fixes\n`
      categorizedIssues.bugFixes.forEach(issue => {
        notes += `- ${issue.title} (#${issue.iid})\n`
      })
      notes += '\n'
    }

    if (categorizedIssues.security.length > 0) {
      notes += `## 🔒 Security Updates\n`
      categorizedIssues.security.forEach(issue => {
        notes += `- ${issue.title} (#${issue.iid})\n`
      })
      notes += '\n'
    }

    if (categorizedIssues.performance.length > 0) {
      notes += `## ⚡ Performance Improvements\n`
      categorizedIssues.performance.forEach(issue => {
        notes += `- ${issue.title} (#${issue.iid})\n`
      })
      notes += '\n'
    }

    // Add feature toggles
    const releaseToggles = Object.entries(featureToggles).filter(([key, toggle]) =>
      toggle.release === currentRelease.version
    )

    if (releaseToggles.length > 0) {
      notes += `## 🔧 Feature Toggles\n`
      releaseToggles.forEach(([key, toggle]) => {
        notes += `- **${key}**: ${toggle.enabled ? 'Enabled' : 'Disabled'} - ${toggle.description || 'No description'}\n`
      })
      notes += '\n'
    }

    // Add deployment windows
    if (currentRelease.deploymentWindows?.length > 0) {
      notes += `## 📅 Deployment Windows\n`
      currentRelease.deploymentWindows.forEach(window => {
        notes += `- ${window.environment}: ${new Date(window.startTime).toLocaleString()} - ${new Date(window.endTime).toLocaleString()}\n`
      })
      notes += '\n'
    }

    // Add contributors
    const contributors = new Set()
    releaseContent.issues.forEach(issue => {
      if (issue.assignee) contributors.add(issue.assignee.username)
      if (issue.author) contributors.add(issue.author.username)
    })

    if (contributors.size > 0) {
      notes += `## 👥 Contributors\n`
      notes += Array.from(contributors).map(c => `@${c}`).join(', ') + '\n\n'
    }

    return notes
  }

  // Render release calendar view
  const renderCalendar = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 3, 0) // 3 months view

    const weeks = []
    let currentWeek = []
    let currentDate = new Date(startOfMonth)
    currentDate.setDate(currentDate.getDate() - currentDate.getDay()) // Start from Sunday

    while (currentDate <= endOfMonth) {
      currentWeek.push(new Date(currentDate))

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return (
      <div style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Release Calendar
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <th
                    key={day}
                    style={{
                      padding: '8px',
                      borderBottom: '2px solid #E5E7EB',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6B7280',
                      textAlign: 'center'
                    }}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((date, dateIndex) => {
                    const dateStr = date.toISOString().split('T')[0]
                    const dayReleases = releases.filter(r => {
                      const targetDate = new Date(r.targetDate).toISOString().split('T')[0]
                      return targetDate === dateStr
                    })

                    const hasDeployment = releases.some(r =>
                      r.deploymentWindows?.some(w => {
                        const windowDate = new Date(w.startTime).toISOString().split('T')[0]
                        return windowDate === dateStr
                      })
                    )

                    const isToday = date.toDateString() === today.toDateString()
                    const isCurrentMonth = date.getMonth() === today.getMonth()

                    return (
                      <td
                        key={dateIndex}
                        style={{
                          padding: '4px',
                          border: '1px solid #F3F4F6',
                          height: '80px',
                          verticalAlign: 'top',
                          background: isToday ? '#F0F9FF' :
                                    !isCurrentMonth ? '#FAFAFA' :
                                    'white',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          fontSize: '12px',
                          fontWeight: isToday ? '600' : '400',
                          color: isToday ? '#0369A1' : '#6B7280',
                          marginBottom: '4px'
                        }}>
                          {date.getDate()}
                        </div>

                        {dayReleases.map(release => (
                          <div
                            key={release.id}
                            onClick={() => {
                              setEditingRelease(release)
                              setShowCreateModal(true)
                            }}
                            style={{
                              padding: '2px 4px',
                              background: release.status === 'released' ? '#D1FAE5' :
                                        release.status === 'deploying' ? '#FEF3C7' :
                                        '#E0E7FF',
                              color: release.status === 'released' ? '#065F46' :
                                    release.status === 'deploying' ? '#92400E' :
                                    '#3730A3',
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontWeight: '600',
                              marginBottom: '2px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            v{release.version}
                          </div>
                        ))}

                        {hasDeployment && (
                          <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            width: '8px',
                            height: '8px',
                            background: '#F59E0B',
                            borderRadius: '50%'
                          }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }


  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
            Release Planning
          </h2>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Manage release trains, deployment windows, and generate release notes
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          + New Release
        </button>
      </div>

      {/* Release Selector and Controls */}
      <div style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
            Active Release:
          </label>
          <select
            value={activeRelease || ''}
            onChange={(e) => setActiveRelease(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px',
              maxWidth: '300px'
            }}
          >
            <option value="">Select a release...</option>
            {releases.map(release => (
              <option key={release.id} value={release.id}>
                v{release.version} - {release.name} ({release.status})
              </option>
            ))}
          </select>

          {currentRelease && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: '#6B7280' }}>
                Target: {new Date(currentRelease.targetDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              <span style={{
                padding: '2px 8px',
                background: currentRelease.status === 'released' ? '#D1FAE5' :
                          currentRelease.status === 'deploying' ? '#FEF3C7' :
                          '#F3F4F6',
                color: currentRelease.status === 'released' ? '#065F46' :
                      currentRelease.status === 'deploying' ? '#92400E' :
                      '#374151',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {currentRelease.status}
              </span>
              <button
                onClick={() => {
                  setEditingRelease(currentRelease)
                  setShowCreateModal(true)
                }}
                style={{
                  padding: '4px 12px',
                  background: 'white',
                  color: '#3B82F6',
                  border: '1px solid #3B82F6',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Edit Release
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['calendar', 'timeline'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '6px 12px',
                background: viewMode === mode ? '#3B82F6' : 'white',
                color: viewMode === mode ? 'white' : '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: mode === 'calendar' ? '6px 0 0 6px' : '0 6px 6px 0',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Release Metrics */}
      {currentRelease && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
              Total Issues
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937' }}>
              {releaseContent.issues.length}
            </div>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
              Completed
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#10B981' }}>
              {releaseContent.issues.filter(i => i.state === 'closed').length}
            </div>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
              In Progress
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#F59E0B' }}>
              {releaseContent.issues.filter(i =>
                i.labels?.some(l => l.toLowerCase().includes('doing'))
              ).length}
            </div>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
              Feature Toggles
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#8B5CF6' }}>
              {Object.entries(featureToggles).filter(([_, t]) =>
                t.release === currentRelease.version
              ).length}
            </div>
          </div>
        </div>
      )}

      {/* Main View */}
      {viewMode === 'calendar' && renderCalendar()}

      {/* Release Content */}
      {currentRelease && viewMode !== 'calendar' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          {/* Release Issues */}
          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Release Content
            </h3>

            {Object.entries(categorizedIssues).map(([category, issues]) => {
              if (issues.length === 0) return null

              return (
                <div key={category} style={{ marginBottom: '20px' }}>
                  <h4 style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    textTransform: 'capitalize'
                  }}>
                    {category.replace(/([A-Z])/g, ' $1').trim()} ({issues.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {issues.slice(0, 5).map(issue => (
                      <div
                        key={issue.iid}
                        style={{
                          padding: '8px',
                          background: '#F9FAFB',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>#{issue.iid} {issue.title.substring(0, 50)}</span>
                          <span style={{
                            padding: '2px 6px',
                            background: issue.state === 'closed' ? '#D1FAE5' : '#FEF3C7',
                            color: issue.state === 'closed' ? '#065F46' : '#92400E',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {issue.state}
                          </span>
                        </div>
                      </div>
                    ))}
                    {issues.length > 5 && (
                      <div style={{ fontSize: '11px', color: '#6B7280', padding: '4px 8px' }}>
                        +{issues.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Release Notes Preview */}
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
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                Release Notes Preview
              </h3>
              <button
                onClick={() => {
                  const notes = generateReleaseNotes()
                  navigator.clipboard.writeText(notes)
                  alert('Release notes copied to clipboard!')
                }}
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
              >
                Copy to Clipboard
              </button>
            </div>

            <pre style={{
              background: '#F9FAFB',
              padding: '16px',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: '1.6',
              overflow: 'auto',
              maxHeight: '400px',
              whiteSpace: 'pre-wrap'
            }}>
              {generateReleaseNotes()}
            </pre>
          </div>
        </div>
      )}

      {/* Create Release Modal */}
      {showCreateModal && (
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
          onClick={() => {
            setShowCreateModal(false)
            setEditingRelease(null)
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              {editingRelease ? 'Edit Release' : 'Create New Release'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  Version
                </label>
                <input
                  id="release-version"
                  type="text"
                  placeholder="1.0.0"
                  defaultValue={editingRelease?.version || ''}
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
                  Name
                </label>
                <input
                  id="release-name"
                  type="text"
                  placeholder="Q1 2024 Release"
                  defaultValue={editingRelease?.name || ''}
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
                  Type
                </label>
                <select
                  id="release-type"
                  defaultValue={editingRelease?.type || 'major'}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="patch">Patch</option>
                  <option value="hotfix">Hotfix</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                  Target Date
                </label>
                <input
                  id="release-date"
                  type="date"
                  defaultValue={editingRelease?.targetDate ? new Date(editingRelease.targetDate).toISOString().split('T')[0] : ''}
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
                  Start Date
                </label>
                <input
                  id="release-start-date"
                  type="date"
                  defaultValue={editingRelease?.startDate ? new Date(editingRelease.startDate).toISOString().split('T')[0] : ''}
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
                  Milestone (optional)
                </label>
                <select
                  id="release-milestone"
                  defaultValue={editingRelease?.milestone || ''}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">None</option>
                  {milestones.map(m => (
                    <option key={m.id} value={m.title}>{m.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                Description
              </label>
              <textarea
                id="release-description"
                rows={4}
                placeholder="Release description..."
                defaultValue={editingRelease?.description || ''}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: editingRelease ? 'space-between' : 'flex-end', marginTop: '20px' }}>
              {editingRelease && (
                <button
                  onClick={() => deleteRelease(editingRelease.id)}
                  style={{
                    padding: '8px 16px',
                    background: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Delete Release
                </button>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingRelease(null)
                  }}
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
                    const version = document.getElementById('release-version').value
                    const name = document.getElementById('release-name').value
                    const type = document.getElementById('release-type').value
                    const targetDate = document.getElementById('release-date').value
                    const startDate = document.getElementById('release-start-date').value
                    const milestone = document.getElementById('release-milestone').value
                    const description = document.getElementById('release-description').value

                    if (version && name && targetDate && startDate) {
                      if (editingRelease) {
                        updateRelease(editingRelease.id, {
                          version,
                          name,
                          type,
                          targetDate,
                          startDate,
                          milestone,
                          description
                        })
                      } else {
                        createRelease({
                          version,
                          name,
                          type,
                          targetDate,
                          startDate,
                          milestone,
                          description
                        })
                      }
                      setShowCreateModal(false)
                      setEditingRelease(null)
                    }
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
                  {editingRelease ? 'Update Release' : 'Create Release'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}