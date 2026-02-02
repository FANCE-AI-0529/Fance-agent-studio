import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@/test/utils/renderWithProviders";
import LoopNode from "@/components/builder/nodes/LoopNode";
import { createMockLoopNodeData } from "@/test/utils/mockNodeData";
import { createNodeProps } from "@/test/utils/nodePropsHelper";

describe("LoopNode", () => {
  describe("Rendering", () => {
    it("renders with default label", () => {
      const props = createNodeProps(createMockLoopNodeData({ label: undefined }));
      render(<LoopNode {...props} />);
      expect(screen.getByText("循环节点")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      const props = createNodeProps(createMockLoopNodeData({ label: "重试循环" }));
      render(<LoopNode {...props} />);
      expect(screen.getByText("重试循环")).toBeInTheDocument();
    });

    it("shows LOOP badge", () => {
      const props = createNodeProps(createMockLoopNodeData());
      render(<LoopNode {...props} />);
      expect(screen.getByText("LOOP")).toBeInTheDocument();
    });

    it("displays max iterations", () => {
      const props = createNodeProps(createMockLoopNodeData({ maxIterations: 25 }));
      render(<LoopNode {...props} />);
      expect(screen.getByText("25")).toBeInTheDocument();
    });
  });

  describe("Condition Expression", () => {
    it("displays condition expression when set", () => {
      const props = createNodeProps(
        createMockLoopNodeData({ conditionExpression: "count < maxCount" })
      );
      render(<LoopNode {...props} />);
      expect(screen.getByText("count < maxCount")).toBeInTheDocument();
    });

    it("shows placeholder when no condition set", () => {
      const props = createNodeProps(
        createMockLoopNodeData({ conditionExpression: undefined })
      );
      render(<LoopNode {...props} />);
      expect(screen.getByPlaceholderText(/输入条件表达式/i)).toBeInTheDocument();
    });
  });

  describe("State Variables", () => {
    it("expands to show state variables section", () => {
      const props = createNodeProps(createMockLoopNodeData());
      render(<LoopNode {...props} />);

      const advancedButton = screen.getByRole("button", { name: /高级设置/i });
      fireEvent.click(advancedButton);

      expect(screen.getByText("状态变量")).toBeInTheDocument();
    });

    it("displays configured state variables", () => {
      const props = createNodeProps(
        createMockLoopNodeData({ stateVariables: ["counter", "accumulator"] })
      );
      render(<LoopNode {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /高级设置/i }));

      expect(screen.getByText("counter")).toBeInTheDocument();
      expect(screen.getByText("accumulator")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("applies selected styles", () => {
      const props = createNodeProps(createMockLoopNodeData(), { selected: true });
      const { container } = render(<LoopNode {...props} />);
      const node = container.firstChild as HTMLElement;
      expect(node.className).toContain("border-amber-500");
    });
  });
});
