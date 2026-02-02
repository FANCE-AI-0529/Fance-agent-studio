import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@/test/utils/renderWithProviders";
import VariableAggregatorNode from "@/components/builder/nodes/VariableAggregatorNode";
import { createMockVariableAggregatorNodeData } from "@/test/utils/mockNodeData";
import { createNodeProps } from "@/test/utils/nodePropsHelper";

describe("VariableAggregatorNode", () => {
  describe("Rendering", () => {
    it("renders with default label", () => {
      const props = createNodeProps(createMockVariableAggregatorNodeData({ label: undefined }));
      render(<VariableAggregatorNode {...props} />);
      expect(screen.getByText("变量聚合器")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      const props = createNodeProps(
        createMockVariableAggregatorNodeData({ label: "数据合并器" })
      );
      render(<VariableAggregatorNode {...props} />);
      expect(screen.getByText("数据合并器")).toBeInTheDocument();
    });

    it("shows AGGREGATE badge", () => {
      const props = createNodeProps(createMockVariableAggregatorNodeData());
      render(<VariableAggregatorNode {...props} />);
      expect(screen.getByText("AGGREGATE")).toBeInTheDocument();
    });

    it("displays source count indicator", () => {
      const props = createNodeProps(createMockVariableAggregatorNodeData({ sourceCount: 4 }));
      render(<VariableAggregatorNode {...props} />);
      expect(screen.getByText("4 个输入源")).toBeInTheDocument();
    });
  });

  describe("Aggregation Mode", () => {
    it("displays merge mode correctly", () => {
      const props = createNodeProps(
        createMockVariableAggregatorNodeData({ aggregationMode: "merge" })
      );
      render(<VariableAggregatorNode {...props} />);
      expect(screen.getByText("合并对象")).toBeInTheDocument();
    });

    it("displays concat mode correctly", () => {
      const props = createNodeProps(
        createMockVariableAggregatorNodeData({ aggregationMode: "concat" })
      );
      render(<VariableAggregatorNode {...props} />);
      expect(screen.getByText("数组拼接")).toBeInTheDocument();
    });

    it("displays first mode correctly", () => {
      const props = createNodeProps(
        createMockVariableAggregatorNodeData({ aggregationMode: "first" })
      );
      render(<VariableAggregatorNode {...props} />);
      expect(screen.getByText("取第一个")).toBeInTheDocument();
    });
  });

  describe("Add Source Button", () => {
    it("shows add source button", () => {
      const props = createNodeProps(createMockVariableAggregatorNodeData());
      render(<VariableAggregatorNode {...props} />);
      expect(screen.getByText("添加输入源")).toBeInTheDocument();
    });

    it("increments source count on add button click", () => {
      const props = createNodeProps(createMockVariableAggregatorNodeData({ sourceCount: 2 }));
      render(<VariableAggregatorNode {...props} />);

      const addButton = screen.getByText("添加输入源");
      fireEvent.click(addButton);

      expect(screen.getByText("3 个输入源")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("applies selected styles", () => {
      const props = createNodeProps(createMockVariableAggregatorNodeData(), { selected: true });
      const { container } = render(<VariableAggregatorNode {...props} />);
      const node = container.firstChild as HTMLElement;
      expect(node.className).toContain("border-violet-500");
    });
  });
});
