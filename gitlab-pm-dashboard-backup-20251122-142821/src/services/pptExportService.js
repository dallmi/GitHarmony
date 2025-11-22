/**
 * PowerPoint Export Service
 * Generates professional PPTX presentations from dashboard data
 *
 * NOTE: PptxGenJS is loaded from CDN on-demand to reduce bundle size
 * Library (~380KB) only loads when user clicks "Export PPT" button
 */

// Brand Colors
const COLORS = {
  primary: 'E60000',
  white: 'FFFFFF',
  black: '000000',
  gray900: '1F2937',
  gray600: '6B7280',
  gray400: '9CA3AF',
  gray100: 'F3F4F6',
  success: '059669',
  warning: 'D97706',
  danger: 'DC2626',
  info: '2563EB'
}

/**
 * Load PptxGenJS library from CDN
 * Only loads when export is triggered to reduce initial bundle size
 * Uses CDN fallback chain for reliability
 */
async function loadPptxGenJS() {
  console.log('PPT Export: Loading PptxGenJS library from CDN...')

  // Check if already loaded
  if (window.PptxGenJS) {
    console.log('PPT Export: Library already loaded')
    return window.PptxGenJS
  }

  // Try loading from CDN
  const cdnUrls = [
    'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
  ]

  for (const url of cdnUrls) {
    try {
      console.log(`PPT Export: Trying ${url}...`)
      await loadScript(url)

      if (window.PptxGenJS) {
        console.log('PPT Export: Library loaded successfully from CDN')
        return window.PptxGenJS
      }
    } catch (error) {
      console.warn(`PPT Export: Failed to load from ${url}:`, error)
    }
  }

  throw new Error('Failed to load PptxGenJS library from CDN. Please check your internet connection.')
}

/**
 * Dynamically load a script tag
 */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * Export complete project status to PowerPoint
 */
export async function exportToPowerPoint({
  projectId,
  stats,
  healthScore,
  issues,
  milestones,
  risks
}) {
  console.log('PPT Export: Starting export...')

  // Dynamically load PptxGenJS
  const PptxGenJS = await loadPptxGenJS()

  const pptx = new PptxGenJS()
  pptx.author = 'GitLab Project Management Dashboard'
  pptx.company = 'GitLab PM Dashboard'
  pptx.title = `Project Status - ${projectId}`
  pptx.subject = 'Project Status Report'

  // Slide 1: Executive Summary
  addExecutiveSummarySlide(pptx, { projectId, stats, healthScore })

  // Slide 2: Milestones & Roadmap
  addMilestonesSlide(pptx, { milestones, issues })

  // Slide 3: Risks & Blockers
  addRisksSlide(pptx, { issues, risks, stats })

  // Generate and download
  const filename = `Project-Status-${projectId}-${new Date().toISOString().split('T')[0]}.pptx`
  console.log('PPT Export: Saving file:', filename)

  await pptx.writeFile({ fileName: filename })
  console.log('PPT Export: Complete!')

  return filename
}

/**
 * Slide 1: Executive Summary with Health Score
 */
function addExecutiveSummarySlide(pptx, { projectId, stats, healthScore }) {
  const slide = pptx.addSlide()
  slide.background = { color: COLORS.white }

  // Title
  slide.addText('Executive Summary', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.7,
    fontSize: 32,
    bold: true,
    color: COLORS.primary
  })

  // Project ID
  slide.addText(projectId, {
    x: 0.5,
    y: 1.2,
    w: 9,
    h: 0.4,
    fontSize: 18,
    color: COLORS.gray600
  })

  // Date
  slide.addText(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }), {
    x: 0.5,
    y: 1.6,
    w: 9,
    h: 0.3,
    fontSize: 14,
    color: COLORS.gray400
  })

  // Health Score
  const healthColor = healthScore.status === 'green' ? COLORS.success :
                     healthScore.status === 'amber' ? COLORS.warning :
                     COLORS.danger

  slide.addText(`Project Health: ${healthScore.score}%`, {
    x: 0.5,
    y: 2.3,
    w: 4,
    h: 1,
    fontSize: 28,
    bold: true,
    color: healthColor
  })

  slide.addText(healthScore.status.toUpperCase(), {
    x: 0.5,
    y: 3.0,
    w: 4,
    h: 0.5,
    fontSize: 20,
    bold: true,
    color: healthColor
  })

  // Key Metrics Table
  const metricsData = [
    [
      { text: 'Metric', options: { bold: true, fill: { color: COLORS.gray100 } } },
      { text: 'Value', options: { bold: true, fill: { color: COLORS.gray100 } } }
    ],
    ['Total Issues', stats.total.toString()],
    ['Completion Rate', `${stats.completionRate}%`],
    ['Open Issues', stats.open.toString()],
    ['Closed Issues', stats.closed.toString()],
    [
      { text: 'Blockers', options: { color: stats.blockers > 0 ? COLORS.danger : COLORS.black } },
      { text: stats.blockers.toString(), options: { color: stats.blockers > 0 ? COLORS.danger : COLORS.black } }
    ],
    [
      { text: 'At Risk', options: { color: stats.atRisk > 0 ? COLORS.warning : COLORS.black } },
      { text: stats.atRisk.toString(), options: { color: stats.atRisk > 0 ? COLORS.warning : COLORS.black } }
    ],
    [
      { text: 'Overdue', options: { color: stats.overdue > 0 ? COLORS.danger : COLORS.black } },
      { text: stats.overdue.toString(), options: { color: stats.overdue > 0 ? COLORS.danger : COLORS.black } }
    ]
  ]

  slide.addTable(metricsData, {
    x: 5.0,
    y: 2.3,
    w: 4.5,
    h: 3.5,
    fontSize: 14,
    color: COLORS.gray900,
    border: { pt: 1, color: COLORS.gray400 },
    rowH: 0.44
  })

  // Health Breakdown
  slide.addText('Health Breakdown:', {
    x: 0.5,
    y: 4.0,
    w: 4,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: COLORS.gray900
  })

  const breakdownData = [
    ['Dimension', 'Score', 'Weight'],
    ['Completion', `${Math.round(healthScore.breakdown.completionScore)}%`, '30%'],
    ['Overdue', `${Math.round(healthScore.breakdown.scheduleScore)}%`, '25%'],
    ['Blockers', `${Math.round(healthScore.breakdown.blockerScore)}%`, '25%'],
    ['Risk', `${Math.round(healthScore.breakdown.riskScore)}%`, '20%']
  ]

  slide.addTable(breakdownData, {
    x: 0.5,
    y: 4.5,
    w: 4,
    h: 2,
    fontSize: 12,
    color: COLORS.gray900,
    fill: { color: COLORS.gray100 },
    border: { pt: 1, color: COLORS.gray400 }
  })
}

/**
 * Slide 2: Milestones & Roadmap
 */
function addMilestonesSlide(pptx, { milestones, issues }) {
  const slide = pptx.addSlide()
  slide.background = { color: COLORS.white }

  // Title
  slide.addText('Milestones & Roadmap', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.7,
    fontSize: 32,
    bold: true,
    color: COLORS.primary
  })

  if (milestones.length === 0) {
    slide.addText('No milestones defined', {
      x: 0.5,
      y: 2.0,
      w: 9,
      h: 1,
      fontSize: 18,
      color: COLORS.gray600,
      align: 'center'
    })
    return
  }

  // Milestones Table
  const milestoneData = [
    [
      { text: 'Milestone', options: { bold: true, fill: { color: COLORS.gray100 } } },
      { text: 'Progress', options: { bold: true, fill: { color: COLORS.gray100 } } },
      { text: 'Issues', options: { bold: true, fill: { color: COLORS.gray100 } } },
      { text: 'Due Date', options: { bold: true, fill: { color: COLORS.gray100 } } },
      { text: 'Status', options: { bold: true, fill: { color: COLORS.gray100 } } }
    ]
  ]

  milestones.forEach(milestone => {
    const mIssues = issues.filter(i => i.milestone?.id === milestone.id)
    const mTotal = mIssues.length
    const mClosed = mIssues.filter(i => i.state === 'closed').length
    const mProgress = mTotal > 0 ? Math.round((mClosed / mTotal) * 100) : 0

    const progressColor = mProgress >= 80 ? COLORS.success :
                         mProgress >= 60 ? COLORS.warning :
                         COLORS.danger

    milestoneData.push([
      milestone.title,
      { text: `${mProgress}%`, options: { color: progressColor, bold: true } },
      `${mClosed}/${mTotal}`,
      milestone.due_date ? new Date(milestone.due_date).toLocaleDateString('en-US') : 'No date',
      milestone.state
    ])
  })

  slide.addTable(milestoneData, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 4.5,
    fontSize: 13,
    color: COLORS.gray900,
    border: { pt: 1, color: COLORS.gray400 },
    colW: [2.5, 1.2, 1.2, 1.8, 2.3]
  })
}

/**
 * Slide 3: Risks & Blockers
 */
function addRisksSlide(pptx, { issues, risks, stats }) {
  const slide = pptx.addSlide()
  slide.background = { color: COLORS.white }

  // Title
  slide.addText('Risks & Blockers', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.7,
    fontSize: 32,
    bold: true,
    color: COLORS.primary
  })

  // Summary Box
  slide.addText(`Total Blockers: ${stats.blockers} | Active Risks: ${risks.filter(r => r.status === 'open').length}`, {
    x: 0.5,
    y: 1.3,
    w: 9,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: stats.blockers > 0 || risks.filter(r => r.status === 'open').length > 0 ? COLORS.danger : COLORS.success
  })

  // Blockers Section
  const blockers = issues.filter(i =>
    i.state === 'opened' &&
    i.labels &&
    i.labels.some(l => l.toLowerCase().includes('blocker') || l.toLowerCase().includes('blocked'))
  )

  if (blockers.length > 0) {
    slide.addText('Critical Blockers:', {
      x: 0.5,
      y: 2.0,
      w: 9,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: COLORS.gray900
    })

    const blockerData = [
      [
        { text: 'Issue', options: { bold: true, fill: { color: COLORS.gray100 } } },
        { text: 'Title', options: { bold: true, fill: { color: COLORS.gray100 } } },
        { text: 'Assignee', options: { bold: true, fill: { color: COLORS.gray100 } } }
      ]
    ]

    blockers.slice(0, 5).forEach(blocker => {
      blockerData.push([
        `#${blocker.iid}`,
        blocker.title.substring(0, 50) + (blocker.title.length > 50 ? '...' : ''),
        blocker.assignees && blocker.assignees.length > 0 ? blocker.assignees[0].name : 'Unassigned'
      ])
    })

    slide.addTable(blockerData, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 2.0,
      fontSize: 12,
      color: COLORS.gray900,
      border: { pt: 1, color: COLORS.gray400 },
      colW: [1.0, 5.5, 2.5]
    })
  }

  // Risks Section
  const activeRisks = risks.filter(r => r.status === 'open')

  if (activeRisks.length > 0) {
    slide.addText('Active Risks:', {
      x: 0.5,
      y: blockers.length > 0 ? 4.7 : 2.0,
      w: 9,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: COLORS.gray900
    })

    const riskData = [
      [
        { text: 'Risk', options: { bold: true, fill: { color: COLORS.gray100 } } },
        { text: 'Score', options: { bold: true, fill: { color: COLORS.gray100 } } },
        { text: 'Owner', options: { bold: true, fill: { color: COLORS.gray100 } } }
      ]
    ]

    activeRisks.slice(0, 5).forEach(risk => {
      const score = risk.probability * risk.impact
      const scoreColor = score >= 6 ? COLORS.danger : score >= 3 ? COLORS.warning : COLORS.success

      riskData.push([
        risk.title.substring(0, 50) + (risk.title.length > 50 ? '...' : ''),
        { text: score.toString(), options: { color: scoreColor, bold: true } },
        risk.owner || 'Unassigned'
      ])
    })

    slide.addTable(riskData, {
      x: 0.5,
      y: blockers.length > 0 ? 5.2 : 2.5,
      w: 9,
      h: blockers.length > 0 ? 1.5 : 3.5,
      fontSize: 12,
      color: COLORS.gray900,
      border: { pt: 1, color: COLORS.gray400 },
      colW: [6.0, 1.0, 2.0]
    })
  }

  // No risks/blockers message
  if (blockers.length === 0 && activeRisks.length === 0) {
    slide.addText('No active blockers or risks! 🎉', {
      x: 0.5,
      y: 3.0,
      w: 9,
      h: 1,
      fontSize: 20,
      color: COLORS.success,
      align: 'center',
      bold: true
    })
  }
}
