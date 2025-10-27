/**
 * Custom hook for risk management
 * Handles loading, saving, and updating risks with mitigation actions
 */

import { useState, useEffect, useCallback } from 'react'
import { loadRisks, saveRisks } from '../services/storageService'

export default function useRisks() {
  const [risks, setRisks] = useState([])

  // Load risks from localStorage on mount
  useEffect(() => {
    const savedRisks = loadRisks()
    setRisks(savedRisks)
  }, [])

  // Save risks to localStorage whenever they change
  useEffect(() => {
    if (risks.length > 0 || risks.length !== loadRisks().length) {
      saveRisks(risks)
    }
  }, [risks])

  // Add a new risk
  const addRisk = useCallback((risk) => {
    const newRisk = {
      id: Date.now().toString(),
      title: risk.title,
      description: risk.description,
      probability: risk.probability, // 1-3
      impact: risk.impact, // 1-3
      status: risk.status || 'open', // open, monitoring, closed
      owner: risk.owner || '',
      mitigations: []
    }

    setRisks(prev => [...prev, newRisk])
    return newRisk
  }, [])

  // Update existing risk
  const updateRisk = useCallback((riskId, updates) => {
    setRisks(prev => prev.map(risk =>
      risk.id === riskId
        ? { ...risk, ...updates }
        : risk
    ))
  }, [])

  // Delete a risk
  const deleteRisk = useCallback((riskId) => {
    setRisks(prev => prev.filter(risk => risk.id !== riskId))
  }, [])

  // Add mitigation action to a risk
  const addMitigation = useCallback((riskId, mitigation) => {
    const newMitigation = {
      id: Date.now().toString(),
      description: mitigation.description,
      owner: mitigation.owner || '',
      deadline: mitigation.deadline || null,
      status: mitigation.status || 'pending', // pending, in-progress, completed
      completedDate: null
    }

    setRisks(prev => prev.map(risk =>
      risk.id === riskId
        ? { ...risk, mitigations: [...risk.mitigations, newMitigation] }
        : risk
    ))

    return newMitigation
  }, [])

  // Update mitigation action
  const updateMitigation = useCallback((riskId, mitigationId, updates) => {
    setRisks(prev => prev.map(risk =>
      risk.id === riskId
        ? {
            ...risk,
            mitigations: risk.mitigations.map(m =>
              m.id === mitigationId
                ? { ...m, ...updates }
                : m
            )
          }
        : risk
    ))
  }, [])

  // Delete mitigation action
  const deleteMitigation = useCallback((riskId, mitigationId) => {
    setRisks(prev => prev.map(risk =>
      risk.id === riskId
        ? {
            ...risk,
            mitigations: risk.mitigations.filter(m => m.id !== mitigationId)
          }
        : risk
    ))
  }, [])

  // Calculate risk score (probability × impact)
  const getRiskScore = useCallback((risk) => {
    return risk.probability * risk.impact
  }, [])

  // Get risks by severity
  const getRisksBySeverity = useCallback(() => {
    const categorized = {
      high: risks.filter(r => getRiskScore(r) >= 6 && r.status === 'open'),
      medium: risks.filter(r => getRiskScore(r) >= 3 && getRiskScore(r) < 6 && r.status === 'open'),
      low: risks.filter(r => getRiskScore(r) < 3 && r.status === 'open')
    }

    return categorized
  }, [risks, getRiskScore])

  return {
    risks,
    addRisk,
    updateRisk,
    deleteRisk,
    addMitigation,
    updateMitigation,
    deleteMitigation,
    getRiskScore,
    getRisksBySeverity
  }
}
