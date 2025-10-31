# GitHarmony - Professional Design Audit & Remediation

**Goal:** Transform GitHarmony into a professional tool suitable for conservative banking environments
**Target:** Remove playful emojis, use minimal professional symbols, eliminate vendor-specific references

---

## Brand Identity Change

### Application Name
- **From:** "GitLab Project Management" / "GitLab PM Dashboard"
- **To:** "GitHarmony - teams in tune"
- **Tagline:** Professional, collaborative, harmonious teamwork

### Color Scheme Updates
**Remove:**
- UBS-specific red (#E60000) references in code comments
- "UBS corporate design" mentions

**Replace with:**
- Professional neutral palette
- Primary: #DC2626 (Professional red)
- Keep current color scheme but remove UBS branding mentions

---

## Icon/Emoji Audit & Replacement Strategy

### ❌ Icons to REMOVE (Too Playful/Unprofessional)

| Current Icon | Location | Reason | Replacement |
|--------------|----------|--------|-------------|
| 🚨 | AI Insights - Critical Items | Too alarming, startup-like | "Critical" text badge (red) |
| 🔥 | Risk Analysis | Too casual | "High Risk" text badge |
| 💡 | Insights/Recommendations | Cliché | "Insight:" text prefix |
| 🎯 | Sprint Goals | Game-like | "Sprint Goal:" text |
| 📋 | Various clipboard uses | Overused | "Tasks" or remove |
| 🎨 | Settings/Customization | Artistic, not professional | "Settings" icon or gear symbol |
| 💼 | Stakeholder sections | Too literal | Remove, use text |

### ⚠️ Icons to REVIEW (Case-by-Case)

| Current Icon | Location | Keep/Replace | Decision |
|--------------|----------|--------------|----------|
| ⚙️ | Settings buttons | KEEP | Standard settings symbol |
| ✅ | Success states | KEEP | Universal success indicator |
| ❌ | Error states | KEEP | Universal error indicator |
| ⚠️ | Warnings | KEEP | Standard warning symbol |
| 📊 | Charts/Dashboards | REPLACE | Use "Dashboard" text |
| 📈 | Velocity/Metrics | REPLACE | Use "Metrics" text |
| 🔗 | Dependencies/Links | KEEP | Standard link symbol |
| 🔄 | Refresh/Sync | KEEP | Standard refresh symbol |
| 📁 | Portfolio/Files | KEEP | Standard folder symbol |

### ✅ Acceptable Minimal Icons (Keep)

**Standard UI Symbols:**
- ⚙️ Settings
- ✅ Success/Complete
- ❌ Error/Failed
- ⚠️ Warning
- 🔗 Links/Dependencies
- 🔄 Refresh/Reload
- 📁 Folders/Portfolio
- ↑ ↓ Sort/Trend indicators
- ▶ ▼ Expand/Collapse

**Text-Based Indicators:**
- "High Risk" / "Medium" / "Low" badges
- "Critical" / "Warning" / "Info" labels
- Colored dots/badges for status

---

## Specific Changes Required

### 1. Application Title Changes

**Files to Update:**
- `index.html` - Page title
- `Header.jsx` - Header branding
- `ConfigModal.jsx` - Modal titles
- `README.md` - Documentation
- All commit messages going forward

**Changes:**
```
"GitLab Project Management" → "GitHarmony"
"GitLab PM Dashboard" → "GitHarmony - teams in tune"
```

### 2. Excel Export Icon

**Current:** 📊 or 📈 (emoji)
**Problem:** Unprofessional, not clear
**Solution:** Text button "Export Excel" or use CSV text

**Files:**
- Any export buttons with chart emojis
- Replace with: "⬇ Export" or "Export CSV"

### 3. AI Insights Section

**Current Issues:**
```jsx
🚨 Critical Items (3)  // Too alarming
💡 Recommendations     // Too casual
```

**Professional Replacement:**
```jsx
[Critical] (3)         // Red text badge
[Insight]              // Blue text badge
```

### 4. Sprint Management

**Current:**
```jsx
🎯 Sprint Goal         // Game-like
📋 Sprint Planning     // Overused
🔄 Retrospective       // OK
```

**Professional Replacement:**
```jsx
Sprint Goal:           // Clean text
Sprint Planning        // No icon
Retrospective Actions  // Keep 🔄 (standard)
```

### 5. Risk Analysis

**Current:**
```jsx
🔥 High Risk           // Too casual
⚠️ Medium Risk         // OK
ℹ️ Low Risk            // OK
```

**Professional Replacement:**
```jsx
[HIGH]                 // Red badge
[MEDIUM]               // Yellow badge
[LOW]                  // Green badge
```

### 6. Portfolio View

**Current:**
```jsx
📁 Portfolio           // OK - standard folder
💼 Projects            // Remove - too literal
```

**Keep:**
```jsx
📁 Portfolio           // Standard folder icon
```

---

## UBS Reference Removal

### Code Comments to Update

Search and replace in all files:
```
"UBS red" → "Brand red"
"UBS corporate" → "Corporate"
"#E60000" → "#DC2626" (in comments only, keep actual color value)
"UBS design" → "Professional design"
```

### Files Likely to Contain UBS References:
- `README.md`
- `SWOT-ANALYSIS.md`
- Component comments
- Service file headers
- Commit messages (historical, leave unchanged)

---

## Implementation Priority

### Phase 1: Critical (Do Now)
1. ✅ Rename to GitHarmony in all visible text
2. ✅ Remove 🚨 from AI Insights (replace with text badge)
3. ✅ Remove 💡 from recommendations
4. ✅ Remove 🔥 from risk levels
5. ✅ Remove 🎯 from Sprint Goals
6. ✅ Fix Excel export icon (use text)

### Phase 2: Polish (Next)
7. Remove 📊 📈 from dashboard headers
8. Remove 💼 from stakeholder sections
9. Audit all remaining emojis
10. Update README and documentation

### Phase 3: Cleanup (Final)
11. Remove UBS references from code comments
12. Update branding documentation
13. Create professional brand guidelines

---

## Professional Design Principles

### Icon Usage Rules for GitHarmony:

1. **Minimal Usage:**
   - Use icons only when they add clarity
   - Prefer text labels over decorative icons
   - Maximum 3-4 icon types per view

2. **Standard Symbols Only:**
   - ⚙️ Settings
   - ✅ ❌ ⚠️ Status indicators
   - 🔗 🔄 📁 Standard UI actions
   - ↑ ↓ ▶ ▼ Navigation/sorting

3. **Avoid:**
   - Faces/people emojis
   - Objects (💡 🔥 📊 📈 🎯)
   - Colorful playful emojis
   - "Fun" symbols that don't add meaning

4. **Text-First Approach:**
   - "Critical" not 🚨
   - "Insight:" not 💡
   - "High Risk" not 🔥
   - "Export" not 📊

5. **Color-Coded Badges:**
   ```jsx
   <span style={{
     padding: '4px 8px',
     background: '#FEE2E2',
     color: '#DC2626',
     borderRadius: '4px',
     fontSize: '11px',
     fontWeight: '600'
   }}>
     HIGH
   </span>
   ```

---

## Expected Outcome

**Before:**
```
🚨 Critical Items (5)
💡 AI Recommendation: Consider refactoring...
🔥 High Risk: Backend service down
🎯 Sprint Goal: Deliver MVP
📊 Export to Excel
```

**After (Professional):**
```
[CRITICAL] (5)
[INSIGHT] Consider refactoring...
[HIGH RISK] Backend service down
Sprint Goal: Deliver MVP
⬇ Export CSV
```

---

## Files Requiring Updates

### High Priority (User-Facing):
1. `src/components/InsightsView.jsx` - Remove 🚨 💡
2. `src/components/RiskAnalysisView.jsx` - Remove 🔥
3. `src/components/SprintGoalSection.jsx` - Remove 🎯
4. `src/components/Header.jsx` - Update app name
5. `index.html` - Update title
6. Any export buttons - Fix icons

### Medium Priority (Internal):
7. `README.md` - Rebrand to GitHarmony
8. All component file headers - Update descriptions
9. Remove UBS references from comments

### Low Priority (Historical):
10. Existing commit messages (leave as-is)
11. SWOT analysis (update if referenced)

---

**Status:** Ready for implementation
**Estimated Effort:** 3-4 hours
**Impact:** High - Transforms app from startup-style to enterprise-ready
