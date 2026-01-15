#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { findMatchingFiles } from './utils';

const BASE_VERSION = '2024.0';

const CLEAN_DIRECTORY_BEFORE_GENERATION = true;

// Version-specific note content
const VERSION_NOTES: Record<string, string> = {
  '2024.0': 'This endpoint is in the version **2024.0**. No changes are required to continue using it. For more details, see **[Box API versioning](/guides/api-calls/api-versioning-strategy)**. \n\nLearn more about [Box SDK versioning strategy](/guides/tooling/sdks/sdk-versioning/).',
  '2025.0': 'Learn more about [Box SDK versioning strategy](/guides/tooling/sdks/sdk-versioning/).',
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
  version: string
): string {
  const title = operation.summary || operation.operationId || 'Untitled';
  const note = VERSION_NOTES[version] || VERSION_NOTES['2024.0'];

  return `---
title: "${title}"
openapi: "/${openapiFilename} ${method.toUpperCase()} ${path}"
---

<Note>
${note}
</Note>
`;
}

/**
 * Generate MDX content for a resource
 */
function generateResourceMDX(
  schema: Schema,
  schemaName: string,
  openapiFilename: string
): string {
  return `---
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
  outputDir: string
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

      const content = generateOperationMDX(operation, method, pathName, openapiFilename, version);
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
  baseReferenceDir: string
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
  const createdOperations = processOperations(spec, openapiFilename, version, outputDir);
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
export async function main(directoryPath?: string, pattern?: string): Promise<number> {
  // Get command line arguments if not provided
  let dir = directoryPath;
  let pat = pattern;

  if (!dir || !pat) {
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.error('❌ Error: Missing required arguments');
      console.error('');
      console.error('Usage: cd .github/scripts && npm run add-api-page -- <directory> <pattern>');
      console.error('');
      console.error('Arguments:');
      console.error('  <directory>  - Path to directory containing OpenAPI JSON files');
      console.error('  <pattern>    - Regex pattern to match filenames');
      console.error('');
      console.error('Examples:');
      console.error('  cd .github/scripts && npm run add-api-page -- "../.." "box-openapi.*\\.json"');
      return 1;
    }

    dir = args[0];
    pat = args[1];
  }

  console.log('🚀 Starting API page generation...\n');
  console.log(`Searching in directory: ${dir}`);
  console.log(`Pattern: ${pat}\n`);

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
    const baseReferenceDir = path.resolve(process.cwd(), '../../reference');

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
      const createdFiles = processOpenAPIFile(filePath, baseReferenceDir);
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
  main()
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

