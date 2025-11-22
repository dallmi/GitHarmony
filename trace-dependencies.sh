#!/bin/bash

SRC_DIR="/Users/micha/Documents/Arbeit/Projektplan/gitlab-pm-dashboard/src"
TRACED_FILE="/tmp/traced_deps.txt"
TO_PROCESS="/tmp/to_process.txt"
PROCESSED="/tmp/processed.txt"

# Clear previous runs
> "$TRACED_FILE"
> "$TO_PROCESS"
> "$PROCESSED"

# Start with App.jsx
echo "App.jsx" > "$TO_PROCESS"

# Function to extract imports from a file
extract_imports() {
    local file=$1
    local full_path="$SRC_DIR/$file"

    if [[ ! -f "$full_path" ]]; then
        return
    fi

    # Extract relative imports
    grep -E "^import .* from '\./|^import .* from '\.\./|^} from '\./|^} from '\.\./" "$full_path" 2>/dev/null | \
    sed -E "s/^import .* from '\.\/(.*)'/\1/g" | \
    sed -E "s/^import .* from '\.\.\/(.*)'/\1/g" | \
    sed -E "s/^.*} from '\.\/(.*)'/\1/g" | \
    sed -E "s/^.*} from '\.\.\/(.*)'/\1/g" | \
    grep -v "^import" | \
    while read -r import_path; do
        # Clean up the path
        import_path=${import_path//\'/}

        # Add .js or .jsx if not present
        if [[ ! "$import_path" =~ \.(js|jsx)$ ]]; then
            if [[ -f "$SRC_DIR/${import_path}.js" ]]; then
                echo "${import_path}.js"
            elif [[ -f "$SRC_DIR/${import_path}.jsx" ]]; then
                echo "${import_path}.jsx"
            elif [[ -f "$SRC_DIR/${import_path}/index.js" ]]; then
                echo "${import_path}/index.js"
            fi
        else
            echo "$import_path"
        fi
    done | sort -u
}

# Process files
while [[ -s "$TO_PROCESS" ]]; do
    current_file=$(head -n1 "$TO_PROCESS")
    tail -n +2 "$TO_PROCESS" > "$TO_PROCESS.tmp" && mv "$TO_PROCESS.tmp" "$TO_PROCESS"

    # Skip if already processed
    if grep -q "^$current_file$" "$PROCESSED" 2>/dev/null; then
        continue
    fi

    echo "Processing: $current_file"
    echo "$current_file" >> "$PROCESSED"
    echo "$current_file" >> "$TRACED_FILE"

    # Extract imports and add to queue
    extract_imports "$current_file" | while read -r dep; do
        if [[ -n "$dep" ]] && ! grep -q "^$dep$" "$PROCESSED" 2>/dev/null; then
            echo "$dep" >> "$TO_PROCESS"
        fi
    done
done

# Show results
echo "Total files traced: $(wc -l < "$TRACED_FILE")"
sort -u "$TRACED_FILE" > "$TRACED_FILE.sorted"
mv "$TRACED_FILE.sorted" "$TRACED_FILE"