/**
 * Workflow Intelligence Service
 * Analyzes sprint phases, role dependencies, and provides intelligent recommendations
 * for optimizing team velocity through phase-aware task assignment
 */

/**
 * Define workflow phases in typical agile development
 */
export const WORKFLOW_PHASES = {
  DISCOVERY: {
    name: 'Discovery',
    order: 1,
    description: 'Stakeholder conversations, requirement gathering',
    primaryRoles: ['Product Owner', 'Business Analyst', 'Initiative Manager'],
    supportingRoles: ['Scrum Master'],
    indicators: ['requirement', 'stakeholder', 'analysis', 'research', 'discovery', 'explore', 'investigate']
  },
  ANALYSIS: {
    name: 'Analysis',
    order: 2,
    description: 'Technical analysis, data assessment, solution design',
    primaryRoles: ['Business Analyst', 'Data Engineer', 'Developer'],
    supportingRoles: ['Product Owner', 'Initiative Manager'],
    indicators: ['analyze', 'design', 'architect', 'assess', 'evaluate', 'data analysis', 'technical design']
  },
  PLANNING: {
    name: 'Planning',
    order: 3,
    description: 'Sprint planning, task breakdown, estimation',
    primaryRoles: ['Scrum Master', 'Product Owner', 'Developer'],
    supportingRoles: ['Business Analyst', 'Initiative Manager'],
    indicators: ['plan', 'estimate', 'breakdown', 'story point', 'sprint planning']
  },
  IMPLEMENTATION: {
    name: 'Implementation',
    order: 4,
    description: 'Development, coding, building features',
    primaryRoles: ['Developer', 'Data Engineer', 'DevOps Engineer'],
    supportingRoles: ['SRE', 'QA Engineer'],
    indicators: ['implement', 'develop', 'code', 'build', 'create', 'feature', 'fix', 'refactor']
  },
  TESTING: {
    name: 'Testing',
    order: 5,
    description: 'Quality assurance, testing, validation',
    primaryRoles: ['QA Engineer', 'Developer'],
    supportingRoles: ['Business Analyst', 'Product Owner'],
    indicators: ['test', 'qa', 'validate', 'verify', 'quality', 'bug', 'defect']
  },
  DEPLOYMENT: {
    name: 'Deployment',
    order: 6,
    description: 'Release, deployment, monitoring',
    primaryRoles: ['DevOps Engineer', 'SRE'],
    supportingRoles: ['Developer', 'QA Engineer'],
    indicators: ['deploy', 'release', 'rollout', 'production', 'monitoring', 'ci/cd']
  }
}

/**
 * Role workflow capabilities
 * Defines what phases each role can effectively contribute to
 */
export const ROLE_WORKFLOW_CAPABILITIES = {
  'Developer': {
    primary: ['IMPLEMENTATION', 'TESTING'],
    secondary: ['ANALYSIS', 'PLANNING'],
    cannotDo: ['DISCOVERY']
  },
  'Data Engineer': {
    primary: ['IMPLEMENTATION', 'ANALYSIS'],
    secondary: ['TESTING', 'DEPLOYMENT'],
    cannotDo: ['DISCOVERY']
  },
  'Business Analyst': {
    primary: ['DISCOVERY', 'ANALYSIS'],
    secondary: ['PLANNING', 'TESTING'],
    cannotDo: ['IMPLEMENTATION', 'DEPLOYMENT']
  },
  'Product Owner': {
    primary: ['DISCOVERY', 'PLANNING'],
    secondary: ['ANALYSIS', 'TESTING'],
    cannotDo: ['IMPLEMENTATION', 'DEPLOYMENT']
  },
  'Initiative Manager': {
    primary: ['DISCOVERY'],
    secondary: ['ANALYSIS', 'PLANNING'],
    cannotDo: ['IMPLEMENTATION', 'TESTING', 'DEPLOYMENT']
  },
  'Scrum Master': {
    primary: ['PLANNING'],
    secondary: ['DISCOVERY'],
    cannotDo: ['IMPLEMENTATION', 'ANALYSIS', 'TESTING', 'DEPLOYMENT']
  },
  'QA Engineer': {
    primary: ['TESTING'],
    secondary: ['IMPLEMENTATION', 'DEPLOYMENT'],
    cannotDo: ['DISCOVERY', 'ANALYSIS']
  },
  'DevOps Engineer': {
    primary: ['DEPLOYMENT', 'IMPLEMENTATION'],
    secondary: ['TESTING'],
    cannotDo: ['DISCOVERY', 'ANALYSIS']
  },
  'SRE': {
    primary: ['DEPLOYMENT', 'IMPLEMENTATION'],
    secondary: ['TESTING'],
    cannotDo: ['DISCOVERY', 'ANALYSIS']
  }
}

/**
 * Detect the current phase of a sprint based on issue states and labels
 */
export function detectSprintPhase(issues) {
  if (!issues || issues.length === 0) return null

  const openIssues = issues.filter(i => i.state === 'opened')
  const closedIssues = issues.filter(i => i.state === 'closed')

  // Calculate completion percentage
  const completionPercentage = issues.length > 0
    ? (closedIssues.length / issues.length) * 100
    : 0

  // Analyze issue types and labels
  const phaseScores = {}

  Object.entries(WORKFLOW_PHASES).forEach(([key, phase]) => {
    phaseScores[key] = 0

    openIssues.forEach(issue => {
      const title = (issue.title || '').toLowerCase()
      const description = (issue.description || '').toLowerCase()
      const labels = (issue.labels || []).map(l => l.toLowerCase()).join(' ')
      const combined = `${title} ${description} ${labels}`

      // Check for phase indicators
      phase.indicators.forEach(indicator => {
        if (combined.includes(indicator.toLowerCase())) {
          phaseScores[key] += 1
        }
      })
    })
  })

  // Find dominant phase
  let dominantPhase = 'IMPLEMENTATION' // Default
  let maxScore = 0

  Object.entries(phaseScores).forEach(([key, score]) => {
    if (score > maxScore) {
      maxScore = score
      dominantPhase = key
    }
  })

  // Adjust based on completion percentage
  if (completionPercentage > 80) {
    dominantPhase = 'TESTING'
  } else if (completionPercentage > 90) {
    dominantPhase = 'DEPLOYMENT'
  } else if (completionPercentage < 10 && openIssues.length > 0) {
    // Early in sprint, check if mostly analysis/discovery work
    const analysisWork = openIssues.filter(i => {
      const labels = (i.labels || []).map(l => l.toLowerCase()).join(' ')
      return labels.includes('analysis') || labels.includes('discovery') || labels.includes('requirement')
    })

    if (analysisWork.length > openIssues.length * 0.5) {
      dominantPhase = 'ANALYSIS'
    }
  }

  return {
    current: dominantPhase,
    details: WORKFLOW_PHASES[dominantPhase],
    scores: phaseScores,
    completionPercentage: Math.round(completionPercentage)
  }
}

/**
 * Analyze backlog for suitable work based on role and current phase
 */
export function analyzeBacklogForRole(backlogIssues, role, currentPhase) {
  const capabilities = ROLE_WORKFLOW_CAPABILITIES[role]
  if (!capabilities) return []

  const suitableIssues = []

  backlogIssues.forEach(issue => {
    if (issue.state !== 'opened' || issue.assignees?.length > 0) return

    const title = (issue.title || '').toLowerCase()
    const description = (issue.description || '').toLowerCase()
    const labels = (issue.labels || []).map(l => l.toLowerCase()).join(' ')
    const combined = `${title} ${description} ${labels}`

    // Check each phase the role can work on
    const rolePhases = [...(capabilities.primary || []), ...(capabilities.secondary || [])]
    rolePhases.forEach(phaseKey => {
      const phase = WORKFLOW_PHASES[phaseKey]
      if (!phase) return

      let matchScore = 0
      phase.indicators.forEach(indicator => {
        if (combined.includes(indicator.toLowerCase())) {
          matchScore += 1
        }
      })

      if (matchScore > 0) {
        suitableIssues.push({
          issue,
          phase: phaseKey,
          matchScore,
          isPrimary: capabilities.primary.includes(phaseKey),
          reason: `Suitable for ${phase.name} work`
        })
      }
    })
  })

  // Sort by relevance (primary capability first, then by match score)
  suitableIssues.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1
    }
    return b.matchScore - a.matchScore
  })

  return suitableIssues.slice(0, 5) // Return top 5 suggestions
}

/**
 * Generate proactive recommendations for underutilized team members
 */
export function generateProactiveRecommendations(member, currentSprintPhase, backlogIssues, allMembers) {
  const recommendations = []
  const role = member.role || 'Developer'
  const capabilities = ROLE_WORKFLOW_CAPABILITIES[role]

  if (!capabilities) return recommendations

  // Check if member's role is optimal for current phase
  const isOptimalForCurrentPhase = capabilities.primary.includes(currentSprintPhase.current)
  const canContributeToCurrentPhase =
    isOptimalForCurrentPhase ||
    capabilities.secondary.includes(currentSprintPhase.current)

  // 1. If underutilized and can't contribute to current phase, suggest next sprint prep
  if (!canContributeToCurrentPhase && member.capacity.utilization < 50) {
    // Find next phase work
    const nextPhaseOrder = currentSprintPhase.details.order + 1
    const nextPhase = Object.values(WORKFLOW_PHASES).find(p => p.order === nextPhaseOrder)

    if (nextPhase && capabilities.primary.includes(Object.keys(WORKFLOW_PHASES).find(k => WORKFLOW_PHASES[k] === nextPhase))) {
      recommendations.push({
        type: 'PREPARE_NEXT_PHASE',
        priority: 'high',
        title: `Start ${nextPhase.name} for next sprint`,
        description: `As a ${role}, you can prepare for the upcoming ${nextPhase.name} phase while the team completes ${currentSprintPhase.details.name}`,
        impact: 'Accelerate next sprint startup',
        suggestedWork: analyzeBacklogForRole(backlogIssues, role, currentSprintPhase).slice(0, 3)
      })
    }
  }

  // 2. If underutilized but can contribute, suggest picking up backlog items
  if (canContributeToCurrentPhase && member.capacity.utilization < 60) {
    const backlogSuggestions = analyzeBacklogForRole(backlogIssues, role, currentSprintPhase)

    if (backlogSuggestions.length > 0) {
      recommendations.push({
        type: 'BACKLOG_PICKUP',
        priority: isOptimalForCurrentPhase ? 'high' : 'medium',
        title: `Pick up aligned backlog items`,
        description: `You have ${100 - member.capacity.utilization}% available capacity for additional ${currentSprintPhase.details.name} work`,
        impact: `Increase sprint velocity by ~${Math.round((100 - member.capacity.utilization) / 20)} story points`,
        suggestedWork: backlogSuggestions.slice(0, 3)
      })
    }
  }

  // 3. Cross-training opportunity
  if (member.capacity.utilization < 40 && !isOptimalForCurrentPhase) {
    // Find team members in primary roles who are overloaded
    const overloadedPrimaryMembers = allMembers.filter(m =>
      m.capacity.utilization > 80 &&
      ROLE_WORKFLOW_CAPABILITIES[m.role]?.primary.includes(currentSprintPhase.current)
    )

    if (overloadedPrimaryMembers.length > 0) {
      recommendations.push({
        type: 'CROSS_TRAINING',
        priority: 'low',
        title: 'Cross-training opportunity',
        description: `Shadow ${overloadedPrimaryMembers[0].name} to learn ${currentSprintPhase.details.name} skills`,
        impact: 'Build team resilience and flexibility',
        suggestedWork: []
      })
    }
  }

  // 4. Documentation and knowledge sharing
  if (member.capacity.utilization < 50) {
    recommendations.push({
      type: 'KNOWLEDGE_SHARING',
      priority: 'low',
      title: 'Document and share knowledge',
      description: `Use available capacity to document ${role} best practices or create knowledge base articles`,
      impact: 'Improve team knowledge and onboarding',
      suggestedWork: []
    })
  }

  return recommendations
}

/**
 * Calculate potential velocity increase from recommendations
 */
export function calculateVelocityImpact(recommendations, capacitySettings) {
  let potentialStoryPoints = 0
  let potentialHours = 0

  recommendations.forEach(rec => {
    if (rec.type === 'BACKLOG_PICKUP' && rec.suggestedWork) {
      rec.suggestedWork.forEach(work => {
        const weight = work.issue.weight || 0
        potentialStoryPoints += weight
        potentialHours += weight * (capacitySettings.hoursPerStoryPoint || 8)
      })
    }
  })

  return {
    storyPoints: potentialStoryPoints,
    hours: potentialHours,
    velocityIncrease: potentialStoryPoints > 0 ? `+${Math.round(potentialStoryPoints * 100 / 20)}%` : '0%'
  }
}

/**
 * Analyze team workflow efficiency
 */
export function analyzeWorkflowEfficiency(members, currentPhase, issues) {
  const phaseKey = currentPhase.current
  const phase = currentPhase.details

  // Count members optimally utilized for current phase
  const optimalMembers = members.filter(m => {
    const capabilities = ROLE_WORKFLOW_CAPABILITIES[m.role]
    return capabilities?.primary.includes(phaseKey)
  })

  const suboptimalMembers = members.filter(m => {
    const capabilities = ROLE_WORKFLOW_CAPABILITIES[m.role]
    return capabilities?.secondary.includes(phaseKey)
  })

  const mismatchedMembers = members.filter(m => {
    const capabilities = ROLE_WORKFLOW_CAPABILITIES[m.role]
    return capabilities?.cannotDo.includes(phaseKey)
  })

  // Calculate efficiency score
  const totalMembers = members.length
  const efficiencyScore = totalMembers > 0
    ? Math.round(((optimalMembers.length * 100) + (suboptimalMembers.length * 50)) / totalMembers)
    : 0

  return {
    phase: phase.name,
    efficiencyScore,
    optimal: optimalMembers.length,
    suboptimal: suboptimalMembers.length,
    mismatched: mismatchedMembers.length,
    recommendations: generateWorkflowRecommendations(
      efficiencyScore,
      optimalMembers,
      suboptimalMembers,
      mismatchedMembers,
      phase
    )
  }
}

/**
 * Generate workflow-based recommendations
 */
function generateWorkflowRecommendations(efficiencyScore, optimal, suboptimal, mismatched, phase) {
  const recommendations = []

  if (efficiencyScore < 50) {
    recommendations.push({
      severity: 'critical',
      title: 'Phase-Role Mismatch',
      description: `Only ${optimal.length} team members are optimally suited for current ${phase.name} phase`,
      action: 'Consider phase-appropriate task distribution or timeline adjustment'
    })
  }

  if (mismatched.length > 0) {
    recommendations.push({
      severity: 'warning',
      title: 'Underutilized Skills',
      description: `${mismatched.length} team members cannot contribute effectively to ${phase.name}`,
      action: 'Assign preparatory work for upcoming phases or cross-training'
    })
  }

  if (suboptimal.length > optimal.length) {
    recommendations.push({
      severity: 'info',
      title: 'Suboptimal Resource Allocation',
      description: `More team members in supporting roles than primary roles for ${phase.name}`,
      action: 'Consider skill development or team composition review'
    })
  }

  return recommendations
}