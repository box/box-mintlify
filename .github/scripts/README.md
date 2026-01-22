# Box OpenAPI Scripts

This directory contains scripts for generating API documentation from OpenAPI specification files.

All scripts use [Commander.js](https://github.com/tj/commander.js) for argument parsing and provide built-in help. Use `--help` with any script to see all available options:

```bash
npm run <script-name> -- --help
```

## Scripts

### Generate API Pages

Generate API reference pages from OpenAPI specification files:

```bash
npm run create-api-pages -- --directory <directory> --pattern <pattern> [options]
```

**Arguments:**
- `--directory` - Path to directory containing OpenAPI JSON files
- `--pattern` - Regex pattern to match filenames
- `--reference-dir` - Path to reference directory (default: reference)
- `--locale` - Locale for notes (default: en, e.g., ja, en)

**Examples:**
```bash
# Generate pages from all en OpenAPI files
npm run create-api-pages -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?\\.json$" --reference-dir "../../reference"

# Generate pages from all jp OpenAPI files to ja/reference directory
npm run create-api-pages -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?-jp\\.json$" --reference-dir "../../ja/reference" --locale ja
```

### Update docs.json Navigation

Update the `docs.json` navigation structure from OpenAPI specification files:

```bash
npm run update-docs-json -- --directory <directory> --pattern <pattern> [options]
```

**Arguments:**
- `--directory` - Path to directory containing OpenAPI JSON files
- `--pattern` - Regex pattern to match filenames
- `--docs-json` - Path to docs.json (default: docs.json)
- `--locale` - Locale for sorting and tab selection (default: en, e.g., ja, en)

**Examples:**
```bash
# Update English API reference
npm run update-docs-json -- --directory "../.."  --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?\\.json$" --docs-json "../../docs.json"

# Update Japanese API reference
npm run update-docs-json -- --directory "../.."  --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?-jp\\.json$" --docs-json "../../docs.json" --locale ja
```

### Add Mint Config to OpenAPI Files

Add Mint configuration (from `openapi-mint-config.json`) to OpenAPI specification files:

```bash
npm run add-mint-config -- --directory <directory> --pattern <pattern> [--output <output-dir>]
```

**Arguments:**
- `--directory` - Path to directory containing OpenAPI JSON files
- `--pattern` - Regex pattern to match filenames
- `--output` - Output directory for modified files (default: same as `--directory`)

**Examples:**
```bash
# Add Mint config to English OpenAPI files
npm run add-mint-config -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?\\.json$"

# Add Mint config to Japanese OpenAPI files
npm run add-mint-config -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?-jp\\.json$"
```

**Note:** The script reads configuration from `.github/scripts/openapi-mint-config.json` and deep merges it into the OpenAPI files, preserving existing properties.

## Workflow

The typical workflow for updating API documentation is:

1. Generate API pages from OpenAPI files using `create-api-pages`
2. Update the navigation structure in `docs.json` using `update-docs-json`

**Example: Update English documentation**
```bash
# Step 1: Generate API pages
npm run create-api-pages -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?\\.json$" --reference-dir "../../reference"

# Step 2: Update docs.json
npm run update-docs-json -- --directory "../.."  --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?\\.json$" --docs-json "../../docs.json"
```

**Example: Update Japanese documentation**
```bash
# Step 1: Generate API pages
npm run create-api-pages -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?-jp\\.json$" --reference-dir "../../ja/reference" --locale ja

# Step 2: Update docs.json
npm run update-docs-json -- --directory "../.."  --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?-jp\\.json$" --docs-json "../../ja/docs.json" --locale ja
```
