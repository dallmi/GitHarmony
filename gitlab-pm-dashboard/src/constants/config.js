/**
 * Application configuration constants
 */

export const APP_CONFIG = {
  name: 'GitLab Project Management Dashboard',
  version: '5.0.0',
  defaultGitLabUrl: 'https://gitlab.com',
}

// Health Score Configuration (can be overridden via UI)
export const HEALTH_SCORE_WEIGHTS = {
  completion: 0.3,
  schedule: 0.25,
  blockers: 0.25,
  risk: 0.2
}

export const HEALTH_SCORE_AMPLIFIERS = {
  schedule: 200,  // Multiplier for overdue issues penalty
  blockers: 300,  // Multiplier for blocker issues penalty
  risk: 200       // Multiplier for at-risk issues penalty
}

export const HEALTH_THRESHOLDS = {
  good: 80,
  warning: 60
}

// Timeframe for health score calculation
export const HEALTH_SCORE_TIMEFRAME = {
  mode: 'iteration', // 'iteration', 'days', 'all'
  days: 90           // Used when mode = 'days'
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
    views: [
      { id: 'executive', label: 'Dashboard', roles: ['executive', 'manager', 'team'] }
    ]
  },
  {
    id: 'planning',
    label: 'Planning',
    views: [
      { id: 'roadmap', label: 'Milestones', roles: ['executive', 'manager', 'team'] },
      { id: 'epicmanagement', label: 'Epics', roles: ['manager', 'team'] },
      { id: 'releases', label: 'Releases', roles: ['executive', 'manager', 'team'] },
      { id: 'crossteam', label: 'Cross-Team Coordination', roles: ['executive', 'manager'] }
    ]
  },
  {
    id: 'execution',
    label: 'Execution',
    views: [
      { id: 'sprintmanagement', label: 'Sprints', roles: ['manager', 'team'] },
      { id: 'teammanagement', label: 'Team Management', roles: ['manager', 'team'] }
    ]
  },
  {
    id: 'analysis',
    label: 'Analytics',
    views: [
      { id: 'velocity', label: 'Velocity', roles: ['manager', 'team'] },
      { id: 'cycletime', label: 'Cycle Time', roles: ['manager', 'team'] },
      { id: 'compliance', label: 'Quality', roles: ['manager', 'team'] }
    ]
  },
  {
    id: 'governance',
    label: 'Governance',
    views: [
      { id: 'riskmanagement', label: 'Risks', roles: ['executive', 'manager'] },
      { id: 'stakeholders', label: 'Communication Hub', roles: ['executive', 'manager'] },
      { id: 'backup', label: 'Backup & Restore', roles: ['executive', 'manager', 'team'] }
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
  blocker: 'Blocker',
  initiative: 'initiative::initiative-name',
  team: 'team::team-name',
  squad: 'squad::squad-name',
  storyPoints: 'sp::number'
}

// Velocity-based capacity calculation configuration
export const VELOCITY_CONFIG = {
  // Mode: 'dynamic' uses historical velocity, 'static' uses fixed hours per SP
  mode: 'dynamic', // 'dynamic' or 'static'

  // Metric: 'points' or 'issues' - what to base velocity on (matches VelocityView)
  metricType: 'points', // 'points' or 'issues'

  // Static hours per story point (used when mode = 'static' or as fallback)
  staticHoursPerStoryPoint: 6,

  // Static hours per issue (used when metricType = 'issues')
  staticHoursPerIssue: 8,

  // Number of iterations to analyze for velocity calculation
  velocityLookbackIterations: 3,

  // Minimum iterations required to use individual velocity (otherwise use team average)
  minIterationsForIndividualVelocity: 2
}
