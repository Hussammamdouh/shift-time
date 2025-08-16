#!/usr/bin/env node

/**
 * Pre-build lint check script
 * Checks for common ESLint issues that cause build failures
 */

const fs = require('fs');
const path = require('path');

const issues = [];

// Check for unescaped quotes and apostrophes in JSX
function checkJSXQuotes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for unescaped quotes in JSX text content
    if (line.includes('>') && line.includes('<')) {
      // Look for quotes in JSX text content (between > and <)
      const jsxTextMatches = line.match(/>([^<]*?)</g);
      if (jsxTextMatches) {
        jsxTextMatches.forEach(match => {
          const text = match.slice(1, -1); // Remove > and <
          if (text.includes('"') || text.includes("'")) {
            issues.push({
              file: filePath,
              line: lineNum,
              issue: 'Unescaped quotes in JSX text content',
              text: text.trim()
            });
          }
        });
      }
    }
  });
}

// Check for unused variables
function checkUnusedVariables(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Look for const/let declarations
    if (line.match(/^\s*(const|let)\s+(\w+)\s*=/)) {
      const varName = line.match(/^\s*(const|let)\s+(\w+)\s*=/)[2];
      
      // Check if variable is used elsewhere in the file
      const usageCount = (content.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
      
      if (usageCount === 1) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Variable declared but never used',
          text: varName
        });
      }
    }
  });
}

// Scan all component files
const componentsDir = path.join(__dirname, '..', 'components');
const componentFiles = fs.readdirSync(componentsDir)
  .filter(file => file.endsWith('.tsx'))
  .map(file => path.join(componentsDir, file));

componentFiles.forEach(file => {
  checkJSXQuotes(file);
  checkUnusedVariables(file);
});

// Report issues
if (issues.length > 0) {
  console.log('❌ ESLint issues found that will cause build failures:');
  console.log('');
  
  issues.forEach(issue => {
    console.log(`📁 ${issue.file}:${issue.line}`);
    console.log(`   ${issue.issue}: ${issue.text}`);
    console.log('');
  });
  
  console.log('💡 Fix these issues before building:');
  console.log('   - Replace quotes with &quot; or &apos; in JSX text');
  console.log('   - Remove unused variables or use them');
  console.log('');
  
  process.exit(1);
} else {
  console.log('✅ No ESLint issues found. Build should succeed!');
}
