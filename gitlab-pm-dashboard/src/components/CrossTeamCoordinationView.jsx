import React, { useMemo, useState } from 'react'
import { getInitiatives } from '../services/initiativeService'
import {
  extractAllTeams,
  attributeInitiativesToTeams,
  detectResourceContention,
  getTeamCapacityOverview,
  getSharedResources,
  exportTeamAttributionCSV,
  exportResourceContentionCSV,
  exportTeamCapacityCSV
} from '../services/teamAttributionService'
import {
  detectInitiativeDependencies,
  getInitiativeDependencyMatrix,
  findBlockingInitiatives,
  calculateCascadeImpact,
  exportInitiativeDependenciesCSV,
  exportCascadeImpactCSV
} from '../services/crossInitiativeDependencyService'
import {
  forecastAllInitiatives,
  compareForecastToDueDate,
  getForecastStatusBadge,
  formatForecastDate,
  exportForecastCSV
} from '../services/forecastService'
import { downloadCSV } from '../utils/csvExportUtils'

/**
 * Cross-Team Coordination View
 *
 * Comprehensive view for managing cross-team overarching initiatives
 * Combines team attribution, dependencies, and forecasting
 */
export default function CrossTeamCoordinationView({ issues, epics, milestones }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedInitiative, setSelectedInitiative] = useState(null)

  // Extract initiatives
  const initiatives = useMemo(() => {
    if (!epics || !issues) return []
    return getInitiatives(epics, issues)
  }, [epics, issues])

  // Team attribution
  const teams = useMemo(() => extractAllTeams(issues || []), [issues])
  const initiativeAttributions = useMemo(
    () => attributeInitiativesToTeams(initiatives, issues || []),
    [initiatives, issues]
  )
  const teamCapacity = useMemo(
    () => getTeamCapacityOverview(teams, initiatives),
    [teams, initiatives]
  )

  // Resource contention
  const resourceContention = useMemo(
    () => detectResourceContention(initiatives, issues || []),
    [initiatives, issues]
  )

  // Cross-initiative dependencies
  const initiativeDependencies = useMemo(
    () => detectInitiativeDependencies(initiatives, issues || []),
    [initiatives, issues]
  )
  const dependencyMatrix = useMemo(
    () => getInitiativeDependencyMatrix(initiatives, issues || []),
    [initiatives, issues]
  )
  const blockingInitiatives = useMemo(
    () => findBlockingInitiatives(initiatives, issues || []),
    [initiatives, issues]
  )

  // Forecasting
  const forecasts = useMemo(
    () => forecastAllInitiatives(initiatives, issues || []),
    [initiatives, issues]
  )

  // Shared resources
  const sharedResources = useMemo(
    () => getSharedResources(initiatives),
    [initiatives]
  )

  // Export handlers
  const handleExportTeamAttribution = () => {
    const csv = exportTeamAttributionCSV(initiativeAttributions)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `team-attribution-${date}.csv`)
  }

  const handleExportResourceContention = () => {
    const csv = exportResourceContentionCSV(resourceContention)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `resource-contention-${date}.csv`)
  }

  const handleExportTeamCapacity = () => {
    const csv = exportTeamCapacityCSV(teamCapacity)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `team-capacity-${date}.csv`)
  }

  const handleExportDependencies = () => {
    const csv = exportInitiativeDependenciesCSV(initiativeDependencies)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `initiative-dependencies-${date}.csv`)
  }

  const handleExportForecasts = () => {
    const csv = exportForecastCSV(forecasts)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `initiative-forecasts-${date}.csv`)
  }

  if (initiatives.length === 0) {
    return (
      <div className="container">
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            No Initiatives Found
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
            Tag epics with "initiative::name" labels to start tracking cross-team coordination
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            Example: <code style={{ padding: '2px 6px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>initiative::platform-modernization</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Cross-Team Coordination
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Manage cross-team initiatives with team attribution, dependencies, and forecasting
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '30px',
        borderBottom: '2px solid var(--border-light)',
        paddingBottom: '0'
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'teams', label: 'Team Capacity' },
          { id: 'dependencies', label: 'Dependencies' },
          { id: 'forecasts', label: 'Forecasts' },
          { id: 'resources', label: 'Resource Contention' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? '600' : '400',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          initiatives={initiatives}
          teams={teams}
          teamCapacity={teamCapacity}
          resourceContention={resourceContention}
          blockingInitiatives={blockingInitiatives}
          forecasts={forecasts}
        />
      )}

      {activeTab === 'teams' && (
        <TeamsTab
          teamCapacity={teamCapacity}
          initiativeAttributions={initiativeAttributions}
          onExportAttribution={handleExportTeamAttribution}
          onExportCapacity={handleExportTeamCapacity}
        />
      )}

      {activeTab === 'dependencies' && (
        <DependenciesTab
          initiativeDependencies={initiativeDependencies}
          dependencyMatrix={dependencyMatrix}
          blockingInitiatives={blockingInitiatives}
          onExport={handleExportDependencies}
        />
      )}

      {activeTab === 'forecasts' && (
        <ForecastsTab
          forecasts={forecasts}
          initiatives={initiatives}
          onExport={handleExportForecasts}
        />
      )}

      {activeTab === 'resources' && (
        <ResourcesTab
          resourceContention={resourceContention}
          sharedResources={sharedResources}
          onExport={handleExportResourceContention}
        />
      )}
    </div>
  )
}

/**
 * Overview Tab - High-level summary
 */
function OverviewTab({ initiatives, teams, teamCapacity, resourceContention, blockingInitiatives, forecasts }) {
  const atRiskForecasts = forecasts.filter(f => f.comparison.status === 'at-risk' || f.comparison.status === 'warning')
  const overloadedTeams = teamCapacity.filter(t => t.capacityStatus === 'overloaded')
  const highContentionResources = resourceContention.filter(r => r.contentionLevel >= 70)

  return (
    <div>
      {/* Key Metrics */}
      <div className="grid grid-4" style={{ marginBottom: '30px' }}>
        <div className="card metric-card">
          <div className="metric-label">Total Initiatives</div>
          <div className="metric-value" style={{ color: 'var(--info)' }}>
            {initiatives.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {initiatives.filter(i => i.progress < 100).length} active
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">Teams Involved</div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>
            {teams.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {overloadedTeams.length} overloaded
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">At-Risk Forecasts</div>
          <div className="metric-value" style={{ color: 'var(--danger)' }}>
            {atRiskForecasts.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Delayed delivery risk
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">Resource Conflicts</div>
          <div className="metric-value" style={{ color: 'var(--warning)' }}>
            {highContentionResources.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Critical contention
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '30px' }}>
        {/* Blocking Initiatives */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Blocking Initiatives
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Initiatives that are blocking other initiatives
          </p>

          {blockingInitiatives.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                No blocking dependencies found
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {blockingInitiatives.slice(0, 3).map(blocking => (
                <div
                  key={blocking.initiativeId}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${
                      blocking.highestSeverity === 'high' ? 'var(--danger)' :
                      blocking.highestSeverity === 'medium' ? 'var(--warning)' : 'var(--info)'
                    }`
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                    {blocking.initiativeName}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Blocking {blocking.blockedInitiatives.length} initiative{blocking.blockedInitiatives.length !== 1 ? 's' : ''} · {blocking.totalBlockedIssues} open dependencies
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Status: <strong style={{ textTransform: 'capitalize' }}>{blocking.initiativeStatus}</strong> · Progress: <strong>{blocking.initiativeProgress}%</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overloaded Teams */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Overloaded Teams
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Teams at or above capacity
          </p>

          {overloadedTeams.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                No overloaded teams
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {overloadedTeams.slice(0, 3).map(team => (
                <div
                  key={team.teamName}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600' }}>
                      {team.teamName}
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: 'var(--danger)',
                      background: '#FEE2E2'
                    }}>
                      Overloaded
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {team.activeInitiativeCount} active initiatives · {team.openIssueCount} open issues
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {team.memberCount} member{team.memberCount !== 1 ? 's' : ''} · Capacity: {team.capacityScore}/100
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Teams Tab - Team capacity and attribution
 */
function TeamsTab({ teamCapacity, initiativeAttributions, onExportAttribution, onExportCapacity }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
          Team Capacity Overview
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onExportCapacity}>
            Export Capacity
          </button>
          <button className="btn btn-primary" onClick={onExportAttribution}>
            Export Attribution
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {teamCapacity.map(team => {
          const statusColor =
            team.capacityStatus === 'overloaded' ? 'var(--danger)' :
            team.capacityStatus === 'at-capacity' ? 'var(--warning)' : 'var(--success)'

          return (
            <div key={team.teamName} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    {team.teamName}
                  </h4>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {team.memberCount} member{team.memberCount !== 1 ? 's' : ''} · {team.completionRate}% completion rate
                  </div>
                </div>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: statusColor,
                  background: `${statusColor}15`,
                  textTransform: 'capitalize'
                }}>
                  {team.capacityStatus.replace('-', ' ')}
                </span>
              </div>

              <div className="grid grid-3" style={{ marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Active Initiatives
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>
                    {team.activeInitiativeCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Open Issues
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--warning)' }}>
                    {team.openIssueCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Capacity Score
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: statusColor }}>
                    {team.capacityScore}
                  </div>
                </div>
              </div>

              {team.initiatives.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: '600' }}>
                    Initiatives:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {team.initiatives.map(init => (
                      <span
                        key={init.id}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {init.name} ({init.progress}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Dependencies Tab - Cross-initiative dependencies
 */
function DependenciesTab({ initiativeDependencies, blockingInitiatives, onExport }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
          Initiative Dependencies
        </h3>
        <button className="btn btn-primary" onClick={onExport}>
          Export Dependencies
        </button>
      </div>

      {initiativeDependencies.length === 0 ? (
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
            No cross-initiative dependencies found
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {initiativeDependencies.map(dep => (
            <div key={dep.initiativeId} className="card">
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                  {dep.initiativeName}
                </h4>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Depends on {dep.dependsOn.length} initiative{dep.dependsOn.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dep.dependsOn.map(target => (
                  <div
                    key={target.initiativeId}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${
                        target.severity === 'high' ? 'var(--danger)' :
                        target.severity === 'medium' ? 'var(--warning)' : 'var(--success)'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                          {target.initiativeName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {target.dependencyCount} dependencies · {target.openDependencies} open
                          {target.isBlocking && <span style={{ color: 'var(--danger)', marginLeft: '8px' }}>● Blocking</span>}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        color: target.severity === 'high' ? 'var(--danger)' :
                               target.severity === 'medium' ? 'var(--warning)' : 'var(--success)',
                        background: target.severity === 'high' ? '#FEE2E2' :
                                   target.severity === 'medium' ? '#FEF3C7' : '#D1FAE5'
                      }}>
                        {target.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Forecasts Tab - Timeline forecasting
 */
function ForecastsTab({ forecasts, onExport }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
          Initiative Forecasts
        </h3>
        <button className="btn btn-primary" onClick={onExport}>
          Export Forecasts
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {forecasts.map(forecast => {
          const badge = getForecastStatusBadge(forecast.comparison.status)

          return (
            <div key={forecast.initiativeId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    {forecast.initiativeName}
                  </h4>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Progress: {forecast.initiativeProgress}% · Status: <span style={{ textTransform: 'capitalize' }}>{forecast.initiativeStatus}</span>
                  </div>
                </div>
                {forecast.comparison.hasDueDate && forecast.comparison.hasForecast && (
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: badge.color,
                    background: badge.background
                  }}>
                    {badge.label}
                  </span>
                )}
              </div>

              <div className="grid grid-3" style={{ marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Due Date
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {forecast.dueDate ? formatForecastDate(new Date(forecast.dueDate)) : 'Not set'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Forecast Date
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {forecast.forecastDate ? formatForecastDate(forecast.forecastDate) : 'No forecast'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Gap
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: forecast.comparison.isLate ? 'var(--danger)' : 'var(--success)'
                  }}>
                    {forecast.comparison.hasDueDate && forecast.comparison.hasForecast
                      ? `${Math.abs(forecast.comparison.weeksGap)} week${Math.abs(forecast.comparison.weeksGap) !== 1 ? 's' : ''} ${forecast.comparison.isLate ? 'late' : 'early'}`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {forecast.velocity && (
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  <strong>Velocity:</strong> {forecast.velocity.weeklyAverage.toFixed(1)} issues/week ·
                  <strong style={{ marginLeft: '12px' }}>Confidence:</strong> {forecast.confidence}% ·
                  <strong style={{ marginLeft: '12px' }}>Range:</strong> {forecast.variance?.optimistic}-{forecast.variance?.pessimistic} weeks
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Resources Tab - Resource contention
 */
function ResourcesTab({ resourceContention, sharedResources, onExport }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
          Resource Contention
        </h3>
        <button className="btn btn-primary" onClick={onExport}>
          Export Contention
        </button>
      </div>

      {resourceContention.length === 0 ? (
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
            No resource contention detected
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {resourceContention.map(person => (
            <div key={person.username} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    {person.name}
                  </h4>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    @{person.username}
                  </div>
                </div>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: person.contentionLevel >= 70 ? 'var(--danger)' :
                         person.contentionLevel >= 40 ? 'var(--warning)' : 'var(--info)',
                  background: person.contentionLevel >= 70 ? '#FEE2E2' :
                             person.contentionLevel >= 40 ? '#FEF3C7' : '#DBEAFE'
                }}>
                  Level {person.contentionLevel}
                </span>
              </div>

              <div className="grid grid-3" style={{ marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Initiatives
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>
                    {person.initiativeCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    High Priority
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--danger)' }}>
                    {person.highPriorityCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Open Issues
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--warning)' }}>
                    {person.totalIssues}
                  </div>
                </div>
              </div>

              {person.teams.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong>Teams:</strong> {person.teams.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
