# GitLab Project Management Dashboard - Enterprise Edition

A professional, browser-based Project Management solution for GitLab with Executive Dashboard, Risk Management, and Dependency Tracking.

## 🆕 Latest: V3 - Enterprise Edition
**New in V3:** Dependency Graph, Risk Register with Mitigation Tracking, Enhanced PowerPoint Export

## Overview

Professional project management tool for GitLab with multiple views and enterprise features:

### Version Comparison

| Feature | V1 (German) | V2 (Executive) | V3 (Enterprise) |
|---------|-------------|----------------|-----------------|
| Language | German | English | English |
| Executive Dashboard | ❌ | ✅ | ✅ Enhanced |
| Health Scoring | ❌ | ✅ | ✅ |
| PowerPoint Export | ❌ | ✅ | ✅ Enhanced |
| Dependency Graph | ❌ | ❌ | ✅ |
| Risk Register | ❌ | ❌ | ✅ |
| Mitigation Tracking | ❌ | ❌ | ✅ |

### Available Views
- **👔 Executive Dashboard**: C-level ready summary with RAG status and health score
- **🔗 Dependency Graph**: Interactive network diagram showing issue dependencies and critical paths
- **⚠️ Risk Register**: Probability × Impact matrix with mitigation action tracking
- **📊 Gantt Chart**: Timeline visualization (V1/V2)
- **🗺️ Roadmap**: Milestone-based progress tracking (V1/V2)
- **🏃 Sprint Board**: Kanban-style agile board (V1/V2)
- **👥 Team Resources**: Workload distribution per team member (V1/V2)

## 🚀 V3 Enterprise Features

### 1. Executive Dashboard
- **Automated Health Score**: 4-dimensional scoring (Completion, Schedule, Blockers, Risk)
- **RAG Status**: Red/Amber/Green visual indicators
- **Key Metrics Cards**: Completion rate, blockers, active risks, dependencies
- **Critical Alerts**: Top blockers and recent achievements
- **Trend Analysis**: Performance indicators

### 2. Dependency Graph (NEW in V3)
- **Interactive Network Diagram**: D3.js-powered visualization
- **Dependency Detection**: Automatically parses "blocked by #123" from issue descriptions
- **Critical Path Highlighting**: Visual identification of bottlenecks
- **Drag & Drop**: Interactive node positioning
- **Color Coding**:
  - 🔵 Blue: In Progress
  - 🟢 Green: Completed
  - 🔴 Red: Blocker
- **Statistics Dashboard**: Total issues, dependencies, blocking relationships

### 3. Risk Register (NEW in V3)
- **Probability × Impact Matrix**: 3x3 grid (Low/Medium/High)
- **Risk Categorization**: Visual heat map
- **Risk Management**:
  - Add/Edit/Delete risks
  - Assign risk owners
  - Track status (Active/Closed)
- **Mitigation Actions**:
  - Add mitigation plans per risk
  - Assign owners to actions
  - Track completion status
  - Checkbox-based workflow
- **Data Persistence**: Risks stored in localStorage

### 4. Enhanced PowerPoint Export
- **3+ Professional Slides**:
  - Executive Summary (Health Score + Metrics Table)
  - Risks & Dependencies Summary
  - Enhanced with active risks count
- **UBS Branded**: Corporate color scheme
- **Auto-generated filename**: Project-Status-{project}-{date}.pptx
- **One-Click Export**: No configuration needed

### 5. Real-Time GitLab Integration
- Live data from GitLab API
- Issue tracking with labels
- Milestone progress
- Assignee workload
- Blocker detection

## Installation & Setup

### Voraussetzungen
Keine Installation notwendig! Die Anwendung läuft vollständig im Browser.

### Verwendung

1. **HTML-Datei öffnen**
   ```bash
   # Öffne die Datei in deinem Browser
   open gitlab-projektplan.html
   ```

2. **GitLab Verbindung konfigurieren**
   - **GitLab URL**: Die URL deiner GitLab-Instanz (z.B. `https://devcloud.ubs.net`)
   - **Personal Access Token**: Erstelle einen Token in GitLab unter Settings → Access Tokens
     - Erforderliche Scopes: `api`, `read_api`
   - **Projekt-ID**: Format `namespace/project` (z.B. `myteam/myproject`)

3. **Verbinden**
   Klicke auf "Verbinden" - deine Konfiguration wird lokal im Browser gespeichert.

## GitLab Personal Access Token erstellen

1. In GitLab: **Settings → Access Tokens**
2. Token Name: z.B. "Project Management Dashboard"
3. Expiration date: Nach Bedarf setzen
4. Scopes auswählen:
   - `api` - Vollzugriff auf die API
   - `read_api` - Nur Lesezugriff (empfohlen wenn möglich)
5. Token kopieren und im Dashboard einfügen

## Label-Konventionen

Das Tool nutzt GitLab-Labels zur intelligenten Kategorisierung:

### Sprint-Organisation
- Labels mit `Sprint` oder `Iteration` werden für Sprint-Gruppierung verwendet
- Beispiele: `Sprint 1`, `Sprint 2024-Q1`, `Iteration 5`

### Status-Tracking
- `WIP` / `In Progress` → 50% Fortschritt
- `Review` / `Testing` → 75% Fortschritt
- `Started` → 25% Fortschritt
- `Closed` Status → 100% Fortschritt

### Prioritäten
- `Critical` / `Urgent` / `High` → High Priority
- `Low` → Low Priority
- Standard → Medium Priority

### Blocker
- `Blocker` oder `Blocked` → Wird als kritischer Blocker markiert

## Ansichten im Detail

### Gantt Chart
Zeigt alle Issues mit Zeitplanung auf einer Timeline:
- Farb-Kodierung: Blocker (rot), In Progress (blau), Done (grün), Overdue (dunkelrot)
- Fortschrittsanzeige pro Task
- Klickbar für direkten Zugriff auf GitLab Issue

### Roadmap
Milestone-basierte Ansicht mit:
- Fortschrittsbalken pro Milestone
- High Priority / At Risk / Overdue Metriken
- Blocker-Auflistung pro Milestone
- Backlog für Issues ohne Milestone

### Sprint Board
Kanban-Style Board:
- Automatische Gruppierung nach Sprint-Labels
- Drei Spalten: To Do, In Progress, Done
- Fortschrittsberechnung pro Sprint

### Team View
Ressourcen-Management:
- Workload pro Person
- Aufgabenliste mit Status
- Completed vs. Open Issues
- Blocker-Count pro Person
- Warnung für nicht zugewiesene Issues

## Technische Details

### Stack
- **Frontend**: React 18 (via CDN)
- **Styling**: Tailwind CSS
- **API**: GitLab REST API v4
- **Datenspeicherung**: LocalStorage (nur Credentials)

### Browser-Kompatibilität
- Chrome/Edge (empfohlen)
- Firefox
- Safari

### Sicherheit
- Credentials werden nur im Browser LocalStorage gespeichert
- Keine Server-seitige Speicherung
- Direkter API-Zugriff zu GitLab
- CORS muss auf GitLab-Seite aktiviert sein

## Troubleshooting

### "API Fehler: 401"
- Token ist ungültig oder abgelaufen
- Neuen Personal Access Token erstellen

### "API Fehler: 404"
- Projekt-ID ist falsch formatiert
- Richtig: `namespace/project`
- Zugriff auf Projekt überprüfen

### "Keine Zeitplanung vorhanden"
- Issues benötigen Due Dates oder Milestones
- In GitLab: Issue bearbeiten → Due Date setzen

### CORS-Fehler
- GitLab muss CORS für deine Domain erlauben
- Alternative: Browser-Extension für CORS verwenden (nur für Entwicklung)

## Anpassungen

### UBS Farben ändern
In der CSS-Sektion (Zeilen 12-14):
```css
:root {
    --ubs-red: #E60000;
    --ubs-red-dark: #B80000;
}
```

### API-Limits
GitLab API hat Rate Limits. Bei großen Projekten:
- `per_page=100` Parameter anpassen
- Pagination implementieren für >100 Issues

## Roadmap / Zukünftige Features

- Export zu PDF/Excel
- Burndown Charts
- Time Tracking Integration
- Dependency Mapping
- Multi-Project Dashboard
- Velocity Tracking

## Lizenz

Dieses Tool ist für den internen Gebrauch entwickelt.

## Support

Bei Fragen oder Problemen:
1. GitLab API Dokumentation prüfen: https://docs.gitlab.com/ee/api/
2. Browser Console auf Fehler überprüfen (F12)
3. Netzwerk-Tab für API-Anfragen analysieren
