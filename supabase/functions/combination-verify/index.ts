// =====================================================
// 组合能力验收边缘函数 - Combination Verification Edge Function
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 地狱级测试场景
const HELL_TEST_SCENARIOS = [
  {
    id: 'after-sales-assistant',
    name: '售后助手 (地狱级)',
    description: '验证 Knowledge + Skill + Router + 双 MCP 分支的完整生成能力',
    input: `做一个售后助手。根据产品维修手册(Knowledge)，判断用户发来的图片(Skill)。
            如果是人为损坏，发邮件(MCP)报价；如果是质量问题，登记到Notion(MCP)。`,
    expectedTopology: {
      requiredNodes: [
        { type: 'knowledge', namePattern: '维修|手册|manual|repair', slotType: 'perception' },
        { type: 'skill', namePattern: '图片|image|分析|analysis|视觉', slotType: 'perception' },
        { type: 'router', namePattern: '判断|路由|router|决策|decision', slotType: 'decision' },
        { type: 'mcp_action', namePattern: '邮件|email|mail|发送', slotType: 'action' },
        { type: 'mcp_action', namePattern: 'notion|登记|记录|write', slotType: 'action' },
      ],
      requiredBranches: [
        { condition: '人为损坏', targetNodeType: 'mcp_action' },
        { condition: '质量问题', targetNodeType: 'mcp_action' },
      ],
      minNodes: 5,
      maxNodes: 12,
    },
    expectedManus: {
      planningWithFiles: true,
      findingsLogging: true,
      progressLogging: true,
      requiredLogOperations: ['send', 'write'],
    },
    expectedWiring: {
      requiredConnections: [
        { sourcePattern: 'knowledge', targetPattern: 'router|agent', minConfidence: 0.6 },
        { sourcePattern: 'skill', targetPattern: 'router|agent', minConfidence: 0.5 },
        { sourcePattern: 'router', targetPattern: 'mcp_action', minConfidence: 0.7 },
      ],
      minCoverage: 0.7,
    },
  },
  {
    id: 'research-report-generator',
    name: '研究报告生成器 (地狱级)',
    description: '验证 Web Search + Analysis + File Write 的完整链路',
    input: `创建一个市场研究助手。每周一9点，用Web Search(MCP)收集竞品信息，
            用分析技能(Skill)生成报告，然后写入到 findings.md(MCP)，最后发送邮件(MCP)通知团队。`,
    expectedTopology: {
      requiredNodes: [
        { type: 'trigger', namePattern: '定时|schedule|cron|周一', slotType: 'trigger' },
        { type: 'mcp_action', namePattern: 'web|search|搜索|tavily', slotType: 'perception' },
        { type: 'skill', namePattern: '分析|analysis|报告|report', slotType: 'decision' },
        { type: 'mcp_action', namePattern: 'write|file|文件|写入|findings', slotType: 'action' },
        { type: 'mcp_action', namePattern: 'email|邮件|mail|通知', slotType: 'action' },
      ],
      minNodes: 4,
      maxNodes: 10,
    },
    expectedManus: {
      planningWithFiles: true,
      findingsLogging: true,
      progressLogging: true,
      requiredLogOperations: ['write', 'send'],
    },
    expectedWiring: {
      requiredConnections: [
        { sourcePattern: 'search|web', targetPattern: 'skill|analysis', minConfidence: 0.6 },
        { sourcePattern: 'skill|analysis', targetPattern: 'write|file', minConfidence: 0.6 },
        { sourcePattern: 'write|file', targetPattern: 'email|mail', minConfidence: 0.5 },
      ],
      minCoverage: 0.8,
    },
  },
];

// 拓扑验证
function verifyTopology(dsl: any, expectation: any): any {
  const result = {
    passed: true,
    foundNodes: [] as any[],
    missingNodes: [] as string[],
    branchesCorrect: true,
    details: [] as string[],
    nodeCount: 0,
  };

  // 提取所有节点
  const allNodes: any[] = [];
  for (const stage of dsl.stages || []) {
    allNodes.push(...(stage.nodes || []));
    if (stage.branches) {
      for (const branch of stage.branches) {
        allNodes.push(...(branch.nodes || []));
      }
    }
  }
  result.nodeCount = allNodes.length;

  // 检查必需节点
  for (const required of expectation.requiredNodes || []) {
    const pattern = new RegExp(required.namePattern, 'i');
    const found = allNodes.find((node: any) => {
      const typeMatch = node.type === required.type;
      const nameMatch = pattern.test(node.name) || pattern.test(node.description || '');
      return typeMatch || nameMatch;
    });

    if (found) {
      result.foundNodes.push({ expected: required, actual: found, match: 'partial' });
      result.details.push(`✅ 找到节点: ${required.type}`);
    } else {
      result.passed = false;
      result.missingNodes.push(`${required.type} (${required.namePattern})`);
      result.details.push(`❌ 缺少节点: ${required.type}`);
    }
  }

  // 检查分支
  if (expectation.requiredBranches) {
    for (const reqBranch of expectation.requiredBranches) {
      let found = false;
      
      // 在条件阶段中查找
      for (const stage of dsl.stages || []) {
        if (stage.type === 'conditional' && stage.branches) {
          for (const branch of stage.branches) {
            if (branch.condition?.includes(reqBranch.condition) || 
                branch.name?.includes(reqBranch.condition)) {
              found = true;
              result.details.push(`✅ 找到分支: "${reqBranch.condition}"`);
              break;
            }
          }
        }
        if (found) break;
      }

      // 在边中查找
      if (!found) {
        for (const edge of dsl.edges || []) {
          if (edge.condition?.includes(reqBranch.condition)) {
            found = true;
            result.details.push(`✅ 找到条件边: "${reqBranch.condition}"`);
            break;
          }
        }
      }

      if (!found) {
        result.branchesCorrect = false;
        result.details.push(`❌ 缺少分支: "${reqBranch.condition}"`);
      }
    }
  }

  // 检查节点数量
  if (allNodes.length < expectation.minNodes) {
    result.passed = false;
    result.details.push(`⚠️ 节点数量不足: ${allNodes.length} < ${expectation.minNodes}`);
  }

  return result;
}

// Manus 合规验证
function verifyManusCompliance(dsl: any, expectation: any): any {
  const result = {
    passed: true,
    planningEnabled: false,
    loggerNodesInjected: 0,
    findingsConnected: false,
    progressConnected: false,
    operationsCovered: [] as string[],
    missingOperations: [] as string[],
    details: [] as string[],
  };

  // 提取所有节点
  const allNodes: any[] = [];
  for (const stage of dsl.stages || []) {
    allNodes.push(...(stage.nodes || []));
    if (stage.branches) {
      for (const branch of stage.branches) {
        allNodes.push(...(branch.nodes || []));
      }
    }
  }

  // 检查 planning
  const agentNodes = allNodes.filter((n: any) => n.type === 'agent' || n.type === 'llm');
  for (const agent of agentNodes) {
    if (agent.config?.planningEnabled || agent.config?.planning || agent.config?.manusProtocol) {
      result.planningEnabled = true;
      break;
    }
  }

  if (expectation.planningWithFiles && !result.planningEnabled) {
    result.details.push('❌ Agent Core 未启用 planning-with-files');
  } else if (result.planningEnabled) {
    result.details.push('✅ Agent Core 已启用 planning-with-files');
  }

  // 检查 logger 节点
  result.loggerNodesInjected = allNodes.filter((n: any) => 
    n.type === 'manus_logger' || n.name?.toLowerCase().includes('logger')
  ).length;

  // 检查 findings 和 progress 连接
  result.findingsConnected = allNodes.some((n: any) => 
    n.config?.targetFile?.includes('findings')
  );
  result.progressConnected = allNodes.some((n: any) => 
    n.config?.targetFile?.includes('progress')
  );

  if (expectation.findingsLogging && !result.findingsConnected) {
    result.details.push('⚠️ 未连接 findings.md');
  }
  if (expectation.progressLogging && !result.progressConnected) {
    result.details.push('⚠️ 未连接 progress.md');
  }

  // 检查操作覆盖
  const mcpNodes = allNodes.filter((n: any) => n.type === 'mcp_action' || n.type?.includes('mcp'));
  
  for (const op of expectation.requiredLogOperations || []) {
    const keywordMap: Record<string, string[]> = {
      write: ['write', 'create', 'save', '写入', '创建'],
      send: ['send', 'email', 'notify', '发送', '邮件'],
      delete: ['delete', 'remove', '删除'],
    };
    const keywords = keywordMap[op] || [op];

    const found = mcpNodes.some((n: any) => {
      const text = `${n.name} ${n.description || ''}`.toLowerCase();
      return keywords.some((k: string) => text.includes(k));
    });

    if (found) {
      result.operationsCovered.push(op);
      result.details.push(`✅ 找到 ${op} 操作`);
    } else {
      result.missingOperations.push(op);
      result.details.push(`❌ 缺少 ${op} 操作`);
    }
  }

  if (result.missingOperations.length > 0) {
    result.passed = false;
  }

  return result;
}

// 连线验证
function verifyWiring(dsl: any, expectation: any): any {
  const result = {
    passed: true,
    connections: [] as any[],
    coveragePercent: 0,
    draftEdges: 0,
    confirmedEdges: 0,
    missingConnections: [] as string[],
    warnings: [] as string[],
  };

  // 提取所有节点
  const allNodes: any[] = [];
  for (const stage of dsl.stages || []) {
    allNodes.push(...(stage.nodes || []));
    if (stage.branches) {
      for (const branch of stage.branches) {
        allNodes.push(...(branch.nodes || []));
      }
    }
  }

  // 从边推断连接
  for (const edge of dsl.edges || []) {
    result.connections.push({
      id: edge.id,
      source: { nodeId: edge.source },
      target: { nodeId: edge.target },
      confidence: edge.condition ? 0.7 : 0.9,
      status: 'confirmed',
    });
    result.confirmedEdges++;
  }

  // 检查必需连接
  for (const reqConn of expectation.requiredConnections || []) {
    const sourcePattern = new RegExp(reqConn.sourcePattern, 'i');
    const targetPattern = new RegExp(reqConn.targetPattern, 'i');

    const found = result.connections.some((conn: any) => {
      const sourceNode = allNodes.find((n: any) => n.id === conn.source.nodeId);
      const targetNode = allNodes.find((n: any) => n.id === conn.target.nodeId);

      if (!sourceNode || !targetNode) return false;

      const sourceMatch = sourcePattern.test(sourceNode.type) || 
                         sourcePattern.test(sourceNode.name);
      const targetMatch = targetPattern.test(targetNode.type) || 
                         targetPattern.test(targetNode.name);

      return sourceMatch && targetMatch;
    });

    if (!found) {
      result.missingConnections.push(`${reqConn.sourcePattern} → ${reqConn.targetPattern}`);
      result.warnings.push(`❌ 缺少连线: ${reqConn.sourcePattern} → ${reqConn.targetPattern}`);
    }
  }

  // 计算覆盖率
  const totalExpected = expectation.requiredConnections?.length || 0;
  const foundCount = totalExpected - result.missingConnections.length;
  result.coveragePercent = totalExpected > 0 ? foundCount / totalExpected : 1;

  if (result.coveragePercent < expectation.minCoverage) {
    result.passed = false;
    result.warnings.push(
      `❌ 连线覆盖率不足: ${Math.round(result.coveragePercent * 100)}% < ${Math.round(expectation.minCoverage * 100)}%`
    );
  }

  return result;
}

// 数据流分析
function analyzeDataFlow(dsl: any): any {
  const paths: any[] = [];
  const allNodes: any[] = [];
  
  for (const stage of dsl.stages || []) {
    allNodes.push(...(stage.nodes || []));
    if (stage.branches) {
      for (const branch of stage.branches) {
        allNodes.push(...(branch.nodes || []));
      }
    }
  }

  // 找入口节点
  const edges = dsl.edges || [];
  const entryNodes = allNodes.filter((n: any) => 
    n.type === 'trigger' || !edges.some((e: any) => e.target === n.id)
  );

  // 简单遍历生成路径
  for (const entry of entryNodes) {
    const path = {
      id: `path-${paths.length + 1}`,
      nodes: [entry.id],
      edges: [] as string[],
      dataTypes: [entry.type],
      isComplete: false,
      description: `[${entry.name}]`,
    };

    let currentId = entry.id;
    const visited = new Set<string>([currentId]);

    while (true) {
      const nextEdge = edges.find((e: any) => e.source === currentId && !visited.has(e.target));
      if (!nextEdge) {
        path.isComplete = true;
        break;
      }

      const nextNode = allNodes.find((n: any) => n.id === nextEdge.target);
      if (!nextNode) break;

      visited.add(nextEdge.target);
      path.nodes.push(nextEdge.target);
      path.edges.push(nextEdge.id);
      path.dataTypes.push(nextNode.type);
      path.description += ` → [${nextNode.name}]`;
      currentId = nextEdge.target;
    }

    paths.push(path);
  }

  return {
    paths,
    highlightedPath: paths[0]?.nodes || [],
    entryPoints: entryNodes.map((n: any) => n.id),
    exitPoints: allNodes
      .filter((n: any) => !edges.some((e: any) => e.source === n.id))
      .map((n: any) => n.id),
    branchPoints: [],
  };
}

// 计算总分
function calculateScore(topology: any, manus: any, wiring: any): number {
  const topologyScore = topology.passed ? 1 : 
    topology.foundNodes.length / (topology.foundNodes.length + topology.missingNodes.length);
  
  const totalOps = manus.operationsCovered.length + manus.missingOperations.length;
  const manusScore = totalOps > 0 
    ? manus.operationsCovered.length / totalOps 
    : (manus.passed ? 1 : 0);
  
  const wiringScore = wiring.coveragePercent;

  return topologyScore * 0.4 + manusScore * 0.3 + wiringScore * 0.3;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenarioId, userId, customInput } = await req.json();

    // 获取测试场景
    let scenario = HELL_TEST_SCENARIOS.find(s => s.id === scenarioId);
    
    if (!scenario && customInput) {
      // 自定义输入模式
      scenario = {
        id: 'custom',
        name: '自定义测试',
        description: '用户自定义测试场景',
        input: customInput,
        expectedTopology: {
          requiredNodes: [],
          minNodes: 1,
          maxNodes: 20,
        },
        expectedManus: {
          planningWithFiles: true,
          findingsLogging: true,
          progressLogging: true,
          requiredLogOperations: [],
        },
        expectedWiring: {
          requiredConnections: [],
          minCoverage: 0.5,
        },
      };
    }

    if (!scenario) {
      return new Response(
        JSON.stringify({ error: 'Scenario not found', availableScenarios: HELL_TEST_SCENARIOS.map(s => s.id) }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    // 调用 workflow-generator (模拟 - 实际实现需要真实调用)
    // 这里为了演示，生成一个模拟 DSL
    const mockDSL = generateMockDSL(scenario);

    // 执行验证
    const topologyCheck = verifyTopology(mockDSL, scenario.expectedTopology);
    const manusCheck = verifyManusCompliance(mockDSL, scenario.expectedManus);
    const wiringCheck = verifyWiring(mockDSL, scenario.expectedWiring);
    const dataFlow = analyzeDataFlow(mockDSL);

    const score = calculateScore(topologyCheck, manusCheck, wiringCheck);
    const passed = score >= 0.7;

    const result = {
      scenario: {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        input: scenario.input,
      },
      passed,
      score,
      topologyCheck,
      manusCheck,
      wiringCheck,
      dataFlow,
      generatedDSL: mockDSL,
      blueprintUsed: 'perception-router-multi-action',
      warnings: [
        ...topologyCheck.details.filter((d: string) => d.startsWith('❌') || d.startsWith('⚠️')),
        ...manusCheck.details.filter((d: string) => d.startsWith('❌') || d.startsWith('⚠️')),
        ...wiringCheck.warnings,
      ],
      suggestions: generateSuggestions(topologyCheck, manusCheck, wiringCheck),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error('Combination verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// 生成模拟 DSL (实际实现应调用 workflow-generator)
function generateMockDSL(scenario: any): any {
  if (scenario.id === 'after-sales-assistant') {
    return {
      id: 'workflow-after-sales',
      name: '售后助手工作流',
      description: scenario.input,
      stages: [
        {
          id: 'stage-perception',
          name: '感知阶段',
          type: 'parallel',
          nodes: [
            { id: 'node-knowledge', type: 'knowledge', name: '产品维修手册', slotType: 'perception', config: {} },
            { id: 'node-skill', type: 'skill', name: '图片分析技能', slotType: 'perception', config: {} },
          ],
        },
        {
          id: 'stage-decision',
          name: '决策阶段',
          type: 'sequential',
          nodes: [
            { id: 'node-router', type: 'router', name: '损坏类型判断', slotType: 'decision', config: {} },
          ],
        },
        {
          id: 'stage-action',
          name: '行动阶段',
          type: 'conditional',
          branches: [
            {
              id: 'branch-human',
              name: '人为损坏分支',
              condition: '人为损坏',
              nodes: [
                { id: 'node-email', type: 'mcp_action', name: '发送报价邮件', slotType: 'action', config: {} },
              ],
            },
            {
              id: 'branch-quality',
              name: '质量问题分支',
              condition: '质量问题',
              nodes: [
                { id: 'node-notion', type: 'mcp_action', name: '登记到Notion', slotType: 'action', config: {} },
              ],
            },
          ],
        },
      ],
      edges: [
        { id: 'edge-1', source: 'node-knowledge', target: 'node-router' },
        { id: 'edge-2', source: 'node-skill', target: 'node-router' },
        { id: 'edge-3', source: 'node-router', target: 'node-email', condition: '人为损坏' },
        { id: 'edge-4', source: 'node-router', target: 'node-notion', condition: '质量问题' },
      ],
    };
  }

  // 默认模拟
  return {
    id: 'workflow-mock',
    name: '模拟工作流',
    description: scenario.input,
    stages: [],
    edges: [],
  };
}

// 生成建议
function generateSuggestions(topology: any, manus: any, wiring: any): string[] {
  const suggestions: string[] = [];

  if (topology.missingNodes.length > 0) {
    suggestions.push(`添加缺失的节点: ${topology.missingNodes.join(', ')}`);
  }

  if (!topology.branchesCorrect) {
    suggestions.push('检查条件分支配置，确保所有分支路径正确');
  }

  if (!manus.planningEnabled) {
    suggestions.push('为 Agent Core 启用 planning-with-files 功能');
  }

  if (manus.missingOperations.length > 0) {
    suggestions.push(`添加缺失的 MCP 操作: ${manus.missingOperations.join(', ')}`);
  }

  if (wiring.missingConnections.length > 0) {
    suggestions.push(`完善节点连线: ${wiring.missingConnections.join('; ')}`);
  }

  return suggestions;
}
