import { useCallback, useRef } from "react";
import Editor, { OnMount, OnChange, Monaco } from "@monaco-editor/react";

interface SkillEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

export function SkillEditor({
  value,
  onChange,
  language = "markdown",
  readOnly = false,
}: SkillEditorProps) {
  const editorRef = useRef<any>(null);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Define custom theme for Agent OS
    monaco.editor.defineTheme("agent-os-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "c084fc" }, // cognitive purple
        { token: "string", foreground: "22d3ee" }, // governance cyan
        { token: "number", foreground: "fbbf24" },
        { token: "type", foreground: "60a5fa" },
        { token: "variable", foreground: "f472b6" },
        { token: "tag", foreground: "c084fc" },
        { token: "attribute.name", foreground: "22d3ee" },
        { token: "attribute.value", foreground: "a3e635" },
        { token: "delimiter", foreground: "9ca3af" },
        // YAML specific
        { token: "key", foreground: "c084fc" },
        { token: "string.yaml", foreground: "22d3ee" },
        // Markdown specific
        { token: "markup.heading", foreground: "60a5fa", fontStyle: "bold" },
        { token: "markup.bold", fontStyle: "bold" },
        { token: "markup.italic", fontStyle: "italic" },
        { token: "markup.underline", fontStyle: "underline" },
        { token: "string.link", foreground: "22d3ee" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#e5e7eb",
        "editor.lineHighlightBackground": "#161b22",
        "editor.selectionBackground": "#3b82f640",
        "editorCursor.foreground": "#60a5fa",
        "editorLineNumber.foreground": "#6b7280",
        "editorLineNumber.activeForeground": "#e5e7eb",
        "editor.selectionHighlightBackground": "#3b82f620",
        "editorBracketMatch.background": "#3b82f640",
        "editorBracketMatch.border": "#3b82f6",
        "editorIndentGuide.background1": "#1f2937",
        "editorIndentGuide.activeBackground1": "#374151",
        "scrollbarSlider.background": "#374151",
        "scrollbarSlider.hoverBackground": "#4b5563",
        "scrollbarSlider.activeBackground": "#6b7280",
      },
    });

    monaco.editor.setTheme("agent-os-dark");

    // Configure markdown language
    monaco.languages.setLanguageConfiguration("markdown", {
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
      comments: {
        blockComment: ["<!--", "-->"],
      },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: "`", close: "`" },
        { open: "**", close: "**" },
        { open: "_", close: "_" },
      ],
    });

    // Register SKILL.md completions
    monaco.languages.registerCompletionItemProvider("markdown", {
      triggerCharacters: ["-", ":"],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [
          {
            label: "skill-frontmatter",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "---",
              'name: "${1:Skill Name}"',
              'version: "${2:1.0.0}"',
              'description: "${3:Description}"',
              'author: "${4:Author}"',
              "permissions:",
              "  - ${5:read}",
              "inputs:",
              "  - name: ${6:input_name}",
              "    type: ${7:string}",
              '    description: ${8:Input description}',
              "outputs:",
              "  - name: ${9:output_name}",
              "    type: ${10:string}",
              '    description: ${11:Output description}',
              "---",
              "",
              "# ${1:Skill Name}",
              "",
              "## 能力描述",
              "",
              "${12:Description of what this skill does.}",
              "",
            ].join("\n"),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Insert complete SKILL.md template with frontmatter",
            range,
          },
          {
            label: "permissions",
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: "permissions:\n  - ${1:read}\n  - ${2:write}",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Add permissions section",
            range,
          },
          {
            label: "inputs",
            kind: monaco.languages.CompletionItemKind.Property,
            insertText:
              "inputs:\n  - name: ${1:param}\n    type: ${2:string}\n    description: ${3:Description}",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Add inputs section",
            range,
          },
          {
            label: "outputs",
            kind: monaco.languages.CompletionItemKind.Property,
            insertText:
              "outputs:\n  - name: ${1:result}\n    type: ${2:string}\n    description: ${3:Description}",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Add outputs section",
            range,
          },
        ];

        return { suggestions };
      },
    });
  }, []);

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange(value || "");
    },
    [onChange]
  );

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 22,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          folding: true,
          foldingHighlight: true,
          bracketPairColorization: { enabled: true },
          guides: {
            indentation: true,
            bracketPairs: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
        }}
        loading={
          <div className="h-full flex items-center justify-center bg-background">
            <div className="text-muted-foreground text-sm">加载编辑器...</div>
          </div>
        }
      />
    </div>
  );
}