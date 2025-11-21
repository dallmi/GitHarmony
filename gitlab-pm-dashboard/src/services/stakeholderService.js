/**
 * Stakeholder Communication Service
 * Manages stakeholder registry, templates, and communication history
 */

import { getActiveProjectId } from './storageService'

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
 * Get communication history (all projects)
 */
export function getCommunicationHistory() {
  const stored = localStorage.getItem(STORAGE_KEYS.COMMUNICATION_HISTORY)
  return stored ? JSON.parse(stored) : []
}

/**
 * Get communication history for current project only
 */
export function getCommunicationHistoryForProject(projectId = null) {
  const activeProjectId = projectId || getActiveProjectId()
  const allHistory = getCommunicationHistory()

  // Filter by project ID, fallback to 'default' for legacy data
  return allHistory.filter(comm => {
    const commProjectId = comm.projectId || 'default'
    return commProjectId === activeProjectId || activeProjectId === 'default'
  })
}

/**
 * Communication Types - Essential enterprise categories
 * Minimal, professional design without emoji icons
 */
export const COMMUNICATION_TYPES = {
  EMAIL: { id: 'email', label: 'Email', color: '#3B82F6', icon: '' },
  DECISION: { id: 'decision', label: 'Decision', color: '#059669', icon: '' },
  MEETING_NOTES: { id: 'meeting_notes', label: 'Meeting Notes', color: '#64748B', icon: '' },
  REQUIREMENTS_SIGNOFF: { id: 'requirements_signoff', label: 'Requirements Sign-Off', color: '#10B981', icon: '' },
  INCIDENT: { id: 'incident', label: 'Incident', color: '#DC2626', icon: '' },
  SCOPE_CHANGE: { id: 'scope_change', label: 'Scope Change', color: '#F59E0B', icon: '' },
  PRIORITIZATION: { id: 'prioritization', label: 'Prioritization', color: '#8B5CF6', icon: '' },
  STATUS_UPDATE: { id: 'status_update', label: 'Status Update', color: '#0EA5E9', icon: '' },
  OTHER: { id: 'other', label: 'Other', color: '#6B7280', icon: '' }
}

/**
 * Log communication with enhanced tracking
 */
export function logCommunication(communication) {
  const history = getCommunicationHistory()
  const projectId = getActiveProjectId() || 'default'

  history.unshift({
    id: communication.id || Date.now().toString(),
    projectId, // Add project context
    stakeholderIds: communication.stakeholderIds || [],
    subject: communication.subject,
    content: communication.content,
    type: communication.type || 'status_update',
    sentAt: communication.sentAt || new Date().toISOString(),
    from: communication.from || null,

    // Impact tracking (no cost)
    timeImpact: communication.timeImpact || '', // e.g., "+2 days", "1 week delay"
    originalDate: communication.originalDate || null, // Original commitment date
    newDate: communication.newDate || null, // New commitment date
    rootCause: communication.rootCause || '', // Why the change happened

    // Issue/Epic linking
    linkedIssues: communication.linkedIssues || [], // Array of issue IDs
    linkedEpics: communication.linkedEpics || [], // Array of epic IDs
    affectedTeamMembers: communication.affectedTeamMembers || [],

    // Change chain
    supersedes: communication.supersedes || null, // ID of communication this replaces
    supersededBy: communication.supersededBy || null, // ID of communication that replaces this
    relatedTo: communication.relatedTo || [], // Array of related communication IDs

    // Metadata
    tags: communication.tags || [],
    comments: communication.comments || [],
    attachments: communication.attachments || []
  })

  // Keep only last 200 communications (increased from 100)
  const trimmed = history.slice(0, 200)
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
 * Update existing communication
 */
export function updateCommunication(id, updates) {
  const history = getCommunicationHistory()
  const index = history.findIndex(c => c.id === id)

  if (index >= 0) {
    // Preserve original id, projectId, and creation date, update everything else
    history[index] = {
      ...history[index],
      ...updates,
      id: history[index].id, // Keep original id
      projectId: history[index].projectId, // Keep original projectId
      createdAt: history[index].createdAt || history[index].sentAt // Preserve creation date
    }
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION_HISTORY, JSON.stringify(history))
  }

  return history
}

/**
 * Add comment to communication
 */
export function addCommentToCommunication(commId, commentText) {
  const history = getCommunicationHistory()
  const comm = history.find(c => c.id === commId)

  if (comm) {
    if (!comm.comments) {
      comm.comments = []
    }

    comm.comments.push({
      id: Date.now().toString(),
      text: commentText,
      createdAt: new Date().toISOString()
    })

    localStorage.setItem(STORAGE_KEYS.COMMUNICATION_HISTORY, JSON.stringify(history))
  }

  return history
}

/**
 * Add tags to communication
 */
export function addTagsToCommunication(commId, tags) {
  const history = getCommunicationHistory()
  const comm = history.find(c => c.id === commId)

  if (comm) {
    if (!comm.tags) {
      comm.tags = []
    }

    // Add new tags, avoiding duplicates
    tags.forEach(tag => {
      if (!comm.tags.includes(tag)) {
        comm.tags.push(tag)
      }
    })

    localStorage.setItem(STORAGE_KEYS.COMMUNICATION_HISTORY, JSON.stringify(history))
  }

  return history
}

/**
 * Remove tag from communication
 */
export function removeTagFromCommunication(commId, tag) {
  const history = getCommunicationHistory()
  const comm = history.find(c => c.id === commId)

  if (comm && comm.tags) {
    comm.tags = comm.tags.filter(t => t !== tag)
    localStorage.setItem(STORAGE_KEYS.COMMUNICATION_HISTORY, JSON.stringify(history))
  }

  return history
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
    '{stakeholder_name}': data.stakeholderName || 'all',
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
    // Requirements Sign-Off fields
    documentUrl: decision.documentUrl || '',
    documentVersion: decision.documentVersion || '',
    documentType: decision.documentType || '',
    signOffDate: decision.signOffDate || '',
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

  // Get current project context
  const projectId = getActiveProjectId() || 'default'

  // Create communication record
  const communication = {
    id: Date.now().toString(),
    projectId, // Add project context
    type: 'email',
    source: 'imported',
    from: emailData.from,
    to: emailData.to,
    cc: emailData.cc,
    stakeholderIds: matchedStakeholders,
    subject: emailData.subject,
    content: emailData.body,
    sentAt: emailData.sentDate ? emailData.sentDate.toISOString() : emailData.date.toISOString(), // Use sentDate for timeline, fallback to import date
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

  // Also save email as a document for easy reference
  const emailDocument = {
    id: `email-${communication.id}`,
    filename: `${emailData.subject || 'Untitled Email'}.eml`,
    fileType: 'email/eml',
    fileSize: emailData.body?.length || 0,
    uploadDate: new Date().toISOString(),
    description: `Email from ${emailData.from.name || emailData.from.email}`,
    stakeholderIds: matchedStakeholders,
    linkedEpics: [],
    linkedIssues: [],
    tags: emailData.tags || [],
    version: '1.0',
    status: 'current',
    supersededBy: null,
    storageType: 'metadata',
    base64Content: null,
    externalUrl: null,
    textContent: emailData.body || '',
    communicationId: communication.id, // Link back to the communication
    createdAt: new Date().toISOString()
  }

  saveDocument(emailDocument)

  return communication
}

/**
 * Get communication type metadata
 */
export function getCommunicationType(typeId) {
  return Object.values(COMMUNICATION_TYPES).find(t => t.id === typeId) || COMMUNICATION_TYPES.EMAIL
}

/**
 * Get change chain for a communication
 * Returns array of communications in chronological order showing evolution
 */
export function getChangeChain(communicationId) {
  const history = getCommunicationHistory()
  const chain = []
  const visited = new Set()

  // Find the root (oldest communication in chain)
  let current = history.find(c => c.id === communicationId)
  if (!current) return []

  // Walk backwards to find root
  while (current && current.supersedes && !visited.has(current.id)) {
    visited.add(current.id)
    const parent = history.find(c => c.id === current.supersedes)
    if (parent) {
      current = parent
    } else {
      break
    }
  }

  // Now walk forward from root to build chain
  visited.clear()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    chain.push(current)
    const next = history.find(c => c.supersedes === current.id)
    current = next
  }

  return chain
}

/**
 * Get all communications linked to an issue
 */
export function getCommunicationsByIssue(issueId) {
  const history = getCommunicationHistory()
  return history.filter(c => c.linkedIssues && c.linkedIssues.includes(issueId))
}

/**
 * Get all communications linked to an epic
 */
export function getCommunicationsByEpic(epicId) {
  const history = getCommunicationHistory()
  return history.filter(c => c.linkedEpics && c.linkedEpics.includes(epicId))
}

/**
 * Get scope creep report - all requirement changes and scope additions
 */
export function getScopeCreepReport() {
  const history = getCommunicationHistory()
  return history.filter(c =>
    c.type === 'scope_creep' ||
    c.type === 'requirements_change' ||
    (c.timeImpact && c.timeImpact.trim() !== '')
  ).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
}

/**
 * Get re-prioritization history
 */
export function getReprioritizationHistory() {
  const history = getCommunicationHistory()
  return history.filter(c =>
    c.type === 'reprioritization' ||
    c.type === 'priority_change'
  ).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
}

/**
 * Get all blockers and production issues
 */
export function getBlockersReport() {
  const history = getCommunicationHistory()
  return history.filter(c =>
    c.type === 'technical_blocker' ||
    c.type === 'prod_issue' ||
    c.type === 'pivot_required'
  ).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
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
    c.content?.toLowerCase().includes(lowerQuery) ||
    c.rootCause?.toLowerCase().includes(lowerQuery) ||
    (c.linkedIssues && c.linkedIssues.some(id => id.toLowerCase().includes(lowerQuery)))
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
