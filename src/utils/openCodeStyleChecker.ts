/**
 * OpenCode Style Guide Checker
 * Enforces strict engineering standards from OpenCode STYLE_GUIDE.md
 */

export type StyleRule = 'no-let' | 'no-else' | 'single-word' | 'no-destructure' | 'no-any' | 'no-try-catch';

export interface StyleViolation {
  rule: StyleRule;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  autoFix?: string;
  original?: string;
}

export interface StyleCheckResult {
  violations: StyleViolation[];
  passed: boolean;
  score: number; // 0-100
  summary: string;
}

const RULE_CONFIGS: Record<StyleRule, { pattern: RegExp; message: string; severity: 'error' | 'warning' | 'info' }> = {
  'no-let': {
    pattern: /\blet\s+\w+/,
    message: 'Use const with ternary instead of let',
    severity: 'error'
  },
  'no-else': {
    pattern: /\belse\s*{|\belse\s+if/,
    message: 'Use early return instead of else',
    severity: 'error'
  },
  'no-any': {
    pattern: /:\s*any\b/,
    message: 'Avoid using any type - use specific types or generics',
    severity: 'error'
  },
  'no-try-catch': {
    pattern: /\btry\s*{/,
    message: 'Consider using Result pattern instead of try/catch',
    severity: 'warning'
  },
  'single-word': {
    pattern: /\b(const|let|var)\s+[a-z]+[A-Z]\w*\s*=/,
    message: 'Prefer single-word variable names when possible',
    severity: 'info'
  },
  'no-destructure': {
    pattern: /const\s*{\s*\w+\s*}\s*=/,
    message: 'Avoid unnecessary destructuring - use obj.prop instead',
    severity: 'info'
  }
};

/**
 * Check code against OpenCode style guide rules
 */
export function checkOpenCodeStyle(code: string, enabledRules?: StyleRule[]): StyleCheckResult {
  const violations: StyleViolation[] = [];
  const lines = code.split('\n');
  const rulesToCheck = enabledRules ?? (Object.keys(RULE_CONFIGS) as StyleRule[]);
  
  lines.forEach((line, index) => {
    rulesToCheck.forEach((rule) => {
      const config = RULE_CONFIGS[rule];
      const match = line.match(config.pattern);
      
      if (match) {
        const violation: StyleViolation = {
          rule,
          line: index + 1,
          column: match.index ?? 0,
          message: config.message,
          severity: config.severity,
          original: line.trim()
        };

        // Generate auto-fix suggestions for certain rules
        const autoFix = generateAutoFix(rule, line, match);
        if (autoFix) {
          violation.autoFix = autoFix;
        }

        violations.push(violation);
      }
    });
  });

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  const totalLines = lines.length;
  
  // Score calculation: start at 100, subtract points for violations
  const score = Math.max(0, 100 - (errorCount * 10) - (warningCount * 3) - (violations.length - errorCount - warningCount));

  return {
    violations,
    passed: errorCount === 0,
    score,
    summary: generateSummary(violations, totalLines)
  };
}

/**
 * Generate auto-fix suggestion for a violation
 */
function generateAutoFix(rule: StyleRule, line: string, match: RegExpMatchArray): string | undefined {
  switch (rule) {
    case 'no-let': {
      // Transform: let x = ... to const x = condition ? value1 : value2
      const varMatch = line.match(/let\s+(\w+)\s*=\s*(.+)/);
      if (varMatch) {
        return `const ${varMatch[1]} = /* condition ? value1 : */ ${varMatch[2]}`;
      }
      return undefined;
    }

    case 'no-else': {
      // Suggest early return pattern
      return '// Refactor: Use early return pattern\n// if (condition) return result;\n// ... continue with main logic';
    }

    case 'no-any': {
      // Suggest unknown or generic
      return line.replace(/:\s*any\b/, ': unknown /* or use a specific type */');
    }

    default:
      return undefined;
  }
}

/**
 * Generate summary message
 */
function generateSummary(violations: StyleViolation[], totalLines: number): string {
  if (violations.length === 0) {
    return '✅ Code passes all OpenCode style checks';
  }

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  const infoCount = violations.filter(v => v.severity === 'info').length;

  const parts: string[] = [];
  if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
  if (infoCount > 0) parts.push(`${infoCount} suggestion${infoCount > 1 ? 's' : ''}`);

  return `Found ${parts.join(', ')} in ${totalLines} lines`;
}

/**
 * Format violations as markdown table
 */
export function formatViolationsAsMarkdown(violations: StyleViolation[]): string {
  if (violations.length === 0) {
    return '✅ No style violations found';
  }

  const header = '| Rule | Line | Severity | Message |\n|------|------|----------|---------|';
  const rows = violations.map(v => 
    `| ${v.rule} | ${v.line}:${v.column} | ${v.severity} | ${v.message} |`
  ).join('\n');

  return `${header}\n${rows}`;
}

/**
 * Apply auto-fixes to code
 */
export function applyAutoFixes(code: string, violations: StyleViolation[]): string {
  const lines = code.split('\n');
  const fixableViolations = violations.filter(v => v.autoFix);

  // Sort by line number descending to avoid offset issues
  fixableViolations.sort((a, b) => b.line - a.line);

  fixableViolations.forEach(v => {
    if (v.autoFix && v.original) {
      lines[v.line - 1] = lines[v.line - 1].replace(v.original, v.autoFix);
    }
  });

  return lines.join('\n');
}

/**
 * Get style rules configuration for UI display
 */
export function getStyleRulesConfig(): Array<{
  rule: StyleRule;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  example: { good: string; bad: string };
}> {
  return [
    {
      rule: 'no-let',
      name: "No 'let' Statements",
      description: 'Use const with ternary operators instead of let with if/else assignments.',
      severity: 'error',
      example: {
        good: 'const value = condition ? 1 : 2;',
        bad: 'let value;\nif (condition) value = 1;\nelse value = 2;'
      }
    },
    {
      rule: 'no-else',
      name: "No 'else' Statements",
      description: 'Use early returns (Guard Clauses) instead of else blocks.',
      severity: 'error',
      example: {
        good: 'if (!valid) return null;\nreturn data;',
        bad: 'if (valid) {\n  return data;\n} else {\n  return null;\n}'
      }
    },
    {
      rule: 'no-any',
      name: "No 'any' Type",
      description: 'Use specific types, generics, or unknown instead of any.',
      severity: 'error',
      example: {
        good: 'function parse(data: unknown): Result',
        bad: 'function parse(data: any): any'
      }
    },
    {
      rule: 'single-word',
      name: 'Single-Word Variables',
      description: 'Prefer single-word variable names when the context is clear.',
      severity: 'info',
      example: {
        good: 'const user = getUser();',
        bad: 'const currentUser = getUser();'
      }
    },
    {
      rule: 'no-destructure',
      name: 'Avoid Destructuring',
      description: 'Use obj.prop to preserve context instead of destructuring.',
      severity: 'info',
      example: {
        good: 'const name = user.name;',
        bad: 'const { name } = user;'
      }
    },
    {
      rule: 'no-try-catch',
      name: 'Avoid try/catch',
      description: 'Consider using Result pattern for explicit error handling.',
      severity: 'warning',
      example: {
        good: 'const result = await fetchSafe(url);\nif (!result.ok) return result.error;',
        bad: 'try {\n  await fetch(url);\n} catch (e) {\n  handleError(e);\n}'
      }
    }
  ];
}

/**
 * Refactor code to be compliant with OpenCode style guide
 * This is a simplified transformation - real implementation would use AST
 */
export function refactorToCompliant(code: string): { 
  refactored: string; 
  changes: Array<{ from: string; to: string; rule: StyleRule }>;
} {
  const changes: Array<{ from: string; to: string; rule: StyleRule }> = [];
  const lines = code.split('\n');
  const refactoredLines: string[] = [];
  
  let skipNextElse = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const originalLine = line;
    let processedLine = line;
    
    // Skip else blocks after early return transformation
    if (skipNextElse && /^\s*}\s*else\s*{/.test(line)) {
      skipNextElse = false;
      // Skip until we find the closing brace
      let braceCount = 1;
      while (braceCount > 0 && i < lines.length - 1) {
        i++;
        const nextLine = lines[i];
        braceCount += (nextLine.match(/{/g) || []).length;
        braceCount -= (nextLine.match(/}/g) || []).length;
      }
      continue;
    }
    
    // Transform: let x = value -> const x = value (simple cases)
    if (/\blet\s+\w+\s*=/.test(processedLine)) {
      const newLine = processedLine.replace(/\blet\s+/, 'const ');
      if (newLine !== processedLine) {
        changes.push({ from: processedLine.trim(), to: newLine.trim(), rule: 'no-let' });
        processedLine = newLine;
      }
    }
    
    // Transform: : any -> : unknown
    if (/:\s*any\b/.test(processedLine)) {
      const newLine = processedLine.replace(/:\s*any\b/g, ': unknown');
      if (newLine !== processedLine) {
        changes.push({ from: processedLine.trim(), to: newLine.trim(), rule: 'no-any' });
        processedLine = newLine;
      }
    }
    
    // Transform: const { prop } = obj -> const prop = obj.prop
    const destructureMatch = processedLine.match(/const\s*{\s*(\w+)\s*}\s*=\s*(\w+)/);
    if (destructureMatch) {
      const newLine = processedLine.replace(
        /const\s*{\s*(\w+)\s*}\s*=\s*(\w+)/,
        `const ${destructureMatch[1]} = ${destructureMatch[2]}.${destructureMatch[1]}`
      );
      if (newLine !== processedLine) {
        changes.push({ from: processedLine.trim(), to: newLine.trim(), rule: 'no-destructure' });
        processedLine = newLine;
      }
    }
    
    // Transform camelCase variable names to single words (simplified)
    const varNameMatch = processedLine.match(/\b(const|let|var)\s+([a-z]+)([A-Z]\w*)\s*=/);
    if (varNameMatch) {
      const shortName = varNameMatch[2].toLowerCase();
      const newLine = processedLine.replace(
        new RegExp(`\\b${varNameMatch[2]}${varNameMatch[3]}\\b`, 'g'),
        shortName
      );
      if (newLine !== processedLine) {
        changes.push({ from: processedLine.trim(), to: newLine.trim(), rule: 'single-word' });
        processedLine = newLine;
      }
    }
    
    refactoredLines.push(processedLine);
  }
  
  return {
    refactored: refactoredLines.join('\n'),
    changes
  };
}

/**
 * Get a detailed analysis report
 */
export function getDetailedAnalysis(code: string): {
  checkResult: StyleCheckResult;
  suggestions: string[];
  refactorPreview: string;
} {
  const checkResult = checkOpenCodeStyle(code);
  const { refactored, changes } = refactorToCompliant(code);
  
  const suggestions: string[] = [];
  
  if (checkResult.violations.some(v => v.rule === 'no-let')) {
    suggestions.push('💡 Replace all `let` with `const`. Use ternary operators for conditional assignments.');
  }
  if (checkResult.violations.some(v => v.rule === 'no-else')) {
    suggestions.push('💡 Use Early Return pattern: `if (!condition) return; // continue with main logic`');
  }
  if (checkResult.violations.some(v => v.rule === 'no-any')) {
    suggestions.push('💡 Define explicit interfaces instead of using `any`. Use `unknown` for truly unknown types.');
  }
  if (checkResult.violations.some(v => v.rule === 'no-try-catch')) {
    suggestions.push('💡 Consider using Result pattern: `type Result<T> = { ok: true; value: T } | { ok: false; error: Error }`');
  }
  if (checkResult.violations.some(v => v.rule === 'no-destructure')) {
    suggestions.push('💡 Use `obj.prop` instead of `const { prop } = obj` to preserve context.');
  }
  if (checkResult.violations.some(v => v.rule === 'single-word')) {
    suggestions.push('💡 Prefer single-word variable names when context is clear (e.g., `user` instead of `currentUser`).');
  }
  
  return {
    checkResult,
    suggestions,
    refactorPreview: refactored
  };
}
