import React, { useState, useRef, useEffect } from 'react'

/**
 * Interactive SVG-based Burnup Chart
 * Shows total scope vs completed work over time with tooltips
 * No external chart library required
 */
export default function BurnupChart({ burnupData, width, height = 300 }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [containerWidth, setContainerWidth] = useState(width || 600)
  const containerRef = useRef(null)

  // Handle responsive width
  useEffect(() => {
    if (width) {
      setContainerWidth(width)
      return
    }

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [width])

  if (!burnupData || !burnupData.dataPoints || burnupData.dataPoints.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: width ? `${width}px` : '100%',
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
  const chartWidth = containerWidth - padding.left - padding.right
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
        label: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        x: xScale(actualIndex)
      }
    })
    .filter(t => t !== null)

  // Find year boundaries for visual markers
  const yearBoundaries = []
  let previousYear = null
  dataPoints.forEach((point, index) => {
    const date = new Date(point.date)
    const year = date.getFullYear()

    // Mark the first occurrence of each new year (except the very first point)
    if (previousYear !== null && year !== previousYear && index > 0) {
      yearBoundaries.push({
        index,
        year,
        x: xScale(index)
      })
    }
    previousYear = year
  })

  return (
    <div ref={containerRef} style={{ width: width ? `${width}px` : '100%' }}>
      <svg width={containerWidth} height={height} style={{ fontFamily: 'system-ui, sans-serif' }}>
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

      {/* Year boundary markers */}
      {yearBoundaries.map((boundary, i) => (
        <g key={`year-${i}`}>
          {/* Vertical line at year boundary */}
          <line
            x1={boundary.x}
            y1={padding.top}
            x2={boundary.x}
            y2={padding.top + chartHeight}
            stroke="#3B82F6"
            strokeWidth="1.5"
            strokeDasharray="5,5"
            opacity="0.6"
          />
          {/* Year label */}
          <text
            x={boundary.x}
            y={padding.top + chartHeight + 35}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#3B82F6"
          >
            {boundary.year}
          </text>
        </g>
      ))}

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

      {/* Interactive Data Points */}
      {dataPoints.map((point, i) => {
        const x = xScale(i)
        const yScope = yScale(point.totalScope)
        const yCompleted = yScale(point.completed)
        const isHovered = hoveredPoint === i

        return (
          <g key={`point-${i}`}>
            {/* Invisible larger hit area for easier hovering */}
            <rect
              x={x - 10}
              y={padding.top}
              width={20}
              height={chartHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => {
                setHoveredPoint(i)
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            />

            {/* Hover highlight line */}
            {isHovered && (
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + chartHeight}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="4,4"
                pointerEvents="none"
              />
            )}

            {/* Scope point */}
            <circle
              cx={x}
              cy={yScope}
              r={isHovered ? 5 : 3}
              fill="#EF4444"
              stroke="white"
              strokeWidth="2"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                pointerEvents: 'none'
              }}
            />

            {/* Completed point */}
            <circle
              cx={x}
              cy={yCompleted}
              r={isHovered ? 5 : 3}
              fill="#10B981"
              stroke="white"
              strokeWidth="2"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                pointerEvents: 'none'
              }}
            />
          </g>
        )
      })}

      {/* Tooltip */}
      {hoveredPoint !== null && (() => {
        const tooltipWidth = 150
        const xPos = xScale(hoveredPoint)
        // Flip tooltip to left side if it would overflow on the right
        const shouldFlipLeft = xPos + tooltipWidth + 20 > containerWidth
        const tooltipX = shouldFlipLeft ? xPos - tooltipWidth - 10 : xPos + 10

        return (
          <g>
            <foreignObject
              x={tooltipX}
              y={padding.top + 10}
              width={tooltipWidth}
              height={100}
            >
              <div
                style={{
                  background: 'rgba(17, 24, 39, 0.95)',
                  color: 'white',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                  pointerEvents: 'none'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '12px' }}>
                  {new Date(dataPoints[hoveredPoint].date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </div>
                <div style={{ marginBottom: '4px', color: '#FCA5A5' }}>
                  <strong>Total Scope:</strong> {dataPoints[hoveredPoint].totalScope}
                </div>
                <div style={{ marginBottom: '4px', color: '#6EE7B7' }}>
                  <strong>Completed:</strong> {dataPoints[hoveredPoint].completed}
                </div>
                <div style={{ color: '#D1D5DB' }}>
                  <strong>Remaining:</strong> {dataPoints[hoveredPoint].totalScope - dataPoints[hoveredPoint].completed}
                </div>
              </div>
            </foreignObject>
          </g>
        )
      })()}
    </svg>
    </div>
  )
}
