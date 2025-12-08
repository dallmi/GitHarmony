import React, { useState } from 'react'
import {
  findDoDViolations,
  getDoDStats,
  getDoDTemplates,
  exportDoDViolationsCSV,
  downloadDoDViolationsCSV
} from '../services/dodService'

/**
 * Definition of Done Compliance Section
 * Shows DoD violations and statistics
 */
export default function DoDComplianceSection({ issues }) {
  const [expandedIssue, setExpandedIssue] = useState(null)

  const violations = findDoDViolations(issues)
  const stats = getDoDStats(issues)
  const templates = getDoDTemplates()

  const handleExportCSV = () => {
    const csvContent = exportDoDViolationsCSV(violations)
    downloadDoDViolationsCSV(csvContent)
  }

  const getComplianceColor = (percentage) => {
    if (percentage >= 80) return '#10B981'
    if (percentage >= 60) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div>
      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
            Compliance Rate
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: '600',
            color: getComplianceColor(stats.complianceRate)
          }}>
            {stats.complianceRate}%
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
            Compliant Issues
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: '#10B981' }}>
            {stats.compliantIssues}
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
            Violations
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: '#EF4444' }}>
            {stats.violatingIssues}
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
            Avg Compliance
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: '600',
            color: getComplianceColor(stats.avgCompliancePercentage)
          }}>
            {stats.avgCompliancePercentage}%
          </div>
        </div>
      </div>

      {/* DoD Templates Info */}
      <div className="card" style={{ marginBottom: '24px', background: '#EFF6FF', borderColor: '#BFDBFE' }}>
        <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#1E40AF' }}>
          📋 Definition of Done Templates
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {Object.entries(templates).map(([type, template]) => (
            <div key={type}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF', marginBottom: '4px' }}>
                {template.name}
              </div>
              <div style={{ fontSize: '12px', color: '#1E3A8A' }}>
                {template.checklist.filter(item => item.required).length} required items
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Violations List */}
      {violations.length > 0 ? (
        <div className="card">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              DoD Violations ({violations.length})
            </h3>
            <button
              onClick={handleExportCSV}
              style={{
                padding: '6px 12px',
                background: '#E60000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Export CSV
            </button>
          </div>

          {violations.map(({ issue, dod }) => {
            const isExpanded = expandedIssue === issue.iid

            return (
              <div
                key={issue.iid}
                style={{
                  border: `2px solid ${getComplianceColor(dod.compliancePercentage)}`,
                  borderRadius: '8px',
                  marginBottom: '12px',
                  overflow: 'hidden'
                }}
              >
                {/* Issue Header */}
                <div
                  onClick={() => setExpandedIssue(isExpanded ? null : issue.iid)}
                  style={{
                    padding: '12px 16px',
                    background: '#F9FAFB',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                        #{issue.iid}
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: getComplianceColor(dod.compliancePercentage) + '20',
                        color: getComplianceColor(dod.compliancePercentage),
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {dod.compliancePercentage}% DoD
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        fontWeight: '500'
                      }}>
                        {dod.dodTemplate}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4B5563' }}>
                      {issue.title}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    color: '#6B7280',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}>
                    ▼
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '16px', background: 'white' }}>
                    {/* Missing Items */}
                    {dod.missingItems.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563', marginBottom: '8px' }}>
                          ❌ Missing Required Items ({dod.missingItems.length}):
                        </div>
                        {dod.missingItems.map(item => (
                          <div
                            key={item.id}
                            style={{
                              padding: '8px 12px',
                              background: '#FEF2F2',
                              border: '1px solid #FCA5A5',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              fontSize: '13px',
                              color: '#DC2626'
                            }}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Checked Items */}
                    {dod.checkedItems.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563', marginBottom: '8px' }}>
                          ✅ Completed Items ({dod.checkedItems.length}):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          {dod.checkedItems.map(item => (
                            <div
                              key={item.id}
                              style={{
                                padding: '6px 12px',
                                background: '#F0FDF4',
                                border: '1px solid #86EFAC',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#166534'
                              }}
                            >
                              ✓ {item.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div style={{
                      padding: '12px',
                      background: '#EFF6FF',
                      border: '1px solid #3B82F6',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF', marginBottom: '4px' }}>
                        💡 Recommendation:
                      </div>
                      <div style={{ fontSize: '12px', color: '#1E3A8A' }}>
                        Update issue description to include missing DoD items before marking as Done.
                        {dod.missingItems.some(item => item.id === 'acceptance-criteria') && (
                          <> Add an "Acceptance Criteria" section with clear success criteria.</>
                        )}
                      </div>
                    </div>

                    {/* View Issue Link */}
                    <div style={{ marginTop: '12px' }}>
                      <a
                        href={issue.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '13px',
                          color: '#E60000',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                      >
                        View Issue in GitLab →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{
          padding: '40px',
          textAlign: 'center',
          background: '#F0FDF4',
          border: '2px solid #86EFAC'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
            Perfect DoD Compliance!
          </div>
          <div style={{ fontSize: '14px', color: '#15803D' }}>
            All closed issues meet the Definition of Done criteria.
          </div>
        </div>
      )}
    </div>
  )
}
