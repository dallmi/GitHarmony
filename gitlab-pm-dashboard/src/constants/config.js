/**
 * Application configuration constants
 */

export const APP_CONFIG = {
  name: 'GitLab Project Management Dashboard',
  version: '5.0.0',
  defaultGitLabUrl: 'https://gitlab.com',
}

export const HEALTH_SCORE_WEIGHTS = {
  completion: 0.3,
  schedule: 0.25,
  blockers: 0.25,
  risk: 0.2
}

export const HEALTH_THRESHOLDS = {
  good: 80,
  warning: 60
}

export const RISK_MATRIX = {
  probability: {
    low: 1,
    medium: 2,
    high: 3
  },
  impact: {
    low: 1,
    medium: 2,
    high: 3
  },
  thresholds: {
    high: 6, // >= 6 is high risk
    medium: 3 // >= 3 is medium risk
  }
}

export const VIEW_TABS = [
  { id: 'executive', label: 'Executive Dashboard' },
  { id: 'insights', label: 'AI Insights' },
  { id: 'compliance', label: 'Issue Quality' },
  { id: 'cycletime', label: 'Cycle Time' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'epics', label: 'Epic Portfolio' },
  { id: 'quarterly', label: 'Quarterly Tracker' },
  { id: 'gantt', label: 'Gantt Chart' },
  { id: 'riskanalysis', label: 'Risk Analysis' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'sprint', label: 'Sprint Board' },
  { id: 'velocity', label: 'Velocity & Burndown' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'risks', label: 'Risk Register' },
  { id: 'resources', label: 'Team Resources' },
  { id: 'stakeholders', label: 'Stakeholders' }
]

export const LABEL_CONVENTIONS = {
  sprint: 'Sprint X',
  priority: 'Priority::High|Medium|Low',
  type: 'Type::Bug|Feature|Enhancement',
  blocker: 'Blocker'
}
