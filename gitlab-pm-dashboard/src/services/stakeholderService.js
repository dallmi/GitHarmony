/**
 * Stakeholder Communication Service
 * Manages stakeholder registry, templates, and communication history
 */

const STORAGE_KEYS = {
  STAKEHOLDERS: 'stakeholders',
  COMMUNICATION_HISTORY: 'communication_history',
  TEMPLATES: 'communication_templates'
}

/**
 * Get all stakeholders
 */
export function getStakeholders() {
  const stored = localStorage.getItem(STORAGE_KEYS.STAKEHOLDERS)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save stakeholder
 */
export function saveStakeholder(stakeholder) {
  const stakeholders = getStakeholders()
  const existingIndex = stakeholders.findIndex(s => s.id === stakeholder.id)

  if (existingIndex >= 0) {
    stakeholders[existingIndex] = { ...stakeholders[existingIndex], ...stakeholder }
  } else {
    stakeholders.push({
      id: stakeholder.id || Date.now().toString(),
      name: stakeholder.name,
      role: stakeholder.role,
      email: stakeholder.email,
      frequency: stakeholder.frequency || 'weekly',
      interests: stakeholder.interests || [],
      createdAt: new Date().toISOString()
    })
  }

  localStorage.setItem(STORAGE_KEYS.STAKEHOLDERS, JSON.stringify(stakeholders))
  return stakeholders
}

/**
 * Remove stakeholder
 */
export function removeStakeholder(id) {
  const stakeholders = getStakeholders()
  const filtered = stakeholders.filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEYS.STAKEHOLDERS, JSON.stringify(filtered))
  return filtered
}

/**
 * Get communication history
 */
export function getCommunicationHistory() {
  const stored = localStorage.getItem(STORAGE_KEYS.COMMUNICATION_HISTORY)
  return stored ? JSON.parse(stored) : []
}

/**
 * Log communication
 */
export function logCommunication(communication) {
  const history = getCommunicationHistory()
  history.unshift({
    id: Date.now().toString(),
    stakeholderIds: communication.stakeholderIds || [],
    subject: communication.subject,
    content: communication.content,
    type: communication.type || 'status_update',
    sentAt: new Date().toISOString()
  })

  // Keep only last 100 communications
  const trimmed = history.slice(0, 100)
  localStorage.setItem(STORAGE_KEYS.COMMUNICATION_HISTORY, JSON.stringify(trimmed))
  return trimmed
}

/**
 * Get default communication templates
 */
export function getTemplates() {
  const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES)
  if (stored) return JSON.parse(stored)

  // Default templates
  return [
    {
      id: 'weekly_status',
      name: 'Weekly Status Update',
      subject: 'Project Status Update - Week of {date}',
      body: `Hi {stakeholder_name},

Here's your weekly project status update for {project_name}:

**Overall Health:** {health_score}/100 ({health_label})
**Completion:** {completion_rate}%
**Open Issues:** {open_issues}
**Blockers:** {blockers}

{status_summary}

{upcoming_milestones}

Best regards,
{sender_name}`
    },
    {
      id: 'milestone_complete',
      name: 'Milestone Achievement',
      subject: 'Milestone Achieved: {milestone_name}',
      body: `Hi {stakeholder_name},

Great news! We've successfully completed the {milestone_name} milestone.

**Achievement Highlights:**
- {completed_issues} issues completed
- Delivered on {milestone_date}
- {completion_rate}% completion rate

{next_steps}

Best regards,
{sender_name}`
    },
    {
      id: 'risk_alert',
      name: 'Risk Alert',
      subject: 'Risk Alert: {risk_description}',
      body: `Hi {stakeholder_name},

I wanted to bring to your attention a risk that requires management awareness:

**Risk:** {risk_description}
**Probability:** {risk_probability}
**Impact:** {risk_impact}
**Mitigation Plan:** {risk_mitigation}

Please let me know if you'd like to discuss this further.

Best regards,
{sender_name}`
    },
    {
      id: 'executive_summary',
      name: 'Executive Summary',
      subject: 'Executive Summary - {project_name}',
      body: `Hi {stakeholder_name},

Please find below the executive summary for {project_name}:

**Project Health:** {health_score}/100
**Status:** {health_label}

**Key Metrics:**
- Total Issues: {total_issues}
- Completion Rate: {completion_rate}%
- Active Blockers: {blockers}
- Team Utilization: {team_utilization}%

{ai_summary}

**Action Required:**
{action_items}

Best regards,
{sender_name}`
    }
  ]
}

/**
 * Save custom template
 */
export function saveTemplate(template) {
  const templates = getTemplates()
  const existingIndex = templates.findIndex(t => t.id === template.id)

  if (existingIndex >= 0) {
    templates[existingIndex] = template
  } else {
    templates.push({
      ...template,
      id: template.id || Date.now().toString()
    })
  }

  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates))
  return templates
}

/**
 * Fill template with project data
 */
export function fillTemplate(template, data) {
  let filled = template.body

  // Replace all placeholders
  const replacements = {
    '{stakeholder_name}': data.stakeholderName || 'Stakeholder',
    '{project_name}': data.projectName || 'Project',
    '{date}': new Date().toLocaleDateString(),
    '{health_score}': data.healthScore?.score || 'N/A',
    '{health_label}': data.healthScore?.label || 'Unknown',
    '{completion_rate}': data.stats?.completionRate || '0',
    '{open_issues}': data.stats?.openIssues || '0',
    '{total_issues}': data.stats?.totalIssues || '0',
    '{blockers}': data.stats?.blockers || '0',
    '{team_utilization}': data.teamUtilization || 'N/A',
    '{status_summary}': data.statusSummary || '',
    '{upcoming_milestones}': data.upcomingMilestones || '',
    '{action_items}': data.actionItems || '',
    '{ai_summary}': data.aiSummary || '',
    '{sender_name}': data.senderName || 'Project Manager',
    '{milestone_name}': data.milestoneName || '',
    '{milestone_date}': data.milestoneDate || '',
    '{completed_issues}': data.completedIssues || '0',
    '{next_steps}': data.nextSteps || '',
    '{risk_description}': data.riskDescription || '',
    '{risk_probability}': data.riskProbability || '',
    '{risk_impact}': data.riskImpact || '',
    '{risk_mitigation}': data.riskMitigation || ''
  }

  Object.entries(replacements).forEach(([key, value]) => {
    filled = filled.replace(new RegExp(key, 'g'), value)
  })

  return filled
}
