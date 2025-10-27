import React, { useState } from 'react'
import {
  getStakeholders,
  saveStakeholder,
  removeStakeholder,
  getCommunicationHistory,
  logCommunication,
  getTemplates,
  fillTemplate
} from '../services/stakeholderService'
import { loadConfig } from '../services/storageService'

/**
 * Stakeholder Communication Hub
 * Manage stakeholders and communication templates
 */
export default function StakeholderHubView({ stats, healthScore }) {
  const [stakeholders, setStakeholders] = useState(getStakeholders())
  const [history, setHistory] = useState(getCommunicationHistory())
  const [templates] = useState(getTemplates())
  const [activeTab, setActiveTab] = useState('stakeholders') // stakeholders, templates, history
  const [showAddStakeholder, setShowAddStakeholder] = useState(false)
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedStakeholders, setSelectedStakeholders] = useState([])

  const [stakeholderForm, setStakeholderForm] = useState({
    name: '',
    role: '',
    email: '',
    frequency: 'weekly',
    interests: []
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
    setShowComposeModal(true)
  }

  const handleSend = () => {
    if (selectedStakeholders.length === 0) {
      alert('Please select at least one stakeholder')
      return
    }

    const config = loadConfig()
    const filledContent = fillTemplate(selectedTemplate, {
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
    alert('Communication logged! Copy the content to send via your email client.')
  }

  return (
    <div className="container-fluid">
      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #E5E7EB', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['stakeholders', 'templates', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #E60000' : '2px solid transparent',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab === tab ? '#E60000' : '#6B7280',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
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
                <button className="btn btn-primary" onClick={() => handleCompose(template)}>
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Communication History</h2>
          {history.length === 0 ? (
            <div className="card text-center" style={{ padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📝</div>
              <h3>No Communications Yet</h3>
              <p className="text-muted">Start using templates to track communications</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.slice(0, 20).map((comm) => (
                <div key={comm.id} className="card" style={{ background: '#F9FAFB' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{comm.subject}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                    {new Date(comm.sentAt).toLocaleString()}
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
              <div style={{
                padding: '16px',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {fillTemplate(selectedTemplate, {
                  projectName: loadConfig().projectId || 'Project',
                  healthScore,
                  stats,
                  statusSummary: 'Project progressing as planned.',
                  senderName: 'Project Manager'
                })}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowComposeModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSend}>
                Log & Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
