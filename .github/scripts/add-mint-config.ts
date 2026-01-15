#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { findMatchingFiles } from './utils';

/**
 * Read the mint config from openapi-mint-config.json
 */
function readMintConfig(): any {
  const configPath = path.join(__dirname, 'openapi-mint-config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`❌ Error: Config file not found: ${configPath}`);
    process.exit(1);
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    return config;
  } catch (e) {
    console.error(`❌ Error reading config file: ${(e as Error).message}`);
    process.exit(1);
  }
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Add mint config to an OpenAPI JSON file
 */
function addMintConfigToFile(filePath: string, mintConfig: any, outputDir: string): void {
  try {
    // Read the OpenAPI file
    const content = fs.readFileSync(filePath, 'utf-8');
    let openapi = JSON.parse(content);

    // Merge the mint config with existing config
    openapi = deepMerge(openapi, mintConfig);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the modified file to the output directory
    const fileName = path.basename(filePath);
    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(openapi, null, 2) + '\n', 'utf-8');

    console.log(`✅ Processed: ${fileName} -> ${outputPath}`);
  } catch (e) {
    console.error(`❌ Error processing file ${filePath}: ${(e as Error).message}`);
  }
}

/**
 * Main function
 */
function main(directory: string, pattern: string, outputDir?: string) {
  console.log('🚀 Starting add-mint-config script...\n');

  // If output directory is not provided, use the same as directory
  const output = outputDir || directory;

  console.log(`📁 Directory: ${directory}`);
  console.log(`🔍 Pattern: ${pattern}`);
  console.log(`📂 Output directory: ${output}\n`);

  // Read mint config
  const mintConfig = readMintConfig();

  // Find matching files
  const files = findMatchingFiles(directory, pattern);

  if (files.length === 0) {
    console.log('⚠️  No matching files found');
    return;
  }

  console.log(`📄 Found ${files.length} matching file(s):\n`);

  // Process each file
  files.forEach(file => {
    addMintConfigToFile(file, mintConfig, output);
  });

  console.log(`\n✨ Done! Processed ${files.length} file(s)`);
}

// Run the script if executed directly
if (require.main === module) {
  const program = new Command();

  program
    .name('add-mint-config')
    .description('Add Mintlify configuration to OpenAPI JSON files')
    .requiredOption('-d, --directory <directory>', 'Directory containing OpenAPI JSON files')
    .requiredOption('-p, --pattern <pattern>', 'Regex pattern to match OpenAPI JSON files')
    .option('-o, --output <directory>', 'Output directory for modified files (default: same as --directory)')
    .addHelpText('after', '\nExample:\n' +
      '  $ npm run add-mint-config -- --directory "../.." --pattern ".*\\.json$" --output "../../output"')
    .action((options) => {
      main(options.directory, options.pattern, options.output);
    });

  program.parse();
}

