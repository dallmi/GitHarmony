# GitLab PM Dashboard - Source Code for Claude AI

## Project Overview
A comprehensive project management dashboard for GitLab with features including:
- Multi-project portfolio management
- Pod/Group-based organization
- Gantt charts, velocity tracking, cycle time analysis
- Risk management, communications tracking
- Team capacity planning
- Centralized token management

---

## Core Architecture Files

### Main App Entry Point
**File: src/main.jsx**
```jsx
// Application entry point - initializes React app
```

### App Component
**File: src/App.jsx**
```jsx
// Main application component with routing and view management
```

---

## Configuration & Storage

### ConfigModal
**File: src/components/ConfigModal.jsx**
**Purpose**: Main configuration interface with centralized token management
**Key Features**:
- Single centralized GitLab access token (used everywhere)
- Project/Group mode switching
- Multi-project portfolio management
- Pod/Group management for team-based organization

### Storage Service
**File: src/services/storageService.js**
**Purpose**: LocalStorage abstraction layer
**Key Functions**:
- saveConfig() / loadConfig() - Main configuration
- saveProject() / getAllProjects() - Portfolio projects
- saveGroup() / getAllGroups() - Pods/Groups
- Uses centralized token from main config

### Backup/Restore Service
**File: src/services/backupService.js**
**Purpose**: Export/import functionality with token masking
**Key Features**:
- Complete application state backup
- Token masking for security
- Centralized token approach (no individual project/pod tokens)

---

## Data Fetching & API

### GitLab API Service
**File: src/services/gitlabApi.js**
**Purpose**: All GitLab API interactions
**Key Functions**:
- fetchAllData() - Comprehensive data fetch
- fetchIssues() / fetchMilestones() / fetchEpics()
- Handles pagination, rate limiting, and 2025+ filtering

### useGitLabData Hook
**File: src/hooks/useGitLabData.js**
**Purpose**: Main data fetching hook with multi-source support
**Key Features**:
- Pod mode (group-based data)
- Project group mode (multiple projects)
- Cross-project aggregation
- Always uses centralized token from main config

---

## View Components

### Main Views
1. **OverviewView.jsx** - Dashboard overview with key metrics
2. **GanttView.jsx** - Timeline visualization (using gantt-task-react)
3. **VelocityView.jsx** - Sprint velocity tracking
4. **CycleTimeView.jsx** - Cycle time analysis and metrics
5. **RiskManagementView.jsx** - Risk tracking and mitigation
6. **CommunicationsTab.jsx** - Communications log with modal detail view
7. **BackupRestoreView.jsx** - Data export/import interface
8. **PortfolioView.jsx** - Multi-project management
9. **StakeholderHubView.jsx** - Stakeholder management

### Supporting Components
- **ProjectGroupManager.jsx** - Project grouping functionality
- **EpicDebugger.jsx** - Epic troubleshooting tool
- **DebugPanel.jsx** - Comprehensive debug information (Ctrl+Alt+D)

---

## Key Design Patterns

### Centralized Token System (Latest Implementation)
**Location**: Throughout the application
**How it works**:
1. User enters token ONCE in ConfigModal Connection tab
2. Token stored in localStorage as `gitlab_token`
3. All API calls retrieve token from main config via loadConfig()
4. Projects and Pods do NOT store individual tokens
5. Backup/restore handles single token with masking option

### Data Flow
```
User Input (ConfigModal)
  ↓
storageService.saveConfig()
  ↓
localStorage (gitlab_token, gitlab_url, etc.)
  ↓
useGitLabData.loadConfig()
  ↓
gitlabApi.fetchAllData(config)
  ↓
View Components (OverviewView, GanttView, etc.)
```

### Multi-Source Data Aggregation
**Handled by**: useGitLabData.js
**Modes**:
1. **Single Project**: Direct config usage
2. **Pod Mode**: Active group with centralized token
3. **Project Group**: Multiple projects with centralized token
4. **Cross-Project**: All portfolio projects with centralized token

---

## Important Implementation Details

### Date Handling
- Uses HTML5 `datetime-local` input in EU format
- All dates stored as ISO strings
- 2025+ filtering available via config.filter2025

### Communication Tracking
**File**: src/components/CommunicationsTab.jsx
- Modal detail view on click (List or Gantt)
- Event.stopPropagation() to prevent modal closing on text selection
- "Approved By" field accepts full names with spaces

### Debug Features
1. **Debug Panel** (Ctrl+Alt+D): Browser info, localStorage status, config display
2. **Console Logging**: Extensive logging in useGitLabData for troubleshooting
3. **Epic Debugger**: Dedicated tool for epic relationship issues

### Backup Security
- Tokens masked by default (shows first 4 + last 4 chars)
- User can choose to include tokens for personal backups
- Warning shown when importing masked tokens

---

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **UI Components**: Custom + gantt-task-react
- **Charts**: Chart.js
- **Storage**: LocalStorage (no backend required)
- **Deployment**: Single HTML file (vite-plugin-singlefile)

---

## Recent Changes (Token Centralization)

### Files Modified:
1. **ConfigModal.jsx**: Removed all individual token fields, added single centralized field
2. **storageService.js**: Removed token from project/group storage
3. **useGitLabData.js**: Updated all API calls to use mainConfig.token
4. **backupService.js**: Simplified token handling, removed individual masking

### Migration Path:
- Existing users with multiple tokens should re-enter once in Connection tab
- Old backups with individual tokens will be ignored
- Only main gitlabConfig.gitlabToken is restored

---

## Usage Instructions for Claude AI

When asking Claude for help:

1. **For Configuration Issues**: Reference ConfigModal.jsx and storageService.js
2. **For Data Fetching Problems**: Reference useGitLabData.js and gitlabApi.js
3. **For View-Specific Issues**: Reference the specific view component
4. **For Token Problems**: Explain the centralized token system
5. **For Backup/Restore**: Reference backupService.js

### Example Prompts:
- "I need to add a new field to the configuration - where should I make changes?"
- "How does the application handle multiple projects with different GitLab instances?"
- "Can you explain how the centralized token system works?"
- "I want to add a new view/tab - what's the pattern to follow?"

---

## File Structure
```
src/
├── components/
│   ├── ConfigModal.jsx (Configuration UI)
│   ├── CommunicationsTab.jsx (Communications with modal)
│   ├── OverviewView.jsx (Dashboard)
│   ├── GanttView.jsx (Timeline)
│   ├── VelocityView.jsx (Sprint metrics)
│   ├── CycleTimeView.jsx (Cycle time)
│   ├── RiskManagementView.jsx (Risks)
│   ├── BackupRestoreView.jsx (Export/Import)
│   ├── PortfolioView.jsx (Multi-project)
│   ├── ProjectGroupManager.jsx (Grouping)
│   ├── DebugPanel.jsx (Debug UI)
│   └── ... (other views)
├── hooks/
│   └── useGitLabData.js (Main data hook)
├── services/
│   ├── gitlabApi.js (API client)
│   ├── storageService.js (LocalStorage)
│   ├── backupService.js (Backup/Restore)
│   └── ... (other services)
├── App.jsx (Main component)
└── main.jsx (Entry point)
```

---

## Questions to Ask Claude

**Configuration & Setup**:
- How do I add a new configuration option?
- How do I support a new GitLab instance?
- How do I handle configuration migrations?

**Data & API**:
- How do I add a new GitLab resource (e.g., merge requests)?
- How do I modify the data aggregation logic?
- How do I handle API rate limiting better?

**UI & Views**:
- How do I add a new tab/view?
- How do I modify the Gantt chart display?
- How do I add new metrics to the dashboard?

**Performance**:
- How do I optimize data fetching for large projects?
- How do I implement caching?
- How do I reduce localStorage usage?

**Security**:
- How do I improve token security?
- How do I add encryption to backups?
- How do I validate user input better?

