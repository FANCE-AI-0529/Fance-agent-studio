/**
 * 核心自主能力 Skills 提示词库
 * NanoClaw 原生格式 SKILL.md — 可直接注入 .claude/skills/ 目录
 */

export interface CoreSkillPrompt {
  id: string;
  name: string;
  description: string;
  category: string;
  allowedTools: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  skillMd: string;
  handlerPy: string;
  configYaml: string;
}

// ─────────────────────────────────────────────
// 1. agent-browser — 浏览器自动化
// ─────────────────────────────────────────────
const AGENT_BROWSER: CoreSkillPrompt = {
  id: 'nc-agent-browser',
  name: '浏览器自动化',
  description: '网页浏览、数据抓取、表单填写、截图 — 完整的浏览器自动化能力',
  category: '核心自主',
  allowedTools: 'Bash(agent-browser:*)',
  difficulty: 'intermediate',
  skillMd: `---
name: agent-browser
description: Browse the web for any task — research topics, read articles, interact with web apps, fill forms, take screenshots, extract data, and test web pages.
allowed-tools: Bash(agent-browser:*)
---

# Browser Automation with agent-browser

## Quick start

\`\`\`bash
agent-browser open <url>        # Navigate to page
agent-browser snapshot -i       # Get interactive elements with refs
agent-browser click @e1         # Click element by ref
agent-browser fill @e2 "text"   # Fill input by ref
agent-browser close             # Close browser
\`\`\`

## Core workflow

1. Navigate: \`agent-browser open <url>\`
2. Snapshot: \`agent-browser snapshot -i\` (returns elements with refs like \`@e1\`, \`@e2\`)
3. Interact using refs from the snapshot
4. Re-snapshot after navigation or significant DOM changes

## Commands

### Navigation
\`\`\`bash
agent-browser open <url>      # Navigate to URL
agent-browser back            # Go back
agent-browser forward         # Go forward
agent-browser reload          # Reload page
agent-browser close           # Close browser
\`\`\`

### Snapshot (page analysis)
\`\`\`bash
agent-browser snapshot            # Full accessibility tree
agent-browser snapshot -i         # Interactive elements only (recommended)
agent-browser snapshot -c         # Compact output
agent-browser snapshot -s "#main" # Scope to CSS selector
\`\`\`

### Interactions (use @refs from snapshot)
\`\`\`bash
agent-browser click @e1           # Click
agent-browser fill @e2 "text"     # Clear and type
agent-browser type @e2 "text"     # Type without clearing
agent-browser press Enter         # Press key
agent-browser hover @e1           # Hover
agent-browser select @e1 "value"  # Select dropdown option
agent-browser scroll down 500     # Scroll page
agent-browser upload @e1 file.pdf # Upload files
\`\`\`

### Get information
\`\`\`bash
agent-browser get text @e1        # Get element text
agent-browser get html @e1        # Get innerHTML
agent-browser get value @e1       # Get input value
agent-browser get attr @e1 href   # Get attribute
agent-browser get url             # Get current URL
\`\`\`

### Screenshots & PDF
\`\`\`bash
agent-browser screenshot          # Save to temp directory
agent-browser screenshot path.png # Save to specific path
agent-browser screenshot --full   # Full page
agent-browser pdf output.pdf      # Save as PDF
\`\`\`

### Wait
\`\`\`bash
agent-browser wait @e1                  # Wait for element
agent-browser wait 2000                 # Wait milliseconds
agent-browser wait --text "Success"     # Wait for text
agent-browser wait --load networkidle   # Wait for network idle
\`\`\`

## Example: Data extraction
\`\`\`bash
agent-browser open https://example.com/products
agent-browser snapshot -i
agent-browser get text @e1
agent-browser screenshot products.png
\`\`\``,
  handlerPy: `"""
Browser automation skill handler — wraps agent-browser CLI.
"""
import subprocess
import json
from typing import Dict, Any

async def handler(inputs: dict) -> dict:
    command = inputs.get("command", "")
    url = inputs.get("url", "")
    
    if not command:
        return {"error": "command is required", "success": False}
    
    try:
        cmd_parts = ["agent-browser"] + command.split()
        result = subprocess.run(cmd_parts, capture_output=True, text=True, timeout=30)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}
`,
  configYaml: `name: agent-browser
version: "1.0.0"
runtime: python3.11
timeout: 30
memory: 512
allowed-tools:
  - "Bash(agent-browser:*)"
`,
};

// ─────────────────────────────────────────────
// 2. file-manager — 文件系统管理
// ─────────────────────────────────────────────
const FILE_MANAGER: CoreSkillPrompt = {
  id: 'nc-file-manager',
  name: '文件系统管理',
  description: '目录遍历、文件读写、搜索、批量操作 — 完整的文件系统管理能力',
  category: '核心自主',
  allowedTools: 'Bash(find,ls,cat,mkdir,cp,mv,rm,touch,head,tail,wc,grep)',
  difficulty: 'beginner',
  skillMd: `---
name: file-manager
description: Manage files and directories — browse, read, write, search, and batch-operate on the local filesystem inside the container.
allowed-tools: Bash(find,ls,cat,mkdir,cp,mv,rm,touch,head,tail,wc,grep)
---

# File System Manager

## Quick start

\`\`\`bash
ls -la /workspace               # List directory
cat file.txt                    # Read file
echo "content" > file.txt       # Write file
find . -name "*.py" -type f     # Search files
\`\`\`

## Core workflow

1. [Explore]: \`ls\`, \`find\`, \`tree\` to understand directory structure
2. [Read]: \`cat\`, \`head\`, \`tail\` to inspect file content
3. [Write]: \`echo\`, \`cat >\`, \`sed\` to modify files
4. [Organize]: \`mkdir\`, \`cp\`, \`mv\`, \`rm\` to manage structure
5. [Analyze]: \`wc\`, \`grep\`, \`diff\` to understand content

## Commands

### Directory operations
\`\`\`bash
ls -la <path>                   # List with details
mkdir -p path/to/dir            # Create nested directories
find . -name "*.ts" -type f     # Find files by pattern
find . -mtime -1                # Files modified in last 24h
du -sh <path>                   # Check directory size
\`\`\`

### File reading
\`\`\`bash
cat <file>                      # Full file content
head -n 20 <file>               # First 20 lines
tail -n 20 <file>               # Last 20 lines
wc -l <file>                    # Line count
grep -rn "pattern" <path>       # Search with line numbers
grep -rl "pattern" --include="*.ts" .  # Files containing pattern
\`\`\`

### File writing
\`\`\`bash
echo "content" > file.txt       # Overwrite file
echo "content" >> file.txt      # Append to file
cp source dest                  # Copy file
mv source dest                  # Move/rename
rm <file>                       # Remove file (MPLP guarded)
rm -rf <dir>                    # Remove directory (MPLP guarded)
\`\`\`

### Batch operations
\`\`\`bash
find . -name "*.log" -delete                # Delete all logs
find . -name "*.bak" -exec rm {} +          # Remove backups
find . -name "*.ts" -exec wc -l {} +        # Count lines in TS files
\`\`\`

## Safety

- \`rm\` and \`rm -rf\` trigger MPLP CONFIRM_REQUIRED
- Always verify paths with \`ls\` before destructive operations
- Use \`find ... -print\` before \`find ... -delete\`
`,
  handlerPy: `"""
File system manager skill handler.
"""
import os
import subprocess
from typing import Dict, Any

SAFE_COMMANDS = {"ls", "cat", "head", "tail", "find", "wc", "grep", "mkdir", "cp", "mv", "touch"}
DANGEROUS_COMMANDS = {"rm"}

async def handler(inputs: dict) -> dict:
    command = inputs.get("command", "")
    if not command:
        return {"error": "command is required", "success": False}
    
    cmd_name = command.split()[0]
    requires_confirm = cmd_name in DANGEROUS_COMMANDS
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout[:10000],
            "stderr": result.stderr[:2000],
            "requires_confirm": requires_confirm,
        }
    except Exception as e:
        return {"error": str(e), "success": False}
`,
  configYaml: `name: file-manager
version: "1.0.0"
runtime: python3.11
timeout: 30
memory: 256
allowed-tools:
  - "Bash(find,ls,cat,mkdir,cp,mv,rm,touch,head,tail,wc,grep)"
`,
};

// ─────────────────────────────────────────────
// 3. shell-executor — Shell 命令执行
// ─────────────────────────────────────────────
const SHELL_EXECUTOR: CoreSkillPrompt = {
  id: 'nc-shell-executor',
  name: 'Shell 命令执行',
  description: '通用命令行操作，受 MPLP 安全策略拦截，支持管道和重定向',
  category: '核心自主',
  allowedTools: 'Bash(*)',
  difficulty: 'advanced',
  skillMd: `---
name: shell-executor
description: Execute arbitrary shell commands inside the container. All commands pass through MPLP security interceptor for safety enforcement.
allowed-tools: Bash(*)
---

# Shell Command Executor

## Quick start

\`\`\`bash
echo "Hello from container"
python3 script.py
npm run build
\`\`\`

## Core workflow

1. [Plan]: Determine the sequence of commands needed
2. [Check]: Use \`which\`, \`--version\` to verify tool availability
3. [Execute]: Run commands one at a time, check exit codes
4. [Verify]: Confirm output matches expectations
5. [Handle errors]: Parse stderr, retry or escalate

## Capabilities

### Process management
\`\`\`bash
ps aux                          # List processes
kill <pid>                      # Terminate process (MPLP guarded)
nohup command &                 # Background execution
timeout 60 command              # Time-limited execution
\`\`\`

### Package management
\`\`\`bash
pip install <package>           # Python packages
npm install <package>           # Node packages
apt-get install <package>       # System packages (MPLP guarded)
\`\`\`

### Pipeline & redirection
\`\`\`bash
cmd1 | cmd2 | cmd3              # Pipeline
command > output.txt 2>&1       # Redirect all output
command 2>/dev/null             # Suppress errors
\`\`\`

### Environment
\`\`\`bash
export KEY=value                # Set env variable
env                             # Show all env vars
printenv KEY                    # Get specific var
\`\`\`

## MPLP security levels

| Command type | MPLP action |
|---|---|
| Read-only (ls, cat, grep) | AUTO_APPROVE |
| File creation (touch, mkdir) | AUTO_APPROVE |
| File modification (sed, patch) | LOG_ONLY |
| Destructive (rm, kill) | CONFIRM_REQUIRED |
| System (apt, systemctl) | BLOCK |
| Network (curl, wget) | LOG_ONLY |

## Safety rules

- Never run \`rm -rf /\` or operate on system directories
- Always use \`timeout\` for potentially long-running commands
- Check exit codes: \`command && echo "success" || echo "failed"\`
- Pipe sensitive data carefully — avoid logging secrets
`,
  handlerPy: `"""
Shell executor skill handler — general-purpose command execution with MPLP integration.
"""
import subprocess
import shlex
from typing import Dict, Any

BLOCKED_PATTERNS = [
    "rm -rf /", "mkfs", "dd if=", ":(){ :|:& };:",
    "chmod -R 777 /", "shutdown", "reboot", "init 0",
]

async def handler(inputs: dict) -> dict:
    command = inputs.get("command", "")
    timeout_sec = inputs.get("timeout", 60)
    working_dir = inputs.get("cwd", "/workspace")
    
    if not command:
        return {"error": "command is required", "success": False}
    
    # Safety check
    for pattern in BLOCKED_PATTERNS:
        if pattern in command:
            return {"error": f"Blocked dangerous pattern: {pattern}", "success": False, "blocked": True}
    
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True,
            timeout=timeout_sec, cwd=working_dir,
        )
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout[:20000],
            "stderr": result.stderr[:5000],
        }
    except subprocess.TimeoutExpired:
        return {"error": f"Command timed out after {timeout_sec}s", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}
`,
  configYaml: `name: shell-executor
version: "1.0.0"
runtime: python3.11
timeout: 120
memory: 512
mplp_policy: "strict"
allowed-tools:
  - "Bash(*)"
`,
};

// ─────────────────────────────────────────────
// 4. memory-manager — 长期记忆管理
// ─────────────────────────────────────────────
const MEMORY_MANAGER: CoreSkillPrompt = {
  id: 'nc-memory-manager',
  name: '长期记忆管理',
  description: 'CLAUDE.md 读写、task_plan.md、progress.md 维护 — Agent 的持久化记忆系统',
  category: '核心自主',
  allowedTools: 'Bash(cat,echo,sed), Read, Write',
  difficulty: 'intermediate',
  skillMd: `---
name: memory-manager
description: Manage the agent's long-term memory files — CLAUDE.md for persistent context, task_plan.md for active tasks, progress.md for completed work. Ensures continuity across sessions.
allowed-tools: Bash(cat,echo,sed), Read, Write
---

# Long-Term Memory Manager

## Quick start

\`\`\`bash
cat CLAUDE.md                   # Read persistent memory
echo "## New Section" >> CLAUDE.md  # Append to memory
cat task_plan.md                # Check active tasks
\`\`\`

## Memory file hierarchy

| File | Purpose | Update frequency |
|---|---|---|
| \`CLAUDE.md\` | Persistent agent context, preferences, project knowledge | Every session |
| \`task_plan.md\` | Active task breakdown, priorities, deadlines | Every task change |
| \`progress.md\` | Completed work log, decisions, outcomes | After each milestone |
| \`.claude/memories/\` | Structured memory fragments | Automatically |

## Core workflow

1. [Session start]: Read \`CLAUDE.md\` to restore context
2. [Task planning]: Update \`task_plan.md\` with current objectives
3. [During work]: Record key decisions in \`progress.md\`
4. [Session end]: Update \`CLAUDE.md\` with new learnings

## CLAUDE.md structure

\`\`\`markdown
# Project: [Name]

## Key Facts
- [Immutable facts about the project]

## User Preferences
- [How the user likes things done]

## Architecture Decisions
- [Important technical choices and why]

## Current Context
- [What's being worked on right now]

## Lessons Learned
- [Past mistakes to avoid]
\`\`\`

## Commands

### Read memory
\`\`\`bash
cat CLAUDE.md                           # Full context
grep -n "## Current Context" CLAUDE.md  # Find section
tail -20 progress.md                    # Recent progress
\`\`\`

### Update memory
\`\`\`bash
# Append a new learning
echo "- Discovered: [insight]" >> CLAUDE.md

# Update a section using sed
sed -i '/## Current Context/,/## /{ /## Current Context/a\\- Working on feature X }' CLAUDE.md

# Record progress
echo "## \$(date +%Y-%m-%d) - Completed feature X" >> progress.md
\`\`\`

### Task management
\`\`\`bash
# Create task plan
cat > task_plan.md << 'EOF'
# Task Plan

## Priority 1
- [ ] Implement auth flow
- [ ] Add error handling

## Priority 2  
- [ ] Write tests
- [ ] Update docs
EOF

# Mark task complete
sed -i 's/- \\[ \\] Implement auth flow/- [x] Implement auth flow/' task_plan.md
\`\`\`

## Best practices

- Keep \`CLAUDE.md\` under 2000 tokens for efficient loading
- Archive old entries from \`progress.md\` monthly
- Use structured headings for easy grep/sed operations
- Never delete \`CLAUDE.md\` — only append or update sections
`,
  handlerPy: `"""
Memory manager skill handler — manages persistent agent memory files.
"""
import os
import datetime
from typing import Dict, Any

MEMORY_FILES = {
    "context": "CLAUDE.md",
    "tasks": "task_plan.md",
    "progress": "progress.md",
}

async def handler(inputs: dict) -> dict:
    action = inputs.get("action", "read")
    memory_type = inputs.get("memory_type", "context")
    content = inputs.get("content", "")
    section = inputs.get("section", "")
    
    file_path = MEMORY_FILES.get(memory_type, "CLAUDE.md")
    
    if action == "read":
        if not os.path.exists(file_path):
            return {"content": "", "exists": False, "success": True}
        with open(file_path, "r") as f:
            return {"content": f.read(), "exists": True, "success": True}
    
    elif action == "append":
        with open(file_path, "a") as f:
            timestamp = datetime.datetime.now().isoformat()
            f.write(f"\\n<!-- {timestamp} -->\\n{content}\\n")
        return {"success": True, "action": "appended"}
    
    elif action == "update_section":
        if not section or not content:
            return {"error": "section and content required", "success": False}
        # Read, find section, replace
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                lines = f.readlines()
        else:
            lines = []
        # Simple section replacement
        with open(file_path, "w") as f:
            in_section = False
            replaced = False
            for line in lines:
                if line.strip().startswith(f"## {section}"):
                    in_section = True
                    f.write(line)
                    f.write(content + "\\n")
                    replaced = True
                    continue
                if in_section and line.strip().startswith("## "):
                    in_section = False
                if not in_section:
                    f.write(line)
            if not replaced:
                f.write(f"\\n## {section}\\n{content}\\n")
        return {"success": True, "action": "section_updated"}
    
    return {"error": f"Unknown action: {action}", "success": False}
`,
  configYaml: `name: memory-manager
version: "1.0.0"
runtime: python3.11
timeout: 15
memory: 128
allowed-tools:
  - "Bash(cat,echo,sed)"
  - "Read"
  - "Write"
`,
};

// ─────────────────────────────────────────────
// 5. task-planner — 任务规划引擎
// ─────────────────────────────────────────────
const TASK_PLANNER: CoreSkillPrompt = {
  id: 'nc-task-planner',
  name: '任务规划引擎',
  description: '任务分解、进度追踪、自唤醒调度 — Agent 的自主规划系统',
  category: '核心自主',
  allowedTools: 'Read, Write, Bash(date)',
  difficulty: 'intermediate',
  skillMd: `---
name: task-planner
description: Decompose complex goals into actionable tasks, track progress, manage priorities, and schedule self-wake for deferred work. The agent's planning backbone.
allowed-tools: Read, Write, Bash(date)
---

# Task Planning Engine

## Quick start

\`\`\`
1. Receive goal from user
2. Decompose into subtasks (max 3 levels deep)
3. Estimate effort and set priorities
4. Execute tasks in order, updating progress
5. Report completion and outcomes
\`\`\`

## Core workflow

### 1. Goal decomposition

Break complex goals into a tree of tasks:

\`\`\`
Goal: "Build a REST API for user management"
├── Task 1: Design data model (30min, P1)
│   ├── 1.1: Define user schema
│   ├── 1.2: Define relationships
│   └── 1.3: Create migration
├── Task 2: Implement endpoints (2h, P1)
│   ├── 2.1: CRUD operations
│   ├── 2.2: Authentication middleware
│   └── 2.3: Input validation
└── Task 3: Testing (1h, P2)
    ├── 3.1: Unit tests
    └── 3.2: Integration tests
\`\`\`

### 2. Priority framework

| Priority | Label | Criteria |
|---|---|---|
| P0 | Critical | Blocking other tasks, time-sensitive |
| P1 | High | Core functionality, user-facing |
| P2 | Medium | Quality improvements, nice-to-have |
| P3 | Low | Future optimization, documentation |

### 3. Progress tracking

Update \`task_plan.md\` after each task:

\`\`\`markdown
## Task 1: Design data model ✅
- Started: 2024-01-15 10:00
- Completed: 2024-01-15 10:25
- Outcome: Schema created with 3 tables
- Blockers: None

## Task 2: Implement endpoints 🔄
- Started: 2024-01-15 10:30
- Status: In progress (2/3 subtasks done)
- Current: Working on input validation
\`\`\`

### 4. Self-wake scheduling

For deferred or long-running tasks:

\`\`\`
SCHEDULE: Check build status in 5 minutes
SCHEDULE: Retry failed API call at 14:00
SCHEDULE: Review PR after tests complete
\`\`\`

## Decision heuristics

- If task > 2h estimated → decompose further
- If blocked → skip, log blocker, move to next
- If failing repeatedly → escalate to user
- If ahead of schedule → pull in P2 tasks
`,
  handlerPy: `"""
Task planner skill handler — goal decomposition and progress tracking.
"""
import json
import datetime
from typing import Dict, Any, List

async def handler(inputs: dict) -> dict:
    action = inputs.get("action", "decompose")
    goal = inputs.get("goal", "")
    tasks = inputs.get("tasks", [])
    task_id = inputs.get("task_id", "")
    status = inputs.get("status", "")
    
    if action == "decompose":
        if not goal:
            return {"error": "goal is required", "success": False}
        # Return structured task plan (AI would fill this)
        return {
            "success": True,
            "plan": {
                "goal": goal,
                "estimated_total": "unknown",
                "tasks": [],
                "note": "Task decomposition requires AI reasoning — use with LLM"
            }
        }
    
    elif action == "update_status":
        if not task_id or not status:
            return {"error": "task_id and status required", "success": False}
        return {
            "success": True,
            "task_id": task_id,
            "new_status": status,
            "updated_at": datetime.datetime.now().isoformat()
        }
    
    elif action == "schedule_wake":
        delay_minutes = inputs.get("delay_minutes", 5)
        reason = inputs.get("reason", "")
        wake_at = datetime.datetime.now() + datetime.timedelta(minutes=delay_minutes)
        return {
            "success": True,
            "wake_at": wake_at.isoformat(),
            "reason": reason
        }
    
    return {"error": f"Unknown action: {action}", "success": False}
`,
  configYaml: `name: task-planner
version: "1.0.0"
runtime: python3.11
timeout: 15
memory: 128
allowed-tools:
  - "Read"
  - "Write"
  - "Bash(date)"
`,
};

// ─────────────────────────────────────────────
// 6. code-reviewer — 代码审查与重构
// ─────────────────────────────────────────────
const CODE_REVIEWER: CoreSkillPrompt = {
  id: 'nc-code-reviewer',
  name: '代码审查与重构',
  description: '代码质量分析、重构建议、PR 审查 — 自动化代码审查能力',
  category: '核心自主',
  allowedTools: 'Read, Bash(grep,diff,wc)',
  difficulty: 'advanced',
  skillMd: `---
name: code-reviewer
description: Analyze code quality, suggest refactoring, review pull requests, detect anti-patterns, and enforce coding standards. Read-only analysis — never modifies code directly.
allowed-tools: Read, Bash(grep,diff,wc)
---

# Code Review & Refactoring Engine

## Quick start

\`\`\`bash
# Analyze a file
wc -l src/main.ts               # Check size
grep -n "TODO\\|FIXME\\|HACK" src/ -r  # Find tech debt
diff file_a.ts file_b.ts        # Compare versions
\`\`\`

## Core workflow

1. [Scan]: Identify files to review (\`find\`, \`wc\`)
2. [Read]: Understand code structure (\`cat\`, \`head\`)
3. [Analyze]: Check for patterns and anti-patterns (\`grep\`)
4. [Compare]: Diff against previous versions (\`diff\`)
5. [Report]: Generate structured review with actionable items

## Review checklist

### Code quality
- [ ] Functions < 50 lines
- [ ] No deeply nested conditionals (max 3 levels)
- [ ] Proper error handling (try/catch, Result types)
- [ ] No hardcoded secrets or magic numbers
- [ ] Consistent naming conventions

### Security
- [ ] No SQL injection vulnerabilities
- [ ] Input validation present
- [ ] Authentication checks in place
- [ ] No sensitive data in logs
- [ ] CORS properly configured

### Performance
- [ ] No N+1 queries
- [ ] Proper use of indexes
- [ ] Pagination for list endpoints
- [ ] Caching where appropriate
- [ ] No synchronous blocking in async code

## Analysis commands

\`\`\`bash
# Complexity analysis
find . -name "*.ts" -exec wc -l {} + | sort -n    # Files by size
grep -rn "if.*if.*if" --include="*.ts" .            # Deep nesting
grep -c "catch" --include="*.ts" -r .               # Error handling coverage

# Tech debt scan
grep -rn "TODO\\|FIXME\\|HACK\\|XXX" --include="*.ts" .
grep -rn "any" --include="*.ts" . | wc -l           # TypeScript 'any' usage

# Duplication detection
grep -rn "function\\|const.*=.*=>" --include="*.ts" . | sort | uniq -d
\`\`\`

## Output format

\`\`\`markdown
## Code Review Report

### Summary
- Files reviewed: 12
- Issues found: 5 (2 critical, 3 minor)

### Critical Issues
1. [SECURITY] SQL injection in \`src/db.ts:42\`
2. [ERROR] Unhandled promise rejection in \`src/api.ts:88\`

### Suggestions
1. Extract duplicated logic in handlers to shared utility
2. Add input validation for user-facing endpoints
\`\`\`
`,
  handlerPy: `"""
Code reviewer skill handler — static analysis and review generation.
"""
import subprocess
import os
from typing import Dict, Any, List

async def handler(inputs: dict) -> dict:
    action = inputs.get("action", "scan")
    target = inputs.get("target", ".")
    file_types = inputs.get("file_types", "*.ts,*.tsx,*.py")
    
    if action == "scan":
        results = {}
        
        # Line counts
        for ft in file_types.split(","):
            cmd = f'find {target} -name "{ft.strip()}" -exec wc -l {{}} + 2>/dev/null | tail -1'
            r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
            results[ft.strip()] = r.stdout.strip()
        
        # Tech debt
        cmd = f'grep -rn "TODO\\|FIXME\\|HACK\\|XXX" {target} --include="*.ts" --include="*.tsx" 2>/dev/null | head -50'
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
        results["tech_debt"] = r.stdout.strip().split("\\n") if r.stdout.strip() else []
        
        return {"success": True, "analysis": results}
    
    elif action == "diff":
        file_a = inputs.get("file_a", "")
        file_b = inputs.get("file_b", "")
        if not file_a or not file_b:
            return {"error": "file_a and file_b required", "success": False}
        r = subprocess.run(f"diff {file_a} {file_b}", shell=True, capture_output=True, text=True, timeout=10)
        return {"success": True, "diff": r.stdout, "has_changes": r.returncode != 0}
    
    return {"error": f"Unknown action: {action}", "success": False}
`,
  configYaml: `name: code-reviewer
version: "1.0.0"
runtime: python3.11
timeout: 30
memory: 256
allowed-tools:
  - "Read"
  - "Bash(grep,diff,wc)"
`,
};

// ─────────────────────────────────────────────
// 7. api-connector — HTTP/API 连接器
// ─────────────────────────────────────────────
const API_CONNECTOR: CoreSkillPrompt = {
  id: 'nc-api-connector',
  name: 'HTTP/API 连接器',
  description: 'RESTful API 调用、响应解析、链式请求 — 与外部服务集成',
  category: '核心自主',
  allowedTools: 'Bash(curl,jq)',
  difficulty: 'intermediate',
  skillMd: `---
name: api-connector
description: Make HTTP requests to external APIs — REST calls, GraphQL queries, webhook triggers. Parse JSON responses with jq. Chain multiple API calls for complex workflows.
allowed-tools: Bash(curl,jq)
---

# HTTP/API Connector

## Quick start

\`\`\`bash
curl -s https://api.example.com/data | jq '.'
curl -X POST https://api.example.com/items -H "Content-Type: application/json" -d '{"name":"test"}'
\`\`\`

## Core workflow

1. [Prepare]: Set headers, auth tokens, request body
2. [Execute]: Make HTTP request with curl
3. [Parse]: Extract data with jq
4. [Chain]: Feed output into subsequent requests
5. [Handle errors]: Check HTTP status codes

## Commands

### GET requests
\`\`\`bash
curl -s "https://api.example.com/users"                          # Simple GET
curl -s -H "Authorization: Bearer \$TOKEN" "https://api.com/me"  # With auth
curl -s "https://api.com/items?page=1&limit=10"                  # With params
\`\`\`

### POST/PUT/DELETE
\`\`\`bash
# POST JSON
curl -s -X POST "https://api.com/items" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "test", "value": 42}'

# PUT update
curl -s -X PUT "https://api.com/items/123" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "updated"}'

# DELETE
curl -s -X DELETE "https://api.com/items/123"
\`\`\`

### Response parsing with jq
\`\`\`bash
curl -s api.com/users | jq '.[0].name'              # First user's name
curl -s api.com/users | jq '.[] | {name, email}'    # Extract fields
curl -s api.com/users | jq 'length'                  # Count results
curl -s api.com/data | jq '.items | map(select(.active))'  # Filter
\`\`\`

### Error handling
\`\`\`bash
# Check status code
STATUS=\$(curl -s -o /dev/null -w "%{http_code}" "https://api.com/endpoint")
if [ "\$STATUS" -ne 200 ]; then
  echo "Error: HTTP \$STATUS"
fi

# Full response with headers
curl -s -D - "https://api.com/endpoint" | head -20
\`\`\`

### Chain requests
\`\`\`bash
# Get user ID, then fetch their orders
USER_ID=\$(curl -s api.com/me | jq -r '.id')
curl -s "api.com/users/\$USER_ID/orders" | jq '.'
\`\`\`

## Security notes

- Never log full auth tokens — use \`\$TOKEN\` env vars
- Validate URLs before making requests
- Set timeouts: \`curl --max-time 30\`
- Rate limit awareness: respect Retry-After headers
`,
  handlerPy: `"""
API connector skill handler — HTTP request execution with response parsing.
"""
import subprocess
import json
from typing import Dict, Any

async def handler(inputs: dict) -> dict:
    method = inputs.get("method", "GET").upper()
    url = inputs.get("url", "")
    headers = inputs.get("headers", {})
    body = inputs.get("body", None)
    jq_filter = inputs.get("jq_filter", ".")
    timeout = inputs.get("timeout", 30)
    
    if not url:
        return {"error": "url is required", "success": False}
    
    # Build curl command
    cmd = ["curl", "-s", "--max-time", str(timeout), "-X", method]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    if body and method in ("POST", "PUT", "PATCH"):
        cmd.extend(["-H", "Content-Type: application/json", "-d", json.dumps(body)])
    cmd.append(url)
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 5)
        response_text = result.stdout
        
        # Apply jq filter
        if jq_filter != ".":
            jq_result = subprocess.run(
                ["jq", jq_filter], input=response_text,
                capture_output=True, text=True, timeout=10
            )
            parsed = jq_result.stdout.strip()
        else:
            parsed = response_text
        
        return {"success": True, "response": parsed, "raw": response_text[:5000]}
    except Exception as e:
        return {"error": str(e), "success": False}
`,
  configYaml: `name: api-connector
version: "1.0.0"
runtime: python3.11
timeout: 60
memory: 256
allowed-tools:
  - "Bash(curl,jq)"
`,
};

// ─────────────────────────────────────────────
// 8. self-healer — 自我修复引擎
// ─────────────────────────────────────────────
const SELF_HEALER: CoreSkillPrompt = {
  id: 'nc-self-healer',
  name: '自我修复引擎',
  description: '错误检测、日志分析、自动修复、回滚 — Agent 的自我恢复系统',
  category: '核心自主',
  allowedTools: 'Bash(*), Read, Write',
  difficulty: 'advanced',
  skillMd: `---
name: self-healer
description: Detect errors, analyze logs, attempt automatic fixes, and rollback on failure. The agent's immune system — monitors health and self-repairs when things break.
allowed-tools: Bash(*), Read, Write
---

# Self-Healing Engine

## Quick start

\`\`\`bash
# Check system health
echo $?                         # Last command exit code
tail -50 /var/log/app.log       # Recent logs
ps aux | grep node              # Check process status
\`\`\`

## Core workflow

1. [Detect]: Monitor exit codes, log patterns, process status
2. [Diagnose]: Analyze error messages, stack traces, system state
3. [Plan fix]: Choose repair strategy based on error type
4. [Execute fix]: Apply the repair with rollback capability
5. [Verify]: Confirm the fix resolved the issue
6. [Record]: Log the incident and resolution for future reference

## Error detection patterns

| Signal | Detection method | Severity |
|---|---|---|
| Non-zero exit code | \`$?\` check | High |
| Error in logs | \`grep -i "error\\|fatal\\|panic"\` | High |
| Process crash | \`ps aux\` monitoring | Critical |
| High memory usage | \`free -m\` check | Medium |
| Disk space low | \`df -h\` check | Medium |
| Build failure | Exit code + stderr | High |

## Repair strategies

### 1. Retry (transient errors)
\`\`\`bash
for i in 1 2 3; do
  command && break
  echo "Attempt \$i failed, retrying in \${i}s..."
  sleep \$i
done
\`\`\`

### 2. Dependency fix
\`\`\`bash
# Missing module
pip install <missing_package>
npm install

# Corrupted cache
rm -rf node_modules && npm install
pip cache purge && pip install -r requirements.txt
\`\`\`

### 3. Configuration repair
\`\`\`bash
# Restore from backup
cp .nanoclaw/backup/config.yaml config.yaml

# Fix permissions
chmod 644 config.yaml
chmod 755 scripts/*.sh
\`\`\`

### 4. Rollback
\`\`\`bash
# Git-based rollback
git stash
git checkout -- <file>

# NanoClaw backup restore
# (handled by skills infrastructure)
\`\`\`

## Health check script

\`\`\`bash
#!/bin/bash
# Comprehensive health check

# 1. Process health
if ! pgrep -f "node" > /dev/null; then
  echo "ALERT: Node process not running"
fi

# 2. Disk space
DISK_USAGE=\$(df -h / | tail -1 | awk '{print \$5}' | tr -d '%')
if [ "\$DISK_USAGE" -gt 90 ]; then
  echo "ALERT: Disk usage at \${DISK_USAGE}%"
fi

# 3. Memory
FREE_MB=\$(free -m | grep Mem | awk '{print \$4}')
if [ "\$FREE_MB" -lt 100 ]; then
  echo "ALERT: Low memory (\${FREE_MB}MB free)"
fi

# 4. Recent errors
ERROR_COUNT=\$(tail -100 /var/log/app.log 2>/dev/null | grep -ci "error")
if [ "\$ERROR_COUNT" -gt 5 ]; then
  echo "ALERT: \${ERROR_COUNT} errors in recent logs"
fi

echo "Health check complete"
\`\`\`

## Post-incident report format

\`\`\`markdown
## Incident Report

[Time]: [timestamp]
[Severity]: [critical/high/medium/low]
[Error]: [error message]
[Root cause]: [what went wrong]
[Fix applied]: [what was done]
[Verified]: [yes/no]
[Prevention]: [how to avoid in future]
\`\`\`
`,
  handlerPy: `"""
Self-healer skill handler — error detection, diagnosis, and automatic repair.
"""
import subprocess
import os
import datetime
from typing import Dict, Any, List

async def handler(inputs: dict) -> dict:
    action = inputs.get("action", "health_check")
    
    if action == "health_check":
        checks = {}
        
        # Process check
        r = subprocess.run("ps aux | head -5", shell=True, capture_output=True, text=True, timeout=5)
        checks["processes"] = r.stdout.strip()
        
        # Disk usage
        r = subprocess.run("df -h / | tail -1", shell=True, capture_output=True, text=True, timeout=5)
        checks["disk"] = r.stdout.strip()
        
        # Memory
        r = subprocess.run("free -m 2>/dev/null || echo 'N/A'", shell=True, capture_output=True, text=True, timeout=5)
        checks["memory"] = r.stdout.strip()
        
        return {"success": True, "health": checks}
    
    elif action == "analyze_error":
        error_message = inputs.get("error", "")
        log_file = inputs.get("log_file", "")
        
        diagnosis = {"error": error_message, "suggestions": []}
        
        if "ModuleNotFoundError" in error_message or "Cannot find module" in error_message:
            diagnosis["suggestions"].append("Run: pip install <module> or npm install")
            diagnosis["auto_fix"] = "dependency_install"
        elif "ENOSPC" in error_message:
            diagnosis["suggestions"].append("Clean temp files and caches")
            diagnosis["auto_fix"] = "disk_cleanup"
        elif "ECONNREFUSED" in error_message:
            diagnosis["suggestions"].append("Check if the service is running")
            diagnosis["auto_fix"] = "retry"
        
        return {"success": True, "diagnosis": diagnosis}
    
    elif action == "retry":
        command = inputs.get("command", "")
        max_retries = inputs.get("max_retries", 3)
        
        if not command:
            return {"error": "command required", "success": False}
        
        for i in range(max_retries):
            r = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
            if r.returncode == 0:
                return {"success": True, "attempt": i + 1, "stdout": r.stdout[:5000]}
        
        return {"success": False, "error": f"Failed after {max_retries} retries", "last_stderr": r.stderr[:2000]}
    
    return {"error": f"Unknown action: {action}", "success": False}
`,
  configYaml: `name: self-healer
version: "1.0.0"
runtime: python3.11
timeout: 120
memory: 512
mplp_policy: "strict"
allowed-tools:
  - "Bash(*)"
  - "Read"
  - "Write"
`,
};

// ─────────────────────────────────────────────
// 9. skill-lifecycle — 技能生命周期管理
// ─────────────────────────────────────────────
const SKILL_LIFECYCLE: CoreSkillPrompt = {
  id: 'nc-skill-lifecycle',
  name: '技能生命周期管理',
  description: '技能安装/卸载/更新/回滚 — 基于 NanoClaw apply/uninstall/update 逻辑',
  category: '高级自主',
  allowedTools: 'Bash(*), Read, Write',
  difficulty: 'advanced',
  skillMd: `---
name: skill-lifecycle
description: Manage the full lifecycle of NanoClaw skills — install, uninstall, update, rebase, and replay. Handles three-way merges, backup/restore, and state synchronization.
allowed-tools: Bash(*), Read, Write
---

# Skill Lifecycle Manager

## Quick start

\`\`\`bash
# Install a skill
cd .nanoclaw && cat state.yaml
nanoclaw apply <skill-name>

# Update a skill
nanoclaw update <skill-name>

# Uninstall a skill
nanoclaw uninstall <skill-name>

# Rebase after core update
nanoclaw rebase
\`\`\`

## Core workflow

1. [Pre-flight]: Read \`.nanoclaw/state.yaml\` to check current state
2. [Backup]: Snapshot affected files to \`.nanoclaw/backup/\`
3. [Apply]: Three-way merge (base → skill patch → current files)
4. [Verify]: Run \`post_apply\` hooks and tests
5. [Commit]: Update \`state.yaml\` with new skill entry and file hashes

## Operations

### Install (apply)
\`\`\`bash
# Check manifest
cat skills/<name>/manifest.yaml

# Run apply
nanoclaw apply <skill-name> --dry-run   # Preview changes
nanoclaw apply <skill-name>             # Apply skill

# Verify
cat .nanoclaw/state.yaml | grep <skill-name>
\`\`\`

### Update
\`\`\`bash
# Preview update
nanoclaw update <skill-name> --preview

# Apply update (three-way merge: old-base → new-base → current)
nanoclaw update <skill-name>

# Resolve conflicts if any
grep -r "<<<<<<" .   # Find merge conflicts
\`\`\`

### Uninstall
\`\`\`bash
# Preview removal
nanoclaw uninstall <skill-name> --dry-run

# Remove skill (restores base files from backup)
nanoclaw uninstall <skill-name>
\`\`\`

### Rebase
\`\`\`bash
# After core version update, replay all skills
nanoclaw rebase --preview
nanoclaw rebase
\`\`\`

### Replay
\`\`\`bash
# Re-apply all skills from clean state
nanoclaw replay --from-scratch
\`\`\`

## State management

The \`state.yaml\` file tracks:
- \`skills_system_version\`: Current infrastructure version
- \`core_version\`: Base project version
- \`applied_skills[]\`: Each skill with name, version, applied_at, file_hashes
- \`custom_modifications[]\`: Manual patches tracked separately

## Conflict resolution

When three-way merge produces conflicts:
1. Check conflict markers: \`grep -rn "<<<<<<" .\`
2. Review both versions between markers
3. Choose the correct resolution
4. Remove conflict markers
5. Run \`nanoclaw verify\` to confirm

## Safety

- Always \`--dry-run\` before destructive operations
- Backups are automatic but verify: \`ls .nanoclaw/backup/\`
- Lock file prevents concurrent modifications
- State file is the single source of truth
`,
  handlerPy: `"""
Skill lifecycle manager — install, uninstall, update, rebase, replay.
"""
import subprocess
import json
import yaml
from typing import Dict, Any

STATE_FILE = ".nanoclaw/state.yaml"
BACKUP_DIR = ".nanoclaw/backup"

async def handler(inputs: dict) -> dict:
    action = inputs.get("action", "status")
    skill_name = inputs.get("skill_name", "")
    dry_run = inputs.get("dry_run", False)

    if action == "status":
        try:
            with open(STATE_FILE) as f:
                state = yaml.safe_load(f)
            return {"success": True, "state": state}
        except FileNotFoundError:
            return {"success": True, "state": {"applied_skills": []}}

    if not skill_name:
        return {"error": "skill_name is required", "success": False}

    cmd = f"nanoclaw {action} {skill_name}"
    if dry_run:
        cmd += " --dry-run"

    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout[:10000],
            "stderr": result.stderr[:5000],
            "action": action,
            "skill": skill_name,
        }
    except Exception as e:
        return {"error": str(e), "success": False}
`,
  configYaml: `name: skill-lifecycle
version: "1.0.0"
runtime: python3.11
timeout: 120
memory: 512
mplp_policy: "strict"
allowed-tools:
  - "Bash(*)"
  - "Read"
  - "Write"
`,
};

// ─────────────────────────────────────────────
// 10. git-operator — Git 版本控制
// ─────────────────────────────────────────────
const GIT_OPERATOR: CoreSkillPrompt = {
  id: 'nc-git-operator',
  name: 'Git 版本控制',
  description: '代码提交、分支管理、PR 创建、冲突解决 — 完整的 Git 工作流',
  category: '高级自主',
  allowedTools: 'Bash(git,diff,patch)',
  difficulty: 'intermediate',
  skillMd: `---
name: git-operator
description: Full Git version control — commits, branches, merges, PRs, conflict resolution, and history analysis.
allowed-tools: Bash(git,diff,patch)
---

# Git Version Control Operator

## Quick start

\`\`\`bash
git status                        # Check working tree
git add -A && git commit -m "msg" # Stage and commit
git checkout -b feature/name      # Create branch
git push origin feature/name      # Push to remote
\`\`\`

## Core workflow

1. [Status]: \`git status\` + \`git diff\` to understand changes
2. [Stage]: \`git add\` specific files or \`-A\` for all
3. [Commit]: Write clear conventional commit messages
4. [Push]: \`git push\` to remote
5. [PR]: Create pull request if needed

## Commands

### Status & diff
\`\`\`bash
git status                        # Working tree status
git diff                          # Unstaged changes
git diff --staged                 # Staged changes
git log --oneline -20             # Recent commits
git log --graph --oneline --all   # Branch graph
\`\`\`

### Branching
\`\`\`bash
git branch -a                     # List all branches
git checkout -b feature/name      # Create and switch
git switch main                   # Switch to main
git branch -d feature/name        # Delete merged branch
git merge feature/name            # Merge branch
\`\`\`

### Commits
\`\`\`bash
git add -A                        # Stage all
git add <file>                    # Stage specific file
git commit -m "type: description" # Commit with message
git commit --amend                # Amend last commit
git reset HEAD~1                  # Undo last commit (keep changes)
\`\`\`

### Remote operations
\`\`\`bash
git push origin <branch>          # Push branch
git pull origin main              # Pull latest
git fetch --all                   # Fetch all remotes
git remote -v                     # List remotes
\`\`\`

### Conflict resolution
\`\`\`bash
git merge <branch>                # Start merge
grep -rn "<<<<<<" .               # Find conflicts
# Edit files to resolve
git add <resolved-files>
git merge --continue
\`\`\`

### Stash
\`\`\`bash
git stash                         # Stash changes
git stash list                    # List stashes
git stash pop                     # Apply and remove stash
\`\`\`

## Commit message convention

\`type(scope): description\`

Types: feat, fix, docs, style, refactor, test, chore, perf

## Safety

- Never force-push to main/master
- Always pull before push
- Use \`--dry-run\` for destructive operations
- Keep commits atomic and well-described
`,
  handlerPy: `"""
Git operator skill handler.
"""
import subprocess
from typing import Dict, Any

BLOCKED_COMMANDS = [
    "git push --force origin main",
    "git push --force origin master",
    "git push -f origin main",
    "git push -f origin master",
]

async def handler(inputs: dict) -> dict:
    command = inputs.get("command", "")
    if not command:
        return {"error": "command is required", "success": False}
    
    full_cmd = f"git {command}" if not command.startswith("git ") else command
    
    for blocked in BLOCKED_COMMANDS:
        if blocked in full_cmd:
            return {"error": f"Blocked: {blocked}", "success": False, "blocked": True}
    
    try:
        result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=60)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout[:10000],
            "stderr": result.stderr[:5000],
        }
    except Exception as e:
        return {"error": str(e), "success": False}
`,
  configYaml: `name: git-operator
version: "1.0.0"
runtime: python3.11
timeout: 60
memory: 256
allowed-tools:
  - "Bash(git,diff,patch)"
`,
};

// ─────────────────────────────────────────────
// 11. env-configurator — 环境配置管理
// ─────────────────────────────────────────────
const ENV_CONFIGURATOR: CoreSkillPrompt = {
  id: 'nc-env-configurator',
  name: '环境配置管理',
  description: '.env 管理、npm 依赖、Docker Compose 服务配置 — 对应 structured.ts',
  category: '高级自主',
  allowedTools: 'Bash(cat,echo,sed,grep), Read, Write',
  difficulty: 'intermediate',
  skillMd: `---
name: env-configurator
description: Manage environment configuration — .env files, npm dependencies, Docker Compose services, and structured configuration updates.
allowed-tools: Bash(cat,echo,sed,grep), Read, Write
---

# Environment Configuration Manager

## Quick start

\`\`\`bash
cat .env                          # Read current env
echo "NEW_KEY=value" >> .env      # Add env variable
grep -v "^OLD_KEY" .env > .env.tmp && mv .env.tmp .env  # Remove key
npm install <package>             # Add npm dependency
\`\`\`

## Core workflow

1. [Inspect]: Read current \`.env\`, \`package.json\`, \`docker-compose.yml\`
2. [Plan]: Determine what needs to change
3. [Backup]: Copy original files
4. [Apply]: Make structured changes
5. [Verify]: Validate configuration is correct

## .env Management

### Read & search
\`\`\`bash
cat .env                          # Full env file
grep "DATABASE" .env              # Search for keys
grep -c "=" .env                  # Count variables
\`\`\`

### Add & update
\`\`\`bash
echo "NEW_KEY=value" >> .env                  # Append new key
sed -i 's/^OLD_KEY=.*/OLD_KEY=new_value/' .env  # Update existing
sed -i '/^#.*FEATURE/s/^#//' .env             # Uncomment key
\`\`\`

### Remove
\`\`\`bash
grep -v "^REMOVE_KEY" .env > .env.tmp && mv .env.tmp .env
\`\`\`

## npm Dependencies

\`\`\`bash
cat package.json | grep -A 50 '"dependencies"'  # View deps
npm install <package>@<version>                  # Add dependency
npm uninstall <package>                          # Remove dependency
npm outdated                                     # Check for updates
\`\`\`

## Docker Compose

\`\`\`bash
cat docker-compose.yml             # View services
# Add new service via structured YAML editing
\`\`\`

## Safety

- Never expose secrets in logs or output
- Always backup \`.env\` before modifications
- Validate key=value format after changes
- Use \`grep\` to verify changes applied correctly
`,
  handlerPy: `"""
Environment configurator skill handler.
"""
import os
import subprocess
from typing import Dict, Any

async def handler(inputs: dict) -> dict:
    action = inputs.get("action", "read")
    env_file = inputs.get("env_file", ".env")
    
    if action == "read":
        try:
            with open(env_file) as f:
                lines = f.readlines()
            keys = [l.split("=")[0] for l in lines if "=" in l and not l.startswith("#")]
            return {"success": True, "keys": keys, "count": len(keys)}
        except FileNotFoundError:
            return {"success": False, "error": f"{env_file} not found"}
    
    elif action == "set":
        key = inputs.get("key", "")
        value = inputs.get("value", "")
        if not key:
            return {"error": "key is required", "success": False}
        
        # Update or append
        cmd = f'grep -q "^{key}=" {env_file} && sed -i "s/^{key}=.*/{key}={value}/" {env_file} || echo "{key}={value}" >> {env_file}'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return {"success": result.returncode == 0}
    
    elif action == "remove":
        key = inputs.get("key", "")
        if not key:
            return {"error": "key is required", "success": False}
        cmd = f'grep -v "^{key}=" {env_file} > {env_file}.tmp && mv {env_file}.tmp {env_file}'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return {"success": result.returncode == 0}
    
    return {"error": f"Unknown action: {action}", "success": False}
`,
  configYaml: `name: env-configurator
version: "1.0.0"
runtime: python3.11
timeout: 30
memory: 256
allowed-tools:
  - "Bash(cat,echo,sed,grep)"
  - "Read"
  - "Write"
`,
};

// ─────────────────────────────────────────────
// 12. data-pipeline — 数据管道处理
// ─────────────────────────────────────────────
const DATA_PIPELINE: CoreSkillPrompt = {
  id: 'nc-data-pipeline',
  name: '数据管道处理',
  description: 'CSV/JSON/日志数据的 ETL 处理、统计分析 — Unix 管道式数据流',
  category: '高级自主',
  allowedTools: 'Bash(cat,sort,uniq,awk,sed,cut,paste,tr,jq), Read',
  difficulty: 'advanced',
  skillMd: `---
name: data-pipeline
description: Process and transform data using Unix pipeline tools — CSV, JSON, and log file ETL, statistical analysis, and data extraction.
allowed-tools: Bash(cat,sort,uniq,awk,sed,cut,paste,tr,jq), Read
---

# Data Pipeline Processor

## Quick start

\`\`\`bash
cat data.csv | head -5                    # Preview data
cat data.json | jq '.items[] | .name'     # Extract JSON fields
cat server.log | grep ERROR | wc -l       # Count errors
\`\`\`

## Core workflow

1. [Inspect]: \`head\`, \`wc\`, \`file\` to understand data shape
2. [Extract]: \`cut\`, \`awk\`, \`jq\` to select fields
3. [Transform]: \`sed\`, \`tr\`, \`awk\` to clean and reshape
4. [Load]: Redirect output to target file or pipe to next stage
5. [Validate]: Compare row counts, spot-check values

## CSV Operations

\`\`\`bash
# Preview
head -5 data.csv
wc -l data.csv                            # Row count

# Extract columns
cut -d',' -f1,3 data.csv                  # Columns 1 and 3
awk -F',' '{print $1, $3}' data.csv       # Same with awk

# Filter rows
awk -F',' '$3 > 100' data.csv             # Where col3 > 100
grep "pattern" data.csv                   # Rows matching pattern

# Sort & deduplicate
sort -t',' -k2 -n data.csv               # Sort by col2 numeric
sort -t',' -k1 -u data.csv               # Unique by col1

# Aggregate
awk -F',' '{sum += $3} END {print sum}' data.csv        # Sum col3
awk -F',' '{sum += $3; n++} END {print sum/n}' data.csv # Average
\`\`\`

## JSON Operations

\`\`\`bash
# Pretty print
cat data.json | jq '.'

# Extract fields
cat data.json | jq '.items[] | {name, price}'

# Filter
cat data.json | jq '.items[] | select(.price > 50)'

# Transform
cat data.json | jq '[.items[] | {id: .id, total: (.price * .qty)}]'

# Aggregate
cat data.json | jq '[.items[].price] | add'
cat data.json | jq '.items | length'
\`\`\`

## Log Analysis

\`\`\`bash
# Error frequency
grep ERROR app.log | awk '{print $1}' | sort | uniq -c | sort -rn

# Response time percentiles
awk '/response_time/ {print $NF}' app.log | sort -n | awk '
  {a[NR]=$1} END {
    print "p50:", a[int(NR*0.5)];
    print "p95:", a[int(NR*0.95)];
    print "p99:", a[int(NR*0.99)];
  }'

# Top IPs
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10
\`\`\`

## Multi-stage Pipelines

\`\`\`bash
# CSV → filtered → sorted → top 10
cat sales.csv | awk -F',' '$4 == "2024"' | sort -t',' -k3 -rn | head -10

# JSON → CSV conversion
cat data.json | jq -r '.items[] | [.name, .price] | @csv' > output.csv

# Log → error summary → JSON report
grep ERROR app.log | awk '{print $3}' | sort | uniq -c | sort -rn | \\
  awk '{printf "{\\"error\\": \\"%s\\", \\"count\\": %d}\\n", $2, $1}'
\`\`\`

## Safety

- Always preview with \`head\` before processing large files
- Use \`wc -l\` to verify row counts after transforms
- Redirect to new file, don't overwrite source: \`> output.csv\` not \`> input.csv\`
`,
  handlerPy: `"""
Data pipeline skill handler — Unix-style ETL processing.
"""
import subprocess
from typing import Dict, Any

async def handler(inputs: dict) -> dict:
    pipeline = inputs.get("pipeline", "")
    input_file = inputs.get("input_file", "")
    
    if not pipeline:
        return {"error": "pipeline command is required", "success": False}
    
    try:
        result = subprocess.run(
            pipeline, shell=True, capture_output=True, text=True, timeout=120
        )
        lines = result.stdout.strip().split("\\n") if result.stdout.strip() else []
        return {
            "success": result.returncode == 0,
            "output": result.stdout[:20000],
            "row_count": len(lines),
            "stderr": result.stderr[:2000],
        }
    except subprocess.TimeoutExpired:
        return {"error": "Pipeline timed out", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}
`,
  configYaml: `name: data-pipeline
version: "1.0.0"
runtime: python3.11
timeout: 120
memory: 512
allowed-tools:
  - "Bash(cat,sort,uniq,awk,sed,cut,paste,tr,jq)"
  - "Read"
`,
};

// ─────────────────────────────────────────────
// 13. test-runner — 测试执行引擎
// ─────────────────────────────────────────────
const TEST_RUNNER: CoreSkillPrompt = {
  id: 'nc-test-runner',
  name: '测试执行引擎',
  description: '自动运行测试套件、解析结果、生成覆盖率报告',
  category: '高级自主',
  allowedTools: 'Bash(*), Read',
  difficulty: 'intermediate',
  skillMd: `---
name: test-runner
description: Automatically run test suites, parse results, generate coverage reports, and identify failing tests for targeted fixes.
allowed-tools: Bash(*), Read
---

# Test Execution Engine

## Quick start

\`\`\`bash
npm test                          # Run all tests
npm test -- --coverage            # With coverage
pytest -v                         # Python tests
pytest --tb=short -q              # Compact output
\`\`\`

## Core workflow

1. [Discover]: Find test files and determine framework
2. [Run]: Execute test suite with appropriate flags
3. [Parse]: Extract pass/fail counts, failing test details
4. [Report]: Generate coverage and summary
5. [Fix]: If tests fail, analyze errors and suggest fixes

## Framework detection

\`\`\`bash
# Detect test framework
cat package.json | grep -E "jest|vitest|mocha"    # JS/TS
cat setup.cfg | grep -E "pytest|unittest"         # Python
ls -la *.test.* test_*.py tests/                  # Find test files
\`\`\`

## JavaScript/TypeScript

\`\`\`bash
# Jest
npx jest --verbose --coverage
npx jest --testPathPattern="auth" --verbose       # Run specific
npx jest --watch                                  # Watch mode

# Vitest
npx vitest run --reporter=verbose
npx vitest run --coverage

# Mocha
npx mocha --recursive --reporter spec
\`\`\`

## Python

\`\`\`bash
# Pytest
pytest -v --tb=short
pytest -v --cov=src --cov-report=term-missing
pytest -k "test_auth" -v                          # Run specific
pytest --lf                                       # Last failed only

# Unittest
python -m unittest discover -v
\`\`\`

## Coverage analysis

\`\`\`bash
# JS coverage
npx jest --coverage --coverageReporters=text
cat coverage/lcov.info | head -50

# Python coverage
pytest --cov=src --cov-report=term-missing
coverage report --show-missing
\`\`\`

## Result parsing

After running tests, extract:
- Total tests, passed, failed, skipped
- Failing test names and error messages
- Coverage percentage per file
- Uncovered lines for targeted improvement

## Safety

- Run tests in isolated environment
- Never modify test files to make them pass
- Report actual results honestly
- Use \`--timeout\` to prevent hanging tests
`,
  handlerPy: `"""
Test runner skill handler — auto-detect and execute test suites.
"""
import subprocess
import os
import json
from typing import Dict, Any

async def handler(inputs: dict) -> dict:
    framework = inputs.get("framework", "auto")
    path = inputs.get("path", ".")
    coverage = inputs.get("coverage", False)
    pattern = inputs.get("pattern", "")
    
    if framework == "auto":
        framework = detect_framework(path)
    
    cmd = build_command(framework, path, coverage, pattern)
    
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True,
            timeout=300, cwd=path if os.path.isdir(path) else "."
        )
        return {
            "success": result.returncode == 0,
            "framework": framework,
            "stdout": result.stdout[:20000],
            "stderr": result.stderr[:5000],
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Tests timed out after 300s", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}

def detect_framework(path: str) -> str:
    pkg = os.path.join(path, "package.json")
    if os.path.exists(pkg):
        with open(pkg) as f:
            data = json.load(f)
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        if "vitest" in deps: return "vitest"
        if "jest" in deps: return "jest"
    if os.path.exists(os.path.join(path, "pytest.ini")) or os.path.exists(os.path.join(path, "setup.cfg")):
        return "pytest"
    return "pytest"

def build_command(framework: str, path: str, coverage: bool, pattern: str) -> str:
    if framework == "vitest":
        cmd = "npx vitest run --reporter=verbose"
        if coverage: cmd += " --coverage"
    elif framework == "jest":
        cmd = "npx jest --verbose"
        if coverage: cmd += " --coverage"
        if pattern: cmd += f' --testPathPattern="{pattern}"'
    elif framework == "pytest":
        cmd = "pytest -v --tb=short"
        if coverage: cmd += " --cov=src --cov-report=term-missing"
        if pattern: cmd += f' -k "{pattern}"'
    else:
        cmd = f"{framework}"
    return cmd
`,
  configYaml: `name: test-runner
version: "1.0.0"
runtime: python3.11
timeout: 300
memory: 512
allowed-tools:
  - "Bash(*)"
  - "Read"
`,
};

// ─────────────────────────────────────────────
// 14. doc-generator — 文档生成器
// ─────────────────────────────────────────────
const DOC_GENERATOR: CoreSkillPrompt = {
  id: 'nc-doc-generator',
  name: '文档生成器',
  description: '从代码生成 API 文档、README、变更日志 — 自动化文档工作流',
  category: '高级自主',
  allowedTools: 'Read, Write, Bash(grep,wc)',
  difficulty: 'beginner',
  skillMd: `---
name: doc-generator
description: Generate documentation from code — API docs, README files, changelogs, and inline documentation. Analyzes code structure to produce clear, accurate docs.
allowed-tools: Read, Write, Bash(grep,wc)
---

# Documentation Generator

## Quick start

\`\`\`bash
# Analyze codebase structure
find src -name "*.ts" | head -20
grep -rn "export function\\|export class\\|export interface" src/

# Count documentation coverage
grep -rn "/\\*\\*" src/ | wc -l       # JSDoc comments
grep -rn "def " src/ | wc -l        # Python functions
\`\`\`

## Core workflow

1. [Scan]: Find all public APIs, classes, functions
2. [Analyze]: Read signatures, types, existing comments
3. [Generate]: Write structured documentation
4. [Review]: Cross-reference with actual behavior
5. [Output]: Write to README.md, API.md, CHANGELOG.md

## README Generation

Generate a README with:
- Project title and description
- Installation instructions
- Quick start / usage examples
- API reference (key functions)
- Configuration options
- Contributing guidelines
- License

## API Documentation

For each public function/class:
\`\`\`markdown
### \`functionName(param1: type, param2: type): returnType\`

Description of what it does.

[Parameters]:
- \`param1\` (type) — Description
- \`param2\` (type, optional) — Description

[Returns]: Description of return value

[Example]:
\\\`\\\`\\\`typescript
const result = functionName("hello", 42);
\\\`\\\`\\\`
\`\`\`

## Changelog Generation

\`\`\`bash
# Git-based changelog
git log --oneline --since="2024-01-01" | head -50
git log --pretty=format:"- %s (%h)" --since="last month"
\`\`\`

Format: Keep a Changelog (keepachangelog.com)
- Added / Changed / Deprecated / Removed / Fixed / Security

## Code Analysis Commands

\`\`\`bash
# Find exports
grep -rn "export" src/ --include="*.ts"

# Count functions per file
for f in src/*.ts; do echo "$f: $(grep -c 'function\\|=>' $f)"; done

# Find undocumented functions
grep -B1 "export function" src/**/*.ts | grep -v "/\\*\\*"
\`\`\`
`,
  handlerPy: `"""
Documentation generator skill handler.
"""
import os
import subprocess
from typing import Dict, Any

async def handler(inputs: dict) -> dict:
    action = inputs.get("action", "scan")
    path = inputs.get("path", "src")
    output = inputs.get("output", "README.md")
    
    if action == "scan":
        result = subprocess.run(
            f'grep -rn "export function\\|export class\\|export interface" {path}',
            shell=True, capture_output=True, text=True
        )
        exports = result.stdout.strip().split("\\n") if result.stdout.strip() else []
        return {"success": True, "exports": exports[:100], "count": len(exports)}
    
    elif action == "coverage":
        jsdoc = subprocess.run(f'grep -rn "/\\*\\*" {path} | wc -l', shell=True, capture_output=True, text=True)
        funcs = subprocess.run(f'grep -rn "export function\\|export class" {path} | wc -l', shell=True, capture_output=True, text=True)
        doc_count = int(jsdoc.stdout.strip() or 0)
        func_count = int(funcs.stdout.strip() or 0)
        coverage = (doc_count / func_count * 100) if func_count > 0 else 0
        return {"success": True, "documented": doc_count, "total": func_count, "coverage_pct": round(coverage, 1)}
    
    return {"error": f"Unknown action: {action}", "success": False}
`,
  configYaml: `name: doc-generator
version: "1.0.0"
runtime: python3.11
timeout: 60
memory: 256
allowed-tools:
  - "Read"
  - "Write"
  - "Bash(grep,wc)"
`,
};

// ─────────────────────────────────────────────
// 15. container-monitor — 容器监控
// ─────────────────────────────────────────────
const CONTAINER_MONITOR: CoreSkillPrompt = {
  id: 'nc-container-monitor',
  name: '容器监控',
  description: '实时资源监控、性能分析、瓶颈检测 — 容器健康守护',
  category: '高级自主',
  allowedTools: 'Bash(ps,top,df,free,netstat,lsof)',
  difficulty: 'intermediate',
  skillMd: `---
name: container-monitor
description: Monitor container resources in real-time — CPU, memory, disk, network, and process analysis. Detect bottlenecks and performance issues.
allowed-tools: Bash(ps,top,df,free,netstat,lsof)
---

# Container Resource Monitor

## Quick start

\`\`\`bash
free -h                           # Memory usage
df -h                             # Disk usage
ps aux --sort=-%mem | head -10    # Top memory processes
\`\`\`

## Core workflow

1. [Overview]: Quick health check of CPU, memory, disk
2. [Deep dive]: Identify resource-heavy processes
3. [Network]: Check open ports and connections
4. [Diagnose]: Correlate resource usage with issues
5. [Alert]: Report if thresholds are exceeded

## Resource checks

### Memory
\`\`\`bash
free -h                           # Human-readable memory
free -m | awk 'NR==2{printf "Used: %sMB / %sMB (%.1f%%)\\n", $3, $2, $3*100/$2}'
cat /proc/meminfo | head -5       # Detailed memory info
\`\`\`

### Disk
\`\`\`bash
df -h                             # Filesystem usage
df -h / | awk 'NR==2{print $5}'  # Root usage percentage
du -sh /workspace/*               # Directory sizes
du -sh /tmp/*                     # Temp file sizes
\`\`\`

### CPU & Processes
\`\`\`bash
ps aux --sort=-%cpu | head -10    # Top CPU consumers
ps aux --sort=-%mem | head -10    # Top memory consumers
ps aux | wc -l                    # Total process count
top -bn1 | head -20               # Snapshot of top
\`\`\`

### Network
\`\`\`bash
netstat -tlnp                     # Listening ports
netstat -an | grep ESTABLISHED | wc -l  # Active connections
lsof -i -P -n | head -20         # Open network files
\`\`\`

## Health thresholds

| Metric | Warning | Critical |
|---|---|---|
| Memory usage | > 80% | > 95% |
| Disk usage | > 80% | > 95% |
| CPU (1min avg) | > 80% | > 95% |
| Open files | > 10000 | > 50000 |

## Automated checks

Run periodic health checks:
\`\`\`bash
# Quick health score
echo "=== Memory ===" && free -h
echo "=== Disk ===" && df -h /
echo "=== Top Processes ===" && ps aux --sort=-%mem | head -5
echo "=== Network ===" && netstat -tlnp 2>/dev/null | grep LISTEN
\`\`\`
`,
  handlerPy: `"""
Container monitoring skill handler.
"""
import subprocess
from typing import Dict, Any

THRESHOLDS = {
    "memory_warn": 80,
    "memory_crit": 95,
    "disk_warn": 80,
    "disk_crit": 95,
}

async def handler(inputs: dict) -> dict:
    check = inputs.get("check", "all")
    
    results = {}
    
    if check in ("all", "memory"):
        r = subprocess.run("free -m | awk 'NR==2{printf \\"%.1f\\", $3*100/$2}'", shell=True, capture_output=True, text=True)
        mem_pct = float(r.stdout.strip() or 0)
        results["memory"] = {"usage_pct": mem_pct, "status": "critical" if mem_pct > 95 else "warning" if mem_pct > 80 else "ok"}
    
    if check in ("all", "disk"):
        r = subprocess.run("df -h / | awk 'NR==2{print $5}' | tr -d '%'", shell=True, capture_output=True, text=True)
        disk_pct = float(r.stdout.strip() or 0)
        results["disk"] = {"usage_pct": disk_pct, "status": "critical" if disk_pct > 95 else "warning" if disk_pct > 80 else "ok"}
    
    if check in ("all", "processes"):
        r = subprocess.run("ps aux --sort=-%mem | head -6", shell=True, capture_output=True, text=True)
        results["top_processes"] = r.stdout
    
    overall = "ok"
    for v in results.values():
        if isinstance(v, dict) and v.get("status") == "critical": overall = "critical"; break
        if isinstance(v, dict) and v.get("status") == "warning": overall = "warning"
    
    return {"success": True, "checks": results, "overall": overall}
`,
  configYaml: `name: container-monitor
version: "1.0.0"
runtime: python3.11
timeout: 30
memory: 256
allowed-tools:
  - "Bash(ps,top,df,free,netstat,lsof)"
`,
};

// ─────────────────────────────────────────────
// 16. secret-manager — 密钥安全管理
// ─────────────────────────────────────────────
const SECRET_MANAGER: CoreSkillPrompt = {
  id: 'nc-secret-manager',
  name: '密钥安全管理',
  description: '.env 密钥轮换、敏感信息检测、安全审计 — 密钥守护者',
  category: '高级自主',
  allowedTools: 'Bash(grep,sed), Read, Write',
  difficulty: 'advanced',
  skillMd: `---
name: secret-manager
description: Manage secrets securely — detect exposed credentials, rotate API keys, audit .env files, and enforce secret hygiene across the project.
allowed-tools: Bash(grep,sed), Read, Write
---

# Secret Security Manager

## Quick start

\`\`\`bash
# Scan for exposed secrets
grep -rn "sk-\\|AKIA\\|ghp_\\|password=" . --include="*.ts" --include="*.js" --include="*.py"

# Check .env is gitignored
grep ".env" .gitignore

# Audit .env file
wc -l .env && grep -c "=" .env
\`\`\`

## Core workflow

1. [Scan]: Detect exposed secrets in code and config files
2. [Audit]: Verify .env files are properly gitignored
3. [Rotate]: Guide key rotation process
4. [Report]: Generate security audit report
5. [Fix]: Remove exposed secrets from git history if needed

## Secret Detection Patterns

\`\`\`bash
# API keys
grep -rn "sk-[a-zA-Z0-9]\\{20,\\}" . --include="*.ts" --include="*.js"
grep -rn "AKIA[A-Z0-9]\\{16\\}" .                          # AWS access key
grep -rn "ghp_[a-zA-Z0-9]\\{36\\}" .                       # GitHub PAT
grep -rn "xoxb-\\|xoxp-" .                                 # Slack tokens

# Hardcoded passwords
grep -rn "password\\s*=\\s*['\\\"]" . --include="*.ts" --include="*.py"
grep -rn "secret\\s*=\\s*['\\\"]" . --include="*.ts" --include="*.py"

# Connection strings
grep -rn "postgresql://\\|mysql://\\|mongodb://" . --include="*.ts"
\`\`\`

## .env Audit

\`\`\`bash
# Verify .gitignore includes .env
grep -q ".env" .gitignore && echo "OK: .env is gitignored" || echo "WARNING: .env not in .gitignore"

# Check for .env in git history
git log --all --diff-filter=A -- ".env" "*.env"

# List all env files
find . -name "*.env*" -not -path "*/node_modules/*"
\`\`\`

## Key Rotation Process

1. Generate new key from provider
2. Update \`.env\` with new value: \`sed -i 's/^KEY=.*/KEY=new_value/' .env\`
3. Verify application works with new key
4. Revoke old key from provider
5. Record rotation in audit log

## Security Report

Generate a report covering:
- Number of env variables
- Exposed secrets found (0 = pass)
- .gitignore coverage
- Key age (if tracked)
- Recommendations

## Safety

- NEVER log or output actual secret values
- Always mask: \`sk-...last4\`
- Use \`grep\` patterns, never \`cat\` full secrets to stdout
- Rotate immediately if exposure detected
`,
  handlerPy: `"""
Secret manager skill handler — detect, audit, and rotate secrets.
"""
import subprocess
import re
from typing import Dict, Any, List

SECRET_PATTERNS = [
    (r"sk-[a-zA-Z0-9]{20,}", "OpenAI API Key"),
    (r"AKIA[A-Z0-9]{16}", "AWS Access Key"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub PAT"),
    (r"xoxb-[a-zA-Z0-9-]+", "Slack Bot Token"),
]

async def handler(inputs: dict) -> dict:
    action = inputs.get("action", "scan")
    path = inputs.get("path", ".")
    
    if action == "scan":
        findings = []
        for pattern, name in SECRET_PATTERNS:
            r = subprocess.run(
                f'grep -rn "{pattern}" {path} --include="*.ts" --include="*.js" --include="*.py" --include="*.env"',
                shell=True, capture_output=True, text=True
            )
            if r.stdout.strip():
                count = len(r.stdout.strip().split("\\n"))
                findings.append({"type": name, "count": count, "severity": "critical"})
        
        return {"success": True, "findings": findings, "clean": len(findings) == 0}
    
    elif action == "audit":
        checks = {}
        
        # Check .gitignore
        r = subprocess.run('grep -q ".env" .gitignore', shell=True)
        checks["gitignore_env"] = r.returncode == 0
        
        # Count env vars
        r = subprocess.run('grep -c "=" .env 2>/dev/null', shell=True, capture_output=True, text=True)
        checks["env_var_count"] = int(r.stdout.strip() or 0)
        
        # Check git history
        r = subprocess.run('git log --all --diff-filter=A -- ".env" 2>/dev/null | head -1', shell=True, capture_output=True, text=True)
        checks["env_in_history"] = bool(r.stdout.strip())
        
        return {"success": True, "audit": checks}
    
    return {"error": f"Unknown action: {action}", "success": False}
`,
  configYaml: `name: secret-manager
version: "1.0.0"
runtime: python3.11
timeout: 60
memory: 256
allowed-tools:
  - "Bash(grep,sed)"
  - "Read"
  - "Write"
`,
};

// ─────────────────────────────────────────────
// 导出
// ─────────────────────────────────────────────
export const CORE_SKILL_PROMPTS: CoreSkillPrompt[] = [
  AGENT_BROWSER,
  FILE_MANAGER,
  SHELL_EXECUTOR,
  MEMORY_MANAGER,
  TASK_PLANNER,
  CODE_REVIEWER,
  API_CONNECTOR,
  SELF_HEALER,
  SKILL_LIFECYCLE,
  GIT_OPERATOR,
  ENV_CONFIGURATOR,
  DATA_PIPELINE,
  TEST_RUNNER,
  DOC_GENERATOR,
  CONTAINER_MONITOR,
  SECRET_MANAGER,
];

export const CORE_SKILL_MAP: Record<string, CoreSkillPrompt> = Object.fromEntries(
  CORE_SKILL_PROMPTS.map(s => [s.id, s])
);
