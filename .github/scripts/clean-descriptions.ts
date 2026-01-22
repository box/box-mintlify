#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { findMatchingFiles } from './utils';
import * as prettier from 'prettier';

async function cleanDescription(description: string): Promise<string> {
  if (!description || description.trim().length === 0) {
    return description;
  }

  try {
    // Use Prettier to format the description as markdown
    // Prettier will naturally handle:
    // - Joining lines within the same paragraph (removes single \n)
    // - Preserving double newlines between paragraphs (\n\n)
    // - Respecting markdown syntax (lists, code blocks, etc.)
    // Using 'never' for proseWrap to avoid introducing line breaks at arbitrary widths
    const formatted = await prettier.format(description, {
      parser: 'markdown',
      proseWrap: 'never',
      printWidth: 999999, // Effectively unlimited to prevent wrapping
    });

    // Remove trailing newline that Prettier adds
    return formatted.trimEnd();
  } catch (e) {
    // If Prettier fails (e.g., invalid markdown), return original
    console.warn(`  ⚠️  Failed to format description: ${(e as Error).message}`);
    return description;
  }
}

/**
 * Recursively traverse an object and clean all description fields
 */
async function cleanDescriptions(obj: any, stats: { count: number; cleaned: number }): Promise<void> {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      await cleanDescriptions(item, stats);
    }
    return;
  }

  // Handle objects
  for (const key in obj) {
    if (key === 'description' && typeof obj[key] === 'string') {
      stats.count++;
      const original = obj[key];
      const cleaned = await cleanDescription(original);

      if (original !== cleaned) {
        obj[key] = cleaned;
        stats.cleaned++;
      }
    } else if (typeof obj[key] === 'object') {
      await cleanDescriptions(obj[key], stats);
    }
  }
}

/**
 * Process a single OpenAPI file
 */
async function processFile(filePath: string, outputDir: string): Promise<void> {
  try {
    // Read the OpenAPI file
    const content = fs.readFileSync(filePath, 'utf-8');
    let openapi = JSON.parse(content);

    // Track statistics
    const stats = { count: 0, cleaned: 0 };

    // Clean all descriptions
    await cleanDescriptions(openapi, stats);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the modified file to the output directory
    const fileName = path.basename(filePath);
    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(openapi, null, 2) + '\n', 'utf-8');

    console.log(`✅ Processed: ${fileName} -> ${outputPath}`);
    console.log(`   Found ${stats.count} descriptions, cleaned ${stats.cleaned}`);
  } catch (e) {
    console.error(`❌ Error processing file ${filePath}: ${(e as Error).message}`);
  }
}

/**
 * Main function
 */
async function main(directory: string, pattern: string, outputDir?: string) {
  console.log('🚀 Starting clean-descriptions script...\n');

  // If output directory is not provided, use the same as directory
  const output = outputDir || directory;

  console.log(`📁 Directory: ${directory}`);
  console.log(`🔍 Pattern: ${pattern}`);
  console.log(`📂 Output directory: ${output}\n`);

  // Find matching files
  const files = findMatchingFiles(directory, pattern);

  if (files.length === 0) {
    console.log('⚠️  No matching files found');
    return;
  }

  console.log(`📄 Found ${files.length} matching file(s):\n`);

  // Process each file
  for (const file of files) {
    await processFile(file, output);
  }

  console.log(`\n✨ Done! Processed ${files.length} file(s)`);
}

// Run the script if executed directly
if (require.main === module) {
  const program = new Command();

  program
    .name('clean-descriptions')
    .description('Clean newlines in OpenAPI description fields while preserving markdown structure')
    .requiredOption('-d, --directory <directory>', 'Directory containing OpenAPI JSON files')
    .requiredOption('-p, --pattern <pattern>', 'Regex pattern to match OpenAPI JSON files')
    .option('-o, --output <directory>', 'Output directory for modified files (default: same as --directory)')
    .addHelpText('after', '\nExample:\n' +
      '  $ npm run clean-descriptions -- --directory "../.." --pattern "box-openapi.*\\.json$"')
    .action((options) => {
      main(options.directory, options.pattern, options.output)
        .catch(error => {
          console.error('Fatal error:', error);
          process.exit(1);
        });
    });

  program.parse();
}
