import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Switch } from "../ui/switch.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Badge } from "../ui/badge.tsx";
import { Key, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { mcpCategoryEnvVars } from "../../data/mcpPermissionMapping.ts";

export interface EnvVar {
  name: string;
  value: string;
  description?: string;
  required?: boolean;
  type?: 'string' | 'boolean' | 'number';
}

interface MCPEnvVarsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  category: string;
  envVars: Record<string, string>;
  onSave: (envVars: Record<string, string>) => void;
}

export function MCPEnvVarsEditor({
  open,
  onOpenChange,
  skillName,
  category,
  envVars,
  onSave,
}: MCPEnvVarsEditorProps) {
  const [localEnvVars, setLocalEnvVars] = useState<Record<string, string>>(envVars);
  const [customVars, setCustomVars] = useState<Array<{ name: string; value: string }>>([]);
  const [newVarName, setNewVarName] = useState("");

  // 获取该分类建议的环境变量
  const suggestedVars = mcpCategoryEnvVars[category] || [];

  const handleValueChange = (name: string, value: string) => {
    setLocalEnvVars((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomVar = () => {
    if (newVarName.trim() && !localEnvVars[newVarName]) {
      setCustomVars((prev) => [...prev, { name: newVarName.trim(), value: "" }]);
      setLocalEnvVars((prev) => ({ ...prev, [newVarName.trim()]: "" }));
      setNewVarName("");
    }
  };

  const handleRemoveCustomVar = (name: string) => {
    setCustomVars((prev) => prev.filter((v) => v.name !== name));
    setLocalEnvVars((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSave = () => {
    // 过滤掉空值
    const filtered = Object.fromEntries(
      Object.entries(localEnvVars).filter(([_, v]) => v.trim() !== "")
    );
    onSave(filtered);
    onOpenChange(false);
  };

  // 检查必需变量是否已配置
  const missingRequired = suggestedVars
    .filter((v) => v.required && !localEnvVars[v.name]?.trim())
    .map((v) => v.name);

  const configuredCount = Object.values(localEnvVars).filter((v) => v.trim()).length;
  const totalCount = suggestedVars.length + customVars.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <DialogTitle>环境变量配置</DialogTitle>
          </div>
          <DialogDescription>
            为 <span className="font-medium text-foreground">{skillName}</span> 配置所需的环境变量
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* 建议的环境变量 */}
            {suggestedVars.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">建议配置</h4>
                {suggestedVars.map((envVar) => (
                  <div key={envVar.name} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={envVar.name} className="text-sm font-medium">
                        {envVar.name}
                      </Label>
                      {envVar.required ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          必需
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          可选
                        </Badge>
                      )}
                      {localEnvVars[envVar.name]?.trim() && (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </div>
                    {envVar.type === 'boolean' ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={localEnvVars[envVar.name] === 'true'}
                          onCheckedChange={(checked) =>
                            handleValueChange(envVar.name, checked ? 'true' : 'false')
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {localEnvVars[envVar.name] === 'true' ? '启用' : '禁用'}
                        </span>
                      </div>
                    ) : (
                      <Input
                        id={envVar.name}
                        type={envVar.name.toLowerCase().includes('key') || 
                              envVar.name.toLowerCase().includes('secret') || 
                              envVar.name.toLowerCase().includes('token') ||
                              envVar.name.toLowerCase().includes('password') 
                              ? 'password' : 'text'}
                        placeholder={envVar.example || `输入 ${envVar.name}`}
                        value={localEnvVars[envVar.name] || ""}
                        onChange={(e) => handleValueChange(envVar.name, e.target.value)}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">{envVar.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 自定义环境变量 */}
            {customVars.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">自定义变量</h4>
                {customVars.map((cv) => (
                  <div key={cv.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{cv.name}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCustomVar(cv.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      type="text"
                      placeholder={`输入 ${cv.name} 的值`}
                      value={localEnvVars[cv.name] || ""}
                      onChange={(e) => handleValueChange(cv.name, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 添加自定义变量 */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">添加自定义变量</h4>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="变量名 (如 MY_API_KEY)"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomVar}
                  disabled={!newVarName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* 警告信息 */}
        {missingRequired.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="text-xs">
              缺少必需变量: {missingRequired.join(", ")}
            </div>
          </div>
        )}

        {/* 统计 */}
        <div className="text-xs text-muted-foreground">
          已配置 {configuredCount}/{totalCount} 个变量
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
