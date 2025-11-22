import React, { useState } from 'react'
import { debugEpicAccess, tryAlternativeEpicFetch } from '../services/debugGitlabApi'
import { loadConfig } from '../services/storageService'

/**
 * Epic Debugger Component
 * Helps diagnose why epics aren't loading
 */
export default function EpicDebugger({ onClose }) {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState(null)
  const [alternativeResults, setAlternativeResults] = useState(null)

  const handleDebugTest = async () => {
    setTesting(true)
    setResults(null)
    setAlternativeResults(null)

    const config = loadConfig()

    try {
      // Run main debug test
      const debugResults = await debugEpicAccess(
        config.gitlabUrl,
        config.groupPath,
        config.token
      )
      setResults(debugResults)

      // If epic API fails, try alternatives
      if (!debugResults.epicApiAvailable || debugResults.epicsFound === 0) {
        const altResults = await tryAlternativeEpicFetch(
          config.gitlabUrl,
          config.groupPath,
          config.token
        )
        setAlternativeResults(altResults)
      }
    } catch (error) {
      console.error('Debug test error:', error)
      setResults({ error: error.message })
    } finally {
      setTesting(false)
    }
  }

  const config = loadConfig()

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
      zIndex: 2000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2>Epic API Debugger</h2>
          <button
            onClick={onClose}
            style={{
              fontSize: '24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Current Configuration */}
        <div style={{
          background: '#F9FAFB',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>Current Configuration</h3>
          <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
            <div><strong>GitLab URL:</strong> {config.gitlabUrl}</div>
            <div><strong>Project ID:</strong> {config.projectId}</div>
            <div><strong>Group Path:</strong> {config.groupPath || '(not set)'}</div>
            <div><strong>Token:</strong> {config.token ? `${config.token.substring(0, 10)}...` : '(not set)'}</div>
          </div>
        </div>

        {/* Test Button */}
        <button
          onClick={handleDebugTest}
          disabled={testing}
          style={{
            padding: '12px 24px',
            background: testing ? '#6B7280' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: testing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '20px'
          }}
        >
          {testing ? 'Testing...' : 'Run Epic Debug Test'}
        </button>

        {/* Results */}
        {results && (
          <div>
            <h3>Test Results</h3>

            {/* Summary Status */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '12px',
                background: results.groupAccess ? '#D1FAE5' : '#FEE2E2',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                  {results.groupAccess ? '✅' : '❌'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Group Access</div>
              </div>

              <div style={{
                padding: '12px',
                background: results.epicApiAvailable ? '#D1FAE5' : '#FEE2E2',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                  {results.epicApiAvailable ? '✅' : '❌'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Epic API</div>
              </div>

              <div style={{
                padding: '12px',
                background: results.epicsFound > 0 ? '#D1FAE5' : '#FEF3C7',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                  {results.epicsFound > 0 ? '✅' : '⚠️'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>
                  {results.epicsFound} Epics Found
                </div>
              </div>
            </div>

            {/* API Response Details */}
            {results.apiResponses && results.apiResponses.length > 0 && (
              <div style={{
                background: '#F9FAFB',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h4 style={{ marginTop: 0 }}>API Responses</h4>
                {results.apiResponses.map((response, index) => (
                  <div key={index} style={{
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: index < results.apiResponses.length - 1 ? '1px solid #E5E7EB' : 'none'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      Method: {response.method}
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#6B7280' }}>
                      {response.url}
                    </div>
                    <div style={{
                      marginTop: '4px',
                      color: response.status === 200 ? '#10B981' : '#DC2626'
                    }}>
                      Status: {response.status}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Errors */}
            {results.errors && results.errors.length > 0 && (
              <div style={{
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{ marginTop: 0, color: '#DC2626' }}>Errors</h4>
                {results.errors.map((error, index) => (
                  <div key={index} style={{
                    marginBottom: '8px',
                    fontSize: '14px',
                    color: '#7F1D1D'
                  }}>
                    • {error}
                  </div>
                ))}
              </div>
            )}

            {/* Alternative Results */}
            {alternativeResults && alternativeResults.length > 0 && (
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{ marginTop: 0 }}>Alternative Group Paths Tested</h4>
                {alternativeResults.map((result, index) => (
                  <div key={index} style={{
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                      {result.path}
                    </div>
                    <div>
                      {result.success ? (
                        <span style={{ color: '#10B981' }}>
                          ✓ {result.epicCount} epics
                        </span>
                      ) : (
                        <span style={{ color: '#DC2626' }}>
                          ✗ Status {result.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #93C5FD',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h4 style={{ marginTop: 0, color: '#1E40AF' }}>Recommendations</h4>
              {!results.groupAccess && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Fix Group Access:</strong>
                  <ul style={{ marginTop: '4px' }}>
                    <li>Verify the group path is correct</li>
                    <li>Check if your token has access to this group</li>
                    <li>Try using a shorter parent group path</li>
                  </ul>
                </div>
              )}
              {results.groupAccess && !results.epicApiAvailable && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Epic API Not Available:</strong>
                  <ul style={{ marginTop: '4px' }}>
                    <li>Your GitLab might not have Premium/Ultimate license</li>
                    <li>Epic API might be disabled for this group</li>
                    <li>Try checking parent groups (shown above)</li>
                    <li>Contact your GitLab admin about epic access</li>
                  </ul>
                </div>
              )}
              {results.epicApiAvailable && results.epicsFound === 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>No Epics Found:</strong>
                  <ul style={{ marginTop: '4px' }}>
                    <li>Check if epics exist in the GitLab web interface</li>
                    <li>Verify you have permission to view epics in this group</li>
                    <li>Try disabling the 2025 date filter</li>
                    <li>Check if epics are in a parent or child group</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}