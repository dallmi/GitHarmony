# GitLab PM Dashboard - File Guide for Claude AI

## 📋 How to Share Code with Claude Web

### **Method 1: Upload the Combined Source File (Easiest)**
✅ **File**: `gitlab-pm-dashboard-full-source.txt` (6,230 lines)
- Contains the 10 most important source files
- Upload this single file to Claude.ai
- Covers 80% of common questions

### **Method 2: Upload Individual Files by Category**
Choose files based on what you need help with:

---

## 🗂️ Files by Category

### **Essential Configuration (Always Include These)**
1. ✅ `src/components/ConfigModal.jsx` (900+ lines)
   - Main configuration UI
   - Centralized token management
   - Project/Pod management

2. ✅ `src/services/storageService.js` (300+ lines)
   - LocalStorage operations
   - Config save/load
   - Project/Group management

3. ✅ `src/hooks/useGitLabData.js` (400+ lines)
   - Data fetching logic
   - Multi-source aggregation
   - Token usage

---

### **API & Data Fetching**
4. ✅ `src/services/gitlabApi.js` (1000+ lines)
   - All GitLab API calls
   - Issue/Epic/Milestone fetching
   - Pagination & rate limiting

5. `src/services/apiUtils.js`
   - API helper functions
   - Error handling

---

### **Backup & Data Management**
6. ✅ `src/services/backupService.js` (800+ lines)
   - Export/import functionality
   - Token masking
   - Migration handling

7. `src/components/BackupRestoreView.jsx`
   - UI for backup/restore
   - Import validation

---

### **Main Application**
8. ✅ `src/App.jsx` (400+ lines)
   - Main app component
   - View routing
   - Tab management

9. ✅ `src/main.jsx` (50 lines)
   - Application entry point
   - React initialization

---

### **Key Views** (Pick what you need help with)

#### Dashboard & Overview
10. ✅ `src/components/OverviewView.jsx` (800+ lines)
    - Main dashboard
    - KPI cards
    - Statistics

#### Communication & Tracking
11. ✅ `src/components/CommunicationsTab.jsx` (1600+ lines)
    - Communications log
    - Modal detail view
    - List & Gantt integration

12. `src/components/DecisionLogView.jsx`
    - Decision tracking
    - Approval workflow

#### Timeline & Planning
13. `src/components/GanttView.jsx` (1200+ lines)
    - Gantt chart implementation
    - Timeline visualization
    - Milestone tracking

14. `src/components/MilestonesView.jsx`
    - Milestone management
    - Progress tracking

#### Metrics & Analytics
15. `src/components/VelocityView.jsx` (800+ lines)
    - Sprint velocity
    - Team performance

16. `src/components/CycleTimeView.jsx` (1000+ lines)
    - Cycle time analysis
    - Flow metrics
    - Charts

17. `src/components/BurndownView.jsx`
    - Sprint burndown
    - Progress tracking

#### Risk & Issues
18. `src/components/RiskManagementView.jsx` (1000+ lines)
    - Risk tracking
    - Mitigation plans
    - Risk matrix

19. `src/components/IssuesView.jsx`
    - Issue list
    - Filtering
    - Sorting

#### Team Management
20. `src/components/TeamManagement/TeamCapacityView.jsx`
    - Team capacity planning
    - Resource allocation

21. `src/components/TeamManagement/TeamCapacityCards.jsx`
    - Capacity visualization
    - Sprint planning

#### Portfolio Management
22. `src/components/PortfolioView.jsx` (600+ lines)
    - Multi-project overview
    - Project switching
    - Cross-project features

23. `src/components/ProjectGroupManager.jsx`
    - Project grouping
    - Group-based views

#### Other Views
24. `src/components/EpicsView.jsx`
    - Epic management
    - Epic hierarchy

25. `src/components/StakeholderHubView.jsx`
    - Stakeholder tracking
    - Communication planning

---

### **Debug & Developer Tools**
26. ✅ `src/components/DebugPanel.jsx` (150+ lines)
    - Debug information (Ctrl+Alt+D)
    - Config inspection
    - Browser diagnostics

27. `src/components/EpicDebugger.jsx`
    - Epic relationship debugging
    - Issue linking

---

### **Utilities & Helpers**
28. `src/utils/dateUtils.js`
    - Date formatting
    - Date calculations

29. `src/utils/issueUtils.js`
    - Issue classification
    - Status mapping

30. `src/utils/epicUtils.js`
    - Epic hierarchy
    - Epic aggregation

31. `src/services/projectGroupService.js`
    - Project group operations
    - Group management

---

## 📤 Recommended Upload Strategies

### **For General Questions** (Upload these 3 files):
1. `gitlab-pm-dashboard-full-source.txt` (combined file)

### **For Configuration Issues** (Upload these 3 files):
1. `src/components/ConfigModal.jsx`
2. `src/services/storageService.js`
3. `src/hooks/useGitLabData.js`

### **For API/Data Fetching Issues** (Upload these 4 files):
1. `src/services/gitlabApi.js`
2. `src/hooks/useGitLabData.js`
3. `src/services/storageService.js`
4. `src/utils/apiUtils.js`

### **For UI/View Issues** (Upload these 3 files):
1. `src/App.jsx`
2. The specific view file you're working on
3. `src/hooks/useGitLabData.js`

### **For Backup/Restore Issues** (Upload these 2 files):
1. `src/services/backupService.js`
2. `src/components/BackupRestoreView.jsx`

---

## 💡 Pro Tips for Working with Claude

### **1. Include Context in Your Prompt**
Instead of: "Fix this bug"
Try: "In ConfigModal.jsx, when I click Save, the token isn't being stored. Looking at storageService.js line 25, I see saveConfig() but..."

### **2. Reference Specific Files/Lines**
"In useGitLabData.js around line 55, the podConfig is using activePod.token but we changed to centralized tokens. Can you update this?"

### **3. Explain the Current State**
"We recently changed from individual tokens per project to a single centralized token. Now I need to update the backup service to reflect this..."

### **4. Ask for Explanations**
"Can you explain how the multi-project aggregation works in useGitLabData.js? Specifically the cross-project mode starting at line 234?"

### **5. Request Code Reviews**
"Here's my ConfigModal.jsx - can you review the token handling and suggest improvements for security?"

---

## 📝 Quick Reference: What Each Service Does

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| **gitlabApi.js** | GitLab API client | fetchIssues, fetchEpics, fetchMilestones |
| **storageService.js** | LocalStorage wrapper | saveConfig, loadConfig, saveProject, getAllProjects |
| **backupService.js** | Export/Import | createBackup, validateBackup, restoreBackup |
| **useGitLabData.js** | Data fetching hook | fetchData (handles all modes) |
| **projectGroupService.js** | Project grouping | getProjectGroup, getProjectsForGroup |

---

## 🔍 Common Questions & Where to Look

| Question | Files to Upload |
|----------|----------------|
| "How do I add a new configuration field?" | ConfigModal.jsx, storageService.js |
| "How do I fetch a new GitLab resource?" | gitlabApi.js, useGitLabData.js |
| "How do I add a new view/tab?" | App.jsx, [new view file] |
| "How does token management work?" | ConfigModal.jsx, storageService.js, useGitLabData.js |
| "How do I modify the Gantt chart?" | GanttView.jsx |
| "How do I add a new metric?" | OverviewView.jsx, [specific view] |
| "How does backup work?" | backupService.js, BackupRestoreView.jsx |
| "How do I debug data fetching?" | useGitLabData.js, gitlabApi.js, DebugPanel.jsx |

---

## 🎯 Example Claude Conversations

### **Example 1: Adding a New Feature**
```
User: I want to add a "favorite projects" feature where users can star
projects and they appear at the top of the project list.

[Upload: ConfigModal.jsx, storageService.js, PortfolioView.jsx]

Claude will:
1. Suggest adding favoriteProjects array to storage
2. Update ConfigModal to show star icons
3. Modify PortfolioView to sort by favorites
4. Provide complete code changes
```

### **Example 2: Debugging an Issue**
```
User: My pod mode isn't loading data. When I click refresh, nothing happens.

[Upload: useGitLabData.js, DebugPanel.jsx, ConfigModal.jsx]

Explain:
- Token is set in Connection tab
- Pod "Team Alpha" is configured with group ID "12345"
- Debug panel shows config exists but no data loads

Claude will:
1. Check token usage in pod mode
2. Verify group path handling
3. Check console logging
4. Suggest debug steps
```

### **Example 3: Code Review**
```
User: Can you review my recent changes to centralize token management?

[Upload: gitlab-pm-dashboard-full-source.txt]

List what was changed:
- Removed individual tokens from projects/pods
- Added single token field in ConfigModal
- Updated useGitLabData to use mainConfig.token

Claude will:
1. Review for security issues
2. Check for edge cases
3. Suggest improvements
4. Verify consistency
```

---

## ✅ Files Successfully Created

1. ✅ **gitlab-pm-dashboard-source-for-claude.md**
   - Architecture overview
   - Design patterns
   - Recent changes
   - Usage guide

2. ✅ **gitlab-pm-dashboard-full-source.txt**
   - 10 core source files
   - 6,230 lines of code
   - Ready to upload

3. ✅ **This file: FILE-GUIDE-FOR-CLAUDE.md**
   - Complete file listing
   - Upload strategies
   - Example conversations

---

## 🚀 Next Steps

1. **Start Simple**: Upload `gitlab-pm-dashboard-full-source.txt` for general questions
2. **Get Specific**: Upload individual files when working on specific features
3. **Provide Context**: Always explain what you're trying to achieve
4. **Share Errors**: Include error messages and console output
5. **Iterate**: Claude can help refine solutions through back-and-forth

Happy coding! 🎉
