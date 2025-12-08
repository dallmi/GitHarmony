#!/bin/bash

# Script to remove common emojis from JSX/JS files
# This will preserve the file structure and only remove emojis

TARGET_DIR="gitlab-pm-dashboard/src"

# List of emojis to remove (as individual sed commands for better compatibility)
declare -a EMOJIS=(
  "🔍" "📋" "⚠️" "✓" "▼" "▶" "✨" "📁" "🚨" "🗺️"
  "📅" "🚫" "🔐" "💡" "🏢" "🎯" "📊" "⏱️" "👥" "🔄"
  "📈" "📄" "👤" "ℹ️" "⚙️" "🚀" "⚡" "📝" "🔥" "💪"
  "🎉" "🆕" "✅" "❌" "🟢" "🟡" "🔴" "📌" "🏃" "⏰"
)

# Find all JS/JSX files and process them
find "$TARGET_DIR" -type f \( -name "*.jsx" -o -name "*.js" \) | while read -r file; do
  # Check if file contains any emojis
  if grep -q "[\x{1F300}-\x{1F9FF}]" "$file" 2>/dev/null; then
    echo "Processing: $file"

    # Create backup
    cp "$file" "$file.bak"

    # Remove each emoji
    for emoji in "${EMOJIS[@]}"; do
      # Use perl for better UTF-8 handling
      perl -i -C -pe "s/$emoji//g" "$file" 2>/dev/null || true
    done

    echo "  ✓ Cleaned"
  fi
done

echo "Done! Backup files saved with .bak extension"
