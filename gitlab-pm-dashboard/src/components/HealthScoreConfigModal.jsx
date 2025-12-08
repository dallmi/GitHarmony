import React, { useState, useEffect } from 'react'
import {
  HEALTH_SCORE_WEIGHTS,
  HEALTH_SCORE_AMPLIFIERS,
  HEALTH_THRESHOLDS,
  HEALTH_SCORE_TIMEFRAME
} from '../constants/config'

/**
 * Health Score Configuration Modal
 * Allows users to customize health score calculation parameters via UI
 */
export default function HealthScoreConfigModal({ isOpen, onClose, onSave }) {
  const [config, setConfig] = useState({
    weights: { ...HEALTH_SCORE_WEIGHTS },
    amplifiers: { ...HEALTH_SCORE_AMPLIFIERS },
    thresholds: { ...HEALTH_THRESHOLDS },
    timeframe: { ...HEALTH_SCORE_TIMEFRAME }
  })

  // Load saved config from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('healthScoreConfig')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConfig(parsed)
      } catch (e) {
        console.error('Failed to load health score config:', e)
      }
    }
  }, [isOpen])

  const handleSave = () => {
    // Validate weights sum to 1.0
    const weightSum = Object.values(config.weights).reduce((sum, w) => sum + w, 0)
    if (Math.abs(weightSum - 1.0) > 0.01) {
      alert('Weights must sum to 100% (1.0). Current sum: ' + (weightSum * 100).toFixed(1) + '%')
      return
    }

    // Save to localStorage
    localStorage.setItem('healthScoreConfig', JSON.stringify(config))
    onSave(config)
    onClose()
  }

  const handleReset = () => {
    const defaults = {
      weights: { ...HEALTH_SCORE_WEIGHTS },
      amplifiers: { ...HEALTH_SCORE_AMPLIFIERS },
      thresholds: { ...HEALTH_THRESHOLDS },
      timeframe: { ...HEALTH_SCORE_TIMEFRAME }
    }
    setConfig(defaults)
    localStorage.setItem('healthScoreConfig', JSON.stringify(defaults))
  }

  if (!isOpen) return null

  const weightSum = Object.values(config.weights).reduce((sum, w) => sum + w, 0)
  const isWeightValid = Math.abs(weightSum - 1.0) < 0.01

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
      zIndex: 1000
    }}>
      <div className="card" style={{
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            Health Score Configuration
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            ×
          </button>
        </div>

        {/* Weights Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Dimension Weights
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Adjust the importance of each health dimension. Total must equal 100%.
          </p>

          <div style={{ display: 'grid', gap: '12px' }}>
            {Object.entries(config.weights).map(([key, value]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', textTransform: 'capitalize' }}>
                  {key}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={value}
                  onChange={(e) => setConfig({
                    ...config,
                    weights: { ...config.weights, [key]: parseFloat(e.target.value) }
                  })}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={(value * 100).toFixed(0)}
                    onChange={(e) => {
                      const percent = parseFloat(e.target.value) || 0
                      const clamped = Math.max(0, Math.min(100, percent))
                      setConfig({
                        ...config,
                        weights: { ...config.weights, [key]: clamped / 100 }
                      })
                    }}
                    style={{
                      width: '60px',
                      padding: '4px 8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '4px',
                      textAlign: 'right'
                    }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>%</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: isWeightValid ? '#D1FAE5' : '#FEE2E2',
            border: `1px solid ${isWeightValid ? '#10B981' : '#EF4444'}`,
            borderRadius: '6px',
            fontSize: '13px',
            color: isWeightValid ? '#065F46' : '#991B1B'
          }}>
            Total: {(weightSum * 100).toFixed(1)}% {isWeightValid ? '✓' : '✗ Must equal 100%'}
          </div>
        </div>

        {/* Amplifiers Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Penalty Amplifiers
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Control how severely issues penalize the health score. Higher = more sensitive to problems.
          </p>

          <div style={{ display: 'grid', gap: '12px' }}>
            {Object.entries(config.amplifiers).map(([key, value]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', textTransform: 'capitalize' }}>
                  {key}
                </label>
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="50"
                  value={value}
                  onChange={(e) => setConfig({
                    ...config,
                    amplifiers: { ...config.amplifiers, [key]: parseInt(e.target.value) }
                  })}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>×</span>
                  <input
                    type="number"
                    min="100"
                    max="500"
                    step="10"
                    value={value}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 100
                      const clamped = Math.max(100, Math.min(500, val))
                      setConfig({
                        ...config,
                        amplifiers: { ...config.amplifiers, [key]: clamped }
                      })
                    }}
                    style={{
                      width: '60px',
                      padding: '4px 8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '4px',
                      textAlign: 'right'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic Impact Calculator */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: '#F0F9FF',
            border: '1px solid #3B82F6',
            borderRadius: '8px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF', marginBottom: '12px' }}>
              Impact Analysis
            </h4>

            {Object.entries(config.amplifiers).map(([key, amplifier]) => {
              // Calculate key thresholds
              const scoreZeroPercent = (100 / amplifier * 100).toFixed(1)
              const score50Percent = (50 / amplifier * 100).toFixed(1)

              // Calculate example percentages for common scenarios
              const at5Percent = (100 - (0.05 * amplifier)).toFixed(0)
              const at10Percent = Math.max(0, 100 - (0.10 * amplifier)).toFixed(0)

              return (
                <div key={key} style={{
                  marginBottom: key === 'risk' ? '0' : '12px',
                  paddingBottom: key === 'risk' ? '0' : '12px',
                  borderBottom: key === 'risk' ? 'none' : '1px solid #BFDBFE'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1E40AF', marginBottom: '6px', textTransform: 'capitalize' }}>
                    {key} (×{amplifier})
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#1E3A8A' }}>
                    <div>
                      <strong>{scoreZeroPercent}%</strong> {key} issues → score drops to <strong style={{ color: '#DC2626' }}>0</strong>
                    </div>
                    <div>
                      <strong>{score50Percent}%</strong> {key} issues → score drops to <strong style={{ color: '#D97706' }}>50</strong>
                    </div>
                    <div>
                      <strong>5%</strong> {key} issues → score: <strong style={{ color: at5Percent >= 80 ? '#059669' : at5Percent >= 60 ? '#D97706' : '#DC2626' }}>{at5Percent}</strong>
                    </div>
                    <div>
                      <strong>10%</strong> {key} issues → score: <strong style={{ color: at10Percent >= 80 ? '#059669' : at10Percent >= 60 ? '#D97706' : '#DC2626' }}>{at10Percent}</strong>
                    </div>
                  </div>
                </div>
              )
            })}

            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: '#DBEAFE',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#1E3A8A'
            }}>
              <strong>Tip:</strong> Lower amplifiers = more tolerant (need more issues to drop score).
              Higher amplifiers = stricter (fewer issues cause bigger penalties).
            </div>
          </div>
        </div>

        {/* Thresholds Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Status Thresholds
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Set the score boundaries for green/amber/red status indicators.
          </p>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>
                Green (Good)
              </label>
              <input
                type="range"
                min="60"
                max="100"
                step="5"
                value={config.thresholds.good}
                onChange={(e) => setConfig({
                  ...config,
                  thresholds: { ...config.thresholds, good: parseInt(e.target.value) }
                })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)' }}>≥</span>
                <input
                  type="number"
                  min="60"
                  max="100"
                  step="5"
                  value={config.thresholds.good}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 60
                    const clamped = Math.max(60, Math.min(100, val))
                    setConfig({
                      ...config,
                      thresholds: { ...config.thresholds, good: clamped }
                    })
                  }}
                  style={{
                    width: '50px',
                    padding: '4px 8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '4px',
                    textAlign: 'right',
                    color: 'var(--success)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>
                Amber (Warning)
              </label>
              <input
                type="range"
                min="30"
                max={config.thresholds.good - 5}
                step="5"
                value={config.thresholds.warning}
                onChange={(e) => setConfig({
                  ...config,
                  thresholds: { ...config.thresholds, warning: parseInt(e.target.value) }
                })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--warning)' }}>≥</span>
                <input
                  type="number"
                  min="30"
                  max={config.thresholds.good - 5}
                  step="5"
                  value={config.thresholds.warning}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 30
                    const maxVal = config.thresholds.good - 5
                    const clamped = Math.max(30, Math.min(maxVal, val))
                    setConfig({
                      ...config,
                      thresholds: { ...config.thresholds, warning: clamped }
                    })
                  }}
                  style={{
                    width: '50px',
                    padding: '4px 8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '4px',
                    textAlign: 'right',
                    color: 'var(--warning)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 80px', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>
                Red (Critical)
              </label>
              <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--danger)', borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)' }}>
                &lt;{config.thresholds.warning}
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Timeframe Mode
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Choose which issues to include in health score calculation.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="timeframe"
                value="iteration"
                checked={config.timeframe.mode === 'iteration'}
                onChange={(e) => setConfig({
                  ...config,
                  timeframe: { ...config.timeframe, mode: e.target.value }
                })}
              />
              <span style={{ fontSize: '14px' }}>Current Iteration/Sprint</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="timeframe"
                value="days"
                checked={config.timeframe.mode === 'days'}
                onChange={(e) => setConfig({
                  ...config,
                  timeframe: { ...config.timeframe, mode: e.target.value }
                })}
              />
              <span style={{ fontSize: '14px' }}>Last N Days</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="timeframe"
                value="all"
                checked={config.timeframe.mode === 'all'}
                onChange={(e) => setConfig({
                  ...config,
                  timeframe: { ...config.timeframe, mode: e.target.value }
                })}
              />
              <span style={{ fontSize: '14px' }}>All Issues</span>
            </label>
          </div>

          {config.timeframe.mode === 'days' && (
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>
                Days to include
              </label>
              <input
                type="range"
                min="7"
                max="365"
                step="7"
                value={config.timeframe.days}
                onChange={(e) => setConfig({
                  ...config,
                  timeframe: { ...config.timeframe, days: parseInt(e.target.value) }
                })}
                style={{ width: '100%' }}
              />
              <input
                type="number"
                min="7"
                max="365"
                step="7"
                value={config.timeframe.days}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 7
                  const clamped = Math.max(7, Math.min(365, val))
                  setConfig({
                    ...config,
                    timeframe: { ...config.timeframe, days: clamped }
                  })
                }}
                style={{
                  width: '60px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '4px',
                  textAlign: 'right'
                }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button
            className="btn"
            onClick={handleReset}
            style={{ background: 'var(--bg-secondary)' }}
          >
            Reset to Defaults
          </button>
          <button
            className="btn"
            onClick={onClose}
            style={{ background: 'var(--bg-secondary)' }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!isWeightValid}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}
