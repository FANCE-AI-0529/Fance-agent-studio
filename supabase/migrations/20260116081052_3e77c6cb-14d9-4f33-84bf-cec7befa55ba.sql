-- Insert core-opencode kernel skill with full style guide
INSERT INTO kernel_skills (skill_id, name, version, description, content, file_templates, hooks, rules, is_active)
VALUES (
  'core-opencode',
  'OpenCode Programming Engine',
  '1.0.0',
  'OpenCode-style 编程智能体引擎 - 双模式架构 + 严格代码规范',
  
  '# OpenCode Programming Engine

## Overview
OpenCode is a dual-mode programming agent engine with strict engineering standards.

## Modes
1. **PLAN Mode** (Default): Read-only mode for browsing files and generating modification plans
2. **BUILD Mode**: Read-write mode for executing code changes after approval

## Coding Standards (MANDATORY)

### Rule 1: NO `let` Statements
Prefer `const`. Use ternary operators instead of if/else assignments.
```typescript
// ✅ Good
const foo = condition ? 1 : 2;

// ❌ Bad
let foo;
if (condition) foo = 1;
else foo = 2;
```

### Rule 2: NO `else` Statements  
Prefer early returns (Guard Clauses) or IIFE.
```typescript
// ✅ Good
function foo() {
  if (condition) return 1;
  return 2;
}

// ❌ Bad
function foo() {
  if (condition) return 1;
  else return 2;
}
```

### Rule 3: Single Word Variable Names
Prefer single word names when possible.

### Rule 4: Avoid Unnecessary Destructuring
Use `obj.prop` instead of `const { prop } = obj`.

### Rule 5: Avoid `try/catch` Where Possible
Consider Result pattern or explicit error handling.

### Rule 6: Never Use `any` Type
Use specific types, generics, or `unknown`.

### Rule 7: Bun APIs Preferred
Use `Bun.file()` over Node.js `fs` module.

## Self-Check Protocol
After generating code in BUILD mode, perform mandatory self-check:
1. Scan for `let` statements → Refactor to `const` with ternary
2. Scan for `else` statements → Refactor to early returns
3. Scan for `:any` types → Replace with specific types
4. Report all violations before completion

## Mode Switching Protocol
1. Always start in PLAN mode
2. Browse files and analyze structure
3. Generate modification plan
4. Request user approval or MPLP policy check
5. Switch to BUILD mode after approval
6. Execute changes atomically
7. Run style check on all written code
8. Return to PLAN mode after completion',

  '{
    "plan.md": "# Code Modification Plan\n\n## Target Files\n| File | Action | Risk |\n|------|--------|------|\n\n## Style Compliance Checklist\n- [ ] No let statements\n- [ ] No else statements\n- [ ] No any types",
    "style_check.md": "# OpenCode Style Check Report\n\n## Summary\n- Score: [score]/100\n- Passed: [yes/no]\n\n## Violations\n| Rule | Line | Severity |"
  }'::jsonb,
  
  '{
    "SessionStart": {"action": "SET mode=plan", "inject": "You are in PLAN mode. Read files and generate plans only."},
    "PreToolUse": {"matcher": "write|edit|create|delete|bash", "action": "CHECK mode=build OR BLOCK"},
    "PostToolUse": {"matcher": "write|edit", "action": "RUN style_check"},
    "PostStyleCheck": {"condition": "violations.length > 0", "action": "SELF_REFACTOR"},
    "ModeSwitch": {"from": "plan", "to": "build", "require": "user_approval OR mplp_auto_approve"}
  }'::jsonb,
  
  '{
    "planFirst": true,
    "requireApprovalForBuild": true,
    "styleCheckOnWrite": true,
    "selfRefactorOnViolation": true,
    "noLetStatements": true,
    "noElseStatements": true,
    "noAnyType": true,
    "singleWordNaming": true,
    "avoidDestructuring": true,
    "avoidTryCatch": true,
    "preferBunAPIs": true
  }'::jsonb,
  
  true
)
ON CONFLICT (skill_id) DO UPDATE SET
  content = EXCLUDED.content,
  file_templates = EXCLUDED.file_templates,
  hooks = EXCLUDED.hooks,
  rules = EXCLUDED.rules,
  updated_at = now();