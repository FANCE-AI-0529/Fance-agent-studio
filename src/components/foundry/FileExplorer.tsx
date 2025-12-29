import { useState } from "react";
import {
  FolderTree,
  Upload,
  FileText,
  Code2,
  FileCode,
  Sparkles,
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  language?: string;
  children?: FileItem[];
}

interface FileExplorerProps {
  files: FileItem[];
  activeFileId: string;
  onFileSelect: (file: FileItem) => void;
  onNewFile?: () => void;
}

const fileIcons: Record<string, React.ElementType> = {
  md: FileText,
  py: Code2,
  yaml: FileCode,
  json: FileCode,
  ts: Code2,
  js: Code2,
};

function getFileIcon(filename: string): React.ElementType {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return fileIcons[ext] || FileText;
}

function FileTreeItem({
  item,
  depth,
  activeFileId,
  onSelect,
}: {
  item: FileItem;
  depth: number;
  activeFileId: string;
  onSelect: (file: FileItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = item.id === activeFileId;
  const FileIcon = item.type === "folder" 
    ? isOpen ? FolderOpen : Folder 
    : getFileIcon(item.name);

  return (
    <div>
      <button
        onClick={() => {
          if (item.type === "folder") {
            setIsOpen(!isOpen);
          } else {
            onSelect(item);
          }
        }}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {item.type === "folder" && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        {item.type === "file" && <span className="w-4" />}
        <FileIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{item.name}</span>
      </button>

      {item.type === "folder" && isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  files,
  activeFileId,
  onFileSelect,
  onNewFile,
}: FileExplorerProps) {
  return (
    <div className="w-64 border-r border-border flex flex-col bg-card/50">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-cognitive" />
          <span className="font-semibold text-sm">技能文件</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNewFile}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {files.map((file) => (
            <FileTreeItem
              key={file.id}
              item={file}
              depth={0}
              activeFileId={activeFileId}
              onSelect={onFileSelect}
            />
          ))}
        </div>

        {/* Templates Section */}
        <div className="mt-6">
          <div className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            模板库
          </div>
          <div className="space-y-0.5">
            {[
              { id: "tpl-analysis", name: "分析类模板" },
              { id: "tpl-creation", name: "创作类模板" },
              { id: "tpl-tool", name: "工具类模板" },
            ].map((template) => (
              <button
                key={template.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{template.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}