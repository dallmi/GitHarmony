/**
 * Professional Design System
 * Inspired by clean, corporate design principles
 *
 * Color Philosophy:
 * - Primary: Red accent for important actions and highlights
 * - Neutral: Grays for structure, text, and backgrounds
 * - Status: Minimal use of semantic colors (success, warning, error)
 * - Avoid: Rainbow colors, excessive gradients, decorative colors
 */

export const colors = {
  // Primary Brand Color (Red accent)
  primary: {
    main: '#E60000',      // Professional red
    hover: '#CC0000',     // Darker red for hover
    light: '#FFE5E5',     // Light red background
    subtle: '#FFF5F5'     // Very subtle red tint
  },

  // Neutral Grays (Foundation)
  neutral: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',    // Background alternate
    gray100: '#F3F4F6',   // Light background
    gray200: '#E5E7EB',   // Borders, dividers
    gray300: '#D1D5DB',   // Input borders
    gray400: '#9CA3AF',   // Disabled text
    gray500: '#6B7280',   // Secondary text
    gray600: '#4B5563',   // Body text
    gray700: '#374151',   // Headings
    gray800: '#1F2937',   // Dark text
    gray900: '#111827'    // Darkest
  },

  // Semantic Status Colors (Minimal use)
  status: {
    success: '#059669',   // Green for completed
    successLight: '#D1FAE5',
    warning: '#D97706',   // Amber for warnings
    warningLight: '#FEF3C7',
    error: '#DC2626',     // Red for errors
    errorLight: '#FEE2E2',
    info: '#2563EB',      // Blue for info
    infoLight: '#DBEAFE'
  },

  // Chart/Data Visualization (Limited palette)
  chart: {
    primary: '#E60000',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    accent: '#2563EB'
  }
}

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
  },
  fontSize: {
    xs: '11px',
    sm: '13px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '24px',
    '3xl': '32px'
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75'
  }
}

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '48px'
}

export const borderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px'
}

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
}

/**
 * Component-specific tokens
 */
export const components = {
  button: {
    primary: {
      background: colors.primary.main,
      color: colors.neutral.white,
      hover: colors.primary.hover
    },
    secondary: {
      background: colors.neutral.gray100,
      color: colors.neutral.gray700,
      hover: colors.neutral.gray200
    },
    ghost: {
      background: 'transparent',
      color: colors.neutral.gray600,
      hover: colors.neutral.gray50
    }
  },
  card: {
    background: colors.neutral.white,
    border: colors.neutral.gray200,
    shadow: shadows.sm
  },
  input: {
    background: colors.neutral.white,
    border: colors.neutral.gray300,
    borderFocus: colors.primary.main,
    text: colors.neutral.gray800,
    placeholder: colors.neutral.gray400
  }
}

/**
 * Helper function to get status color
 */
export const getStatusColor = (status, variant = 'main') => {
  const statusMap = {
    success: colors.status.success,
    completed: colors.status.success,
    done: colors.status.success,
    warning: colors.status.warning,
    pending: colors.status.warning,
    error: colors.status.error,
    failed: colors.status.error,
    critical: colors.status.error,
    info: colors.status.info,
    default: colors.neutral.gray500
  }

  const color = statusMap[status?.toLowerCase()] || statusMap.default

  if (variant === 'light') {
    const lightMap = {
      [colors.status.success]: colors.status.successLight,
      [colors.status.warning]: colors.status.warningLight,
      [colors.status.error]: colors.status.errorLight,
      [colors.status.info]: colors.status.infoLight
    }
    return lightMap[color] || colors.neutral.gray50
  }

  return color
}

/**
 * Helper function for severity colors (Issue Quality)
 */
export const getSeverityColor = (severity) => {
  const map = {
    high: colors.status.error,
    medium: colors.status.warning,
    low: colors.neutral.gray500
  }
  return map[severity?.toLowerCase()] || colors.neutral.gray400
}
