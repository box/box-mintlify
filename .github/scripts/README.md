# API Documentation Scripts

This directory contains scripts for generating and managing API documentation from OpenAPI specifications.

## Scripts

### 1. `create-api-pages.ts`

Generates MDX documentation pages for API endpoints and resources from OpenAPI specification files.

**Features:**
- Creates endpoint pages with frontmatter
- Generates resource pages with `openapi-schema` references
- Cleans up removed endpoints/resources
- Reports files that were removed but not recreated
- Supports multiple API versions

**Usage:**

```bash
cd .github/scripts
npm run create-api-pages -- <openapi-file-pattern> <output-directory>
```

**Examples:**

```bash
# Process a single OpenAPI file
npm run create-api-pages -- ../../box-openapi.json ../../reference

# Process versioned OpenAPI file
npm run create-api-pages -- ../../box-openapi-v2025.0.json ../../reference

# Process all OpenAPI files (use shell glob expansion)
npm run create-api-pages -- ../../box-openapi(-v[0-9]+\\.[0-9]+)?\\.json ../../reference
```

**Output:**
- Endpoint files: `reference/get-users-id.mdx`, `reference/v2025.0/post-archives.mdx`, etc.
- Resource files: `reference/resources/user.mdx`, `reference/v2025.0/resources/archive.mdx`, etc.
- Index files are preserved

---

### 2. `update-docs-json.ts`

Updates the `docs.json` navigation structure based on OpenAPI specifications. Automatically detects versions and organizes content by `x-box-tag` groupings.

**Features:**
- Auto-detects API versions from OpenAPI files
- Groups endpoints and resources by `x-box-tag`
- Supports multiple languages (English and Japanese)
- Sorts groups, resources, and endpoints with locale support
- Updates only specific version sections without overwriting others

**Usage:**

```bash
cd .github/scripts
npm run update-docs-json -- --openapi <pattern> --tab <tab-name> [options]
```

**Arguments:**
- `--openapi <pattern>` - Path or glob pattern for OpenAPI JSON file(s)
- `--tab <tab-name>` - Tab name: `"API reference"` or `"APIリファレンス"`
- `--docs-json <path>` - Path to docs.json (default: `../../docs.json`)
- `--locale <locale>` - Locale for sorting (default: `en`, e.g., `ja`, `en`, `fr`)

**Examples:**

```bash
# Update English API reference
npm run update-docs-json -- --openapi "../../box-openapi*.json" --tab "API reference"

# Update Japanese API reference with Japanese locale sorting
npm run update-docs-json -- --openapi "../../box-openapi*-jp.json" --tab "APIリファレンス" --locale ja
```

**Sorting Rules:**
- **Groups**: Alphabetically by title
- **Resources**: Alphabetically by resource title from OpenAPI schema
- **Endpoints**: By HTTP method order (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD), then alphabetically by title

---

## Typical Workflow

1. **Update OpenAPI specifications** (e.g., `box-openapi.json`, `box-openapi-v2025.0.json`)

2. **Generate documentation pages:**
   ```bash
   npm run create-api-pages -- ../../box-openapi*.json ../../reference
   ```

3. **Update navigation structure:**
   ```bash
   # English
   npm run update-docs-json -- --openapi "../../box-openapi*.json" --tab "API reference"

   # Japanese
   npm run update-docs-json -- --openapi "../../box-openapi*-jp.json" --tab "APIリファレンス" --locale ja
   ```

4. **Review changes** and commit

---

## Requirements

- Node.js
- TypeScript (`ts-node`)
- Dependencies listed in `package.json`

Install dependencies:
```bash
cd .github/scripts
npm install
```

---

## Notes

- `create-api-pages.ts` removes old files that are no longer in the OpenAPI spec (cleanup mode enabled by default)
- `update-docs-json.ts` processes multiple versions from a single command and updates each version's section independently
- Both scripts support versioned APIs (version detected from OpenAPI `info.version`)
- Resources and endpoints without valid `x-box-tag` are skipped

