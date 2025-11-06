import React, { useState } from 'react'
import {
  getStakeholders,
  saveStakeholder,
  removeStakeholder,
  getCommunicationHistory,
  logCommunication,
  deleteCommunication,
  getTemplates,
  saveTemplate,
  fillTemplate,
  getDecisions,
  saveDecision,
  deleteDecision,
  reverseDecision,
  getDocuments,
  saveDocument,
  deleteDocument,
  importEmail,
  searchAll
} from '../services/stakeholderService'
import { parseEmlFile, detectEmailTags, extractReferences } from '../utils/emailParser'
import { parseMsgFile, isMsgFile } from '../utils/msgParser'
import { loadConfig } from '../services/storageService'

/**
 * Communication Hub
 * Manage stakeholders and communication templates
 */
export default function StakeholderHubView({ stats, healthScore }) {
  const [stakeholders, setStakeholders] = useState(getStakeholders())
  const [history, setHistory] = useState(getCommunicationHistory())
  const [templates, setTemplates] = useState(getTemplates())
  const [decisions, setDecisions] = useState(getDecisions())
  const [documents, setDocuments] = useState(getDocuments())
  const [activeTab, setActiveTab] = useState('email-upload') // email-upload, timeline, decisions, documents, stakeholders, templates
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
    stakeholderIds: [],
    linkedEpics: [],
    linkedIssues: [],
    tags: [],
    approvedBy: []
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

    setHistory(getCommunicationHistory())
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

    setHistory(getCommunicationHistory())
    setShowComposeModal(false)
    setSelectedStakeholders([])
  }

  // Email import handlers
  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.eml') || file.name.endsWith('.msg'))) {
      handleEmailFile(file)
    } else {
      alert('Please drop a .eml or .msg file')
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleEmailFile(file)
    }
  }

  const handleEmailFile = (file) => {
    const isMsgFormat = file.name.endsWith('.msg')

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        let parsed

        if (isMsgFormat) {
          // Parse .msg file (Outlook format)
          const msgBuffer = e.target.result
          parsed = await parseMsgFile(msgBuffer)
        } else {
          // Parse .eml file (standard email format)
          const emlContent = e.target.result
          parsed = parseEmlFile(emlContent)
        }

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
        alert('Failed to parse email file: ' + error.message)
      }
    }

    reader.onerror = () => {
      alert('Failed to read email file')
    }

    // Read as ArrayBuffer for .msg, as text for .eml
    if (isMsgFormat) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  }

  const handleImportEmail = () => {
    const communication = importEmail(parsedEmail, stakeholders)
    setHistory(getCommunicationHistory())
    setDocuments(getDocuments())  // Refresh documents state to show new attachments
    setShowEmailPreview(false)
    setParsedEmail(null)
    alert('Email imported successfully!')
  }

  // Decision handlers
  const handleAddDecision = () => {
    const updated = saveDecision(decisionForm)
    setDecisions(updated)
    setDecisionForm({
      title: '',
      description: '',
      stakeholderIds: [],
      linkedEpics: [],
      linkedIssues: [],
      tags: [],
      approvedBy: []
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

  const handleDeleteDocument = (id) => {
    if (confirm('Delete this document?')) {
      const updated = deleteDocument(id)
      setDocuments(updated)
    }
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

      items.push({
        type: 'communication',
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

    // Add documents
    documents.forEach(doc => {
      items.push({
        type: 'document',
        date: new Date(doc.uploadDate),
        title: doc.filename,
        description: doc.description,
        data: doc
      })
    })

    // Sort by date descending
    return items.sort((a, b) => b.date - a.date)
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Communication Hub
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Manage stakeholders and communication templates
        </p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #E5E7EB', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { id: 'email-upload', label: 'Email Upload' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'decisions', label: 'Decisions' },
            { id: 'documents', label: 'Documents' },
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

      {/* Email Upload Tab */}
      {activeTab === 'email-upload' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Email Communication Upload</h2>
          </div>

          {/* Drag & Drop Zone */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleFileDrop}
            style={{
              display: 'block',
              border: dragActive ? '3px solid #3B82F6' : '3px dashed #3B82F6',
              borderRadius: '8px',
              padding: '32px',
              textAlign: 'center',
              marginBottom: '20px',
              background: dragActive ? '#EFF6FF' : '#F9FAFB',
              transition: 'all 0.2s',
              animation: dragActive ? 'none' : 'pulse 2s ease-in-out infinite',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Drag & drop email files here
            </div>
            <input
              type="file"
              accept=".eml,.msg"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>

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

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Document Archive</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {documents.length === 0 ? (
              <div className="card text-center" style={{ padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📄</div>
                <h3>No Documents Yet</h3>
                <p className="text-muted">Documents from imported emails will appear here</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="card" style={{ background: '#F9FAFB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{doc.filename}</h3>
                        <span
                          style={{
                            fontSize: '10px',
                            background: '#DBEAFE',
                            color: '#1E40AF',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {doc.fileType}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        Uploaded: {new Date(doc.uploadDate).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {doc.description && (
                        <div style={{ fontSize: '13px', color: '#374151' }}>{doc.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
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
              ))
            )}
          </div>
        </>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                📋 List View
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
                📊 Gantt View
              </button>
            </div>
          </div>

          {getTimelineItems().length === 0 ? (
            <div className="card text-center" style={{ padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>⏱️</div>
              <h3>No Activity Yet</h3>
              <p className="text-muted">Timeline will show all communications, decisions, and documents</p>
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
                {getTimelineItems().map((item, index) => (
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
                        background: item.type === 'communication' ? '#3B82F6' : item.type === 'decision' ? '#10B981' : '#F59E0B',
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
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            background: item.type === 'communication' ? '#DBEAFE' : item.type === 'decision' ? '#D1FAE5' : '#FEF3C7',
                            color: item.type === 'communication' ? '#1E40AF' : item.type === 'decision' ? '#065F46' : '#92400E',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}
                        >
                          {item.type}
                        </span>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          {item.date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{item.title}</h3>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>
                        {item.description}...
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Gantt View */
            (() => {
              const items = getTimelineItems()

              // Calculate time range - last 90 days to next 30 days
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const rangeStart = new Date(today)
              rangeStart.setDate(rangeStart.getDate() - 90)
              const rangeEnd = new Date(today)
              rangeEnd.setDate(rangeEnd.getDate() + 30)

              const totalDays = (rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)

              // Helper to calculate bar position
              const getBarPosition = (date) => {
                const itemDate = new Date(date)
                itemDate.setHours(0, 0, 0, 0)
                const daysDiff = (itemDate - rangeStart) / (1000 * 60 * 60 * 24)
                return (daysDiff / totalDays) * 100
              }

              // Today position
              const todayPosition = getBarPosition(today)

              // Generate month markers
              const months = []
              let currentMonth = new Date(rangeStart)
              currentMonth.setDate(1)
              while (currentMonth < rangeEnd) {
                months.push(new Date(currentMonth))
                currentMonth.setMonth(currentMonth.getMonth() + 1)
              }

              return (
                <div className="card" style={{ padding: '16px', position: 'relative', overflow: 'visible' }}>
                  {/* Timeline Header */}
                  <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', paddingBottom: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '250px', fontWeight: '600', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>
                      Activity
                    </div>
                    <div style={{ flex: 1, position: 'relative', minHeight: '40px' }}>
                      {/* Month Headers */}
                      <div style={{ display: 'flex', fontSize: '11px', color: '#6B7280', fontWeight: '600', marginBottom: '4px', position: 'relative' }}>
                        {months.map((month, idx) => {
                          const monthPos = getBarPosition(month)
                          const nextMonth = idx < months.length - 1 ? months[idx + 1] : rangeEnd
                          const monthWidth = getBarPosition(nextMonth) - monthPos

                          return (
                            <div
                              key={idx}
                              style={{
                                position: 'absolute',
                                left: `${monthPos}%`,
                                width: `${monthWidth}%`,
                                textAlign: 'center',
                                borderRight: idx < months.length - 1 ? '1px solid #E5E7EB' : 'none',
                                paddingTop: '4px'
                              }}
                            >
                              {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                          )
                        })}
                      </div>
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
                      title={`Today: ${today.toLocaleDateString()}`}
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
                      const itemColor = item.type === 'communication' ? '#3B82F6' : item.type === 'decision' ? '#10B981' : '#F59E0B'
                      const itemBgColor = item.type === 'communication' ? '#DBEAFE' : item.type === 'decision' ? '#D1FAE5' : '#FEF3C7'

                      return (
                        <div key={`${item.type}-${item.data.id}`} style={{ display: 'flex', alignItems: 'center', minHeight: '40px', borderBottom: idx < items.length - 1 ? '1px solid #F3F4F6' : 'none', paddingBottom: '12px' }}>
                          {/* Item Info */}
                          <div style={{ width: '250px', paddingRight: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span
                                style={{
                                  fontSize: '9px',
                                  background: itemBgColor,
                                  color: item.type === 'communication' ? '#1E40AF' : item.type === 'decision' ? '#065F46' : '#92400E',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  textTransform: 'uppercase',
                                  fontWeight: '600'
                                }}
                              >
                                {item.type}
                              </span>
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
                            {itemPosition >= 0 && itemPosition <= 100 && (
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
                            )}
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
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Compose: {selectedTemplate.name}</h2>
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
                  Date:
                </label>
                <div style={{ fontSize: '14px' }}>{parsedEmail.date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
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
                      {selectedTimelineItem.data.content}
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
