import React from 'react'

export default function Header({ stats, healthScore, onRefresh, onConfigure, onChangeRole, loading }) {
  return (
    <div className="header">
      <div style={{
        width: '100%',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
              GitHarmony
            </h1>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '4px' }}>
              teams in tune
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {stats && (
                <>
                  {stats.total} Issues · {stats.open} Open · {stats.closed} Closed
                  {stats.blockers > 0 && (
                    <span style={{ marginLeft: '12px', color: 'var(--danger)' }}>
                      {stats.blockers} Blockers
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {healthScore && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: '6px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Health Score
              </span>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                color: 'white',
                background: healthScore.status === 'green' ? 'var(--success)' :
                           healthScore.status === 'amber' ? 'var(--warning)' :
                           'var(--danger)'
              }}>
                {healthScore.score}
              </div>
            </div>
          )}

          <button
            className="btn"
            onClick={onRefresh}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={onChangeRole}
            title="Change your role to customize navigation"
          >
            Change Role
          </button>

          <button
            className="btn btn-primary"
            onClick={onConfigure}
          >
            Configure
          </button>
        </div>
      </div>
    </div>
  )
}
