import React, { useMemo, useState } from 'react'
import { getCriteriaDetails } from '../services/complianceService'

/**
 * Quality Violations By Author View
 * Shows which authors are driving the most quality violations
 * Helps identify coaching opportunities and patterns
 */
export default function QualityViolationsByAuthor({ nonCompliantIssues }) {
  const [selectedAuthor, setSelectedAuthor] = useState(null)
  const [selectedCriterion, setSelectedCriterion] = useState(null)
  const [criterionFilter, setCriterionFilter] = useState(null) // Global criterion filter

  const criteria = getCriteriaDetails()

  // Calculate violation counts per criterion across all authors
  const criterionViolationCounts = useMemo(() => {
    if (!nonCompliantIssues || nonCompliantIssues.length === 0) {
      return new Map()
    }

    const counts = new Map()
    nonCompliantIssues.forEach(issue => {
      issue.violations.forEach(violation => {
        const current = counts.get(violation.criterion) || 0
        counts.set(violation.criterion, current + 1)
      })
    })
    return counts
  }, [nonCompliantIssues])

  // Group violations by author and criterion
  const authorViolations = useMemo(() => {
    if (!nonCompliantIssues || nonCompliantIssues.length === 0) {
      return []
    }

    const authorMap = new Map()

    // Filter issues by criterion if a filter is active
    const filteredByAuthorIssues = criterionFilter
      ? nonCompliantIssues.filter(issue =>
          issue.violations.some(v => v.criterion === criterionFilter)
        )
      : nonCompliantIssues

    filteredByAuthorIssues.forEach(issue => {
      // Get author from assignees or use "Unassigned"
      const authors = issue.assignees && issue.assignees.length > 0
        ? issue.assignees.map(a => a.name || a.username)
        : ['Unassigned']

      authors.forEach(authorName => {
        if (!authorMap.has(authorName)) {
          authorMap.set(authorName, {
            name: authorName,
            totalViolations: 0,
            highSeverityCount: 0,
            mediumSeverityCount: 0,
            lowSeverityCount: 0,
            byCriterion: new Map(),
            issues: []
          })
        }

        const authorData = authorMap.get(authorName)

        // Count violations by criterion (apply filter if active)
        const violationsToCount = criterionFilter
          ? issue.violations.filter(v => v.criterion === criterionFilter)
          : issue.violations

        violationsToCount.forEach(violation => {
          authorData.totalViolations++

          // Count by severity
          if (violation.severity === 'high') authorData.highSeverityCount++
          else if (violation.severity === 'medium') authorData.mediumSeverityCount++
          else if (violation.severity === 'low') authorData.lowSeverityCount++

          // Count by criterion
          if (!authorData.byCriterion.has(violation.criterion)) {
            authorData.byCriterion.set(violation.criterion, {
              criterion: violation.criterion,
              count: 0,
              issues: []
            })
          }
          const criterionData = authorData.byCriterion.get(violation.criterion)
          criterionData.count++

          if (!criterionData.issues.find(i => i.id === issue.id)) {
            criterionData.issues.push(issue)
          }
        })

        // Track unique issues
        if (!authorData.issues.find(i => i.id === issue.id)) {
          authorData.issues.push(issue)
        }
      })
    })

    // Convert to array and sort by total violations
    return Array.from(authorMap.values())
      .sort((a, b) => b.totalViolations - a.totalViolations)
  }, [nonCompliantIssues, criterionFilter])

  const totalViolations = useMemo(() => {
    return authorViolations.reduce((sum, author) => sum + author.totalViolations, 0)
  }, [authorViolations])

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#DC2626'
      case 'medium': return '#D97706'
      case 'low': return '#2563EB'
      default: return '#6B7280'
    }
  }

  const getCriterionLabel = (criterionId) => {
    const criterion = criteria.find(c => c.id === criterionId)
    return criterion?.label || criterionId
  }

  const handleCriterionFilterClick = (criterionKey) => {
    const isActive = criterionFilter === criterionKey
    setCriterionFilter(isActive ? null : criterionKey)
    // Clear author selection when changing filter
    if (!isActive) {
      setSelectedAuthor(null)
      setSelectedCriterion(null)
    }
  }

  // Filter issues for detail view
  const filteredDetailIssues = useMemo(() => {
    if (!selectedAuthor || !selectedCriterion) return []

    const authorData = authorViolations.find(a => a.name === selectedAuthor)
    if (!authorData) return []

    const criterionData = authorData.byCriterion.get(selectedCriterion)
    return criterionData?.issues || []
  }, [selectedAuthor, selectedCriterion, authorViolations])

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
      {/* Criterion Filter Tiles */}
      <div className="card" style={{ marginBottom: '20px', background: '#F9FAFB' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Filter by Quality Criteria
        </h3>
        <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
          Click on a criterion to see which authors are driving violations for that specific quality check.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {criteria.map(criterion => {
            const isActive = criterionFilter === criterion.key
            const violationCount = criterionViolationCounts.get(criterion.key) || 0

            return (
              <div
                key={criterion.key}
                onClick={() => violationCount > 0 && handleCriterionFilterClick(criterion.key)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  border: isActive ? `2px solid ${getSeverityColor(criterion.severity)}` : '1px solid #E5E7EB',
                  cursor: violationCount > 0 ? 'pointer' : 'default',
                  opacity: violationCount === 0 ? 0.5 : 1,
                  transform: isActive ? 'scale(0.98)' : 'scale(1)',
                  boxShadow: isActive ? `0 0 0 3px ${getSeverityColor(criterion.severity)}33` : undefined,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '8px',
                  background: getSeverityColor(criterion.severity),
                  borderRadius: '4px'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                    {criterion.name} {isActive && '[Active]'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {criterion.description}
                  </div>
                  <div style={{ fontSize: '11px', color: violationCount > 0 ? '#DC2626' : '#6B7280', marginTop: '6px', fontWeight: violationCount > 0 ? '600' : '400' }}>
                    {violationCount} violation{violationCount !== 1 ? 's' : ''}
                    {violationCount > 0 && ' • Click to filter'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active Filter Indicator */}
      {criterionFilter && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: '#F0F9FF',
          borderRadius: '8px',
          border: '1px solid #3B82F6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#1E40AF', fontWeight: '600' }}>
              Showing violations for:
            </span>
            <span style={{
              padding: '4px 12px',
              background: '#3B82F6',
              color: 'white',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {getCriterionLabel(criterionFilter)}
            </span>
          </div>
          <button
            onClick={() => {
              setCriterionFilter(null)
              setSelectedAuthor(null)
              setSelectedCriterion(null)
            }}
            style={{
              padding: '4px 12px',
              background: '#E60000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Summary Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Violations by Author {criterionFilter && `(${getCriterionLabel(criterionFilter)} only)`}
        </h3>
        <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
          {criterionFilter
            ? `Authors ranked by ${getCriterionLabel(criterionFilter)} violations. Click an author for details.`
            : 'Identify patterns and coaching opportunities. Click on an author to see their specific violations.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {authorViolations.map(author => {
            const percentage = ((author.totalViolations / totalViolations) * 100).toFixed(1)
            const isSelected = selectedAuthor === author.name

            return (
              <div
                key={author.name}
                onClick={() => setSelectedAuthor(isSelected ? null : author.name)}
                style={{
                  padding: '16px',
                  background: isSelected ? '#FEF2F2' : 'white',
                  border: `2px solid ${isSelected ? '#DC2626' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                      {author.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {author.issues.length} issue{author.issues.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#DC2626'
                  }}>
                    {author.totalViolations}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                    {percentage}% of all violations
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                  {author.highSeverityCount > 0 && (
                    <div style={{
                      padding: '2px 8px',
                      background: '#FEE2E2',
                      color: '#DC2626',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      {author.highSeverityCount} high
                    </div>
                  )}
                  {author.mediumSeverityCount > 0 && (
                    <div style={{
                      padding: '2px 8px',
                      background: '#FEF3C7',
                      color: '#D97706',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      {author.mediumSeverityCount} med
                    </div>
                  )}
                  {author.lowSeverityCount > 0 && (
                    <div style={{
                      padding: '2px 8px',
                      background: '#DBEAFE',
                      color: '#2563EB',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      {author.lowSeverityCount} low
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Author Detail View */}
      {selectedAuthor && (() => {
        const authorData = authorViolations.find(a => a.name === selectedAuthor)
        if (!authorData) return null

        const criteriaArray = Array.from(authorData.byCriterion.values())
          .sort((a, b) => b.count - a.count)

        return (
          <div className="card">
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                {authorData.name}'s Violations
              </h3>
              <p style={{ fontSize: '13px', color: '#6B7280' }}>
                {authorData.totalViolations} violation{authorData.totalViolations !== 1 ? 's' : ''} across {authorData.issues.length} issue{authorData.issues.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Violations by Criterion */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              {criteriaArray.map(item => {
                const percentage = ((item.count / authorData.totalViolations) * 100).toFixed(0)
                const isSelected = selectedCriterion === item.criterion
                // Look up criterion definition to get severity
                const criterionDef = criteria.find(c => c.key === item.criterion)
                const severity = criterionDef?.severity || 'low'

                return (
                  <div
                    key={item.criterion}
                    onClick={() => setSelectedCriterion(isSelected ? null : item.criterion)}
                    style={{
                      padding: '12px 16px',
                      background: isSelected ? '#F3F4F6' : 'white',
                      border: `1px solid ${isSelected ? '#9CA3AF' : '#E5E7EB'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                            {getCriterionLabel(item.criterion)}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            background: getSeverityColor(severity) + '20',
                            color: getSeverityColor(severity),
                            borderRadius: '4px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {severity}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          {item.count} violation{item.count !== 1 ? 's' : ''} ({percentage}% of this author's violations)
                        </div>
                      </div>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: getSeverityColor(severity)
                      }}>
                        {item.count}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Issue Details */}
            {selectedCriterion && filteredDetailIssues.length > 0 && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1F2937' }}>
                  Issues with {getCriterionLabel(selectedCriterion)} violations
                </h4>
                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                  {filteredDetailIssues.length} issue{filteredDetailIssues.length !== 1 ? 's' : ''} found. Click to open in GitLab.
                </p>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {filteredDetailIssues.map(issue => {
                    // Count how many violations of this criterion exist in this issue
                    const violationCount = issue.violations.filter(v => v.criterion === selectedCriterion).length

                    return (
                      <a
                        key={issue.id}
                        href={issue.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          color: '#1F2937',
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#3B82F6'
                          e.currentTarget.style.background = '#EFF6FF'
                          e.currentTarget.style.transform = 'translateX(4px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB'
                          e.currentTarget.style.background = 'white'
                          e.currentTarget.style.transform = 'translateX(0)'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>
                            #{issue.iid} {issue.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                            {violationCount} violation{violationCount !== 1 ? 's' : ''} of this type
                          </div>
                        </div>
                        <div style={{
                          padding: '4px 8px',
                          background: '#3B82F6',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          marginLeft: '12px'
                        }}>
                          Open →
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
