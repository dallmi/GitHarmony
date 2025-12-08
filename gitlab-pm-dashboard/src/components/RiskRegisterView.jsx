import React, { useState } from 'react'
import useRisks from '../hooks/useRisks'

export default function RiskRegisterView() {
  const {
    risks,
    addRisk,
    updateRisk,
    deleteRisk,
    getRiskScore
  } = useRisks()

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    probability: 2,
    impact: 2,
    owner: '',
    status: 'open'
  })

  const handleAddRisk = () => {
    if (!formData.title) return
    addRisk(formData)
    setFormData({
      title: '',
      description: '',
      probability: 2,
      impact: 2,
      owner: '',
      status: 'open'
    })
    setShowModal(false)
  }

  // Build risk matrix
  const matrix = {}
  for (let prob = 3; prob >= 1; prob--) {
    for (let impact = 1; impact <= 3; impact++) {
      const key = `${prob}-${impact}`
      matrix[key] = risks.filter(r =>
        r.probability === prob &&
        r.impact === impact &&
        r.status === 'open'
      ).length
    }
  }

  const getRiskClass = (prob, impact) => {
    const score = prob * impact
    if (score >= 6) return 'risk-high'
    if (score >= 3) return 'risk-medium'
    return 'risk-low'
  }

  const activeRisks = risks.filter(r => r.status === 'open')

  return (
    <div className="container">
      <div className="card mb-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2>Risk Register</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Add Risk
          </button>
        </div>

        <h3 className="mb-3" style={{ fontWeight: '500' }}>Probability × Impact Matrix</h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '32px'
        }}>
          {/* Header Row */}
          <div></div>
          <div className="text-center metric-label">LOW IMPACT</div>
          <div className="text-center metric-label">MEDIUM IMPACT</div>
          <div className="text-center metric-label">HIGH IMPACT</div>

          {/* High Probability Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12px' }}>
            <span className="metric-label">HIGH PROB</span>
          </div>
          <RiskCell score={getRiskScore({ probability: 3, impact: 1 })} count={matrix['3-1']} />
          <RiskCell score={getRiskScore({ probability: 3, impact: 2 })} count={matrix['3-2']} />
          <RiskCell score={getRiskScore({ probability: 3, impact: 3 })} count={matrix['3-3']} />

          {/* Medium Probability Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12px' }}>
            <span className="metric-label">MED PROB</span>
          </div>
          <RiskCell score={getRiskScore({ probability: 2, impact: 1 })} count={matrix['2-1']} />
          <RiskCell score={getRiskScore({ probability: 2, impact: 2 })} count={matrix['2-2']} />
          <RiskCell score={getRiskScore({ probability: 2, impact: 3 })} count={matrix['2-3']} />

          {/* Low Probability Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12px' }}>
            <span className="metric-label">LOW PROB</span>
          </div>
          <RiskCell score={getRiskScore({ probability: 1, impact: 1 })} count={matrix['1-1']} />
          <RiskCell score={getRiskScore({ probability: 1, impact: 2 })} count={matrix['1-2']} />
          <RiskCell score={getRiskScore({ probability: 1, impact: 3 })} count={matrix['1-3']} />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3">Active Risks</h3>
        {activeRisks.length === 0 ? (
          <div className="text-center" style={{ padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>○</div>
            <p className="text-muted">No active risks. Click "Add Risk" to create one.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeRisks.map(risk => (
              <div
                key={risk.id}
                className="card"
                style={{
                  background: 'var(--bg-secondary)',
                  borderLeft: `4px solid ${
                    getRiskScore(risk) >= 6 ? 'var(--danger)' :
                    getRiskScore(risk) >= 3 ? 'var(--warning)' :
                    'var(--success)'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: '8px' }}>{risk.title}</h4>
                    <p className="text-muted mb-2" style={{ fontSize: '14px' }}>{risk.description}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                      <span>
                        <strong>Probability:</strong> {risk.probability === 3 ? 'High' : risk.probability === 2 ? 'Medium' : 'Low'}
                      </span>
                      <span>
                        <strong>Impact:</strong> {risk.impact === 3 ? 'High' : risk.impact === 2 ? 'Medium' : 'Low'}
                      </span>
                      <span>
                        <strong>Score:</strong> {getRiskScore(risk)}
                      </span>
                      {risk.owner && (
                        <span>
                          <strong>Owner:</strong> {risk.owner}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn"
                      onClick={() => updateRisk(risk.id, { status: 'monitoring' })}
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      Monitor
                    </button>
                    <button
                      className="btn"
                      onClick={() => updateRisk(risk.id, { status: 'closed' })}
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Risk Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Risk</h2>
              <button className="btn" onClick={() => setShowModal(false)} style={{ padding: '4px 8px' }}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief risk description"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed risk description"
                  rows={3}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Probability</label>
                  <select
                    className="form-select"
                    value={formData.probability}
                    onChange={e => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Impact</label>
                  <select
                    className="form-select"
                    value={formData.impact}
                    onChange={e => setFormData({ ...formData, impact: parseInt(e.target.value) })}
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Owner</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.owner}
                  onChange={e => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Risk owner name"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddRisk}
                disabled={!formData.title}
              >
                Add Risk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RiskCell({ score, count }) {
  const getColor = () => {
    if (score >= 6) return { bg: '#FEE2E2', text: '#DC2626' }
    if (score >= 3) return { bg: '#FEF3C7', text: '#D97706' }
    return { bg: '#D1FAE5', text: '#059669' }
  }

  const colors = getColor()

  return (
    <div style={{
      background: colors.bg,
      color: colors.text,
      padding: '24px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      fontWeight: '600',
      minHeight: '80px'
    }}>
      {count}
    </div>
  )
}
