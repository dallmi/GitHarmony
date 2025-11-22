#!/bin/bash

OUTPUT="/Users/micha/Documents/Arbeit/Projektplan/gitlab-pm-dashboard-full-source.txt"
SRC_DIR="/Users/micha/Documents/Arbeit/Projektplan/gitlab-pm-dashboard/src"

# Core files to include (most important)
CORE_FILES=(
  "App.jsx"
  "main.jsx"
  "components/ConfigModal.jsx"
  "services/storageService.js"
  "services/backupService.js"
  "services/gitlabApi.js"
  "hooks/useGitLabData.js"
  "components/OverviewView.jsx"
  "components/CommunicationsTab.jsx"
  "components/DebugPanel.jsx"
)

echo "# GitLab PM Dashboard - Complete Source Code for Claude AI" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "Generated: $(date)" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"

for file in "${CORE_FILES[@]}"; do
  filepath="$SRC_DIR/$file"
  if [ -f "$filepath" ]; then
    echo "" >> "$OUTPUT"
    echo "## FILE: src/$file" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo '```javascript' >> "$OUTPUT"
    cat "$filepath" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo "---" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
  fi
done

echo "Created: $OUTPUT"
wc -l "$OUTPUT"
