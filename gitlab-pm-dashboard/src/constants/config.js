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

// Role-based view access control
export const USER_ROLES = {
  EXECUTIVE: 'executive',
  MANAGER: 'manager',
  TEAM: 'team'
}

// Grouped navigation structure for better UX
export const VIEW_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📊',
    views: [
      { id: 'executive', label: 'Dashboard', roles: ['executive', 'manager', 'team'] },
      { id: 'communications', label: 'Communications', roles: ['executive', 'manager'] },
      { id: 'insights', label: 'AI Insights', roles: ['executive', 'manager', 'team'] }
    ]
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: '🎯',
    views: [
      { id: 'portfolio', label: 'Portfolio', roles: ['executive', 'manager'] },
      { id: 'roadmap', label: 'Roadmap', roles: ['executive', 'manager', 'team'] },
      { id: 'epicmanagement', label: 'Epics', roles: ['manager', 'team'] }
    ]
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: '⚡',
    views: [
      { id: 'sprintmanagement', label: 'Sprints', roles: ['manager', 'team'] },
      { id: 'resources', label: 'Resources', roles: ['manager', 'team'] }
    ]
  },
  {
    id: 'analysis',
    label: 'Analytics',
    icon: '📈',
    views: [
      { id: 'velocity', label: 'Velocity', roles: ['manager', 'team'] },
      { id: 'cycletime', label: 'Cycle Time', roles: ['manager', 'team'] },
      { id: 'compliance', label: 'Quality', roles: ['manager', 'team'] }
    ]
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: '🛡️',
    views: [
      { id: 'riskmanagement', label: 'Risks', roles: ['executive', 'manager'] },
      { id: 'stakeholders', label: 'Stakeholders', roles: ['executive', 'manager'] }
    ]
  }
]

// Flatten all views for backward compatibility
export const VIEW_TABS = VIEW_GROUPS.flatMap(group =>
  group.views.map(view => ({
    id: view.id,
    label: view.label,
    group: group.id,
    groupLabel: group.label,
    roles: view.roles
  }))
)

export const LABEL_CONVENTIONS = {
  sprint: 'Sprint X',
  priority: 'Priority::High|Medium|Low',
  type: 'Type::Bug|Feature|Enhancement',
  blocker: 'Blocker'
}
