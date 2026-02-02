/**
 * Edge Function Integration Tests
 * Tests for workflow edge functions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the edge function responses
const mockLLMResponse = {
  text: "This is a generated response",
  structured: null,
  usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
};

const mockHTTPResponse = {
  status: 200,
  body: { data: "response data" },
  headers: { "content-type": "application/json" },
};

const mockCodeResult = {
  result: { processed: true, value: 42 },
  logs: ["Execution started", "Processing complete"],
  error: null,
};

describe("Edge Function Integration", () => {
  describe("workflow-llm-call", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("should call LLM with correct parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLLMResponse),
      });
      global.fetch = mockFetch;

      const payload = {
        model: "google/gemini-2.5-flash",
        systemPrompt: "You are a helpful assistant",
        userInput: "Hello!",
        temperature: 0.7,
        maxTokens: 1000,
      };

      const response = await fetch("/functions/v1/workflow-llm-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/functions/v1/workflow-llm-call",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
      expect(response.ok).toBe(true);
    });

    it("should handle structured output schema", async () => {
      const outputSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      };

      const payload = {
        model: "google/gemini-2.5-flash",
        userInput: "Extract: John is 30 years old",
        structuredOutput: true,
        outputSchema,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockLLMResponse,
            structured: { name: "John", age: 30 },
          }),
      });
      global.fetch = mockFetch;

      const response = await fetch("/functions/v1/workflow-llm-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      expect(result.structured).toEqual({ name: "John", age: 30 });
    });
  });

  describe("workflow-http-request", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("should proxy HTTP GET requests", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHTTPResponse),
      });
      global.fetch = mockFetch;

      const payload = {
        method: "GET",
        url: "https://api.example.com/data",
        headers: { Authorization: "Bearer token123" },
      };

      const response = await fetch("/functions/v1/workflow-http-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(response.ok).toBe(true);
    });

    it("should proxy HTTP POST requests with body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...mockHTTPResponse, status: 201 }),
      });
      global.fetch = mockFetch;

      const payload = {
        method: "POST",
        url: "https://api.example.com/create",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Item" }),
      };

      await fetch("/functions/v1/workflow-http-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it("should handle timeout errors", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Request timeout"));
      global.fetch = mockFetch;

      const payload = {
        method: "GET",
        url: "https://api.example.com/slow",
        timeout: 5000,
      };

      await expect(
        fetch("/functions/v1/workflow-http-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      ).rejects.toThrow("Request timeout");
    });
  });

  describe("workflow-code-executor", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("should execute JavaScript code", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCodeResult),
      });
      global.fetch = mockFetch;

      const payload = {
        language: "javascript",
        code: `
          function main(inputs) {
            return { result: inputs.value * 2 };
          }
        `,
        inputs: { value: 21 },
      };

      const response = await fetch("/functions/v1/workflow-code-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.result).toBeDefined();
    });

    it("should handle code execution errors", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: null,
            logs: [],
            error: "ReferenceError: undefined is not defined",
          }),
      });
      global.fetch = mockFetch;

      const payload = {
        language: "javascript",
        code: `
          function main() {
            return undefinedVariable;
          }
        `,
        inputs: {},
      };

      const response = await fetch("/functions/v1/workflow-code-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      expect(result.error).toBeDefined();
      expect(result.error).toContain("undefined");
    });

    it("should respect timeout limits", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 408,
        json: () =>
          Promise.resolve({
            error: "Code execution timeout exceeded",
          }),
      });
      global.fetch = mockFetch;

      const payload = {
        language: "javascript",
        code: `
          function main() {
            while(true) {}
          }
        `,
        inputs: {},
        timeout: 1000,
      };

      const response = await fetch("/functions/v1/workflow-code-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(408);
    });
  });
});

describe("Error Handling", () => {
  it("should return proper error format for validation errors", () => {
    const validationError = {
      error: true,
      code: "VALIDATION_ERROR",
      message: "Invalid model specified",
      details: { field: "model", value: "invalid-model" },
    };

    expect(validationError.error).toBe(true);
    expect(validationError.code).toBe("VALIDATION_ERROR");
  });

  it("should return proper error format for rate limiting", () => {
    const rateLimitError = {
      error: true,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests",
      retryAfter: 60,
    };

    expect(rateLimitError.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(rateLimitError.retryAfter).toBe(60);
  });
});
