import React, { useMemo, useState } from 'react'
import { getCriteriaDetails } from '../services/complianceService'

/**
 * Quality Violations By Author View
 * Shows quality criteria first, then shows person distribution for selected criterion
 */
export default function QualityViolationsByAuthor({ nonCompliantIssues }) {
  const [selectedCriterion, setSelectedCriterion] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)

  const criteria = getCriteriaDetails()

  // Calculate violations by criterion with issue details
  const criterionData = useMemo(() => {
    if (!nonCompliantIssues || nonCompliantIssues.length === 0) {
      return new Map()
    }

    const dataMap = new Map()

    // Initialize all criteria
    criteria.forEach(criterion => {
      dataMap.set(criterion.key, {
        key: criterion.key,
        name: criterion.name,
        description: criterion.description,
        severity: criterion.severity,
        issues: new Set(), // Use Set to track unique issues
        totalViolations: 0 // Total violation count (can be multiple per issue)
      })
    })

    // Process each non-compliant issue
    nonCompliantIssues.forEach(issue => {
      issue.violations.forEach(violation => {
        const data = dataMap.get(violation.criterion)
        if (data) {
          data.issues.add(issue)
          data.totalViolations++
        }
      })
    })

    // Convert Sets to arrays
    dataMap.forEach((value, key) => {
      value.issues = Array.from(value.issues)
    })

    return dataMap
  }, [nonCompliantIssues, criteria])

  // Calculate person distribution for selected criterion
  const personDistribution = useMemo(() => {
    if (!selectedCriterion || !criterionData.has(selectedCriterion)) {
      return []
    }

    const criterionInfo = criterionData.get(selectedCriterion)
    const personMap = new Map()

    // Process each issue that violates this criterion
    criterionInfo.issues.forEach(issue => {
      // Determine the responsible persons
      // Priority: assignees > author
      const persons = []

      if (issue.assignees && issue.assignees.length > 0) {
        issue.assignees.forEach(assignee => {
          const name = assignee.name || assignee.username || 'Unknown'
          persons.push(name)
        })
      } else if (issue.author) {
        const name = issue.author.name || issue.author.username || 'Unknown'
        persons.push(name)
      } else {
        persons.push('Unassigned')
      }

      // Add issue to each person's list
      persons.forEach(personName => {
        if (!personMap.has(personName)) {
          personMap.set(personName, {
            name: personName,
            issues: [],
            violationCount: 0
          })
        }

        const personData = personMap.get(personName)
        personData.issues.push(issue)

        // Count violations for this specific criterion in this issue
        const violationsInIssue = issue.violations.filter(v => v.criterion === selectedCriterion).length
        personData.violationCount += violationsInIssue
      })
    })

    // Convert to array and sort by issue count
    return Array.from(personMap.values())
      .sort((a, b) => b.issues.length - a.issues.length)
  }, [selectedCriterion, criterionData, nonCompliantIssues])

  // Get issues for selected person
  const selectedPersonIssues = useMemo(() => {
    if (!selectedPerson || !personDistribution) {
      return []
    }

    const person = personDistribution.find(p => p.name === selectedPerson)
    return person?.issues || []
  }, [selectedPerson, personDistribution])

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#DC2626'
      case 'medium': return '#D97706'
      case 'low': return '#2563EB'
      default: return '#6B7280'
    }
  }

  if (!nonCompliantIssues || nonCompliantIssues.length === 0) {
    return (
      <div className="card text-center" style={{ padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>✓</div>
        <h3 className="mb-2">All Issues Compliant</h3>
        <p className="text-muted">
          No quality violations found. Great job!
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Step 1: Quality Criteria Selection */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          Step 1: Select a Quality Criterion
        </h3>
        <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
          Choose a quality criterion to see how violations are distributed across team members.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {criteria.map(criterion => {
            const data = criterionData.get(criterion.key)
            const isSelected = selectedCriterion === criterion.key
            const hasViolations = data && data.issues.length > 0

            return (
              <div
                key={criterion.key}
                onClick={() => {
                  if (hasViolations) {
                    setSelectedCriterion(isSelected ? null : criterion.key)
                    setSelectedPerson(null) // Reset person selection
                  }
                }}
                style={{
                  padding: '16px',
                  background: isSelected ? '#FEF2F2' : 'white',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #DC2626' : '1px solid #E5E7EB',
                  cursor: hasViolations ? 'pointer' : 'default',
                  opacity: hasViolations ? 1 : 0.5,
                  transition: 'all 0.2s',
                  transform: isSelected ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    width: '8px',
                    background: getSeverityColor(criterion.severity),
                    borderRadius: '4px'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1F2937',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {criterion.name}
                      {isSelected && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: '#DC2626',
                          color: 'white',
                          borderRadius: '10px',
                          fontWeight: '600'
                        }}>
                          SELECTED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                      {criterion.description}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: hasViolations ? '#DC2626' : '#6B7280'
                      }}>
                        {data ? (
                          <>
                            {data.issues.length} issue{data.issues.length !== 1 ? 's' : ''}
                            {data.totalViolations > data.issues.length && (
                              <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '8px' }}>
                                ({data.totalViolations} total violations)
                              </span>
                            )}
                          </>
                        ) : (
                          '0 issues'
                        )}
                      </div>
                      {hasViolations && (
                        <div style={{
                          fontSize: '11px',
                          color: '#3B82F6',
                          fontWeight: '600'
                        }}>
                          Click to analyze →
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 2: Person Distribution (shown when criterion is selected) */}
      {selectedCriterion && personDistribution.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Step 2: Person Distribution for "{criterionData.get(selectedCriterion)?.name}"
          </h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
            Shows how the {criterionData.get(selectedCriterion)?.issues.length} issues with this violation are distributed across team members.
            Click on a person to see their specific issues.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {personDistribution.map(person => {
              const isSelected = selectedPerson === person.name
              const percentage = ((person.issues.length / criterionData.get(selectedCriterion).issues.length) * 100).toFixed(0)

              return (
                <div
                  key={person.name}
                  onClick={() => setSelectedPerson(isSelected ? null : person.name)}
                  style={{
                    padding: '16px',
                    background: isSelected ? '#EFF6FF' : 'white',
                    border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                        {person.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {person.issues.length} issue{person.issues.length !== 1 ? 's' : ''}
                        {person.violationCount > person.issues.length && (
                          <span style={{ fontSize: '11px', marginLeft: '4px' }}>
                            ({person.violationCount} violations)
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#DC2626'
                    }}>
                      {person.issues.length}
                    </div>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                      {percentage}% of issues with this violation
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#F3F4F6',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{
                      fontSize: '11px',
                      color: '#3B82F6',
                      fontWeight: '600',
                      textAlign: 'center',
                      marginTop: '8px'
                    }}>
                      Click to hide issues
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Issue Details (shown when person is selected) */}
      {selectedPerson && selectedPersonIssues.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            {selectedPerson}'s Issues with "{criterionData.get(selectedCriterion)?.name}" Violations
          </h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
            {selectedPersonIssues.length} issue{selectedPersonIssues.length !== 1 ? 's' : ''} found.
            Click on an issue to open it in GitLab.
          </p>

          <div style={{ display: 'grid', gap: '8px' }}>
            {selectedPersonIssues.map(issue => {
              // Count violations of this specific criterion in this issue
              const violationCount = issue.violations.filter(v => v.criterion === selectedCriterion).length

              return (
                <a
                  key={issue.id}
                  href={issue.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: '#1F2937',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3B82F6'
                    e.currentTarget.style.background = '#F0F9FF'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB'
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      #{issue.iid} {issue.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {issue.state === 'opened' ? 'Open' : 'Closed'} ·
                      {issue.assignees && issue.assignees.length > 0 ? (
                        <span> Assigned to: {issue.assignees.map(a => a.name || a.username).join(', ')}</span>
                      ) : (
                        <span> Created by: {issue.author?.name || issue.author?.username || 'Unknown'}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                      {violationCount} violation{violationCount !== 1 ? 's' : ''} of this criterion
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    background: '#3B82F6',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    Open in GitLab →
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}