#!/bin/bash

# GitLab PM Dashboard - Cleanup Unused Files Script
# WARNING: This will DELETE files! Make sure you have a backup!

PROJECT_DIR="/Users/micha/Documents/Arbeit/Projektplan/gitlab-pm-dashboard"
SRC_DIR="$PROJECT_DIR/src"

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          GitLab PM Dashboard - Cleanup Unused Files                  ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in a git repository
if [ -d "$PROJECT_DIR/.git" ]; then
    echo "✅ Git repository detected. Creating safety branch..."
    cd "$PROJECT_DIR"
    git checkout -b cleanup-unused-files-$(date +%Y%m%d-%H%M%S)
    git add .
    git commit -m "Backup before removing unused files" 2>/dev/null
    echo "✅ Safety branch created"
else
    echo "⚠️  WARNING: Not a git repository!"
    echo "Creating manual backup..."
    cp -r "$PROJECT_DIR" "$PROJECT_DIR-backup-$(date +%Y%m%d-%H%M%S)"
    echo "✅ Backup created"
fi

echo ""
echo "Starting cleanup..."
echo ""

# Files to DELETE (confirmed unused)
FILES_TO_DELETE=(
    # Duplicate/Replaced Components
    "components/ExecutiveDashboard.jsx"
    "components/MultiSourceConfig.jsx"

    # Unused View Components
    "components/CommunicationsDashboard.jsx"
    "components/DependencyGraphView.jsx"
    "components/DependencyManagementView.jsx"
    "components/DependencyAlertsSection.jsx"
    "components/InsightsView.jsx"
    "components/UnifiedEpicIssueView.jsx"
    "components/TeamResourcesView.jsx"
    "components/SprintPlanningView.jsx"
    "components/StatusGeneratorModal.jsx"
    "components/TeamConfigModal.jsx"
    "components/SearchableSelect.jsx"

    # Unused Services
    "services/debugGitlabApi.js"
    "services/multiSourceGitlabApi.js"
    "services/unifiedVelocityService.js"
    "services/memberVelocityService.js"
    "services/teamAttributionService.js"
    "services/teamImportService.js"
    "services/insightsService.js"
    "services/workflowIntelligenceService.js"
    "services/backlogHealthService.js"
    "services/dependencyService.js"
    "services/crossProjectLinkingService.js"
    "services/crossInitiativeDependencyService.js"
    "services/complianceService.js"
    "services/statusGeneratorService.js"
    "services/pptExportService.js"
    "services/designTokens.js"
    "services/colors.js"
)

# Count files
TOTAL_FILES=${#FILES_TO_DELETE[@]}
DELETED_COUNT=0
NOT_FOUND_COUNT=0

echo "Found $TOTAL_FILES files to delete"
echo ""

# Delete files
for file in "${FILES_TO_DELETE[@]}"; do
    FILE_PATH="$SRC_DIR/$file"
    if [ -f "$FILE_PATH" ]; then
        rm "$FILE_PATH"
        echo "  ❌ Deleted: $file"
        ((DELETED_COUNT++))
    else
        echo "  ⚠️  Not found: $file"
        ((NOT_FOUND_COUNT++))
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# Files to CHECK (might be used)
echo "Files that need manual verification:"
echo ""
FILES_TO_CHECK=(
    "components/PortfolioView.jsx"
    "components/PlaceholderView.jsx"
    "components/HealthCircle.jsx"
    "components/MetricCard.jsx"
    "components/BacklogHealthCard.jsx"
    "components/EpicDebugger.jsx"
)

for file in "${FILES_TO_CHECK[@]}"; do
    FILE_PATH="$SRC_DIR/$file"
    if [ -f "$FILE_PATH" ]; then
        echo "  ❓ Please verify: $file"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 CLEANUP SUMMARY:"
echo ""
echo "  ✅ Files deleted: $DELETED_COUNT"
echo "  ⚠️  Files not found: $NOT_FOUND_COUNT"
echo "  ❓ Files to verify: ${#FILES_TO_CHECK[@]}"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# Test build
echo "Testing build..."
cd "$PROJECT_DIR"
npm run build > /tmp/build-output.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Application compiles without errors."
else
    echo "❌ Build failed! Check /tmp/build-output.log for errors."
    echo ""
    echo "To rollback changes:"
    if [ -d "$PROJECT_DIR/.git" ]; then
        echo "  git checkout main"
        echo "  git branch -D cleanup-unused-files-*"
    else
        echo "  Restore from backup: $PROJECT_DIR-backup-*"
    fi
fi

echo ""
echo "NEXT STEPS:"
echo "1. Test the application manually"
echo "2. Verify all features work"
echo "3. Check the files marked with ❓"
echo "4. If everything works, commit the changes"
echo ""
echo "Complete! 🎉"