#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🔍 Running type check...');

try {
  process.chdir(projectRoot);
  
  // Step 1: Type check
  if (process.platform === 'win32') {
    execSync('.\\node_modules\\.bin\\vue-tsc.cmd --noEmit', { 
      stdio: 'inherit',
      encoding: 'utf8',
      shell: 'cmd.exe'
    });
  } else {
    execSync('./node_modules/.bin/vue-tsc --noEmit', { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
  }
  
  console.log('✅ Type check passed!');
  console.log('🏗️ Building for production...');
  
  // Step 2: Build
  if (process.platform === 'win32') {
    execSync('.\\node_modules\\.bin\\vite.cmd build', { 
      stdio: 'inherit',
      encoding: 'utf8',
      shell: 'cmd.exe'
    });
  } else {
    execSync('./node_modules/.bin/vite build', { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
  }
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.log('❌ Build failed');
  process.exit(error.status || 1);
}