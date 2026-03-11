/**
 * Workflow Node Integration Tests
 * Tests for node interactions and data flow
 */
import { describe, it, expect } from "vitest";
import {
  createMockLLMNodeData,
  createMockHTTPRequestNodeData,
  createMockCodeNodeData,
  createMockTemplateNodeData,
  createMockIteratorNodeData,
  createMockVariableAggregatorNodeData,
} from "../utils/mockNodeData.ts";

describe("Workflow Node Integration", () => {
  describe("Node Data Factory", () => {
    it("creates valid LLM node data", () => {
      const data = createMockLLMNodeData();
      expect(data.id).toBeDefined();
      expect(data.name).toBeDefined();
      expect(data.config).toBeDefined();
      expect(data.config?.model).toBe("google/gemini-2.5-flash");
    });

    it("creates valid HTTP request node data", () => {
      const data = createMockHTTPRequestNodeData();
      expect(data.id).toBeDefined();
      expect(data.config?.method).toBe("GET");
      expect(data.config?.url).toContain("https://");
    });

    it("creates valid Code node data", () => {
      const data = createMockCodeNodeData();
      expect(data.id).toBeDefined();
      expect(data.config?.language).toBe("javascript");
      expect(data.config?.code).toContain("function");
    });

    it("creates valid Template node data", () => {
      const data = createMockTemplateNodeData();
      expect(data.id).toBeDefined();
      expect(data.template).toContain("{{");
    });

    it("creates valid Iterator node data", () => {
      const data = createMockIteratorNodeData();
      expect(data.id).toBeDefined();
      expect(data.parallelism).toBeGreaterThan(0);
    });

    it("creates valid Variable Aggregator node data", () => {
      const data = createMockVariableAggregatorNodeData();
      expect(data.id).toBeDefined();
      expect(data.aggregationMode).toBe("merge");
    });

    it("allows overriding default values", () => {
      const data = createMockLLMNodeData({
        name: "Custom Name",
        config: { model: "openai/gpt-5" },
      });
      expect(data.name).toBe("Custom Name");
      expect(data.config?.model).toBe("openai/gpt-5");
    });
  });

  describe("Node Type Compatibility", () => {
    it("all node data types include index signature", () => {
      const llmData = createMockLLMNodeData();
      const httpData = createMockHTTPRequestNodeData();
      const codeData = createMockCodeNodeData();
      const templateData = createMockTemplateNodeData();
      const iteratorData = createMockIteratorNodeData();
      const aggregatorData = createMockVariableAggregatorNodeData();

      // All should be assignable to Record<string, unknown>
      const allData: Record<string, unknown>[] = [
        llmData,
        httpData,
        codeData,
        templateData,
        iteratorData,
        aggregatorData,
      ];

      allData.forEach((data) => {
        expect(data.id).toBeDefined();
      });
    });
  });
});

describe("Workflow Execution Context", () => {
  describe("Variable Resolution", () => {
    it("resolves template variables correctly", () => {
      const template = "Hello {{name}}, your order {{orderId}} is ready!";
      const variables = { name: "Alice", orderId: "12345" };

      const resolved = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return String(variables[key as keyof typeof variables] || "");
      });

      expect(resolved).toBe("Hello Alice, your order 12345 is ready!");
    });

    it("handles missing variables gracefully", () => {
      const template = "Hello {{name}}, your {{item}} is ready!";
      const variables = { name: "Bob" };

      const resolved = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return String((variables as Record<string, unknown>)[key] ?? "");
      });

      expect(resolved).toBe("Hello Bob, your  is ready!");
    });
  });

  describe("Iterator Logic", () => {
    it("processes array items with parallelism control", async () => {
      const items = [1, 2, 3, 4, 5];
      const parallelism = 2;
      const results: number[] = [];

      // Simulate parallel processing with controlled concurrency
      for (let i = 0; i < items.length; i += parallelism) {
        const batch = items.slice(i, i + parallelism);
        const batchResults = await Promise.all(
          batch.map(async (item) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return item * 2;
          })
        );
        results.push(...batchResults);
      }

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it("handles error strategies correctly", () => {
      const items = [1, 2, "error", 4, 5];
      const processedItems: (number | string)[] = [];
      const errors: string[] = [];

      for (const item of items) {
        try {
          if (item === "error") {
            throw new Error("Processing failed");
          }
          processedItems.push(item as number);
        } catch (e) {
          // Continue strategy: log error and continue
          errors.push((e as Error).message);
        }
      }

      expect(processedItems).toEqual([1, 2, 4, 5]);
      expect(errors).toHaveLength(1);
    });
  });

  describe("Loop Logic", () => {
    it("executes loop with condition check", () => {
      const maxIterations = 10;
      let counter = 0;
      let result = 0;

      while (counter < 5 && counter < maxIterations) {
        result += counter;
        counter++;
      }

      expect(counter).toBe(5);
      expect(result).toBe(10); // 0+1+2+3+4
    });

    it("respects max iterations limit", () => {
      const maxIterations = 3;
      let counter = 0;

      while (counter < 100 && counter < maxIterations) {
        counter++;
      }

      expect(counter).toBe(3);
    });
  });

  describe("Variable Aggregation", () => {
    it("merges objects correctly", () => {
      const source1 = { a: 1, b: 2 };
      const source2 = { c: 3, d: 4 };
      const source3 = { b: 5, e: 6 }; // b overlaps

      const merged = { ...source1, ...source2, ...source3 };

      expect(merged).toEqual({ a: 1, b: 5, c: 3, d: 4, e: 6 });
    });

    it("concatenates arrays correctly", () => {
      const array1 = [1, 2, 3];
      const array2 = [4, 5];
      const array3 = [6, 7, 8, 9];

      const concatenated = [...array1, ...array2, ...array3];

      expect(concatenated).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("picks first non-null value", () => {
      const sources = [null, undefined, "first valid", "second"];

      const first = sources.find((s) => s != null);

      expect(first).toBe("first valid");
    });
  });
});
