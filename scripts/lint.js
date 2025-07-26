#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Running ESLint...');

const projectRoot = path.join(__dirname, '..');
const eslintCmd = process.platform === 'win32' ? 'eslint.cmd' : 'eslint';
const eslintPath = path.join(projectRoot, 'node_modules', '.bin', eslintCmd);

console.log(`ESLint path: ${eslintPath}`);

const spawnArgs = process.platform === 'win32' 
  ? ['cmd', ['/c', eslintPath, '.', '--fix']]
  : ['node', [eslintPath, '.', '--fix']];

const child = spawn(spawnArgs[0], spawnArgs[1], {
  cwd: projectRoot,
  stdio: 'inherit'
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ ESLint passed successfully!');
  } else {
    console.log(`❌ ESLint found issues. Exit code: ${code}`);
    process.exit(code);
  }
});

child.on('error', (err) => {
  console.error('Error running ESLint:', err);
  process.exit(1);
});