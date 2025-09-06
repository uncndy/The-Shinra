/**
 * Test runner script
 * Runs all tests and generates coverage report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting test suite...\n');

try {
  // Run tests with coverage
  console.log('Running Jest tests...');
  execSync('npm run test:coverage', { stdio: 'inherit' });
  
  console.log('\n✅ All tests completed successfully!');
  
  // Check if coverage directory exists
  const coverageDir = path.join(__dirname, '..', 'coverage');
  if (fs.existsSync(coverageDir)) {
    console.log('\n📊 Coverage report generated in ./coverage/');
    console.log('Open ./coverage/lcov-report/index.html in your browser to view detailed coverage');
  }
  
} catch (error) {
  console.error('\n❌ Tests failed:', error.message);
  process.exit(1);
}
