/**
 * Consolidated Export Service
 * Combines CSV and PDF export functionality
 * Created by consolidating csvExportUtils.js and pdfExportUtils.js
 */

// ============================================================================
// CSV EXPORT SECTION (from csvExportUtils.js)
// ============================================================================

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column configuration
 * @returns {string} CSV string
 */
export function arrayToCSV(data, columns) {
  if (!data || data.length === 0) {
    return ''
  }

  // Build header row
  const headers = columns.map(col => `"${col.label || col.key}"`)
  const rows = [headers.join(',')]

  // Build data rows
  data.forEach(row => {
    const values = columns.map(col => {
      let value = row[col.key]

      // Handle nested properties
      if (col.key.includes('.')) {
        value = col.key.split('.').reduce((obj, key) => obj?.[key], row)
      }

      // Apply formatter if provided
      if (col.formatter && typeof col.formatter === 'function') {
        value = col.formatter(value, row)
      }

      // Handle different data types
      if (value === null || value === undefined) {
        return '""'
      } else if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      } else {
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`
      }
    })

    rows.push(values.join(','))
  })

  return rows.join('\n')
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Name for the downloaded file
 */
export function downloadCSV(csvContent, filename = 'export.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Export issues to CSV
 * @param {Array} issues - Array of GitLab issues
 * @param {string} filename - Name for the downloaded file
 */
export function exportIssuesToCSV(issues, filename = 'issues.csv') {
  const columns = [
    { key: 'iid', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'state', label: 'State' },
    { key: 'labels', label: 'Labels', formatter: (val) => val?.join(', ') || '' },
    { key: 'assignee.name', label: 'Assignee' },
    { key: 'milestone.title', label: 'Milestone' },
    { key: 'created_at', label: 'Created', formatter: (val) => new Date(val).toLocaleDateString() },
    { key: 'updated_at', label: 'Updated', formatter: (val) => new Date(val).toLocaleDateString() },
    { key: 'time_stats.time_estimate', label: 'Estimate (hours)', formatter: (val) => val ? val / 3600 : '' },
    { key: 'time_stats.total_time_spent', label: 'Time Spent (hours)', formatter: (val) => val ? val / 3600 : '' }
  ]

  const csv = arrayToCSV(issues, columns)
  downloadCSV(csv, filename)
}

/**
 * Export velocity data to CSV
 * @param {Array} velocityData - Velocity metrics data
 * @param {string} filename - Name for the downloaded file
 */
export function exportVelocityToCSV(velocityData, filename = 'velocity.csv') {
  const columns = [
    { key: 'sprint', label: 'Sprint' },
    { key: 'startDate', label: 'Start Date', formatter: (val) => val || '' },
    { key: 'endDate', label: 'End Date', formatter: (val) => val || '' },
    { key: 'completed', label: 'Completed Issues' },
    { key: 'planned', label: 'Planned Issues' },
    { key: 'completionRate', label: 'Completion Rate (%)', formatter: (val) => val ? `${val}%` : '0%' },
    { key: 'storyPoints', label: 'Story Points' },
    { key: 'velocity', label: 'Velocity' }
  ]

  const csv = arrayToCSV(velocityData, columns)
  downloadCSV(csv, filename)
}

/**
 * Export team metrics to CSV
 * @param {Array} teamData - Team performance data
 * @param {string} filename - Name for the downloaded file
 */
export function exportTeamMetricsToCSV(teamData, filename = 'team-metrics.csv') {
  const columns = [
    { key: 'member', label: 'Team Member' },
    { key: 'issuesCompleted', label: 'Issues Completed' },
    { key: 'storyPoints', label: 'Story Points' },
    { key: 'averageCycleTime', label: 'Avg Cycle Time (days)' },
    { key: 'velocity', label: 'Velocity' },
    { key: 'efficiency', label: 'Efficiency (%)' }
  ]

  const csv = arrayToCSV(teamData, columns)
  downloadCSV(csv, filename)
}

/**
 * Export epics to CSV
 * @param {Array} epics - Epic data
 * @param {string} filename - Name for the downloaded file
 */
export function exportEpicsToCSV(epics, filename = 'epics.csv') {
  const columns = [
    { key: 'iid', label: 'Epic ID', formatter: (val, row) => row.iid || row.id },
    { key: 'title', label: 'Title' },
    { key: 'web_url', label: 'URL' },
    { key: 'state', label: 'State' },
    { key: 'labels', label: 'Labels', formatter: (val) => val?.join('; ') || '' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'due_date', label: 'Due Date', formatter: (val, row) => row.due_date || row.end_date || '' },
    { key: 'issues', label: 'Total Issues', formatter: (val) => val?.length || 0 },
    { key: 'issues', label: 'Open Issues', formatter: (val) => val?.filter(i => i.state === 'opened').length || 0 },
    { key: 'issues', label: 'Closed Issues', formatter: (val) => val?.filter(i => i.state === 'closed').length || 0 },
    { key: 'completion', label: 'Completion %', formatter: (val, row) => {
      const total = row.issues?.length || 0
      const closed = row.issues?.filter(i => i.state === 'closed').length || 0
      return total > 0 ? `${Math.round((closed / total) * 100)}%` : '0%'
    }},
    { key: 'health.score', label: 'Health Score' },
    { key: 'author.name', label: 'Author' },
    { key: 'description', label: 'Description', formatter: (val) => val?.substring(0, 500) || '' }
  ]

  const csv = arrayToCSV(epics, columns)
  downloadCSV(csv, filename)
}

/**
 * Export risks to CSV
 * @param {Array} risks - Risk data
 * @param {string} filename - Name for the downloaded file
 */
export function exportRisksToCSV(risks, filename = 'risks.csv') {
  const columns = [
    { key: 'title', label: 'Risk Title' },
    { key: 'description', label: 'Description' },
    { key: 'impact', label: 'Impact' },
    { key: 'probability', label: 'Probability' },
    { key: 'riskScore', label: 'Risk Score' },
    { key: 'mitigation', label: 'Mitigation Strategy' },
    { key: 'owner', label: 'Owner' },
    { key: 'status', label: 'Status', formatter: (val) => val || 'Open' },
    { key: 'createdAt', label: 'Created Date', formatter: (val) => val ? new Date(val).toLocaleDateString() : '' }
  ]

  const csv = arrayToCSV(risks, columns)
  downloadCSV(csv, filename)
}

/**
 * Export cycle time data to CSV
 * @param {Array} cycleTimeData - Cycle time data
 * @param {string} filename - Name for the downloaded file
 */
export function exportCycleTimeToCSV(cycleTimeData, filename = 'cycle-time.csv') {
  const columns = [
    { key: 'iid', label: 'Issue ID', formatter: (val, row) => row.issueId || row.iid },
    { key: 'title', label: 'Title' },
    { key: 'leadTime', label: 'Lead Time (days)' },
    { key: 'cycleTime', label: 'Cycle Time (days)' },
    { key: 'createdAt', label: 'Created Date', formatter: (val) => val ? new Date(val).toLocaleDateString() : '' },
    { key: 'firstCommit', label: 'First Commit Date', formatter: (val) => val ? new Date(val).toLocaleDateString() : '' },
    { key: 'closedAt', label: 'Closed Date', formatter: (val) => val ? new Date(val).toLocaleDateString() : '' },
    { key: 'labels', label: 'Labels', formatter: (val) => val?.join('; ') || '' },
    { key: 'assignee', label: 'Assignee' }
  ]

  const csv = arrayToCSV(cycleTimeData, columns)
  downloadCSV(csv, filename)
}

/**
 * Generic export function with custom columns
 * @param {Array} data - Data to export
 * @param {Array} columns - Column configuration
 * @param {string} filename - Name for the downloaded file
 */
export function exportToCSV(data, columns, filename = 'export.csv') {
  const csv = arrayToCSV(data, columns)
  downloadCSV(csv, filename)
}

// ============================================================================
// PDF EXPORT SECTION (from pdfExportUtils.js)
// ============================================================================

/**
 * Export Executive Dashboard to PDF
 * Opens a printable HTML report in a new window
 * @param {Object} data - Dashboard data to export
 */
export function exportExecutiveDashboardToPDF(data) {
  const {
    initiatives,
    healthScore,
    recentDecisions,
    upcomingMilestones,
    stats
  } = data

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Create comprehensive HTML report
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
      line-height: 1.5;
      color: #111827;
      max-width: 100%;
      margin: 0;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563EB;
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

    .subtitle {
      font-size: 14px;
      color: #6B7280;
      margin-top: 8px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .metric-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
    }

    .metric-label {
      font-size: 12px;
      color: #6B7280;
      margin-bottom: 4px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }

    .table th {
      background: #F3F4F6;
      padding: 8px 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #E5E7EB;
    }

    .table td {
      padding: 8px 12px;
      font-size: 14px;
      border-bottom: 1px solid #F3F4F6;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-green { background: #D1FAE5; color: #065F46; }
    .status-yellow { background: #FEF3C7; color: #92400E; }
    .status-red { background: #FEE2E2; color: #991B1B; }

    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Executive Dashboard Report</h1>
    <div class="subtitle">Generated on ${date}</div>
  </div>

  ${healthScore ? `
    <section>
      <h2>Overall Health Score</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Overall Score</div>
          <div class="metric-value">${healthScore.overall || 0}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Velocity Score</div>
          <div class="metric-value">${healthScore.velocity || 0}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Quality Score</div>
          <div class="metric-value">${healthScore.quality || 0}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Predictability Score</div>
          <div class="metric-value">${healthScore.predictability || 0}%</div>
        </div>
      </div>
    </section>
  ` : ''}

  ${stats ? `
    <section>
      <h2>Key Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Initiatives</div>
          <div class="metric-value">${stats.totalInitiatives || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active Initiatives</div>
          <div class="metric-value">${stats.activeInitiatives || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Issues</div>
          <div class="metric-value">${stats.totalIssues || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Closed Issues</div>
          <div class="metric-value">${stats.closedIssues || 0}</div>
        </div>
      </div>
    </section>
  ` : ''}

  ${initiatives && initiatives.length > 0 ? `
    <section class="page-break">
      <h2>Active Initiatives</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Initiative</th>
            <th>Progress</th>
            <th>Health</th>
            <th>Risk</th>
            <th>End Date</th>
          </tr>
        </thead>
        <tbody>
          ${initiatives.map(init => `
            <tr>
              <td>${init.title}</td>
              <td>${init.progress || 0}%</td>
              <td><span class="status-badge status-${init.health === 'Good' ? 'green' : init.health === 'At Risk' ? 'yellow' : 'red'}">${init.health || 'Unknown'}</span></td>
              <td>${init.risks || 0}</td>
              <td>${init.endDate || 'Not set'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  ` : ''}

  ${upcomingMilestones && upcomingMilestones.length > 0 ? `
    <section>
      <h2>Upcoming Milestones</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Project</th>
            <th>Due Date</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${upcomingMilestones.map(milestone => `
            <tr>
              <td>${milestone.title}</td>
              <td>${milestone.project || ''}</td>
              <td>${milestone.dueDate || ''}</td>
              <td>${milestone.progress || 0}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  ` : ''}

  ${recentDecisions && recentDecisions.length > 0 ? `
    <section>
      <h2>Recent Decisions</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Decision</th>
            <th>Date</th>
            <th>Impact</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          ${recentDecisions.map(decision => `
            <tr>
              <td>${decision.title}</td>
              <td>${decision.date || ''}</td>
              <td>${decision.impact || ''}</td>
              <td>${decision.owner || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  ` : ''}

  <div class="footer">
    <p>GitLab PM Dashboard - Executive Report</p>
    <p>© ${new Date().getFullYear()} - Generated automatically</p>
  </div>
</body>
</html>
  `

  // Open in new window for printing
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }
}

/**
 * Generate PDF from HTML content
 * Note: This requires jsPDF library to be loaded
 * @param {string} htmlContent - HTML content to convert
 * @param {Object} options - PDF generation options
 */
export async function generatePDF(htmlContent, options = {}) {
  const {
    filename = 'export.pdf',
    orientation = 'portrait',
    format = 'a4',
    margin = 10
  } = options

  // Check if jsPDF is available
  if (typeof window.jspdf === 'undefined') {
    console.error('jsPDF library is not loaded. Please include jsPDF to use PDF export functionality.')
    return
  }

  try {
    // Create new jsPDF instance
    const doc = new window.jspdf.jsPDF({
      orientation,
      unit: 'mm',
      format
    })

    // Convert HTML to PDF
    await doc.html(htmlContent, {
      callback: function (doc) {
        doc.save(filename)
      },
      margin: margin,
      x: margin,
      y: margin,
      width: doc.internal.pageSize.width - (2 * margin),
      windowWidth: 800
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    // Fallback to simple text PDF
    generateSimplePDF(htmlContent, options)
  }
}

/**
 * Generate simple text-based PDF (fallback)
 * @param {string} content - Text content
 * @param {Object} options - PDF generation options
 */
function generateSimplePDF(content, options = {}) {
  const {
    filename = 'export.pdf',
    orientation = 'portrait',
    format = 'a4'
  } = options

  if (typeof window.jspdf === 'undefined') {
    console.error('jsPDF library is not loaded')
    return
  }

  const doc = new window.jspdf.jsPDF({
    orientation,
    unit: 'mm',
    format
  })

  // Strip HTML tags for simple text
  const text = content.replace(/<[^>]+>/g, '')

  // Split text into lines that fit on page
  const lines = doc.splitTextToSize(text, 180)

  // Add lines to PDF with pagination
  let y = 20
  lines.forEach(line => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    doc.text(line, 15, y)
    y += 7
  })

  doc.save(filename)
}

/**
 * Export dashboard to PDF
 * @param {Object} dashboardData - Dashboard data to export
 * @param {string} filename - Name for the PDF file
 */
export function exportDashboardToPDF(dashboardData, filename = 'dashboard.pdf') {
  const html = generateDashboardHTML(dashboardData)
  generatePDF(html, { filename, orientation: 'landscape' })
}

/**
 * Generate HTML for dashboard export
 * @param {Object} data - Dashboard data
 * @returns {string} HTML string
 */
function generateDashboardHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 20px; }
        .metric {
          display: inline-block;
          margin: 10px 20px 10px 0;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 5px;
        }
        .metric-label { font-size: 12px; color: #666; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #4CAF50; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        .chart { margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>${data.title || 'Project Dashboard'}</h1>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>

      ${data.metrics ? generateMetricsHTML(data.metrics) : ''}
      ${data.issues ? generateIssuesTableHTML(data.issues) : ''}
      ${data.charts ? generateChartsHTML(data.charts) : ''}
      ${data.summary ? `<div class="summary"><h2>Summary</h2><p>${data.summary}</p></div>` : ''}
    </body>
    </html>
  `
}

/**
 * Generate HTML for metrics section
 * @param {Array} metrics - Metrics data
 * @returns {string} HTML string
 */
function generateMetricsHTML(metrics) {
  return `
    <div class="metrics-section">
      <h2>Key Metrics</h2>
      ${metrics.map(metric => `
        <div class="metric">
          <div class="metric-label">${metric.label}</div>
          <div class="metric-value">${metric.value}</div>
        </div>
      `).join('')}
    </div>
  `
}

/**
 * Generate HTML for issues table
 * @param {Array} issues - Issues data
 * @returns {string} HTML string
 */
function generateIssuesTableHTML(issues) {
  return `
    <div class="issues-section">
      <h2>Issues</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          ${issues.map(issue => `
            <tr>
              <td>#${issue.iid}</td>
              <td>${issue.title}</td>
              <td>${issue.state}</td>
              <td>${issue.assignee?.name || 'Unassigned'}</td>
              <td>${issue.priority || 'Normal'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

/**
 * Generate HTML for charts section
 * @param {Array} charts - Chart data
 * @returns {string} HTML string
 */
function generateChartsHTML(charts) {
  return `
    <div class="charts-section">
      <h2>Charts & Analytics</h2>
      ${charts.map(chart => `
        <div class="chart">
          <h3>${chart.title}</h3>
          <p>${chart.description || ''}</p>
          ${chart.data ? `<pre>${JSON.stringify(chart.data, null, 2)}</pre>` : ''}
        </div>
      `).join('')}
    </div>
  `
}

/**
 * Export report to PDF with sections
 * @param {Object} report - Report data with sections
 * @param {string} filename - Name for the PDF file
 */
export function exportReportToPDF(report, filename = 'report.pdf') {
  const html = generateReportHTML(report)
  generatePDF(html, { filename })
}

/**
 * Generate HTML for report export
 * @param {Object} report - Report data
 * @returns {string} HTML string
 */
function generateReportHTML(report) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 15px; }
        h2 { color: #555; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        h3 { color: #666; margin-top: 20px; }
        .header { margin-bottom: 30px; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        ul { padding-left: 20px; }
        .highlight { background: #ffffcc; padding: 2px 5px; }
        .success { color: #4CAF50; }
        .warning { color: #ff9800; }
        .error { color: #f44336; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${report.title}</h1>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        ${report.author ? `<p><strong>Author:</strong> ${report.author}</p>` : ''}
        ${report.period ? `<p><strong>Period:</strong> ${report.period}</p>` : ''}
      </div>

      ${report.summary ? `
        <div class="section">
          <h2>Executive Summary</h2>
          <p>${report.summary}</p>
        </div>
      ` : ''}

      ${report.sections ? report.sections.map(section => `
        <div class="section">
          <h2>${section.title}</h2>
          ${section.content}
        </div>
      `).join('') : ''}

      ${report.recommendations ? `
        <div class="section">
          <h2>Recommendations</h2>
          <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="footer">
        <p>Generated by GitLab PM Dashboard</p>
      </div>
    </body>
    </html>
  `
}

// ============================================================================
// UNIFIED EXPORT FUNCTIONS
// ============================================================================

/**
 * Export data in specified format
 * @param {Array} data - Data to export
 * @param {string} format - Export format ('csv' or 'pdf')
 * @param {Object} options - Export options
 */
export function exportData(data, format, options = {}) {
  switch (format.toLowerCase()) {
    case 'csv':
      exportToCSV(data, options.columns || [], options.filename || 'export.csv')
      break
    case 'pdf':
      if (options.type === 'report') {
        exportReportToPDF(data, options.filename || 'report.pdf')
      } else if (options.type === 'dashboard') {
        exportDashboardToPDF(data, options.filename || 'dashboard.pdf')
      } else {
        const html = options.html || JSON.stringify(data, null, 2)
        generatePDF(html, options)
      }
      break
    default:
      console.error(`Unsupported export format: ${format}`)
  }
}

/**
 * Check if export format is supported
 * @param {string} format - Export format to check
 * @returns {boolean} True if format is supported
 */
export function isFormatSupported(format) {
  return ['csv', 'pdf'].includes(format.toLowerCase())
}

/**
 * Get available export formats
 * @returns {Array} Array of supported format objects
 */
export function getAvailableFormats() {
  return [
    { value: 'csv', label: 'CSV', description: 'Comma-separated values for spreadsheets' },
    { value: 'pdf', label: 'PDF', description: 'Portable document format for printing' }
  ]
}