import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../test/utils/renderWithProviders.tsx";
import LLMNode from "../LLMNode.tsx";
import { createMockLLMNodeData } from "../../../../test/utils/mockNodeData.ts";

describe("LLMNode", () => {
  const defaultProps = {
    id: "llm-1",
    data: createMockLLMNodeData(),
    selected: false,
  };

  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<LLMNode {...defaultProps} />);
      expect(screen.getByText("测试 LLM 节点")).toBeInTheDocument();
    });

    it("displays node name correctly", () => {
      const customData = createMockLLMNodeData({ name: "自定义 LLM 名称" });
      render(<LLMNode {...defaultProps} data={customData} />);
      expect(screen.getByText("自定义 LLM 名称")).toBeInTheDocument();
    });

    it("shows description when provided", () => {
      const customData = createMockLLMNodeData({ description: "这是描述文字" });
      render(<LLMNode {...defaultProps} data={customData} />);
      expect(screen.getByText("这是描述文字")).toBeInTheDocument();
    });

    it("displays model label", () => {
      render(<LLMNode {...defaultProps} />);
      expect(screen.getByText("Gemini 2.5 Flash")).toBeInTheDocument();
    });

    it("shows structured output badge when enabled", () => {
      const customData = createMockLLMNodeData({
        config: { structuredOutput: true },
      });
      render(<LLMNode {...defaultProps} data={customData} />);
      expect(screen.getByText("结构化输出")).toBeInTheDocument();
    });

    it("shows streaming badge when enabled", () => {
      const customData = createMockLLMNodeData({
        config: { enableStreaming: true },
      });
      render(<LLMNode {...defaultProps} data={customData} />);
      expect(screen.getByText("流式")).toBeInTheDocument();
    });

    it("shows temperature when configured", () => {
      const customData = createMockLLMNodeData({
        config: { temperature: 0.8 },
      });
      render(<LLMNode {...defaultProps} data={customData} />);
      expect(screen.getByText("T=0.8")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("applies selected styles when selected", () => {
      const { container } = render(<LLMNode {...defaultProps} selected />);
      const nodeElement = container.firstChild as HTMLElement;
      expect(nodeElement.className).toContain("border-blue-500");
    });

    it("applies default border when not selected", () => {
      const { container } = render(<LLMNode {...defaultProps} selected={false} />);
      const nodeElement = container.firstChild as HTMLElement;
      expect(nodeElement.className).toContain("border-border");
    });
  });

  describe("Callbacks", () => {
    it("calls onConfigure when configure button clicked", async () => {
      const onConfigure = vi.fn();
      const customData = createMockLLMNodeData({ onConfigure });
      render(<LLMNode {...defaultProps} data={customData} />);

      const buttons = screen.getAllByRole("button");
      const configureButton = buttons.find((btn) =>
        btn.querySelector('[class*="Settings"]') || btn.innerHTML.includes("Settings")
      );

      if (configureButton) {
        configureButton.click();
        expect(onConfigure).toHaveBeenCalledWith(customData.id);
      }
    });

    it("calls onRemove when remove button clicked", async () => {
      const onRemove = vi.fn();
      const customData = createMockLLMNodeData({ onRemove });
      render(<LLMNode {...defaultProps} data={customData} />);

      const buttons = screen.getAllByRole("button");
      const removeButton = buttons.find((btn) =>
        btn.className.includes("hover:text-destructive")
      );

      if (removeButton) {
        removeButton.click();
        expect(onRemove).toHaveBeenCalledWith(customData.id);
      }
    });
  });

  describe("Model Labels", () => {
    const modelTests = [
      { model: "google/gemini-2.5-flash", expected: "Gemini 2.5 Flash" },
      { model: "google/gemini-2.5-pro", expected: "Gemini 2.5 Pro" },
      { model: "openai/gpt-5", expected: "GPT-5" },
      { model: "openai/gpt-5-mini", expected: "GPT-5 Mini" },
    ];

    modelTests.forEach(({ model, expected }) => {
      it(`displays ${expected} for model ${model}`, () => {
        const customData = createMockLLMNodeData({ config: { model } });
        render(<LLMNode {...defaultProps} data={customData} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });
  });
});
