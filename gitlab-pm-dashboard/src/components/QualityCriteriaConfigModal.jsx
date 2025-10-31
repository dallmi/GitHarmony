import React, { useState } from 'react'
import { loadCriteriaConfig, saveCriteriaConfig, resetCriteriaConfig } from '../services/criteriaConfigService'

/**
 * Quality Criteria Configuration Modal
 * Allows users to enable/disable criteria and adjust their severity
 */
export default function QualityCriteriaConfigModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(() => loadCriteriaConfig())
  const [hasChanges, setHasChanges] = useState(false)

  if (!isOpen) return null

  const handleToggleCriterion = (key) => {
    const newConfig = {
      ...config,
      criteria: {
        ...config.criteria,
        [key]: {
          ...config.criteria[key],
          enabled: !config.criteria[key].enabled
        }
      }
    }
    setConfig(newConfig)
    setHasChanges(true)
  }

  const handleChangeSeverity = (key, severity) => {
    const newConfig = {
      ...config,
      criteria: {
        ...config.criteria,
        [key]: {
          ...config.criteria[key],
          severity
        }
      }
    }
    setConfig(newConfig)
    setHasChanges(true)
  }

  const handleChangeThreshold = (key, value) => {
    const newConfig = {
      ...config,
      criteria: {
        ...config.criteria,
        [key]: {
          ...config.criteria[key],
          threshold: parseInt(value, 10)
        }
      }
    }
    setConfig(newConfig)
    setHasChanges(true)
  }

  const handleChangeStaleThresholds = (type, value) => {
    const newConfig = {
      ...config,
      staleThresholds: {
        ...config.staleThresholds,
        [type]: parseInt(value, 10)
      }
    }
    setConfig(newConfig)
    setHasChanges(true)
  }

  const handleSave = () => {
    saveCriteriaConfig(config)
    setHasChanges(false)
    onClose()
    // Reload page to apply new config
    window.location.reload()
  }

  const handleReset = () => {
    if (window.confirm('Reset to default quality criteria? This will remove all customizations.')) {
      resetCriteriaConfig()
      setConfig(loadCriteriaConfig())
      setHasChanges(true)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#DC2626'
      case 'medium': return '#F59E0B'
      case 'low': return '#6B7280'
      default: return '#6B7280'
    }
  }

  const criteriaList = Object.entries(config.criteria).map(([key, criterion]) => ({
    key,
    ...criterion
  }))

  const enabledCount = criteriaList.filter(c => c.enabled).length

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
              Quality Criteria Configuration
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>
              Enable/disable criteria and adjust severity levels
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Stats Bar */}
        <div style={{
          padding: '16px 24px',
          background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          gap: '24px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
              Active Criteria
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937' }}>
              {enabledCount} / {criteriaList.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
              Stale Warning
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#F59E0B' }}>
              {config.staleThresholds.warning}d
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
              Stale Critical
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#DC2626' }}>
              {config.staleThresholds.critical}d
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {/* Stale Thresholds */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1F2937' }}>
              Stale Issue Thresholds
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                  Warning (days)
                </label>
                <input
                  type="number"
                  value={config.staleThresholds.warning}
                  onChange={(e) => handleChangeStaleThresholds('warning', e.target.value)}
                  min="1"
                  max="365"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Issues open longer than this are marked as warnings
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                  Critical (days)
                </label>
                <input
                  type="number"
                  value={config.staleThresholds.critical}
                  onChange={(e) => handleChangeStaleThresholds('critical', e.target.value)}
                  min="1"
                  max="365"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Issues open longer than this are marked as critical
                </div>
              </div>
            </div>
          </div>

          {/* Quality Criteria List */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1F2937' }}>
              Quality Criteria
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {criteriaList.map(criterion => (
                <div
                  key={criterion.key}
                  style={{
                    padding: '16px',
                    background: criterion.enabled ? 'white' : '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    opacity: criterion.enabled ? 1 : 0.6,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {/* Enable/Disable Toggle */}
                    <div style={{ paddingTop: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={criterion.enabled}
                          onChange={() => handleToggleCriterion(criterion.key)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {/* Severity Indicator */}
                    <div style={{
                      width: '6px',
                      alignSelf: 'stretch',
                      background: getSeverityColor(criterion.severity),
                      borderRadius: '3px'
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '6px' }}>
                        {criterion.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                        {criterion.description}
                      </div>

                      {/* Controls Row */}
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Severity Selector */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <label style={{ fontSize: '12px', fontWeight: '500', color: '#6B7280' }}>
                            Severity:
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {['high', 'medium', 'low'].map(sev => (
                              <button
                                key={sev}
                                onClick={() => handleChangeSeverity(criterion.key, sev)}
                                disabled={!criterion.enabled}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  border: criterion.severity === sev ? '2px solid' : '1px solid',
                                  borderColor: criterion.severity === sev ? getSeverityColor(sev) : '#D1D5DB',
                                  borderRadius: '4px',
                                  background: criterion.severity === sev ? `${getSeverityColor(sev)}15` : 'white',
                                  color: criterion.severity === sev ? getSeverityColor(sev) : '#6B7280',
                                  cursor: criterion.enabled ? 'pointer' : 'not-allowed',
                                  textTransform: 'capitalize',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {sev}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Threshold Input (only for certain criteria) */}
                        {criterion.key === 'description' && criterion.threshold !== undefined && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '12px', fontWeight: '500', color: '#6B7280' }}>
                              Min length:
                            </label>
                            <input
                              type="number"
                              value={criterion.threshold}
                              onChange={(e) => handleChangeThreshold(criterion.key, e.target.value)}
                              disabled={!criterion.enabled}
                              min="1"
                              max="1000"
                              style={{
                                width: '70px',
                                padding: '4px 8px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            />
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>chars</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#DC2626',
              cursor: 'pointer'
            }}
          >
            Reset to Defaults
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'white',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              style={{
                padding: '10px 20px',
                background: hasChanges ? '#E60000' : '#D1D5DB',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                cursor: hasChanges ? 'pointer' : 'not-allowed'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
