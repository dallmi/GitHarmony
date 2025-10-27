import React, { useMemo, useState } from 'react'
import {
  findNonCompliantIssues,
  getComplianceStats,
  getCriteriaDetails,
  exportToCSV,
  downloadCSV
} from '../services/complianceService'

/**
 * Issue Compliance & Quality Check View
 * Shows issues that don't meet UBS quality criteria
 */
export default function IssueComplianceView({ issues }) {
  const [filterSeverity, setFilterSeverity] = useState('all') // all, high, medium, low

  const { nonCompliantIssues, stats } = useMemo(() => {
    if (!issues || issues.length === 0) {
      return { nonCompliantIssues: [], stats: null }
    }

    const nonCompliant = findNonCompliantIssues(issues)
    const complianceStats = getComplianceStats(issues)

    return {
      nonCompliantIssues: nonCompliant,
      stats: complianceStats
    }
  }, [issues])

  const criteria = getCriteriaDetails()

  const filteredIssues = useMemo(() => {
    if (filterSeverity === 'all') return nonCompliantIssues

    return nonCompliantIssues.filter(issue => {
      return issue.violations.some(v => v.severity === filterSeverity)
    })
  }, [nonCompliantIssues, filterSeverity])

  const handleExportCSV = () => {
    const csvContent = exportToCSV(nonCompliantIssues)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csvContent, `issue-compliance-report-${date}.csv`)
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#DC2626'
      case 'medium': return '#D97706'
      case 'low': return '#2563EB'
      default: return '#6B7280'
    }
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Issue Quality Compliance
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            UBS quality criteria validation for all issues
          </p>
        </div>
        {nonCompliantIssues.length > 0 && (
          <button className="btn btn-primary" onClick={handleExportCSV}>
            📊 Export CSV Report
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Compliance Rate</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: stats.complianceRate >= 80 ? '#059669' : stats.complianceRate >= 60 ? '#D97706' : '#DC2626' }}>
              {stats.complianceRate}%
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {stats.compliant} / {stats.total} issues
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Non-Compliant</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#DC2626' }}>
              {stats.nonCompliant}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Need attention
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #DC2626' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>High Severity</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#DC2626' }}>
              {stats.highSeverity}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Critical issues
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #D97706' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Medium Severity</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#D97706' }}>
              {stats.mediumSeverity}
            </div>
          </div>
        </div>
      )}

      {/* Quality Criteria Reference */}
      <div className="card" style={{ marginBottom: '30px', background: '#F9FAFB' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          UBS Issue Quality Criteria
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {criteria.map(criterion => (
            <div key={criterion.key} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
              <div style={{
                width: '8px',
                background: getSeverityColor(criterion.severity),
                borderRadius: '4px'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                  {criterion.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {criterion.description}
                </div>
                {stats && (
                  <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '6px' }}>
                    {stats.violationsByCriterion[criterion.key]} violations
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      {nonCompliantIssues.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '600' }}>Filter by Severity:</span>
          {['all', 'high', 'medium', 'low'].map(severity => (
            <button
              key={severity}
              onClick={() => setFilterSeverity(severity)}
              style={{
                padding: '6px 16px',
                background: filterSeverity === severity ? '#E60000' : '#F3F4F6',
                color: filterSeverity === severity ? 'white' : '#6B7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {severity}
            </button>
          ))}
        </div>
      )}

      {/* Non-Compliant Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>✅</div>
          <h3 className="mb-2">
            {nonCompliantIssues.length === 0 ? 'All Issues Compliant!' : 'No Issues in Selected Filter'}
          </h3>
          <p className="text-muted">
            {nonCompliantIssues.length === 0
              ? 'All issues meet UBS quality criteria. Great work!'
              : 'Try selecting a different severity filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredIssues.map((issue) => {
            const highViolations = issue.violations.filter(v => v.severity === 'high')
            const mediumViolations = issue.violations.filter(v => v.severity === 'medium')
            const lowViolations = issue.violations.filter(v => v.severity === 'low')

            return (
              <div
                key={issue.issueId}
                className="card"
                style={{
                  borderLeft: `4px solid ${issue.complianceScore < 50 ? '#DC2626' : issue.complianceScore < 75 ? '#D97706' : '#2563EB'}`,
                  background: issue.complianceScore < 50 ? '#FEF2F2' : 'white'
                }}
              >
                {/* Issue Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>
                        #{issue.iid}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
                        {issue.title}
                      </h3>
                      <span style={{
                        padding: '4px 8px',
                        background: issue.state === 'opened' ? '#DBEAFE' : '#D1FAE5',
                        color: issue.state === 'opened' ? '#1E40AF' : '#065F46',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {issue.state}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    minWidth: '80px',
                    textAlign: 'center',
                    padding: '8px 12px',
                    background: issue.complianceScore < 50 ? '#DC262620' : issue.complianceScore < 75 ? '#D9770620' : '#2563EB20',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Score</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: issue.complianceScore < 50 ? '#DC2626' : issue.complianceScore < 75 ? '#D97706' : '#2563EB' }}>
                      {issue.complianceScore}%
                    </div>
                  </div>
                </div>

                {/* Violations */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                    ⚠️ Violations ({issue.violations.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {highViolations.map((v, idx) => (
                      <span key={idx} style={{
                        padding: '4px 12px',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {v.name}
                      </span>
                    ))}
                    {mediumViolations.map((v, idx) => (
                      <span key={idx} style={{
                        padding: '4px 12px',
                        background: '#FEF3C7',
                        color: '#92400E',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {v.name}
                      </span>
                    ))}
                    {lowViolations.map((v, idx) => (
                      <span key={idx} style={{
                        padding: '4px 12px',
                        background: '#DBEAFE',
                        color: '#1E40AF',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {v.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px', padding: '12px', background: '#F9FAFB', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>CREATED</div>
                    <div style={{ fontSize: '13px', color: '#1F2937' }}>
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>UPDATED</div>
                    <div style={{ fontSize: '13px', color: '#1F2937' }}>
                      {new Date(issue.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>AUTHOR</div>
                    <div style={{ fontSize: '13px', color: '#1F2937' }}>
                      {issue.author ? issue.author.name : 'Unknown'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>ASSIGNEES</div>
                    <div style={{ fontSize: '13px', color: '#1F2937' }}>
                      {issue.assignees.length > 0
                        ? issue.assignees.map(a => a.name).join(', ')
                        : 'None'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>EPIC</div>
                    <div style={{ fontSize: '13px', color: '#1F2937' }}>
                      {issue.epic ? issue.epic.title : 'None'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>MILESTONE</div>
                    <div style={{ fontSize: '13px', color: '#1F2937' }}>
                      {issue.milestone ? issue.milestone.title : 'None'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>WEIGHT</div>
                    <div style={{ fontSize: '13px', color: '#1F2937' }}>
                      {issue.weight || 'Not set'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>DUE DATE</div>
                    <div style={{ fontSize: '13px', color: '#1F2937' }}>
                      {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {issue.webUrl && (
                    <a
                      href={issue.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '13px', padding: '6px 12px', textDecoration: 'none' }}
                    >
                      View in GitLab →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary for Scrum Master */}
      {nonCompliantIssues.length > 0 && (
        <div className="card" style={{ marginTop: '30px', background: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1E40AF', marginBottom: '12px' }}>
            📋 Summary for Scrum Master
          </h3>
          <div style={{ fontSize: '14px', color: '#1E40AF', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>{nonCompliantIssues.length}</strong> issue(s) need attention to meet UBS quality standards.
            </p>
            <p style={{ marginBottom: '12px' }}>
              Top violations:
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              {Object.entries(stats.violationsByCriterion)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .filter(([_, count]) => count > 0)
                .map(([criterion, count]) => {
                  const criterionDetails = criteria.find(c => c.key === criterion)
                  return (
                    <li key={criterion}>
                      <strong>{criterionDetails.name}:</strong> {count} issues
                    </li>
                  )
                })}
            </ul>
            <p style={{ fontSize: '13px', color: '#1E40AF' }}>
              Click "Export CSV Report" above to download the full report for review.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
