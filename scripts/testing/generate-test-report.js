#!/usr/bin/env node

/**
 * Generate comprehensive test report from aggregated results
 * Used by comprehensive-test-pipeline.yml GitHub Action
 */

const fs = require('fs');
const path = require('path');

// Ensure test-results directory exists
const testResultsDir = path.join(process.cwd(), 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

console.log('📊 Generating comprehensive test report...');

// Mock data for now to ensure the pipeline works
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  },
  details: {
    unit: { status: 'pending', tests: 0 },
    integration: { status: 'pending', tests: 0 },
    e2e: { status: 'pending', tests: 0 },
    visual: { status: 'pending', tests: 0 },
    performance: { status: 'pending', tests: 0 },
    stress: { status: 'pending', tests: 0 }
  }
};

// Try to read aggregated results if available
const aggregatedPath = path.join(testResultsDir, 'aggregated-results.json');
if (fs.existsSync(aggregatedPath)) {
  try {
    const aggregated = JSON.parse(fs.readFileSync(aggregatedPath, 'utf8'));
    Object.assign(report, aggregated);
  } catch (error) {
    console.warn('⚠️  Could not read aggregated results:', error.message);
  }
}

// Generate HTML report
const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Results - ${new Date().toLocaleDateString()}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .pass { color: green; }
    .fail { color: red; }
    .skip { color: orange; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Comprehensive Test Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Generated: ${report.timestamp}</p>
    <p>Total Tests: ${report.summary.total}</p>
    <p class="pass">Passed: ${report.summary.passed}</p>
    <p class="fail">Failed: ${report.summary.failed}</p>
    <p class="skip">Skipped: ${report.summary.skipped}</p>
    <p>Duration: ${report.summary.duration}ms</p>
  </div>
  <h2>Test Suites</h2>
  <table>
    <tr>
      <th>Suite</th>
      <th>Status</th>
      <th>Tests</th>
    </tr>
    ${Object.entries(report.details).map(([suite, data]) => `
      <tr>
        <td>${suite}</td>
        <td class="${data.status === 'passed' ? 'pass' : data.status === 'failed' ? 'fail' : 'skip'}">${data.status}</td>
        <td>${data.tests}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>
`;

// Generate Markdown report
const mdReport = `# 🧪 Test Results

**Generated:** ${new Date().toISOString()}

## Summary
- **Total Tests:** ${report.summary.total}
- **Passed:** ${report.summary.passed} ✅
- **Failed:** ${report.summary.failed} ❌
- **Skipped:** ${report.summary.skipped} ⏭️
- **Duration:** ${report.summary.duration}ms

## Test Suites
| Suite | Status | Tests |
|-------|--------|-------|
${Object.entries(report.details).map(([suite, data]) => 
  `| ${suite} | ${data.status} | ${data.tests} |`
).join('\n')}
`;

// Generate metrics dashboard JSON
const metricsData = {
  timestamp: report.timestamp,
  testSuites: Object.entries(report.details).map(([name, data]) => ({
    name,
    status: data.status,
    tests: data.tests,
    passed: data.passed || 0,
    failed: data.failed || 0,
    skipped: data.skipped || 0
  })),
  trends: [],
  coverage: {
    lines: 0,
    branches: 0,
    functions: 0,
    statements: 0
  }
};

// Write reports
fs.writeFileSync(path.join(testResultsDir, 'comprehensive-report.html'), htmlReport);
fs.writeFileSync(path.join(testResultsDir, 'comprehensive-report.md'), mdReport);
fs.writeFileSync(path.join(testResultsDir, 'metrics-dashboard.json'), JSON.stringify(metricsData, null, 2));

console.log('✅ Test reports generated successfully!');
console.log('  - comprehensive-report.html');
console.log('  - comprehensive-report.md');
console.log('  - metrics-dashboard.json');