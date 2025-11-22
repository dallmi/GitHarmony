/**
 * Communications-Specific Metrics Service
 * Calculates metrics relevant to Internal Communications teams
 */

/**
 * Calculate communications-specific metrics from issues
 * Maps GitLab issue data to communications KPIs
 */
export function calculateCommunicationsMetrics(issues) {
  if (!issues || issues.length === 0) {
    return null
  }

  // Extract communications-specific labels and data
  const communicationsIssues = issues.filter(issue =>
    issue.labels?.some(label =>
      label.toLowerCase().includes('communication') ||
      label.toLowerCase().includes('comms') ||
      label.toLowerCase().includes('stakeholder') ||
      label.toLowerCase().includes('campaign')
    )
  )

  // Calculate reach metrics (based on custom fields or labels)
  const reachMetrics = calculateReachMetrics(issues)

  // Calculate engagement metrics
  const engagementMetrics = calculateEngagementMetrics(issues)

  // Calculate stakeholder satisfaction
  const stakeholderMetrics = calculateStakeholderMetrics(issues)

  // Calculate content metrics
  const contentMetrics = calculateContentMetrics(issues)

  // Calculate campaign performance
  const campaignMetrics = calculateCampaignMetrics(issues)

  return {
    reach: reachMetrics,
    engagement: engagementMetrics,
    stakeholder: stakeholderMetrics,
    content: contentMetrics,
    campaigns: campaignMetrics,
    totalCommunications: communicationsIssues.length,
    activeCommunications: communicationsIssues.filter(i => i.state === 'opened').length
  }
}

/**
 * Calculate reach metrics
 * Looks for custom fields or labels indicating audience size
 */
function calculateReachMetrics(issues) {
  let totalReach = 0
  let reachByChannel = {}

  issues.forEach(issue => {
    // Look for reach in description or custom fields
    const reachMatch = issue.description?.match(/reach[:\s]+(\d+)/i)
    if (reachMatch) {
      totalReach += parseInt(reachMatch[1], 10)
    }

    // Track by channel (email, intranet, teams, etc.)
    const channelLabels = issue.labels?.filter(label =>
      label.toLowerCase().includes('channel:') ||
      label.toLowerCase().includes('email') ||
      label.toLowerCase().includes('intranet') ||
      label.toLowerCase().includes('teams')
    )

    channelLabels?.forEach(channel => {
      const channelName = channel.replace(/channel:/i, '').trim()
      reachByChannel[channelName] = (reachByChannel[channelName] || 0) + 1
    })
  })

  return {
    totalReach,
    averageReach: issues.length > 0 ? Math.round(totalReach / issues.length) : 0,
    byChannel: reachByChannel
  }
}

/**
 * Calculate engagement metrics
 * Based on comments, reactions, and custom engagement fields
 */
function calculateEngagementMetrics(issues) {
  let totalComments = 0
  let totalUpvotes = 0
  let engagementRate = 0

  issues.forEach(issue => {
    totalComments += issue.user_notes_count || 0
    totalUpvotes += issue.upvotes || 0

    // Look for engagement rate in description
    const engagementMatch = issue.description?.match(/engagement[:\s]+(\d+\.?\d*)%/i)
    if (engagementMatch) {
      engagementRate += parseFloat(engagementMatch[1])
    }
  })

  return {
    totalComments,
    totalUpvotes,
    averageComments: issues.length > 0 ? (totalComments / issues.length).toFixed(1) : 0,
    averageEngagement: issues.length > 0 ? (engagementRate / issues.length).toFixed(1) : 0
  }
}

/**
 * Calculate stakeholder satisfaction metrics
 * Based on labels, feedback, and approval status
 */
function calculateStakeholderMetrics(issues) {
  const approvedCount = issues.filter(issue =>
    issue.labels?.some(label => label.toLowerCase().includes('approved'))
  ).length

  const feedbackPositive = issues.filter(issue =>
    issue.labels?.some(label =>
      label.toLowerCase().includes('positive feedback') ||
      label.toLowerCase().includes('stakeholder:satisfied')
    )
  ).length

  const feedbackNegative = issues.filter(issue =>
    issue.labels?.some(label =>
      label.toLowerCase().includes('negative feedback') ||
      label.toLowerCase().includes('stakeholder:concerns')
    )
  ).length

  const awaitingApproval = issues.filter(issue =>
    issue.labels?.some(label => label.toLowerCase().includes('approval pending')) &&
    issue.state === 'opened'
  ).length

  return {
    approvalRate: issues.length > 0 ? ((approvedCount / issues.length) * 100).toFixed(1) : 0,
    positiveCount: feedbackPositive,
    negativeCount: feedbackNegative,
    awaitingApproval,
    satisfactionRate: (feedbackPositive + feedbackNegative) > 0
      ? ((feedbackPositive / (feedbackPositive + feedbackNegative)) * 100).toFixed(1)
      : 0
  }
}

/**
 * Calculate content quality metrics
 * Based on review status, revisions, and compliance
 */
function calculateContentMetrics(issues) {
  const draftCount = issues.filter(issue =>
    issue.labels?.some(label => label.toLowerCase().includes('draft'))
  ).length

  const reviewCount = issues.filter(issue =>
    issue.labels?.some(label => label.toLowerCase().includes('in review'))
  ).length

  const publishedCount = issues.filter(issue =>
    issue.labels?.some(label => label.toLowerCase().includes('published'))
  ).length

  const complianceChecked = issues.filter(issue =>
    issue.labels?.some(label =>
      label.toLowerCase().includes('compliance:checked') ||
      label.toLowerCase().includes('legal:approved')
    )
  ).length

  return {
    draft: draftCount,
    inReview: reviewCount,
    published: publishedCount,
    complianceRate: issues.length > 0 ? ((complianceChecked / issues.length) * 100).toFixed(1) : 0,
    averageRevisions: calculateAverageRevisions(issues)
  }
}

/**
 * Calculate average revisions per communication
 */
function calculateAverageRevisions(issues) {
  let totalRevisions = 0

  issues.forEach(issue => {
    const revisionMatch = issue.description?.match(/revisions?[:\s]+(\d+)/i)
    if (revisionMatch) {
      totalRevisions += parseInt(revisionMatch[1], 10)
    }
  })

  return issues.length > 0 ? (totalRevisions / issues.length).toFixed(1) : 0
}

/**
 * Calculate campaign performance metrics
 */
function calculateCampaignMetrics(issues) {
  const campaigns = issues.filter(issue =>
    issue.labels?.some(label => label.toLowerCase().includes('campaign'))
  )

  const activeCampaigns = campaigns.filter(issue => issue.state === 'opened')
  const completedCampaigns = campaigns.filter(issue => issue.state === 'closed')

  // Track campaign success
  const successfulCampaigns = campaigns.filter(issue =>
    issue.labels?.some(label => label.toLowerCase().includes('campaign:success'))
  ).length

  return {
    total: campaigns.length,
    active: activeCampaigns.length,
    completed: completedCampaigns.length,
    successRate: campaigns.length > 0 ? ((successfulCampaigns / campaigns.length) * 100).toFixed(1) : 0
  }
}

/**
 * Get communications health score
 * Combines multiple metrics into an overall health score
 */
export function getCommunicationsHealthScore(metrics) {
  if (!metrics) return { score: 0, status: 'unknown' }

  // Weight different factors
  const weights = {
    stakeholderApproval: 0.3,
    stakeholderSatisfaction: 0.25,
    complianceRate: 0.25,
    campaignSuccess: 0.2
  }

  const score =
    (parseFloat(metrics.stakeholder.approvalRate) * weights.stakeholderApproval) +
    (parseFloat(metrics.stakeholder.satisfactionRate) * weights.stakeholderSatisfaction) +
    (parseFloat(metrics.content.complianceRate) * weights.complianceRate) +
    (parseFloat(metrics.campaigns.successRate) * weights.campaignSuccess)

  const roundedScore = Math.round(score)

  return {
    score: roundedScore,
    status: roundedScore >= 80 ? 'green' : roundedScore >= 60 ? 'amber' : 'red'
  }
}
