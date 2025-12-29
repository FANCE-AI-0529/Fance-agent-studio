import { useState, useEffect } from "react";
import * as yaml from "yaml";
import {
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

export interface Dependency {
  name: string;
  version: string;
  status: "pending" | "checking" | "installed" | "missing" | "error";
  pypiUrl?: string;
}

export interface RuntimeConfig {
  python_version?: string;
  timeout_seconds?: number;
  memory_mb?: number;
}

export interface SkillConfig {
  runtime?: RuntimeConfig;
  dependencies?: string[];
  environment?: Record<string, string>;
}

export function parseConfigYaml(content: string): SkillConfig | null {
  try {
    const parsed = yaml.parse(content);
    return parsed as SkillConfig;
  } catch (e) {
    return null;
  }
}

export function parseDependencies(deps: string[]): Dependency[] {
  return deps.map((dep) => {
    // Parse dependency string like "numpy>=1.24.0" or "requests"
    const match = dep.match(/^([a-zA-Z0-9_-]+)(.*)$/);
    if (match) {
      return {
        name: match[1],
        version: match[2] || "latest",
        status: "pending" as const,
        pypiUrl: `https://pypi.org/project/${match[1]}/`,
      };
    }
    return {
      name: dep,
      version: "latest",
      status: "pending" as const,
    };
  });
}

interface DependencyManagerProps {
  configContent: string;
  onConfigChange?: (config: SkillConfig) => void;
}

export function DependencyManager({ configContent, onConfigChange }: DependencyManagerProps) {
  const [config, setConfig] = useState<SkillConfig | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

  // Parse config when content changes
  useEffect(() => {
    const parsed = parseConfigYaml(configContent);
    setConfig(parsed);
    if (parsed?.dependencies) {
      setDependencies(parseDependencies(parsed.dependencies));
    } else {
      setDependencies([]);
    }
  }, [configContent]);

  // Simulate checking dependencies (in real scenario, this would call an API)
  const checkDependencies = async () => {
    setIsChecking(true);
    
    // Simulate checking each dependency
    for (let i = 0; i < dependencies.length; i++) {
      setDependencies((prev) =>
        prev.map((dep, idx) =>
          idx === i ? { ...dep, status: "checking" } : dep
        )
      );

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Randomly assign status for demo (in real scenario, check PyPI or local env)
      const isInstalled = Math.random() > 0.3;
      setDependencies((prev) =>
        prev.map((dep, idx) =>
          idx === i
            ? { ...dep, status: isInstalled ? "installed" : "missing" }
            : dep
        )
      );
    }

    setIsChecking(false);
    toast({
      title: "依赖检查完成",
      description: `${dependencies.filter((d) => d.status === "installed").length}/${dependencies.length} 已安装`,
    });
  };

  // Simulate installing dependencies
  const installDependencies = async () => {
    setIsInstalling(true);
    setInstallProgress(0);

    const missingDeps = dependencies.filter((d) => d.status === "missing");
    
    for (let i = 0; i < missingDeps.length; i++) {
      const dep = missingDeps[i];
      
      // Update status to installing
      setDependencies((prev) =>
        prev.map((d) =>
          d.name === dep.name ? { ...d, status: "checking" } : d
        )
      );

      // Simulate installation time
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

      // Mark as installed
      setDependencies((prev) =>
        prev.map((d) =>
          d.name === dep.name ? { ...d, status: "installed" } : d
        )
      );

      setInstallProgress(((i + 1) / missingDeps.length) * 100);
    }

    setIsInstalling(false);
    toast({
      title: "依赖安装完成",
      description: `成功安装 ${missingDeps.length} 个依赖包`,
    });
  };

  const installedCount = dependencies.filter((d) => d.status === "installed").length;
  const missingCount = dependencies.filter((d) => d.status === "missing").length;
  const pendingCount = dependencies.filter((d) => d.status === "pending").length;

  const statusIcon = (status: Dependency["status"]) => {
    switch (status) {
      case "installed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-status-executing" />;
      case "missing":
        return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case "checking":
        return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
      case "error":
        return <AlertTriangle className="h-3.5 w-3.5 text-status-planning" />;
      default:
        return <Package className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: Dependency["status"]) => {
    switch (status) {
      case "installed":
        return <Badge className="bg-status-executing/10 text-status-executing text-[10px] px-1.5">已安装</Badge>;
      case "missing":
        return <Badge className="bg-destructive/10 text-destructive text-[10px] px-1.5">未安装</Badge>;
      case "checking":
        return <Badge className="bg-primary/10 text-primary text-[10px] px-1.5">检查中</Badge>;
      case "error":
        return <Badge className="bg-status-planning/10 text-status-planning text-[10px] px-1.5">错误</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5">待检查</Badge>;
    }
  };

  if (!config) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>无法解析配置文件</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Runtime Info */}
      {config.runtime && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            运行时配置
          </label>
          <div className="grid grid-cols-3 gap-2">
            {config.runtime.python_version && (
              <div className="p-2 rounded border border-border bg-card text-center">
                <div className="text-[10px] text-muted-foreground">Python</div>
                <div className="text-xs font-mono">{config.runtime.python_version}</div>
              </div>
            )}
            {config.runtime.timeout_seconds && (
              <div className="p-2 rounded border border-border bg-card text-center">
                <div className="text-[10px] text-muted-foreground">超时</div>
                <div className="text-xs font-mono">{config.runtime.timeout_seconds}s</div>
              </div>
            )}
            {config.runtime.memory_mb && (
              <div className="p-2 rounded border border-border bg-card text-center">
                <div className="text-[10px] text-muted-foreground">内存</div>
                <div className="text-xs font-mono">{config.runtime.memory_mb}MB</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dependencies */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            依赖包 ({dependencies.length})
          </label>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={checkDependencies}
              disabled={isChecking || isInstalling || dependencies.length === 0}
            >
              {isChecking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1">检查</span>
            </Button>
          </div>
        </div>

        {/* Status Summary */}
        {dependencies.length > 0 && pendingCount === 0 && (
          <div className="flex gap-2 text-[10px]">
            {installedCount > 0 && (
              <span className="text-status-executing">✓ {installedCount} 已安装</span>
            )}
            {missingCount > 0 && (
              <span className="text-destructive">✗ {missingCount} 未安装</span>
            )}
          </div>
        )}

        {/* Installation Progress */}
        {isInstalling && (
          <div className="space-y-1">
            <Progress value={installProgress} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground text-center">
              安装中... {Math.round(installProgress)}%
            </div>
          </div>
        )}

        {/* Dependency List */}
        {dependencies.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {dependencies.map((dep) => (
              <div
                key={dep.name}
                className="flex items-center justify-between p-2 rounded border border-border bg-card group"
              >
                <div className="flex items-center gap-2">
                  {statusIcon(dep.status)}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono">{dep.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {dep.version}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {statusBadge(dep.status)}
                  {dep.pypiUrl && (
                    <a
                      href={dep.pypiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded"
                    >
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-xs border border-dashed border-border rounded">
            未声明依赖包
          </div>
        )}

        {/* Install Button */}
        {missingCount > 0 && (
          <Button
            size="sm"
            className="w-full gap-1.5 h-8"
            onClick={installDependencies}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            安装缺失依赖 ({missingCount})
          </Button>
        )}
      </div>

      {/* Environment Variables */}
      {config.environment && Object.keys(config.environment).length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            环境变量
          </label>
          <div className="space-y-1">
            {Object.entries(config.environment).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between p-2 rounded border border-border bg-card"
              >
                <code className="text-xs font-mono text-primary">{key}</code>
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                  {value.startsWith("${") ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      需配置
                    </Badge>
                  ) : (
                    value
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
