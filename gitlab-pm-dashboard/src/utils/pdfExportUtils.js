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
    stats
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
      @page { margin: 0.75in; }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #111827;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 20px;
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
