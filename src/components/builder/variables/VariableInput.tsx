import React, { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Node } from "@xyflow/react";
import { Variable } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import VariableSelector from "./VariableSelector";

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  nodes: Node[];
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}

export default function VariableInput({ value, onChange, nodes, placeholder, multiline, className }: VariableInputProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const handleInsertVariable = useCallback(
    (varRef: string) => {
      const el = ref.current;
      if (el) {
        const start = el.selectionStart || value.length;
        const end = el.selectionEnd || value.length;
        const newValue = value.slice(0, start) + varRef + value.slice(end);
        onChange(newValue);
        // Move cursor after inserted var
        setTimeout(() => {
          el.focus();
          const pos = start + varRef.length;
          el.setSelectionRange(pos, pos);
        }, 0);
      } else {
        onChange(value + varRef);
      }
      setSelectorOpen(false);
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Open selector on {{ 
      if (e.key === "{") {
        const el = ref.current;
        if (el) {
          const pos = el.selectionStart || 0;
          if (pos > 0 && value[pos - 1] === "{") {
            e.preventDefault();
            // Remove the first { and open selector
            onChange(value.slice(0, pos - 1) + value.slice(pos));
            setSelectorOpen(true);
          }
        }
      }
    },
    [value, onChange]
  );

  const sharedProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => onChange(e.target.value),
    onKeyDown: handleKeyDown,
    placeholder,
    className: cn(
      "w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background",
      "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      className
    ),
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          {...sharedProps}
          rows={4}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          {...sharedProps}
        />
      )}
      <div className="absolute right-1 top-1">
        <VariableSelector
          nodes={nodes}
          onSelect={handleInsertVariable}
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          trigger={
            <Button variant="ghost" size="icon" className="h-6 w-6" type="button">
              <Variable className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
