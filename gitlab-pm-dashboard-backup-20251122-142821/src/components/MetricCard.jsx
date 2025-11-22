import React from 'react'

export default function MetricCard({ label, value, color, subtitle }) {
  return (
    <div className="card metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={color ? { color } : {}}>
        {value}
      </div>
      {subtitle && (
        <div className="text-small text-muted">{subtitle}</div>
      )}
    </div>
  )
}
