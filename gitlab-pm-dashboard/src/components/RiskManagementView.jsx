import React from 'react'
import RiskAnalysisView from './RiskAnalysisView'
import RiskRegisterView from './RiskRegisterView'

/**
 * Unified Risk Management View
 * Combines Risk Analysis (charts, RAG status) + Risk Register (CRUD table)
 * Consolidates 2 tabs into 1 comprehensive view
 */
export default function RiskManagementView({ epics, issues }) {
  return (
    <div className="container-fluid">
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Risk Management
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Comprehensive risk analysis, tracking, and mitigation
        </p>
      </div>

      {/* Risk Analysis Section (Top) */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{
          padding: '12px 16px',
          background: '#F9FAFB',
          borderBottom: '2px solid #E60000',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
            📊 Risk Analysis & Trends
          </h3>
        </div>
        <RiskAnalysisView epics={epics} issues={issues} />
      </div>

      {/* Risk Register Section (Bottom) */}
      <div>
        <div style={{
          padding: '12px 16px',
          background: '#F9FAFB',
          borderBottom: '2px solid #E60000',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
            📋 Risk Register
          </h3>
        </div>
        <RiskRegisterView />
      </div>
    </div>
  )
}
