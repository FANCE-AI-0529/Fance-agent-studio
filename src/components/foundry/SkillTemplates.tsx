import { useState } from "react";
import { createElement } from "react";
import {
  Database,
  Globe,
  FileText,
  Calculator,
  Mail,
  MessageSquare,
  Search,
  Calendar,
  Image,
  Code,
  Shield,
  Zap,
  BookOpen,
  Users,
  Bot,
  Sparkles,
  Loader2,
  Cloud,
  Lock,
  Bell,
  CreditCard,
  MapPin,
  Mic,
  Video,
  BarChart3,
  GitBranch,
  Webhook,
  Monitor,
  FolderOpen,
  Terminal,
  Brain,
  ListTodo,
  ScanSearch,
  Plug,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CORE_SKILL_PROMPTS } from "@/constants/coreSkillPrompts";

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  difficulty: "beginner" | "intermediate" | "advanced";
  content: string;
  handlerCode: string;
  configYaml: string;
  isNative?: boolean;
}

// NanoClaw 原生核心技能图标映射
const nativeSkillIcons: Record<string, React.ReactNode> = {
  // 基础自主 (Batch 1)
  'nc-agent-browser': createElement(Monitor, { className: "h-4 w-4" }),
  'nc-file-manager': createElement(FolderOpen, { className: "h-4 w-4" }),
  'nc-shell-executor': createElement(Terminal, { className: "h-4 w-4" }),
  'nc-memory-manager': createElement(Brain, { className: "h-4 w-4" }),
  'nc-task-planner': createElement(ListTodo, { className: "h-4 w-4" }),
  'nc-code-reviewer': createElement(ScanSearch, { className: "h-4 w-4" }),
  'nc-api-connector': createElement(Plug, { className: "h-4 w-4" }),
  'nc-self-healer': createElement(HeartPulse, { className: "h-4 w-4" }),
  // 高级自主 (Batch 2)
  'nc-skill-lifecycle': createElement(Zap, { className: "h-4 w-4" }),
  'nc-git-operator': createElement(GitBranch, { className: "h-4 w-4" }),
  'nc-env-configurator': createElement(Cloud, { className: "h-4 w-4" }),
  'nc-data-pipeline': createElement(Database, { className: "h-4 w-4" }),
  'nc-test-runner': createElement(Code, { className: "h-4 w-4" }),
  'nc-doc-generator': createElement(FileText, { className: "h-4 w-4" }),
  'nc-container-monitor': createElement(BarChart3, { className: "h-4 w-4" }),
  'nc-secret-manager': createElement(Lock, { className: "h-4 w-4" }),
};

// 将核心技能提示词转换为 SkillTemplate 格式
const coreSkillTemplates: SkillTemplate[] = CORE_SKILL_PROMPTS.map(skill => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  category: skill.category,
  icon: nativeSkillIcons[skill.id] || createElement(Zap, { className: "h-4 w-4" }),
  difficulty: skill.difficulty,
  content: skill.skillMd,
  handlerCode: skill.handlerPy,
  configYaml: skill.configYaml,
  isNative: true,
}));

// 真实可用的技能模板库
export const skillTemplates: SkillTemplate[] = [
  // 核心自主能力（NanoClaw 原生格式）
  ...coreSkillTemplates,
  // 标准技能模板
  {
    id: "web-search",
    name: "网页搜索",
    description: "通过搜索引擎检索信息并返回结构化结果",
    category: "信息检索",
    icon: <Search className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "web-search"
version: "1.0.0"
description: "通过搜索引擎检索网页信息，返回相关结果摘要"
author: "Fance Studio"
permissions:
  - internet_access
  - read
inputs:
  - name: query
    type: string
    description: 搜索关键词
    required: true
  - name: max_results
    type: number
    description: 最大返回结果数量
    required: false
    default: 5
  - name: language
    type: string
    description: 搜索语言偏好
    required: false
    default: "zh-CN"
outputs:
  - name: results
    type: array
    description: 搜索结果列表，包含标题、链接、摘要
  - name: total_count
    type: number
    description: 匹配结果总数
---

# 网页搜索技能

## 能力描述

本技能提供网页搜索能力，可以：

1. **关键词搜索** - 根据用户输入的关键词检索互联网信息
2. **结果过滤** - 按相关性排序并过滤低质量结果
3. **摘要提取** - 提取网页核心内容作为摘要

## 使用示例

\`\`\`
用户: 搜索 "React 18 新特性"
助手: 找到以下相关结果：
1. React 18 发布说明 - 官方文档
2. React 18 并发特性详解 - 技术博客
3. 从 React 17 升级到 18 的指南
\`\`\`

## API 集成

本技能使用 SerpAPI 或 Google Custom Search API 进行搜索。

## 注意事项

- 搜索结果来自公开网页，请验证信息准确性
- 单次请求最多返回 10 条结果
- 请遵守搜索引擎的使用条款
`,
    handlerCode: `"""
网页搜索技能处理器
"""

import os
import json
import httpx
from typing import Dict, Any, List

# 搜索API配置
SEARCH_API_KEY = os.getenv("SEARCH_API_KEY", "")
SEARCH_ENGINE_ID = os.getenv("SEARCH_ENGINE_ID", "")


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行网页搜索
    
    Args:
        inputs: 包含 query, max_results, language 的字典
        
    Returns:
        搜索结果列表和总数
    """
    query = inputs.get("query", "")
    max_results = inputs.get("max_results", 5)
    language = inputs.get("language", "zh-CN")
    
    if not query:
        return {"results": [], "total_count": 0, "error": "查询不能为空"}
    
    try:
        results = await perform_search(query, max_results, language)
        return {
            "results": results,
            "total_count": len(results)
        }
    except Exception as e:
        return {"results": [], "total_count": 0, "error": str(e)}


async def perform_search(query: str, max_results: int, language: str) -> List[Dict]:
    """执行实际的搜索请求"""
    
    # 使用 Google Custom Search API
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": SEARCH_API_KEY,
        "cx": SEARCH_ENGINE_ID,
        "q": query,
        "num": min(max_results, 10),
        "lr": f"lang_{language[:2]}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    
    results = []
    for item in data.get("items", []):
        results.append({
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", ""),
            "source": item.get("displayLink", "")
        })
    
    return results


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    query = inputs.get("query", "")
    return isinstance(query, str) and len(query.strip()) > 0
`,
    configYaml: `# 网页搜索技能配置
runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 256

dependencies:
  - httpx>=0.24.0

environment:
  SEARCH_API_KEY: "\${SEARCH_API_KEY}"
  SEARCH_ENGINE_ID: "\${SEARCH_ENGINE_ID}"

rate_limit:
  requests_per_minute: 60
  requests_per_day: 1000
`,
  },
  {
    id: "database-query",
    name: "数据库查询",
    description: "安全执行 SQL 查询并返回结构化数据",
    category: "数据操作",
    icon: <Database className="h-4 w-4" />,
    difficulty: "advanced",
    content: `---
name: "database-query"
version: "1.0.0"
description: "安全执行数据库查询，支持参数化查询防止 SQL 注入"
author: "Fance Studio"
permissions:
  - database_read
  - database_write
inputs:
  - name: query
    type: string
    description: SQL 查询语句（支持参数占位符）
    required: true
  - name: params
    type: object
    description: 查询参数字典
    required: false
  - name: database
    type: string
    description: 目标数据库名称
    required: false
    default: "default"
  - name: read_only
    type: boolean
    description: 是否只读模式（禁止写操作）
    required: false
    default: true
outputs:
  - name: rows
    type: array
    description: 查询结果行
  - name: affected_rows
    type: number
    description: 影响的行数（写操作时）
  - name: columns
    type: array
    description: 列名列表
---

# 数据库查询技能

## 能力描述

本技能提供安全的数据库查询能力：

1. **参数化查询** - 使用参数占位符防止 SQL 注入
2. **只读模式** - 可限制为只读操作，保护数据安全
3. **多数据库支持** - 支持 PostgreSQL, MySQL, SQLite

## 使用示例

\`\`\`
用户: 查询最近7天的订单
SQL: SELECT * FROM orders WHERE created_at > :start_date ORDER BY created_at DESC
参数: {"start_date": "2024-01-01"}
\`\`\`

## 安全措施

- 所有查询必须使用参数化
- 禁止动态拼接 SQL
- 写操作需要额外授权

## MPLP 集成

写操作会触发 CONFIRM_REQUIRED 状态，需要用户确认。
`,
    handlerCode: `"""
数据库查询技能处理器
"""

import os
import re
from typing import Dict, Any, List, Tuple
from contextlib import asynccontextmanager

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "")

# 危险操作关键词
DANGEROUS_KEYWORDS = ["DROP", "TRUNCATE", "DELETE", "ALTER", "CREATE"]


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行数据库查询
    
    Args:
        inputs: 包含 query, params, database, read_only 的字典
        
    Returns:
        查询结果
    """
    query = inputs.get("query", "").strip()
    params = inputs.get("params", {})
    database = inputs.get("database", "default")
    read_only = inputs.get("read_only", True)
    
    # 验证查询
    validation = validate_query(query, read_only)
    if not validation["valid"]:
        return {"error": validation["message"], "rows": [], "affected_rows": 0}
    
    try:
        # 执行查询
        result = await execute_query(query, params, database)
        return result
    except Exception as e:
        return {"error": str(e), "rows": [], "affected_rows": 0}


def validate_query(query: str, read_only: bool) -> Dict[str, Any]:
    """验证 SQL 查询的安全性"""
    
    query_upper = query.upper()
    
    # 检查是否为空
    if not query:
        return {"valid": False, "message": "查询不能为空"}
    
    # 只读模式下检查危险操作
    if read_only:
        for keyword in DANGEROUS_KEYWORDS:
            if keyword in query_upper:
                return {
                    "valid": False, 
                    "message": f"只读模式下禁止 {keyword} 操作"
                }
        
        # 只读模式只允许 SELECT
        if not query_upper.strip().startswith("SELECT"):
            return {
                "valid": False, 
                "message": "只读模式只允许 SELECT 查询"
            }
    
    # 检查是否有未参数化的字符串拼接迹象
    if re.search(r"['\"]\\s*\\+|\\+\\s*['\"]", query):
        return {
            "valid": False, 
            "message": "请使用参数化查询，禁止字符串拼接"
        }
    
    return {"valid": True, "message": ""}


async def execute_query(
    query: str, 
    params: Dict[str, Any], 
    database: str
) -> Dict[str, Any]:
    """执行实际的数据库查询"""
    
    # 这里使用 asyncpg 或其他异步数据库驱动
    # 示例使用伪代码
    import asyncpg
    
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        if query.upper().strip().startswith("SELECT"):
            rows = await conn.fetch(query, *params.values())
            columns = list(rows[0].keys()) if rows else []
            return {
                "rows": [dict(row) for row in rows],
                "columns": columns,
                "affected_rows": 0
            }
        else:
            result = await conn.execute(query, *params.values())
            affected = int(result.split()[-1]) if result else 0
            return {
                "rows": [],
                "columns": [],
                "affected_rows": affected
            }
    finally:
        await conn.close()


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    query = inputs.get("query", "")
    return isinstance(query, str) and len(query.strip()) > 0
`,
    configYaml: `# 数据库查询技能配置
runtime:
  python_version: "3.11"
  timeout_seconds: 60
  memory_mb: 512

dependencies:
  - asyncpg>=0.28.0
  - sqlparse>=0.4.4

environment:
  DATABASE_URL: "\${DATABASE_URL}"

security:
  require_confirmation:
    - INSERT
    - UPDATE
    - DELETE
  max_rows_return: 1000
  query_timeout_seconds: 30
`,
  },
  {
    id: "text-summarization",
    name: "文本摘要",
    description: "使用 AI 模型生成文本摘要",
    category: "NLP",
    icon: <FileText className="h-4 w-4" />,
    difficulty: "beginner",
    content: `---
name: "text-summarization"
version: "1.0.0"
description: "使用 AI 模型对长文本进行智能摘要"
author: "Fance Studio"
permissions:
  - ai_inference
inputs:
  - name: text
    type: string
    description: 需要摘要的原文
    required: true
  - name: max_length
    type: number
    description: 摘要最大字数
    required: false
    default: 200
  - name: style
    type: string
    description: 摘要风格（formal/casual/bullet）
    required: false
    default: "formal"
outputs:
  - name: summary
    type: string
    description: 生成的摘要
  - name: key_points
    type: array
    description: 提取的关键要点
  - name: word_count
    type: number
    description: 摘要字数
---

# 文本摘要技能

## 能力描述

本技能使用 AI 模型对文本进行智能摘要：

1. **多风格摘要** - 支持正式、口语、要点列表等风格
2. **长度控制** - 可指定摘要的目标长度
3. **关键词提取** - 自动提取文本中的核心要点

## 使用示例

\`\`\`
用户: 请摘要这篇文章（2000字）
助手: 
摘要：这篇文章主要讨论了人工智能在医疗领域的应用...

关键要点：
- AI 辅助诊断准确率提升 30%
- 药物研发周期缩短
- 个性化治疗方案
\`\`\`

## 支持的语言

- 中文
- 英文
- 日文
`,
    handlerCode: `"""
文本摘要技能处理器
"""

import os
from typing import Dict, Any, List

# AI 模型配置
AI_MODEL = os.getenv("AI_MODEL", "gpt-4")
AI_API_KEY = os.getenv("AI_API_KEY", "")


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    生成文本摘要
    
    Args:
        inputs: 包含 text, max_length, style 的字典
        
    Returns:
        摘要结果
    """
    text = inputs.get("text", "")
    max_length = inputs.get("max_length", 200)
    style = inputs.get("style", "formal")
    
    if not text or len(text.strip()) < 50:
        return {
            "summary": text,
            "key_points": [],
            "word_count": len(text),
            "error": "文本太短，无需摘要"
        }
    
    try:
        result = await generate_summary(text, max_length, style)
        return result
    except Exception as e:
        return {
            "summary": "",
            "key_points": [],
            "word_count": 0,
            "error": str(e)
        }


async def generate_summary(
    text: str, 
    max_length: int, 
    style: str
) -> Dict[str, Any]:
    """使用 AI 模型生成摘要"""
    
    import httpx
    
    style_prompts = {
        "formal": "请用正式的学术风格",
        "casual": "请用通俗易懂的口语风格", 
        "bullet": "请用要点列表的形式"
    }
    
    prompt = f"""
{style_prompts.get(style, style_prompts["formal"])}，
将以下文本摘要为不超过{max_length}字：

{text}

请同时提取3-5个关键要点。

输出格式：
摘要：<摘要内容>
关键要点：
- 要点1
- 要点2
...
"""
    
    # 调用 AI API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {AI_API_KEY}"},
            json={
                "model": AI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_length * 2
            }
        )
        response.raise_for_status()
        data = response.json()
    
    content = data["choices"][0]["message"]["content"]
    
    # 解析响应
    summary, key_points = parse_response(content)
    
    return {
        "summary": summary,
        "key_points": key_points,
        "word_count": len(summary)
    }


def parse_response(content: str) -> tuple:
    """解析 AI 响应"""
    lines = content.strip().split("\\n")
    summary = ""
    key_points = []
    
    in_summary = False
    in_points = False
    
    for line in lines:
        line = line.strip()
        if line.startswith("摘要：") or line.startswith("摘要:"):
            summary = line[3:].strip()
            in_summary = True
        elif line.startswith("关键要点"):
            in_summary = False
            in_points = True
        elif in_points and line.startswith("-"):
            key_points.append(line[1:].strip())
        elif in_summary and line:
            summary += " " + line
    
    return summary, key_points


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    text = inputs.get("text", "")
    return isinstance(text, str) and len(text.strip()) > 0
`,
    configYaml: `# 文本摘要技能配置
runtime:
  python_version: "3.11"
  timeout_seconds: 60
  memory_mb: 256

dependencies:
  - httpx>=0.24.0

environment:
  AI_MODEL: "gpt-4"
  AI_API_KEY: "\${AI_API_KEY}"

limits:
  max_input_length: 50000
  max_output_length: 2000
`,
  },
  {
    id: "email-sender",
    name: "邮件发送",
    description: "发送格式化邮件，支持模板和附件",
    category: "通信",
    icon: <Mail className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "email-sender"
version: "1.0.0"
description: "发送格式化邮件，支持 HTML 模板和附件"
author: "Fance Studio"
permissions:
  - email_send
  - network
inputs:
  - name: to
    type: array
    description: 收件人邮箱列表
    required: true
  - name: subject
    type: string
    description: 邮件主题
    required: true
  - name: body
    type: string
    description: 邮件正文（支持 HTML）
    required: true
  - name: cc
    type: array
    description: 抄送列表
    required: false
  - name: attachments
    type: array
    description: 附件 URL 列表
    required: false
  - name: template_id
    type: string
    description: 邮件模板 ID
    required: false
outputs:
  - name: message_id
    type: string
    description: 邮件消息 ID
  - name: status
    type: string
    description: 发送状态
  - name: recipients_count
    type: number
    description: 成功发送的收件人数量
---

# 邮件发送技能

## 能力描述

本技能提供邮件发送功能：

1. **HTML 邮件** - 支持富文本格式
2. **模板系统** - 预设邮件模板
3. **附件支持** - 可添加附件
4. **批量发送** - 支持多收件人

## 使用示例

\`\`\`
用户: 发送会议通知邮件给团队
助手: 已发送邮件至 5 位收件人
- 邮件 ID: msg_abc123
- 主题: 团队周会通知
\`\`\`

## MPLP 集成

发送邮件前会触发确认流程，显示收件人和邮件内容预览。

## 安全措施

- 收件人需在白名单内
- 单次最多发送 50 封
- 附件大小限制 10MB
`,
    handlerCode: `"""
邮件发送技能处理器
"""

import os
from typing import Dict, Any, List
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# SMTP 配置
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "")


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    发送邮件
    
    Args:
        inputs: 包含 to, subject, body, cc, attachments 的字典
        
    Returns:
        发送结果
    """
    to_list = inputs.get("to", [])
    subject = inputs.get("subject", "")
    body = inputs.get("body", "")
    cc_list = inputs.get("cc", [])
    attachments = inputs.get("attachments", [])
    template_id = inputs.get("template_id")
    
    # 验证收件人
    if not to_list:
        return {"status": "error", "message": "收件人列表不能为空"}
    
    # 应用模板（如果指定）
    if template_id:
        body = apply_template(template_id, body)
    
    try:
        result = await send_email(
            to_list=to_list,
            subject=subject,
            body=body,
            cc_list=cc_list,
            attachments=attachments
        )
        return result
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "message_id": None,
            "recipients_count": 0
        }


async def send_email(
    to_list: List[str],
    subject: str,
    body: str,
    cc_list: List[str],
    attachments: List[str]
) -> Dict[str, Any]:
    """发送邮件的实际实现"""
    
    import aiosmtplib
    
    # 构建邮件
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = FROM_EMAIL
    message["To"] = ", ".join(to_list)
    if cc_list:
        message["Cc"] = ", ".join(cc_list)
    
    # 添加 HTML 正文
    html_part = MIMEText(body, "html", "utf-8")
    message.attach(html_part)
    
    # 发送
    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASSWORD,
        start_tls=True
    )
    
    # 生成消息 ID
    import uuid
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    
    return {
        "status": "sent",
        "message_id": message_id,
        "recipients_count": len(to_list) + len(cc_list)
    }


def apply_template(template_id: str, content: str) -> str:
    """应用邮件模板"""
    templates = {
        "meeting": '''
            <div style="font-family: Arial, sans-serif;">
                <h2>会议通知</h2>
                <div>{content}</div>
                <p>请准时参加。</p>
            </div>
        ''',
        "notification": '''
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <div>{content}</div>
            </div>
        '''
    }
    template = templates.get(template_id, "{content}")
    return template.format(content=content)


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    to_list = inputs.get("to", [])
    subject = inputs.get("subject", "")
    return len(to_list) > 0 and len(subject) > 0
`,
    configYaml: `# 邮件发送技能配置
runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 256

dependencies:
  - aiosmtplib>=2.0.0

environment:
  SMTP_HOST: "\${SMTP_HOST}"
  SMTP_PORT: "587"
  SMTP_USER: "\${SMTP_USER}"
  SMTP_PASSWORD: "\${SMTP_PASSWORD}"
  FROM_EMAIL: "\${FROM_EMAIL}"

security:
  require_confirmation: true
  max_recipients: 50
  max_attachment_size_mb: 10
`,
  },
  {
    id: "calendar-manager",
    name: "日程管理",
    description: "创建、查询和管理日历事件",
    category: "效率工具",
    icon: <Calendar className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "calendar-manager"
version: "1.0.0"
description: "管理日历事件，支持创建、查询、更新和删除"
author: "Fance Studio"
permissions:
  - calendar_read
  - calendar_write
inputs:
  - name: action
    type: string
    description: 操作类型（create/read/update/delete）
    required: true
  - name: event
    type: object
    description: 事件详情
    required: false
  - name: date_range
    type: object
    description: 查询的日期范围
    required: false
  - name: event_id
    type: string
    description: 事件 ID（更新/删除时需要）
    required: false
outputs:
  - name: events
    type: array
    description: 事件列表
  - name: event_id
    type: string
    description: 创建/更新的事件 ID
  - name: status
    type: string
    description: 操作状态
---

# 日程管理技能

## 能力描述

本技能提供日历管理功能：

1. **创建事件** - 添加新的日历事件
2. **查询日程** - 按日期范围查询
3. **更新事件** - 修改现有事件
4. **冲突检测** - 自动检测时间冲突

## 使用示例

\`\`\`
用户: 帮我安排明天下午3点的会议
助手: 已创建日程：
- 时间: 2024-01-15 15:00 - 16:00
- 标题: 会议
- 事件ID: evt_abc123
\`\`\`

## 集成支持

- Google Calendar
- Microsoft Outlook
- Apple Calendar (via CalDAV)
`,
    handlerCode: `"""
日程管理技能处理器
"""

import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# 日历 API 配置
CALENDAR_PROVIDER = os.getenv("CALENDAR_PROVIDER", "google")
CALENDAR_API_KEY = os.getenv("CALENDAR_API_KEY", "")


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    管理日历事件
    
    Args:
        inputs: 包含 action, event, date_range, event_id 的字典
        
    Returns:
        操作结果
    """
    action = inputs.get("action", "read")
    
    handlers = {
        "create": create_event,
        "read": read_events,
        "update": update_event,
        "delete": delete_event
    }
    
    handler = handlers.get(action)
    if not handler:
        return {"status": "error", "message": f"不支持的操作: {action}"}
    
    try:
        return await handler(inputs)
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def create_event(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """创建日历事件"""
    event = inputs.get("event", {})
    
    if not event.get("title"):
        return {"status": "error", "message": "事件标题不能为空"}
    
    # 检查时间冲突
    start = event.get("start")
    end = event.get("end")
    conflicts = await check_conflicts(start, end)
    
    if conflicts:
        return {
            "status": "conflict",
            "message": "存在时间冲突",
            "conflicts": conflicts
        }
    
    # 创建事件
    import uuid
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    
    # 这里调用实际的日历 API
    # await calendar_api.create(event)
    
    return {
        "status": "created",
        "event_id": event_id,
        "events": [event]
    }


async def read_events(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """查询日历事件"""
    date_range = inputs.get("date_range", {})
    
    start = date_range.get("start", datetime.now().isoformat())
    end = date_range.get("end", (datetime.now() + timedelta(days=7)).isoformat())
    
    # 这里调用实际的日历 API 查询
    # events = await calendar_api.list(start, end)
    events = []  # 模拟数据
    
    return {
        "status": "success",
        "events": events,
        "event_id": None
    }


async def update_event(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """更新日历事件"""
    event_id = inputs.get("event_id")
    event = inputs.get("event", {})
    
    if not event_id:
        return {"status": "error", "message": "缺少事件 ID"}
    
    # 这里调用实际的日历 API
    # await calendar_api.update(event_id, event)
    
    return {
        "status": "updated",
        "event_id": event_id,
        "events": [event]
    }


async def delete_event(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """删除日历事件"""
    event_id = inputs.get("event_id")
    
    if not event_id:
        return {"status": "error", "message": "缺少事件 ID"}
    
    # 这里调用实际的日历 API
    # await calendar_api.delete(event_id)
    
    return {
        "status": "deleted",
        "event_id": event_id,
        "events": []
    }


async def check_conflicts(start: str, end: str) -> List[Dict]:
    """检查时间冲突"""
    # 这里实现冲突检测逻辑
    return []


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    action = inputs.get("action", "")
    return action in ["create", "read", "update", "delete"]
`,
    configYaml: `# 日程管理技能配置
runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 256

dependencies:
  - google-api-python-client>=2.0.0
  - httpx>=0.24.0

environment:
  CALENDAR_PROVIDER: "google"
  CALENDAR_API_KEY: "\${CALENDAR_API_KEY}"

security:
  require_confirmation:
    - create
    - update
    - delete
`,
  },
  {
    id: "code-executor",
    name: "代码执行",
    description: "在安全沙箱中执行代码片段",
    category: "开发工具",
    icon: <Code className="h-4 w-4" />,
    difficulty: "advanced",
    content: `---
name: "code-executor"
version: "1.0.0"
description: "在安全沙箱环境中执行代码片段"
author: "Fance Studio"
permissions:
  - code_execute
  - sandbox
inputs:
  - name: code
    type: string
    description: 要执行的代码
    required: true
  - name: language
    type: string
    description: 编程语言（python/javascript/bash）
    required: true
  - name: timeout
    type: number
    description: 执行超时时间（秒）
    required: false
    default: 30
  - name: stdin
    type: string
    description: 标准输入
    required: false
outputs:
  - name: stdout
    type: string
    description: 标准输出
  - name: stderr
    type: string
    description: 错误输出
  - name: exit_code
    type: number
    description: 退出码
  - name: execution_time
    type: number
    description: 执行时间（毫秒）
---

# 代码执行技能

## 能力描述

本技能在安全沙箱中执行代码：

1. **多语言支持** - Python, JavaScript, Bash
2. **资源隔离** - CPU、内存限制
3. **网络隔离** - 禁止网络访问

## 使用示例

\`\`\`
用户: 运行这段 Python 代码计算斐波那契
代码:
def fib(n):
    return n if n < 2 else fib(n-1) + fib(n-2)
print(fib(10))

输出: 55
执行时间: 12ms
\`\`\`

## 安全限制

- 最大执行时间: 30秒
- 最大内存: 256MB
- 禁止文件系统写入
- 禁止网络访问
`,
    handlerCode: `"""
代码执行技能处理器
"""

import os
import asyncio
import time
from typing import Dict, Any

# 沙箱配置
MAX_TIMEOUT = int(os.getenv("MAX_TIMEOUT", "30"))
MAX_MEMORY_MB = int(os.getenv("MAX_MEMORY_MB", "256"))


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行代码
    
    Args:
        inputs: 包含 code, language, timeout, stdin 的字典
        
    Returns:
        执行结果
    """
    code = inputs.get("code", "")
    language = inputs.get("language", "python")
    timeout = min(inputs.get("timeout", 30), MAX_TIMEOUT)
    stdin = inputs.get("stdin", "")
    
    if not code:
        return {
            "stdout": "",
            "stderr": "代码不能为空",
            "exit_code": 1,
            "execution_time": 0
        }
    
    # 验证语言
    if language not in ["python", "javascript", "bash"]:
        return {
            "stdout": "",
            "stderr": f"不支持的语言: {language}",
            "exit_code": 1,
            "execution_time": 0
        }
    
    try:
        result = await execute_in_sandbox(code, language, timeout, stdin)
        return result
    except asyncio.TimeoutError:
        return {
            "stdout": "",
            "stderr": f"执行超时（超过 {timeout} 秒）",
            "exit_code": 124,
            "execution_time": timeout * 1000
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "exit_code": 1,
            "execution_time": 0
        }


async def execute_in_sandbox(
    code: str,
    language: str,
    timeout: int,
    stdin: str
) -> Dict[str, Any]:
    """在沙箱中执行代码"""
    
    start_time = time.time()
    
    # 根据语言选择执行器
    executors = {
        "python": ["python3", "-c"],
        "javascript": ["node", "-e"],
        "bash": ["bash", "-c"]
    }
    
    cmd = executors[language]
    
    # 创建子进程（实际生产中应使用 Docker 或其他沙箱）
    process = await asyncio.create_subprocess_exec(
        *cmd, code,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(input=stdin.encode() if stdin else None),
            timeout=timeout
        )
        
        execution_time = int((time.time() - start_time) * 1000)
        
        return {
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "exit_code": process.returncode or 0,
            "execution_time": execution_time
        }
    except asyncio.TimeoutError:
        process.kill()
        raise


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    code = inputs.get("code", "")
    language = inputs.get("language", "")
    return bool(code) and language in ["python", "javascript", "bash"]
`,
    configYaml: `# 代码执行技能配置
runtime:
  python_version: "3.11"
  timeout_seconds: 60
  memory_mb: 512

# 沙箱配置
sandbox:
  enabled: true
  network: false
  filesystem:
    read_only: true
  resources:
    max_cpu_percent: 50
    max_memory_mb: 256

security:
  require_confirmation: true
  blocked_imports:
    - os.system
    - subprocess
    - socket
`,
  },
  {
    id: "document-parser",
    name: "文档解析",
    description: "解析 PDF、Word、Excel 等文档格式",
    category: "文档处理",
    icon: <BookOpen className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "document-parser"
version: "1.0.0"
description: "解析多种格式文档，提取文本和结构化数据"
author: "Fance Studio"
permissions:
  - file_read
inputs:
  - name: file_url
    type: string
    description: 文档 URL 或路径
    required: true
  - name: format
    type: string
    description: 文档格式（pdf/docx/xlsx/csv）
    required: false
  - name: extract_tables
    type: boolean
    description: 是否提取表格
    required: false
    default: true
  - name: extract_images
    type: boolean
    description: 是否提取图片
    required: false
    default: false
outputs:
  - name: text
    type: string
    description: 提取的文本内容
  - name: tables
    type: array
    description: 提取的表格数据
  - name: metadata
    type: object
    description: 文档元数据
  - name: page_count
    type: number
    description: 页数
---

# 文档解析技能

## 能力描述

本技能支持解析多种文档格式：

1. **PDF 解析** - 提取文本、表格、图片
2. **Office 文档** - Word, Excel, PowerPoint
3. **结构化提取** - 保留标题层级和格式

## 支持的格式

- PDF (.pdf)
- Word (.docx, .doc)
- Excel (.xlsx, .xls)
- CSV (.csv)
- Markdown (.md)

## 使用示例

\`\`\`
用户: 解析这份 PDF 报告
助手: 
文档信息：
- 页数: 25
- 表格: 5 个
- 文本长度: 15,000 字

提取的内容：
第一章 概述...
\`\`\`
`,
    handlerCode: `"""
文档解析技能处理器
"""

import os
from typing import Dict, Any, List, Optional

# 支持的文档格式
SUPPORTED_FORMATS = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "md"]


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    解析文档
    
    Args:
        inputs: 包含 file_url, format, extract_tables, extract_images 的字典
        
    Returns:
        解析结果
    """
    file_url = inputs.get("file_url", "")
    file_format = inputs.get("format") or detect_format(file_url)
    extract_tables = inputs.get("extract_tables", True)
    extract_images = inputs.get("extract_images", False)
    
    if not file_url:
        return {"error": "文件路径不能为空"}
    
    if file_format not in SUPPORTED_FORMATS:
        return {"error": f"不支持的格式: {file_format}"}
    
    try:
        # 下载或读取文件
        content = await fetch_file(file_url)
        
        # 根据格式选择解析器
        parsers = {
            "pdf": parse_pdf,
            "docx": parse_docx,
            "xlsx": parse_xlsx,
            "csv": parse_csv,
            "md": parse_markdown
        }
        
        parser = parsers.get(file_format, parse_pdf)
        result = await parser(content, extract_tables, extract_images)
        
        return result
    except Exception as e:
        return {"error": str(e)}


def detect_format(file_url: str) -> str:
    """检测文件格式"""
    ext = file_url.split(".")[-1].lower()
    return ext if ext in SUPPORTED_FORMATS else "pdf"


async def fetch_file(file_url: str) -> bytes:
    """获取文件内容"""
    import httpx
    
    if file_url.startswith(("http://", "https://")):
        async with httpx.AsyncClient() as client:
            response = await client.get(file_url)
            return response.content
    else:
        with open(file_url, "rb") as f:
            return f.read()


async def parse_pdf(
    content: bytes,
    extract_tables: bool,
    extract_images: bool
) -> Dict[str, Any]:
    """解析 PDF 文档"""
    import pymupdf  # PyMuPDF
    
    doc = pymupdf.open(stream=content, filetype="pdf")
    
    text_parts = []
    tables = []
    
    for page in doc:
        text_parts.append(page.get_text())
        
        if extract_tables:
            # 简化的表格提取
            page_tables = page.find_tables()
            for table in page_tables:
                tables.append(table.extract())
    
    return {
        "text": "\\n\\n".join(text_parts),
        "tables": tables,
        "metadata": {
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "created": doc.metadata.get("creationDate", "")
        },
        "page_count": len(doc)
    }


async def parse_docx(
    content: bytes,
    extract_tables: bool,
    extract_images: bool
) -> Dict[str, Any]:
    """解析 Word 文档"""
    from io import BytesIO
    from docx import Document
    
    doc = Document(BytesIO(content))
    
    text_parts = [p.text for p in doc.paragraphs]
    tables = []
    
    if extract_tables:
        for table in doc.tables:
            table_data = []
            for row in table.rows:
                table_data.append([cell.text for cell in row.cells])
            tables.append(table_data)
    
    return {
        "text": "\\n".join(text_parts),
        "tables": tables,
        "metadata": {},
        "page_count": 1
    }


async def parse_xlsx(
    content: bytes,
    extract_tables: bool,
    extract_images: bool
) -> Dict[str, Any]:
    """解析 Excel 文档"""
    import pandas as pd
    from io import BytesIO
    
    excel_file = pd.ExcelFile(BytesIO(content))
    
    tables = []
    for sheet_name in excel_file.sheet_names:
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        tables.append({
            "sheet": sheet_name,
            "data": df.values.tolist(),
            "columns": df.columns.tolist()
        })
    
    return {
        "text": "",
        "tables": tables,
        "metadata": {"sheets": excel_file.sheet_names},
        "page_count": len(excel_file.sheet_names)
    }


async def parse_csv(
    content: bytes,
    extract_tables: bool,
    extract_images: bool
) -> Dict[str, Any]:
    """解析 CSV 文件"""
    import pandas as pd
    from io import BytesIO
    
    df = pd.read_csv(BytesIO(content))
    
    return {
        "text": "",
        "tables": [{
            "data": df.values.tolist(),
            "columns": df.columns.tolist()
        }],
        "metadata": {"rows": len(df), "columns": len(df.columns)},
        "page_count": 1
    }


async def parse_markdown(
    content: bytes,
    extract_tables: bool,
    extract_images: bool
) -> Dict[str, Any]:
    """解析 Markdown 文件"""
    text = content.decode("utf-8")
    
    return {
        "text": text,
        "tables": [],
        "metadata": {},
        "page_count": 1
    }


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    return bool(inputs.get("file_url"))
`,
    configYaml: `# 文档解析技能配置
runtime:
  python_version: "3.11"
  timeout_seconds: 120
  memory_mb: 1024

dependencies:
  - pymupdf>=1.23.0
  - python-docx>=0.8.11
  - pandas>=2.0.0
  - openpyxl>=3.1.0
  - httpx>=0.24.0

limits:
  max_file_size_mb: 50
  max_pages: 200
`,
  },
  // ============ 新增模版 ============
  {
    id: "weather-query",
    name: "天气查询",
    description: "查询全球城市的实时天气和预报信息",
    category: "信息检索",
    icon: <Cloud className="h-4 w-4" />,
    difficulty: "beginner",
    content: `---
name: "weather-query"
version: "1.0.0"
description: "查询城市天气信息，包括实时天气和未来预报"
author: "Fance Studio"
permissions:
  - internet_access
inputs:
  - name: city
    type: string
    description: 城市名称
    required: true
  - name: days
    type: number
    description: 预报天数（1-7）
    required: false
    default: 3
outputs:
  - name: current
    type: object
    description: 当前天气信息
  - name: forecast
    type: array
    description: 未来天气预报
---

# 天气查询技能

## 能力描述

查询全球城市的天气信息：
- 实时温度、湿度、风速
- 未来1-7天天气预报
- 空气质量指数

## 使用示例

\`\`\`
用户: 查询北京今天的天气
助手: 北京当前天气：晴，温度 25°C，湿度 45%
\`\`\`
`,
    handlerCode: `"""
天气查询技能处理器
"""

import os
import httpx
from typing import Dict, Any

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    city = inputs.get("city", "")
    days = min(inputs.get("days", 3), 7)
    
    if not city:
        return {"error": "请提供城市名称"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.weatherapi.com/v1/forecast.json",
                params={
                    "key": WEATHER_API_KEY,
                    "q": city,
                    "days": days,
                    "lang": "zh"
                }
            )
            response.raise_for_status()
            data = response.json()
        
        current = data.get("current", {})
        forecast = data.get("forecast", {}).get("forecastday", [])
        
        return {
            "current": {
                "temp_c": current.get("temp_c"),
                "condition": current.get("condition", {}).get("text"),
                "humidity": current.get("humidity"),
                "wind_kph": current.get("wind_kph")
            },
            "forecast": [
                {
                    "date": day.get("date"),
                    "max_temp": day.get("day", {}).get("maxtemp_c"),
                    "min_temp": day.get("day", {}).get("mintemp_c"),
                    "condition": day.get("day", {}).get("condition", {}).get("text")
                }
                for day in forecast
            ]
        }
    except Exception as e:
        return {"error": str(e)}

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("city"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 15
  memory_mb: 128

dependencies:
  - httpx>=0.24.0

environment:
  WEATHER_API_KEY: "\${WEATHER_API_KEY}"
`,
  },
  {
    id: "jwt-auth",
    name: "JWT 认证",
    description: "生成和验证 JWT Token 的认证技能",
    category: "安全",
    icon: <Lock className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "jwt-auth"
version: "1.0.0"
description: "JWT Token 生成与验证，支持自定义过期时间和声明"
author: "Fance OS"
permissions:
  - crypto
inputs:
  - name: action
    type: string
    description: 操作类型（generate/verify）
    required: true
  - name: payload
    type: object
    description: Token 载荷（生成时使用）
    required: false
  - name: token
    type: string
    description: 待验证的 Token
    required: false
  - name: expires_in
    type: number
    description: 过期时间（秒）
    required: false
    default: 3600
outputs:
  - name: token
    type: string
    description: 生成的 JWT Token
  - name: valid
    type: boolean
    description: Token 是否有效
  - name: payload
    type: object
    description: 解码后的载荷
---

# JWT 认证技能

## 能力描述

- 生成带过期时间的 JWT Token
- 验证 Token 有效性
- 解码 Token 载荷

## 安全说明

- 密钥从环境变量读取
- 支持 HS256 算法
`,
    handlerCode: `"""
JWT 认证技能处理器
"""

import os
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any

JWT_SECRET = os.getenv("JWT_SECRET", "")

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    action = inputs.get("action", "")
    
    if action == "generate":
        payload = inputs.get("payload", {})
        expires_in = inputs.get("expires_in", 3600)
        
        payload["exp"] = datetime.utcnow() + timedelta(seconds=expires_in)
        payload["iat"] = datetime.utcnow()
        
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        return {"token": token}
    
    elif action == "verify":
        token = inputs.get("token", "")
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return {"valid": True, "payload": decoded}
        except jwt.ExpiredSignatureError:
            return {"valid": False, "error": "Token 已过期"}
        except jwt.InvalidTokenError as e:
            return {"valid": False, "error": str(e)}
    
    return {"error": "无效的操作类型"}

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    action = inputs.get("action")
    if action == "generate":
        return bool(inputs.get("payload"))
    elif action == "verify":
        return bool(inputs.get("token"))
    return False
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 5
  memory_mb: 128

dependencies:
  - pyjwt>=2.8.0

environment:
  JWT_SECRET: "\${JWT_SECRET}"
`,
  },
  {
    id: "push-notification",
    name: "消息推送",
    description: "通过多渠道发送推送通知",
    category: "通知",
    icon: <Bell className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "push-notification"
version: "1.0.0"
description: "多渠道消息推送，支持邮件、短信、微信、钉钉"
author: "Fance Studio"
permissions:
  - internet_access
  - notification
inputs:
  - name: channel
    type: string
    description: 推送渠道（email/sms/wechat/dingtalk）
    required: true
  - name: recipient
    type: string
    description: 接收者标识
    required: true
  - name: title
    type: string
    description: 消息标题
    required: true
  - name: content
    type: string
    description: 消息内容
    required: true
outputs:
  - name: success
    type: boolean
    description: 发送是否成功
  - name: message_id
    type: string
    description: 消息ID
---

# 消息推送技能

## 支持渠道

- **邮件**: SMTP 发送
- **短信**: 阿里云/腾讯云短信
- **微信**: 企业微信机器人
- **钉钉**: 钉钉机器人

## MPLP 集成

发送消息前会触发确认流程。
`,
    handlerCode: `"""
消息推送技能处理器
"""

import os
import uuid
import httpx
from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    channel = inputs.get("channel", "")
    recipient = inputs.get("recipient", "")
    title = inputs.get("title", "")
    content = inputs.get("content", "")
    
    if channel == "dingtalk":
        return await send_dingtalk(recipient, title, content)
    elif channel == "wechat":
        return await send_wechat(recipient, title, content)
    elif channel == "email":
        return await send_email(recipient, title, content)
    
    return {"success": False, "error": "不支持的渠道"}

async def send_dingtalk(webhook: str, title: str, content: str) -> Dict[str, Any]:
    async with httpx.AsyncClient() as client:
        response = await client.post(webhook, json={
            "msgtype": "markdown",
            "markdown": {"title": title, "text": content}
        })
        return {
            "success": response.status_code == 200,
            "message_id": str(uuid.uuid4())
        }

async def send_wechat(webhook: str, title: str, content: str) -> Dict[str, Any]:
    async with httpx.AsyncClient() as client:
        response = await client.post(webhook, json={
            "msgtype": "markdown",
            "markdown": {"content": f"### {title}\\n{content}"}
        })
        return {
            "success": response.status_code == 200,
            "message_id": str(uuid.uuid4())
        }

async def send_email(recipient: str, title: str, content: str) -> Dict[str, Any]:
    # 使用 SMTP 发送邮件的示例
    import smtplib
    from email.mime.text import MIMEText
    
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    
    msg = MIMEText(content)
    msg["Subject"] = title
    msg["From"] = smtp_user
    msg["To"] = recipient
    
    try:
        with smtplib.SMTP(smtp_host, 587) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return {"success": True, "message_id": str(uuid.uuid4())}
    except Exception as e:
        return {"success": False, "error": str(e)}

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return all([
        inputs.get("channel"),
        inputs.get("recipient"),
        inputs.get("title"),
        inputs.get("content")
    ])
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 256

dependencies:
  - httpx>=0.24.0

environment:
  SMTP_HOST: "\${SMTP_HOST}"
  SMTP_USER: "\${SMTP_USER}"
  SMTP_PASS: "\${SMTP_PASS}"

mplp:
  require_confirmation: true
`,
  },
  {
    id: "payment-stripe",
    name: "Stripe 支付",
    description: "集成 Stripe 支付接口，支持创建支付和查询订单",
    category: "支付",
    icon: <CreditCard className="h-4 w-4" />,
    difficulty: "advanced",
    content: `---
name: "payment-stripe"
version: "1.0.0"
description: "Stripe 支付集成，支持创建支付意图、确认支付、退款"
author: "Agent Studio"
permissions:
  - payment
  - internet_access
inputs:
  - name: action
    type: string
    description: 操作类型（create_intent/confirm/refund/query）
    required: true
  - name: amount
    type: number
    description: 金额（分）
    required: false
  - name: currency
    type: string
    description: 货币代码
    required: false
    default: "cny"
  - name: payment_intent_id
    type: string
    description: 支付意图ID
    required: false
outputs:
  - name: client_secret
    type: string
    description: 客户端密钥
  - name: status
    type: string
    description: 支付状态
  - name: payment_intent_id
    type: string
    description: 支付意图ID
---

# Stripe 支付技能

## 支持操作

- 创建支付意图
- 确认支付
- 处理退款
- 查询订单状态

## 安全说明

所有支付操作需要 MPLP 确认。
`,
    handlerCode: `"""
Stripe 支付技能处理器
"""

import os
import stripe
from typing import Dict, Any

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    action = inputs.get("action", "")
    
    if action == "create_intent":
        amount = inputs.get("amount", 0)
        currency = inputs.get("currency", "cny")
        
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={"enabled": True}
        )
        return {
            "payment_intent_id": intent.id,
            "client_secret": intent.client_secret,
            "status": intent.status
        }
    
    elif action == "confirm":
        payment_intent_id = inputs.get("payment_intent_id", "")
        intent = stripe.PaymentIntent.confirm(payment_intent_id)
        return {
            "payment_intent_id": intent.id,
            "status": intent.status
        }
    
    elif action == "refund":
        payment_intent_id = inputs.get("payment_intent_id", "")
        refund = stripe.Refund.create(payment_intent=payment_intent_id)
        return {
            "refund_id": refund.id,
            "status": refund.status
        }
    
    elif action == "query":
        payment_intent_id = inputs.get("payment_intent_id", "")
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "payment_intent_id": intent.id,
            "status": intent.status,
            "amount": intent.amount
        }
    
    return {"error": "无效的操作"}

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    action = inputs.get("action")
    if action == "create_intent":
        return inputs.get("amount", 0) > 0
    return bool(inputs.get("payment_intent_id"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 256

dependencies:
  - stripe>=7.0.0

environment:
  STRIPE_SECRET_KEY: "\${STRIPE_SECRET_KEY}"

mplp:
  require_confirmation: true
  confirm_message: "确认执行支付操作？"
`,
  },
  {
    id: "geocoding",
    name: "地理编码",
    description: "地址与经纬度的相互转换",
    category: "地理",
    icon: <MapPin className="h-4 w-4" />,
    difficulty: "beginner",
    content: `---
name: "geocoding"
version: "1.0.0"
description: "地址与经纬度转换，支持正向和逆向地理编码"
author: "Fance OS"
permissions:
  - internet_access
inputs:
  - name: action
    type: string
    description: 操作类型（geocode/reverse）
    required: true
  - name: address
    type: string
    description: 地址（正向编码时使用）
    required: false
  - name: lat
    type: number
    description: 纬度（逆向编码时使用）
    required: false
  - name: lng
    type: number
    description: 经度（逆向编码时使用）
    required: false
outputs:
  - name: lat
    type: number
    description: 纬度
  - name: lng
    type: number
    description: 经度
  - name: formatted_address
    type: string
    description: 格式化地址
---

# 地理编码技能

## 功能

- 正向编码：地址 → 经纬度
- 逆向编码：经纬度 → 地址
`,
    handlerCode: `"""
地理编码技能处理器
"""

import os
import httpx
from typing import Dict, Any

GEOCODING_API_KEY = os.getenv("GEOCODING_API_KEY", "")

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    action = inputs.get("action", "")
    
    async with httpx.AsyncClient() as client:
        if action == "geocode":
            address = inputs.get("address", "")
            response = await client.get(
                "https://restapi.amap.com/v3/geocode/geo",
                params={"key": GEOCODING_API_KEY, "address": address}
            )
            data = response.json()
            if data.get("geocodes"):
                location = data["geocodes"][0]["location"].split(",")
                return {
                    "lng": float(location[0]),
                    "lat": float(location[1]),
                    "formatted_address": data["geocodes"][0]["formatted_address"]
                }
        
        elif action == "reverse":
            lat = inputs.get("lat", 0)
            lng = inputs.get("lng", 0)
            response = await client.get(
                "https://restapi.amap.com/v3/geocode/regeo",
                params={"key": GEOCODING_API_KEY, "location": f"{lng},{lat}"}
            )
            data = response.json()
            if data.get("regeocode"):
                return {
                    "lat": lat,
                    "lng": lng,
                    "formatted_address": data["regeocode"]["formatted_address"]
                }
    
    return {"error": "地理编码失败"}

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    action = inputs.get("action")
    if action == "geocode":
        return bool(inputs.get("address"))
    elif action == "reverse":
        return inputs.get("lat") is not None and inputs.get("lng") is not None
    return False
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 10
  memory_mb: 128

dependencies:
  - httpx>=0.24.0

environment:
  GEOCODING_API_KEY: "\${GEOCODING_API_KEY}"
`,
  },
  {
    id: "speech-to-text",
    name: "语音转文字",
    description: "将音频文件转换为文字",
    category: "AI",
    icon: <Mic className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "speech-to-text"
version: "1.0.0"
description: "使用 AI 模型将语音转换为文字"
author: "Agent Studio"
permissions:
  - ai_inference
  - file_read
inputs:
  - name: audio_url
    type: string
    description: 音频文件URL
    required: true
  - name: language
    type: string
    description: 语言代码
    required: false
    default: "zh"
outputs:
  - name: text
    type: string
    description: 转换后的文字
  - name: duration
    type: number
    description: 音频时长（秒）
---

# 语音转文字技能

## 支持格式

- MP3, WAV, M4A, FLAC
- 最大时长：30分钟
`,
    handlerCode: `"""
语音转文字技能处理器
"""

import os
import httpx
from typing import Dict, Any

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    audio_url = inputs.get("audio_url", "")
    language = inputs.get("language", "zh")
    
    # 下载音频文件
    async with httpx.AsyncClient() as client:
        audio_response = await client.get(audio_url)
        audio_data = audio_response.content
    
    # 调用 Whisper API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            files={"file": ("audio.mp3", audio_data)},
            data={"model": "whisper-1", "language": language}
        )
        data = response.json()
    
    return {
        "text": data.get("text", ""),
        "duration": data.get("duration", 0)
    }

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("audio_url"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 120
  memory_mb: 512

dependencies:
  - httpx>=0.24.0

environment:
  OPENAI_API_KEY: "\${OPENAI_API_KEY}"

limits:
  max_audio_duration_seconds: 1800
`,
  },
  {
    id: "video-thumbnail",
    name: "视频缩略图",
    description: "从视频中提取缩略图和关键帧",
    category: "媒体",
    icon: <Video className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "video-thumbnail"
version: "1.0.0"
description: "从视频提取缩略图、关键帧和元数据"
author: "Fance OS"
permissions:
  - file_read
  - file_write
inputs:
  - name: video_url
    type: string
    description: 视频URL
    required: true
  - name: timestamp
    type: number
    description: 截取时间点（秒）
    required: false
    default: 1
  - name: count
    type: number
    description: 截取数量
    required: false
    default: 1
outputs:
  - name: thumbnails
    type: array
    description: 缩略图URL列表
  - name: duration
    type: number
    description: 视频时长
  - name: resolution
    type: object
    description: 视频分辨率
---

# 视频缩略图技能

## 功能

- 指定时间点截图
- 批量提取关键帧
- 获取视频元数据
`,
    handlerCode: `"""
视频缩略图技能处理器
"""

import os
import tempfile
import subprocess
from typing import Dict, Any, List

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    video_url = inputs.get("video_url", "")
    timestamp = inputs.get("timestamp", 1)
    count = inputs.get("count", 1)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = f"{tmpdir}/video.mp4"
        
        # 下载视频
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(video_url)
            with open(video_path, "wb") as f:
                f.write(response.content)
        
        # 获取视频信息
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", 
             "-show_format", "-show_streams", video_path],
            capture_output=True, text=True
        )
        import json
        info = json.loads(probe.stdout)
        duration = float(info["format"]["duration"])
        
        # 提取缩略图
        thumbnails = []
        for i in range(count):
            ts = timestamp + i * (duration / count)
            output = f"{tmpdir}/thumb_{i}.jpg"
            subprocess.run([
                "ffmpeg", "-ss", str(ts), "-i", video_path,
                "-vframes", "1", "-q:v", "2", output
            ])
            # 这里应该上传到存储服务并返回URL
            thumbnails.append(f"thumbnail_{i}.jpg")
        
        return {
            "thumbnails": thumbnails,
            "duration": duration,
            "resolution": {
                "width": info["streams"][0].get("width", 0),
                "height": info["streams"][0].get("height", 0)
            }
        }

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("video_url"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 180
  memory_mb: 1024

dependencies:
  - httpx>=0.24.0

system_dependencies:
  - ffmpeg
  - ffprobe

limits:
  max_video_size_mb: 500
`,
  },
  {
    id: "data-visualization",
    name: "数据可视化",
    description: "根据数据生成图表图片",
    category: "数据分析",
    icon: <BarChart3 className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "data-visualization"
version: "1.0.0"
description: "根据数据生成柱状图、折线图、饼图等可视化图表"
author: "Agent Studio"
permissions:
  - file_write
inputs:
  - name: chart_type
    type: string
    description: 图表类型（bar/line/pie/scatter）
    required: true
  - name: data
    type: object
    description: 图表数据
    required: true
  - name: title
    type: string
    description: 图表标题
    required: false
  - name: width
    type: number
    description: 图表宽度
    required: false
    default: 800
  - name: height
    type: number
    description: 图表高度
    required: false
    default: 600
outputs:
  - name: image_url
    type: string
    description: 生成的图表图片URL
---

# 数据可视化技能

## 支持图表

- 柱状图 (bar)
- 折线图 (line)
- 饼图 (pie)
- 散点图 (scatter)
`,
    handlerCode: `"""
数据可视化技能处理器
"""

import io
import base64
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    chart_type = inputs.get("chart_type", "bar")
    data = inputs.get("data", {})
    title = inputs.get("title", "")
    width = inputs.get("width", 800)
    height = inputs.get("height", 600)
    
    plt.figure(figsize=(width/100, height/100))
    plt.rcParams['font.sans-serif'] = ['SimHei']
    plt.rcParams['axes.unicode_minus'] = False
    
    labels = data.get("labels", [])
    values = data.get("values", [])
    
    if chart_type == "bar":
        plt.bar(labels, values)
    elif chart_type == "line":
        plt.plot(labels, values, marker='o')
    elif chart_type == "pie":
        plt.pie(values, labels=labels, autopct='%1.1f%%')
    elif chart_type == "scatter":
        x = data.get("x", [])
        y = data.get("y", [])
        plt.scatter(x, y)
    
    if title:
        plt.title(title)
    
    plt.tight_layout()
    
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100)
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode()
    plt.close()
    
    return {
        "image_url": f"data:image/png;base64,{image_base64}"
    }

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("chart_type") and inputs.get("data"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 512

dependencies:
  - matplotlib>=3.7.0
  - numpy>=1.24.0
`,
  },
  {
    id: "git-operations",
    name: "Git 操作",
    description: "执行 Git 仓库的常见操作",
    category: "开发工具",
    icon: <GitBranch className="h-4 w-4" />,
    difficulty: "advanced",
    content: `---
name: "git-operations"
version: "1.0.0"
description: "Git 仓库操作，支持克隆、提交、推送等"
author: "Fance OS"
permissions:
  - file_read
  - file_write
  - internet_access
inputs:
  - name: action
    type: string
    description: 操作类型（clone/commit/push/pull/status）
    required: true
  - name: repo_url
    type: string
    description: 仓库URL
    required: false
  - name: branch
    type: string
    description: 分支名
    required: false
    default: "main"
  - name: message
    type: string
    description: 提交信息
    required: false
outputs:
  - name: success
    type: boolean
    description: 操作是否成功
  - name: output
    type: string
    description: 命令输出
---

# Git 操作技能

## 支持操作

- clone: 克隆仓库
- commit: 提交更改
- push: 推送到远程
- pull: 拉取更新
- status: 查看状态
`,
    handlerCode: `"""
Git 操作技能处理器
"""

import os
import subprocess
from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    action = inputs.get("action", "")
    repo_url = inputs.get("repo_url", "")
    branch = inputs.get("branch", "main")
    message = inputs.get("message", "")
    work_dir = inputs.get("work_dir", "/tmp/repo")
    
    try:
        if action == "clone":
            result = subprocess.run(
                ["git", "clone", "-b", branch, repo_url, work_dir],
                capture_output=True, text=True
            )
        elif action == "commit":
            subprocess.run(["git", "add", "."], cwd=work_dir)
            result = subprocess.run(
                ["git", "commit", "-m", message],
                cwd=work_dir, capture_output=True, text=True
            )
        elif action == "push":
            result = subprocess.run(
                ["git", "push", "origin", branch],
                cwd=work_dir, capture_output=True, text=True
            )
        elif action == "pull":
            result = subprocess.run(
                ["git", "pull", "origin", branch],
                cwd=work_dir, capture_output=True, text=True
            )
        elif action == "status":
            result = subprocess.run(
                ["git", "status"],
                cwd=work_dir, capture_output=True, text=True
            )
        else:
            return {"success": False, "error": "无效的操作"}
        
        return {
            "success": result.returncode == 0,
            "output": result.stdout or result.stderr
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    action = inputs.get("action")
    if action == "clone":
        return bool(inputs.get("repo_url"))
    elif action == "commit":
        return bool(inputs.get("message"))
    return action in ["push", "pull", "status"]
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 120
  memory_mb: 512

system_dependencies:
  - git

environment:
  GIT_TOKEN: "\${GIT_TOKEN}"
`,
  },
  {
    id: "webhook-trigger",
    name: "Webhook 触发器",
    description: "发送和接收 Webhook 请求",
    category: "集成",
    icon: <Webhook className="h-4 w-4" />,
    difficulty: "beginner",
    content: `---
name: "webhook-trigger"
version: "1.0.0"
description: "发送 Webhook 请求到指定端点"
author: "Agent Studio"
permissions:
  - internet_access
inputs:
  - name: url
    type: string
    description: Webhook URL
    required: true
  - name: method
    type: string
    description: HTTP 方法
    required: false
    default: "POST"
  - name: payload
    type: object
    description: 请求体
    required: false
  - name: headers
    type: object
    description: 请求头
    required: false
outputs:
  - name: status_code
    type: number
    description: HTTP 状态码
  - name: response
    type: object
    description: 响应内容
---

# Webhook 触发器技能

## 功能

- 支持 GET/POST/PUT/DELETE
- 自定义请求头
- JSON 请求体
`,
    handlerCode: `"""
Webhook 触发器技能处理器
"""

import httpx
from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    url = inputs.get("url", "")
    method = inputs.get("method", "POST").upper()
    payload = inputs.get("payload", {})
    headers = inputs.get("headers", {})
    
    async with httpx.AsyncClient() as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            response = await client.post(url, json=payload, headers=headers)
        elif method == "PUT":
            response = await client.put(url, json=payload, headers=headers)
        elif method == "DELETE":
            response = await client.delete(url, headers=headers)
        else:
            return {"error": "不支持的 HTTP 方法"}
    
    try:
        response_data = response.json()
    except:
        response_data = response.text
    
    return {
        "status_code": response.status_code,
        "response": response_data
    }

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("url"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 128

dependencies:
  - httpx>=0.24.0
`,
  },
  // ==================== 新增 6 个官方技能模板 ====================
  {
    id: "canvas-design",
    name: "视觉设计哲学",
    description: "使用设计哲学创建美丽的视觉艺术作品，支持海报、艺术品、设计稿等静态作品",
    category: "创意设计",
    icon: <Image className="h-4 w-4" />,
    difficulty: "advanced",
    content: `---
name: "canvas-design"
version: "1.0.0"
description: "创建设计哲学并通过视觉表达 - 输出 .md, .pdf, .png 文件"
author: "Fance OS"
permissions:
  - file_write
  - image_generation
inputs:
  - name: concept
    type: string
    description: 设计概念或主题
    required: true
  - name: style
    type: string
    description: 设计风格偏好
    required: false
outputs:
  - name: philosophy
    type: string
    description: 设计哲学文档 (.md)
  - name: artwork
    type: file
    description: 视觉作品 (.pdf 或 .png)
---

# 视觉设计哲学技能

## 设计哲学创建

创建一个视觉哲学（不是布局或模板），通过以下方式解读：
- 形式、空间、色彩、构图
- 图像、图形、形状、图案
- 极简文字作为视觉点缀

## 核心理解

**输入**: 用户提供的微妙指示或灵感
**创建**: 一个设计哲学/美学运动
**输出**: 90% 视觉设计 + 10% 必要文字的艺术品

## 如何生成视觉哲学

1. **命名运动** (1-2 词): "Brutalist Joy" / "Chromatic Silence" / "Metabolist Dreams"

2. **阐述哲学** (4-6 段落):
   - 空间与形式
   - 色彩与材质
   - 比例与节奏
   - 构图与平衡
   - 视觉层级

## 哲学示例

### "Concrete Poetry" 哲学
通过纪念碑式的形式和大胆的几何进行交流。

### "Chromatic Language" 哲学
色彩作为主要信息系统。

### "Analog Meditation" 哲学
通过纹理和呼吸空间进行安静的视觉冥想。
`,
    handlerCode: `"""
视觉设计哲学技能处理器
"""

from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    concept = inputs.get("concept", "")
    style = inputs.get("style", "modern")
    
    philosophy = f"# Design Philosophy: {concept}\\n\\nBased on {style} aesthetics."
    
    return {
        "philosophy": philosophy,
        "status": "Philosophy created"
    }

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("concept"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 120
  memory_mb: 512

dependencies:
  - pillow>=10.0.0
`,
  },
  {
    id: "brand-guidelines",
    name: "品牌规范应用",
    description: "应用品牌颜色、字体和视觉规范到任何设计作品",
    category: "品牌设计",
    icon: <Shield className="h-4 w-4" />,
    difficulty: "beginner",
    content: `---
name: "brand-guidelines"
version: "1.0.0"
description: "应用品牌视觉规范到设计作品"
author: "Agent Studio"
permissions:
  - file_read
  - file_write
inputs:
  - name: file_path
    type: string
    description: 需要应用品牌规范的文件路径
    required: true
outputs:
  - name: styled_file
    type: file
    description: 应用品牌规范后的文件
---

# 品牌规范应用技能

## 品牌颜色

| 颜色 | 值 | 用途 |
|------|-----|------|
| Dark | #141413 | 主文本和深色背景 |
| Light | #faf9f5 | 浅色背景 |
| Orange | #d97757 | 主强调色 |
| Blue | #6a9bcc | 次强调色 |
| Green | #788c5d | 第三强调色 |

## 字体

- **标题**: Poppins (Arial 备选)
- **正文**: Lora (Georgia 备选)
`,
    handlerCode: `"""
品牌规范应用技能处理器
"""

from typing import Dict, Any

BRAND_COLORS = {
    "dark": "#141413",
    "light": "#faf9f5",
    "accent_orange": "#d97757",
    "accent_blue": "#6a9bcc",
    "accent_green": "#788c5d",
}

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    file_path = inputs.get("file_path", "")
    return {
        "status": "Brand guidelines applied",
        "colors_applied": BRAND_COLORS,
        "file_path": file_path
    }

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("file_path"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 60
  memory_mb: 256

dependencies:
  - python-pptx>=0.6.21
`,
  },
  {
    id: "artifacts-builder",
    name: "Artifacts 构建器",
    description: "使用 React + Tailwind + shadcn/ui 构建复杂的多组件 HTML Artifacts",
    category: "开发工具",
    icon: <Code className="h-4 w-4" />,
    difficulty: "advanced",
    content: `---
name: "artifacts-builder"
version: "1.0.0"
description: "构建强大的前端 Claude.ai Artifacts"
author: "Fance OS"
permissions:
  - file_write
  - shell_execute
inputs:
  - name: project_name
    type: string
    description: 项目名称
    required: true
outputs:
  - name: bundle_html
    type: file
    description: 打包后的单 HTML 文件
---

# Artifacts 构建器技能

**技术栈**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui

## 快速开始

1. 初始化项目: \`scripts/init-artifact.sh <project-name>\`
2. 开发 artifact
3. 打包: \`scripts/bundle-artifact.sh\`
4. 分享 bundle.html

## 项目特性

- ✅ React + TypeScript (via Vite)
- ✅ Tailwind CSS + shadcn/ui 主题系统
- ✅ 40+ shadcn/ui 组件预安装
- ✅ Parcel 打包配置
`,
    handlerCode: `"""
Artifacts 构建器技能处理器
"""

from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    project_name = inputs.get("project_name", "my-artifact")
    
    return {
        "status": "Project initialized",
        "project_name": project_name,
        "next_steps": [
            f"cd {project_name}",
            "Edit src/App.tsx",
            "Run scripts/bundle-artifact.sh"
        ]
    }

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("project_name"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 300
  memory_mb: 1024

dependencies:
  - nodejs>=18.0.0
`,
  },
  {
    id: "content-research-writer",
    name: "研究写作助手",
    description: "协助写作高质量内容，包括研究、引用、大纲、反馈迭代",
    category: "内容创作",
    icon: <BookOpen className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "content-research-writer"
version: "1.0.0"
description: "协作式写作伙伴，帮助研究、大纲、起草和优化内容"
author: "Fance OS"
permissions:
  - internet_access
  - file_read
  - file_write
inputs:
  - name: topic
    type: string
    description: 写作主题
    required: true
  - name: content_type
    type: string
    description: 内容类型 (article/blog/tutorial)
    required: false
outputs:
  - name: outline
    type: string
    description: 内容大纲
  - name: research
    type: array
    description: 研究资料和引用
---

# 研究写作助手技能

## 功能

1. **协作式大纲**: 将想法结构化为连贯的大纲
2. **研究辅助**: 查找相关信息并添加引用
3. **钩子改进**: 加强开头以吸引注意力
4. **章节反馈**: 在写作过程中逐节审阅
5. **语气保持**: 维持你的写作风格和语调

## 工作流程

1. 从大纲开始
2. 研究和添加引用
3. 改进钩子
4. 获取章节反馈
5. 优化打磨
`,
    handlerCode: `"""
研究写作助手技能处理器
"""

from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    topic = inputs.get("topic", "")
    content_type = inputs.get("content_type", "article")
    
    outline = f"# {content_type.title()}: {topic}\\n\\n## Introduction\\n\\n## Main Points\\n\\n## Conclusion"
    
    return {
        "outline": outline,
        "research": [],
        "next_steps": ["Review outline", "Start writing", "Get feedback"]
    }

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("topic"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 60
  memory_mb: 256

dependencies:
  - httpx>=0.24.0
`,
  },
  {
    id: "pdf-toolkit",
    name: "PDF 处理工具包",
    description: "全面的 PDF 处理能力：文本提取、表格提取、合并拆分、表单填写",
    category: "文档处理",
    icon: <FileText className="h-4 w-4" />,
    difficulty: "intermediate",
    content: `---
name: "pdf-toolkit"
version: "1.0.0"
description: "全面的 PDF 处理操作工具包"
author: "Fance OS"
permissions:
  - file_read
  - file_write
inputs:
  - name: operation
    type: string
    description: 操作类型 (extract_text/extract_tables/merge/split)
    required: true
  - name: file_path
    type: string
    description: PDF 文件路径
    required: true
outputs:
  - name: result
    type: any
    description: 操作结果
---

# PDF 处理工具包

## 支持的操作

- **extract_text**: 提取 PDF 文本
- **extract_tables**: 提取 PDF 表格
- **merge**: 合并多个 PDF
- **split**: 拆分 PDF 为单页
- **fill_form**: 填写 PDF 表单

## 使用示例

\`\`\`python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("document.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text()
\`\`\`
`,
    handlerCode: `"""
PDF 处理工具包技能处理器
"""

from typing import Dict, Any
from pypdf import PdfReader, PdfWriter

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    operation = inputs.get("operation", "extract_text")
    file_path = inputs.get("file_path", "")
    
    if operation == "extract_text":
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return {"text": text, "page_count": len(reader.pages)}
    
    return {"error": f"Operation {operation} not implemented"}

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("operation") and inputs.get("file_path"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 120
  memory_mb: 512

dependencies:
  - pypdf>=4.0.0
  - pdfplumber>=0.10.0
`,
  },
  {
    id: "skill-template",
    name: "空白技能模板",
    description: "创建自定义技能的起始模板，包含基础结构",
    category: "模板",
    icon: <Sparkles className="h-4 w-4" />,
    difficulty: "beginner",
    content: `---
name: "my-custom-skill"
version: "1.0.0"
description: "在此处添加技能描述"
author: "Your Name"
permissions:
  - read
inputs:
  - name: input_param
    type: string
    description: 输入参数描述
    required: true
outputs:
  - name: result
    type: any
    description: 输出结果描述
---

# 自定义技能

## 概述

在这里描述你的技能做什么。

## 使用方法

描述如何使用这个技能。
`,
    handlerCode: `"""
自定义技能处理器模板
"""

from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    input_param = inputs.get("input_param", "")
    
    # 在这里实现你的逻辑
    result = f"Processed: {input_param}"
    
    return {"result": result, "status": "success"}

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    return bool(inputs.get("input_param"))
`,
    configYaml: `runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 128

dependencies:
  # 添加你需要的依赖
`,
  },
];

interface SkillTemplatesDialogProps {
  onSelectTemplate: (template: SkillTemplate) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// AI 生成进度步骤
const generationSteps = [
  { id: "analyze", label: "分析需求", icon: Search },
  { id: "design", label: "设计架构", icon: GitBranch },
  { id: "generate", label: "生成代码", icon: Code },
  { id: "validate", label: "验证输出", icon: Shield },
];

// AI 生成模版组件
function AIGenerateTemplate({
  onGenerate,
}: {
  onGenerate: (template: SkillTemplate) => void;
}) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedTemplate, setGeneratedTemplate] = useState<SkillTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const simulateProgress = () => {
    setCurrentStep(0);
    const stepDurations = [800, 1200, 2000, 800];
    let totalDelay = 0;
    
    stepDurations.forEach((duration, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
      }, totalDelay);
      totalDelay += duration;
    });
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({
        title: "请输入技能描述",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedTemplate(null);
    setShowPreview(false);
    simulateProgress();

    try {
      const { data, error } = await supabase.functions.invoke("generate-skill-template", {
        body: { description, category, difficulty },
      });

      if (error) throw error;

      const template: SkillTemplate = {
        id: `ai-generated-${Date.now()}`,
        name: data.name || "AI 生成技能",
        description: data.description || description,
        category: category || "自定义",
        icon: <Sparkles className="h-4 w-4" />,
        difficulty,
        content: data.skillMd || "",
        handlerCode: data.handlerPy || "",
        configYaml: data.configYaml || "",
      };

      setCurrentStep(4);
      setGeneratedTemplate(template);
      setShowPreview(true);

      toast({
        title: "技能模版生成成功",
        description: `已生成 ${template.name}`,
      });
    } catch (error) {
      console.error("Generate template error:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
      setCurrentStep(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseTemplate = () => {
    if (generatedTemplate) {
      onGenerate(generatedTemplate);
    }
  };

  const handleReset = () => {
    setGeneratedTemplate(null);
    setShowPreview(false);
    setCurrentStep(0);
    setDescription("");
    setCategory("");
    setDifficulty("intermediate");
  };

  const difficultyConfig = {
    beginner: { label: "入门", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
    intermediate: { label: "中级", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
    advanced: { label: "高级", className: "bg-rose-500/20 text-rose-400 border-rose-500/40" },
  };

  // 结果预览界面
  if (showPreview && generatedTemplate) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* 成功提示 */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/20">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-400">生成完成</h3>
              <p className="text-sm text-muted-foreground">AI 已成功生成技能模版，请预览确认</p>
            </div>
          </div>
        </div>

        {/* 模版预览卡片 */}
        <div className="p-4 rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/80">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary ring-1 ring-primary/20">
              {generatedTemplate.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{generatedTemplate.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{generatedTemplate.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${difficultyConfig[generatedTemplate.difficulty].className}`}>
                  {difficultyConfig[generatedTemplate.difficulty].label}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/15 text-primary border border-primary/30">
                  {generatedTemplate.category}
                </span>
              </div>
            </div>
          </div>

          {/* 代码预览 */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              SKILL.md 预览
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/50 max-h-32 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {generatedTemplate.content.slice(0, 500)}
                {generatedTemplate.content.length > 500 && "..."}
              </pre>
            </div>
          </div>

          {/* 文件列表 */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="text-xs font-medium text-muted-foreground mb-2">包含文件</div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs">
                <FileText className="h-3 w-3 text-blue-400" />
                SKILL.md
              </span>
              {generatedTemplate.handlerCode && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs">
                  <Code className="h-3 w-3 text-green-400" />
                  handler.py
                </span>
              )}
              {generatedTemplate.configYaml && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs">
                  <FileText className="h-3 w-3 text-amber-400" />
                  config.yaml
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            重新生成
          </Button>
          <Button onClick={handleUseTemplate} className="flex-1">
            <Zap className="h-4 w-4 mr-2" />
            使用此模版
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI 介绍 */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/20 animate-pulse">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="font-semibold">AI 智能生成</span>
            <p className="text-sm text-muted-foreground">
              描述你需要的技能功能，AI 将自动生成完整的模版文件
            </p>
          </div>
        </div>
      </div>

      {/* 生成进度 */}
      {isGenerating && (
        <div className="p-4 rounded-xl border border-border/60 bg-card/50 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">生成进度</span>
            <span className="text-xs text-muted-foreground">
              {currentStep}/{generationSteps.length}
            </span>
          </div>
          <div className="space-y-2">
            {generationSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep - 1;
              const isCompleted = index < currentStep - 1;
              const isPending = index >= currentStep;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                    isActive 
                      ? "bg-primary/10 border border-primary/30" 
                      : isCompleted 
                      ? "bg-emerald-500/10" 
                      : "bg-muted/30"
                  }`}
                >
                  <div className={`p-1.5 rounded-full transition-colors ${
                    isActive 
                      ? "bg-primary/20 text-primary" 
                      : isCompleted 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCompleted ? (
                      <Shield className="h-3.5 w-3.5" />
                    ) : (
                      <StepIcon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    isActive ? "text-primary font-medium" : isCompleted ? "text-emerald-400" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 输入表单 */}
      {!isGenerating && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm">技能描述 *</Label>
            <Textarea
              placeholder="例如：一个可以调用 OpenAI API 进行图片识别的技能，支持识别图片中的物体、文字和场景..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-24 mt-1.5 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">类别（可选）</Label>
              <Input
                placeholder="例如：AI、数据处理"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">难度</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">入门</SelectItem>
                  <SelectItem value="intermediate">中级</SelectItem>
                  <SelectItem value="advanced">高级</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full h-10 font-medium"
            onClick={handleGenerate}
            disabled={!description.trim()}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            生成技能模版
          </Button>
        </div>
      )}
    </div>
  );
}

export function SkillTemplatesDialog({
  onSelectTemplate,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: SkillTemplatesDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [activeTab, setActiveTab] = useState("library");

  const categories = [
    "all",
    ...Array.from(new Set(skillTemplates.map((t) => t.category))),
  ];

  const filteredTemplates =
    selectedCategory === "all"
      ? skillTemplates
      : skillTemplates.filter((t) => t.category === selectedCategory);

  const handleSelect = (template: SkillTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  const difficultyConfig = {
    beginner: {
      label: "入门",
      className: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10",
      dotColor: "bg-emerald-400",
    },
    intermediate: {
      label: "中级", 
      className: "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/10",
      dotColor: "bg-amber-400",
    },
    advanced: {
      label: "高级",
      className: "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/10",
      dotColor: "bg-rose-400",
    },
  };

  const categoryColors: Record<string, string> = {
    "核心自主": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    "信息检索": "bg-sky-500/15 text-sky-400 border-sky-500/30",
    "数据操作": "bg-violet-500/15 text-violet-400 border-violet-500/30",
    "NLP": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    "工具": "bg-teal-500/15 text-teal-400 border-teal-500/30",
    "API": "bg-orange-500/15 text-orange-400 border-orange-500/30",
    "安全": "bg-red-500/15 text-red-400 border-red-500/30",
    "AI": "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            技能模板库
          </DialogTitle>
          <DialogDescription>
            选择预设模版或使用 AI 生成自定义技能
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              模版库 ({skillTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="ai-generate" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI 生成
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 flex flex-col min-h-0 overflow-hidden">
            <div className="flex gap-2 flex-wrap mb-4 flex-shrink-0">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  className="h-7 text-xs"
                >
                  {cat === "all" ? "全部" : cat}
                </Button>
              ))}
            </div>

            <ScrollArea className="flex-1 h-[450px] pr-4">
              <div className="grid grid-cols-2 gap-4">
                {filteredTemplates.map((template) => {
                  const diffConfig = difficultyConfig[template.difficulty];
                  const catColor = categoryColors[template.category] || "bg-muted/50 text-muted-foreground border-border";
                  
                  return (
                    <div
                      key={template.id}
                      className="p-4 rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/80 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                      onClick={() => handleSelect(template)}
                    >
                      {/* Gradient accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex-shrink-0 ring-1 ring-primary/20">
                          {template.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm text-foreground truncate">
                              {template.name}
                            </h3>
                            {(template as any).isNative && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                NanoClaw
                              </span>
                            )}
                          </div>
                          
                          {/* Prominent difficulty badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${diffConfig.className}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${diffConfig.dotColor} animate-pulse`} />
                              {diffConfig.label}
                            </span>
                            
                            {/* Category tag */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${catColor}`}>
                              {template.category}
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                            {template.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                        <Button size="sm" className="w-full h-8 text-xs font-medium shadow-sm">
                          <Zap className="h-3 w-3 mr-1.5" />
                          使用此模板
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai-generate" className="mt-4">
            <AIGenerateTemplate onGenerate={handleSelect} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
