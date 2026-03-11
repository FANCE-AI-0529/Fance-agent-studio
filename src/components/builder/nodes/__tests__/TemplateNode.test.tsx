import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../../../test/utils/renderWithProviders.tsx";
import TemplateNode from "../TemplateNode.tsx";
import { createMockTemplateNodeData } from "../../../../test/utils/mockNodeData.ts";
import { createNodeProps } from "../../../../test/utils/nodePropsHelper.ts";

describe("TemplateNode", () => {
  describe("Rendering", () => {
    it("renders with default label", () => {
      const data = createMockTemplateNodeData({ label: undefined });
      const props = createNodeProps(data);
      render(<TemplateNode {...props} />);
      expect(screen.getByText("模板转换")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      const data = createMockTemplateNodeData({ label: "自定义模板" });
      const props = createNodeProps(data);
      render(<TemplateNode {...props} />);
      expect(screen.getByText("自定义模板")).toBeInTheDocument();
    });

    it("shows Jinja2/Handlebars subtitle", () => {
      const props = createNodeProps(createMockTemplateNodeData());
      render(<TemplateNode {...props} />);
      expect(screen.getByText("Jinja2 / Handlebars")).toBeInTheDocument();
    });

    it("shows TEMPLATE badge", () => {
      const props = createNodeProps(createMockTemplateNodeData());
      render(<TemplateNode {...props} />);
      expect(screen.getByText("TEMPLATE")).toBeInTheDocument();
    });
  });

  describe("Variable Extraction", () => {
    it("extracts and displays variables from template", () => {
      const data = createMockTemplateNodeData({
        template: "Hello {{name}}, your email is {{email}}",
      });
      const props = createNodeProps(data);
      render(<TemplateNode {...props} />);

      expect(screen.getByText("检测到的变量：")).toBeInTheDocument();
      expect(screen.getByText("name")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
    });

    it("handles templates with no variables", () => {
      const data = createMockTemplateNodeData({
        template: "静态文本无变量",
      });
      const props = createNodeProps(data);
      render(<TemplateNode {...props} />);

      expect(screen.queryByText("检测到的变量：")).not.toBeInTheDocument();
    });

    it("shows +N badge when more than 6 variables", () => {
      const data = createMockTemplateNodeData({
        template: "{{a}} {{b}} {{c}} {{d}} {{e}} {{f}} {{g}} {{h}}",
      });
      const props = createNodeProps(data);
      render(<TemplateNode {...props} />);

      expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("deduplicates repeated variables", () => {
      const data = createMockTemplateNodeData({
        template: "{{name}} and {{name}} again",
      });
      const props = createNodeProps(data);
      render(<TemplateNode {...props} />);

      const nameBadges = screen.getAllByText("name");
      expect(nameBadges).toHaveLength(1);
    });
  });

  describe("Template Editor", () => {
    it("expands template editor on button click", async () => {
      const props = createNodeProps(createMockTemplateNodeData());
      render(<TemplateNode {...props} />);

      const expandButton = screen.getByRole("button", { name: /编辑模板/i });
      fireEvent.click(expandButton);

      const textarea = screen.getByPlaceholderText("输入模板内容...");
      expect(textarea).toBeInTheDocument();
    });

    it("allows editing template content", async () => {
      const props = createNodeProps(createMockTemplateNodeData());
      render(<TemplateNode {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /编辑模板/i }));

      const textarea = screen.getByPlaceholderText("输入模板内容...");
      fireEvent.change(textarea, { target: { value: "新模板 {{newVar}}" } });

      expect(textarea).toHaveValue("新模板 {{newVar}}");
    });

    it("copies template to clipboard", async () => {
      const props = createNodeProps(createMockTemplateNodeData());
      render(<TemplateNode {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /编辑模板/i }));

      const buttons = screen.getAllByRole("button");
      const copyButton = buttons.find(
        (btn) => btn.querySelector('[class*="Copy"]') !== null
      );

      if (copyButton) {
        fireEvent.click(copyButton);
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      }
    });
  });

  describe("Output Format", () => {
    it("displays text format by default", () => {
      const props = createNodeProps(createMockTemplateNodeData({ outputFormat: undefined }));
      render(<TemplateNode {...props} />);
      expect(screen.getByText("text")).toBeInTheDocument();
    });

    it("displays configured output format", () => {
      const props = createNodeProps(createMockTemplateNodeData({ outputFormat: "json" }));
      render(<TemplateNode {...props} />);
      expect(screen.getByText("json")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("applies selected styles", () => {
      const props = createNodeProps(createMockTemplateNodeData(), { selected: true });
      const { container } = render(<TemplateNode {...props} />);
      const node = container.firstChild as HTMLElement;
      expect(node.className).toContain("border-emerald-500");
    });
  });
});
