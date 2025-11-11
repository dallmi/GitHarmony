/**
 * PDF Export Utilities for Executive Dashboard
 * Creates a formatted PDF report from dashboard data
 * Uses simple HTML-to-print approach without external PDF libraries
 */

/**
 * Generate a printable HTML report for PDF export
 * Opens in a new window with print-optimized styling
 */
export function exportExecutiveDashboardToPDF(data) {
  const {
    initiatives,
    healthScore,
    burnupData,
    velocityTrend,
    cycleTimeMetrics,
    deliveryConfidence,
    monthOverMonthMetrics,
    recentDecisions,
    upcomingMilestones,
    stats,
    teamPerformance,
    forecastAccuracy
  } = data

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Create HTML content
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Executive Dashboard Report - ${date}</title>
  <style>
    @media print {
      body { margin: 0; }
      .page-break { page-break-before: always; }
      @page { margin: 0.5in; }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.5;
      color: #111827;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }

    .content-wrapper {
      width: 100%;
      padding: 0;
      margin: 0;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #111827;
    }

    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 32px;
      margin-bottom: 16px;
      color: #111827;
      border-bottom: 2px solid #E5E7EB;
      padding-bottom: 8px;
    }

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 12px;
      color: #374151;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563EB;
    }

    .subtitle {
      font-size: 14px;
      color: #6B7280;
      margin-top: 8px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      padding: 16px;
      background: #F9FAFB;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }

    .metric-label {
      font-size: 11px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #2563EB;
    }

    .metric-subtext {
      font-size: 12px;
      color: #6B7280;
      margin-top: 4px;
    }

    .confidence-section {
      background: linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%);
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .confidence-score {
      text-align: center;
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .factors-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .factor-card {
      padding: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
      text-align: center;
    }

    .initiative-list, .decision-list, .milestone-list {
      margin-bottom: 20px;
    }

    .initiative-item, .decision-item, .milestone-item {
      padding: 12px;
      background: #F9FAFB;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid #2563EB;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-on-track { background: #D1FAE5; color: #065F46; }
    .status-at-risk { background: #FEF3C7; color: #92400E; }
    .status-off-track { background: #FEE2E2; color: #991B1B; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #E5E7EB;
    }

    th {
      background: #F9FAFB;
      font-weight: 600;
      color: #374151;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
    }

    .team-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .team-member-card {
      padding: 10px;
      background: #F9FAFB;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      text-align: center;
    }

    .burnout-alert {
      padding: 12px;
      background: #FEE2E2;
      border: 2px solid #DC2626;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .risk-item {
      padding: 10px;
      background: white;
      border-radius: 6px;
      border-left: 4px solid #DC2626;
      margin-bottom: 8px;
    }

    .trend-metric {
      padding: 12px;
      background: #F9FAFB;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }

    .trend-positive { color: #16A34A; }
    .trend-negative { color: #DC2626; }
    .trend-neutral { color: #6B7280; }

    .chart-placeholder {
      width: 100%;
      height: 200px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6B7280;
      font-size: 12px;
      margin-bottom: 20px;
    }

    .workload-bar {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: #F9FAFB;
      border-radius: 6px;
      margin-bottom: 6px;
    }

    .workload-bar.overloaded {
      background: #FEF3C7;
      border-left: 3px solid #F59E0B;
    }

    .workload-bar.on-leave {
      background: #F3F4F6;
      opacity: 0.7;
    }

    .forecast-stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .reliability-factors-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    @media screen {
      .no-print {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
      }

      .print-button {
        padding: 12px 24px;
        background: #2563EB;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }

      .print-button:hover {
        background: #1D4ED8;
      }
    }

    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="header">
    <h1>Executive Dashboard Report</h1>
    <div class="subtitle">${date}</div>
  </div>

  <!-- Key Performance Indicators -->
  <h2>Key Performance Indicators</h2>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Health Score</div>
      <div class="metric-value" style="color: ${healthScore?.status === 'green' ? '#16A34A' : healthScore?.status === 'amber' ? '#EAB308' : '#DC2626'}">
        ${healthScore?.score || 0}
      </div>
      <div class="metric-subtext">${healthScore?.status || 'unknown'}</div>
    </div>

    ${burnupData ? `
    <div class="metric-card">
      <div class="metric-label">Total Scope</div>
      <div class="metric-value">${burnupData.totalScope}</div>
      <div class="metric-subtext">${burnupData.completed} completed</div>
    </div>

    <div class="metric-card">
      <div class="metric-label">Scope Growth</div>
      <div class="metric-value" style="color: ${burnupData.scopeGrowthPercent > 25 ? '#DC2626' : '#2563EB'}">
        ${burnupData.scopeGrowthPercent}%
      </div>
      <div class="metric-subtext">+${burnupData.scopeGrowth} items</div>
    </div>
    ` : ''}

    ${cycleTimeMetrics ? `
    <div class="metric-card">
      <div class="metric-label">Cycle Time</div>
      <div class="metric-value">${cycleTimeMetrics.avgCycleTime}</div>
      <div class="metric-subtext">days average</div>
    </div>
    ` : ''}
  </div>

  <!-- Delivery Confidence Score -->
  ${deliveryConfidence ? `
  <h2>Delivery Confidence Score</h2>
  <div class="confidence-section">
    <div class="confidence-score" style="color: ${deliveryConfidence.statusColor}">
      ${deliveryConfidence.score}%
    </div>
    <div style="text-align: center; font-size: 14px; font-weight: 600; text-transform: uppercase; color: ${deliveryConfidence.statusColor}; margin-bottom: 20px;">
      ${deliveryConfidence.status} CONFIDENCE
    </div>

    <h3>Confidence Factors</h3>
    <div class="factors-grid">
      ${deliveryConfidence.factors.map(factor => {
        const percentage = Math.round((factor.score / factor.maxScore) * 100)
        return `
        <div class="factor-card">
          <div style="font-size: 11px; color: #6B7280; margin-bottom: 6px;">${factor.name}</div>
          <div style="font-size: 20px; font-weight: 600; color: ${factor.status === 'good' ? '#16A34A' : factor.status === 'warning' ? '#EAB308' : '#DC2626'};">
            ${percentage}%
          </div>
          <div style="font-size: 10px; color: #6B7280; margin-top: 4px;">${factor.detail}</div>
        </div>
        `
      }).join('')}
    </div>

    ${deliveryConfidence.recommendations.length > 0 ? `
    <h3>Top Recommendations</h3>
    <ul>
      ${deliveryConfidence.recommendations.slice(0, 3).map(rec => `
        <li><strong>[${rec.priority.toUpperCase()}]</strong> ${rec.title}: ${rec.description}</li>
      `).join('')}
    </ul>
    ` : ''}
  </div>
  ` : ''}

  <!-- Active Initiatives -->
  ${initiatives && initiatives.length > 0 ? `
  <div class="page-break"></div>
  <h2>Active Initiatives</h2>
  <div class="initiative-list">
    ${initiatives.slice(0, 5).map(initiative => `
      <div class="initiative-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 15px;">${initiative.name}</strong>
          <span class="status-badge status-${initiative.status.replace(' ', '-')}">
            ${initiative.status}
          </span>
        </div>
        <div style="font-size: 13px; color: #6B7280; margin-bottom: 8px;">
          ${initiative.epics.length} epic(s) · ${initiative.totalIssues} issue(s)
        </div>
        <div style="font-size: 13px;">
          <strong>Progress:</strong> ${initiative.progress}%
          ${initiative.dueDate ? ` · <strong>Due:</strong> ${new Date(initiative.dueDate).toLocaleDateString()}` : ''}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Upcoming Milestones -->
  ${upcomingMilestones && upcomingMilestones.length > 0 ? `
  <h2>Upcoming Milestones (Next 30 Days)</h2>
  <div class="milestone-list">
    ${upcomingMilestones.slice(0, 5).map(milestone => `
      <div class="milestone-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 15px;">${milestone.title}</strong>
          <span style="font-weight: 600; color: #2563EB;">${milestone.daysUntil} day(s)</span>
        </div>
        <div style="font-size: 13px; color: #6B7280;">
          ${milestone.description || 'No description'}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Recent Decisions -->
  ${recentDecisions && recentDecisions.length > 0 ? `
  <h2>Recent Strategic Decisions</h2>
  <div class="decision-list">
    ${recentDecisions.slice(0, 5).map(decision => `
      <div class="decision-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 14px;">${decision.title}</strong>
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #DC2626;">
            ${decision.impact}
          </span>
        </div>
        <div style="font-size: 12px; color: #6B7280; margin-bottom: 6px;">
          ${decision.description}
        </div>
        <div style="font-size: 11px; color: #9CA3AF;">
          ${decision.category} · ${decision.date.toLocaleDateString()}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Burnup Chart Visualization -->
  ${burnupData && burnupData.dataPoints && burnupData.dataPoints.length > 0 ? (() => {
    const dataPoints = burnupData.dataPoints
    const width = 700
    const height = 300
    const padding = { top: 40, right: 20, bottom: 50, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Find max value for Y axis
    const maxValue = Math.max(...dataPoints.map(d => d.totalScope), 10)
    const yAxisMax = Math.ceil(maxValue * 1.1 / 10) * 10

    // Calculate scales
    const xScale = (index) => padding.left + (index / (dataPoints.length - 1 || 1)) * chartWidth
    const yScale = (value) => padding.top + chartHeight - (value / yAxisMax) * chartHeight

    // Create path data
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

    // Y axis ticks
    const yAxisTicks = []
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((yAxisMax / 5) * i)
      const y = yScale(value)
      yAxisTicks.push({ value, y })
    }

    // X axis ticks (show every Nth point)
    const xAxisInterval = Math.max(1, Math.floor(dataPoints.length / 6))
    const xAxisTicks = dataPoints
      .filter((_, i) => i % xAxisInterval === 0 || i === dataPoints.length - 1)
      .map((d, idx) => {
        const actualIndex = idx * xAxisInterval
        if (actualIndex >= dataPoints.length) return null
        return {
          label: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
          x: xScale(actualIndex)
        }
      })
      .filter(t => t !== null)

    return `
  <div class="page-break"></div>
  <h2>Burnup Chart - Scope vs Completion</h2>
  <div style="margin-bottom: 20px;">
    <svg width="${width}" height="${height}" style="font-family: system-ui, sans-serif; display: block; margin: 0 auto;">
      <!-- Background grid -->
      ${yAxisTicks.map((tick, i) => `
        <line x1="${padding.left}" y1="${tick.y}" x2="${padding.left + chartWidth}" y2="${tick.y}"
              stroke="#E5E7EB" stroke-width="1" stroke-dasharray="2,2"/>
      `).join('')}

      <!-- Y Axis -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}"
            stroke="#9CA3AF" stroke-width="2"/>

      <!-- X Axis -->
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}"
            stroke="#9CA3AF" stroke-width="2"/>

      <!-- Y Axis Labels -->
      ${yAxisTicks.map(tick => `
        <text x="${padding.left - 10}" y="${tick.y + 4}" text-anchor="end" font-size="11" fill="#6B7280">
          ${tick.value}
        </text>
      `).join('')}

      <!-- X Axis Labels -->
      ${xAxisTicks.map(tick => `
        <text x="${tick.x}" y="${padding.top + chartHeight + 20}" text-anchor="middle" font-size="10" fill="#6B7280">
          ${tick.label}
        </text>
      `).join('')}

      <!-- Fill area under completed line -->
      <path d="${completedPath} L ${xScale(dataPoints.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z"
            fill="#10B981" fill-opacity="0.1"/>

      <!-- Total Scope Line (red) -->
      <path d="${scopePath}" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Completed Work Line (green) -->
      <path d="${completedPath}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Data points -->
      ${dataPoints.map((point, i) => {
        const x = xScale(i)
        const yScope = yScale(point.totalScope)
        const yCompleted = yScale(point.completed)
        return `
        <circle cx="${x}" cy="${yScope}" r="3" fill="#EF4444" stroke="white" stroke-width="2"/>
        <circle cx="${x}" cy="${yCompleted}" r="3" fill="#10B981" stroke="white" stroke-width="2"/>
        `
      }).join('')}

      <!-- Legend -->
      <g transform="translate(${padding.left + 20}, ${padding.top - 20})">
        <line x1="0" y1="0" x2="30" y2="0" stroke="#EF4444" stroke-width="2.5"/>
        <text x="35" y="4" font-size="11" fill="#374151">Total Scope</text>
        <line x1="130" y1="0" x2="160" y2="0" stroke="#10B981" stroke-width="2.5"/>
        <text x="165" y="4" font-size="11" fill="#374151">Completed</text>
      </g>

      <!-- Chart Title -->
      <text x="${padding.left + chartWidth / 2}" y="20" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">
        Burnup Chart - Progress Over Time
      </text>

      <!-- Y Axis Label -->
      <text x="-${height / 2}" y="15" text-anchor="middle" font-size="11" fill="#6B7280" transform="rotate(-90)">
        Issue Count
      </text>
    </svg>
  </div>

  <!-- Summary Stats -->
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
    <div class="metric-card">
      <div class="metric-label">Total Scope</div>
      <div class="metric-value" style="font-size: 24px; color: #EF4444;">
        ${burnupData.totalScope}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Completed</div>
      <div class="metric-value" style="font-size: 24px; color: #10B981;">
        ${burnupData.completed}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Remaining</div>
      <div class="metric-value" style="font-size: 24px; color: #6B7280;">
        ${burnupData.totalScope - burnupData.completed}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Progress</div>
      <div class="metric-value" style="font-size: 24px; color: #2563EB;">
        ${Math.round((burnupData.completed / burnupData.totalScope) * 100)}%
      </div>
    </div>
  </div>
    `
  })() : ''}

  <!-- Trailing 30-Day Trends -->
  ${monthOverMonthMetrics ? `
  <h2>Trailing 30-Day Trends</h2>
  <div style="font-size: 13px; color: #6B7280; margin-bottom: 16px;">
    Comparing ${monthOverMonthMetrics.currentPeriod.name} vs ${monthOverMonthMetrics.previousPeriod.name}
  </div>
  <div class="metrics-grid">
    <div class="trend-metric">
      <div class="metric-label">Issues Created</div>
      <div class="metric-value" style="font-size: 24px;">
        ${monthOverMonthMetrics.currentPeriod.issues}
      </div>
      <div class="metric-subtext ${
        monthOverMonthMetrics.percentChanges.issues > 0 ? 'trend-positive' :
        monthOverMonthMetrics.percentChanges.issues < 0 ? 'trend-negative' : 'trend-neutral'
      }">
        ${monthOverMonthMetrics.percentChanges.issues > 0 ? '↑' : monthOverMonthMetrics.percentChanges.issues < 0 ? '↓' : '→'}
        ${Math.abs(monthOverMonthMetrics.percentChanges.issues)}%
      </div>
    </div>
    <div class="trend-metric">
      <div class="metric-label">Issues Completed</div>
      <div class="metric-value" style="font-size: 24px;">
        ${monthOverMonthMetrics.currentPeriod.completed}
      </div>
      <div class="metric-subtext ${
        monthOverMonthMetrics.percentChanges.completed > 0 ? 'trend-positive' :
        monthOverMonthMetrics.percentChanges.completed < 0 ? 'trend-negative' : 'trend-neutral'
      }">
        ${monthOverMonthMetrics.percentChanges.completed > 0 ? '↑' : monthOverMonthMetrics.percentChanges.completed < 0 ? '↓' : '→'}
        ${Math.abs(monthOverMonthMetrics.percentChanges.completed)}%
      </div>
    </div>
    <div class="trend-metric">
      <div class="metric-label">Story Points</div>
      <div class="metric-value" style="font-size: 24px;">
        ${monthOverMonthMetrics.currentPeriod.points}
      </div>
      <div class="metric-subtext ${
        monthOverMonthMetrics.percentChanges.points > 0 ? 'trend-positive' :
        monthOverMonthMetrics.percentChanges.points < 0 ? 'trend-negative' : 'trend-neutral'
      }">
        ${monthOverMonthMetrics.percentChanges.points > 0 ? '↑' : monthOverMonthMetrics.percentChanges.points < 0 ? '↓' : '→'}
        ${Math.abs(monthOverMonthMetrics.percentChanges.points)}%
      </div>
    </div>
    <div class="trend-metric">
      <div class="metric-label">Net Progress</div>
      <div class="metric-value" style="font-size: 24px;">
        ${monthOverMonthMetrics.currentPeriod.completed - monthOverMonthMetrics.currentPeriod.issues}
      </div>
      <div class="metric-subtext">
        Completed - Created
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Forecast Accuracy Tracking -->
  ${forecastAccuracy && forecastAccuracy.reliability && forecastAccuracy.reliability.score !== null ? `
  <div class="page-break"></div>
  <h2>Forecast Accuracy Tracking</h2>
  <div style="text-align: center; margin-bottom: 20px;">
    <div style="font-size: 48px; font-weight: 700; color: ${
      forecastAccuracy.reliability.score >= 80 ? '#16A34A' :
      forecastAccuracy.reliability.score >= 60 ? '#EAB308' : '#DC2626'
    };">
      ${forecastAccuracy.reliability.score}
    </div>
    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: ${
      forecastAccuracy.reliability.score >= 80 ? '#16A34A' :
      forecastAccuracy.reliability.score >= 60 ? '#EAB308' : '#DC2626'
    };">
      Reliability Score
    </div>
  </div>

  <h3>Key Statistics</h3>
  <div class="forecast-stats-grid">
    <div class="metric-card">
      <div class="metric-label">Completed Forecasts</div>
      <div class="metric-value" style="font-size: 20px; color: #2563EB;">
        ${forecastAccuracy.stats.completedForecasts}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">On Time</div>
      <div class="metric-value" style="font-size: 20px; color: #16A34A;">
        ${forecastAccuracy.stats.onTimePercentage}%
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg Days Off</div>
      <div class="metric-value" style="font-size: 20px; color: #EAB308;">
        ${forecastAccuracy.stats.avgDaysOff}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Early</div>
      <div class="metric-value" style="font-size: 20px; color: #3B82F6;">
        ${forecastAccuracy.stats.earlyCount}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Late</div>
      <div class="metric-value" style="font-size: 20px; color: #DC2626;">
        ${forecastAccuracy.stats.lateCount}
      </div>
    </div>
  </div>

  <h3>Reliability Factors</h3>
  <div class="reliability-factors-grid">
    ${forecastAccuracy.reliability.factors.map(factor => {
      const percentage = Math.round((factor.points / factor.maxPoints) * 100)
      return `
      <div class="metric-card">
        <div class="metric-label">${factor.name}</div>
        <div style="font-size: 18px; font-weight: 600; color: ${
          factor.status === 'good' ? '#16A34A' :
          factor.status === 'warning' ? '#EAB308' : '#DC2626'
        };">
          ${percentage}%
        </div>
        <div style="font-size: 10px; color: #6B7280; margin-top: 4px;">
          ${factor.detail}
        </div>
      </div>
      `
    }).join('')}
  </div>

  <div style="padding: 12px; background: #EFF6FF; border-radius: 8px; border: 1px solid #BFDBFE;">
    <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">Recommendation</div>
    <div style="font-size: 12px; color: #1E40AF;">${forecastAccuracy.reliability.recommendation}</div>
  </div>
  ` : ''}

  <!-- Team Performance & Workload -->
  ${teamPerformance ? `
  <div class="page-break"></div>
  <h2>Team Performance & Workload</h2>
  <div style="font-size: 13px; color: #6B7280; margin-bottom: 16px;">
    Individual contributions, workload distribution, and burnout risks
  </div>

  <!-- Summary Stats -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Active Members</div>
      <div class="metric-value" style="font-size: 24px; color: #2563EB;">
        ${teamPerformance.summary.activeMembers}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Issues Completed</div>
      <div class="metric-value" style="font-size: 24px; color: #16A34A;">
        ${teamPerformance.summary.totalCompleted}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Story Points</div>
      <div class="metric-value" style="font-size: 24px; color: #2563EB;">
        ${teamPerformance.summary.totalStoryPoints}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg per Member</div>
      <div class="metric-value" style="font-size: 24px; color: #3B82F6;">
        ${teamPerformance.summary.avgVelocityPerMember}
      </div>
    </div>
    <div class="metric-card" style="${teamPerformance.summary.membersAtRisk > 0 ? 'background: #FEE2E2;' : ''}">
      <div class="metric-label">At Risk</div>
      <div class="metric-value" style="font-size: 24px; color: ${teamPerformance.summary.membersAtRisk > 0 ? '#DC2626' : '#16A34A'};">
        ${teamPerformance.summary.membersAtRisk}
      </div>
    </div>
  </div>

  <!-- Top Contributors -->
  <h3>Top Contributors (Last 30 Days)</h3>
  <div class="team-grid">
    ${teamPerformance.topContributors.slice(0, 5).map((contributor, index) => `
      <div class="team-member-card" style="${index === 0 ? 'background: #FEF3C7; border: 2px solid #F59E0B;' : ''}">
        ${index === 0 ? '<div style="font-size: 20px; margin-bottom: 4px;">🏆</div>' : ''}
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">${contributor.name}</div>
        <div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">
          ${contributor.issuesCompleted} issues
        </div>
        <div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">
          ${contributor.storyPoints} pts
        </div>
        <div style="font-size: 11px; color: #6B7280;">
          ${contributor.avgCycleTime}d cycle
        </div>
      </div>
    `).join('')}
  </div>

  <!-- Burnout Risks -->
  ${teamPerformance.burnoutRisks.length > 0 ? `
  <div class="burnout-alert">
    <h3 style="color: #DC2626; margin-bottom: 12px;">⚠️ Burnout Risk Alert</h3>
    <div style="font-size: 12px; color: #DC2626; margin-bottom: 12px;">
      ${teamPerformance.burnoutRisks.length} team member${teamPerformance.burnoutRisks.length !== 1 ? 's' : ''} at risk of burnout
    </div>
    ${teamPerformance.burnoutRisks.map(risk => `
      <div class="risk-item" style="border-left-color: ${
        risk.riskLevel === 'high' ? '#DC2626' :
        risk.riskLevel === 'medium' ? '#F97316' : '#EAB308'
      };">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="font-size: 13px;">${risk.name}</strong>
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${
            risk.riskLevel === 'high' ? '#DC2626' :
            risk.riskLevel === 'medium' ? '#F97316' : '#EAB308'
          };">
            ${risk.riskLevel} RISK (${risk.riskScore})
          </span>
        </div>
        <div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">
          ${risk.openIssues} open issues · ${risk.storyPoints} pts · ${risk.overdueIssues} overdue
        </div>
        <div style="font-size: 11px; color: #374151;">
          Risk Factors: ${risk.riskFactors.join('; ')}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Workload Distribution -->
  <h3>Current Workload Distribution</h3>
  <div style="margin-bottom: 20px;">
    ${teamPerformance.workloadDistribution.slice(0, 8).map(member => {
      const isOverloaded = member.openIssues > 10 || member.storyPoints > 30
      return `
      <div class="workload-bar ${isOverloaded ? 'overloaded' : ''} ${member.isOnLeave ? 'on-leave' : ''}">
        <div style="flex: 1; font-weight: 600; font-size: 13px;">
          ${member.name}${member.role ? ` (${member.role})` : ''}
          ${member.isOnLeave ? ' 🏖️' : ''}
        </div>
        <div style="font-size: 12px; color: #6B7280; margin-right: 12px;">
          ${member.openIssues} issues · ${member.storyPoints} pts
          ${member.overdueIssues > 0 ? ` · ${member.overdueIssues} overdue` : ''}
        </div>
      </div>
      `
    }).join('')}
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by GitLab PM Dashboard · ${date}</p>
    <p style="margin-top: 8px; font-size: 11px;">
      This report provides a snapshot of project health and progress at the time of generation.
    </p>
  </div>
</body>
</html>
  `

  // Open in new window
  const printWindow = window.open('', '_blank', 'width=900,height=800')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Auto-trigger print dialog after a short delay to ensure content is rendered
    setTimeout(() => {
      printWindow.focus()
    }, 500)
  } else {
    alert('Please allow pop-ups to generate the PDF report.')
  }
}
