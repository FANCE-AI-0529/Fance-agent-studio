import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.tsx";
import { 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  Info, 
  XCircle,
  Wand2,
  Copy
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import type { StyleViolation, StyleCheckResult } from "../../utils/openCodeStyleChecker.ts";

interface StyleCheckPanelProps {
  result: StyleCheckResult;
  onApplyFix?: (violation: StyleViolation) => void;
  onApplyAllFixes?: () => void;
  className?: string;
}

export function StyleCheckPanel({ 
  result, 
  onApplyFix,
  onApplyAllFixes,
  className 
}: StyleCheckPanelProps) {
  const [expandedViolations, setExpandedViolations] = useState<Set<number>>(new Set());

  const toggleViolation = (index: number) => {
    const updated = new Set(expandedViolations);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setExpandedViolations(updated);
  };

  const getSeverityIcon = (severity: StyleViolation['severity']) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: StyleViolation['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'info':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const fixableCount = result.violations.filter(v => v.autoFix).length;

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {result.passed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            <CardTitle className="text-base">OpenCode Style Check</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              result.score >= 80 && "bg-green-500/10 text-green-600",
              result.score >= 50 && result.score < 80 && "bg-amber-500/10 text-amber-600",
              result.score < 50 && "bg-red-500/10 text-red-600"
            )}
          >
            Score: {result.score}/100
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {result.summary}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {result.violations.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            All style checks passed!
          </div>
        ) : (
          <>
            {fixableCount > 0 && onApplyAllFixes && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mb-3 h-8 text-xs"
                onClick={onApplyAllFixes}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Auto-fix {fixableCount} issue{fixableCount > 1 ? 's' : ''}
              </Button>
            )}

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {result.violations.map((violation, index) => (
                  <Collapsible 
                    key={index}
                    open={expandedViolations.has(index)}
                    onOpenChange={() => toggleViolation(index)}
                  >
                    <div className={cn(
                      "rounded-lg border p-2",
                      getSeverityColor(violation.severity)
                    )}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(violation.severity)}
                            <span className="text-xs font-medium">{violation.rule}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              L{violation.line}:{violation.column}
                            </Badge>
                          </div>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            expandedViolations.has(index) && "rotate-180"
                          )} />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="mt-2 pt-2 border-t border-current/10 space-y-2">
                          <p className="text-xs">{violation.message}</p>
                          
                          {violation.original && (
                            <div className="bg-background/50 rounded p-2">
                              <p className="text-[10px] text-muted-foreground mb-1">Original:</p>
                              <code className="text-xs font-mono">{violation.original}</code>
                            </div>
                          )}

                          {violation.autoFix && (
                            <div className="bg-green-500/5 rounded p-2 border border-green-500/20">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] text-green-600">Suggested fix:</p>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-5 px-1.5 text-[10px]"
                                    onClick={() => navigator.clipboard.writeText(violation.autoFix!)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  {onApplyFix && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-5 px-1.5 text-[10px] text-green-600"
                                      onClick={() => onApplyFix(violation)}
                                    >
                                      <Wand2 className="h-3 w-3 mr-0.5" />
                                      Apply
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <code className="text-xs font-mono text-green-700 whitespace-pre-wrap">
                                {violation.autoFix}
                              </code>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
