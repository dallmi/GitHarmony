# GitLab Project Management Dashboard - Enterprise Edition

A professional, browser-based Project Management solution for GitLab with Executive Dashboard, Risk Management, and Dependency Tracking.

## 🆕 Latest: V5 - Modular Architecture
**New in V5:** Complete architectural rewrite with modular React components, maintained single-file deployment

## Overview

Professional project management tool for GitLab with multiple views and enterprise features. Built with modern React architecture while maintaining the simplicity of double-click deployment.

### Version Comparison

| Feature | V1-V2 | V3-V4 | V5 (Current) |
|---------|-------|-------|--------------|
| Architecture | Monolithic | Single-file | Modular React + Vite |
| Deployment | Single HTML | Single HTML | Single HTML ✓ |
| Maintainability | Low | Medium | High ✓ |
| Executive Dashboard | ✅ | ✅ Enhanced | ✅ |
| Health Scoring | ✅ | ✅ | ✅ |
| PowerPoint Export | ✅ | ✅ | 🔄 In Progress |
| Gantt Chart | ✅ | ❌ | ✅ |
| Roadmap | ✅ | ❌ | ✅ |
| Sprint Board | ✅ | ❌ | ✅ |
| Dependency Graph | ❌ | ✅ | ✅ D3.js |
| Risk Register | ❌ | ✅ | ✅ |
| Epic Support | ❌ | API Ready | 🔄 Coming Soon |

### Available Views

- **👔 Executive Dashboard**: C-level ready summary with RAG status and 4-dimensional health score
- **📊 Gantt Chart**: Timeline visualization with color-coded status bars
- **🗺️ Roadmap**: Milestone-based progress tracking with backlog
- **🏃 Sprint Board**: Kanban-style agile board with three columns
- **🔗 Dependency Graph**: Interactive D3.js network diagram showing issue dependencies
- **⚠️ Risk Register**: Probability × Impact matrix with risk management
- **👥 Team Resources**: Coming soon

## 🚀 Getting Started

### For End Users - Just Double-Click!

1. **Download** the latest release: `gitlab-pm-dashboard/dist/index.html`
2. **Double-click** the HTML file - it opens in your browser
3. **Configure** your GitLab connection (see setup below)
4. **Done!** No installation, no server, no npm needed

**File location:**
```
gitlab-pm-dashboard/dist/index.html  (292KB - everything included)
```

### First-Time Configuration

When you open the dashboard, you'll see a configuration screen:

1. **GitLab URL**: Your GitLab instance URL
   - Example: `https://gitlab.com` or `https://devcloud.ubs.net`

2. **Project ID**: Your project identifier
   - Format: `namespace/project` or numeric ID
   - Example: `myteam/myproject` or `12345`

3. **Group Path** (Optional): For Epic support (Premium/Ultimate only)
   - Format: `group` or `parent-group/sub-group`
   - Example: `engineering` or `company/engineering`

4. **Personal Access Token**: Create in GitLab under Settings → Access Tokens
   - Required scopes: `api`, `read_api`
   - Save securely - stored only in browser localStorage

Click **"Save Configuration"** and the dashboard will load your project data!

## 📋 Key Features

### 1. Executive Dashboard
- **4-Dimensional Health Score**:
  - Completion (30%) - Issues closed vs total
  - Schedule (25%) - Overdue tracking
  - Blockers (25%) - Critical blockers
  - Risk (20%) - At-risk issues
- **RAG Status**: Red/Amber/Green visual indicators
- **Key Metrics**: Total issues, completion rate, open/closed counts
- **Warning Indicators**: Blockers, overdue, at-risk issues

### 2. Gantt Chart
- Timeline visualization with month headers
- Date-based bar positioning
- Color coding:
  - 🔴 Red: Blockers or overdue
  - 🟢 Green: Completed
  - 🔵 Blue: In progress
- Progress percentage on each bar
- Click bars to open issues in GitLab

### 3. Roadmap
- Strategic milestone-based view
- Per-milestone metrics:
  - Completion percentage
  - High priority count
  - At-risk issues (due within 7 days)
  - Overdue issues
- Blocker highlighting
- Backlog section for unassigned issues

### 4. Sprint Board
- Kanban-style three-column layout:
  - 📋 To Do
  - 🔄 In Progress
  - ✅ Done
- Automatic sprint grouping from labels
- Progress tracking per sprint
- Interactive cards with hover effects

### 5. Dependency Graph (D3.js)
- Interactive force-directed network diagram
- **Automatic parsing** from issue descriptions:
  - "blocked by #123"
  - "depends on #123"
  - "requires #123"
- Drag nodes to reposition
- Color coding:
  - 🔵 Blue: In progress
  - 🟢 Green: Completed
  - 🔴 Red: Blocker
- Statistics panel: Total issues, dependencies, blocking relationships

### 6. Risk Register
- **3×3 Probability × Impact Matrix**
- Risk score calculation (probability × impact)
- Color-coded severity:
  - 🔴 High risk (score ≥ 6)
  - 🟡 Medium risk (score 3-5)
  - 🟢 Low risk (score < 3)
- Add/Edit/Close risk workflows
- Risk owner assignment
- Active risks list
- Data persisted in localStorage

## 🏷️ Label Conventions

The dashboard uses GitLab labels for intelligent categorization:

### Sprint Organization
- Pattern: `Sprint X` or `Iteration X`
- Examples: `Sprint 1`, `Sprint 2024-Q1`, `Iteration 5`
- Used for: Sprint Board grouping

### Status Tracking (for progress calculation)
- `WIP` / `In Progress` → 50% progress
- `Review` / `Testing` → 75% progress
- `Started` → 25% progress
- Issue closed → 100% progress

### Priority
- `Priority::High` / `Critical` / `Urgent` / `P1` → High
- `Priority::Low` / `P3` → Low
- Default → Medium

### Blockers
- `Blocker` / `Blocked` → Marked as critical blocker
- Highlighted in red across all views

### Dependencies (in issue descriptions)
Add these patterns to issue descriptions:
- `blocked by #123`
- `depends on #123`
- `requires #123`
- `waiting for #456`

## 🔐 Creating GitLab Personal Access Token

1. Go to GitLab: **Settings → Access Tokens**
2. Token name: e.g., "Project Management Dashboard"
3. Set expiration date (or leave blank for no expiration)
4. Select scopes:
   - ✅ `api` - Full API access
   - ✅ `read_api` - Read-only API (recommended if sufficient)
5. Click **"Create personal access token"**
6. Copy the token immediately (you can't see it again!)
7. Paste into dashboard configuration

## 🛠️ For Developers - Modular Architecture

### Project Structure
```
gitlab-pm-dashboard/
├── src/
│   ├── services/          # API, metrics, storage (3 files)
│   ├── hooks/             # React hooks (3 files)
│   ├── utils/             # Helper functions (3 files)
│   ├── constants/         # Colors, config (2 files)
│   ├── components/        # React components (13 files)
│   ├── styles/            # CSS (1 file)
│   ├── App.jsx            # Main component
│   └── main.jsx           # Entry point
├── dist/
│   └── index.html         # Built single-file output ✓
├── vite.config.js         # Vite + single-file plugin
└── package.json
```

### Development Setup

```bash
cd gitlab-pm-dashboard

# Install dependencies (only needed once)
npm install

# Development server with hot reload
npm run dev

# Build single-file HTML for production
npm run build

# Output: dist/index.html (ready to distribute!)
```

### Key Technologies
- **React 18** - Component-based UI
- **Vite** - Modern build tool with HMR
- **vite-plugin-singlefile** - Inlines everything into single HTML
- **D3.js v7** - Dependency graph visualization
- **PptxGenJS** - PowerPoint export (coming soon)

### Architecture Benefits
- ✅ **Modular codebase** - Easy to maintain and extend
- ✅ **Reusable services** - API, metrics, storage abstraction
- ✅ **Custom React hooks** - Clean state management
- ✅ **Utility functions** - Date, label, dependency parsing
- ✅ **Single-file deployment** - Still just double-click!
- ✅ **Modern DX** - Hot reload, ESLint, proper IDE support

## 🧪 Technical Details

### Stack
- **Frontend**: React 18 with JSX
- **Build**: Vite with single-file plugin
- **Visualization**: D3.js v7
- **Styling**: CSS with CSS variables (UBS design system)
- **API**: GitLab REST API v4
- **Storage**: Browser localStorage (config + risks)

### Browser Compatibility
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Requires modern ES6+ support

### Security
- ✅ Credentials stored only in browser localStorage
- ✅ No server-side storage
- ✅ Direct API access to GitLab
- ⚠️ CORS must be enabled on GitLab instance

### Build Output
- **Development**: Modular source files (~3000 lines)
- **Production**: Single HTML file (292KB, 90KB gzipped)
- **Includes**: All dependencies inlined (React, D3.js, etc.)

## 🐛 Troubleshooting

### "API Error: 401 Unauthorized"
- Token is invalid or expired
- Create a new Personal Access Token
- Ensure `api` or `read_api` scope is selected

### "API Error: 404 Not Found"
- Project ID is incorrect
- Format should be: `namespace/project` or numeric ID
- Verify you have access to the project

### "No Timeline Available"
- Issues need due dates or milestones
- In GitLab: Edit issue → Set due date or assign to milestone

### "No Dependencies Found"
- Add dependency patterns to issue descriptions:
  - `blocked by #123`
  - `depends on #456`

### CORS Errors
- GitLab must allow CORS for your domain
- For development: Use browser extension (temporary solution only)
- For UBS DevCloud: Should work by default

### Configuration Not Saving
- Check browser localStorage is enabled
- Try clearing browser cache and reconfiguring

## 🎨 Customization

### Change UBS Colors
Edit `src/constants/colors.js`:
```javascript
export const COLORS = {
  primary: '#E60000',      // UBS Red
  primaryDark: '#B80000',
  // ... other colors
}
```

### Adjust Health Score Weights
Edit `src/constants/config.js`:
```javascript
export const HEALTH_SCORE_WEIGHTS = {
  completion: 0.3,   // 30%
  schedule: 0.25,    // 25%
  blockers: 0.25,    // 25%
  risk: 0.2          // 20%
}
```

## 🗺️ Roadmap

### In Progress
- **PowerPoint Export**: One-click presentation generation
- **Team Resources View**: Workload distribution

### Planned (Future)
- **Epic Hierarchy**: Premium/Ultimate GitLab support
  - Epic overview dashboard
  - Hierarchical Gantt with Epic swimlanes
  - Epic-level health aggregation
- **PDF Export**: Executive summaries
- **Burndown Charts**: Sprint velocity tracking
- **Time Tracking**: Integration with GitLab time estimates
- **Multi-Project Dashboard**: Portfolio view
- **Custom Metrics**: Configurable KPIs

## 📄 License

This tool is developed for internal use.

## 🆘 Support

Having issues?

1. **Check GitLab API docs**: https://docs.gitlab.com/ee/api/
2. **Browser console** (F12): Look for error messages
3. **Network tab**: Inspect API requests/responses
4. **GitHub Issues**: https://github.com/dallmi/Projektmanagement/issues

## 📊 Migration Notes

This is V5 - a complete architectural rewrite:
- **From**: 1300+ line single-file HTML
- **To**: Modular React with 30+ component files
- **Benefit**: Maintainable codebase, still single-file deployment
- **Migration docs**: See `MIGRATION-STATUS.md` for details

All V4 features preserved and enhanced!

---

**Built with ❤️ using React, Vite, and D3.js**
