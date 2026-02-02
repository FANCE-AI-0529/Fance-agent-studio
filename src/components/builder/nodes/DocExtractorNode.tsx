import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { FileText, Upload, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface DocExtractorNodeData {
  label?: string;
  supportedFormats?: string[];
  enableOCR?: boolean;
  extractionMode?: "full" | "pages" | "structured";
  maxPages?: number;
  [key: string]: unknown;
}

const supportedFormats = [
  { ext: "pdf", label: "PDF", color: "red" },
  { ext: "docx", label: "Word", color: "blue" },
  { ext: "xlsx", label: "Excel", color: "green" },
  { ext: "pptx", label: "PPT", color: "orange" },
  { ext: "txt", label: "TXT", color: "gray" },
  { ext: "md", label: "Markdown", color: "purple" },
];

const extractionModes = [
  { value: "full", label: "全文提取", description: "提取所有文本内容" },
  { value: "pages", label: "分页提取", description: "按页面分割内容" },
  { value: "structured", label: "结构化提取", description: "提取标题、段落、表格等结构" },
];

const DocExtractorNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as DocExtractorNodeData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [enableOCR, setEnableOCR] = useState(nodeData.enableOCR ?? false);
  const [mode, setMode] = useState(nodeData.extractionMode || "full");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(
    nodeData.supportedFormats || ["pdf", "docx", "txt"]
  );

  const toggleFormat = (ext: string) => {
    setSelectedFormats(prev => 
      prev.includes(ext) 
        ? prev.filter(f => f !== ext)
        : [...prev, ext]
    );
  };

  return (
    <div
      className={cn(
        "bg-card rounded-xl border-2 shadow-lg min-w-[280px] max-w-[320px] transition-all duration-200",
        selected ? "border-orange-500 ring-2 ring-orange-500/20" : "border-border/50 hover:border-orange-400/50"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="control-in"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
        style={{ top: 24 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="file-in"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
        style={{ top: 48 }}
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {nodeData.label || "文档提取器"}
          </h3>
          <p className="text-xs text-muted-foreground">解析文档内容</p>
        </div>
        <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-[10px]">
          DOC
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* File Input Indicator */}
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-dashed border-border">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">等待文件输入...</span>
        </div>

        {/* Supported Formats */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">支持格式</label>
          <div className="flex flex-wrap gap-1">
            {supportedFormats.map((fmt) => (
              <Badge
                key={fmt.ext}
                variant={selectedFormats.includes(fmt.ext) ? "default" : "outline"}
                className={cn(
                  "text-[10px] cursor-pointer transition-colors",
                  selectedFormats.includes(fmt.ext) && `bg-${fmt.color}-500/20 text-${fmt.color}-600`
                )}
                onClick={() => toggleFormat(fmt.ext)}
              >
                .{fmt.ext}
              </Badge>
            ))}
          </div>
        </div>

        {/* Extraction Mode */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">提取模式</label>
          <Select value={mode} onValueChange={(v: typeof mode) => setMode(v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {extractionModes.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Settings */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs h-7 px-2"
            >
              <span className="flex items-center gap-1">
                <Settings2 className="w-3 h-3" />
                高级设置
              </span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {/* OCR Toggle */}
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div>
                <p className="text-xs font-medium">OCR 识别</p>
                <p className="text-[10px] text-muted-foreground">对图片和扫描件进行文字识别</p>
              </div>
              <Switch
                checked={enableOCR}
                onCheckedChange={setEnableOCR}
              />
            </div>

            {/* Max Pages */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">最大页数</span>
              <Badge variant="outline">{nodeData.maxPages || "不限"}</Badge>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="control-out"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
        style={{ top: 24 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="text-out"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-background"
        style={{ top: 48 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="metadata-out"
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-background"
        style={{ top: 72 }}
      />
    </div>
  );
});

DocExtractorNode.displayName = "DocExtractorNode";
export default DocExtractorNode;
