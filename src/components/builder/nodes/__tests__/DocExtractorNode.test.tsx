import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@/test/utils/renderWithProviders";
import DocExtractorNode from "@/components/builder/nodes/DocExtractorNode";
import { createMockDocExtractorNodeData } from "@/test/utils/mockNodeData";
import { createNodeProps } from "@/test/utils/nodePropsHelper";

describe("DocExtractorNode", () => {
  describe("Rendering", () => {
    it("renders with default label", () => {
      const props = createNodeProps(createMockDocExtractorNodeData({ label: undefined }));
      render(<DocExtractorNode {...props} />);
      expect(screen.getByText("文档提取器")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      const props = createNodeProps(createMockDocExtractorNodeData({ label: "PDF 解析器" }));
      render(<DocExtractorNode {...props} />);
      expect(screen.getByText("PDF 解析器")).toBeInTheDocument();
    });

    it("shows DOC badge", () => {
      const props = createNodeProps(createMockDocExtractorNodeData());
      render(<DocExtractorNode {...props} />);
      expect(screen.getByText("DOC")).toBeInTheDocument();
    });

    it("shows waiting for file input message", () => {
      const props = createNodeProps(createMockDocExtractorNodeData());
      render(<DocExtractorNode {...props} />);
      expect(screen.getByText("等待文件输入...")).toBeInTheDocument();
    });
  });

  describe("Supported Formats", () => {
    it("displays format badges", () => {
      const props = createNodeProps(createMockDocExtractorNodeData());
      render(<DocExtractorNode {...props} />);

      expect(screen.getByText(".pdf")).toBeInTheDocument();
      expect(screen.getByText(".docx")).toBeInTheDocument();
      expect(screen.getByText(".txt")).toBeInTheDocument();
    });

    it("toggles format selection on click", () => {
      const props = createNodeProps(createMockDocExtractorNodeData());
      render(<DocExtractorNode {...props} />);

      const xlsxBadge = screen.getByText(".xlsx");
      fireEvent.click(xlsxBadge);

      expect(xlsxBadge).toBeInTheDocument();
    });
  });

  describe("Extraction Mode", () => {
    it("shows extraction mode selector", () => {
      const props = createNodeProps(createMockDocExtractorNodeData());
      render(<DocExtractorNode {...props} />);

      expect(screen.getByText("提取模式")).toBeInTheDocument();
    });
  });

  describe("Advanced Settings", () => {
    it("expands to show OCR toggle", () => {
      const props = createNodeProps(createMockDocExtractorNodeData());
      render(<DocExtractorNode {...props} />);

      const advancedButton = screen.getByRole("button", { name: /高级设置/i });
      fireEvent.click(advancedButton);

      expect(screen.getByText("OCR 识别")).toBeInTheDocument();
    });

    it("shows max pages configuration", () => {
      const props = createNodeProps(createMockDocExtractorNodeData({ maxPages: 100 }));
      render(<DocExtractorNode {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /高级设置/i }));

      expect(screen.getByText("最大页数")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("applies selected styles", () => {
      const props = createNodeProps(createMockDocExtractorNodeData(), { selected: true });
      const { container } = render(<DocExtractorNode {...props} />);
      const node = container.firstChild as HTMLElement;
      expect(node.className).toContain("border-orange-500");
    });
  });
});
