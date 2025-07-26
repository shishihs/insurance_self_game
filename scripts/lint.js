#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🔍 Running ESLint...');

try {
  process.chdir(projectRoot);
  
  // Use direct ESLint execution to avoid shell issues
  if (process.platform === 'win32') {
    execSync('.\\node_modules\\.bin\\eslint.cmd . --fix', { 
      stdio: 'inherit',
      encoding: 'utf8',
      shell: 'cmd.exe'
    });
  } else {
    execSync('./node_modules/.bin/eslint . --fix', { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
  }
  
  console.log('✅ ESLint passed successfully!');
} catch (error) {
  console.log('❌ ESLint found issues or failed to run');
  process.exit(error.status || 1);
}