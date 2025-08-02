#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Common ESLint error patterns and their fixes
const ERROR_FIXES = {
  // Fix NodeJS type
  "'NodeJS' is not defined": {
    pattern: /NodeJS\./g,
    replacement: 'ReturnType<typeof setTimeout>'
  },
  
  // Fix require() imports
  "A `require()` style import is forbidden": {
    pattern: /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
    replacement: "import $1 from '$2'"
  },
  
  // Fix hasOwnProperty
  "Do not access Object.prototype method 'hasOwnProperty' from target object": {
    pattern: /(\w+)\.hasOwnProperty\(/g,
    replacement: 'Object.prototype.hasOwnProperty.call($1, '
  },
  
  // Fix undefined globals
  "'gtag' is not defined": {
    pattern: /\bgtag\b/g,
    replacement: 'window.gtag'
  },
  
  // Fix control characters in regex
  "Unexpected control character": {
    pattern: /\\x00-\\x1f/g,
    replacement: '\\u0000-\\u001f'
  }
};

async function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const [error, fix] of Object.entries(ERROR_FIXES)) {
      if (content.match(fix.pattern)) {
        content = content.replace(fix.pattern, fix.replacement);
        modified = true;
        console.log(`Fixed "${error}" in ${filePath}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function getAllTypeScriptFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
        walk(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

async function main() {
  console.log('🔧 Starting ESLint error auto-fix...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const files = await getAllTypeScriptFiles(srcDir);
  
  console.log(`Found ${files.length} TypeScript files to process\n`);
  
  let fixedCount = 0;
  
  for (const file of files) {
    if (await fixFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} files`);
  
  // Run ESLint again to see remaining errors
  console.log('\n🔍 Running ESLint to check remaining errors...\n');
  
  try {
    const { stdout, stderr } = await execAsync('npm run lint');
    console.log(stdout);
  } catch (error) {
    // ESLint exits with error code when there are lint errors
    if (error.stdout) {
      const errorCount = error.stdout.match(/(\d+) errors?/);
      const warningCount = error.stdout.match(/(\d+) warnings?/);
      
      console.log(`\n📊 Remaining issues:`);
      console.log(`   Errors: ${errorCount ? errorCount[1] : '0'}`);
      console.log(`   Warnings: ${warningCount ? warningCount[1] : '0'}`);
    }
  }
}

main().catch(console.error);