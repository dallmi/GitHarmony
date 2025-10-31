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
  // Strategic Layer
  { id: 'executive', label: 'Executive Dashboard' },
  { id: 'epicmanagement', label: 'Epic Management' }, // CONSOLIDATED: Epic Portfolio + Quarterly + Gantt
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'riskmanagement', label: 'Risk Management' }, // CONSOLIDATED: Risk Analysis + Risk Register
  { id: 'portfolio', label: 'Portfolio' },

  // Tactical/Operational Layer
  { id: 'sprintmanagement', label: 'Sprint Management' }, // CONSOLIDATED: Sprint Board + Sprint Planning
  { id: 'velocity', label: 'Velocity & Metrics' },
  { id: 'compliance', label: 'Issue Quality' },
  { id: 'cycletime', label: 'Cycle Time' },

  // Support/Analysis
  { id: 'insights', label: 'AI Insights' },
  { id: 'resources', label: 'Team Resources' },
  { id: 'stakeholders', label: 'Stakeholders' }

  // REMOVED/CONSOLIDATED:
  // - dependencies → integrated into Gantt and Sprint views
  // - epics → merged into epicmanagement
  // - quarterly → merged into epicmanagement
  // - gantt → merged into epicmanagement
  // - riskanalysis → merged into riskmanagement
  // - risks → merged into riskmanagement
  // - sprint → merged into sprintmanagement
  // - sprintplanning → merged into sprintmanagement
]

export const LABEL_CONVENTIONS = {
  sprint: 'Sprint X',
  priority: 'Priority::High|Medium|Low',
  type: 'Type::Bug|Feature|Enhancement',
  blocker: 'Blocker'
}
