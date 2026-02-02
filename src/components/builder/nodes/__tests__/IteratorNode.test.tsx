import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@/test/utils/renderWithProviders";
import IteratorNode from "@/components/builder/nodes/IteratorNode";
import { createMockIteratorNodeData } from "@/test/utils/mockNodeData";
import { createNodeProps } from "@/test/utils/nodePropsHelper";

describe("IteratorNode", () => {
  describe("Rendering", () => {
    it("renders with default label", () => {
      const props = createNodeProps(createMockIteratorNodeData({ label: undefined }));
      render(<IteratorNode {...props} />);
      expect(screen.getByText("迭代器")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      const props = createNodeProps(createMockIteratorNodeData({ label: "批量处理器" }));
      render(<IteratorNode {...props} />);
      expect(screen.getByText("批量处理器")).toBeInTheDocument();
    });

    it("shows ITERATOR badge", () => {
      const props = createNodeProps(createMockIteratorNodeData());
      render(<IteratorNode {...props} />);
      expect(screen.getByText("ITERATOR")).toBeInTheDocument();
    });

    it("displays parallelism configuration", () => {
      const props = createNodeProps(createMockIteratorNodeData({ parallelism: 8 }));
      render(<IteratorNode {...props} />);
      expect(screen.getByText("8")).toBeInTheDocument();
    });
  });

  describe("Error Strategy", () => {
    it("shows fail-fast error strategy", () => {
      const props = createNodeProps(createMockIteratorNodeData({ errorStrategy: "fail-fast" }));
      render(<IteratorNode {...props} />);
      expect(screen.getByText("失败即停")).toBeInTheDocument();
    });

    it("shows continue error strategy", () => {
      const props = createNodeProps(createMockIteratorNodeData({ errorStrategy: "continue" }));
      render(<IteratorNode {...props} />);
      expect(screen.getByText("忽略错误")).toBeInTheDocument();
    });

    it("shows retry error strategy", () => {
      const props = createNodeProps(createMockIteratorNodeData({ errorStrategy: "retry" }));
      render(<IteratorNode {...props} />);
      expect(screen.getByText("重试")).toBeInTheDocument();
    });
  });

  describe("Parallelism Slider", () => {
    it("expands advanced settings on click", () => {
      const props = createNodeProps(createMockIteratorNodeData());
      render(<IteratorNode {...props} />);

      const advancedButton = screen.getByRole("button", { name: /高级设置/i });
      fireEvent.click(advancedButton);

      expect(screen.getByText("最大迭代次数")).toBeInTheDocument();
    });

    it("displays max iterations value", () => {
      const props = createNodeProps(createMockIteratorNodeData({ maxIterations: 200 }));
      render(<IteratorNode {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /高级设置/i }));

      expect(screen.getByText("200")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("applies selected styles", () => {
      const props = createNodeProps(createMockIteratorNodeData(), { selected: true });
      const { container } = render(<IteratorNode {...props} />);
      const node = container.firstChild as HTMLElement;
      expect(node.className).toContain("border-cyan-500");
    });

    it("applies default border when not selected", () => {
      const props = createNodeProps(createMockIteratorNodeData());
      const { container } = render(<IteratorNode {...props} />);
      const node = container.firstChild as HTMLElement;
      expect(node.className).toContain("border-border");
    });
  });
});
