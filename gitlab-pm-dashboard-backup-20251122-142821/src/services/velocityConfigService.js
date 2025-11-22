/**
 * Velocity Configuration Service
 * Manages velocity calculation settings in localStorage
 */

import { VELOCITY_CONFIG } from '../constants/config'

const VELOCITY_CONFIG_KEY = 'velocityConfig'

/**
 * Load velocity configuration from localStorage
 * Falls back to default config if not found
 * Handles migration for backward compatibility
 */
export function loadVelocityConfig() {
  try {
    const stored = localStorage.getItem(VELOCITY_CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)

      // Handle backward compatibility: if analyticsLookbackIterations doesn't exist,
      // use velocityLookbackIterations value for both
      if (parsed.velocityLookbackIterations !== undefined && parsed.analyticsLookbackIterations === undefined) {
        parsed.analyticsLookbackIterations = parsed.velocityLookbackIterations
      }

      // Merge with defaults to ensure all fields exist
      return {
        ...VELOCITY_CONFIG,
        ...parsed
      }
    }
  } catch (error) {
    console.error('Error loading velocity config:', error)
  }
  return { ...VELOCITY_CONFIG }
}

/**
 * Save velocity configuration to localStorage
 */
export function saveVelocityConfig(config) {
  try {
    localStorage.setItem(VELOCITY_CONFIG_KEY, JSON.stringify(config))

    // Dispatch custom event to notify components in the same tab
    window.dispatchEvent(new Event('velocityConfigChanged'))

    return true
  } catch (error) {
    console.error('Error saving velocity config:', error)
    return false
  }
}

/**
 * Reset velocity configuration to defaults
 */
export function resetVelocityConfig() {
  try {
    localStorage.removeItem(VELOCITY_CONFIG_KEY)

    // Dispatch custom event to notify components in the same tab
    window.dispatchEvent(new Event('velocityConfigChanged'))

    return { ...VELOCITY_CONFIG }
  } catch (error) {
    console.error('Error resetting velocity config:', error)
    return { ...VELOCITY_CONFIG }
  }
}
