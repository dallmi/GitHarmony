import React, { createContext, useContext, useState, useMemo } from 'react'
import { getSprintFromLabels } from '../utils/labelUtils'

/**
 * Context for managing iteration filter state across all views
 */
const IterationFilterContext = createContext()

export function IterationFilterProvider({ children, issues }) {
  const [selectedIterations, setSelectedIterations] = useState([]) // Empty array = "All Iterations"

  // Extract all unique iterations from issues, sorted by start date (newest first)
  const availableIterations = useMemo(() => {
    if (!issues || issues.length === 0) return []

    const iterationMap = new Map()

    issues.forEach(issue => {
      const iterationName = getSprintFromLabels(issue.labels, issue.iteration)
      if (!iterationName) return

      if (!iterationMap.has(iterationName)) {
        const startDate = issue.iteration?.start_date
        const dueDate = issue.iteration?.due_date

        iterationMap.set(iterationName, {
          name: iterationName,
          startDate: startDate || null,
          dueDate: dueDate || null,
          issueCount: 0
        })
      }

      // Count issues per iteration
      const iteration = iterationMap.get(iterationName)
      iteration.issueCount++
    })

    // Convert to array and sort by start date (newest first)
    return Array.from(iterationMap.values()).sort((a, b) => {
      // If both have start dates, sort by date (newest first)
      if (a.startDate && b.startDate) {
        return new Date(b.startDate) - new Date(a.startDate)
      }

      // Items with dates come before items without dates
      if (a.startDate && !b.startDate) return -1
      if (!a.startDate && b.startDate) return 1

      // Fallback to alphabetical
      return a.name.localeCompare(b.name)
    })
  }, [issues])

  // Filter issues by selected iterations
  const filteredIssues = useMemo(() => {
    if (!issues) return []

    // If no iterations selected, return all issues
    if (selectedIterations.length === 0) return issues

    return issues.filter(issue => {
      const iterationName = getSprintFromLabels(issue.labels, issue.iteration)
      return iterationName && selectedIterations.includes(iterationName)
    })
  }, [issues, selectedIterations])

  const toggleIteration = (iterationName) => {
    setSelectedIterations(prev => {
      if (prev.includes(iterationName)) {
        // Remove iteration
        return prev.filter(name => name !== iterationName)
      } else {
        // Add iteration
        return [...prev, iterationName]
      }
    })
  }

  const selectAllIterations = () => {
    setSelectedIterations([])
  }

  const clearSelection = () => {
    setSelectedIterations([])
  }

  const value = {
    selectedIterations,
    availableIterations,
    filteredIssues,
    toggleIteration,
    selectAllIterations,
    clearSelection,
    isFiltered: selectedIterations.length > 0
  }

  return (
    <IterationFilterContext.Provider value={value}>
      {children}
    </IterationFilterContext.Provider>
  )
}

export function useIterationFilter() {
  const context = useContext(IterationFilterContext)
  if (!context) {
    throw new Error('useIterationFilter must be used within IterationFilterProvider')
  }
  return context
}
