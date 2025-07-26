import { spawn } from 'child_process';
import { platform } from 'os';

const isWindows = platform() === 'win32';
const shell = isWindows ? true : false;
const command = isWindows ? 'pnpm.cmd' : 'pnpm';

console.log('Starting tests...');

const testProcess = spawn(command, ['test', '--run'], {
  shell,
  stdio: 'inherit',
  cwd: process.cwd()
});

testProcess.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});

testProcess.on('error', (err) => {
  console.error('Failed to start test process:', err);
  process.exit(1);
});