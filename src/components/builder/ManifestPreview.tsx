import { X, Copy, Check, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// AgentManifest 结构遵循开发逻辑文档 6.4 规范
export interface AgentManifest {
  version: string;
  metadata: {
    name: string;
    department: string;
    description?: string;
    created_at: string;
    updated_at?: string;
  };
  runtime: {
    provider: string;
    model: string;
    model_config?: {
      temperature?: number;
      max_tokens?: number;
    };
  };
  system_prompt: string;
  skills: {
    mounts: Array<{
      skill_id: string;
      version: string;
      config_overrides?: Record<string, unknown>;
    }>;
    details: Array<{
      id: string;
      name: string;
      category: string;
      permissions: string[];
    }>;
  };
  mplp: {
    policy: string;
    context: {
      role: string;
      department: string;
    };
    require_confirm: string[];
    audit_log: boolean;
    trace_enabled: boolean;
  };
}

interface ManifestPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: AgentManifest | null;
}

export function ManifestPreview({
  isOpen,
  onClose,
  manifest,
}: ManifestPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !manifest) return null;

  const manifestJson = JSON.stringify(manifest, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(manifestJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([manifestJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent_manifest_${manifest.metadata.name || "unnamed"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] bg-card border border-border rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Agent Manifest</h2>
            <p className="text-xs text-muted-foreground">
              agent_manifest.json - 符合 Anthropic Skills Filesystem 标准
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="p-4 rounded-lg bg-background border border-border font-mono text-sm overflow-x-auto">
            <code className="text-foreground">{manifestJson}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                复制
              </>
            )}
          </Button>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            下载
          </Button>
        </div>
      </div>
    </div>
  );
}
