# GitLab PM Dashboard - Codebase Analysis

## 📊 File Count Summary

- **Total .js/.jsx files**: 125
- **Component files**: 58 (.jsx in components/)
- **Service files**: 41 (.js in services/)
- **Hook files**: ~3-5 (in hooks/)
- **Utility files**: ~15-20 (in utils/)

---

## 🔍 Component Analysis (58 total)

### ✅ **Core Components Used in App.jsx** (23 components)
These are directly imported and rendered in the main App:

1. **Navigation & UI Framework**
   - Header
   - Tabs
   - GroupedTabs
   - IterationFilterDropdown
   - PortfolioFilterDropdown

2. **Modals**
   - ConfigModal
   - RoleSelectorModal

3. **Main Views** (14 views)
   - EnhancedExecutiveDashboard (replaced ExecutiveDashboard)
   - IssueComplianceView
   - CycleTimeView
   - EpicManagementView
   - RiskManagementView
   - RoadmapView
   - SprintManagementView
   - VelocityView
   - ResourcePlanningView
   - TeamManagementView
   - StakeholderHubView
   - CrossTeamCoordinationView
   - ReleasePlanningView
   - BackupRestoreView

4. **Developer Tools**
   - DebugPanel

### ⚠️ **Nested/Child Components** (Used by other components)
These are NOT in App.jsx but ARE used by other components:

1. **CommunicationsTab** - Used by StakeholderHubView ✅
2. **GanttView** - Used by EpicManagementView ✅
3. **ProjectGroupManager** - Used by ConfigModal ✅
4. **ErrorBoundary** - Likely wraps the app (check main.jsx)
5. **MetricCard** - Used by dashboard views
6. **HealthCircle** - Used by executive dashboard
7. **SearchBar** - Used by various views
8. **BacklogHealthCard** - Used by dashboard views
9. **BurnupChart** - Used by sprint/velocity views

### ❌ **Potentially Unused Components** (Need verification)
These don't appear to be imported anywhere:

1. **Duplicate/Alternative Views**
   - ExecutiveDashboard (replaced by EnhancedExecutiveDashboard)
   - EpicDashboardView (replaced by EpicManagementView?)
   - RiskAnalysisView (separate from RiskManagementView)
   - RiskRegisterView (separate from RiskManagementView)
   - SprintPlanningView (separate from SprintManagementView)
   - SprintBoardView (separate from SprintManagementView)

2. **Unused Features**
   - CommunicationsDashboard
   - DependencyGraphView
   - DependencyManagementView
   - DependencyAlertsSection
   - InsightsView
   - UnifiedEpicIssueView
   - QuarterlyEpicTracker

3. **Config/Modal Components**
   - HealthScoreConfigModal
   - QualityCriteriaConfigModal
   - TeamConfigModal
   - StatusGeneratorModal
   - MultiSourceConfig (might be deprecated)

4. **Sub-components**
   - DoDComplianceSection
   - RetrospectiveActionsSection
   - SprintGoalSection
   - QualityViolationsByAuthor
   - TeamResourcesView
   - PlaceholderView

5. **Utility Components**
   - SearchableSelect
   - EpicDebugger (debug tool, might be used)

---

## 🔧 Service Files Analysis (41 total)

### ✅ **Core Services** (Essential)
1. **gitlabApi.js** - Main API client
2. **storageService.js** - LocalStorage operations
3. **backupService.js** - Backup/restore functionality
4. **projectGroupService.js** - Project grouping

### ⚠️ **Feature-Specific Services** (May be unused)
Many services appear to be for features that aren't actively used:

1. **Potentially Duplicate/Debug**
   - debugGitlabApi.js (debug version?)
   - multiSourceGitlabApi.js (alternative API?)

2. **Advanced Features** (Check if implemented)
   - velocityService.js
   - unifiedVelocityService.js (duplicate?)
   - velocityConfigService.js
   - memberVelocityService.js
   - cycleTimeService.js
   - enhancedCycleTimeService.js (duplicate?)

3. **Team Management**
   - teamConfigService.js
   - teamAttributionService.js
   - teamImportService.js
   - teamPerformanceService.js
   - absenceService.js
   - capacityUtils.js
   - capacityAnalysisService.js

4. **Analytics & Metrics**
   - metricsService.js
   - insightsService.js
   - ragAnalysisService.js
   - workflowIntelligenceService.js
   - forecastService.js
   - forecastAccuracyService.js
   - backlogHealthService.js
   - communicationsMetricsService.js

5. **Other Features**
   - dependencyService.js
   - crossProjectLinkingService.js
   - crossInitiativeDependencyService.js
   - initiativeService.js
   - milestoneTimelineService.js
   - stakeholderService.js
   - complianceService.js
   - dodService.js
   - decisionsService.js
   - criteriaConfigService.js
   - sprintGoalService.js
   - retroActionService.js
   - statusGeneratorService.js

6. **Export/Import**
   - csvExportUtils.js
   - pdfExportUtils.js
   - pptExportService.js

7. **Parsers**
   - emailParser.js
   - htmlEmailParser.js
   - msgParser.js

8. **User Preferences**
   - userPreferencesService.js

---

## 🎯 Optimization Recommendations

### **Actually Used Files (Estimated ~60-70 files)**

1. **Core (~25 files)**
   - App.jsx, main.jsx
   - 23 components imported in App.jsx
   - ConfigModal + its children

2. **Services (~10-15 files)**
   - gitlabApi.js
   - storageService.js
   - backupService.js
   - projectGroupService.js
   - Essential utilities (dateUtils, apiUtils)
   - Used team/velocity services

3. **Hooks (~3-5 files)**
   - useGitLabData.js
   - useRisks.js
   - Other active hooks

4. **Nested Components (~15-20 files)**
   - Components used by main views
   - Charts, cards, sections

### **Potentially Unused (~55-65 files)**
- Alternative/duplicate views
- Unused services (30+)
- Deprecated features
- Debug alternatives

---

## 📦 Recommended Approach

### **Minimal Core Set (~30 files)**
For 80% of functionality:
1. App.jsx + main.jsx
2. Core views (10-12 active views)
3. ConfigModal + children
4. Core services (4-5)
5. Hooks (2-3)
6. Essential utils (2-3)

### **Extended Set (~60 files)**
For 95% of functionality:
- Add nested components
- Add actually used services
- Add team management if needed

### **Full Set (125 files)**
Only if you need:
- All alternative views
- All analytics services
- All export formats
- Debug tools

---

## 🚨 Cleanup Opportunities

1. **Remove duplicate services**
   - velocityService vs unifiedVelocityService
   - cycleTimeService vs enhancedCycleTimeService
   - gitlabApi vs debugGitlabApi vs multiSourceGitlabApi

2. **Remove unused views**
   - ExecutiveDashboard (using Enhanced version)
   - Views not referenced in App.jsx

3. **Archive unused services**
   - 30+ services that appear unused
   - Parser services if not needed
   - Export services if not used

4. **Consolidate similar components**
   - Risk views (3 separate ones)
   - Sprint views (3 separate ones)
   - Dependency components

---

## 💡 Next Steps

1. **Verify actual usage** by:
   - Running the app and checking network/console
   - Searching for dynamic imports
   - Checking for lazy loading

2. **Create lean version** with:
   - Only actively used files (~60)
   - Remove duplicates
   - Archive unused features

3. **Document features** to understand:
   - Which services power which features
   - Which components are planned vs active
   - Which are debug/development tools