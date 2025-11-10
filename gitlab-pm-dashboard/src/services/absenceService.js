/**
 * Absence Management Service
 * Handles team member absences, holidays, and capacity impact calculations
 * Integrates with sprint capacity planning for enterprise-grade resource management
 * Now project-aware: stores separate absence data per project
 */

import { getActiveProjectId } from './storageService'

const STORAGE_KEY = 'gitlab-pm-absences'

/**
 * Get project-specific key for localStorage
 * @param {string} baseKey - Base key name
 * @returns {string} Project-specific key
 */
function getProjectKey(baseKey) {
  const projectId = getActiveProjectId()

  // If no active project or cross-project view, use global key
  if (!projectId || projectId === 'cross-project') {
    return baseKey
  }

  return `${baseKey}_${projectId}`
}

/**
 * Load all absences from storage (project-specific)
 * @returns {Object} Absence data structure
 */
export function loadAbsences() {
  try {
    const stored = localStorage.getItem(getProjectKey(STORAGE_KEY))
    if (stored) {
      const data = JSON.parse(stored)
      // Convert date strings back to Date objects
      if (data.absences) {
        data.absences = data.absences.map(absence => ({
          ...absence,
          startDate: new Date(absence.startDate),
          endDate: new Date(absence.endDate)
        }))
      }
      return data
    }
  } catch (error) {
    console.error('Error loading absences:', error)
  }

  return {
    absences: [],
    lastModified: new Date().toISOString()
  }
}

/**
 * Load absences across all projects (for cross-project view)
 * @returns {Array} Array of all absences with project metadata
 */
export function loadAllProjectAbsences() {
  const allAbsences = []

  // Get all keys from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_KEY)) {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const data = JSON.parse(stored)
          if (data.absences) {
            // Extract project ID from key
            const projectId = key === STORAGE_KEY ? 'default' : key.replace(`${STORAGE_KEY}_`, '')

            const absences = data.absences.map(absence => ({
              ...absence,
              startDate: new Date(absence.startDate),
              endDate: new Date(absence.endDate),
              _projectId: projectId
            }))
            allAbsences.push(...absences)
          }
        }
      } catch (error) {
        console.error(`Error loading absences from ${key}:`, error)
      }
    }
  }

  return allAbsences
}

/**
 * Save absences to storage (project-specific)
 * @param {Object} absenceData - Absence data to save
 */
export function saveAbsences(absenceData) {
  try {
    const toSave = {
      ...absenceData,
      lastModified: new Date().toISOString()
    }
    localStorage.setItem(getProjectKey(STORAGE_KEY), JSON.stringify(toSave))
    return true
  } catch (error) {
    console.error('Error saving absences:', error)
    return false
  }
}

/**
 * Add or update an absence
 * @param {String} username - Team member username
 * @param {Date} startDate - Start date of absence
 * @param {Date} endDate - End date of absence
 * @param {String} reason - Reason for absence (e.g., "Vacation", "Conference")
 * @param {String} type - Type: vacation, sick, conference, training, other
 */
export function addAbsence(username, startDate, endDate, reason = '', type = 'vacation') {
  const data = loadAbsences()

  // Normalize dates to midnight
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

  const absence = {
    id: `${username}-${normalizedStart.getTime()}-${normalizedEnd.getTime()}`,
    username,
    startDate: normalizedStart,
    endDate: normalizedEnd,
    reason,
    type,
    createdAt: new Date().toISOString()
  }

  // Remove any overlapping absences for this user
  data.absences = data.absences.filter(a =>
    a.username !== username ||
    !datesOverlap(a.startDate, a.endDate, normalizedStart, normalizedEnd)
  )

  data.absences.push(absence)
  saveAbsences(data)

  return absence
}

/**
 * Remove an absence by ID
 * @param {String} absenceId - Absence ID to remove
 */
export function removeAbsence(absenceId) {
  const data = loadAbsences()
  data.absences = data.absences.filter(a => a.id !== absenceId)
  saveAbsences(data)
}

/**
 * Get absences for a specific user
 * @param {String} username - Team member username
 * @param {Date} startDate - Optional: filter from this date
 * @param {Date} endDate - Optional: filter to this date
 * @returns {Array} Array of absences
 */
export function getUserAbsences(username, startDate = null, endDate = null) {
  const data = loadAbsences()
  let absences = data.absences.filter(a => a.username === username)

  if (startDate || endDate) {
    absences = absences.filter(absence => {
      if (startDate && absence.endDate < startDate) return false
      if (endDate && absence.startDate > endDate) return false
      return true
    })
  }

  return absences.sort((a, b) => a.startDate - b.startDate)
}

/**
 * Get all absences within a date range
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {Array} Array of absences
 */
export function getAbsencesInRange(startDate, endDate) {
  const data = loadAbsences()
  return data.absences.filter(absence =>
    absence.startDate <= endDate && absence.endDate >= startDate
  ).sort((a, b) => a.startDate - b.startDate)
}

/**
 * Check if two date ranges overlap
 * @param {Date} start1 - First range start
 * @param {Date} end1 - First range end
 * @param {Date} start2 - Second range start
 * @param {Date} end2 - Second range end
 * @returns {Boolean} True if ranges overlap
 */
function datesOverlap(start1, end1, start2, end2) {
  return start1 <= end2 && start2 <= end1
}

/**
 * Calculate working days between two dates (excluding weekends)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Number} Number of working days
 */
export function calculateWorkingDays(startDate, endDate) {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Calculate working hours lost due to absences within a date range
 * @param {String} username - Team member username
 * @param {Date} rangeStart - Range start date
 * @param {Date} rangeEnd - Range end date
 * @param {Number} defaultWeeklyCapacity - Default weekly capacity in hours
 * @returns {Number} Hours lost due to absences
 */
export function calculateAbsenceImpact(username, rangeStart, rangeEnd, defaultWeeklyCapacity) {
  const absences = getUserAbsences(username, rangeStart, rangeEnd)
  let totalWorkingDaysOff = 0

  absences.forEach(absence => {
    // Calculate overlap between absence and range
    const overlapStart = absence.startDate > rangeStart ? absence.startDate : rangeStart
    const overlapEnd = absence.endDate < rangeEnd ? absence.endDate : rangeEnd

    const workingDays = calculateWorkingDays(overlapStart, overlapEnd)
    totalWorkingDaysOff += workingDays
  })

  // Convert working days to hours
  // Assuming 5-day work week: weeklyCapacity / 5 = daily capacity
  const dailyCapacity = defaultWeeklyCapacity / 5
  return Math.round(totalWorkingDaysOff * dailyCapacity * 10) / 10
}

/**
 * Calculate adjusted capacity for a sprint considering absences
 * @param {String} username - Team member username
 * @param {Object} sprint - Sprint object with startDate and dueDate
 * @param {Number} defaultWeeklyCapacity - Default weekly capacity
 * @returns {Object} { adjustedCapacity, hoursLost, workingDaysLost, absences }
 */
export function calculateSprintCapacityWithAbsences(username, sprint, defaultWeeklyCapacity) {
  if (!sprint.startDate || !sprint.dueDate) {
    return {
      adjustedCapacity: defaultWeeklyCapacity,
      hoursLost: 0,
      workingDaysLost: 0,
      absences: []
    }
  }

  const sprintStart = new Date(sprint.startDate)
  const sprintEnd = new Date(sprint.dueDate)

  const absences = getUserAbsences(username, sprintStart, sprintEnd)
  const sprintWorkingDays = calculateWorkingDays(sprintStart, sprintEnd)
  const hoursLost = calculateAbsenceImpact(username, sprintStart, sprintEnd, defaultWeeklyCapacity)

  // Calculate working days lost
  let workingDaysLost = 0
  absences.forEach(absence => {
    const overlapStart = absence.startDate > sprintStart ? absence.startDate : sprintStart
    const overlapEnd = absence.endDate < sprintEnd ? absence.endDate : sprintEnd
    workingDaysLost += calculateWorkingDays(overlapStart, overlapEnd)
  })

  // Calculate adjusted capacity
  // Sprint capacity = (working days in sprint / 5) * weekly capacity - hours lost
  const sprintWeeks = sprintWorkingDays / 5
  const totalSprintCapacity = sprintWeeks * defaultWeeklyCapacity
  const adjustedCapacity = Math.max(0, totalSprintCapacity - hoursLost)

  return {
    adjustedCapacity: Math.round(adjustedCapacity * 10) / 10,
    hoursLost: Math.round(hoursLost * 10) / 10,
    workingDaysLost,
    absences,
    sprintWorkingDays,
    sprintWeeks: Math.round(sprintWeeks * 10) / 10
  }
}

/**
 * Get absence statistics for a team
 * @param {Array} teamMembers - Array of team member objects
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {Object} Statistics
 */
export function getTeamAbsenceStats(teamMembers, startDate, endDate) {
  const absences = getAbsencesInRange(startDate, endDate)

  const stats = {
    totalAbsences: absences.length,
    byMember: {},
    byType: {
      vacation: 0,
      sick: 0,
      conference: 0,
      training: 0,
      other: 0
    },
    totalDaysOff: 0,
    totalHoursImpact: 0
  }

  teamMembers.forEach(member => {
    const memberAbsences = absences.filter(a => a.username === member.username)
    // Use member's actual capacity - if undefined/null use 40, but allow 0
    const memberCapacity = member.defaultCapacity !== undefined && member.defaultCapacity !== null ? member.defaultCapacity : 40
    const hoursLost = calculateAbsenceImpact(
      member.username,
      startDate,
      endDate,
      memberCapacity
    )

    stats.byMember[member.username] = {
      absenceCount: memberAbsences.length,
      hoursLost: hoursLost,
      absences: memberAbsences
    }

    stats.totalHoursImpact += hoursLost

    memberAbsences.forEach(absence => {
      const days = calculateWorkingDays(
        absence.startDate > startDate ? absence.startDate : startDate,
        absence.endDate < endDate ? absence.endDate : endDate
      )
      stats.totalDaysOff += days
      stats.byType[absence.type] = (stats.byType[absence.type] || 0) + 1
    })
  })

  return stats
}

/**
 * Import absences from CSV
 * Format: username,startDate,endDate,reason,type
 * @param {String} csvContent - CSV content
 * @returns {Object} { imported: number, errors: array }
 */
export function importAbsencesFromCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim())
  const results = { imported: 0, errors: [] }

  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('username') ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    try {
      const [username, startDate, endDate, reason, type] = lines[i].split(',').map(s => s.trim())

      if (!username || !startDate || !endDate) {
        results.errors.push(`Line ${i + 1}: Missing required fields`)
        continue
      }

      const start = new Date(startDate)
      const end = new Date(endDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        results.errors.push(`Line ${i + 1}: Invalid date format`)
        continue
      }

      addAbsence(username, start, end, reason || '', type || 'vacation')
      results.imported++
    } catch (error) {
      results.errors.push(`Line ${i + 1}: ${error.message}`)
    }
  }

  return results
}

/**
 * Export absences to CSV
 * @param {Date} startDate - Optional: filter from this date
 * @param {Date} endDate - Optional: filter to this date
 * @returns {String} CSV content
 */
export function exportAbsencesToCSV(startDate = null, endDate = null) {
  const data = loadAbsences()
  let absences = data.absences

  if (startDate || endDate) {
    absences = absences.filter(absence => {
      if (startDate && absence.endDate < startDate) return false
      if (endDate && absence.startDate > endDate) return false
      return true
    })
  }

  const header = 'Username,Start Date,End Date,Reason,Type,Created At\n'
  const rows = absences.map(a => {
    const start = a.startDate.toISOString().split('T')[0]
    const end = a.endDate.toISOString().split('T')[0]
    const created = new Date(a.createdAt).toISOString().split('T')[0]
    return `${a.username},${start},${end},"${a.reason}",${a.type},${created}`
  }).join('\n')

  return header + rows
}
