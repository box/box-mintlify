#!/bin/bash

set -e

# Script to fetch OpenAPI files from box-openapi repository and process them
# Usage: ./fetch-and-process-openapi.sh [locale] [commit_hash]
#   locale: en (default) or jp
#   commit_hash: optional commit hash to checkout (if not provided, uses latest)

# Default locale
LOCALE="${1:-en}"
COMMIT_HASH="${2:-}"

# Validate locale
if [[ "$LOCALE" != "en" && "$LOCALE" != "jp" ]]; then
  echo "Error: Invalid locale. Must be 'en' or 'jp'"
  echo "Usage: $0 [locale] [commit_hash]"
  exit 1
fi

# Configuration
REPO_URL="https://github.com/box/box-openapi"
BRANCH="$LOCALE"
TEMP_DIR=$(mktemp -d)
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPTS_DIR/../.." && pwd)"

echo "======================================"
echo "Fetching OpenAPI files for locale: $LOCALE"
if [ -n "$COMMIT_HASH" ]; then
  echo "Target commit: $COMMIT_HASH"
fi
echo "======================================"

# Cleanup function
cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    echo "Cleaning up temporary directory..."
    rm -rf "$TEMP_DIR"
  fi
}

# Register cleanup on exit
trap cleanup EXIT

# Clone the repository
if [ -n "$COMMIT_HASH" ]; then
  # If commit hash is specified, do a full clone and checkout specific commit
  echo "Cloning box-openapi repository (branch: $BRANCH)..."
  git clone --branch "$BRANCH" "$REPO_URL" "$TEMP_DIR"
  cd "$TEMP_DIR"
  echo "Checking out commit: $COMMIT_HASH..."
  git checkout "$COMMIT_HASH"
  cd -
else
  # Otherwise, do a shallow clone for speed
  echo "Cloning box-openapi repository (branch: $BRANCH, latest)..."
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TEMP_DIR"
fi

echo "OpenAPI files cloned to temporary directory"

# Navigate to scripts directory
cd "$SCRIPTS_DIR"

# Set options based on locale
DOCS_JSON="../../docs.json"

if [ "$LOCALE" == "en" ]; then
  REFERENCE_DIR="../../reference"
  LOCALE_OPTION=""
else
  REFERENCE_DIR="../../ja/reference"
  LOCALE_OPTION="--locale ja"
fi

echo ""
echo "======================================"
echo "Renaming files in temp directory..."
echo "======================================"

# Determine suffix based on locale
SUFFIX=""
if [ "$LOCALE" != "en" ]; then
  SUFFIX="-$LOCALE"
fi

# Rename files: openapi*.json -> box-openapi*[-locale].json
for file in "$TEMP_DIR"/openapi*.json; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    newname="${filename/openapi/box-openapi}"
    newname="${newname/.json/$SUFFIX.json}"
    mv "$file" "$TEMP_DIR/$newname"
    echo "  Renamed: $filename -> $newname"
  fi
done

# Set pattern for processing
PATTERN="box-openapi(-v[0-9]+\\.[0-9]+)?${SUFFIX}\\.json$"

echo ""
echo "======================================"
echo "Processing OpenAPI files in temp directory..."
echo "======================================"

# Step 1: Clean descriptions
echo ""
echo "Step 1/5: Cleaning descriptions..."
npm run clean-descriptions -- --directory "$TEMP_DIR" --pattern "$PATTERN"

# Step 2: Add code samples
echo ""
echo "Step 2/5: Adding code samples..."
npm run add-code-samples -- --directory "$TEMP_DIR" --pattern "$PATTERN"

# Step 3: Add Mint config
echo ""
echo "Step 3/5: Adding Mint configuration..."
npm run add-mint-config -- --directory "$TEMP_DIR" --pattern "$PATTERN"

# Step 4: Create API pages
echo ""
echo "Step 4/5: Creating API pages..."
npm run create-api-pages -- --directory "$TEMP_DIR" --pattern "$PATTERN" --reference-dir "$REFERENCE_DIR" $LOCALE_OPTION

# Step 5: Update docs.json
echo ""
echo "Step 5/5: Updating docs.json navigation..."
npm run update-docs-json -- --directory "$TEMP_DIR" --pattern "$PATTERN" --docs-json "$DOCS_JSON" $LOCALE_OPTION

echo ""
echo "======================================"
echo "Copying processed files to root directory..."
echo "======================================"

# Copy processed files from temp dir to root dir (already renamed)
for file in "$TEMP_DIR"/box-openapi*.json; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    cp "$file" "$ROOT_DIR/$filename"
    echo "  Copied: $filename"
  fi
done

echo ""
echo "======================================"
echo "Processing complete!"
echo "======================================"
echo "Locale: $LOCALE"
echo "Files processed: $PATTERN"
echo "Reference directory: $REFERENCE_DIR"
