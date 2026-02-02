import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Maximize2, 
  Minimize2, 
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  FileWarning
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentPreviewProps {
  url: string;
  fileName: string;
  mimeType: string;
  onClose?: () => void;
  className?: string;
}

interface PreviewState {
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  rotation: number;
}

// Image preview component
function ImagePreview({ 
  url, 
  fileName,
  state,
  onStateChange 
}: { 
  url: string; 
  fileName: string;
  state: PreviewState;
  onStateChange: (updates: Partial<PreviewState>) => void;
}) {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    onStateChange({ isLoading: false });
  };

  const handleImageError = () => {
    onStateChange({ isLoading: false, error: "图片加载失败" });
  };

  return (
    <div className="flex items-center justify-center h-full overflow-hidden bg-muted/30">
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <motion.img
        src={url}
        alt={fileName}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          transform: `scale(${state.zoom / 100}) rotate(${state.rotation}deg)`,
          transformOrigin: "center",
        }}
        className="max-w-full max-h-full object-contain transition-transform duration-200"
      />
    </div>
  );
}

// PDF preview component (iframe-based)
function PDFPreview({ 
  url, 
  state,
  onStateChange 
}: { 
  url: string;
  state: PreviewState;
  onStateChange: (updates: Partial<PreviewState>) => void;
}) {
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      onStateChange({ isLoading: false });
    }, 1000);
    return () => clearTimeout(timer);
  }, [url]);

  return (
    <div className="relative w-full h-full">
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">加载文档中...</p>
          </div>
        </div>
      )}
      <iframe
        src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
        className="w-full h-full border-0"
        title="PDF Preview"
      />
    </div>
  );
}

// Text/Markdown preview component
function TextPreview({ 
  url,
  state,
  onStateChange 
}: { 
  url: string;
  state: PreviewState;
  onStateChange: (updates: Partial<PreviewState>) => void;
}) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    onStateChange({ isLoading: true });
    fetch(url)
      .then(res => res.text())
      .then(text => {
        setContent(text);
        onStateChange({ isLoading: false });
      })
      .catch(() => {
        onStateChange({ isLoading: false, error: "文件加载失败" });
      });
  }, [url]);

  return (
    <ScrollArea className="h-full">
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
        {content}
      </pre>
    </ScrollArea>
  );
}

// Unsupported file type
function UnsupportedPreview({ fileName, mimeType }: { fileName: string; mimeType: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <FileWarning className="h-16 w-16 text-muted-foreground/50" />
      <div>
        <h3 className="text-lg font-medium">无法预览此文件</h3>
        <p className="text-sm text-muted-foreground mt-1">
          文件类型 "{mimeType}" 暂不支持在线预览
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        文件名: {fileName}
      </p>
    </div>
  );
}

// Toolbar component
function PreviewToolbar({
  state,
  onStateChange,
  onDownload,
  onToggleFullscreen,
  isFullscreen,
  showPageControls,
  showZoomControls,
}: {
  state: PreviewState;
  onStateChange: (updates: Partial<PreviewState>) => void;
  onDownload: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  showPageControls?: boolean;
  showZoomControls?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        {showPageControls && state.totalPages > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={state.currentPage <= 1}
              onClick={() => onStateChange({ currentPage: state.currentPage - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {state.currentPage} / {state.totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={state.currentPage >= state.totalPages}
              onClick={() => onStateChange({ currentPage: state.currentPage + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showZoomControls && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onStateChange({ zoom: Math.max(25, state.zoom - 25) })}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="w-24">
              <Slider
                value={[state.zoom]}
                min={25}
                max={200}
                step={25}
                onValueChange={([value]) => onStateChange({ zoom: value })}
              />
            </div>
            <span className="text-xs text-muted-foreground w-12">
              {state.zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onStateChange({ zoom: Math.min(200, state.zoom + 25) })}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onStateChange({ rotation: (state.rotation + 90) % 360 })}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// Main preview component
export function DocumentPreview({ 
  url, 
  fileName, 
  mimeType,
  onClose,
  className 
}: DocumentPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [state, setState] = useState<PreviewState>({
    isLoading: true,
    error: null,
    currentPage: 1,
    totalPages: 1,
    zoom: 100,
    rotation: 0,
  });

  const updateState = (updates: Partial<PreviewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const isImage = mimeType.startsWith("image/");
  const isPDF = mimeType === "application/pdf";
  const isText = mimeType.startsWith("text/") || mimeType === "application/json";

  const renderPreview = () => {
    if (state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <FileWarning className="h-12 w-12 text-destructive/50" />
          <p className="text-sm text-muted-foreground">{state.error}</p>
        </div>
      );
    }

    if (isImage) {
      return (
        <ImagePreview 
          url={url} 
          fileName={fileName} 
          state={state}
          onStateChange={updateState}
        />
      );
    }

    if (isPDF) {
      return (
        <PDFPreview 
          url={url} 
          state={state}
          onStateChange={updateState}
        />
      );
    }

    if (isText) {
      return (
        <TextPreview 
          url={url} 
          state={state}
          onStateChange={updateState}
        />
      );
    }

    return <UnsupportedPreview fileName={fileName} mimeType={mimeType} />;
  };

  const content = (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <PreviewToolbar
        state={state}
        onStateChange={updateState}
        onDownload={handleDownload}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        isFullscreen={isFullscreen}
        showZoomControls={isImage}
        showPageControls={isPDF}
      />
      <div className="flex-1 overflow-hidden">
        {renderPreview()}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-sm">
                {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                {fileName}
              </DialogTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-[calc(95vh-60px)]">
            {renderPreview()}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}

// Inline preview card for document list
interface DocumentPreviewCardProps {
  url: string;
  fileName: string;
  mimeType: string;
  onPreview: () => void;
  className?: string;
}

export function DocumentPreviewCard({ 
  url, 
  fileName, 
  mimeType, 
  onPreview,
  className 
}: DocumentPreviewCardProps) {
  const isImage = mimeType.startsWith("image/");

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative group cursor-pointer rounded-lg overflow-hidden border bg-card",
        className
      )}
      onClick={onPreview}
    >
      {isImage ? (
        <img 
          src={url} 
          alt={fileName} 
          className="w-full h-32 object-cover"
        />
      ) : (
        <div className="w-full h-32 flex items-center justify-center bg-muted/50">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
        <Button size="sm" variant="secondary">
          <Maximize2 className="h-3 w-3 mr-1" />
          预览
        </Button>
      </div>
      <div className="p-2 border-t">
        <p className="text-xs truncate text-muted-foreground">{fileName}</p>
      </div>
    </motion.div>
  );
}

export default DocumentPreview;
