# Cross-Team Coordination Features

## Overview

The Cross-Team Coordination view provides comprehensive tools for managing multi-team strategic initiatives. It combines team attribution, dependency analysis, and timeline forecasting to help you answer critical questions about cross-team work.

## Key Features

### 1. Team Attribution & Capacity Management

**What It Does:**
- Identifies which teams are working on which initiatives
- Tracks team workload and capacity
- Detects overloaded teams
- Shows multi-team initiatives

**How It Works:**
- Parses labels: `team::backend`, `team::frontend`, `squad::platform`
- Aggregates issues by team across initiatives
- Calculates capacity scores based on active initiatives and open issues
- Identifies teams at risk of burnout

**Use Cases:**
- **Resource Planning**: "Can Team Alpha take on another initiative?"
- **Load Balancing**: "Which teams are overloaded and need help?"
- **Multi-Team Coordination**: "Which initiatives require multiple teams?"

### 2. Cross-Initiative Dependencies

**What It Does:**
- Detects dependencies between initiatives (not just issues)
- Identifies blocking initiatives
- Calculates cascade impact of delays
- Provides dependency matrix view

**How It Works:**
- Analyzes issue-level dependencies using existing `depends on #123` patterns
- Rolls up to initiative level
- Calculates severity based on:
  - Number of open dependencies
  - Status of blocking initiative
  - Progress of blocking initiative

**Use Cases:**
- **Critical Path**: "What's the longest dependency chain?"
- **Impact Analysis**: "If Initiative X is delayed 2 weeks, what else shifts?"
- **Prioritization**: "Which initiative should we accelerate to unblock others?"

### 3. Timeline Forecasting

**What It Does:**
- Predicts realistic completion dates based on velocity
- Compares forecast vs due date
- Provides confidence intervals
- Calculates optimistic/pessimistic scenarios

**How It Works:**
- Analyzes historical velocity (issues/week or story points/week)
- Calculates remaining work
- Projects completion date with confidence levels
- Identifies at-risk initiatives

**Use Cases:**
- **Realistic Planning**: "When will we really finish, not when we hope to?"
- **Risk Identification**: "Which initiatives are forecast to miss their due dates?"
- **Confidence Assessment**: "How confident are we in this forecast?"

### 4. Resource Contention Detection

**What It Does:**
- Identifies people assigned to multiple high-priority initiatives
- Calculates contention levels
- Shows cross-initiative resource overlap

**How It Works:**
- Tracks assignees across all open issues
- Counts how many initiatives each person is working on
- Flags people with 3+ initiatives or 2+ high-priority initiatives
- Calculates contention score (0-100)

**Use Cases:**
- **Burnout Prevention**: "Who is spread too thin across initiatives?"
- **Dependency Risk**: "Are key people single points of failure?"
- **Resource Reallocation**: "Who should we move off Initiative X?"

## Label Conventions

To get the most out of these features, use these label conventions:

### Required Labels

```
initiative::platform-modernization
initiative::customer-portal
initiative::api-v2
```

- Groups epics into strategic initiatives
- Multiple epics can have the same initiative label
- Use kebab-case for initiative names

### Team Labels

```
team::backend
team::frontend
team::devops
team::data-engineering
squad::platform
squad::growth
```

- Identifies which team owns the issue
- One issue = one team (typically)
- Use either `team::` or `squad::` prefix

### Story Points (Optional)

```
sp::1
sp::2
sp::3
sp::5
sp::8
sp::13
```

- Enables story point-based forecasting
- More accurate than issue count
- Follows fibonacci sequence

### Priority Labels

```
priority::high
priority::critical
priority::medium
priority::low
```

- Used for resource contention analysis
- High/critical priorities trigger alerts

## Views & Tabs

### Overview Tab

**Purpose**: Executive-level summary of cross-team coordination

**Metrics:**
- Total initiatives
- Teams involved
- At-risk forecasts
- Resource conflicts

**Key Sections:**
- **Blocking Initiatives**: Initiatives that are blocking others
- **Overloaded Teams**: Teams at or above capacity

**Export**: None (overview only)

### Teams Tab

**Purpose**: Detailed team capacity and attribution analysis

**Shows:**
- Team capacity status (Available / At Capacity / Overloaded)
- Active initiative count per team
- Open issue count
- Completion rate
- Capacity score (0-100)
- List of initiatives each team is working on

**Exports:**
- **Team Attribution CSV**: Initiative → Team mapping
- **Team Capacity CSV**: Team workload and capacity metrics

**Example Use Case:**
> "Team Backend is overloaded with 4 active initiatives and 45 open issues. They're at capacity score 85/100. We should defer Initiative X to next quarter."

### Dependencies Tab

**Purpose**: Cross-initiative dependency analysis

**Shows:**
- Which initiatives depend on which
- Dependency counts (total and open)
- Severity levels (High / Medium / Low)
- Blocking status

**Export:**
- **Initiative Dependencies CSV**: Full dependency matrix

**Example Use Case:**
> "Initiative 'API V2' depends on 'Platform Modernization' with 8 open dependencies marked as High severity. We need to prioritize Platform Modernization to unblock API V2."

### Forecasts Tab

**Purpose**: Timeline forecasting with velocity-based projections

**Shows:**
- Due date vs forecast date
- Gap in weeks (early/late)
- Confidence level (0-100%)
- Velocity metrics
- Optimistic/pessimistic scenarios

**Forecast Statuses:**
- **On Track**: Forecast within 1 week of due date
- **Minor Delay**: Forecast 1-2 weeks late
- **At Risk**: Forecast 2+ weeks late
- **Ahead**: Forecast 2+ weeks early

**Export:**
- **Initiative Forecasts CSV**: All forecast data

**Example Use Case:**
> "Initiative 'Customer Portal' has a due date of March 15 but forecasts completion on April 2 (18 days late) with 65% confidence. Velocity is 3.2 issues/week. Range: 10-16 weeks remaining."

### Resources Tab

**Purpose**: Resource contention and conflict detection

**Shows:**
- People assigned to multiple initiatives
- Contention level (0-100)
- Initiative count
- High-priority initiative count
- Teams they work with

**Contention Levels:**
- **Critical** (70-100): Immediate action needed
- **High** (40-69): Monitor closely
- **Medium** (0-39): Acceptable

**Export:**
- **Resource Contention CSV**: All contention data

**Example Use Case:**
> "Sarah Johnson is at contention level 85 (Critical). She's assigned to 4 initiatives, 3 of which are high priority, with 12 open issues across Backend and DevOps teams. We should reduce her load."

## CSV Exports

All exports include date stamps and are ready for analysis in Excel, Google Sheets, or BI tools.

### Team Attribution Export

**Columns:**
- Initiative, Primary Team, Team Count, Is Multi-Team, Unassigned Issues
- Team, Issue Count, Open Issues, Closed Issues, Completion Rate %, Story Points, Member Count, Percentage of Initiative

**Use For:**
- Resource planning
- Budget allocation
- Multi-team coordination planning

### Team Capacity Export

**Columns:**
- Team, Member Count, Total Initiatives, Active Initiatives, Open Issues, Total Issues, Completion Rate %, Capacity Status, Capacity Score, Initiative List

**Use For:**
- Capacity planning
- Workload balancing
- Sprint planning

### Initiative Dependencies Export

**Columns:**
- Initiative, Status, Progress %, Depends On Initiative, Dependency Status, Dependency Progress %, Total Dependencies, Open Dependencies, Severity, Is Blocking

**Use For:**
- Critical path analysis
- Risk management
- Prioritization decisions

### Initiative Forecasts Export

**Columns:**
- Initiative, Status, Progress %, Due Date, Forecast Date, Gap (Days), Gap (Weeks), Forecast Status, Weeks Remaining, Confidence %, Optimistic (Weeks), Pessimistic (Weeks), Weekly Velocity, Remaining Issues

**Use For:**
- Realistic timeline planning
- Risk identification
- Executive reporting

### Resource Contention Export

**Columns:**
- Name, Username, Initiative Count, High Priority Initiatives, Total Open Issues, High Priority Issues, Teams, Contention Level, Status

**Use For:**
- Resource reallocation
- Burnout prevention
- Hiring justification

## Algorithms & Calculations

### Team Capacity Score

```
Capacity Score = min(100, Initiative Score + Issue Score)

Where:
- Initiative Score = (Active Initiatives × 30) / √(Team Size)
- Issue Score = (Open Issues × 2) / √(Team Size)
```

**Interpretation:**
- 0-40: Available
- 40-70: At Capacity
- 70-100: Overloaded

### Resource Contention Level

```
Contention Level = min(100, Base + Priority + Workload)

Where:
- Base = max(50, (Initiative Count - 2) × 20)
- Priority = High Priority Count × 15
- Workload = 20 if Issues ≥ 10, 10 if Issues ≥ 5, else 0
```

**Interpretation:**
- 0-39: Acceptable
- 40-69: High contention
- 70-100: Critical contention

### Dependency Severity

```
Severity = function(Open Deps, Blocking Status, Blocking Progress)

Rules:
- High: Open Deps ≥ 3 OR Blocking Status = Delayed OR Blocking Progress < 50%
- Medium: Open Deps ≥ 1 OR Blocking Status = At Risk
- Low: All others
```

### Forecast Confidence

```
Confidence = Consistency + Trend Adjustment

Where:
- Consistency = 100 - Coefficient of Variation
- Trend Adjustment = +10 if improving, -15 if declining
```

**Interpretation:**
- 80-100%: High confidence
- 60-79%: Medium confidence
- 0-59%: Low confidence

### Timeline Forecast

```
Weeks Remaining = ceil(Remaining Work / Weekly Velocity)

Where:
- Remaining Work = Story Points (if available) OR Issue Count
- Weekly Velocity = Average of last 8 weeks
```

**Variance Calculation:**
```
Optimistic = Weeks × (1 - 0.2 × Consistency/100)
Pessimistic = Weeks × (1 + 0.5 + (100-Consistency)/100 × 0.5)
```

## Best Practices

### 1. Label Hygiene

- **Consistent Naming**: Use kebab-case for all labels
- **One Team Per Issue**: Don't assign multiple team labels
- **Story Points**: Add to all user stories for better forecasting
- **Regular Updates**: Remove outdated labels

### 2. Initiative Planning

- **Clear Boundaries**: Each epic should belong to one initiative
- **Reasonable Scope**: Initiatives with 20+ epics are too large
- **Timeline Alignment**: Set realistic due dates based on forecasts
- **Dependency Mapping**: Document dependencies in issue descriptions

### 3. Capacity Management

- **Weekly Review**: Check team capacity scores weekly
- **Threshold Alerts**: Investigate any team at 70+ capacity score
- **Multi-Team Initiatives**: Assign a coordination owner
- **Resource Buffers**: Keep 20% capacity for unplanned work

### 4. Forecasting

- **Velocity History**: Need at least 4 weeks of data for accurate forecasts
- **Story Points**: Use for better accuracy than issue counts
- **Confidence Levels**: Don't trust forecasts below 60% confidence
- **Regular Updates**: Re-forecast weekly as velocity changes

### 5. Dependency Management

- **Document Early**: Add dependency markers in issue descriptions
- **Severity Tracking**: Focus on High severity dependencies first
- **Blocking Initiatives**: Prioritize resources to unblock others
- **Circular Dependencies**: Resolve immediately (architectural problem)

## Example Workflows

### Workflow 1: Quarterly Planning

1. **Overview Tab** → Identify how many initiatives and teams
2. **Teams Tab** → Check which teams have capacity for new work
3. **Dependencies Tab** → Map out dependency chains
4. **Forecasts Tab** → Set realistic due dates based on velocity
5. **Export All** → Create planning spreadsheets

### Workflow 2: Weekly Status Review

1. **Overview Tab** → Check blocking initiatives and overloaded teams
2. **Resources Tab** → Identify people at critical contention
3. **Forecasts Tab** → Review at-risk initiatives
4. **Action Items**:
   - Escalate critical resource contention
   - Reallocate resources from overloaded teams
   - Adjust priorities for at-risk forecasts

### Workflow 3: Risk Assessment

1. **Dependencies Tab** → Find high-severity dependencies
2. **Forecasts Tab** → Identify initiatives forecast to miss dates
3. **Teams Tab** → Check if dependent teams are overloaded
4. **Calculate Cascade Impact** (manual):
   - If Initiative X delays 2 weeks, Y delays 2 weeks
   - If Y delays, Z delays (total 4 weeks)
5. **Mitigation**:
   - Add resources to critical path
   - Descope lower-priority features
   - Negotiate deadline extensions

### Workflow 4: Resource Reallocation

1. **Resources Tab** → Export contention data
2. **Sort by Contention Level** → Focus on critical (70+)
3. **For Each Critical Person**:
   - Check which initiatives they're on
   - Identify lowest-priority initiative
   - Move them off that initiative
4. **Teams Tab** → Verify receiving team has capacity
5. **Forecasts Tab** → Update forecast for impacted initiatives

## Troubleshooting

### "No initiatives found"

**Cause**: No epics have `initiative::` labels

**Solution**:
1. Add `initiative::my-initiative-name` labels to epics
2. Reload the dashboard
3. Check that label format is correct (no spaces, kebab-case)

### "No teams assigned"

**Cause**: Issues don't have `team::` or `squad::` labels

**Solution**:
1. Add team labels to issues: `team::backend`, `team::frontend`, etc.
2. Use consistent team names across all issues
3. Reload the dashboard

### "Cannot forecast"

**Cause**: No historical velocity data (no closed issues)

**Solution**:
- Need at least 4 weeks of closed issues
- Alternative: Add story point estimates and use those
- For new initiatives, copy velocity from similar past initiatives

### "Low confidence forecasts"

**Cause**: Inconsistent velocity (high variability)

**Solution**:
- Investigate root cause (changing priorities, unexpected blockers)
- Stabilize sprint planning
- Use pessimistic forecast for safety
- Consider breaking initiative into smaller chunks

### "High resource contention"

**Cause**: People assigned to too many initiatives

**Solution**:
1. Verify assignments are current (remove completed initiatives)
2. Reduce initiative count per person (target: 2 max)
3. Close or reassign stale issues
4. Hire or reallocate resources

## Integration with Other Views

### Executive Dashboard
- Shows initiative-level health scores
- Cross-Team View provides detailed breakdowns

### Velocity View
- Historical velocity data feeds forecasting
- Use together for sprint vs initiative planning

### Epic Management
- Epics roll up to initiatives
- Use initiative labels to group epics

### Risk Management
- Dependencies create risks
- Blocking initiatives are risk factors

### Resource Capacity
- Individual resource view
- Cross-Team provides initiative-level aggregation

## Future Enhancements

### Planned Features
1. **Interactive Dependency Graph**: Visual D3.js network diagram
2. **Monte Carlo Simulation**: Probabilistic forecasting
3. **Capacity Heat Maps**: Timeline-based capacity visualization
4. **Auto-Reallocation Suggestions**: AI-driven resource recommendations
5. **Burndown by Initiative**: Track initiative progress over time
6. **Cross-Project Aggregation**: Multi-portfolio view
7. **Slack/Email Alerts**: Notify when contention > 70 or forecast at-risk
8. **Historical Trending**: Track capacity and forecasts over time

### API Enhancements Needed
1. **Team API**: Native GitLab team/group membership
2. **Epic Dependencies**: Native epic-level dependency tracking
3. **Story Point Fields**: Custom fields for estimation
4. **Velocity Metrics**: Pre-calculated by GitLab

## Support & Feedback

For questions, issues, or feature requests related to Cross-Team Coordination:
- Check the main [README.md](./README.md) for general setup
- Review [IMPLEMENTATION-STATUS.md](./IMPLEMENTATION-STATUS.md) for technical details
- Open an issue on GitHub for bugs or feature requests

---

**Version**: 1.0.0
**Last Updated**: 2025-01-03
**Requires**: GitLab Project Management Dashboard v5.0+
