/**
 * Color constants
 * UBS corporate design + clean professional palette
 */

export const COLORS = {
  // UBS Primary
  primary: '#E60000',
  primaryDark: '#B80000',
  primaryLight: '#FF3333',

  // Health/Status colors
  success: '#059669', // Green
  warning: '#D97706', // Amber
  danger: '#DC2626', // Red
  info: '#2563EB', // Blue

  // Background hierarchy
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8F9FA',
  bgTertiary: '#F3F4F6',
  bgHover: '#E5E7EB',

  // Text hierarchy
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textMuted: '#D1D5DB',

  // Borders
  borderLight: '#E5E7EB',
  borderMedium: '#D1D5DB',
  borderDark: '#9CA3AF',

  // Priority colors
  priorityHigh: '#DC2626',
  priorityMedium: '#D97706',
  priorityLow: '#059669',

  // State colors
  stateOpen: '#2563EB',
  stateClosed: '#059669',
  stateBlocked: '#DC2626',

  // Chart colors (for D3 visualizations)
  chart: [
    '#E60000', // UBS Red
    '#2563EB', // Blue
    '#059669', // Green
    '#D97706', // Amber
    '#7C3AED', // Purple
    '#DB2777', // Pink
    '#0891B2', // Cyan
    '#EA580C'  // Orange
  ]
}

/**
 * Get color by health score
 */
export function getHealthColor(score) {
  if (score >= 80) return COLORS.success
  if (score >= 60) return COLORS.warning
  return COLORS.danger
}

/**
 * Get color by priority
 */
export function getPriorityColor(priority) {
  const p = priority?.toLowerCase() || 'medium'
  if (p === 'high' || p === 'p1') return COLORS.priorityHigh
  if (p === 'low' || p === 'p3') return COLORS.priorityLow
  return COLORS.priorityMedium
}

/**
 * Get color by state
 */
export function getStateColor(state) {
  const s = state?.toLowerCase() || 'open'
  if (s === 'closed') return COLORS.stateClosed
  if (s === 'blocked') return COLORS.stateBlocked
  return COLORS.stateOpen
}
