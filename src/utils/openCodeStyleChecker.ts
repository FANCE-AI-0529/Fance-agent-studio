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
