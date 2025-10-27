# Single-File HTML Build Configuration

## Problem
Standard Vite build creates multiple files that require a web server.
We need a SINGLE index.html that works with double-click (file:// protocol).

## Solution: vite-plugin-singlefile

### Installation
```bash
npm install --save-dev vite-plugin-singlefile
```

### Configuration

**vite.config.js**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile()  // ← Magic plugin
  ],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    brotliSize: false,
    rollupOptions: {
      inlineDynamicImports: true,
      output: {
        manualChunks: undefined,
      },
    },
  },
})
```

## Result

```bash
npm run build

# Creates:
dist/
└─ index.html  # ONE FILE with everything inlined!
```

**This index.html:**
- ✅ Works with double-click (file://)
- ✅ No server needed
- ✅ All CSS inline
- ✅ All JS inline
- ✅ React inline
- ✅ D3 inline
- ✅ Everything inline!

## File Size

```
Current V4:     ~500 KB (uncompressed)
Vite build:     ~450 KB (compressed & optimized)
Gzipped:        ~120 KB
```

## Development vs Production

### Development (while coding):
```bash
npm run dev
# → http://localhost:5173
# → Hot reload, fast refresh
# → Requires server
```

### Production (deployment):
```bash
npm run build
cd dist
open index.html  # ← Double-click works!
```

## Complete Workflow

```bash
# 1. Setup (once)
npm create vite@latest gitlab-pm -- --template react
cd gitlab-pm
npm install
npm install --save-dev vite-plugin-singlefile
npm install d3 pptxgenjs

# 2. Development (daily)
npm run dev
# Code, code, code... (with hot reload)

# 3. Build for deployment (when done)
npm run build

# 4. Deploy
cp dist/index.html /your/deployment/path/

# 5. User experience
# User double-clicks index.html → Works!
```

## Alternative: No Build Step (Pure Browser)

If you REALLY don't want ANY build step, you can use:

### Option: Import Maps (Modern Browsers)

**index.html**
```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18",
      "react-dom": "https://esm.sh/react-dom@18",
      "react-dom/client": "https://esm.sh/react-dom@18/client",
      "d3": "https://esm.sh/d3@7"
    }
  }
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

**src/main.js** (Pure JS, no JSX!)
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(App)
)
```

**src/App.js**
```javascript
import React from 'react'

export default function App() {
  return React.createElement('div', null,
    React.createElement('h1', null, 'GitLab PM Dashboard')
  )
}
```

**Pros:**
- ✅ No build step
- ✅ Works with double-click
- ✅ ES Modules work

**Cons:**
- ❌ No JSX (must use React.createElement)
- ❌ Slower initial load (downloads from CDN)
- ❌ Requires internet connection
- ❌ Less dev experience

## Recommendation Matrix

| Requirement | Solution | Build Step? | Double-Click? |
|-------------|----------|-------------|---------------|
| **Modular code + JSX** | Vite + singlefile | ✅ Yes (once) | ✅ Yes |
| **No build ever** | Import Maps | ❌ No | ✅ Yes* |
| **Current setup** | Single HTML + Babel | ❌ No | ✅ Yes |

*Requires modern browser (Chrome 89+, Firefox 108+, Safari 16.4+)

## My Recommendation

**Use Vite + vite-plugin-singlefile:**

1. Best development experience
2. Clean code structure
3. Single-file output
4. Works with double-click
5. Optimized & fast

**Workflow:**
- Development: `npm run dev` (with server)
- Production: `npm run build` → `dist/index.html` (double-click works!)

## Example Build Output

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GitLab PM Dashboard</title>
  <style>
    /* All CSS inlined here (~10KB) */
    :root { --primary: #E60000; }
    .card { background: white; }
    /* ... */
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    /* All React + Your Code + D3 inlined here (~400KB minified) */
    (function(){const e=React,t=ReactDOM;
    /* ... entire app ... */
    })()
  </script>
</body>
</html>
```

**This file works with double-click!**

## Testing Double-Click Works

```bash
# After build
cd dist

# Test 1: Double-click in Finder/Explorer
# Should open in browser and work!

# Test 2: From terminal
open index.html
# or
xdg-open index.html  # Linux

# Test 3: Drag to browser
# Drag index.html to browser window
# Should work!
```

## Summary

**Question:** "Can I double-click the HTML?"

**Answer:**
- ❌ During development (npm run dev): No, needs server
- ✅ Production build (npm run build): YES, works with double-click!

**The build step is a one-time action when you're done coding.**
Users only see the final `dist/index.html` which works exactly like your current setup.
