import React, { useState } from 'react'
import {
  getStakeholders,
  saveStakeholder,
  removeStakeholder,
  getCommunicationHistory,
  getCommunicationHistoryForProject,
  logCommunication,
  deleteCommunication,
  updateCommunication,
  addCommentToCommunication,
  addTagsToCommunication,
  removeTagFromCommunication,
  getTemplates,
  saveTemplate,
  fillTemplate,
  getDecisions,
  saveDecision,
  deleteDecision,
  reverseDecision,
  importEmail,
  searchAll,
  COMMUNICATION_TYPES,
  getCommunicationType,
  getChangeChain,
  getCommunicationsByIssue,
  getScopeCreepReport,
  getReprioritizationHistory,
  getBlockersReport
} from '../services/stakeholderService'
import { parseEmlFile, detectEmailTags, extractReferences } from '../utils/emailParser'
import { parseMsgFile, isMsgFile } from '../utils/msgParser'
import { parseHtmlEmail } from '../utils/htmlEmailParser'
import { loadConfig } from '../services/storageService'

/**
 * Communication Hub
 * Manage stakeholders and communication templates
 */
export default function StakeholderHubView({ stats, healthScore }) {
  const [stakeholders, setStakeholders] = useState(getStakeholders())
  const [history, setHistory] = useState(getCommunicationHistoryForProject())
  const [templates, setTemplates] = useState(getTemplates())
  const [decisions, setDecisions] = useState(getDecisions())
  const [activeTab, setActiveTab] = useState('communications') // communications, timeline, decisions, stakeholders, templates
  const [showAddStakeholder, setShowAddStakeholder] = useState(false)
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedStakeholders, setSelectedStakeholders] = useState([])
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({ subject: '', body: '' })
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [parsedEmail, setParsedEmail] = useState(null)
  const [showAddDecision, setShowAddDecision] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [timelineView, setTimelineView] = useState('list') // 'list' or 'gantt'
  const [selectedTimelineItem, setSelectedTimelineItem] = useState(null)
  const [showTimelineDetail, setShowTimelineDetail] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newTag, setNewTag] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // Communication type filter
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedQuarters, setSelectedQuarters] = useState([1, 2, 3, 4]) // Timeline quarter filter
  const [showImpactFields, setShowImpactFields] = useState(false) // Collapsible impact tracking
  const [editingCommunication, setEditingCommunication] = useState(null) // ID of communication being edited
  const [communicationForm, setCommunicationForm] = useState({
    // Core fields (all types)
    type: 'email', // Communication type - selected first
    title: '', // Generic title for non-email types
    description: '', // Generic description for non-email types
    date: new Date().toISOString().slice(0, 16), // When this happened
    documentLink: '', // Link to requirements, Fitnesse, OneDrive docs

    // Email-specific fields
    from: '',
    to: '',
    cc: '',
    subject: '',
    body: '',

    // Meeting-specific fields
    attendees: '', // Comma-separated names
    meetingNotes: '',

    // Sign-off specific fields
    approvers: '', // Comma-separated names (for sign-offs and approvals)
    approvedBy: '', // Comma-separated names (for change requests and requirements changes)
    signOffDate: '',
    requirementsSummary: '',

    // Incident-specific fields
    itoTicketNumber: '', // ITO ticket number (e.g., INC12345)
    itoTicketLink: '', // Full URL to ITO ticket
    severity: 'medium', // low, medium, high, critical
    affectedSystems: '', // Comma-separated list of affected systems
    incidentStatus: 'open', // open, investigating, resolved, closed
    resolution: '', // How the incident was resolved
    resolutionDate: '', // When the incident was resolved

    // Impact tracking (optional for all)
    timeImpact: '',
    originalDate: '',
    newDate: '',
    rootCause: '',
    linkedIssues: '',
    linkedEpics: '',
    supersedes: '' // ID of communication this replaces
  })

  const [stakeholderForm, setStakeholderForm] = useState({
    name: '',
    role: '',
    email: '',
    frequency: 'weekly',
    interests: []
  })

  const [decisionForm, setDecisionForm] = useState({
    title: '',
    description: '',
    decisionDate: new Date().toISOString().split('T')[0], // Default to today in YYYY-MM-DD format
    stakeholderIds: [],
    linkedEpics: [],
    linkedIssues: [],
    tags: [],
    approvedBy: [],
    // Requirements Sign-Off fields
    documentUrl: '',
    documentVersion: '',
    documentType: '',
    signOffDate: ''
  })

  const handleAddStakeholder = () => {
    const updated = saveStakeholder(stakeholderForm)
    setStakeholders(updated)
    setStakeholderForm({ name: '', role: '', email: '', frequency: 'weekly', interests: [] })
    setShowAddStakeholder(false)
  }

  const handleRemoveStakeholder = (id) => {
    if (confirm('Remove this stakeholder?')) {
      const updated = removeStakeholder(id)
      setStakeholders(updated)
    }
  }

  const handleCompose = (template) => {
    setSelectedTemplate(template)
    setTemplateForm({ subject: template.subject, body: template.body })
    setEditingTemplate(null) // Reset editing state in modal
    setShowComposeModal(true)
  }

  const handleSend = () => {
    if (selectedStakeholders.length === 0) {
      alert('Please select at least one stakeholder')
      return
    }

    const config = loadConfig()

    // Get stakeholder name for personalization (use first name if single recipient)
    let stakeholderName = 'all'
    if (selectedStakeholders.length === 1) {
      const stakeholder = stakeholders.find(s => s.id === selectedStakeholders[0])
      if (stakeholder && stakeholder.name) {
        // Extract first name (everything before the first space)
        stakeholderName = stakeholder.name.split(' ')[0]
      }
    }

    const filledContent = fillTemplate(selectedTemplate, {
      stakeholderName,
      projectName: config.projectId || 'Project',
      healthScore,
      stats,
      statusSummary: 'Project is progressing as planned.',
      senderName: 'Project Manager'
    })

    logCommunication({
      stakeholderIds: selectedStakeholders,
      subject: selectedTemplate.subject,
      content: filledContent,
      type: selectedTemplate.id
    })

    setHistory(getCommunicationHistoryForProject())
    setShowComposeModal(false)
    setSelectedStakeholders([])
    alert('Communication logged!')
  }

  const handleDeleteHistory = (id) => {
    if (confirm('Delete this communication from history?')) {
      const updated = deleteCommunication(id)
      setHistory(updated)
    }
  }

  const handleEditCommunication = (comm) => {
    // Populate the form with existing communication data
    setCommunicationForm({
      type: comm.type || 'email',
      title: comm.title || '',
      description: comm.description || '',
      date: comm.sentAt ? new Date(comm.sentAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      documentLink: comm.documentLink || '',
      from: comm.from ? (typeof comm.from === 'string' ? comm.from : comm.from.email) : '',
      to: comm.to ? (Array.isArray(comm.to) ? comm.to.map(t => t.email || t).join(', ') : comm.to) : '',
      cc: comm.cc ? (Array.isArray(comm.cc) ? comm.cc.map(c => c.email || c).join(', ') : comm.cc) : '',
      subject: comm.subject || '',
      body: comm.content || '',
      attendees: comm.attendees || '',
      meetingNotes: comm.meetingNotes || '',
      approvers: comm.approvers || '',
      approvedBy: comm.approvedBy ? (Array.isArray(comm.approvedBy) ? comm.approvedBy.join(', ') : comm.approvedBy) : '',
      signOffDate: comm.signOffDate || '',
      requirementsSummary: comm.requirementsSummary || '',
      itoTicketNumber: comm.itoTicketNumber || '',
      itoTicketLink: comm.itoTicketLink || '',
      severity: comm.severity || 'medium',
      affectedSystems: comm.affectedSystems || '',
      incidentStatus: comm.incidentStatus || 'open',
      resolution: comm.resolution || '',
      resolutionDate: comm.resolutionDate || '',
      timeImpact: comm.timeImpact || '',
      originalDate: comm.originalDate || '',
      newDate: comm.newDate || '',
      rootCause: comm.rootCause || '',
      linkedIssues: comm.linkedIssues ? (Array.isArray(comm.linkedIssues) ? comm.linkedIssues.join(', ') : comm.linkedIssues) : '',
      linkedEpics: comm.linkedEpics ? (Array.isArray(comm.linkedEpics) ? comm.linkedEpics.join(', ') : comm.linkedEpics) : '',
      supersedes: comm.supersedes || ''
    })

    // Set stakeholders if available
    if (comm.stakeholderIds && Array.isArray(comm.stakeholderIds)) {
      setSelectedStakeholders(comm.stakeholderIds)
    }

    // Set editing mode
    setEditingCommunication(comm.id)
    setShowComposeModal(true)
  }

  const handleUpdateCommunication = () => {
    if (!editingCommunication) return

    // Build updated communication object
    const updates = {
      stakeholderIds: selectedStakeholders,
      subject: communicationForm.subject || communicationForm.title,
      content: communicationForm.body || communicationForm.description,
      type: communicationForm.type,
      sentAt: communicationForm.date ? new Date(communicationForm.date).toISOString() : new Date().toISOString(),
      from: communicationForm.from ? { name: '', email: communicationForm.from } : null,
      timeImpact: communicationForm.timeImpact,
      originalDate: communicationForm.originalDate,
      newDate: communicationForm.newDate,
      rootCause: communicationForm.rootCause,
      linkedIssues: communicationForm.linkedIssues ? communicationForm.linkedIssues.split(',').map(s => s.trim()).filter(Boolean) : [],
      linkedEpics: communicationForm.linkedEpics ? communicationForm.linkedEpics.split(',').map(s => s.trim()).filter(Boolean) : [],
      supersedes: communicationForm.supersedes || null
    }

    // Add type-specific fields
    if (communicationForm.type === 'incident') {
      updates.itoTicketNumber = communicationForm.itoTicketNumber
      updates.itoTicketLink = communicationForm.itoTicketLink
      updates.severity = communicationForm.severity
      updates.affectedSystems = communicationForm.affectedSystems
      updates.incidentStatus = communicationForm.incidentStatus
      updates.resolution = communicationForm.resolution
      updates.resolutionDate = communicationForm.resolutionDate
    } else if (communicationForm.type === 'meeting_notes') {
      updates.title = communicationForm.title
      updates.attendees = communicationForm.attendees
      updates.meetingNotes = communicationForm.meetingNotes
    } else if (communicationForm.type === 'requirements_signoff') {
      updates.title = communicationForm.title
      updates.approvers = communicationForm.approvers
      updates.approvedBy = communicationForm.approvedBy ? communicationForm.approvedBy.split(',').map(s => s.trim()).filter(Boolean) : []
      updates.signOffDate = communicationForm.signOffDate
      updates.requirementsSummary = communicationForm.requirementsSummary
    } else if (communicationForm.type === 'scope_change') {
      updates.title = communicationForm.title
      updates.approvedBy = communicationForm.approvedBy ? communicationForm.approvedBy.split(',').map(s => s.trim()).filter(Boolean) : []
    }

    // Update the communication
    const updatedHistory = updateCommunication(editingCommunication, updates)
    setHistory(updatedHistory)

    // Reset form and close modal
    setShowComposeModal(false)
    setEditingCommunication(null)
    setCommunicationForm({
      type: 'email',
      title: '',
      description: '',
      date: new Date().toISOString().slice(0, 16),
      documentLink: '',
      from: '',
      to: '',
      cc: '',
      subject: '',
      body: '',
      attendees: '',
      meetingNotes: '',
      approvers: '',
      approvedBy: '',
      signOffDate: '',
      requirementsSummary: '',
      itoTicketNumber: '',
      itoTicketLink: '',
      severity: 'medium',
      affectedSystems: '',
      incidentStatus: 'open',
      resolution: '',
      resolutionDate: '',
      timeImpact: '',
      originalDate: '',
      newDate: '',
      rootCause: '',
      linkedIssues: '',
      linkedEpics: '',
      supersedes: ''
    })
    setSelectedStakeholders([])
    alert('Communication updated!')
  }

  const handleEditTemplate = (template) => {
    setEditingTemplate(template.id)
    setTemplateForm({ subject: template.subject, body: template.body })
  }

  const handleSaveTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId)
    const updated = saveTemplate({
      ...template,
      subject: templateForm.subject,
      body: templateForm.body
    })
    setTemplates(updated)
    setEditingTemplate(null)
  }

  const handleOpenInEmail = () => {
    if (selectedStakeholders.length === 0) {
      alert('Please select at least one stakeholder')
      return
    }

    const config = loadConfig()

    // Get stakeholder name for personalization (use first name if single recipient)
    let stakeholderName = 'all'
    if (selectedStakeholders.length === 1) {
      const stakeholder = stakeholders.find(s => s.id === selectedStakeholders[0])
      if (stakeholder && stakeholder.name) {
        // Extract first name (everything before the first space)
        stakeholderName = stakeholder.name.split(' ')[0]
      }
    }

    const filledContent = fillTemplate(
      { ...selectedTemplate, subject: templateForm.subject, body: templateForm.body },
      {
        stakeholderName,
        projectName: config.projectId || 'Project',
        healthScore,
        stats,
        statusSummary: 'Project is progressing as planned.',
        senderName: 'Project Manager'
      }
    )

    // Get selected stakeholder emails
    const recipientEmails = stakeholders
      .filter(s => selectedStakeholders.includes(s.id))
      .map(s => s.email)
      .join(',')

    // Create mailto link
    const subject = encodeURIComponent(templateForm.subject)
    const body = encodeURIComponent(filledContent)
    const mailtoLink = `mailto:${recipientEmails}?subject=${subject}&body=${body}`

    // Open in email client
    window.location.href = mailtoLink

    // Log the communication
    logCommunication({
      stakeholderIds: selectedStakeholders,
      subject: templateForm.subject,
      content: filledContent,
      type: selectedTemplate.id
    })

    setHistory(getCommunicationHistoryForProject())
    setShowComposeModal(false)
    setSelectedStakeholders([])
  }

  // Email import handlers
  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragActive(false)

    // Check for HTML data first (Outlook often provides HTML)
    const htmlData = e.dataTransfer.getData('text/html')
    if (htmlData) {
      console.log('Detected HTML data from drag & drop')
      handleHtmlContent(htmlData)
      return
    }

    // Check for plain text data
    const textData = e.dataTransfer.getData('text/plain')
    if (textData) {
      console.log('Detected plain text data from drag & drop')
      handleTextContent(textData)
      return
    }

    // Fall back to file handling
    const file = e.dataTransfer.files[0]
    if (file) {
      console.log('Detected file from drag & drop:', file.name, 'Type:', file.type, 'Size:', file.size)
      handleEmailFile(file)
    } else {
      alert('Unable to process dropped content. Please save the email as a file (.msg, .eml, or .html) and try again.')
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleEmailFile(file)
    }
  }

  const handleEmailFile = (file) => {
    const fileName = file.name.toLowerCase()
    const isMsgFormat = fileName.endsWith('.msg')
    const isHtmlFormat = fileName.endsWith('.html') || fileName.endsWith('.htm')

    console.log('=== File Processing Debug ===')
    console.log('File name:', file.name)
    console.log('File size:', file.size, 'bytes')
    console.log('File type:', file.type)
    console.log('File last modified:', new Date(file.lastModified))
    console.log('Detected format - MSG:', isMsgFormat, 'HTML:', isHtmlFormat)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        console.log('File read successfully, result type:', typeof e.target.result)
        console.log('Result size:', e.target.result?.byteLength || e.target.result?.length || 0)

        let parsed

        if (isMsgFormat) {
          // Parse .msg file (Outlook format)
          const msgBuffer = e.target.result
          console.log('Parsing as MSG format, buffer size:', msgBuffer.byteLength)
          const bufferPreview = new Uint8Array(msgBuffer.slice(0, 16))
          console.log('First 16 bytes:', Array.from(bufferPreview).map(b => b.toString(16).padStart(2, '0')).join(' '))
          parsed = await parseMsgFile(msgBuffer)
        } else if (isHtmlFormat) {
          // Parse .html file (HTML email export from Outlook)
          // Try multiple encodings to handle corporate email systems
          let htmlContent
          const buffer = e.target.result

          // Try to detect encoding from HTML meta tag or BOM
          const encodings = ['UTF-8', 'windows-1252', 'ISO-8859-1', 'UTF-16LE']
          let bestContent = null
          let fewestReplacementChars = Infinity

          for (const encoding of encodings) {
            try {
              const decoder = new TextDecoder(encoding, { fatal: false })
              const decoded = decoder.decode(buffer)
              // Count replacement characters (�)
              const replacementCount = (decoded.match(/�/g) || []).length
              console.log(`Encoding ${encoding}: ${replacementCount} replacement characters`)

              if (replacementCount < fewestReplacementChars) {
                fewestReplacementChars = replacementCount
                bestContent = decoded
              }

              // If we found a perfect decode, use it
              if (replacementCount === 0) {
                break
              }
            } catch (err) {
              console.log(`Encoding ${encoding} failed:`, err.message)
            }
          }

          htmlContent = bestContent || new TextDecoder('UTF-8', { fatal: false }).decode(buffer)
          console.log('Parsing as HTML format, content length:', htmlContent.length)
          console.log('HTML preview (first 500 chars):', htmlContent.substring(0, 500))
          console.log('Best encoding had', fewestReplacementChars, 'replacement characters')
          parsed = parseHtmlEmail(htmlContent)
        } else {
          // Parse .eml file (standard email format)
          const emlContent = e.target.result
          console.log('Parsing as EML format, content length:', emlContent.length)
          console.log('EML preview (first 500 chars):', emlContent.substring(0, 500))
          parsed = parseEmlFile(emlContent)
        }

        console.log('Parsed result:', {
          from: parsed.from,
          to: parsed.to,
          subject: parsed.subject,
          bodyLength: parsed.body?.length || 0,
          bodyPreview: parsed.body?.substring(0, 200) || ''
        })

        const tags = detectEmailTags(parsed.subject, parsed.body)
        const references = extractReferences(parsed.subject, parsed.body)

        setParsedEmail({
          ...parsed,
          tags,
          references,
          attachments: []
        })
        setShowEmailPreview(true)
      } catch (error) {
        console.error('Error parsing email file:', error)
        console.error('Error stack:', error.stack)
        alert('Failed to parse email file: ' + error.message)
      }
    }

    reader.onerror = (error) => {
      console.error('FileReader error:', error)
      alert('Failed to read email file')
    }

    // Read as ArrayBuffer for .msg, as text for .eml and .html
    if (isMsgFormat) {
      console.log('Reading file as ArrayBuffer...')
      reader.readAsArrayBuffer(file)
    } else if (isHtmlFormat) {
      // HTML files might use different encodings (Windows-1252, ISO-8859-1)
      // Read as ArrayBuffer first so we can try different encodings
      console.log('Reading HTML file as ArrayBuffer to detect encoding...')
      reader.readAsArrayBuffer(file)
    } else {
      console.log('Reading file as Text...')
      reader.readAsText(file, 'UTF-8')
    }
  }

  const handleHtmlContent = (htmlContent) => {
    try {
      console.log('Parsing HTML content, length:', htmlContent.length)
      const parsed = parseHtmlEmail(htmlContent)

      const tags = detectEmailTags(parsed.subject, parsed.body)
      const references = extractReferences(parsed.subject, parsed.body)

      setParsedEmail({
        ...parsed,
        tags,
        references,
        attachments: []
      })
      setShowEmailPreview(true)
    } catch (error) {
      console.error('Error parsing HTML content:', error)
      alert('Failed to parse email content: ' + error.message)
    }
  }

  const handleTextContent = (textContent) => {
    try {
      console.log('Parsing text content, length:', textContent.length)
      console.log('Text content preview:', textContent.substring(0, 200))

      // If text is too short, it's likely just a preview/link, not the full email
      if (textContent.length < 100) {
        alert('Dragging directly from Outlook is not supported. Please save the email as a file (.msg, .eml, or .html) first, then drag the file here.')
        return
      }

      // Try to parse as EML format first
      const parsed = parseEmlFile(textContent)

      const tags = detectEmailTags(parsed.subject, parsed.body)
      const references = extractReferences(parsed.subject, parsed.body)

      setParsedEmail({
        ...parsed,
        tags,
        references,
        attachments: []
      })
      setShowEmailPreview(true)
    } catch (error) {
      console.error('Error parsing text content:', error)
      alert('Failed to parse email content. Please save the email as a file (.msg, .eml, or .html) and try again.')
    }
  }

  const handleImportEmail = () => {
    const communication = importEmail(parsedEmail, stakeholders)
    setHistory(getCommunicationHistoryForProject())
    setShowEmailPreview(false)
    setParsedEmail(null)
    alert('Email imported successfully!')
  }

  const handleCommunicationSubmit = () => {
    // Helper: Parse email addresses from string
    const parseAddresses = (str) => {
      if (!str) return []
      return str.split(/[;,]/).map(addr => {
        const trimmed = addr.trim()
        const match = trimmed.match(/(.*?)<(.+?)>/)
        if (match) {
          return { name: match[1].trim(), email: match[2].trim() }
        }
        return { name: '', email: trimmed }
      }).filter(a => a.email)
    }

    // Parse linked issues and epics (comma-separated)
    const linkedIssues = communicationForm.linkedIssues
      ? communicationForm.linkedIssues.split(',').map(i => i.trim()).filter(i => i)
      : []
    const linkedEpics = communicationForm.linkedEpics
      ? communicationForm.linkedEpics.split(',').map(e => e.trim()).filter(e => e)
      : []

    // Build communication object based on type
    const communication = {
      type: communicationForm.type || 'email',
      sentAt: new Date(communicationForm.date).toISOString(),
      attachments: communicationForm.documentLink ? [{ url: communicationForm.documentLink, type: 'link' }] : [],
      timeImpact: communicationForm.timeImpact || '',
      originalDate: communicationForm.originalDate || null,
      newDate: communicationForm.newDate || null,
      rootCause: communicationForm.rootCause || '',
      linkedIssues,
      linkedEpics,
      supersedes: communicationForm.supersedes || null,
      tags: [],
      comments: []
    }

    // Type-specific fields
    if (communicationForm.type === 'email' || communicationForm.type === 'status_update') {
      // Email-specific
      const fromAddr = parseAddresses(communicationForm.from)[0] || { name: '', email: communicationForm.from }
      const toAddrs = parseAddresses(communicationForm.to)
      const ccAddrs = parseAddresses(communicationForm.cc)

      // Match stakeholders
      const matchedStakeholders = []
      const allEmails = [...toAddrs, ...ccAddrs].map(a => a.email.toLowerCase())
      stakeholders.forEach(s => {
        if (allEmails.includes(s.email.toLowerCase())) {
          matchedStakeholders.push(s.id)
        }
      })

      communication.subject = communicationForm.subject
      communication.content = communicationForm.body
      communication.from = `${fromAddr.name} <${fromAddr.email}>`.trim()
      communication.stakeholderIds = matchedStakeholders
    } else if (communicationForm.type === 'meeting_notes') {
      // Meeting-specific
      communication.subject = communicationForm.title
      communication.content = `Attendees: ${communicationForm.attendees}\n\n${communicationForm.meetingNotes}`
      communication.stakeholderIds = []
      // Store fields separately for easy editing
      communication.title = communicationForm.title
      communication.attendees = communicationForm.attendees
      communication.meetingNotes = communicationForm.meetingNotes
    } else if (communicationForm.type === 'requirements_signoff') {
      // Sign-off specific
      communication.subject = communicationForm.title
      communication.content = `Approvers: ${communicationForm.approvers}\n\n${communicationForm.requirementsSummary}`
      communication.stakeholderIds = []
      // Store fields separately for easy editing
      communication.title = communicationForm.title
      communication.approvers = communicationForm.approvers
      communication.approvedBy = communicationForm.approvedBy ? communicationForm.approvedBy.split(',').map(s => s.trim()).filter(Boolean) : []
      communication.signOffDate = communicationForm.signOffDate
      communication.requirementsSummary = communicationForm.requirementsSummary
    } else if (communicationForm.type === 'scope_change') {
      // Scope change with optional approval
      communication.subject = communicationForm.title
      communication.content = communicationForm.approvedBy
        ? `Approved By: ${communicationForm.approvedBy}\n\n${communicationForm.description}`
        : communicationForm.description
      communication.stakeholderIds = []
      // Store fields separately for easy editing
      communication.title = communicationForm.title
      communication.description = communicationForm.description
      communication.approvedBy = communicationForm.approvedBy ? communicationForm.approvedBy.split(',').map(s => s.trim()).filter(Boolean) : []
    } else if (communicationForm.type === 'prioritization') {
      // Prioritization with optional decision maker
      communication.subject = communicationForm.title
      communication.content = communicationForm.approvedBy
        ? `Decided By: ${communicationForm.approvedBy}\n\n${communicationForm.description}`
        : communicationForm.description
      communication.stakeholderIds = []
      // Store fields separately for easy editing
      communication.title = communicationForm.title
      communication.description = communicationForm.description
      communication.approvedBy = communicationForm.approvedBy ? communicationForm.approvedBy.split(',').map(s => s.trim()).filter(Boolean) : []
    } else if (communicationForm.type === 'incident') {
      // Incident-specific with ITO ticket info
      communication.subject = communicationForm.title
      let incidentContent = `Severity: ${communicationForm.severity}\n`
      incidentContent += `Status: ${communicationForm.incidentStatus}\n`
      if (communicationForm.itoTicketNumber) {
        incidentContent += `ITO Ticket: ${communicationForm.itoTicketNumber}\n`
      }
      if (communicationForm.itoTicketLink) {
        incidentContent += `ITO Link: ${communicationForm.itoTicketLink}\n`
      }
      if (communicationForm.affectedSystems) {
        incidentContent += `Affected Systems: ${communicationForm.affectedSystems}\n`
      }
      if (communicationForm.resolutionDate) {
        const resDate = new Date(communicationForm.resolutionDate)
        const incDate = new Date(communicationForm.date)
        const durationMs = resDate - incDate
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))
        incidentContent += `Resolution Date: ${resDate.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`
        incidentContent += `Time to Resolution: ${durationDays} day${durationDays !== 1 ? 's' : ''}\n`
      }
      incidentContent += `\nDescription:\n${communicationForm.description}`
      if (communicationForm.resolution) {
        incidentContent += `\n\nResolution:\n${communicationForm.resolution}`
      }
      communication.content = incidentContent
      communication.stakeholderIds = []
      // Store incident fields separately for easy editing
      communication.itoTicketNumber = communicationForm.itoTicketNumber
      communication.itoTicketLink = communicationForm.itoTicketLink
      communication.severity = communicationForm.severity
      communication.affectedSystems = communicationForm.affectedSystems
      communication.incidentStatus = communicationForm.incidentStatus
      communication.resolution = communicationForm.resolution
      communication.resolutionDate = communicationForm.resolutionDate
      communication.description = communicationForm.description
    } else {
      // Generic for all other types
      communication.subject = communicationForm.title
      communication.content = communicationForm.description
      communication.stakeholderIds = []
    }

    // Check if we're editing or creating
    if (editingCommunication) {
      // Update existing communication
      const updatedHistory = updateCommunication(editingCommunication, communication)
      setHistory(updatedHistory)
      setEditingCommunication(null)
      alert('Communication updated successfully!')
    } else {
      // Create new communication
      logCommunication(communication)
      setHistory(getCommunicationHistoryForProject())
      alert('Communication added successfully!')
    }

    // Reset form
    setCommunicationForm({
      type: 'email',
      title: '',
      description: '',
      date: new Date().toISOString().slice(0, 16),
      documentLink: '',
      from: '',
      to: '',
      cc: '',
      subject: '',
      body: '',
      attendees: '',
      meetingNotes: '',
      approvers: '',
      approvedBy: '',
      signOffDate: '',
      requirementsSummary: '',
      itoTicketNumber: '',
      itoTicketLink: '',
      severity: 'medium',
      affectedSystems: '',
      incidentStatus: 'open',
      resolution: '',
      resolutionDate: '',
      timeImpact: '',
      originalDate: '',
      newDate: '',
      rootCause: '',
      linkedIssues: '',
      linkedEpics: '',
      supersedes: ''
    })
  }

  // Timeline quarter selection handler (same as Epic Management)
  const handleTimelineQuarterToggle = (quarter, event) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey

    if (!isCtrlPressed) {
      // Without Ctrl: replace selection with just this quarter
      setSelectedQuarters([quarter])
    } else {
      // With Ctrl: multi-select behavior
      if (selectedQuarters.includes(quarter)) {
        // Clicking an already selected quarter: shrink selection
        if (selectedQuarters.length === 1) return // Don't deselect the last one

        // Remove from start or end to maintain consecutiveness
        if (quarter === Math.min(...selectedQuarters)) {
          setSelectedQuarters(selectedQuarters.filter(q => q !== quarter))
        } else if (quarter === Math.max(...selectedQuarters)) {
          setSelectedQuarters(selectedQuarters.filter(q => q !== quarter))
        }
      } else {
        // Add to selection maintaining consecutiveness
        const newQuarters = [...selectedQuarters, quarter].sort((a, b) => a - b)
        // Fill gaps to ensure consecutive quarters
        const min = Math.min(...newQuarters)
        const max = Math.max(...newQuarters)
        const consecutive = []
        for (let q = min; q <= max; q++) {
          consecutive.push(q)
        }
        setSelectedQuarters(consecutive)
      }
    }
  }

  const handleTimelineFullYearToggle = () => {
    setSelectedQuarters([1, 2, 3, 4])
  }

  // Removed auto-detection - users will manually copy-paste each field for reliability

  // Decision handlers
  const handleAddDecision = () => {
    const updated = saveDecision(decisionForm)
    setDecisions(updated)
    setDecisionForm({
      title: '',
      description: '',
      decisionDate: new Date().toISOString().split('T')[0],
      stakeholderIds: [],
      linkedEpics: [],
      linkedIssues: [],
      tags: [],
      approvedBy: [],
      documentUrl: '',
      documentVersion: '',
      documentType: '',
      signOffDate: ''
    })
    setShowAddDecision(false)
  }

  const handleDeleteDecision = (id) => {
    if (confirm('Delete this decision?')) {
      const updated = deleteDecision(id)
      setDecisions(updated)
    }
  }

  const handleReverseDecision = (id) => {
    const reason = prompt('Reason for reversing this decision:')
    if (reason) {
      const updated = reverseDecision(id, reason)
      setDecisions(updated)
    }
  }

  const handleAddComment = (commId) => {
    if (newComment.trim()) {
      addCommentToCommunication(commId, newComment.trim())
      setHistory(getCommunicationHistoryForProject())
      setNewComment('')
      // Update selected timeline item if it's currently displayed
      if (selectedTimelineItem && selectedTimelineItem.data.id === commId) {
        const updatedHistory = getCommunicationHistoryForProject()
        const updatedComm = updatedHistory.find(c => c.id === commId)
        if (updatedComm) {
          setSelectedTimelineItem({
            ...selectedTimelineItem,
            data: updatedComm
          })
        }
      }
    }
  }

  const handleAddTag = (commId) => {
    if (newTag.trim()) {
      addTagsToCommunication(commId, [newTag.trim()])
      setHistory(getCommunicationHistoryForProject())
      setNewTag('')
      // Update selected timeline item if it's currently displayed
      if (selectedTimelineItem && selectedTimelineItem.data.id === commId) {
        const updatedHistory = getCommunicationHistoryForProject()
        const updatedComm = updatedHistory.find(c => c.id === commId)
        if (updatedComm) {
          setSelectedTimelineItem({
            ...selectedTimelineItem,
            data: updatedComm
          })
        }
      }
    }
  }

  const handleRemoveTag = (commId, tag) => {
    removeTagFromCommunication(commId, tag)
    setHistory(getCommunicationHistoryForProject())
    setDocuments(getDocuments())
    // Update selected timeline item if it's currently displayed
    if (selectedTimelineItem && selectedTimelineItem.data.id === commId) {
      const updatedHistory = getCommunicationHistoryForProject()
      const updatedComm = updatedHistory.find(c => c.id === commId)
      if (updatedComm) {
        setSelectedTimelineItem({
          ...selectedTimelineItem,
          data: updatedComm
        })
      }
    }
  }

  // Calculate timeline statistics (always show all items in date range, regardless of type filter)
  const getTimelineStats = () => {
    // Calculate date range based on selected quarters
    const minQuarter = Math.min(...selectedQuarters)
    const maxQuarter = Math.max(...selectedQuarters)
    const startDate = new Date(selectedYear, (minQuarter - 1) * 3, 1)
    const endDate = new Date(selectedYear, maxQuarter * 3, 0, 23, 59, 59)

    // Filter by date range only (not by type)
    const commsInRange = history.filter(comm => {
      const date = new Date(comm.sentAt)
      return date >= startDate && date <= endDate
    })

    const decisionsInRange = decisions.filter(dec => {
      const date = new Date(dec.decisionDate)
      return date >= startDate && date <= endDate
    })

    const stats = {
      total: commsInRange.length + decisionsInRange.length,
      communications: commsInRange.length,
      decisions: decisionsInRange.length,
      incidents: commsInRange.filter(c => c.type === 'incident').length,
      signoffs: commsInRange.filter(c => c.type === 'requirements_signoff').length,
      scopeChanges: commsInRange.filter(c => c.type === 'scope_change').length,
      meetings: commsInRange.filter(c => c.type === 'meeting_notes').length
    }
    return stats
  }

  // Get all timeline items
  const getTimelineItems = () => {
    const items = []

    // Add communications
    history.forEach(comm => {
      // Handle comm.from being either a string or an object
      let creatorName = 'Unknown'
      if (comm.from) {
        if (typeof comm.from === 'object') {
          creatorName = comm.from.name || comm.from.email || 'Unknown'
        } else {
          creatorName = comm.from
        }
      }

      // Get communication type metadata for color/icon
      const commType = getCommunicationType(comm.type)

      items.push({
        type: 'communication',
        commType: commType, // Store type metadata
        date: new Date(comm.sentAt),
        title: comm.subject,
        description: comm.content?.substring(0, 150),
        creator: creatorName,
        data: comm
      })
    })

    // Add decisions
    decisions.forEach(dec => {
      items.push({
        type: 'decision',
        date: new Date(dec.decisionDate),
        title: dec.title,
        description: dec.description?.substring(0, 150),
        data: dec
      })
    })

    // Calculate date range based on selected quarters
    const minQuarter = Math.min(...selectedQuarters)
    const maxQuarter = Math.max(...selectedQuarters)
    const startDate = new Date(selectedYear, (minQuarter - 1) * 3, 1) // First day of first selected quarter
    const endDate = new Date(selectedYear, maxQuarter * 3, 0, 23, 59, 59) // Last day of last selected quarter

    // Filter by date range
    let filteredItems = items.filter(item => {
      const itemDate = item.date
      return itemDate >= startDate && itemDate <= endDate
    })

    // Filter by communication type
    if (typeFilter !== 'all') {
      filteredItems = filteredItems.filter(item => {
        if (typeFilter === 'decision') {
          return item.type === 'decision'
        } else {
          return item.type === 'communication' && item.data.type === typeFilter
        }
      })
    }

    // Enhanced search filter - search across multiple fields
    if (tagFilter) {
      const searchLower = tagFilter.toLowerCase()
      filteredItems = filteredItems.filter(item => {
        // Search in tags
        const tags = item.data.tags || []
        if (tags.some(tag => tag.toLowerCase().includes(searchLower))) {
          return true
        }

        // Search in title/subject
        if (item.title && item.title.toLowerCase().includes(searchLower)) {
          return true
        }

        // Search in description/content/body
        if (item.data.content && item.data.content.toLowerCase().includes(searchLower)) {
          return true
        }
        if (item.data.description && item.data.description.toLowerCase().includes(searchLower)) {
          return true
        }
        if (item.data.body && item.data.body.toLowerCase().includes(searchLower)) {
          return true
        }

        // Search in creator/from field
        if (item.creator && item.creator.toLowerCase().includes(searchLower)) {
          return true
        }

        // Search in filename for documents
        if (item.data.filename && item.data.filename.toLowerCase().includes(searchLower)) {
          return true
        }

        return false
      })
    }

    // Sort by date descending
    return filteredItems.sort((a, b) => b.date - a.date)
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Communication Hub
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Track communications, decisions, and stakeholder engagement
        </p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #E5E7EB', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { id: 'communications', label: 'Communications' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'decisions', label: 'Decisions' },
            { id: 'stakeholders', label: 'Stakeholders' },
            { id: 'templates', label: 'Templates' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #E60000' : '2px solid transparent',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab === tab.id ? '#E60000' : '#6B7280',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stakeholders Tab */}
      {activeTab === 'stakeholders' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Stakeholder Registry</h2>
            <button className="btn btn-primary" onClick={() => setShowAddStakeholder(!showAddStakeholder)}>
              {showAddStakeholder ? 'Cancel' : '+ Add Stakeholder'}
            </button>
          </div>

          {showAddStakeholder && (
            <div className="card" style={{ marginBottom: '20px', background: '#F9FAFB' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input
                  type="text"
                  placeholder="Name *"
                  value={stakeholderForm.name}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, name: e.target.value })}
                  style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  placeholder="Role *"
                  value={stakeholderForm.role}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, role: e.target.value })}
                  style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={stakeholderForm.email}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, email: e.target.value })}
                  style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
                <select
                  value={stakeholderForm.frequency}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, frequency: e.target.value })}
                  style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                >
                  <option value="daily">Daily Updates</option>
                  <option value="weekly">Weekly Updates</option>
                  <option value="biweekly">Bi-weekly Updates</option>
                  <option value="monthly">Monthly Updates</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleAddStakeholder} style={{ marginTop: '16px' }}>
                Add Stakeholder
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {stakeholders.map((stakeholder) => (
              <div key={stakeholder.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{stakeholder.name}</h3>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>{stakeholder.role}</div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleRemoveStakeholder(stakeholder.id)}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    Remove
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                  📧 {stakeholder.email}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Frequency: {stakeholder.frequency}
                </div>
              </div>
            ))}
          </div>

          {stakeholders.length === 0 && !showAddStakeholder && (
            <div className="card text-center" style={{ padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>👥</div>
              <h3>No Stakeholders Yet</h3>
              <p className="text-muted">Add stakeholders to track communications</p>
            </div>
          )}
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Communication Templates</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {templates.map((template) => (
              <div key={template.id} className="card">
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{template.name}</h3>

                {editingTemplate === template.id ? (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                        Subject:
                      </label>
                      <input
                        type="text"
                        value={templateForm.subject}
                        onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                        Body:
                      </label>
                      <textarea
                        value={templateForm.body}
                        onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                        rows={10}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSaveTemplate(template.id)}
                        style={{ flex: 1 }}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditingTemplate(null)}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                      Subject: {template.subject}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      background: '#F3F4F6',
                      padding: '12px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      maxHeight: '120px',
                      overflow: 'hidden',
                      marginBottom: '12px'
                    }}>
                      {template.body.substring(0, 150)}...
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleCompose(template)}
                        style={{ flex: 1 }}
                      >
                        Use Template
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleEditTemplate(template)}
                        style={{ flex: 1 }}
                      >
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Communications Tab */}
      {activeTab === 'communications' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Log Communication</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>Track emails, meetings, sign-offs, scope changes, and other important communications</p>
          </div>

          {/* Communication Entry Form */}
          <div style={{ marginBottom: '20px' }}>
            <div className="card" style={{ marginBottom: '20px', background: '#F9FAFB' }}>

              {/* STEP 1: Communication Type Selection - Subtle */}
              <div style={{ marginBottom: '24px', padding: '14px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '8px' }}>
                  Step 1: Communication Type
                </label>
                <select
                  value={communicationForm.type}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {Object.values(COMMUNICATION_TYPES).map(type => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* STEP 2: Type-Specific Fields */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '14px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '12px' }}>
                  Step 2: Communication Details
                </label>

                {/* EMAIL - Show full email fields */}
                {communicationForm.type === 'email' && (
                  <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                            From:
                          </label>
                          <input
                            type="text"
                            placeholder="John Doe <john.doe@company.com>"
                            value={communicationForm.from}
                            onChange={(e) => setCommunicationForm({ ...communicationForm, from: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                            To: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(semicolon-separated)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="jane@company.com; bob@company.com"
                            value={communicationForm.to}
                            onChange={(e) => setCommunicationForm({ ...communicationForm, to: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                            Cc: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="manager@company.com"
                            value={communicationForm.cc}
                            onChange={(e) => setCommunicationForm({ ...communicationForm, cc: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                            Subject:
                          </label>
                          <input
                            type="text"
                            placeholder="Project Status Update"
                            value={communicationForm.subject}
                            onChange={(e) => setCommunicationForm({ ...communicationForm, subject: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                            Date:
                          </label>
                          <input
                            type="datetime-local"
                            value={communicationForm.date}
                            onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                            style={{
                              maxWidth: '300px',
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                            Email Body:
                          </label>
                          <textarea
                            placeholder="Paste email content here..."
                            value={communicationForm.body}
                            onChange={(e) => setCommunicationForm({ ...communicationForm, body: e.target.value })}
                            rows={6}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>
                  </>
                )}

                {/* MEETING NOTES - Show meeting-specific fields */}
                {communicationForm.type === 'meeting_notes' && (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Meeting Title:
                      </label>
                      <input
                        type="text"
                        placeholder="Weekly Project Sync"
                        value={communicationForm.title}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Meeting Date:
                      </label>
                      <input
                        type="datetime-local"
                        value={communicationForm.date}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                        style={{
                          maxWidth: '300px',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Attendees: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(comma-separated)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe, Jane Smith, Bob Wilson"
                        value={communicationForm.attendees}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, attendees: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Meeting Notes:
                      </label>
                      <textarea
                        placeholder="Key discussion points, decisions made, action items..."
                        value={communicationForm.meetingNotes}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, meetingNotes: e.target.value })}
                        rows={6}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </>
                )}

                {/* REQUIREMENTS SIGN-OFF - Show sign-off specific fields */}
                {communicationForm.type === 'requirements_signoff' && (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Title:
                      </label>
                      <input
                        type="text"
                        placeholder="Q4 Requirements Sign-Off"
                        value={communicationForm.title}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Sign-Off Date:
                      </label>
                      <input
                        type="datetime-local"
                        value={communicationForm.signOffDate || communicationForm.date}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, signOffDate: e.target.value, date: e.target.value })}
                        style={{
                          maxWidth: '300px',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Approvers: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(comma-separated)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Jane Smith, Product Owner Bob"
                        value={communicationForm.approvers}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, approvers: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Requirements Summary:
                      </label>
                      <textarea
                        placeholder="Summary of what was approved..."
                        value={communicationForm.requirementsSummary}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, requirementsSummary: e.target.value })}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </>
                )}

                {/* SCOPE CHANGE - Show title/description with Approved By field */}
                {communicationForm.type === 'scope_change' && (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Title:
                      </label>
                      <input
                        type="text"
                        placeholder="Brief title for this change"
                        value={communicationForm.title}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Date:
                      </label>
                      <input
                        type="datetime-local"
                        value={communicationForm.date}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                        style={{
                          maxWidth: '300px',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Approved By: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(comma-separated, optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Product Owner, Tech Lead"
                        value={communicationForm.approvedBy}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, approvedBy: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Description:
                      </label>
                      <textarea
                        placeholder="Provide details about this change..."
                        value={communicationForm.description}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, description: e.target.value })}
                        rows={5}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </>
                )}

                {/* INCIDENT TYPE - Show incident-specific fields with ITO ticket link */}
                {communicationForm.type === 'incident' && (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Incident Title:
                      </label>
                      <input
                        type="text"
                        placeholder="Brief description of the incident"
                        value={communicationForm.title}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Date/Time:
                      </label>
                      <input
                        type="datetime-local"
                        value={communicationForm.date}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                        style={{
                          maxWidth: '300px',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          ITO Ticket Number:
                        </label>
                        <input
                          type="text"
                          placeholder="INC12345"
                          value={communicationForm.itoTicketNumber}
                          onChange={(e) => setCommunicationForm({ ...communicationForm, itoTicketNumber: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Severity:
                        </label>
                        <select
                          value={communicationForm.severity}
                          onChange={(e) => setCommunicationForm({ ...communicationForm, severity: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        ITO Ticket Link:
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={communicationForm.itoTicketLink}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, itoTicketLink: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Resolution Date: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(optional)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={communicationForm.resolutionDate || ''}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, resolutionDate: e.target.value })}
                        style={{
                          maxWidth: '300px',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Status:
                        </label>
                        <select
                          value={communicationForm.incidentStatus}
                          onChange={(e) => setCommunicationForm({ ...communicationForm, incidentStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        >
                          <option value="open">Open</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Affected Systems: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(comma-separated)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="System A, System B"
                          value={communicationForm.affectedSystems}
                          onChange={(e) => setCommunicationForm({ ...communicationForm, affectedSystems: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Incident Description:
                      </label>
                      <textarea
                        placeholder="Detailed description of the incident..."
                        value={communicationForm.description}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, description: e.target.value })}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Resolution: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(if resolved)</span>
                      </label>
                      <textarea
                        placeholder="How was the incident resolved..."
                        value={communicationForm.resolution}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, resolution: e.target.value })}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </>
                )}

                {/* PRIORITIZATION - Show prioritization-specific fields */}
                {communicationForm.type === 'prioritization' && (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Title:
                      </label>
                      <input
                        type="text"
                        placeholder="Brief title for this prioritization change"
                        value={communicationForm.title}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Date:
                      </label>
                      <input
                        type="datetime-local"
                        value={communicationForm.date}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                        style={{
                          maxWidth: '300px',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Decided By: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(comma-separated, optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Product Owner, Steering Committee"
                        value={communicationForm.approvedBy}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, approvedBy: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Description:
                      </label>
                      <textarea
                        placeholder="Describe the prioritization change and rationale..."
                        value={communicationForm.description}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, description: e.target.value })}
                        rows={5}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </>
                )}

                {/* ALL OTHER TYPES (Meeting Notes, Other) - Show generic title/description fields */}
                {!['email', 'requirements_signoff', 'scope_change', 'incident', 'prioritization'].includes(communicationForm.type) && (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Title:
                      </label>
                      <input
                        type="text"
                        placeholder="Brief title for this communication"
                        value={communicationForm.title}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Date:
                      </label>
                      <input
                        type="datetime-local"
                        value={communicationForm.date}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                        style={{
                          maxWidth: '300px',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Description:
                      </label>
                      <textarea
                        placeholder="Provide details about this communication..."
                        value={communicationForm.description}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, description: e.target.value })}
                        rows={5}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Document Link - Common for all types */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Document Link: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(requirements, Fitnesse, OneDrive, optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={communicationForm.documentLink}
                    onChange={(e) => setCommunicationForm({ ...communicationForm, documentLink: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {/* STEP 3: Optional Impact Tracking Section */}
              <div style={{ marginBottom: '24px' }}>
                <button
                  onClick={() => setShowImpactFields(!showImpactFields)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left'
                  }}
                >
                  <span>Step 3 (Optional): Impact Tracking & Issue Linking</span>
                  <span style={{ fontSize: '14px' }}>{showImpactFields ? '▲' : '▼'}</span>
                </button>

                {showImpactFields && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#FEF3C7', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Time Impact: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(e.g., "+2 days", "1 week delay")</span>
                      </label>
                      <input
                        type="text"
                        placeholder="+3 days, 2 weeks delay, etc."
                        value={communicationForm.timeImpact}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, timeImpact: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Original Date:
                        </label>
                        <input
                          type="date"
                          value={communicationForm.originalDate}
                          onChange={(e) => setCommunicationForm({ ...communicationForm, originalDate: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          New Date:
                        </label>
                        <input
                          type="date"
                          value={communicationForm.newDate}
                          onChange={(e) => setCommunicationForm({ ...communicationForm, newDate: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Root Cause: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(why did this happen?)</span>
                      </label>
                      <textarea
                        placeholder="e.g., PROD data showed unexpected values, requirement was ambiguous..."
                        value={communicationForm.rootCause}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, rootCause: e.target.value })}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Linked Issues: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(IDs)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="123, 456, 789"
                          value={communicationForm.linkedIssues}
                          onChange={(e) => setCommunicationForm({ ...communicationForm, linkedIssues: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Linked Epics: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(IDs)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="&10, &20"
                          value={communicationForm.linkedEpics}
                          onChange={(e) => setCommunicationForm({ ...communicationForm, linkedEpics: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '0' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                        Supersedes: <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(ID of previous communication)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Communication ID"
                        value={communicationForm.supersedes}
                        onChange={(e) => setCommunicationForm({ ...communicationForm, supersedes: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCommunicationSubmit}
                  style={{ flex: 1 }}
                >
                  {editingCommunication ? 'Update Communication' : 'Add Communication'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setCommunicationForm({
                      type: 'email',
                      title: '',
                      description: '',
                      date: new Date().toISOString().slice(0, 16),
                      documentLink: '',
                      from: '',
                      to: '',
                      cc: '',
                      subject: '',
                      body: '',
                      attendees: '',
                      meetingNotes: '',
                      approvers: '',
                      approvedBy: '',
                      signOffDate: '',
                      requirementsSummary: '',
                      itoTicketNumber: '',
                      itoTicketLink: '',
                      severity: 'medium',
                      affectedSystems: '',
                      incidentStatus: 'open',
                      resolution: '',
                      resolutionDate: '',
                      timeImpact: '',
                      originalDate: '',
                      newDate: '',
                      rootCause: '',
                      linkedIssues: '',
                      linkedEpics: '',
                      supersedes: ''
                    })
                    setEditingCommunication(null)
                  }}
                  style={{ flex: 1 }}
                >
                  {editingCommunication ? 'Cancel Edit' : 'Reset'}
                </button>
              </div>
            </div>
          </div>

          {/* Communication History Display */}
          {history.length === 0 ? (
            <div className="card text-center" style={{ padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📝</div>
              <h3>No Communications Yet</h3>
              <p className="text-muted">Start using templates or import emails to track communications</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.slice(0, 20).map((comm) => (
                <div key={comm.id} className="card" style={{ background: '#F9FAFB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{comm.subject}</div>
                        {comm.source === 'imported' && (
                          <span style={{ fontSize: '10px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px' }}>
                            IMPORTED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {new Date(comm.sentAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {comm.tags && comm.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          {comm.tags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                fontSize: '10px',
                                background: '#FEF3C7',
                                color: '#92400E',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEditCommunication(comm)}
                        style={{
                          padding: '4px 8px',
                          background: '#DBEAFE',
                          color: '#1E40AF',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(comm.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', maxHeight: '100px', overflow: 'hidden' }}>
                    {comm.content.substring(0, 200)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Decisions Tab */}
      {activeTab === 'decisions' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Decision Log</h2>
            <button className="btn btn-primary" onClick={() => setShowAddDecision(!showAddDecision)}>
              {showAddDecision ? 'Cancel' : '+ Add Decision'}
            </button>
          </div>

          {showAddDecision && (
            <div className="card" style={{ marginBottom: '20px', background: '#F9FAFB' }}>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Decision Title *"
                  value={decisionForm.title}
                  onChange={(e) => setDecisionForm({ ...decisionForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <textarea
                  placeholder="Description *"
                  value={decisionForm.description}
                  onChange={(e) => setDecisionForm({ ...decisionForm, description: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Decision Date:
                </label>
                <input
                  type="date"
                  value={decisionForm.decisionDate}
                  onChange={(e) => setDecisionForm({ ...decisionForm, decisionDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                  lang="de-DE"
                />
              </div>

              {/* Requirements Sign-Off Section */}
              <div style={{ marginBottom: '12px', padding: '12px', background: '#EFF6FF', borderRadius: '6px', border: '1px solid #DBEAFE' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF', marginBottom: '12px' }}>📄 Requirements Sign-Off (Optional)</h4>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                    Document Type:
                  </label>
                  <select
                    value={decisionForm.documentType}
                    onChange={(e) => setDecisionForm({ ...decisionForm, documentType: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                  >
                    <option value="">None</option>
                    <option value="BRD">BRD (Business Requirements Document)</option>
                    <option value="Requirements">Requirements Specification</option>
                    <option value="Technical Spec">Technical Specification</option>
                    <option value="Design Doc">Design Document</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                    Document URL (GitLab, SharePoint, etc.):
                  </label>
                  <input
                    type="url"
                    placeholder="https://gitlab.com/project/docs/brd.pdf"
                    value={decisionForm.documentUrl}
                    onChange={(e) => setDecisionForm({ ...decisionForm, documentUrl: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                    Document Version:
                  </label>
                  <input
                    type="text"
                    placeholder="v1.0, v2.1, etc."
                    value={decisionForm.documentVersion}
                    onChange={(e) => setDecisionForm({ ...decisionForm, documentVersion: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                    Sign-Off Date:
                  </label>
                  <input
                    type="date"
                    value={decisionForm.signOffDate}
                    onChange={(e) => setDecisionForm({ ...decisionForm, signOffDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                    lang="de-DE"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Stakeholders Involved:
                </label>
                {stakeholders.map((s) => (
                  <label key={s.id} style={{ display: 'block', marginBottom: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={decisionForm.stakeholderIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDecisionForm({ ...decisionForm, stakeholderIds: [...decisionForm.stakeholderIds, s.id] })
                        } else {
                          setDecisionForm({ ...decisionForm, stakeholderIds: decisionForm.stakeholderIds.filter(id => id !== s.id) })
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '13px' }}>{s.name}</span>
                  </label>
                ))}
              </div>
              <button className="btn btn-primary" onClick={handleAddDecision}>
                Add Decision
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {decisions.length === 0 ? (
              <div className="card text-center" style={{ padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
                <h3>No Decisions Yet</h3>
                <p className="text-muted">Track important project decisions and sign-offs</p>
              </div>
            ) : (
              decisions.map((decision) => (
                <div key={decision.id} className="card" style={{ background: decision.status !== 'active' ? '#FEF2F2' : '#F9FAFB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{decision.title}</h3>
                        <span
                          style={{
                            fontSize: '10px',
                            background: decision.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                            color: decision.status === 'active' ? '#065F46' : '#991B1B',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}
                        >
                          {decision.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                        {new Date(decision.decisionDate).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
                        {decision.description}
                      </div>

                      {/* Requirements Sign-Off Display */}
                      {decision.documentType && (
                        <div style={{ fontSize: '12px', marginTop: '8px', padding: '10px', background: '#EFF6FF', borderRadius: '6px', border: '1px solid #DBEAFE' }}>
                          <div style={{ fontWeight: '600', color: '#1E40AF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📄</span>
                            <span>Requirements Sign-Off</span>
                          </div>
                          <div style={{ color: '#374151' }}>
                            <strong>Type:</strong> {decision.documentType}
                          </div>
                          {decision.documentVersion && (
                            <div style={{ color: '#374151' }}>
                              <strong>Version:</strong> {decision.documentVersion}
                            </div>
                          )}
                          {decision.signOffDate && (
                            <div style={{ color: '#374151' }}>
                              <strong>Signed Off:</strong> {new Date(decision.signOffDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          )}
                          {decision.documentUrl && (
                            <div style={{ marginTop: '6px' }}>
                              <a
                                href={decision.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#2563EB',
                                  textDecoration: 'none',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>🔗</span>
                                <span>View Document</span>
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {decision.status !== 'active' && decision.reversedReason && (
                        <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '8px', padding: '8px', background: '#FEE2E2', borderRadius: '4px' }}>
                          <strong>Reversed:</strong> {decision.reversedReason}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {decision.status === 'active' && (
                        <button
                          onClick={() => handleReverseDecision(decision.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Reverse
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDecision(decision.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Timeline</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setTimelineView('list')}
                  style={{
                    padding: '8px 16px',
                    background: timelineView === 'list' ? '#3B82F6' : 'white',
                    color: timelineView === 'list' ? 'white' : '#374151',
                    border: timelineView === 'list' ? 'none' : '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: timelineView === 'list' ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  List View
                </button>
                <button
                  onClick={() => setTimelineView('gantt')}
                  style={{
                    padding: '8px 16px',
                    background: timelineView === 'gantt' ? '#3B82F6' : 'white',
                    color: timelineView === 'gantt' ? 'white' : '#374151',
                    border: timelineView === 'gantt' ? 'none' : '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: timelineView === 'gantt' ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Gantt View
                </button>
              </div>
            </div>

            {/* Filters Row - Type & Search on left, Year/Quarters on right */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
              {/* Left Side: Type Filter & Search */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
                {/* Communication Type Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Type:</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      minWidth: '180px'
                    }}
                  >
                    <option value="all">All Activity</option>
                    <option value="decision">Decisions</option>
                    <optgroup label="Communications">
                      <option value="email">Email</option>
                      <option value="incident">Incident</option>
                      <option value="requirements_signoff">Requirements Sign-Off</option>
                      <option value="scope_change">Scope Change</option>
                      <option value="prioritization">Prioritization</option>
                      <option value="meeting_notes">Meeting Notes</option>
                      <option value="other">Other</option>
                    </optgroup>
                  </select>
                </div>

                {/* Search Filter */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search by tags, subject, content, creator..."
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    style={{
                      flex: 1,
                      maxWidth: '400px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px'
                    }}
                  />
                  {tagFilter && (
                    <button
                      onClick={() => setTagFilter('')}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        background: '#F3F4F6',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side: Year & Quarter Selectors */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Year Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {[2023, 2024, 2025, 2026].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Quarter Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Quarters:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4].map(quarter => {
                      const isSelected = selectedQuarters.includes(quarter)
                      return (
                        <button
                          key={quarter}
                          onClick={(e) => handleTimelineQuarterToggle(quarter, e)}
                          title={isSelected ? "Click to deselect, Ctrl+Click for range" : "Click to select, Ctrl+Click for range"}
                          style={{
                            padding: '6px 12px',
                            background: isSelected ? '#3B82F6' : 'white',
                            color: isSelected ? 'white' : '#374151',
                            border: isSelected ? 'none' : '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: isSelected ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Q{quarter}
                        </button>
                      )
                    })}
                    <button
                      onClick={handleTimelineFullYearToggle}
                      style={{
                        padding: '6px 12px',
                        background: selectedQuarters.length === 4 ? '#10B981' : 'white',
                        color: selectedQuarters.length === 4 ? 'white' : '#374151',
                        border: selectedQuarters.length === 4 ? 'none' : '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: selectedQuarters.length === 4 ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Full Year
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Tiles - More Subtle */}
            {(() => {
              const stats = getTimelineStats()
              return (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    minWidth: '100px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500', marginBottom: '2px' }}>
                      Total
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                      {stats.total}
                    </div>
                  </div>
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    minWidth: '100px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500', marginBottom: '2px' }}>
                      Communications
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                      {stats.communications}
                    </div>
                  </div>
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    minWidth: '100px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500', marginBottom: '2px' }}>
                      Decisions
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                      {stats.decisions}
                    </div>
                  </div>
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    minWidth: '100px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500', marginBottom: '2px' }}>
                      Incidents
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#DC2626' }}>
                      {stats.incidents}
                    </div>
                  </div>
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    minWidth: '100px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500', marginBottom: '2px' }}>
                      Sign-Offs
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                      {stats.signoffs}
                    </div>
                  </div>
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    minWidth: '100px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500', marginBottom: '2px' }}>
                      Scope Changes
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                      {stats.scopeChanges}
                    </div>
                  </div>
                  <div style={{
                    background: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    minWidth: '100px'
                  }}>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500', marginBottom: '2px' }}>
                      Meetings
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                      {stats.meetings}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {getTimelineItems().length === 0 ? (
            <div className="card text-center" style={{ padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>⏱️</div>
              <h3>No Activity Yet</h3>
              <p className="text-muted">Timeline will show all communications and decisions</p>
            </div>
          ) : timelineView === 'list' ? (
            <div style={{ position: 'relative' }}>
              {/* Timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  background: '#E5E7EB'
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {getTimelineItems().map((item, index) => {
                  // Get color based on item type
                  const itemColor = item.type === 'communication'
                    ? (item.commType ? item.commType.color : '#3B82F6')
                    : item.type === 'decision' ? '#10B981' : '#F59E0B'

                  // Get background color (lighter version)
                  const getBgColor = (hex) => {
                    // Simple lightening by adding opacity or using predefined light colors
                    const colorMap = {
                      '#10B981': '#D1FAE5', // green
                      '#F59E0B': '#FEF3C7', // yellow
                      '#EF4444': '#FEE2E2', // red
                      '#DC2626': '#FEE2E2', // dark red
                      '#8B5CF6': '#EDE9FE', // purple
                      '#F97316': '#FFEDD5', // orange
                      '#3B82F6': '#DBEAFE', // blue
                      '#6B7280': '#F3F4F6'  // gray
                    }
                    return colorMap[hex] || '#F3F4F6'
                  }

                  const itemBgColor = getBgColor(itemColor)

                  return (
                  <div key={`${item.type}-${item.data.id}`} style={{ position: 'relative', paddingLeft: '50px' }}>
                    {/* Timeline dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '8px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: itemColor,
                        border: '3px solid white',
                        boxShadow: '0 0 0 2px #E5E7EB'
                      }}
                    />

                    <div
                      className="card"
                      style={{ background: '#F9FAFB', cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => {
                        setSelectedTimelineItem(item)
                        setShowTimelineDetail(true)
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#F9FAFB'}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                        {/* Communication Type Badge with Icon */}
                        {item.type === 'communication' && item.commType && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: itemBgColor,
                              color: itemColor,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span>{item.commType.icon}</span>
                            <span>{item.commType.label.toUpperCase()}</span>
                          </span>
                        )}
                        {/* Decision Badge */}
                        {item.type === 'decision' && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: itemBgColor,
                              color: itemColor,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}
                          >
                            DECISION
                          </span>
                        )}
                        {/* Requirements Sign-Off Badge */}
                        {item.type === 'decision' && item.data.documentType && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: '#EFF6FF',
                              color: '#1E40AF',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              border: '1px solid #DBEAFE',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span>📄</span>
                            <span>REQUIREMENTS SIGN-OFF</span>
                          </span>
                        )}
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          {item.date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{item.title}</h3>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: (item.data.tags && item.data.tags.length > 0) || item.data.timeImpact || item.data.linkedIssues ? '8px' : '0' }}>
                        {item.description}...
                      </div>

                      {/* Display impact badges and tags */}
                      {((item.data.tags && item.data.tags.length > 0) || item.data.timeImpact || (item.data.linkedIssues && item.data.linkedIssues.length > 0)) && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {/* Time Impact Badge */}
                          {item.data.timeImpact && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}
                            >
                              ⏱️ {item.data.timeImpact}
                            </span>
                          )}
                          {/* Linked Issues Badge */}
                          {item.data.linkedIssues && item.data.linkedIssues.length > 0 && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#E0E7FF',
                                color: '#4338CA',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              🔗 {item.data.linkedIssues.length} issue{item.data.linkedIssues.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {/* Tags */}
                          {item.data.tags && item.data.tags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                fontSize: '10px',
                                background: '#FEF3C7',
                                color: '#92400E',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Gantt View */
            (() => {
              const items = getTimelineItems()

              // Calculate time range based on selected quarters (same as Epic Management)
              const minQuarter = Math.min(...selectedQuarters)
              const maxQuarter = Math.max(...selectedQuarters)

              const startMonth = (minQuarter - 1) * 3
              const endMonth = maxQuarter * 3 - 1

              const rangeStart = new Date(selectedYear, startMonth, 1)
              rangeStart.setHours(0, 0, 0, 0)

              const rangeEnd = new Date(selectedYear, endMonth + 1, 0) // Last day of end month
              rangeEnd.setHours(23, 59, 59, 999)

              const totalDays = (rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)

              // Determine granularity based on quarter selection
              const granularity = selectedQuarters.length === 4 ? 'year' :
                                  selectedQuarters.length >= 2 ? 'quarter' : 'month'

              // Helper to calculate bar position
              const getBarPosition = (date) => {
                const itemDate = new Date(date)
                itemDate.setHours(0, 0, 0, 0)
                const daysDiff = (itemDate - rangeStart) / (1000 * 60 * 60 * 24)
                return (daysDiff / totalDays) * 100
              }

              // Today position
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const todayPosition = getBarPosition(today)

              return (
                <div className="card" style={{ padding: '16px', position: 'relative', overflow: 'visible' }}>
                  {/* Timeline Header */}
                  <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', paddingBottom: '4px', marginBottom: '16px' }}>
                    <div style={{ width: '250px', fontWeight: '600', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>
                      Activity
                    </div>
                    <div style={{ flex: 1, position: 'relative', minHeight: '48px' }}>
                      {/* Adaptive Timeline Headers based on granularity */}
                      {granularity === 'year' && (() => {
                        // Full Year View: Quarter Headers + Month Subdivisions
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        return (
                          <>
                            {/* Quarter Headers */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>
                              {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
                                <div key={q} style={{ flex: 1, textAlign: 'center', borderRight: idx < 3 ? '1px dashed #D1D5DB' : 'none' }}>
                                  {q} {selectedYear}
                                </div>
                              ))}
                            </div>
                            {/* Month Subdivisions */}
                            <div style={{ display: 'flex', fontSize: '10px', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: '4px' }}>
                              {monthNames.map((month, idx) => (
                                <div
                                  key={month}
                                  style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    borderRight: idx < 11 ? '1px dotted #E5E7EB' : 'none',
                                    padding: '2px 0'
                                  }}
                                >
                                  {month}
                                </div>
                              ))}
                            </div>
                          </>
                        )
                      })()}

                      {granularity === 'quarter' && (() => {
                        // 2-3 Quarters View: Month Headers + Week Subdivisions
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        const months = []
                        for (let m = startMonth; m <= endMonth; m++) {
                          months.push({ name: monthNames[m], index: m })
                        }

                        // Calculate weeks for the entire range
                        const weeks = []
                        let currentDate = new Date(rangeStart)
                        while (currentDate <= rangeEnd) {
                          weeks.push(new Date(currentDate))
                          currentDate.setDate(currentDate.getDate() + 7)
                        }

                        return (
                          <>
                            {/* Month Headers */}
                            <div style={{ display: 'flex', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>
                              {months.map((month, idx) => (
                                <div key={month.index} style={{ flex: 1, textAlign: 'center', borderRight: idx < months.length - 1 ? '1px dashed #D1D5DB' : 'none' }}>
                                  {month.name}
                                </div>
                              ))}
                            </div>
                            {/* Week Subdivisions */}
                            <div style={{ display: 'flex', fontSize: '9px', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: '4px' }}>
                              {weeks.map((week, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    borderRight: idx < weeks.length - 1 ? '1px dotted #E5E7EB' : 'none',
                                    padding: '2px 0',
                                    fontSize: '9px'
                                  }}
                                  title={week.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                >
                                  {week.getDate()}/{week.getMonth() + 1}
                                </div>
                              ))}
                            </div>
                          </>
                        )
                      })()}

                      {granularity === 'month' && (() => {
                        // 1 Quarter View: Week Headers + Date Labels
                        const weeks = []
                        let currentDate = new Date(rangeStart)
                        while (currentDate <= rangeEnd) {
                          weeks.push(new Date(currentDate))
                          currentDate.setDate(currentDate.getDate() + 7)
                        }

                        return (
                          <>
                            {/* Week Headers */}
                            <div style={{ display: 'flex', fontSize: '11px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>
                              {weeks.map((week, idx) => (
                                <div key={idx} style={{ flex: 1, textAlign: 'center', borderRight: idx < weeks.length - 1 ? '1px dashed #D1D5DB' : 'none' }}>
                                  Week {idx + 1}
                                </div>
                              ))}
                            </div>
                            {/* Date Labels (start of each week) */}
                            <div style={{ display: 'flex', fontSize: '9px', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: '4px' }}>
                              {weeks.map((week, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    borderRight: idx < weeks.length - 1 ? '1px dotted #E5E7EB' : 'none',
                                    padding: '2px 0'
                                  }}
                                >
                                  {week.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                </div>
                              ))}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Today Marker */}
                  {todayPosition >= 0 && todayPosition <= 100 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `calc(250px + (100% - 250px - 32px) * ${todayPosition / 100})`,
                        top: '60px',
                        bottom: '0',
                        width: '2px',
                        background: '#EF4444',
                        zIndex: 5
                      }}
                      title={`Today: ${today.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '-18px',
                        fontSize: '10px',
                        color: '#EF4444',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        background: 'white',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        border: '1px solid #EF4444'
                      }}>
                        TODAY
                      </div>
                    </div>
                  )}

                  {/* Activity Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {items.map((item, idx) => {
                      const itemPosition = getBarPosition(item.date)
                      // Get color based on item type
                      const itemColor = item.type === 'communication'
                        ? (item.commType ? item.commType.color : '#3B82F6')
                        : item.type === 'decision' ? '#10B981' : '#F59E0B'

                      // Get background color (lighter version)
                      const getBgColor = (hex) => {
                        const colorMap = {
                          '#10B981': '#D1FAE5', '#F59E0B': '#FEF3C7',
                          '#EF4444': '#FEE2E2', '#DC2626': '#FEE2E2',
                          '#8B5CF6': '#EDE9FE', '#F97316': '#FFEDD5',
                          '#3B82F6': '#DBEAFE', '#6B7280': '#F3F4F6'
                        }
                        return colorMap[hex] || '#F3F4F6'
                      }
                      const itemBgColor = getBgColor(itemColor)

                      return (
                        <div
                          key={`${item.type}-${item.data.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '40px',
                            borderBottom: idx < items.length - 1 ? '1px solid #F3F4F6' : 'none',
                            paddingBottom: '12px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            padding: '8px',
                            marginLeft: '-8px',
                            marginRight: '-8px',
                            borderRadius: '6px'
                          }}
                          onClick={() => {
                            setSelectedTimelineItem(item)
                            setShowTimelineDetail(true)
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Item Info */}
                          <div style={{ width: '250px', paddingRight: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              {/* Communication Type Badge */}
                              {item.type === 'communication' && item.commType && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    background: itemBgColor,
                                    color: itemColor,
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                >
                                  <span>{item.commType.icon}</span>
                                  <span>{item.commType.label.toUpperCase()}</span>
                                </span>
                              )}
                              {/* Decision Badge */}
                              {item.type === 'decision' && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    background: itemBgColor,
                                    color: itemColor,
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    textTransform: 'uppercase',
                                    fontWeight: '600'
                                  }}
                                >
                                  DECISION
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                              {item.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          </div>

                          {/* Timeline Bar */}
                          <div style={{ flex: 1, position: 'relative', height: '32px' }}>
                            {(() => {
                              // Check if this communication has a duration (start and end date)
                              // This works for incidents with resolution dates and any other communication type with duration
                              const hasDuration = item.type === 'communication' && item.data.resolutionDate

                              if (hasDuration) {
                                // Show progress bar from incident date to resolution date
                                const startDate = new Date(item.data.sentAt)
                                const endDate = new Date(item.data.resolutionDate)
                                const startPos = getBarPosition(startDate)
                                const endPos = getBarPosition(endDate)

                                if (startPos >= 0 && endPos <= 100 && startPos < endPos) {
                                  const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))

                                  return (
                                    <>
                                      {/* Progress bar */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${startPos}%`,
                                          width: `${endPos - startPos}%`,
                                          height: '8px',
                                          background: `linear-gradient(90deg, ${itemColor}40 0%, ${itemColor} 100%)`,
                                          borderRadius: '4px',
                                          top: '12px',
                                          border: `1px solid ${itemColor}`,
                                          zIndex: 5
                                        }}
                                        title={`Resolved in ${durationDays} day${durationDays !== 1 ? 's' : ''}`}
                                      />
                                      {/* Start marker */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${startPos}%`,
                                          width: '12px',
                                          height: '12px',
                                          borderRadius: '50%',
                                          background: itemColor,
                                          border: '2px solid white',
                                          boxShadow: '0 0 0 2px ' + itemColor + '40',
                                          transform: 'translateX(-50%)',
                                          top: '10px',
                                          zIndex: 10
                                        }}
                                        title={`Incident: ${startDate.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                                      />
                                      {/* End marker */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${endPos}%`,
                                          width: '12px',
                                          height: '12px',
                                          borderRadius: '50%',
                                          background: '#10B981',
                                          border: '2px solid white',
                                          boxShadow: '0 0 0 2px #10B98140',
                                          transform: 'translateX(-50%)',
                                          top: '10px',
                                          zIndex: 10
                                        }}
                                        title={`Resolved: ${endDate.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                                      />
                                      {/* Duration label */}
                                      {endPos - startPos > 5 && (
                                        <div
                                          style={{
                                            position: 'absolute',
                                            left: `${(startPos + endPos) / 2}%`,
                                            top: '22px',
                                            fontSize: '9px',
                                            color: itemColor,
                                            fontWeight: '600',
                                            transform: 'translateX(-50%)',
                                            whiteSpace: 'nowrap',
                                            background: 'white',
                                            padding: '1px 4px',
                                            borderRadius: '3px',
                                            zIndex: 11
                                          }}
                                        >
                                          {durationDays}d
                                        </div>
                                      )}
                                    </>
                                  )
                                }
                              }

                              // Default: show single dot
                              if (itemPosition >= 0 && itemPosition <= 100) {
                                return (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${itemPosition}%`,
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      background: itemColor,
                                      border: '2px solid white',
                                      boxShadow: '0 0 0 2px ' + itemColor + '40',
                                      cursor: 'pointer',
                                      transform: 'translateX(-50%)',
                                      top: '10px',
                                      zIndex: 10
                                    }}
                                    title={`${item.title}\n${item.date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                                  />
                                )
                              }

                              return null
                            })()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()
          )}
        </>
      )}

      {/* Compose Modal */}
      {showComposeModal && selectedTemplate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
                {editingCommunication ? 'Edit Communication' : `Compose: ${selectedTemplate.name}`}
              </h2>
            </div>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Recipients
                </label>
                {stakeholders.map((s) => (
                  <label key={s.id} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedStakeholders.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStakeholders([...selectedStakeholders, s.id])
                        } else {
                          setSelectedStakeholders(selectedStakeholders.filter(id => id !== s.id))
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    {s.name} ({s.email})
                  </label>
                ))}
              </div>

              {/* Editable Subject */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Editable Body */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Message Body
                </label>
                <textarea
                  value={fillTemplate({ ...selectedTemplate, subject: templateForm.subject, body: templateForm.body }, {
                    stakeholderName: selectedStakeholders.length === 1
                      ? (stakeholders.find(s => s.id === selectedStakeholders[0])?.name.split(' ')[0] || 'all')
                      : 'all',
                    projectName: loadConfig().projectId || 'Project',
                    healthScore,
                    stats,
                    statusSummary: 'Project progressing as planned.',
                    senderName: 'Project Manager'
                  })}
                  onChange={(e) => {
                    // Allow editing the filled template
                    setTemplateForm({ ...templateForm, body: e.target.value })
                  }}
                  rows={15}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap'
                  }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => {
                setShowComposeModal(false)
                setSelectedStakeholders([])
              }}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleOpenInEmail}
                style={{
                  background: '#10B981',
                  color: 'white',
                  border: 'none'
                }}
              >
                📧 Open in Email
              </button>
              <button className="btn btn-primary" onClick={handleSend}>
                Log Communication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Import Preview Modal */}
      {showEmailPreview && parsedEmail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Import Email</h2>
            </div>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  From:
                </label>
                <div style={{ fontSize: '14px' }}>
                  {parsedEmail.from.name ? `${parsedEmail.from.name} <${parsedEmail.from.email}>` : parsedEmail.from.email}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  To:
                </label>
                <div style={{ fontSize: '14px' }}>
                  {parsedEmail.to.map(t => t.email).join(', ')}
                </div>
              </div>

              {parsedEmail.cc && parsedEmail.cc.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                    CC:
                  </label>
                  <div style={{ fontSize: '14px' }}>
                    {parsedEmail.cc.map(c => c.email).join(', ')}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Subject:
                </label>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{parsedEmail.subject}</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  {parsedEmail.sentDate ? 'Sent:' : 'Date:'}
                </label>
                <div style={{ fontSize: '14px' }}>
                  {(parsedEmail.sentDate || parsedEmail.date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {parsedEmail.tags && parsedEmail.tags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                    Auto-detected Tags:
                  </label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {parsedEmail.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '11px',
                          background: '#FEF3C7',
                          color: '#92400E',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {parsedEmail.references && parsedEmail.references.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                    Detected References:
                  </label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {parsedEmail.references.map((ref, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          background: '#DBEAFE',
                          color: '#1E40AF',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {ref.type} #{ref.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Body Preview:
                </label>
                <div style={{
                  fontSize: '13px',
                  background: '#F3F4F6',
                  padding: '12px',
                  borderRadius: '6px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {parsedEmail.body.substring(0, 500)}...
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '8px' }}>
                  Matched Stakeholders:
                </label>
                <div style={{ fontSize: '13px', color: '#374151' }}>
                  {(() => {
                    const allEmails = [...parsedEmail.to, ...parsedEmail.cc].map(e => e.email.toLowerCase())
                    const matched = stakeholders.filter(s => allEmails.includes(s.email.toLowerCase()))
                    return matched.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {matched.map(s => (
                          <li key={s.id}>{s.name} ({s.email})</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: '#6B7280', fontStyle: 'italic' }}>No stakeholders matched</div>
                    )
                  })()}
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => {
                setShowEmailPreview(false)
                setParsedEmail(null)
              }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleImportEmail}>
                Import Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Detail Modal */}
      {showTimelineDetail && selectedTimelineItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowTimelineDetail(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      background: selectedTimelineItem.type === 'communication' ? '#DBEAFE' : selectedTimelineItem.type === 'decision' ? '#D1FAE5' : '#FEF3C7',
                      color: selectedTimelineItem.type === 'communication' ? '#1E40AF' : selectedTimelineItem.type === 'decision' ? '#065F46' : '#92400E',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: '600'
                    }}>
                      {selectedTimelineItem.type}
                    </span>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                      {selectedTimelineItem.date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {selectedTimelineItem.title}
                  </h2>
                </div>
                <button
                  onClick={() => setShowTimelineDetail(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6B7280',
                    padding: '0',
                    marginLeft: '16px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {selectedTimelineItem.type === 'communication' && (
                <>
                  {selectedTimelineItem.data.from && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                        From:
                      </label>
                      <div style={{ fontSize: '14px' }}>
                        {typeof selectedTimelineItem.data.from === 'object'
                          ? `${selectedTimelineItem.data.from.name || ''} <${selectedTimelineItem.data.from.email || ''}>`
                          : selectedTimelineItem.data.from}
                      </div>
                    </div>
                  )}

                  {selectedTimelineItem.data.to && selectedTimelineItem.data.to.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                        To:
                      </label>
                      <div style={{ fontSize: '14px' }}>
                        {selectedTimelineItem.data.to.map((recipient, idx) => (
                          <div key={idx}>
                            {typeof recipient === 'object'
                              ? `${recipient.name || ''} <${recipient.email || ''}>`
                              : recipient}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                      Content:
                    </label>
                    <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {/* Make ITO links clickable */}
                      {selectedTimelineItem.data.content?.split('\n').map((line, idx) => {
                        const itoLinkMatch = line.match(/^ITO Link:\s*(.+)$/)
                        if (itoLinkMatch) {
                          const url = itoLinkMatch[1].trim()
                          return (
                            <div key={idx}>
                              ITO Link: <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'underline' }}>{url}</a>
                            </div>
                          )
                        }
                        return <div key={idx}>{line || '\u00A0'}</div>
                      })}
                    </div>
                  </div>

                  {/* Incident Resolution Info */}
                  {selectedTimelineItem.data.type === 'incident' && selectedTimelineItem.data.resolutionDate && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      background: '#F0FDF4',
                      border: '1px solid #86EFAC',
                      borderRadius: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px' }}>✓</span>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>
                          Incident Resolved
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>
                            Resolution Date:
                          </div>
                          <div style={{ fontSize: '14px', color: '#1F2937', fontWeight: '500' }}>
                            {new Date(selectedTimelineItem.data.resolutionDate).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>
                            Time to Resolution:
                          </div>
                          <div style={{ fontSize: '14px', color: '#1F2937', fontWeight: '500' }}>
                            {(() => {
                              const incidentDate = new Date(selectedTimelineItem.data.date)
                              const resolutionDate = new Date(selectedTimelineItem.data.resolutionDate)
                              const durationMs = resolutionDate - incidentDate
                              const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24))
                              const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                              const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

                              if (durationDays > 0) {
                                return `${durationDays}d ${durationHours}h ${durationMinutes}m`
                              } else if (durationHours > 0) {
                                return `${durationHours}h ${durationMinutes}m`
                              } else {
                                return `${durationMinutes}m`
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tags Management */}
                  <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '8px' }}>
                      Tags:
                    </label>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {selectedTimelineItem.data.tags && selectedTimelineItem.data.tags.length > 0 ? (
                        selectedTimelineItem.data.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '12px',
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(selectedTimelineItem.data.id, tag)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#1E40AF',
                                fontSize: '14px',
                                padding: '0 2px',
                                lineHeight: 1
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>No tags yet</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag(selectedTimelineItem.data.id)
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px'
                        }}
                      />
                      <button
                        onClick={() => handleAddTag(selectedTimelineItem.data.id)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          background: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '8px' }}>
                      Comments:
                    </label>
                    {selectedTimelineItem.data.comments && selectedTimelineItem.data.comments.length > 0 ? (
                      <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedTimelineItem.data.comments.map((comment) => (
                          <div key={comment.id} style={{ background: '#F9FAFB', padding: '12px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '13px', marginBottom: '4px' }}>{comment.text}</div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              {new Date(comment.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>No comments yet</div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <textarea
                        placeholder="Add comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          minHeight: '60px',
                          resize: 'vertical'
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(selectedTimelineItem.data.id)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          background: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          alignSelf: 'flex-start'
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </>
              )}

              {selectedTimelineItem.type === 'decision' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                      Status:
                    </label>
                    <span style={{
                      fontSize: '12px',
                      background: selectedTimelineItem.data.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                      color: selectedTimelineItem.data.status === 'active' ? '#065F46' : '#991B1B',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      {selectedTimelineItem.data.status}
                    </span>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                      Description:
                    </label>
                    <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {selectedTimelineItem.data.description}
                    </div>
                  </div>

                  {selectedTimelineItem.data.tags && selectedTimelineItem.data.tags.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                        Tags:
                      </label>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {selectedTimelineItem.data.tags.map((tag, idx) => (
                          <span key={idx} style={{
                            fontSize: '11px',
                            background: '#F3F4F6',
                            color: '#374151',
                            padding: '3px 8px',
                            borderRadius: '4px'
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedTimelineItem.type === 'document' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                      File Type:
                    </label>
                    <div style={{ fontSize: '14px' }}>{selectedTimelineItem.data.fileType}</div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                      File Size:
                    </label>
                    <div style={{ fontSize: '14px' }}>
                      {(selectedTimelineItem.data.fileSize / 1024).toFixed(2)} KB
                    </div>
                  </div>

                  {selectedTimelineItem.data.description && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                        Description:
                      </label>
                      <div style={{ fontSize: '14px' }}>{selectedTimelineItem.data.description}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
