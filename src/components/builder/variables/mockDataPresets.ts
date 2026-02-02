// Predefined mock data for different node types

export const mockDataPresets: Record<string, unknown> = {
  trigger: {
    message: "你好，请帮我查询明天上海的天气",
    timestamp: Date.now(),
    metadata: {
      platform: "web",
      session_id: "sess_12345",
      locale: "zh-CN",
    },
    user_id: "usr_67890",
  },
  
  agent: {
    response: "根据查询，明天上海的天气预计晴转多云，气温 22-28°C。",
    thinking: "用户询问天气，需要调用天气 API 获取实时数据...",
    confidence: 0.92,
    citations: [
      { source: "天气预报API", chunk_id: "chunk_001" },
    ],
    trace: {
      duration_ms: 1250,
      tokens_used: 156,
    },
  },
  
  skill: {
    output: {
      temp: 25.5,
      humidity: 65,
      city: "Shanghai",
      forecast: "Sunny",
      description: "晴朗",
    },
    status: "success",
    error: null,
  },
  
  knowledge: {
    chunks: [
      {
        id: "chunk_001",
        content: "上海市位于中国东部沿海...",
        score: 0.89,
      },
    ],
    entities: [
      { name: "上海", type: "city" },
      { name: "天气", type: "topic" },
    ],
    context: "用户正在查询上海的天气信息",
    sources: ["地理知识库", "天气数据库"],
  },
  
  intentRouter: {
    matched_intent: "weather_query",
    confidence: 0.95,
    original_input: "明天上海天气怎么样",
    all_intents: [
      { intent: "weather_query", score: 0.95 },
      { intent: "general_chat", score: 0.05 },
    ],
  },
  
  condition: {
    result: true,
    evaluated_value: 0.92,
    expression: "confidence > 0.8",
  },
  
  parallel: {
    results: {
      branch_1: { status: "completed", data: {} },
      branch_2: { status: "completed", data: {} },
    },
    completed: ["branch_1", "branch_2"],
    failed: [],
    duration_ms: 850,
  },
  
  weather_api: {
    output: {
      temp: 25.5,
      humidity: 65,
      city: "Shanghai",
      forecast: "Sunny",
      wind_speed: 12,
      uv_index: 6,
    },
  },
  
  database_query: {
    output: {
      rows: [
        { id: 1, name: "产品A", price: 99.99 },
        { id: 2, name: "产品B", price: 149.99 },
      ],
      count: 2,
    },
  },
  
  // Phase 1: Dify-inspired node mock data
  llm: {
    text: "根据分析，用户的需求是查询天气信息。建议使用天气 API 获取实时数据。",
    structuredOutput: {
      intent: "weather_query",
      entities: {
        location: "上海",
        time: "明天",
      },
    },
    metadata: {
      model: "google/gemini-2.5-flash",
      tokens_used: { prompt: 120, completion: 85 },
      finish_reason: "stop",
    },
  },
  
  httpRequest: {
    success: true,
    statusCode: 200,
    body: {
      data: { temp: 25.5, humidity: 65, city: "Shanghai" },
      message: "success",
    },
    headers: {
      "content-type": "application/json",
      "x-request-id": "req_abc123",
    },
    error: null,
  },
  
  code: {
    success: true,
    result: {
      processed: true,
      count: 42,
      items: ["item1", "item2", "item3"],
    },
    logs: ["Processing started...", "Found 42 items", "Processing complete"],
    executionTime: 15,
  },
  
  parameterExtractor: {
    extractedParams: {
      name: "张三",
      date: "2024-01-15",
      location: "上海",
      amount: 1000,
    },
    confidence: 0.92,
    missingParams: [],
  },
  
  // Phase 2: Auxiliary node mock data
  template: {
    rendered: "你好，张三！今天是 2024-01-15，天气晴朗。",
    variables: {
      user_name: "张三",
      date: "2024-01-15",
      weather: "晴朗",
    },
    templateId: "greeting-template",
  },
  
  variableAggregator: {
    aggregated: {
      branch_1_result: { status: "success", data: [1, 2, 3] },
      branch_2_result: { status: "success", data: [4, 5, 6] },
    },
    mergedData: [1, 2, 3, 4, 5, 6],
    sourceCount: 2,
    mode: "merge",
  },
  
  variableAssigner: {
    assigned: {
      result: "processed_value",
      counter: 42,
      flag: true,
    },
    assignmentCount: 3,
  },
  
  docExtractor: {
    text: "这是从 PDF 文档中提取的文本内容...",
    pages: [
      { pageNum: 1, content: "第一页内容" },
      { pageNum: 2, content: "第二页内容" },
    ],
    metadata: {
      fileName: "report.pdf",
      pageCount: 10,
      fileSize: 1024000,
      format: "pdf",
    },
    ocrUsed: false,
  },
  
  iterator: {
    currentItem: { id: 1, name: "项目A" },
    currentIndex: 0,
    totalItems: 5,
    processedItems: [],
    isComplete: false,
    aggregatedResults: [],
  },
  
  loop: {
    iterationCount: 3,
    loopState: {
      counter: 3,
      accumulator: [1, 2, 3],
    },
    lastResult: { status: "continue" },
    isComplete: false,
    maxIterations: 10,
  },
};

// Get mock data for a specific node type
export function getMockDataForNodeType(nodeType: string): unknown {
  return mockDataPresets[nodeType] || mockDataPresets.skill;
}

// Generate sample mock data based on schema
export function generateMockFromSchema(
  schema: Record<string, string>
): Record<string, unknown> {
  const mock: Record<string, unknown> = {};
  
  for (const [key, type] of Object.entries(schema)) {
    switch (type) {
      case "string":
        mock[key] = `sample_${key}`;
        break;
      case "number":
        mock[key] = 42;
        break;
      case "boolean":
        mock[key] = true;
        break;
      case "array":
        mock[key] = [];
        break;
      case "object":
        mock[key] = {};
        break;
      default:
        mock[key] = null;
    }
  }
  
  return mock;
}
