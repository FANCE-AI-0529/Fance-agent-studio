import { useMemo } from "react";
import * as yaml from "yaml";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { Badge } from "../ui/badge.tsx";

export interface SkillMetadata {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  permissions?: string[];
  inputs?: Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: SkillMetadata | null;
}

export function parseSkillMd(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    metadata: null,
  };

  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    result.errors.push("缺少 YAML Frontmatter（需要 --- 包裹的元数据）");
    result.isValid = false;
    return result;
  }

  const yamlContent = frontmatterMatch[1];

  try {
    const parsed = yaml.parse(yamlContent) as SkillMetadata;
    result.metadata = parsed;

    // Validate required fields
    if (!parsed.name) {
      result.errors.push("缺少必填字段: name");
      result.isValid = false;
    }

    if (!parsed.version) {
      result.warnings.push("建议添加 version 字段");
    } else if (!/^\d+\.\d+\.\d+$/.test(parsed.version)) {
      result.warnings.push("version 应遵循语义化版本规范 (如 1.0.0)");
    }

    if (!parsed.description) {
      result.warnings.push("建议添加 description 字段");
    }

    if (!parsed.permissions || parsed.permissions.length === 0) {
      result.warnings.push("建议声明 permissions 权限列表");
    } else {
      const validPermissions = ["read", "write", "network", "compute", "delete"];
      for (const perm of parsed.permissions) {
        if (!validPermissions.includes(perm)) {
          result.warnings.push(`未知权限: ${perm}`);
        }
      }
    }

    if (!parsed.inputs || parsed.inputs.length === 0) {
      result.warnings.push("建议定义 inputs 输入参数");
    }

    if (!parsed.outputs || parsed.outputs.length === 0) {
      result.warnings.push("建议定义 outputs 输出参数");
    }

  } catch (e: any) {
    result.errors.push(`YAML 解析错误: ${e.message}`);
    result.isValid = false;
  }

  return result;
}

interface ValidationPanelProps {
  validation: ValidationResult;
}

export function ValidationPanel({ validation }: ValidationPanelProps) {
  const StatusIcon = validation.isValid
    ? validation.warnings.length > 0
      ? AlertTriangle
      : CheckCircle2
    : XCircle;

  const statusColor = validation.isValid
    ? validation.warnings.length > 0
      ? "text-status-planning"
      : "text-status-executing"
    : "text-destructive";

  const statusText = validation.isValid
    ? validation.warnings.length > 0
      ? "存在警告"
      : "校验通过"
    : "存在错误";

  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className={`flex items-center gap-2 ${statusColor}`}>
        <StatusIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{statusText}</span>
      </div>

      {/* Errors */}
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20"
            >
              <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
              <span className="text-xs text-destructive">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="space-y-1">
          {validation.warnings.map((warning, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 rounded bg-status-planning/10 border border-status-planning/20"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-status-planning mt-0.5 flex-shrink-0" />
              <span className="text-xs text-status-planning">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Success */}
      {validation.isValid && validation.warnings.length === 0 && (
        <div className="flex items-start gap-2 p-2 rounded bg-status-executing/10 border border-status-executing/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-status-executing mt-0.5 flex-shrink-0" />
          <span className="text-xs text-status-executing">
            SKILL.md 格式正确，可以发布
          </span>
        </div>
      )}
    </div>
  );
}

interface MetadataDisplayProps {
  metadata: SkillMetadata | null;
}

export function MetadataDisplay({ metadata }: MetadataDisplayProps) {
  if (!metadata) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        解析元数据后将在此显示
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="p-3 rounded-lg border border-border bg-card space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">名称</span>
          <span className="font-medium">{metadata.name || "-"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">版本</span>
          <span>{metadata.version || "-"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">作者</span>
          <span>{metadata.author || "-"}</span>
        </div>
      </div>

      {/* Description */}
      {metadata.description && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            描述
          </label>
          <p className="text-sm p-2 rounded bg-secondary/30">
            {metadata.description}
          </p>
        </div>
      )}

      {/* Permissions */}
      {metadata.permissions && metadata.permissions.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            权限声明
          </label>
          <div className="flex flex-wrap gap-1">
            {metadata.permissions.map((perm) => (
              <Badge key={perm} variant="outline" className="text-xs">
                {perm}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Inputs */}
      {metadata.inputs && metadata.inputs.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            输入参数
          </label>
          <div className="space-y-1">
            {metadata.inputs.map((input, i) => (
              <div
                key={i}
                className="p-2 rounded border border-border bg-card text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cognitive">{input.name}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-governance">{input.type}</span>
                </div>
                {input.description && (
                  <p className="text-muted-foreground mt-1">{input.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outputs */}
      {metadata.outputs && metadata.outputs.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            输出参数
          </label>
          <div className="space-y-1">
            {metadata.outputs.map((output, i) => (
              <div
                key={i}
                className="p-2 rounded border border-border bg-card text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cognitive">{output.name}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-governance">{output.type}</span>
                </div>
                {output.description && (
                  <p className="text-muted-foreground mt-1">{output.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}