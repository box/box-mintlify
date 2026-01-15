#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { findMatchingFiles } from './utils';

const BASE_VERSION = '2024.0';
const DEFAULT_REFERENCE_DIR = 'reference';
const DEFAULT_LOCALE = 'en';

const CLEAN_DIRECTORY_BEFORE_GENERATION = true;

// Version-specific note content
const VERSION_NOTES: Record<string, Record<string, string>> = {
  'en': {
    '2024.0': 'This endpoint is in the version **2024.0**. No changes are required to continue using it. For more details, see **[Box API versioning](/guides/api-calls/api-versioning-strategy)**.',
  },
  'ja': {
    '2024.0': 'このリソースは、バージョン2024.0のエンドポイントで使用されています。 詳細については、 [**Box APIのバージョン管理**](/ja/guides/api-calls/api-versioning-strategy/)を参照してください。',
  },
};

const SDK_VERSIONING_NOTES: Record<string, string> = {
  'en': 'Learn more about [Box SDK versioning strategy](/guides/tooling/sdks/sdk-versioning/).',
  'ja': '「[Box SDKのバージョニング戦略](/ja/guides/tooling/sdks/sdk-versioning/)について詳しく学ぶ。」',
};

interface OpenAPISpec {
  info: {
    version: string;
    title?: string;
  };
  paths: Record<string, Record<string, Operation>>;
  components?: {
    schemas?: Record<string, Schema>;
  };
}

interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
}

interface Schema {
  'x-box-resource-id'?: string;
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, any>;
}

/**
 * Clear the reference directory, preserving index files and all nested directories
 * Returns an array of removed file paths for tracking
 */
function clearReferenceDirectory(referenceDir: string): string[] {
  console.log(`🧹 Clearing reference directory: ${referenceDir}...`);

  const removedFiles: string[] = [];

  if (fs.existsSync(referenceDir)) {
    // Remove files at root level, but keep all directories and their contents
    const entries = fs.readdirSync(referenceDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(referenceDir, entry.name);

      // Skip index.mdx files
      if (entry.name === 'index.mdx') {
        console.log(`   Skipping index file: ${fullPath}`);
        continue;
      }

      if (entry.isDirectory()) {
        // Handle resources directory at root level - clear files inside but keep directory
        if (entry.name === 'resources') {
          const resourceEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          for (const resourceEntry of resourceEntries) {
            const resourceEntryPath = path.join(fullPath, resourceEntry.name);

            // Remove files in resources directory
            if (!resourceEntry.isDirectory()) {
              fs.unlinkSync(resourceEntryPath);
              removedFiles.push(resourceEntryPath);
            }
          }
          continue;
        }

        // For version directories (like v2025.0), remove only root-level files and clear resources
        if (entry.name.startsWith('v')) {
          const versionEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          for (const versionEntry of versionEntries) {
            const versionEntryPath = path.join(fullPath, versionEntry.name);

            // Skip index.mdx files
            if (versionEntry.name === 'index.mdx') {
              console.log(`   Skipping index file: ${versionEntryPath}`);
              continue;
            }

            // Handle resources directory - clear files inside but keep directory
            if (versionEntry.isDirectory() && versionEntry.name === 'resources') {
              const resourceEntries = fs.readdirSync(versionEntryPath, { withFileTypes: true });
              for (const resourceEntry of resourceEntries) {
                const resourceEntryPath = path.join(versionEntryPath, resourceEntry.name);

                // Remove files in resources directory
                if (!resourceEntry.isDirectory()) {
                  fs.unlinkSync(resourceEntryPath);
                  removedFiles.push(resourceEntryPath);
                }
              }
              continue;
            }

            // Skip other directories
            if (versionEntry.isDirectory()) {
              continue;
            }

            // Remove file
            fs.unlinkSync(versionEntryPath);
            removedFiles.push(versionEntryPath);
          }
        } else {
          // Skip non-version, non-resources directories entirely
        }
      } else {
        // Remove root-level files (except index.mdx which was already skipped)
        fs.unlinkSync(fullPath);
        removedFiles.push(fullPath);
      }
    }

    console.log(`✅ Reference directory cleared (${removedFiles.length} files removed, directories preserved)`);
  } else {
    console.log('   Reference directory does not exist, will be created');
    fs.mkdirSync(referenceDir, { recursive: true });
  }

  return removedFiles;
}

/**
 * Get the output directory based on API version
 */
function getVersionDirectory(version: string, baseReferenceDir: string): string {
  if (version === BASE_VERSION) {
    return baseReferenceDir;
  }
  return path.join(baseReferenceDir, `v${version}`);
}

/**
 * Remove version suffix from an ID (e.g., _v2025.0 or _v2024.0)
 */
function stripVersionSuffix(id: string): string {
  // Remove version suffix pattern like _v2025.0, _v2024.0, etc.
  return id.replace(/_v\d+\.\d+/g, '');
}

/**
 * Convert operationId to filename
 */
function operationIdToFilename(operationId: string): string {
  const withoutVersion = stripVersionSuffix(operationId);
  return withoutVersion.replace(/_/g, '-').replace(/#/g, '--') + '.mdx';
}

/**
 * Convert resource ID to filename
 */
function resourceIdToFilename(resourceId: string): string {
  const withoutVersion = stripVersionSuffix(resourceId);
  return withoutVersion.replace(/_/g, '-') + '.mdx';
}

/**
 * Generate MDX content for an operation
 */
function generateOperationMDX(
  operation: Operation,
  method: string,
  path: string,
  openapiFilename: string,
  version: string,
  locale: string
): string {
  const title = operation.summary || operation.operationId || 'Untitled';

  // Get version-specific note
  const versionNote = VERSION_NOTES[locale]?.[version];

  // Get SDK versioning note
  const sdkNote = SDK_VERSIONING_NOTES[locale];

  // Combine notes
  const notes: string[] = [];
  if (versionNote) {
    notes.push(versionNote);
  }
  if (sdkNote) {
    notes.push(sdkNote);
  }

  const noteContent = notes.length > 0 ? notes.join(' \n\n') : '';

  return `---
title: "${title}"
openapi: "/${openapiFilename} ${method.toUpperCase()} ${path}"
---
${noteContent ? `
<Note>
${noteContent}
</Note>
` : ''}`;
}

/**
 * Generate MDX content for a resource
 */
function generateResourceMDX(
  schema: Schema,
  schemaName: string,
  openapiFilename: string
): string {
  const title = schema.title || schemaName;

  return `---
title: "${title}"
openapi-schema: "/${openapiFilename} ${schemaName}"
---
`;
}

/**
 * Process operations from an OpenAPI spec
 */
function processOperations(
  spec: OpenAPISpec,
  openapiFilename: string,
  version: string,
  outputDir: string,
  locale: string
): string[] {
  console.log(`📝 Processing operations...`);

  const createdFiles: string[] = [];
  const paths = spec.paths || {};

  for (const [pathName, pathItem] of Object.entries(paths)) {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

    for (const method of methods) {
      const operation = (pathItem as any)[method] as Operation | undefined;

      if (!operation || !operation.operationId) {
        continue;
      }

      const filename = operationIdToFilename(operation.operationId);
      const filePath = path.join(outputDir, filename);

      // Skip if file exists and CLEAN_DIRECTORY_BEFORE_GENERATION is false
      if (!CLEAN_DIRECTORY_BEFORE_GENERATION && fs.existsSync(filePath)) {
        continue;
      }

      const content = generateOperationMDX(operation, method, pathName, openapiFilename, version, locale);
      fs.writeFileSync(filePath, content, 'utf-8');
      createdFiles.push(filePath);
    }
  }

  console.log(`✅ Processed ${createdFiles.length} operations`);
  return createdFiles;
}

/**
 * Process resource schemas from an OpenAPI spec
 */
function processResources(
  spec: OpenAPISpec,
  openapiFilename: string,
  outputDir: string
): string[] {
  console.log(`📦 Processing resources...`);

  const createdFiles: string[] = [];
  const schemas = spec.components?.schemas || {};
  const resourcesDir = path.join(outputDir, 'resources');

  // Create resources directory if it doesn't exist
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  for (const [schemaName, schema] of Object.entries(schemas)) {
    const resourceId = (schema as Schema)['x-box-resource-id'];

    if (!resourceId) {
      continue;
    }

    const filename = resourceIdToFilename(resourceId);
    const filePath = path.join(resourcesDir, filename);

    // Skip if file exists and CLEAN_DIRECTORY_BEFORE_GENERATION is false
    if (!CLEAN_DIRECTORY_BEFORE_GENERATION && fs.existsSync(filePath)) {
      continue;
    }

    const content = generateResourceMDX(schema as Schema, schemaName, openapiFilename);
    fs.writeFileSync(filePath, content, 'utf-8');
    createdFiles.push(filePath);
  }

  console.log(`✅ Processed ${createdFiles.length} resources`);
  return createdFiles;
}

/**
 * Process a single OpenAPI file
 */
function processOpenAPIFile(
  filePath: string,
  baseReferenceDir: string,
  locale: string
): string[] {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing ${path.basename(filePath)}`);
  console.log('='.repeat(60));

  // Load OpenAPI spec
  const content = fs.readFileSync(filePath, 'utf-8');
  const spec: OpenAPISpec = JSON.parse(content);

  // Extract version
  const version = spec.info.version;
  console.log(`   API Version: ${version}`);

  // Determine output directory
  const outputDir = getVersionDirectory(version, baseReferenceDir);
  console.log(`   Output Directory: ${outputDir}`);
  console.log();

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get OpenAPI filename
  const openapiFilename = path.basename(filePath);

  // Process operations
  const createdOperations = processOperations(spec, openapiFilename, version, outputDir, locale);
  console.log();

  // Process resources
  const createdResources = processResources(spec, openapiFilename, outputDir);
  console.log();

  const allCreatedFiles = [...createdOperations, ...createdResources];

  console.log(`📊 Summary for ${path.basename(filePath)}:`);
  console.log(`   • Operations: ${createdOperations.length}`);
  console.log(`   • Resources: ${createdResources.length}`);

  return allCreatedFiles;
}

/**
 * Main execution function
 */
export async function main(directoryPath?: string, pattern?: string, referenceDir?: string, locale?: string): Promise<number> {
  const dir = directoryPath;
  const pat = pattern;
  const refDir = referenceDir || DEFAULT_REFERENCE_DIR;
  const loc = locale || DEFAULT_LOCALE;

  // Validate required arguments
  if (!dir || !pat) {
    console.error('❌ Error: Missing required arguments');
    return 1;
  }

  console.log('🚀 Starting API page generation...\n');
  console.log(`Searching in directory: ${dir}`);
  console.log(`Pattern: ${pat}`);
  console.log(`Locale: ${loc}\n`);

  // Find matching OpenAPI files
  const openapiFiles = findMatchingFiles(dir, pat);

  if (openapiFiles.length === 0) {
    console.log('⚠️  No files found matching the pattern');
    return 1;
  }

  console.log(`Found ${openapiFiles.length} matching file(s):\n`);
  openapiFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');

  const startTime = Date.now();

  try {
    // Determine reference directory (relative to current working directory)
    const baseReferenceDir = path.resolve(process.cwd(), refDir);

    // Clear reference directory once before processing all files (if enabled)
    let removedFiles: string[] = [];
    if (CLEAN_DIRECTORY_BEFORE_GENERATION) {
      removedFiles = clearReferenceDirectory(baseReferenceDir);
      console.log();
    } else {
      console.log('⏭️  Skipping directory cleaning (CLEAN_DIRECTORY_BEFORE_GENERATION = false)');
      console.log('   Only creating files that do not already exist\n');
    }

    // Process each OpenAPI file
    const allCreatedFiles: string[] = [];

    for (const filePath of openapiFiles) {
      const createdFiles = processOpenAPIFile(filePath, baseReferenceDir, loc);
      allCreatedFiles.push(...createdFiles);
    }

    // Compare removed files with created files to find orphaned files and new files
    const createdFilesSet = new Set(allCreatedFiles.map(f => path.resolve(f)));
    const removedFilesSet = new Set(removedFiles.map(f => path.resolve(f)));


    const orphanedFiles = removedFiles.filter(removedFile => {
      const resolvedRemoved = path.resolve(removedFile);
      return !createdFilesSet.has(resolvedRemoved);
    });

    // Find truly new files (created but were not previously removed)
    const newFiles = allCreatedFiles.filter(createdFile => {
      const resolvedCreated = path.resolve(createdFile);
      return !removedFilesSet.has(resolvedCreated);
    });

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Summary:');
    console.log(`   • OpenAPI files processed: ${openapiFiles.length}`);
    console.log(`   • Files created: ${allCreatedFiles.length}`);
    console.log(`   • Duration: ${duration}s`);

    if (newFiles.length > 0) {
      console.log('\n📄 New files:');
      newFiles.forEach(file => {
        const relativePath = path.relative(baseReferenceDir, file);
        console.log(`   • reference/${relativePath}`);
      });
    } else if (allCreatedFiles.length > 0) {
      console.log('\n📄 No new files created (all files were recreated from existing)');
    }

    if (CLEAN_DIRECTORY_BEFORE_GENERATION) {
      if (orphanedFiles.length > 0) {
        console.log('\n⚠️  Files removed but not recreated:');
        orphanedFiles.forEach(file => {
          const relativePath = path.relative(baseReferenceDir, file);
          console.log(`   • reference/${relativePath}`);
        });
      }
    }

    console.log('\n✨ Done!');

    return 0;
  } catch (error) {
    console.error('\n❌ Error:', error);
    return 1;
  }
}

// Run if executed directly
if (require.main === module) {
  const program = new Command();

  program
    .name('create-api-pages')
    .description('Generate API reference pages from OpenAPI specifications')
    .requiredOption('-d, --directory <directory>', 'Path to directory containing OpenAPI JSON files')
    .requiredOption('-p, --pattern <pattern>', 'Regex pattern to match filenames')
    .option('-r, --reference-dir <directory>', 'Path to reference directory', DEFAULT_REFERENCE_DIR)
    .option('-l, --locale <locale>', 'Locale for notes (e.g., en, ja)', DEFAULT_LOCALE)
    .addHelpText('after', '\nExamples:\n' +
      '  $ npm run create-api-pages -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?\\.json$" --reference-dir "../../reference"\n' +
      '  $ npm run create-api-pages -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?-jp\\.json$" --reference-dir "../../ja/reference" --locale ja')
    .action((options) => {
      main(options.directory, options.pattern, options.referenceDir, options.locale)
        .then((exitCode) => process.exit(exitCode))
        .catch((error) => {
          console.error('Fatal error:', error);
          process.exit(1);
        });
    });

  program.parse();
}

