#!/usr/bin/env node

// Reset argv to remove any extra arguments
process.argv = [process.argv[0], process.argv[1], 'run'];

// Run vitest
import('../../node_modules/vitest/dist/cli.js');