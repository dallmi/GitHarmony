import React from 'react'
import RiskAnalysisView from './RiskAnalysisView'
import RiskRegisterView from './RiskRegisterView'
import useRisks from '../hooks/useRisks'
import { exportRisksToCSV, downloadCSV } from '../utils/csvExportUtils'

/**
 * Unified Risk Management View
 * Combines Risk Analysis (charts, RAG status) + Risk Register (CRUD table)
 * Consolidates 2 tabs into 1 comprehensive view
 */
export default function RiskManagementView({ epics, issues }) {
  const { risks } = useRisks()

  const handleExportCSV = () => {
    const csvContent = exportRisksToCSV(risks)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csvContent, `risk-register-${date}.csv`)
  }

  return (
    <div className="container-fluid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Risk Management
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Comprehensive risk analysis, tracking, and mitigation
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleExportCSV}
          disabled={!risks || risks.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>Export Risks CSV</span>
        </button>
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
            Risk Analysis & Trends
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
            Risk Register
          </h3>
        </div>
        <RiskRegisterView />
      </div>
    </div>
  )
}
