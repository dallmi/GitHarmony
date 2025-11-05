/**
 * Smart Status Generator Service
 * Generates AI-powered project status summaries using Claude
 */

/**
 * Generate a professional status summary using Claude AI
 * Requires Anthropic API key
 */
export async function generateStatusSummary({
  projectId,
  stats,
  healthScore,
  issues,
  milestones,
  risks,
  apiKey
}) {
  if (!apiKey) {
    throw new Error('Anthropic API key is required. Please configure it in settings.')
  }

  // Build structured prompt with project data
  const prompt = buildStatusPrompt({
    projectId,
    stats,
    healthScore,
    issues,
    milestones,
    risks
  })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.content[0].text
  } catch (error) {
    console.error('Status generation failed:', error)
    throw error
  }
}

/**
 * Build AI prompt with structured project data
 */
function buildStatusPrompt({ projectId, stats, healthScore, issues, milestones, risks }) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Calculate key metrics
  const openIssues = issues.filter(i => i.state === 'opened')
  const closedIssues = issues.filter(i => i.state === 'closed')
  const blockers = openIssues.filter(i =>
    i.labels.some(l => l.toLowerCase().includes('blocker'))
  ).length

  // Get upcoming milestones
  const upcomingMilestones = milestones
    .filter(m => m.state === 'active' && m.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 3)

  // Get active risks
  const activeRisks = (risks || []).filter(r => r.status === 'active')

  const prompt = `You are a professional project manager. Generate a concise executive status summary for the following project.

**Project:** ${projectId}
**Date:** ${today}

**Overall Health Score:** ${healthScore.score}/100 (${healthScore.label})

**Key Metrics:**
- Total Issues: ${stats.totalIssues}
- Open Issues: ${stats.openIssues}
- Closed Issues: ${stats.closedIssues}
- Completion Rate: ${stats.completionRate}%
- Active Blockers: ${blockers}
- Milestones: ${milestones.length} (${milestones.filter(m => m.state === 'active').length} active)
- Active Risks: ${activeRisks.length}

**Health Breakdown:**
- Completion Health: ${healthScore.breakdown.completion}%
- Overdue Health: ${healthScore.breakdown.schedule}%
- Blocker Health: ${healthScore.breakdown.blockers}%
- Risk Health: ${healthScore.breakdown.risk}%

${upcomingMilestones.length > 0 ? `**Upcoming Milestones:**
${upcomingMilestones.map(m => `- ${m.title} (Due: ${new Date(m.due_date).toLocaleDateString()})`).join('\n')}` : ''}

${blockers > 0 ? `⚠️ **Critical:** ${blockers} active blocker(s) require immediate attention.` : ''}

${activeRisks.length > 0 ? `⚠️ **Risks:** ${activeRisks.length} active risk(s) being monitored.` : ''}

Please generate a professional 3-paragraph status summary that includes:
1. **Overall Status:** Current health, progress, and completion rate
2. **Key Achievements:** Recent progress and closed issues
3. **Action Items:** Blockers, risks, and upcoming milestones requiring attention

Keep it concise, executive-friendly, and focus on actionable insights. Use a professional tone suitable for stakeholder communication.`

  return prompt
}

/**
 * Generate a quick status summary without AI (fallback)
 */
export function generateQuickSummary({ projectId, stats, healthScore, issues, milestones, risks }) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const blockers = issues.filter(i =>
    i.state === 'opened' && i.labels.some(l => l.toLowerCase().includes('blocker'))
  ).length

  const activeRisks = (risks || []).filter(r => r.status === 'active').length

  const upcomingMilestones = milestones
    .filter(m => m.state === 'active' && m.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 3)

  let summary = `# Project Status: ${projectId}\n`
  summary += `**Date:** ${today}\n\n`

  summary += `## Overall Status\n`
  summary += `- **Health Score:** ${healthScore.score}/100 (${healthScore.label})\n`
  summary += `- **Completion Rate:** ${stats.completionRate}%\n`
  summary += `- **Open Issues:** ${stats.openIssues} / ${stats.totalIssues}\n`
  summary += `- **Active Blockers:** ${blockers}\n`
  summary += `- **Active Risks:** ${activeRisks}\n\n`

  summary += `## Progress\n`
  summary += `The project has completed ${stats.closedIssues} out of ${stats.totalIssues} issues (${stats.completionRate}%). `

  if (healthScore.score >= 80) {
    summary += `The project is in good health and on track.\n\n`
  } else if (healthScore.score >= 60) {
    summary += `The project has some areas of concern that need attention.\n\n`
  } else {
    summary += `The project requires immediate attention to address critical issues.\n\n`
  }

  if (upcomingMilestones.length > 0) {
    summary += `## Upcoming Milestones\n`
    upcomingMilestones.forEach(m => {
      summary += `- **${m.title}** - Due: ${new Date(m.due_date).toLocaleDateString()}\n`
    })
    summary += `\n`
  }

  if (blockers > 0 || activeRisks > 0) {
    summary += `## Action Required\n`
    if (blockers > 0) {
      summary += `- ⚠️ **${blockers} active blocker(s)** require immediate resolution\n`
    }
    if (activeRisks > 0) {
      summary += `- 🔍 **${activeRisks} active risk(s)** being monitored\n`
    }
  }

  return summary
}
