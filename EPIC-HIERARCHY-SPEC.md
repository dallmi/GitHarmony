# Epic Hierarchy Implementation Specification

## Overview
Add GitLab Epic support to enable enterprise-level project management with proper hierarchy visualization and aggregated metrics.

## Current State (V4)
- ✅ Flat issue list
- ✅ Milestones
- ❌ No Epic support
- ❌ No parent/child relationships
- ❌ No hierarchical aggregation

## Target State (V5)
```
Epic Level (Group)
  ├─ Epic: "Employee Engagement Platform"
  │   ├─ Issue #45: Backend API
  │   ├─ Issue #46: Frontend UI
  │   └─ Issue #47: Testing
  │
  └─ Epic: "Data Analytics Dashboard"
      └─ Issue #48: Dashboard MVP
```

## GitLab API Endpoints

### 1. Fetch Epics
```
GET /groups/:group_id/epics
Parameters:
  - per_page: 100
  - state: opened/closed/all
  - include_descendant_groups: true
```

### 2. Fetch Issues per Epic
```
GET /groups/:group_id/epics/:epic_id/issues
```

### 3. Issue Details (for parent/child)
```
GET /projects/:project_id/issues/:issue_iid
Response includes:
  - parent_issue_iid
  - has_tasks
  - task_completion_status
```

## Data Structure

```javascript
{
  epics: [
    {
      id: 34,
      iid: 1,
      title: "Employee Engagement Platform",
      description: "...",
      state: "opened",
      web_url: "https://...",
      start_date: "2025-01-01",
      due_date: "2025-03-31",

      // Aggregated from child issues
      issues: [...],
      totalIssues: 10,
      closedIssues: 6,
      progress: 60,
      blockers: 1,
      atRisk: 2,
      health: "amber" // calculated
    }
  ]
}
```

## UI Components

### 1. Setup Screen (Enhanced)
```
┌─ Configuration ───────────────┐
│ GitLab URL:    [____________] │
│ Group Path:    [____________] │  ← NEW
│ Project ID:    [____________] │
│ Access Token:  [____________] │
└───────────────────────────────┘
```

### 2. Epic Overview View (NEW)
```
┌─ Epics ──────────────────────────────────────────┐
│                                                   │
│ ┌─ Epic: Employee Engagement Platform ─────────┐ │
│ │ Progress: [=========>    ] 60%               │ │
│ │ Health: ● AMBER                              │ │
│ │ Timeline: Jan - Mar 2025                     │ │
│ │ Issues: 10 total, 6 closed, 1 blocker       │ │
│ │ [View Details] [View in Gantt]              │ │
│ └──────────────────────────────────────────────┘ │
│                                                   │
│ ┌─ Epic: Data Analytics Dashboard ─────────────┐ │
│ │ Progress: [====>         ] 30%               │ │
│ │ Health: ● GREEN                              │ │
│ │ ...                                          │ │
│ └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### 3. Hierarchical Gantt (ENHANCED)
```
Timeline: Jan ─── Feb ─── Mar ─── Apr

Epic: Employee Engagement
  Issue #45: Backend     [████████] Done
  Issue #46: Frontend    [████▒▒▒▒] 50%
  Issue #47: Testing     [▒▒▒▒▒▒▒▒] Pending

Epic: Data Analytics
  Issue #48: Dashboard   [██▒▒▒▒▒▒] 25%
```

### 4. Executive Dashboard (ENHANCED)
Add Epic-level metrics:
```
┌─ Key Metrics ──────────────────────┐
│ Total Epics: 5                     │
│ Epic Health:                       │
│   - Green: 3                       │
│   - Amber: 1                       │
│   - Red: 1                         │
│ Epic Completion: 45% avg           │
└────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Data Layer
1. Add `groupPath` to configuration
2. Implement `fetchEpics()` function
3. Implement `fetchEpicIssues(epicId)` function
4. Build hierarchical data structure
5. Calculate aggregated metrics per epic

### Phase 2: Epic View
1. Create `EpicOverview` component
2. Epic cards with aggregated stats
3. Health score per epic
4. Progress bars
5. Click-to-drill-down

### Phase 3: Hierarchical Gantt
1. Group issues by epic
2. Create epic swimlanes
3. Collapsible epic sections
4. Epic timeline bar (aggregate of issues)
5. Visual parent-child connectors

### Phase 4: Navigation & Filters
1. Add "Epics" tab to navigation
2. Filter issues by selected epic
3. Breadcrumb navigation
4. "View in Epic" button on issues

## Metrics Calculation

### Epic Health Score
```javascript
function calculateEpicHealth(epic) {
  const issues = epic.issues;
  const progress = epic.closedIssues / epic.totalIssues * 100;
  const blockerRatio = epic.blockers / epic.totalIssues;
  const riskRatio = epic.atRisk / epic.totalIssues;

  // Similar to project health, but epic-specific
  const score = (
    progress * 0.4 +
    (100 - blockerRatio * 300) * 0.3 +
    (100 - riskRatio * 200) * 0.3
  );

  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}
```

### Epic Progress
```javascript
function calculateEpicProgress(issues) {
  if (!issues.length) return 0;

  const totalWeight = issues.length;
  const completedWeight = issues.filter(i => i.state === 'closed').length;
  const progressWeight = issues
    .filter(i => i.state === 'opened')
    .reduce((sum, i) => sum + (getProgress(i) / 100), 0);

  return Math.round((completedWeight + progressWeight) / totalWeight * 100);
}
```

## API Error Handling

```javascript
try {
  const epicsResponse = await fetch(
    `${gitlabUrl}/api/v4/groups/${encodeURIComponent(groupPath)}/epics`,
    { headers: { 'PRIVATE-TOKEN': token } }
  );

  if (epicsResponse.status === 404) {
    console.warn('Epics not available (requires Premium/Ultimate)');
    setEpics([]);
    return;
  }

  if (!epicsResponse.ok) {
    throw new Error(`Epics API Error: ${epicsResponse.status}`);
  }

  const epicsData = await epicsResponse.json();
  // Process epics...

} catch (err) {
  setError(`Epic loading failed: ${err.message}`);
}
```

## PowerPoint Export Enhancement

Add Epic slide:
```
Slide 3: Epic Overview
- List of all epics with health status
- Progress bars
- Timeline visualization
- Top risks per epic
```

## Performance Considerations

1. **Lazy Loading**: Don't fetch all epic issues upfront
2. **Caching**: Cache epic data in localStorage
3. **Pagination**: Limit epics to 50, issues to 200
4. **Progressive Enhancement**: Still works without epics

## Backward Compatibility

- If no group path provided → hide Epics view
- If epics API fails → graceful degradation
- All existing views continue to work
- Issues can be viewed without epic context

## Testing Checklist

- [ ] Fetch epics successfully
- [ ] Calculate epic metrics correctly
- [ ] Display epic cards with all info
- [ ] Hierarchical Gantt renders properly
- [ ] Click epic → filter issues
- [ ] Epic health colors are correct
- [ ] Works without epics (backward compat)
- [ ] PowerPoint export includes epics
- [ ] Performance with 20+ epics
- [ ] Error handling for invalid group path

## Future Enhancements

- Epic-to-Epic relationships (parent epics)
- Epic templates
- Epic-level risks
- Epic budgets
- Cross-project epics
- Epic roadmap view (multi-quarter)
