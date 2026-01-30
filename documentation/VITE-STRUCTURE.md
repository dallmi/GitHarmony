# Vite Project Structure - GitLab PM Dashboard

## Complete File Structure

```
gitlab-project-management/
├─ index.html                          # Entry point (minimal)
├─ package.json                        # Dependencies
├─ vite.config.js                      # Vite config
├─ .gitignore
│
├─ src/
│  ├─ main.jsx                        # React root (20 lines)
│  ├─ App.jsx                         # Main app component (150 lines)
│  │
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ Header.jsx               # Navigation, stats
│  │  │  ├─ Tabs.jsx                 # View switcher
│  │  │  └─ ConfigModal.jsx          # GitLab setup
│  │  │
│  │  ├─ views/
│  │  │  ├─ ExecutiveDashboard.jsx   # Health score, metrics
│  │  │  ├─ EpicView.jsx             # Epic overview (NEW)
│  │  │  ├─ DependencyGraph.jsx      # D3 graph
│  │  │  ├─ RiskRegister.jsx         # Risk matrix
│  │  │  ├─ GanttView.jsx            # Timeline
│  │  │  ├─ RoadmapView.jsx          # Milestones
│  │  │  ├─ SprintBoard.jsx          # Kanban
│  │  │  └─ ResourceView.jsx         # Team view
│  │  │
│  │  ├─ epics/
│  │  │  ├─ EpicCard.jsx             # Single epic display
│  │  │  ├─ EpicMetrics.jsx          # Aggregated stats
│  │  │  └─ HierarchicalGantt.jsx    # Epic swimlanes
│  │  │
│  │  ├─ shared/
│  │  │  ├─ MetricCard.jsx           # Reusable metric
│  │  │  ├─ ProgressBar.jsx          # Progress indicator
│  │  │  ├─ HealthCircle.jsx         # Health score viz
│  │  │  ├─ IssueCard.jsx            # Issue display
│  │  │  ├─ Badge.jsx                # Status badge
│  │  │  └─ Modal.jsx                # Generic modal
│  │  │
│  │  └─ risks/
│  │     ├─ RiskModal.jsx            # Add/edit risk
│  │     ├─ RiskMatrix.jsx           # 3x3 matrix
│  │     └─ MitigationList.jsx       # Actions list
│  │
│  ├─ services/
│  │  ├─ gitlabApi.js                # API wrapper
│  │  │   ├─ fetchIssues()
│  │  │   ├─ fetchMilestones()
│  │  │   ├─ fetchEpics()           # NEW
│  │  │   └─ fetchEpicIssues()      # NEW
│  │  │
│  │  ├─ metricsService.js           # Calculations
│  │  │   ├─ calculateHealthScore()
│  │  │   ├─ calculateProgress()
│  │  │   ├─ calculateEpicHealth()  # NEW
│  │  │   └─ aggregateEpicStats()   # NEW
│  │  │
│  │  ├─ riskService.js              # Risk management
│  │  │   ├─ loadRisks()
│  │  │   ├─ saveRisks()
│  │  │   ├─ addMitigation()
│  │  │   └─ updateMitigation()
│  │  │
│  │  ├─ dependencyService.js        # Dependencies
│  │  │   ├─ extractDependencies()
│  │  │   ├─ buildDependencyGraph()
│  │  │   └─ findCriticalPath()
│  │  │
│  │  ├─ exportService.js            # PowerPoint
│  │  │   ├─ exportToPPT()
│  │  │   ├─ generateExecutiveSlide()
│  │  │   ├─ generateEpicSlide()    # NEW
│  │  │   └─ generateRiskSlide()
│  │  │
│  │  └─ storageService.js           # LocalStorage
│  │      ├─ saveConfig()
│  │      ├─ loadConfig()
│  │      └─ clearAll()
│  │
│  ├─ hooks/
│  │  ├─ useGitLabData.js           # Fetch & cache data
│  │  ├─ useEpics.js                # Epic data hook (NEW)
│  │  ├─ useHealthScore.js          # Health calculation
│  │  ├─ useFilteredData.js         # Filtering logic
│  │  └─ useRisks.js                # Risk state management
│  │
│  ├─ utils/
│  │  ├─ dateUtils.js               # Date formatting
│  │  ├─ labelUtils.js              # Label parsing
│  │  ├─ priorityUtils.js           # Priority detection
│  │  ├─ progressUtils.js           # Progress calculation
│  │  └─ hierarchyUtils.js          # Epic hierarchy (NEW)
│  │
│  ├─ constants/
│  │  ├─ colors.js                  # Color palette
│  │  ├─ labels.js                  # Label mappings
│  │  └─ config.js                  # App config
│  │
│  └─ styles/
│     ├─ main.css                   # Global styles
│     ├─ variables.css              # CSS variables
│     ├─ components.css             # Component styles
│     └─ layout.css                 # Layout styles
│
├─ public/                           # Static assets
│  └─ favicon.ico
│
└─ dist/                            # Build output (gitignored)
   ├─ index.html                    # SINGLE DEPLOYABLE FILE
   └─ assets/
      ├─ index-[hash].js            # (inlined in html)
      └─ index-[hash].css           # (inlined in html)
```

## File Size Estimates

```
src/main.jsx                     20 lines
src/App.jsx                     150 lines
components/views/*.jsx          150 lines each (8 files = 1200)
components/epics/*.jsx          100 lines each (3 files = 300)
components/shared/*.jsx          50 lines each (7 files = 350)
services/*.js                   200 lines each (6 files = 1200)
hooks/*.js                       80 lines each (5 files = 400)
utils/*.js                      100 lines each (5 files = 500)
styles/*.css                    200 lines each (4 files = 800)

TOTAL SOURCE: ~5000 lines (well organized)
BUILT OUTPUT: ~2000 lines (optimized single file)
```

## Key Files Explained

### index.html (Root)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GitLab PM Dashboard</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### src/main.jsx (Entry)
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/main.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

### src/App.jsx (Main Component)
```javascript
import { useState, useEffect } from 'react'
import Header from './components/layout/Header'
import Tabs from './components/layout/Tabs'
import ExecutiveDashboard from './components/views/ExecutiveDashboard'
import EpicView from './components/views/EpicView'
// ... other imports

import useGitLabData from './hooks/useGitLabData'
import useEpics from './hooks/useEpics'

function App() {
  const [view, setView] = useState('executive')
  const { issues, milestones, loading, error } = useGitLabData()
  const { epics } = useEpics()

  return (
    <div className="app">
      <Header stats={stats} />
      <Tabs activeView={view} onViewChange={setView} />

      <main>
        {view === 'executive' && <ExecutiveDashboard {...data} />}
        {view === 'epics' && <EpicView epics={epics} />}
        {/* ... other views */}
      </main>
    </div>
  )
}

export default App
```

### src/services/gitlabApi.js
```javascript
const API_BASE = 'https://devcloud.CompanyName.net/api/v4'

export async function fetchEpics(groupPath, token) {
  const response = await fetch(
    `${API_BASE}/groups/${encodeURIComponent(groupPath)}/epics`,
    { headers: { 'PRIVATE-TOKEN': token } }
  )
  if (!response.ok) throw new Error(`Epic API error: ${response.status}`)
  return response.json()
}

export async function fetchEpicIssues(groupPath, epicId, token) {
  const response = await fetch(
    `${API_BASE}/groups/${encodeURIComponent(groupPath)}/epics/${epicId}/issues`,
    { headers: { 'PRIVATE-TOKEN': token } }
  )
  if (!response.ok) throw new Error(`Epic issues error: ${response.status}`)
  return response.json()
}

// ... more API functions
```

### src/hooks/useEpics.js
```javascript
import { useState, useEffect } from 'react'
import { fetchEpics, fetchEpicIssues } from '../services/gitlabApi'
import { calculateEpicHealth } from '../services/metricsService'

export default function useEpics() {
  const [epics, setEpics] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadEpics() {
      setLoading(true)
      try {
        const epicData = await fetchEpics(groupPath, token)

        // Fetch issues for each epic
        const epicsWithIssues = await Promise.all(
          epicData.map(async (epic) => {
            const issues = await fetchEpicIssues(groupPath, epic.id, token)
            return {
              ...epic,
              issues,
              health: calculateEpicHealth(issues),
              progress: calculateProgress(issues)
            }
          })
        )

        setEpics(epicsWithIssues)
      } catch (err) {
        console.error('Epic loading failed:', err)
      } finally {
        setLoading(false)
      }
    }

    loadEpics()
  }, [groupPath, token])

  return { epics, loading }
}
```

## Vite Configuration

### vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Inline everything into single HTML file
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
```

### package.json
```json
{
  "name": "gitlab-pm-dashboard",
  "version": "5.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "d3": "^7.8.5",
    "pptxgenjs": "^3.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

## Development Workflow

```bash
# Start dev server with hot reload
npm run dev

# Edit any file → browser auto-updates
# No page refresh needed!

# Build for production
npm run build

# Result: dist/index.html (single file, ~500KB)

# Preview production build
npm run preview
```

## Benefits Over Single File

### Development:
- ✅ Hot Module Reload (instant updates)
- ✅ Each component in own file (easy to find)
- ✅ Better IDE support (autocomplete, refactoring)
- ✅ Easy to test individual components
- ✅ Multiple people can work without conflicts

### Production:
- ✅ Still ONE HTML file to deploy
- ✅ Optimized & minified
- ✅ Tree-shaking removes unused code
- ✅ ~40% smaller than current single file
- ✅ Better browser caching (hashed filenames)

### Maintenance:
- ✅ Find bugs faster (small files)
- ✅ Refactor with confidence
- ✅ Reuse components easily
- ✅ Clear separation of concerns
- ✅ Easy to add new features

## Migration Path

1. **Setup Vite** (5 min)
2. **Copy current V4 HTML** (2 min)
3. **Extract components** (30 min)
4. **Extract services** (20 min)
5. **Extract styles** (10 min)
6. **Test** (15 min)
7. **Build** (1 min)

Total: ~90 minutes to migrate

## Conclusion

**Vite + React + ES Modules** gives you:
- Modern development experience
- Single-file deployment (like now)
- Future-proof architecture
- Easy to add Epic hierarchy
- Scalable to 10,000+ lines

**Cost:** 5 minutes setup, 90 minutes migration
**Benefit:** Clean codebase forever
