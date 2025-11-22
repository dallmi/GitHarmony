#!/bin/bash

# Active views from App.jsx that are actually RENDERED
ACTIVE_VIEWS=(
  "EnhancedExecutiveDashboard"
  "IssueComplianceView"
  "CycleTimeView"
  "EpicManagementView"
  "RiskManagementView"
  "RoadmapView"
  "SprintManagementView"
  "VelocityView"
  "ResourcePlanningView"
  "TeamManagementView"
  "StakeholderHubView"
  "CrossTeamCoordinationView"
  "ReleasePlanningView"
  "BackupRestoreView"
  "ConfigModal"
  "RoleSelectorModal"
  "DebugPanel"
  "Header"
  "Tabs"
  "GroupedTabs"
  "IterationFilterDropdown"
  "PortfolioFilterDropdown"
)

echo "=== ANALYZING DEPENDENCIES FOR ACTIVE VIEWS ==="
echo ""

SRC="/Users/micha/Documents/Arbeit/Projektplan/gitlab-pm-dashboard/src"

for view in "${ACTIVE_VIEWS[@]}"; do
  FILE="$SRC/components/$view.jsx"
  if [[ -f "$FILE" ]]; then
    echo "[$view]"
    # Get local imports
    grep -E "^import .* from '\./|^import .* from '\.\./" "$FILE" | \
      sed -E "s/^import .* from '(.*)'/  → \1/" | \
      sed -E "s/^.*} from '(.*)'/  → \1/"
    echo ""
  fi
done