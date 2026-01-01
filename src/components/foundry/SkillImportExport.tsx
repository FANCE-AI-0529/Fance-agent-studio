import { useState, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Download,
  Upload,
  FileArchive,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface SkillFiles {
  skillMd: string;
  handlerPy: string;
  configYaml: string;
}

interface SkillImportExportProps {
  trigger?: React.ReactNode;
  currentFiles: SkillFiles;
  skillName: string;
  onImport: (files: SkillFiles, skillName: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ImportPreview {
  skillName: string;
  files: {
    name: string;
    size: number;
    content: string;
  }[];
  isValid: boolean;
  errors: string[];
}

export function SkillImportExport({
  trigger,
  currentFiles,
  skillName,
  onImport,
  open: controlledOpen,
  onOpenChange,
}: SkillImportExportProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [activeTab, setActiveTab] = useState("export");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 导出为 ZIP
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folderName = skillName.replace(/[^a-zA-Z0-9_-]/g, "_") || "skill";
      const folder = zip.folder(folderName);

      if (folder) {
        folder.file("SKILL.md", currentFiles.skillMd);
        folder.file("handler.py", currentFiles.handlerPy);
        folder.file("config.yaml", currentFiles.configYaml);
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);

      toast({
        title: "导出成功",
        description: `技能已导出为 ${folderName}.zip`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 导出单个文件
  const handleExportSingle = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    saveAs(blob, filename);
    toast({
      title: "文件已下载",
      description: filename,
    });
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportPreview(null);

    try {
      if (file.name.endsWith(".zip")) {
        await processZipFile(file);
      } else if (
        file.name.endsWith(".md") ||
        file.name.endsWith(".py") ||
        file.name.endsWith(".yaml") ||
        file.name.endsWith(".yml")
      ) {
        await processSingleFile(file);
      } else {
        throw new Error("不支持的文件格式，请选择 .zip, .md, .py 或 .yaml 文件");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 处理 ZIP 文件
  const processZipFile = async (file: File) => {
    const zip = await JSZip.loadAsync(file);
    const files: ImportPreview["files"] = [];
    const errors: string[] = [];
    let skillMd = "";
    let handlerPy = "";
    let configYaml = "";
    let detectedName = file.name.replace(".zip", "");

    // 遍历 ZIP 内容
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      const filename = path.split("/").pop() || path;
      const content = await zipEntry.async("string");
      const size = content.length;

      files.push({ name: filename, size, content });

      if (filename.toLowerCase() === "skill.md") {
        skillMd = content;
        // 尝试从内容中提取名称
        const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/);
        if (nameMatch) {
          detectedName = nameMatch[1].trim();
        }
      } else if (filename.toLowerCase() === "handler.py") {
        handlerPy = content;
      } else if (
        filename.toLowerCase() === "config.yaml" ||
        filename.toLowerCase() === "config.yml"
      ) {
        configYaml = content;
      }
    }

    // 验证
    if (!skillMd) {
      errors.push("缺少 SKILL.md 文件");
    }
    if (!handlerPy) {
      errors.push("缺少 handler.py 文件（可选）");
    }
    if (!configYaml) {
      errors.push("缺少 config.yaml 文件（可选）");
    }

    setImportPreview({
      skillName: detectedName,
      files,
      isValid: !!skillMd,
      errors: errors.filter((e) => e.includes("SKILL.md")),
    });
  };

  // 处理单个文件
  const processSingleFile = async (file: File) => {
    const content = await file.text();
    const filename = file.name;
    let detectedName = filename.replace(/\.[^.]+$/, "");

    if (filename.endsWith(".md")) {
      const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/);
      if (nameMatch) {
        detectedName = nameMatch[1].trim();
      }
    }

    setImportPreview({
      skillName: detectedName,
      files: [{ name: filename, size: content.length, content }],
      isValid: true,
      errors: [],
    });
  };

  // 确认导入
  const handleConfirmImport = () => {
    if (!importPreview) return;

    let skillMd = currentFiles.skillMd;
    let handlerPy = currentFiles.handlerPy;
    let configYaml = currentFiles.configYaml;

    for (const file of importPreview.files) {
      const filename = file.name.toLowerCase();
      if (filename === "skill.md" || filename.endsWith(".md")) {
        skillMd = file.content;
      } else if (filename === "handler.py" || filename.endsWith(".py")) {
        handlerPy = file.content;
      } else if (filename === "config.yaml" || filename === "config.yml") {
        configYaml = file.content;
      }
    }

    onImport({ skillMd, handlerPy, configYaml }, importPreview.skillName);
    setImportPreview(null);
    setOpen(false);

    toast({
      title: "导入成功",
      description: `已导入技能 "${importPreview.skillName}"`,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-primary" />
            技能导入/导出
          </DialogTitle>
          <DialogDescription>导出技能为 ZIP 包或从文件导入技能</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              导出
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              导入
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="font-medium mb-2">当前技能: {skillName || "未命名"}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">SKILL.md</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleExportSingle("SKILL.md", currentFiles.skillMd)}
                  >
                    下载
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">handler.py</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleExportSingle("handler.py", currentFiles.handlerPy)}
                  >
                    下载
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">config.yaml</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleExportSingle("config.yaml", currentFiles.configYaml)}
                  >
                    下载
                  </Button>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  正在打包...
                </>
              ) : (
                <>
                  <FileArchive className="h-4 w-4 mr-2" />
                  导出为 ZIP 包
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="import" className="mt-4 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".zip,.md,.py,.yaml,.yml"
              className="hidden"
            />

            {!importPreview ? (
              <div
                className="p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">正在解析文件...</p>
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">点击选择文件</p>
                    <p className="text-xs text-muted-foreground">
                      支持 .zip, .md, .py, .yaml 文件
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    {importPreview.isValid ? (
                      <Check className="h-5 w-5 text-status-executing" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <h4 className="font-medium">{importPreview.skillName}</h4>
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="mb-3 p-2 rounded bg-destructive/10 text-destructive text-xs">
                      {importPreview.errors.map((err, i) => (
                        <div key={i}>{err}</div>
                      ))}
                    </div>
                  )}

                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {importPreview.files.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm p-2 rounded bg-background"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{file.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setImportPreview(null)}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleConfirmImport}
                    disabled={!importPreview.isValid}
                  >
                    确认导入
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• ZIP 包应包含 SKILL.md、handler.py、config.yaml</p>
              <p>• 也可单独导入 .md、.py 或 .yaml 文件</p>
              <p>• 导入将覆盖当前编辑器内容</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
