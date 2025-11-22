import React from 'react'

export default function PlaceholderView({ viewName }) {
  return (
    <div className="container">
      <div className="card text-center" style={{ padding: '60px 20px' }}>
        <h2 style={{ marginBottom: '12px' }}>{viewName}</h2>
        <p className="text-muted">This view is being migrated from V4 and will be available soon.</p>
      </div>
    </div>
  )
}
