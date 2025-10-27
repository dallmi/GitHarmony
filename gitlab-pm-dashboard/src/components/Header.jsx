import React from 'react'

export default function Header({ stats, healthScore, onRefresh, onConfigure, onExportPPT, loading }) {
  return (
    <div className="header">
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="https://www.ubs.com/etc/designs/fit/img/UBS_logo_compact.png"
            alt="UBS Logo"
            style={{ height: '40px', width: 'auto' }}
          />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
              GitLab Project Management
            </h1>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
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
            className="btn btn-primary"
            onClick={onExportPPT}
            disabled={loading || !stats}
          >
            Export PPT
          </button>

          <button
            className="btn"
            onClick={onConfigure}
          >
            Configure
          </button>
        </div>
      </div>
    </div>
  )
}
