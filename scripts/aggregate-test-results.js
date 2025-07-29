#!/usr/bin/env node

/**
 * Aggregate test results from multiple test runs
 * Used by comprehensive-test-pipeline.yml GitHub Action
 */

const fs = require('fs');
const path = require('path');

// Get results directory from command line
const resultsDir = process.argv[2];

if (!resultsDir) {
  console.error('Usage: node aggregate-test-results.js <results-directory>');
  process.exit(1);
}

console.log('🔍 Aggregating test results from:', resultsDir);

const results = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  },
  suites: {}
};

// Function to safely parse JSON files
function parseJSONFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${filePath}:`, error.message);
    return null;
  }
}

// Function to find test result files recursively
function findTestResults(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findTestResults(fullPath));
      } else if (item.endsWith('.json') && (
        item.includes('test-results') || 
        item.includes('coverage') || 
        item.includes('report')
      )) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Failed to read directory ${dir}:`, error.message);
  }
  
  return files;
}

// Find all test result files
const testFiles = findTestResults(resultsDir);
console.log(`📊 Found ${testFiles.length} test result files`);

// Process each test result file
for (const file of testFiles) {
  const data = parseJSONFile(file);
  if (!data) continue;
  
  const suiteName = path.basename(path.dirname(file));
  
  // Initialize suite if not exists
  if (!results.suites[suiteName]) {
    results.suites[suiteName] = {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: []
    };
  }
  
  // Aggregate based on common test result formats
  if (data.numPassedTests !== undefined) {
    // Jest format
    results.suites[suiteName].passed += data.numPassedTests || 0;
    results.suites[suiteName].failed += data.numFailedTests || 0;
    results.suites[suiteName].skipped += data.numPendingTests || 0;
    results.suites[suiteName].duration += data.testResults?.reduce((sum, r) => sum + (r.perfStats?.runtime || 0), 0) || 0;
  } else if (data.stats) {
    // Playwright format
    results.suites[suiteName].passed += data.stats.expected || 0;
    results.suites[suiteName].failed += data.stats.unexpected || 0;
    results.suites[suiteName].skipped += data.stats.skipped || 0;
    results.suites[suiteName].duration += data.stats.duration || 0;
  } else if (data.tests) {
    // Generic format
    const tests = Array.isArray(data.tests) ? data.tests : Object.values(data.tests);
    for (const test of tests) {
      if (test.status === 'passed' || test.pass) results.suites[suiteName].passed++;
      else if (test.status === 'failed' || test.fail) results.suites[suiteName].failed++;
      else if (test.status === 'skipped' || test.skip) results.suites[suiteName].skipped++;
    }
  }
}

// Calculate totals
for (const suite of Object.values(results.suites)) {
  results.summary.passed += suite.passed;
  results.summary.failed += suite.failed;
  results.summary.skipped += suite.skipped;
  results.summary.duration += suite.duration;
}
results.summary.total = results.summary.passed + results.summary.failed + results.summary.skipped;

// Generate summary report
console.log('\n📋 Test Results Summary:');
console.log('========================');
console.log(`Total Tests: ${results.summary.total}`);
console.log(`✅ Passed: ${results.summary.passed}`);
console.log(`❌ Failed: ${results.summary.failed}`);
console.log(`⏭️  Skipped: ${results.summary.skipped}`);
console.log(`⏱️  Duration: ${(results.summary.duration / 1000).toFixed(2)}s`);
console.log('\nPer Suite:');
for (const [name, suite] of Object.entries(results.suites)) {
  console.log(`  ${name}: ✅ ${suite.passed} ❌ ${suite.failed} ⏭️  ${suite.skipped}`);
}

// Write aggregated results
const outputPath = path.join(process.cwd(), 'test-results-summary.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\n📁 Aggregated results written to: ${outputPath}`);

// Exit with error if tests failed
if (results.summary.failed > 0) {
  console.error(`\n❌ ${results.summary.failed} tests failed!`);
  process.exit(1);
}

console.log('\n✅ All tests passed!');
process.exit(0);