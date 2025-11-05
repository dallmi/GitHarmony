/**
 * Stakeholder Communication Service
 * Manages stakeholder registry, templates, and communication history
 */

const STORAGE_KEYS = {
  STAKEHOLDERS: 'stakeholders',
  COMMUNICATION_HISTORY: 'communication_history',
  TEMPLATES: 'communication_templates',
  DECISIONS: 'decisions',
  DOCUMENTS: 'documents'
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
 * Delete communication from history
 */
export function deleteCommunication(id) {
  const history = getCommunicationHistory()
  const filtered = history.filter(c => c.id !== id)
  localStorage.setItem(STORAGE_KEYS.COMMUNICATION_HISTORY, JSON.stringify(filtered))
  return filtered
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

/**
 * ===== DECISIONS MANAGEMENT =====
 */

/**
 * Get all decisions
 */
export function getDecisions() {
  const stored = localStorage.getItem(STORAGE_KEYS.DECISIONS)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save decision
 */
export function saveDecision(decision) {
  const decisions = getDecisions()

  const newDecision = {
    id: decision.id || Date.now().toString(),
    title: decision.title,
    description: decision.description,
    decisionDate: decision.decisionDate || new Date().toISOString(),
    stakeholderIds: decision.stakeholderIds || [],
    linkedEpics: decision.linkedEpics || [],
    linkedIssues: decision.linkedIssues || [],
    status: decision.status || 'active', // active, reversed, superseded
    reversedBy: decision.reversedBy || null,
    reversedDate: decision.reversedDate || null,
    reversedReason: decision.reversedReason || null,
    tags: decision.tags || [],
    approvedBy: decision.approvedBy || [],
    communicationId: decision.communicationId || null, // Link to email/communication
    createdAt: decision.createdAt || new Date().toISOString()
  }

  const existing = decisions.findIndex(d => d.id === newDecision.id)
  if (existing >= 0) {
    decisions[existing] = newDecision
  } else {
    decisions.unshift(newDecision)
  }

  localStorage.setItem(STORAGE_KEYS.DECISIONS, JSON.stringify(decisions))
  return decisions
}

/**
 * Delete decision
 */
export function deleteDecision(id) {
  const decisions = getDecisions()
  const filtered = decisions.filter(d => d.id !== id)
  localStorage.setItem(STORAGE_KEYS.DECISIONS, JSON.stringify(filtered))
  return filtered
}

/**
 * Reverse/supersede a decision
 */
export function reverseDecision(id, reason, newDecisionId = null) {
  const decisions = getDecisions()
  const decision = decisions.find(d => d.id === id)

  if (decision) {
    decision.status = newDecisionId ? 'superseded' : 'reversed'
    decision.reversedDate = new Date().toISOString()
    decision.reversedReason = reason
    decision.reversedBy = newDecisionId

    localStorage.setItem(STORAGE_KEYS.DECISIONS, JSON.stringify(decisions))
  }

  return decisions
}

/**
 * ===== DOCUMENTS MANAGEMENT =====
 */

/**
 * Get all documents
 */
export function getDocuments() {
  const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save document metadata (with optional base64 content for small files)
 */
export function saveDocument(document) {
  const documents = getDocuments()

  const newDocument = {
    id: document.id || Date.now().toString(),
    filename: document.filename,
    fileType: document.fileType,
    fileSize: document.fileSize,
    uploadDate: document.uploadDate || new Date().toISOString(),
    description: document.description || '',
    stakeholderIds: document.stakeholderIds || [],
    linkedEpics: document.linkedEpics || [],
    linkedIssues: document.linkedIssues || [],
    tags: document.tags || [],
    version: document.version || '1.0',
    status: document.status || 'current', // current, superseded, archived
    supersededBy: document.supersededBy || null,
    // Storage options
    storageType: document.storageType || 'metadata', // metadata, base64, external
    base64Content: document.base64Content || null, // For small files
    externalUrl: document.externalUrl || null, // GitLab, Google Drive, etc.
    textContent: document.textContent || '', // Extracted text for search
    communicationId: document.communicationId || null, // Link to email that included this doc
    createdAt: document.createdAt || new Date().toISOString()
  }

  const existing = documents.findIndex(d => d.id === newDocument.id)
  if (existing >= 0) {
    documents[existing] = newDocument
  } else {
    documents.unshift(newDocument)
  }

  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents))
  return documents
}

/**
 * Delete document
 */
export function deleteDocument(id) {
  const documents = getDocuments()
  const filtered = documents.filter(d => d.id !== id)
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered))
  return filtered
}

/**
 * Supersede document with new version
 */
export function supersedeDocument(oldId, newDocumentId) {
  const documents = getDocuments()
  const oldDoc = documents.find(d => d.id === oldId)

  if (oldDoc) {
    oldDoc.status = 'superseded'
    oldDoc.supersededBy = newDocumentId
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents))
  }

  return documents
}

/**
 * Import email as communication with auto-tagging and matching
 */
export function importEmail(emailData, stakeholders) {
  // Match email addresses to stakeholders
  const matchedStakeholders = []
  const allEmails = [...emailData.to, ...emailData.cc].map(e => e.email.toLowerCase())

  stakeholders.forEach(stakeholder => {
    if (allEmails.includes(stakeholder.email.toLowerCase())) {
      matchedStakeholders.push(stakeholder.id)
    }
  })

  // Create communication record
  const communication = {
    id: Date.now().toString(),
    type: 'email',
    source: 'imported',
    from: emailData.from,
    to: emailData.to,
    cc: emailData.cc,
    stakeholderIds: matchedStakeholders,
    subject: emailData.subject,
    content: emailData.body,
    sentAt: emailData.date.toISOString(),
    messageId: emailData.messageId,
    tags: emailData.tags || [],
    references: emailData.references || [],
    linkedEpics: [],
    linkedIssues: [],
    attachments: emailData.attachments || []
  }

  // Save to communication history
  const history = getCommunicationHistory()
  history.unshift(communication)
  const trimmed = history.slice(0, 100)
  localStorage.setItem(STORAGE_KEYS.COMMUNICATION_HISTORY, JSON.stringify(trimmed))

  return communication
}

/**
 * Search across all communications, decisions, and documents
 */
export function searchAll(query) {
  const lowerQuery = query.toLowerCase()
  const results = {
    communications: [],
    decisions: [],
    documents: []
  }

  // Search communications
  const comms = getCommunicationHistory()
  results.communications = comms.filter(c =>
    c.subject?.toLowerCase().includes(lowerQuery) ||
    c.content?.toLowerCase().includes(lowerQuery)
  )

  // Search decisions
  const decisions = getDecisions()
  results.decisions = decisions.filter(d =>
    d.title?.toLowerCase().includes(lowerQuery) ||
    d.description?.toLowerCase().includes(lowerQuery)
  )

  // Search documents
  const docs = getDocuments()
  results.documents = docs.filter(d =>
    d.filename?.toLowerCase().includes(lowerQuery) ||
    d.description?.toLowerCase().includes(lowerQuery) ||
    d.textContent?.toLowerCase().includes(lowerQuery)
  )

  return results
}
