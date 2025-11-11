import React from 'react'

/**
 * Lightweight SVG-based Burnup Chart
 * Shows total scope vs completed work over time
 * No external chart library required
 */
export default function BurnupChart({ burnupData, width = 600, height = 300 }) {
  if (!burnupData || !burnupData.dataPoints || burnupData.dataPoints.length === 0) {
    return (
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        color: 'var(--text-tertiary)',
        fontSize: '14px'
      }}>
        No data available
      </div>
    )
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const dataPoints = burnupData.dataPoints

  // Find max value for Y axis
  const maxValue = Math.max(...dataPoints.map(d => d.totalScope), 10)
  const yAxisMax = Math.ceil(maxValue * 1.1 / 10) * 10 // Round up to nearest 10

  // Calculate X and Y scales
  const xScale = (index) => padding.left + (index / (dataPoints.length - 1 || 1)) * chartWidth
  const yScale = (value) => padding.top + chartHeight - (value / yAxisMax) * chartHeight

  // Create path data for scope and completed lines
  const scopePath = dataPoints.map((d, i) => {
    const x = xScale(i)
    const y = yScale(d.totalScope)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  const completedPath = dataPoints.map((d, i) => {
    const x = xScale(i)
    const y = yScale(d.completed)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // Generate Y axis labels (5 ticks)
  const yAxisTicks = []
  for (let i = 0; i <= 5; i++) {
    const value = Math.round((yAxisMax / 5) * i)
    const y = yScale(value)
    yAxisTicks.push({ value, y })
  }

  // Generate X axis labels (show every Nth point to avoid crowding)
  const xAxisInterval = Math.max(1, Math.floor(dataPoints.length / 6))
  const xAxisTicks = dataPoints
    .filter((_, i) => i % xAxisInterval === 0 || i === dataPoints.length - 1)
    .map((d, originalIndex) => {
      const actualIndex = originalIndex * xAxisInterval
      if (actualIndex >= dataPoints.length) return null
      return {
        label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        x: xScale(actualIndex)
      }
    })
    .filter(t => t !== null)

  return (
    <svg width={width} height={height} style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Background grid */}
      {yAxisTicks.map((tick, i) => (
        <line
          key={`grid-${i}`}
          x1={padding.left}
          y1={tick.y}
          x2={padding.left + chartWidth}
          y2={tick.y}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      ))}

      {/* Y Axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartHeight}
        stroke="#9CA3AF"
        strokeWidth="2"
      />

      {/* X Axis */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={padding.left + chartWidth}
        y2={padding.top + chartHeight}
        stroke="#9CA3AF"
        strokeWidth="2"
      />

      {/* Y Axis Labels */}
      {yAxisTicks.map((tick, i) => (
        <text
          key={`ylabel-${i}`}
          x={padding.left - 10}
          y={tick.y + 4}
          textAnchor="end"
          fontSize="11"
          fill="#6B7280"
        >
          {tick.value}
        </text>
      ))}

      {/* X Axis Labels */}
      {xAxisTicks.map((tick, i) => (
        <text
          key={`xlabel-${i}`}
          x={tick.x}
          y={padding.top + chartHeight + 20}
          textAnchor="middle"
          fontSize="10"
          fill="#6B7280"
        >
          {tick.label}
        </text>
      ))}

      {/* Total Scope Line (red) */}
      <path
        d={scopePath}
        fill="none"
        stroke="#EF4444"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Completed Work Line (green) */}
      <path
        d={completedPath}
        fill="none"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fill area under completed line */}
      <path
        d={`${completedPath} L ${xScale(dataPoints.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
        fill="#10B981"
        fillOpacity="0.1"
      />

      {/* Legend */}
      <g transform={`translate(${padding.left + 20}, ${padding.top + 10})`}>
        {/* Total Scope */}
        <line x1="0" y1="0" x2="30" y2="0" stroke="#EF4444" strokeWidth="2.5" />
        <text x="35" y="4" fontSize="11" fill="#374151">Total Scope</text>

        {/* Completed */}
        <line x1="130" y1="0" x2="160" y2="0" stroke="#10B981" strokeWidth="2.5" />
        <text x="165" y="4" fontSize="11" fill="#374151">Completed</text>
      </g>

      {/* Chart Title */}
      <text
        x={padding.left + chartWidth / 2}
        y={15}
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill="#111827"
      >
        Burnup Chart - Scope vs Completion
      </text>

      {/* Y Axis Label */}
      <text
        x={-height / 2}
        y={15}
        textAnchor="middle"
        fontSize="11"
        fill="#6B7280"
        transform={`rotate(-90, 15, ${height / 2})`}
      >
        Issue Count
      </text>
    </svg>
  )
}
