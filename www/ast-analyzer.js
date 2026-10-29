// Simple AST-like code analyzer for JavaScript
// This tool helps identify potential issues like infinite loops, memory leaks, and structural problems

const fs = require('fs');
const path = require('path');

class CodeAnalyzer {
  constructor() {
    this.issues = [];
    this.functions = new Map();
    this.timers = new Map();
    this.eventListeners = new Map();
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.analyzeCode(content, filePath);
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  analyzeCode(code, filePath) {
    // Detect potential infinite loops
    this.detectInfiniteLoops(code, filePath);
    
    // Detect memory leaks from timers
    this.detectTimerLeaks(code, filePath);
    
    // Detect event listener issues
    this.detectEventListenerIssues(code, filePath);
    
    // Detect deep recursion
    this.detectDeepRecursion(code, filePath);
    
    // Detect large DOM operations
    this.detectLargeDOMOperations(code, filePath);
  }

  detectInfiniteLoops(code, filePath) {
    const patterns = [
      /while\s*\(\s*true\s*\)/gi,
      /for\s*\(\s*;\s*;\s*\)/gi,
      /while\s*\(\s*1\s*\)/gi,
      /while\s*\(\s*!\s*0\s*\)/gi
    ];

    patterns.forEach((pattern, index) => {
      const matches = code.match(pattern);
      if (matches) {
        this.issues.push({
          type: 'POTENTIAL_INFINITE_LOOP',
          file: filePath,
          message: `Found ${matches.length} potential infinite loop(s)`,
          severity: 'HIGH'
        });
      }
    });
  }

  detectTimerLeaks(code, filePath) {
    // Find setInterval without corresponding clearInterval
    const setIntervalMatches = code.match(/setInterval\s*\(/g) || [];
    const clearIntervalMatches = code.match(/clearInterval\s*\(/g) || [];
    
    if (setIntervalMatches.length > clearIntervalMatches.length) {
      this.issues.push({
        type: 'POTENTIAL_TIMER_LEAK',
        file: filePath,
        message: `Found ${setIntervalMatches.length} setInterval calls but only ${clearIntervalMatches.length} clearInterval calls`,
        severity: 'MEDIUM'
      });
    }

    // Find setTimeout without corresponding clearTimeout
    const setTimeoutMatches = code.match(/setTimeout\s*\(/g) || [];
    const clearTimeoutMatches = code.match(/clearTimeout\s*\(/g) || [];
    
    if (setTimeoutMatches.length > clearTimeoutMatches.length) {
      this.issues.push({
        type: 'POTENTIAL_TIMEOUT_LEAK',
        file: filePath,
        message: `Found ${setTimeoutMatches.length} setTimeout calls but only ${clearTimeoutMatches.length} clearTimeout calls`,
        severity: 'LOW'
      });
    }
  }

  detectEventListenerIssues(code, filePath) {
    // Check for addEventListener without removeEventListener
    const addListenerMatches = code.match(/addEventListener\s*\(/g) || [];
    const removeListenerMatches = code.match(/removeEventListener\s*\(/g) || [];
    
    if (addListenerMatches.length > removeListenerMatches.length) {
      this.issues.push({
        type: 'POTENTIAL_EVENT_LISTENER_LEAK',
        file: filePath,
        message: `Found ${addListenerMatches.length} addEventListener calls but only ${removeListenerMatches.length} removeEventListener calls`,
        severity: 'MEDIUM'
      });
    }
  }

  detectDeepRecursion(code, filePath) {
    // Look for recursive function calls without base case protection
    const functionDefs = code.match(/function\s+(\w+)\s*\([^)]*\)\s*\{/g) || [];
    
    functionDefs.forEach(funcDef => {
      const funcName = funcDef.match(/function\s+(\w+)/)[1];
      const recursiveCalls = code.match(new RegExp(`${funcName}\\s*\\(`, 'g')) || [];
      
      if (recursiveCalls.length > 3) {
        // Check if there's a base case
        const hasBaseCase = code.match(/if\s*\([^)]*\)\s*return|if\s*\([^)]*\)\s*break/i);
        if (!hasBaseCase) {
          this.issues.push({
            type: 'POTENTIAL_DEEP_RECURSION',
            file: filePath,
            message: `Function ${funcName} has ${recursiveCalls.length} recursive calls - possible stack overflow risk`,
            severity: 'HIGH'
          });
        }
      }
    });
  }

  detectLargeDOMOperations(code, filePath) {
    // Look for DOM operations in loops
    const loopPatterns = [
      /for\s*\([^)]*\)\s*\{[^}]*\.innerHTML\s*=/gi,
      /for\s*\([^)]*\)\s*\{[^}]*\.appendChild\s*\(/gi,
      /while\s*\([^)]*\)\s*\{[^}]*\.innerHTML\s*=/gi,
      /while\s*\([^)]*\)\s*\{[^}]*\.appendChild\s*\(/gi
    ];

    loopPatterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        this.issues.push({
          type: 'PERFORMANCE_ISSUE',
          file: filePath,
          message: `Found ${matches.length} DOM operations inside loops - can cause performance issues`,
          severity: 'MEDIUM'
        });
      }
    });
  }

  getReport() {
    return {
      totalIssues: this.issues.length,
      bySeverity: {
        HIGH: this.issues.filter(i => i.severity === 'HIGH').length,
        MEDIUM: this.issues.filter(i => i.severity === 'MEDIUM').length,
        LOW: this.issues.filter(i => i.severity === 'LOW').length
      },
      issues: this.issues
    };
  }
}

// Analyze the main files
const analyzer = new CodeAnalyzer();

console.log('Analyzing code structure...\n');

// Analyze main JavaScript files
const filesToAnalyze = [
  'www/public/index.html',
  'www/public/assets/js/main.js',
  'www/public/assets/js/database-manager.js',
  'www/public/app.js'
];

filesToAnalyze.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`Analyzing ${file}...`);
    analyzer.analyzeFile(fullPath);
  } else {
    console.log(`File not found: ${file}`);
  }
});

const report = analyzer.getReport();

console.log('\n=== ANALYSIS REPORT ===');
console.log(`Total Issues Found: ${report.totalIssues}`);
console.log(`High Severity: ${report.bySeverity.HIGH}`);
console.log(`Medium Severity: ${report.bySeverity.MEDIUM}`);
console.log(`Low Severity: ${report.bySeverity.LOW}`);

if (report.issues.length > 0) {
  console.log('\n=== DETAILED ISSUES ===');
  report.issues.forEach((issue, index) => {
    console.log(`\n${index + 1}. [${issue.severity}] ${issue.type}`);
    console.log(`   File: ${issue.file}`);
    console.log(`   Message: ${issue.message}`);
  });
} else {
  console.log('\nNo significant issues found!');
}