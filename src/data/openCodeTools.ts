/**
 * OpenCode MCP Tool Definitions
 * Maps OpenCode operations to MCP-compatible tool schemas
 */

import { Terminal, FolderOpen, FileEdit, Search, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type OpenCodeMode = 'plan' | 'build';

export interface MCPToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'filesystem' | 'terminal' | 'search';
  icon: LucideIcon;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      default?: unknown;
      enum?: string[];
    }>;
    required: string[];
  };
  permissions: ('read' | 'write' | 'compute')[];
  modeRestriction: OpenCodeMode | 'any';
  requiresApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export const OPENCODE_TOOLS: MCPToolDefinition[] = [
  {
    id: 'opencode-list-files',
    name: 'List Files',
    description: 'Browse directory structure (PLAN mode)',
    category: 'filesystem',
    icon: FolderOpen,
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
        recursive: { type: 'boolean', default: false, description: 'List recursively' },
        pattern: { type: 'string', description: 'Glob pattern filter' }
      },
      required: ['path']
    },
    permissions: ['read'],
    modeRestriction: 'any',
    requiresApproval: false,
    riskLevel: 'low'
  },
  {
    id: 'opencode-read-file',
    name: 'Read File',
    description: 'Read file contents (PLAN mode)',
    category: 'filesystem',
    icon: FolderOpen,
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
        encoding: { type: 'string', default: 'utf-8', description: 'File encoding' }
      },
      required: ['path']
    },
    permissions: ['read'],
    modeRestriction: 'any',
    requiresApproval: false,
    riskLevel: 'low'
  },
  {
    id: 'opencode-write-file',
    name: 'Write File',
    description: 'Create or overwrite file (BUILD mode only)',
    category: 'filesystem',
    icon: FileEdit,
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'File content' },
        createDirs: { type: 'boolean', default: true, description: 'Create parent directories' }
      },
      required: ['path', 'content']
    },
    permissions: ['write'],
    modeRestriction: 'build',
    requiresApproval: true,
    riskLevel: 'medium'
  },
  {
    id: 'opencode-edit-file',
    name: 'Edit File',
    description: 'Patch existing file (BUILD mode only)',
    category: 'filesystem',
    icon: FileEdit,
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to edit' },
        search: { type: 'string', description: 'Content to find' },
        replace: { type: 'string', description: 'Content to replace with' },
        all: { type: 'boolean', default: false, description: 'Replace all occurrences' }
      },
      required: ['path', 'search', 'replace']
    },
    permissions: ['write'],
    modeRestriction: 'build',
    requiresApproval: true,
    riskLevel: 'medium'
  },
  {
    id: 'opencode-run-bash',
    name: 'Run Terminal Command',
    description: 'Execute shell command (BUILD mode only)',
    category: 'terminal',
    icon: Terminal,
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory' },
        timeout: { type: 'number', default: 30000, description: 'Timeout in milliseconds' },
        env: { type: 'object', description: 'Environment variables' }
      },
      required: ['command']
    },
    permissions: ['compute', 'write'],
    modeRestriction: 'build',
    requiresApproval: true,
    riskLevel: 'high'
  },
  {
    id: 'opencode-search-code',
    name: 'Search Code',
    description: 'Search codebase with regex (PLAN mode)',
    category: 'search',
    icon: Search,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query or regex pattern' },
        path: { type: 'string', description: 'Directory to search in' },
        filePattern: { type: 'string', description: 'File pattern to match (e.g., *.ts)' },
        caseSensitive: { type: 'boolean', default: false, description: 'Case sensitive search' }
      },
      required: ['query']
    },
    permissions: ['read'],
    modeRestriction: 'any',
    requiresApproval: false,
    riskLevel: 'low'
  }
];

/**
 * Get tools available for a specific mode
 */
export function getToolsForMode(mode: OpenCodeMode): MCPToolDefinition[] {
  return OPENCODE_TOOLS.filter(
    tool => tool.modeRestriction === 'any' || tool.modeRestriction === mode
  );
}

/**
 * Check if a tool requires approval
 */
export function toolRequiresApproval(toolId: string): boolean {
  const tool = OPENCODE_TOOLS.find(t => t.id === toolId);
  return tool?.requiresApproval ?? false;
}

/**
 * Get tool by ID
 */
export function getToolById(toolId: string): MCPToolDefinition | undefined {
  return OPENCODE_TOOLS.find(t => t.id === toolId);
}

/**
 * Get tool icon component
 */
export function getToolIcon(toolId: string): LucideIcon {
  const tool = OPENCODE_TOOLS.find(t => t.id === toolId);
  return tool?.icon ?? Play;
}
