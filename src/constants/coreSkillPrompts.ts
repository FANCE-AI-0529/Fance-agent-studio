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

1. **Explore**: \`ls\`, \`find\`, \`tree\` to understand directory structure
2. **Read**: \`cat\`, \`head\`, \`tail\` to inspect file content
3. **Write**: \`echo\`, \`cat >\`, \`sed\` to modify files
4. **Organize**: \`mkdir\`, \`cp\`, \`mv\`, \`rm\` to manage structure
5. **Analyze**: \`wc\`, \`grep\`, \`diff\` to understand content

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

1. **Plan**: Determine the sequence of commands needed
2. **Check**: Use \`which\`, \`--version\` to verify tool availability
3. **Execute**: Run commands one at a time, check exit codes
4. **Verify**: Confirm output matches expectations
5. **Handle errors**: Parse stderr, retry or escalate

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

1. **Session start**: Read \`CLAUDE.md\` to restore context
2. **Task planning**: Update \`task_plan.md\` with current objectives
3. **During work**: Record key decisions in \`progress.md\`
4. **Session end**: Update \`CLAUDE.md\` with new learnings

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

1. **Scan**: Identify files to review (\`find\`, \`wc\`)
2. **Read**: Understand code structure (\`cat\`, \`head\`)
3. **Analyze**: Check for patterns and anti-patterns (\`grep\`)
4. **Compare**: Diff against previous versions (\`diff\`)
5. **Report**: Generate structured review with actionable items

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
1. **[SECURITY]** SQL injection in \`src/db.ts:42\`
2. **[ERROR]** Unhandled promise rejection in \`src/api.ts:88\`

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

1. **Prepare**: Set headers, auth tokens, request body
2. **Execute**: Make HTTP request with curl
3. **Parse**: Extract data with jq
4. **Chain**: Feed output into subsequent requests
5. **Handle errors**: Check HTTP status codes

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

1. **Detect**: Monitor exit codes, log patterns, process status
2. **Diagnose**: Analyze error messages, stack traces, system state
3. **Plan fix**: Choose repair strategy based on error type
4. **Execute fix**: Apply the repair with rollback capability
5. **Verify**: Confirm the fix resolved the issue
6. **Record**: Log the incident and resolution for future reference

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

**Time**: [timestamp]
**Severity**: [critical/high/medium/low]
**Error**: [error message]
**Root cause**: [what went wrong]
**Fix applied**: [what was done]
**Verified**: [yes/no]
**Prevention**: [how to avoid in future]
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
];

export const CORE_SKILL_MAP: Record<string, CoreSkillPrompt> = Object.fromEntries(
  CORE_SKILL_PROMPTS.map(s => [s.id, s])
);
