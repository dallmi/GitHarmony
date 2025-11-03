import React, { useMemo, useState } from 'react'
import {
  findNonCompliantIssues,
  getComplianceStats,
  getCriteriaDetails,
  exportToCSV,
  downloadCSV,
  findStaleIssues
} from '../services/complianceService'
import { useIterationFilter } from '../contexts/IterationFilterContext'
import SearchBar from './SearchBar'
import { searchIssues } from '../utils/searchUtils'
import { exportIssuesToCSV, downloadCSV as downloadCSVUtil } from '../utils/csvExportUtils'
import { loadTeamConfig } from '../services/teamConfigService'
import QualityCriteriaConfigModal from './QualityCriteriaConfigModal'
import DoDComplianceSection from './DoDComplianceSection'
import QualityViolationsByAuthor from './QualityViolationsByAuthor'

/**
 * Issue Compliance & Quality Check View
 * Shows issues that don't meet quality criteria
 */
export default function IssueComplianceView({ issues: allIssues }) {
  // Use filtered issues from iteration context
  const { filteredIssues: issues } = useIterationFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState(null) // Track active tile filter
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [activeTab, setActiveTab] = useState('quality') // 'quality', 'byauthor', or 'dod'
  const [showOpenOnly, setShowOpenOnly] = useState(() => {
    const saved = localStorage.getItem('quality.showOpenOnly')
    return saved !== 'false' // Default to true (show open only)
  })
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(() => {
    const saved = localStorage.getItem('quality.legendCollapsed')
    return saved === 'true'
  })

  const toggleLegend = () => {
    setIsLegendCollapsed(prev => {
      const newValue = !prev
      localStorage.setItem('quality.legendCollapsed', String(newValue))
      return newValue
    })
  }

  const toggleShowOpenOnly = () => {
    setShowOpenOnly(prev => {
      const newValue = !prev
      localStorage.setItem('quality.showOpenOnly', String(newValue))
      return newValue
    })
  }

  const { nonCompliantIssues, stats, staleIssues } = useMemo(() => {
    if (!issues || issues.length === 0) {
      return { nonCompliantIssues: [], stats: null, staleIssues: [] }
    }

    // Filter issues by state if showOpenOnly is enabled
    const issuesToCheck = showOpenOnly ? issues.filter(i => i.state === 'opened') : issues

    const nonCompliant = findNonCompliantIssues(issuesToCheck)
    const complianceStats = getComplianceStats(issuesToCheck)
    const stale = findStaleIssues(issuesToCheck)

    return {
      nonCompliantIssues: nonCompliant,
      stats: complianceStats,
      staleIssues: stale
    }
  }, [issues, showOpenOnly])

  const criteria = getCriteriaDetails()

  const filteredIssues = useMemo(() => {
    let filtered = nonCompliantIssues

    // Apply search filter first
    if (searchTerm) {
      filtered = searchIssues(filtered, searchTerm)
    }

    // Apply active tile filter (simplified - only use tile clicks)
    if (activeFilter) {
      switch (activeFilter) {
        case 'highSeverity':
          filtered = filtered.filter(issue => issue.violations.some(v => v.severity === 'high'))
          break
        case 'mediumSeverity':
          filtered = filtered.filter(issue => issue.violations.some(v => v.severity === 'medium'))
          break
        case 'lowSeverity':
          filtered = filtered.filter(issue => issue.violations.some(v => v.severity === 'low'))
          break
        case 'stale':
          filtered = filtered.filter(issue => issue.staleStatus?.isStale)
          break
        default:
          // Check if it's a criterion-based filter (e.g., 'assignee', 'weight', 'epic', etc.)
          filtered = filtered.filter(issue => issue.violations.some(v => v.criterion === activeFilter))
          break
      }
    }

    return filtered
  }, [nonCompliantIssues, searchTerm, activeFilter])

  const handleExportCSV = () => {
    // Export filtered issues using new CSV export utility
    const csvContent = exportIssuesToCSV(filteredIssues)
    const date = new Date().toISOString().split('T')[0]
    downloadCSVUtil(csvContent, `issue-compliance-report-${date}.csv`)
  }

  const handleEmailReport = () => {
    // Get Scrum Master email from team config
    const teamConfig = loadTeamConfig()
    const scrumMaster = teamConfig.teamMembers?.find(m => m.role === 'Scrum Master')
    const toEmail = scrumMaster?.email || ''

    // Create email subject and body
    const subject = `Issue Quality Compliance Report - ${new Date().toLocaleDateString()}`
    const totalIssues = filteredIssues.length
    const highSeverity = filteredIssues.filter(i => i.violations.some(v => v.severity === 'high')).length
    const mediumSeverity = filteredIssues.filter(i => i.violations.some(v => v.severity === 'medium')).length
    const lowSeverity = filteredIssues.filter(i => i.violations.some(v => v.severity === 'low')).length

    const body = `Hi,

Please find the Issue Quality Compliance Report attached.

Summary:
- Total non-compliant issues: ${totalIssues}
- High severity: ${highSeverity}
- Medium severity: ${mediumSeverity}
- Low severity: ${lowSeverity}
- Compliance rate: ${stats?.complianceRate}%

The CSV report has been downloaded to your Downloads folder. Please attach it to this email before sending.

Best regards`

    // Download CSV
    const csvContent = exportIssuesToCSV(filteredIssues)
    const date = new Date().toISOString().split('T')[0]
    downloadCSVUtil(csvContent, `issue-compliance-report-${date}.csv`)

    // Open email client with pre-filled content
    const mailtoLink = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoLink
  }

  const handleTileClick = (filterType) => {
    // Toggle filter on/off
    setActiveFilter(activeFilter === filterType ? null : filterType)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Issue Quality Compliance
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Quality criteria validation for all issues
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn"
            onClick={() => setShowConfigModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Configure Criteria
          </button>
          {filteredIssues.length > 0 && (
            <>
              <button className="btn btn-primary" onClick={handleEmailReport}>
                Email Report
              </button>
              <button className="btn" onClick={handleExportCSV}>
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation with Filter Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #E5E7EB',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('quality')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'quality' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'quality' ? '3px solid #E60000' : '3px solid transparent',
              fontSize: '14px',
              fontWeight: activeTab === 'quality' ? '600' : '500',
              color: activeTab === 'quality' ? '#E60000' : '#6B7280',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            Quality Criteria
          </button>
        <button
          onClick={() => setActiveTab('byauthor')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'byauthor' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'byauthor' ? '3px solid #E60000' : '3px solid transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'byauthor' ? '600' : '500',
            color: activeTab === 'byauthor' ? '#E60000' : '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          By Author
        </button>
          <button
            onClick={() => setActiveTab('dod')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'dod' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'dod' ? '3px solid #E60000' : '3px solid transparent',
              fontSize: '14px',
              fontWeight: activeTab === 'dod' ? '600' : '500',
              color: activeTab === 'dod' ? '#E60000' : '#6B7280',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            Definition of Done
          </button>
        </div>

        {/* Filter Toggle - Show Open Issues Only */}
        {(activeTab === 'quality' || activeTab === 'byauthor') && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: '#F9FAFB',
            borderRadius: '6px',
            marginBottom: '-2px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={showOpenOnly}
                onChange={toggleShowOpenOnly}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              <span>Show open issues only</span>
            </label>
            <div style={{
              fontSize: '11px',
              color: '#6B7280',
              padding: '2px 8px',
              background: showOpenOnly ? '#DCFCE7' : '#FEF3C7',
              borderRadius: '10px',
              fontWeight: '600'
            }}>
              {showOpenOnly ? 'Open only' : 'All issues'}
            </div>
          </div>
        )}
      </div>

      {/* Quality Criteria Config Modal */}
      <QualityCriteriaConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* Tab Content */}
      {activeTab === 'dod' ? (
        <DoDComplianceSection issues={issues} />
      ) : activeTab === 'byauthor' ? (
        <QualityViolationsByAuthor nonCompliantIssues={nonCompliantIssues} />
      ) : (
        <>
          {/* Search Bar */}
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search issues by title, labels, assignees, epic, milestone, description..."
            onClear={() => setActiveFilter(null)}
          />

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

          <div
            className="card"
            onClick={() => handleTileClick('highSeverity')}
            style={{
              borderLeft: '4px solid #DC2626',
              cursor: 'pointer',
              transform: activeFilter === 'highSeverity' ? 'scale(0.98)' : 'scale(1)',
              boxShadow: activeFilter === 'highSeverity' ? '0 0 0 3px #DC262633' : undefined,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              High Severity {activeFilter === 'highSeverity' && '[Active]'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#DC2626' }}>
              {stats.highSeverity}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {activeFilter === 'highSeverity' ? 'Click to clear filter' : 'Click to filter'}
            </div>
          </div>

          <div
            className="card"
            onClick={() => handleTileClick('mediumSeverity')}
            style={{
              borderLeft: '4px solid #D97706',
              cursor: 'pointer',
              transform: activeFilter === 'mediumSeverity' ? 'scale(0.98)' : 'scale(1)',
              boxShadow: activeFilter === 'mediumSeverity' ? '0 0 0 3px #D9770633' : undefined,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              Medium Severity {activeFilter === 'mediumSeverity' && '[Active]'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#D97706' }}>
              {stats.mediumSeverity}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {activeFilter === 'mediumSeverity' ? 'Click to clear filter' : 'Click to filter'}
            </div>
          </div>

          <div
            className="card"
            onClick={() => handleTileClick('lowSeverity')}
            style={{
              borderLeft: '4px solid #6B7280',
              cursor: 'pointer',
              transform: activeFilter === 'lowSeverity' ? 'scale(0.98)' : 'scale(1)',
              boxShadow: activeFilter === 'lowSeverity' ? '0 0 0 3px rgba(107, 114, 128, 0.2)' : undefined,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              Low Severity {activeFilter === 'lowSeverity' && '[Active]'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#6B7280' }}>
              {stats.lowSeverity}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {activeFilter === 'lowSeverity' ? 'Click to clear filter' : 'Click to filter'}
            </div>
          </div>

          <div
            className="card"
            onClick={() => handleTileClick('stale')}
            style={{
              borderLeft: '4px solid #9CA3AF',
              cursor: 'pointer',
              transform: activeFilter === 'stale' ? 'scale(0.98)' : 'scale(1)',
              boxShadow: activeFilter === 'stale' ? '0 0 0 3px rgba(156, 163, 175, 0.2)' : undefined,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              Stale Issues {activeFilter === 'stale' && '[Active]'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#6B7280' }}>
              {stats.staleIssues.total}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {activeFilter === 'stale' ? 'Click to clear filter' : `${stats.staleIssues.critical} critical, ${stats.staleIssues.warning} warning`}
            </div>
          </div>
        </div>
      )}

      {/* Color Coding Legend */}
      <div className="card" style={{ marginBottom: '30px', background: '#F0F9FF', borderColor: '#3B82F6' }}>
        <div
          onClick={toggleLegend}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: isLegendCollapsed ? '0' : '16px'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1E40AF', margin: 0 }}>
            ℹ️ Color Coding Guide
          </h3>
          <span style={{
            fontSize: '14px',
            color: '#1E40AF',
            transform: isLegendCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block'
          }}>
            ▼
          </span>
        </div>
        {!isLegendCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', marginBottom: '8px' }}>Compliance Score Calculation</h4>
              <div style={{ fontSize: '13px', color: '#1E3A8A', padding: '12px', background: '#DBEAFE', borderRadius: '6px', marginBottom: '4px', border: '1px solid #93C5FD' }}>
                <strong>Score = (Passed Criteria / Total Criteria) × 100</strong>
                <div style={{ marginTop: '8px', lineHeight: '1.5' }}>
                  Each issue is checked against all enabled quality criteria (assignee, weight, epic, description, labels, milestone, due date, priority, stale).
                  The score reflects how many criteria the issue passes. For example, if 6 out of 9 criteria pass, the score is 67%.
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', marginBottom: '8px' }}>Issue Card Backgrounds</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '24px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '4px' }}></div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    Red/pink background = Compliance score below 50% (critical)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '24px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '4px' }}></div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    White background = Compliance score 50% or above
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', marginBottom: '8px' }}>Left Border Colors</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '24px', background: '#DC2626', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    Red = Score below 50%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '24px', background: '#D97706', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    Orange = Score 50-74%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '24px', background: '#2563EB', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    Blue = Score 75% or above
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', marginBottom: '8px' }}>Violation Badges</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '4px 8px', background: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: '500', borderRadius: '4px' }}>
                    HIGH
                  </div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    High severity violations (red background)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '4px 8px', background: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: '500', borderRadius: '4px' }}>
                    MED
                  </div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    Medium severity violations (yellow background)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '4px 8px', background: '#DBEAFE', color: '#1E40AF', fontSize: '11px', fontWeight: '500', borderRadius: '4px' }}>
                    LOW
                  </div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    Low severity violations (blue background)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quality Criteria Reference */}
      <div className="card" style={{ marginBottom: '30px', background: '#F9FAFB' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Issue Quality Criteria
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {criteria.map(criterion => {
            const isActive = activeFilter === criterion.key
            const violationCount = stats?.violationsByCriterion[criterion.key] || 0

            return (
              <div
                key={criterion.key}
                onClick={() => violationCount > 0 && handleTileClick(criterion.key)}
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
                  {stats && (
                    <div style={{ fontSize: '11px', color: violationCount > 0 ? '#DC2626' : '#6B7280', marginTop: '6px', fontWeight: violationCount > 0 ? '600' : '400' }}>
                      {violationCount} violation{violationCount !== 1 ? 's' : ''}
                      {violationCount > 0 && ' • Click to filter'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active Filter Indicator */}
      {activeFilter && filteredIssues.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: '#F9FAFB',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Filtered by:
            </span>
            <span style={{
              padding: '4px 12px',
              background: '#E5E7EB',
              color: '#1F2937',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {activeFilter === 'highSeverity' && 'High Severity'}
              {activeFilter === 'mediumSeverity' && 'Medium Severity'}
              {activeFilter === 'lowSeverity' && 'Low Severity'}
              {activeFilter === 'stale' && 'Stale Issues'}
              {!['highSeverity', 'mediumSeverity', 'lowSeverity', 'stale'].includes(activeFilter) &&
                (criteria.find(c => c.key === activeFilter)?.name || activeFilter)}
            </span>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              ({filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'})
            </span>
          </div>
          <button
            onClick={() => setActiveFilter(null)}
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

      {/* Non-Compliant Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <h3 className="mb-2">
            {nonCompliantIssues.length === 0 ? 'All Issues Compliant!' : 'No Issues in Selected Filter'}
          </h3>
          <p className="text-muted">
            {nonCompliantIssues.length === 0
              ? 'All issues meet quality criteria. Great work!'
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
                      {issue.staleStatus?.isStale && (
                        <span style={{
                          padding: '4px 8px',
                          background: issue.staleStatus.severity === 'critical' ? '#FEE2E2' : '#FEF3C7',
                          color: issue.staleStatus.severity === 'critical' ? '#991B1B' : '#92400E',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {issue.staleStatus.daysOpen} days open
                        </span>
                      )}
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
                    Violations ({issue.violations.length})
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
                        {v.criterion === 'stale' && v.daysOpen && ` (${v.daysOpen}d)`}
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
                        {v.criterion === 'stale' && v.daysOpen && ` (${v.daysOpen}d)`}
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
                        {v.criterion === 'stale' && v.daysOpen && ` (${v.daysOpen}d)`}
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
            Summary for Scrum Master
          </h3>
          <div style={{ fontSize: '14px', color: '#1E40AF', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>{nonCompliantIssues.length}</strong> issue(s) need attention to meet quality standards.
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
        </>
      )}
    </div>
  )
}
