#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { findMatchingFiles } from './utils';

const BASE_VERSION = '2024.0';
const DEFAULT_LOCALE = 'en';
const DEFAULT_DOCS_JSON_PATH = 'docs.json';

// Locale-specific constants
const TAB_NAMES: Record<string, string> = {
  'en': 'API reference',
  'ja': 'APIリファレンス'
};

const GROUP_LABELS: Record<string, { resources: string; endpoints: string }> = {
  'en': {
    resources: 'Resources',
    endpoints: 'Endpoints'
  },
  'ja': {
    resources: 'リソースの一覧',
    endpoints: 'エンドポイント'
  }
};

const LANG_PREFIXES: Record<string, string> = {
  'en': '',
  'ja': 'ja/'
};

interface OpenAPITag {
  name: string;
  description?: string;
  'x-box-tag': string;
}

interface OpenAPISpec {
  info: {
    version: string;
    title?: string;
  };
  paths: Record<string, Record<string, Operation>>;
  components?: {
    schemas?: Record<string, Schema>;
  };
  tags?: OpenAPITag[];
}

interface Operation {
  operationId?: string;
  'x-box-tag'?: string;
  summary?: string;
  description?: string;
}

interface Schema {
  'x-box-resource-id'?: string;
  'x-box-tag'?: string;
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, any>;
}

interface ResourceInfo {
  filename: string;
  title: string;
}

interface EndpointInfo {
  filename: string;
  method: string;
  title: string;
}

interface TagGroup {
  resources: ResourceInfo[];
  endpoints: EndpointInfo[];
}

interface DocsJsonSubGroup {
  group: string;
  pages: Array<string | DocsJsonSubGroup | DocsJsonGroup>;
}

interface DocsJsonGroup {
  group: string;
  pages: Array<DocsJsonSubGroup | string | DocsJsonGroup>;
}

/**
 * Convert operationId to filename
 */
function operationIdToFilename(operationId: string): string {
  // Remove version suffix pattern like _v2025.0, _v2024.0, etc.
  const withoutVersion = operationId.replace(/_v\d+\.\d+/g, '');
  return withoutVersion.replace(/_/g, '-').replace(/#/g, '--');
}

/**
 * Convert resource ID to filename
 */
function resourceIdToFilename(resourceId: string): string {
  // Remove version suffix pattern like _v2025.0, _v2024.0, etc.
  const withoutVersion = resourceId.replace(/_v\d+\.\d+/g, '');
  return withoutVersion.replace(/_/g, '-');
}

/**
 * Get the file path prefix based on version and locale
 */
function getPathPrefix(version: string, locale: string): string {
  const langPrefix = LANG_PREFIXES[locale] || LANG_PREFIXES[DEFAULT_LOCALE];

  if (version === BASE_VERSION) {
    return `${langPrefix}reference`;
  }
  return `${langPrefix}reference/v${version}`;
}

/**
 * Parse OpenAPI spec and extract operations and resources grouped by x-box-tag
 * Returns a map where the key is the tag title (human-readable name)
 */
function parseOpenAPISpec(spec: OpenAPISpec): Map<string, TagGroup> {
  const tagGroups = new Map<string, TagGroup>();

  // Build a mapping from x-box-tag to tag title (name)
  const tagTitleMap = new Map<string, string>();
  if (spec.tags) {
    for (const tag of spec.tags) {
      tagTitleMap.set(tag['x-box-tag'], tag.name);
    }
  }

  // Process operations (endpoints)
  const paths = spec.paths || {};
  for (const [pathName, pathItem] of Object.entries(paths)) {
    const methods = ['post', 'get', 'put', 'patch', 'delete', 'options', 'head'];

    for (const method of methods) {
      const operation = (pathItem as any)[method] as Operation | undefined;

      if (!operation || !operation.operationId) {
        continue;
      }

      const tagId = operation['x-box-tag'];

      // Skip if no tag or tag not found in the tags array
      if (!tagId || !tagTitleMap.has(tagId)) {
        continue;
      }

      const tagTitle = tagTitleMap.get(tagId)!;
      const filename = operationIdToFilename(operation.operationId);
      const title = operation.summary || operation.operationId;

      if (!tagGroups.has(tagTitle)) {
        tagGroups.set(tagTitle, { resources: [], endpoints: [] });
      }

      tagGroups.get(tagTitle)!.endpoints.push({
        filename,
        method: method.toUpperCase(),
        title
      });
    }
  }

  // Process resources (schemas)
  const schemas = spec.components?.schemas || {};
  for (const [schemaName, schema] of Object.entries(schemas)) {
    const typedSchema = schema as Schema;
    const resourceId = typedSchema['x-box-resource-id'];

    if (!resourceId) {
      continue;
    }

    const tagId = typedSchema['x-box-tag'];

    // Skip if no tag or tag not found in the tags array
    if (!tagId || !tagTitleMap.has(tagId)) {
      continue;
    }

    const tagTitle = tagTitleMap.get(tagId)!;
    const filename = resourceIdToFilename(resourceId);
    const title = typedSchema.title || resourceId;

    if (!tagGroups.has(tagTitle)) {
      tagGroups.set(tagTitle, { resources: [], endpoints: [] });
    }

    tagGroups.get(tagTitle)!.resources.push({
      filename,
      title
    });
  }

  return tagGroups;
}

/**
 * Get localized group labels based on locale
 */
function getGroupLabels(locale: string): { resources: string; endpoints: string } {
  return GROUP_LABELS[locale] || GROUP_LABELS[DEFAULT_LOCALE];
}

/**
 * Sort endpoints by method order then by title
 */
function sortEndpoints(endpoints: EndpointInfo[], locale: string): EndpointInfo[] {
  const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  return endpoints.sort((a, b) => {
    // First sort by method
    const methodIndexA = methodOrder.indexOf(a.method);
    const methodIndexB = methodOrder.indexOf(b.method);

    if (methodIndexA !== methodIndexB) {
      return methodIndexA - methodIndexB;
    }

    // Then sort by title using locale
    return a.title.localeCompare(b.title, locale);
  });
}

/**
 * Validate that all referenced pages exist as MDX files
 */
function validatePages(
  groups: DocsJsonGroup[],
  docsJsonPath: string
): { missingPages: string[]; validatedPages: string[] } {
  const missingPages: string[] = [];
  const validatedPages: string[] = [];
  const docsJsonDir = path.dirname(docsJsonPath);

  function validatePageRecursive(page: any): void {
    if (typeof page === 'string') {
      // Skip index pages as they might not exist
      if (page.endsWith('/index')) {
        return;
      }

      const mdxPath = path.join(docsJsonDir, `${page}.mdx`);
      if (fs.existsSync(mdxPath)) {
        validatedPages.push(page);
      } else {
        missingPages.push(page);
      }
    } else if (typeof page === 'object' && page.pages) {
      // Recursively validate nested groups
      for (const subPage of page.pages) {
        validatePageRecursive(subPage);
      }
    }
  }

  for (const group of groups) {
    if (group.pages) {
      for (const page of group.pages) {
        validatePageRecursive(page);
      }
    }
  }

  return { missingPages, validatedPages };
}

/**
 * Generate docs.json navigation structure from tag groups
 */
function generateDocsStructure(
  tagGroups: Map<string, TagGroup>,
  version: string,
  indexPage: string,
  locale: string
): DocsJsonGroup[] {
  const pathPrefix = getPathPrefix(version, locale);
  const groups: DocsJsonGroup[] = [];
  const labels = getGroupLabels(locale);

  // Sort tags alphabetically using locale
  const sortedTags = Array.from(tagGroups.keys()).sort((a, b) =>
    a.localeCompare(b, locale)
  );

  for (const tag of sortedTags) {
    const tagGroup = tagGroups.get(tag)!;
    const pages: Array<DocsJsonSubGroup> = [];

    // Add resources group if there are resources
    if (tagGroup.resources.length > 0) {
      // Sort resources by title using locale
      const sortedResources = [...tagGroup.resources].sort((a, b) =>
        a.title.localeCompare(b.title, locale)
      );

      pages.push({
        group: labels.resources,
        pages: sortedResources.map(r => `${pathPrefix}/resources/${r.filename}`)
      });
    }

    // Add endpoints group if there are endpoints
    if (tagGroup.endpoints.length > 0) {
      // Sort endpoints by method then title using locale
      const sortedEndpoints = sortEndpoints([...tagGroup.endpoints], locale);

      pages.push({
        group: labels.endpoints,
        pages: sortedEndpoints.map(e => `${pathPrefix}/${e.filename}`)
      });
    }

    // Only add group if it has content
    if (pages.length > 0) {
      groups.push({
        group: tag,
        pages: pages as Array<DocsJsonSubGroup | string | DocsJsonGroup>
      });
    }
  }

  // Add the index page and groups to the final structure
  const result: DocsJsonGroup[] = [
    {
      group: ' ',
      pages: [indexPage, ...groups]
    }
  ];

  return result;
}

/**
 * Extract tag groups with their pages from existing docs.json structure
 */
function extractExistingTagGroups(existingGroup: DocsJsonGroup | undefined): Map<string, string[]> {
  const tagGroups = new Map<string, string[]>();

  if (!existingGroup || !existingGroup.pages) {
    return tagGroups;
  }

  // Skip the first page (index page) and iterate through tag groups
  for (let i = 1; i < existingGroup.pages.length; i++) {
    const page = existingGroup.pages[i];
    if (typeof page === 'object' && 'group' in page && 'pages' in page) {
      const tagName = page.group;
      const allPages: string[] = [];

      // Collect all pages from subgroups
      for (const subPage of page.pages) {
        if (typeof subPage === 'object' && 'pages' in subPage) {
          // Filter to only include string pages
          const stringPages = subPage.pages.filter((p): p is string => typeof p === 'string');
          allPages.push(...stringPages);
        }
      }

      tagGroups.set(tagName, allPages);
    }
  }

  return tagGroups;
}

/**
 * Extract pages from new tag groups structure
 */
function extractNewTagGroupPages(tagGroup: TagGroup, pathPrefix: string, labels: { resources: string; endpoints: string }, locale: string): string[] {
  const allPages: string[] = [];

  // Add resource pages
  if (tagGroup.resources.length > 0) {
    const sortedResources = [...tagGroup.resources].sort((a, b) => a.title.localeCompare(b.title, locale));
    allPages.push(...sortedResources.map(r => `${pathPrefix}/resources/${r.filename}`));
  }

  // Add endpoint pages
  if (tagGroup.endpoints.length > 0) {
    const sortedEndpoints = sortEndpoints([...tagGroup.endpoints], locale);
    allPages.push(...sortedEndpoints.map(e => `${pathPrefix}/${e.filename}`));
  }

  return allPages;
}

/**
 * Update docs.json file with new navigation structure
 */
function updateDocsJson(
  docsJsonPath: string,
  tabName: string,
  version: string,
  newGroups: DocsJsonGroup[],
  locale: string
): Map<string, string[]> {
  console.log(`\n📝 Updating ${docsJsonPath}...`);

  // Read existing docs.json
  const docsContent = fs.readFileSync(docsJsonPath, 'utf-8');
  const docs = JSON.parse(docsContent);

  // Find the navigation configuration
  if (!docs.navigation || !docs.navigation.languages) {
    throw new Error('Invalid docs.json structure: missing navigation.languages');
  }

  // Determine the expected index page for this version
  const langPrefix = LANG_PREFIXES[locale] || LANG_PREFIXES[DEFAULT_LOCALE];
  const expectedIndexPage = version === BASE_VERSION
    ? `${langPrefix}reference/index`
    : `${langPrefix}reference/v${version}/index`;

  console.log(`   Looking for group with index: ${expectedIndexPage}`);

  // Find the language that contains the specified tab
  let foundGroup = false;
  let oldTagGroups = new Map<string, string[]>();

  for (const language of docs.navigation.languages) {
    if (!language.tabs) continue;

    const tab = language.tabs.find((t: any) => t.tab === tabName);
    if (tab) {
      console.log(`   Found tab "${tabName}" in language "${language.language}"`);

      // Find the specific group within this tab that matches our version
      // Groups are identified by their first page (the index page)
      if (!tab.groups) {
        tab.groups = [];
      }

      let groupIndex = -1;
      for (let i = 0; i < tab.groups.length; i++) {
        const group = tab.groups[i];
        // Check if this group's first page matches our expected index
        if (group.pages && group.pages.length > 0 && group.pages[0] === expectedIndexPage) {
          groupIndex = i;
          break;
        }
      }

      if (groupIndex >= 0) {
        // Extract existing tag groups before updating
        oldTagGroups = extractExistingTagGroups(tab.groups[groupIndex]);

        // Update existing group
        tab.groups[groupIndex] = newGroups[0];
        foundGroup = true;
      } else {
        // Add new group
        tab.groups.push(newGroups[0]);
        foundGroup = true;
      }
      break;
    }
  }

  if (!foundGroup) {
    throw new Error(`Could not update group for version ${version} in tab "${tabName}"`);
  }

  // Write back to docs.json with proper formatting
  fs.writeFileSync(docsJsonPath, JSON.stringify(docs, null, 2) + '\n', 'utf-8');
  console.log(`   ✅ Saved ${docsJsonPath}`);

  return oldTagGroups;
}

/**
 * Process a single version's OpenAPI files
 */
function processVersion(
  version: string,
  openapiFiles: string[],
  tabName: string,
  docsJsonPath: string,
  locale: string
): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing version ${version}`);
  console.log('='.repeat(60));

  // Merge all tag groups from all OpenAPI files for this version
  const allTagGroups = new Map<string, TagGroup>();

  for (const filePath of openapiFiles) {
    console.log(`📖 Parsing ${path.basename(filePath)}...`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const spec: OpenAPISpec = JSON.parse(content);

    const tagGroups = parseOpenAPISpec(spec);

    // Merge tag groups
    for (const [tag, group] of tagGroups) {
      if (!allTagGroups.has(tag)) {
        allTagGroups.set(tag, { resources: [], endpoints: [] });
      }
      const existingGroup = allTagGroups.get(tag)!;
      existingGroup.resources.push(...group.resources);
      existingGroup.endpoints.push(...group.endpoints);
    }

    console.log(`   Found ${tagGroups.size} tag group(s)`);
  }

  // Remove duplicates from merged groups
  for (const [tag, group] of allTagGroups) {
    group.resources = [...new Set(group.resources)];
    group.endpoints = [...new Set(group.endpoints)];
  }


  // Generate docs.json structure
  const langPrefix = LANG_PREFIXES[locale] || LANG_PREFIXES[DEFAULT_LOCALE];
  const indexPage = version === BASE_VERSION ? `${langPrefix}reference/index` : `${langPrefix}reference/v${version}/index`;
  const newGroups = generateDocsStructure(allTagGroups, version, indexPage, locale);

  console.log(`\n📄 Generated ${newGroups.length} group(s) for docs.json`);

  // Validate that all pages exist
  console.log(`\n🔍 Validating referenced pages...`);
  const { missingPages, validatedPages } = validatePages(newGroups, docsJsonPath);

  if (missingPages.length > 0) {
    console.log(`\n⚠️  Warning: ${missingPages.length} referenced page(s) not found:`);
    missingPages.forEach(page => {
      console.log(`   • ${page}.mdx`);
    });
  } else {
    console.log(`   ✅ All ${validatedPages.length} referenced page(s) exist`);
  }

  // Update docs.json and get old tag groups for comparison
  const oldTagGroups = updateDocsJson(docsJsonPath, tabName, version, newGroups, locale);

  // Compare tag groups to find changes
  console.log(`\n📋 Tag group changes:`);

  const pathPrefix = getPathPrefix(version, locale);
  const labels = getGroupLabels(locale);
  const tagNames = Array.from(allTagGroups.keys()).sort((a, b) => a.localeCompare(b, locale));
  const oldTagNames = Array.from(oldTagGroups.keys());

  let changesFound = false;

  // Check for new and modified tag groups
  for (const tagName of tagNames) {
    const newGroup = allTagGroups.get(tagName)!;
    const newPages = extractNewTagGroupPages(newGroup, pathPrefix, labels, locale);
    const oldPages = oldTagGroups.get(tagName);

    if (!oldPages) {
      // New tag group
      console.log(`   🆕 ${tagName}`);
      changesFound = true;
    } else {
      // Check if pages changed (different content or order)
      const pagesChanged =
        newPages.length !== oldPages.length ||
        !newPages.every((page, index) => page === oldPages[index]);

      if (pagesChanged) {
        console.log(`   🔄 ${tagName}`);
        changesFound = true;
      }
    }
  }

  // Check for removed tag groups
  for (const tagName of oldTagNames) {
    if (!allTagGroups.has(tagName)) {
      console.log(`   🗑️  ${tagName}`);
      changesFound = true;
    }
  }

  if (!changesFound) {
    console.log(`   ℹ️  No changes detected`);
  }
}

/**
 * Main execution function
 */
async function main(directory: string, pattern: string, docsJsonPath: string = DEFAULT_DOCS_JSON_PATH, locale: string = DEFAULT_LOCALE): Promise<number> {
  // Derive tab name from locale
  const tabName = TAB_NAMES[locale] || TAB_NAMES[DEFAULT_LOCALE];

  console.log('🚀 Starting docs.json update...\n');
  console.log(`Directory: ${directory}`);
  console.log(`Pattern: ${pattern}`);
  console.log(`Tab: ${tabName}`);
  console.log(`Locale: ${locale}`);
  console.log(`docs.json: ${docsJsonPath}\n`);

  const startTime = Date.now();

  try {
    // Find matching OpenAPI files
    const openapiFiles = findMatchingFiles(directory, pattern);

    if (openapiFiles.length === 0) {
      console.log('⚠️  No files found matching the pattern');
      return 1;
    }

    console.log(`Found ${openapiFiles.length} OpenAPI file(s):\n`);
    openapiFiles.forEach(file => console.log(`  - ${file}`));
    console.log('');

    // Group files by version
    const filesByVersion = new Map<string, string[]>();

    for (const filePath of openapiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const spec: OpenAPISpec = JSON.parse(content);
      const version = spec.info.version;

      if (!filesByVersion.has(version)) {
        filesByVersion.set(version, []);
      }
      filesByVersion.get(version)!.push(filePath);
    }

    console.log(`Detected ${filesByVersion.size} version(s):\n`);
    for (const [version, files] of filesByVersion) {
      console.log(`  - ${version}: ${files.length} file(s)`);
    }

    // Resolve docs.json path
    const resolvedDocsJsonPath = path.resolve(process.cwd(), docsJsonPath);

    // Process each version
    let totalResources = 0;
    let totalEndpoints = 0;

    for (const [version, files] of filesByVersion) {
      processVersion(version, files, tabName, resolvedDocsJsonPath, locale);

      // Count totals for summary
      const content = fs.readFileSync(files[0], 'utf-8');
      const spec: OpenAPISpec = JSON.parse(content);
      const tagGroups = parseOpenAPISpec(spec);
      totalResources += Array.from(tagGroups.values()).reduce((sum, g) => sum + g.resources.length, 0);
      totalEndpoints += Array.from(tagGroups.values()).reduce((sum, g) => sum + g.endpoints.length, 0);
    }

    // Validate the updated JSON
    try {
      const updatedContent = fs.readFileSync(resolvedDocsJsonPath, 'utf-8');
      JSON.parse(updatedContent);
      console.log(`\n✅ JSON validation passed`);
    } catch (error) {
      console.error(`\n❌ JSON validation failed`);
      throw error;
    }

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Summary:');
    console.log(`   • OpenAPI files processed: ${openapiFiles.length}`);
    console.log(`   • Versions updated: ${filesByVersion.size}`);
    console.log(`   • Total resources: ${totalResources}`);
    console.log(`   • Total endpoints: ${totalEndpoints}`);
    console.log(`   • Duration: ${duration}s`);
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
    .name('update-docs-json')
    .description('Update docs.json with navigation structure from OpenAPI specifications')
    .requiredOption('-d, --directory <directory>', 'Path to directory containing OpenAPI JSON files')
    .requiredOption('-p, --pattern <pattern>', 'Regex pattern to match filenames')
    .option('-j, --docs-json <path>', 'Path to docs.json', DEFAULT_DOCS_JSON_PATH)
    .option('-l, --locale <locale>', 'Locale for sorting and tab selection (e.g., en, ja)', DEFAULT_LOCALE)
    .addHelpText('after', '\nExamples:\n' +
      '  $ npm run update-docs-json -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?\\.json$" --docs-json "../../docs.json"\n' +
      '  $ npm run update-docs-json -- --directory "../.." --pattern "box-openapi(-v[0-9]+\\.[0-9]+)?-jp\\.json$" --docs-json "../../docs.json" --locale ja')
    .action((options) => {
      main(options.directory, options.pattern, options.docsJson, options.locale)
        .then((exitCode) => process.exit(exitCode))
        .catch((error) => {
          console.error('Fatal error:', error);
          process.exit(1);
        });
    });

  program.parse();
}

export { main };

