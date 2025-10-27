import React, { useState } from 'react'
import { generateStatusSummary, generateQuickSummary } from '../services/statusGeneratorService'

/**
 * Status Generator Modal
 * AI-powered project status summary generation
 */
export default function StatusGeneratorModal({
  show,
  onClose,
  projectId,
  stats,
  healthScore,
  issues,
  milestones,
  risks
}) {
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [useAI, setUseAI] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!show) return null

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setCopied(false)

    try {
      let result

      if (useAI) {
        // AI-powered generation
        result = await generateStatusSummary({
          projectId,
          stats,
          healthScore,
          issues,
          milestones,
          risks,
          apiKey
        })
      } else {
        // Quick summary (no AI)
        result = generateQuickSummary({
          projectId,
          stats,
          healthScore,
          issues,
          milestones,
          risks
        })
      }

      setStatus(result)
    } catch (err) {
      console.error('Status generation failed:', err)
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(status)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleClose = () => {
    setStatus('')
    setError(null)
    setCopied(false)
    onClose()
  }

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
        width: '100%',
        maxWidth: '800px',
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
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
              Generate Status Summary
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>
              Create a professional project status summary
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {/* AI Toggle */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#F3F4F6',
            borderRadius: '8px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                  Use AI-Powered Generation (Claude)
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  Requires Anthropic API key for enhanced summaries
                </div>
              </div>
            </label>

            {useAI && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: '6px' }}>
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  Get your API key from{' '}
                  <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB' }}>
                    console.anthropic.com
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          {!status && (
            <button
              onClick={handleGenerate}
              disabled={generating || (useAI && !apiKey)}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                opacity: (generating || (useAI && !apiKey)) ? 0.5 : 1
              }}
            >
              {generating ? '⏳ Generating...' : '✨ Generate Status Summary'}
            </button>
          )}

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '12px',
              background: '#FEE2E2',
              borderLeft: '4px solid #DC2626',
              borderRadius: '6px',
              marginTop: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#991B1B', marginBottom: '4px' }}>
                Error
              </div>
              <div style={{ fontSize: '13px', color: '#7F1D1D' }}>
                {error}
              </div>
            </div>
          )}

          {/* Generated Status */}
          {status && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                  Generated Summary
                </div>
                <button
                  onClick={handleCopy}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
                </button>
              </div>

              <div style={{
                padding: '16px',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#1F2937',
                whiteSpace: 'pre-wrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {status}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '10px',
                  fontSize: '14px'
                }}
              >
                🔄 Regenerate
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button onClick={handleClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
