// =====================================================
// 隐形构建器 Hook - 带 RAG 澄清交互 + 图谱同步
// Invisible Builder Hook - With RAG Clarification + Graph Sync
// =====================================================

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import type { MagicStep } from "@/components/consumer/MagicLoader";
import type { Json } from "@/integrations/supabase/types";
import { useKnowledgeMatching, type KnowledgeMatchResult, type RAGDecision } from "@/hooks/useKnowledgeMatching";
import { useGlobalAgentStore } from "@/stores/globalAgentStore";
import { toast } from "sonner";
import { type AgentAvatar } from "@/components/builder/AgentAvatarPicker";
import { generateSmartAvatar } from "@/utils/avatarGenerator";

export interface InvisibleBuildResult {
  agentId: string;
  agentName: string;
  agentAvatar: { iconId: string; colorId: string };
  skills: string[];
  systemPrompt: string;
  capabilities: string[];
  description?: string;
  mountedKnowledgeBases?: Array<{ id: string; name: string }>;
}

// Clarification state for UI
export interface ClarificationState {
  type: RAGDecision;
  matches: KnowledgeMatchResult[];
  question?: string;
  isPending: boolean;
}

interface UseInvisibleBuilderReturn {
  build: (description: string) => Promise<InvisibleBuildResult>;
  isBuilding: boolean;
  isPaused: boolean;
  currentStepIndex: number;
  steps: MagicStep[];
  progress: number;
  error: string | null;
  reset: () => void;
  
  // Clarification interaction
  clarificationState: ClarificationState | null;
  handleKnowledgeSelection: (selectedIds: string[]) => void;
  handleSkipKnowledge: () => void;
  handleFileUploaded: (kb: { id: string; name: string }) => void;
}

const DEFAULT_STEPS: MagicStep[] = [
  { id: 'understand', text: '正在理解需求...', status: 'pending' },
  { id: 'analyze', text: '分析所需能力...', status: 'pending' },
  { id: 'skills', text: '正在挂载技能...', status: 'pending' },
  { id: 'assemble', text: '数字员工组装中...', status: 'pending' },
  { id: 'complete', text: '组装完成 ✨', status: 'pending' },
];

export function useInvisibleBuilder(): UseInvisibleBuilderReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isBuilding, setIsBuilding] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [steps, setSteps] = useState<MagicStep[]>(DEFAULT_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [clarificationState, setClarificationState] = useState<ClarificationState | null>(null);
  
  const abortRef = useRef(false);
  const resolveDecisionRef = useRef<((value: KnowledgeMatchResult[]) => void) | null>(null);
  const selectedKBsRef = useRef<KnowledgeMatchResult[]>([]);
  
  // ✅ Use precise selectors for store actions to avoid infinite loops
  const setAgentId = useGlobalAgentStore((s) => s.setAgentId);
  const addNode = useGlobalAgentStore((s) => s.addNode);
  const addEdge = useGlobalAgentStore((s) => s.addEdge);
  
  const { matchKnowledgeBases } = useKnowledgeMatching();

  const updateStep = useCallback((index: number, updates: Partial<MagicStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ));
  }, []);

  const advanceToStep = useCallback(async (index: number, text?: string) => {
    // Mark all previous steps as complete
    setSteps(prev => prev.map((step, i) => ({
      ...step,
      status: i < index ? 'complete' : i === index ? 'active' : 'pending',
      text: i === index && text ? text : step.text,
    })));
    setCurrentStepIndex(index);
    
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 800));
  }, []);

  const pauseStep = useCallback((index: number, text?: string) => {
    setIsPaused(true);
    setSteps(prev => prev.map((step, i) => ({
      ...step,
      status: i < index ? 'complete' : i === index ? 'paused' : 'pending',
      text: i === index && text ? text : step.text,
    })));
  }, []);

  const resumeStep = useCallback((index: number, text?: string) => {
    setIsPaused(false);
    setClarificationState(null);
    setSteps(prev => prev.map((step, i) => ({
      ...step,
      status: i < index ? 'complete' : i === index ? 'active' : 'pending',
      text: i === index && text ? text : step.text,
    })));
  }, []);

  // Wait for user decision (returns a Promise that resolves when user selects)
  const waitForUserDecision = useCallback((): Promise<KnowledgeMatchResult[]> => {
    return new Promise((resolve) => {
      resolveDecisionRef.current = resolve;
    });
  }, []);

  // Handle user selecting knowledge bases
  const handleKnowledgeSelection = useCallback((selectedIds: string[]) => {
    if (!clarificationState) return;
    
    const selected = clarificationState.matches.filter(m => 
      selectedIds.includes(m.knowledgeBase.id)
    );
    
    selectedKBsRef.current = selected;
    
    // Resolve the waiting promise
    if (resolveDecisionRef.current) {
      resolveDecisionRef.current(selected);
      resolveDecisionRef.current = null;
    }
  }, [clarificationState]);

  // Handle user skipping knowledge selection
  const handleSkipKnowledge = useCallback(() => {
    selectedKBsRef.current = [];
    
    if (resolveDecisionRef.current) {
      resolveDecisionRef.current([]);
      resolveDecisionRef.current = null;
    }
  }, []);

  // Handle file uploaded during clarification
  const handleFileUploaded = useCallback((kb: { id: string; name: string }) => {
    // Create a fake match result for the uploaded KB
    const uploadedMatch: KnowledgeMatchResult = {
      knowledgeBase: {
        id: kb.id,
        name: kb.name,
        description: '刚刚上传的文件',
        usage_context: null,
        intent_tags: [],
        documents_count: 1,
        chunks_count: null,
      },
      score: 1.0,
      matchReason: 'user_uploaded',
      decisionZone: 'auto',
    };
    
    selectedKBsRef.current = [uploadedMatch];
    
    if (resolveDecisionRef.current) {
      resolveDecisionRef.current([uploadedMatch]);
      resolveDecisionRef.current = null;
    }
  }, []);

  const build = useCallback(async (description: string): Promise<InvisibleBuildResult> => {
    if (!user) throw new Error("用户未登录");
    
    setIsBuilding(true);
    setIsPaused(false);
    setError(null);
    setSteps(DEFAULT_STEPS.map(s => ({ ...s, status: 'pending' })));
    setClarificationState(null);
    selectedKBsRef.current = [];
    abortRef.current = false;

    let mountedKnowledgeBases: Array<{ id: string; name: string }> = [];

    try {
      // Step 1: Understanding requirements
      await advanceToStep(0);
      
      // Step 2: Analyze capabilities + Knowledge matching
      await advanceToStep(1, '分析所需能力，匹配知识库...');
      
      // Trigger knowledge base matching
      const matchResult = await matchKnowledgeBases(description, { autoMount: false });
      
      if (abortRef.current) throw new Error('已取消');

      if (matchResult) {
        if (matchResult.decision === 'auto_mount' && matchResult.matches.length > 0) {
          // Auto zone: Silently mount the best match
          const autoMounted = matchResult.matches[0];
          mountedKnowledgeBases = [{ 
            id: autoMounted.knowledgeBase.id, 
            name: autoMounted.knowledgeBase.name 
          }];
          toast.success(`已自动挂载「${autoMounted.knowledgeBase.name}」`, {
            duration: 3000,
          });
          
        } else if (matchResult.decision === 'ask_user' && matchResult.matches.length > 0) {
          // Clarify zone: Pause and ask user
          setClarificationState({
            type: 'ask_user',
            matches: matchResult.matches,
            question: matchResult.clarifyQuestion || '我发现了几个相关的知识库，您想基于哪个进行构建？',
            isPending: true,
          });
          pauseStep(1, '等待您的选择...');
          
          // Wait for user decision
          const selectedKBs = await waitForUserDecision();
          
          if (abortRef.current) throw new Error('已取消');
          
          if (selectedKBs.length > 0) {
            mountedKnowledgeBases = selectedKBs.map(kb => ({
              id: kb.knowledgeBase.id,
              name: kb.knowledgeBase.name,
            }));
            resumeStep(1, `已选定「${selectedKBs[0].knowledgeBase.name}」，继续组装...`);
          } else {
            resumeStep(1, '使用通用知识，继续组装...');
          }
          
          // Small delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 600));
          
        } else if (matchResult.decision === 'suggest_upload') {
          // Empty zone: Suggest upload
          setClarificationState({
            type: 'suggest_upload',
            matches: [],
            question: '我没有找到相关资料。您可以直接把文件拖给我，我立马学习！',
            isPending: true,
          });
          pauseStep(1, '等待您的选择...');
          
          // Wait for user to upload or skip
          const uploadedKBs = await waitForUserDecision();
          
          if (abortRef.current) throw new Error('已取消');
          
          if (uploadedKBs.length > 0) {
            mountedKnowledgeBases = uploadedKBs.map(kb => ({
              id: kb.knowledgeBase.id,
              name: kb.knowledgeBase.name,
            }));
            resumeStep(1, `已学习「${uploadedKBs[0].knowledgeBase.name}」，继续组装...`);
          } else {
            resumeStep(1, '使用纯对话模式，继续组装...');
          }
          
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
      
      // Call AI to generate config with timeout and retry
      let configData: any = null;
      const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[InvisibleBuilder] Calling agent-config-generator (attempt ${attempt}/${maxRetries})`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
          
          const { data, error } = await supabase.functions.invoke(
            'agent-config-generator',
            {
              body: { 
                description,
                generateFullWorkflow: false,
                knowledgeBaseIds: mountedKnowledgeBases.map(kb => kb.id),
              }
            }
          );
          
          clearTimeout(timeoutId);
          
          if (error) {
            console.warn(`[InvisibleBuilder] Attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) {
              throw new Error(error.message || '生成配置失败');
            }
            // 等待后重试
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          
          configData = data;
          break; // 成功，退出重试循环
          
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.warn(`[InvisibleBuilder] Request timeout on attempt ${attempt}`);
            if (attempt === maxRetries) {
              throw new Error('请求超时，请检查网络连接后重试');
            }
            await new Promise(r => setTimeout(r, 1000));
          } else {
            throw err;
          }
        }
      }
      
      if (!configData) throw new Error('生成配置失败，请重试');
      if (abortRef.current) throw new Error('已取消');

      const config = configData;
      // 修复：Edge Function 返回 config.name，不是 config.agentName
      const rawName = config?.name || extractAgentName(description);
      // 硬编码规范化：强制 "XX智能体" 格式
      const agentName = normalizeAgentName(rawName, description);
      const skills = config?.suggestedMCPActions?.map((a: any) => a.name) || [];
      const capabilities = extractCapabilities(description, config);

      // Step 3: Mount skills (with dynamic text)
      const skillsText = skills.length > 0 
        ? `发现需要 ${skills.slice(0, 2).join('、')} 等技能，正在挂载...`
        : '正在配置基础能力...';
      await advanceToStep(2, skillsText);

      // Step 4: Assemble agent
      await advanceToStep(3);

      // Generate avatar based on description
      const generatedAvatar = generateSmartAvatar(description);

      // Create manifest with complete knowledge base configuration and avatar
      const manifest = {
        name: agentName,
        description: config?.systemPrompt?.substring(0, 100) || description,
        systemPrompt: config?.systemPrompt || `你是${agentName}，一个专业的AI助手。${description}`,
        model: config?.model || 'gpt-4',
        temperature: config?.temperature || 0.7,
        skills: skills,
        // [关键] 标准化 avatar 结构，与 Consumer 页面和运行终端一致
        avatar: generatedAvatar,
        // [关键] 完整的知识库配置，确保 agent-chat 能够识别和检索
        knowledgeBases: mountedKnowledgeBases.map(kb => ({
          id: kb.id,
          name: kb.name,
          retrievalMode: 'hybrid',
          isAutoMounted: true,
        })),
        createdFrom: 'consumer-magic-builder',
        originalDescription: description,
      };

      // Save to database - 直接部署状态
      const { data: agentData, error: saveError } = await supabase
        .from('agents')
        .insert({
          name: agentName,
          author_id: user.id,
          manifest: manifest as unknown as Json,
          model: config?.model || 'gpt-4',
          status: 'deployed', // ← 关键修复：直接部署，确保运行终端可见
          department: 'consumer',
        })
        .select()
        .single();

      if (saveError) throw new Error(saveError.message || '保存失败');
      if (abortRef.current) throw new Error('已取消');

      // ============= Write Graph Data to Database =============
      // This enables real-time sync with Studio
      const newAgentId = agentData.id;
      
      // Set agent ID in global store to enable sync
      setAgentId(newAgentId);
      
      // Create Manus Core node (center node)
      const manusNode = await addNode({
        agent_id: newAgentId,
        node_id: 'manus-core',
        node_type: 'manus',
        position_x: 400,
        position_y: 300,
        data: {
          name: agentName,
          model: config?.model || 'gpt-4',
          status: 'active',
        },
      });
      
      // Create skill nodes (radially distributed around core)
      const skillNodePromises = skills.map(async (skill: string, index: number) => {
        const angle = (index * 2 * Math.PI) / Math.max(skills.length, 1);
        const radius = 180;
        const x = 400 + Math.cos(angle) * radius;
        const y = 300 + Math.sin(angle) * radius;
        
        return addNode({
          agent_id: newAgentId,
          node_id: `skill-${skill.toLowerCase().replace(/\s+/g, '-')}-${index}`,
          node_type: 'skill',
          position_x: x,
          position_y: y,
          data: {
            name: skill,
            category: 'generated',
            description: `AI 生成的 ${skill} 技能`,
          },
        });
      });
      
      const skillNodes = await Promise.all(skillNodePromises);
      
      // Create knowledge base nodes (if any) - with proper target_collection for RAG
      const kbNodePromises = mountedKnowledgeBases.map(async (kb, index) => {
        const angle = ((skills.length + index) * 2 * Math.PI) / Math.max(skills.length + mountedKnowledgeBases.length, 1);
        const radius = 220;
        const x = 400 + Math.cos(angle) * radius;
        const y = 300 + Math.sin(angle) * radius;
        
        return addNode({
          agent_id: newAgentId,
          node_id: `kb-${kb.id}`,
          node_type: 'knowledge',
          position_x: x,
          position_y: y,
          data: {
            id: kb.id,
            name: kb.name,
            type: 'knowledge_base',
            // [关键] 确保 agent-chat 能够正确定位知识库进行 RAG 检索
            target_collection: kb.id,
            knowledge_base_id: kb.id,
            config: {
              retrievalMode: 'hybrid',
              topK: 5,
              threshold: 0.65,
            },
          },
        });
      });
      
      const kbNodes = await Promise.all(kbNodePromises);
      
      // ============= Create MCP Action Nodes =============
      const mcpActions = config?.suggestedMCPActions || [];
      const mcpNodePromises = mcpActions.slice(0, 3).map(async (mcp: any, index: number) => {
        const totalItems = skills.length + mountedKnowledgeBases.length + mcpActions.length;
        const angle = ((skills.length + mountedKnowledgeBases.length + index) * 2 * Math.PI) / Math.max(totalItems, 1);
        const radius = 250;
        const x = 400 + Math.cos(angle) * radius;
        const y = 300 + Math.sin(angle) * radius;
        
        return addNode({
          agent_id: newAgentId,
          node_id: `mcp-${mcp.serverId}-${index}`,
          node_type: 'mcp_action',
          position_x: x,
          position_y: y,
          data: {
            name: mcp.serverName || mcp.toolName,
            serverId: mcp.serverId,
            toolName: mcp.toolName,
            riskLevel: mcp.riskLevel || 'low',
            reason: mcp.reason,
          },
        });
      });
      
      const mcpNodes = await Promise.all(mcpNodePromises);
      
      // Create edges from all nodes to Manus Core
      const allNodes = [...skillNodes.filter(Boolean), ...kbNodes.filter(Boolean), ...mcpNodes.filter(Boolean)];
      const edgePromises = allNodes.map(async (node, index) => {
        if (!node) return null;
        return addEdge({
          agent_id: newAgentId,
          edge_id: `edge-${node.node_id}-to-core`,
          source_node: node.node_id,
          target_node: 'manus-core',
          edge_type: 'animated',
          data: {},
        });
      });
      
      await Promise.all(edgePromises);
      
      console.log('[InvisibleBuilder] Graph data written to database:', {
        agentId: newAgentId,
        manusNode: manusNode?.node_id,
        skillNodes: skillNodes.length,
        kbNodes: kbNodes.length,
        mcpNodes: mcpNodes.length,
      });

      // Step 5: Complete
      await advanceToStep(4, `${agentName} 已就绪 ✨`);

      // 刷新 Query 缓存，确保运行终端和 Consumer 页面立即显示新智能体
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents', 'deployed'] });
      queryClient.invalidateQueries({ queryKey: ['agents', 'my'] });

      const result: InvisibleBuildResult = {
        agentId: agentData.id,
        agentName,
        agentAvatar: generatedAvatar, // ← 使用生成的 avatar
        skills,
        systemPrompt: manifest.systemPrompt,
        capabilities,
        description: manifest.description,
        mountedKnowledgeBases,
      };

      return result;
    } catch (err: any) {
      setError(err.message || '构建失败');
      throw err;
    } finally {
      setIsBuilding(false);
      setIsPaused(false);
    }
  }, [user, advanceToStep, pauseStep, resumeStep, matchKnowledgeBases, waitForUserDecision, queryClient]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setIsBuilding(false);
    setIsPaused(false);
    setCurrentStepIndex(-1);
    setSteps(DEFAULT_STEPS.map(s => ({ ...s, status: 'pending' })));
    setError(null);
    setClarificationState(null);
    selectedKBsRef.current = [];
    
    // Resolve any pending promises
    if (resolveDecisionRef.current) {
      resolveDecisionRef.current([]);
      resolveDecisionRef.current = null;
    }
  }, []);

  const progress = currentStepIndex >= 0 
    ? Math.round(((currentStepIndex + 1) / steps.length) * 100)
    : 0;

  return {
    build,
    isBuilding,
    isPaused,
    currentStepIndex,
    steps,
    progress,
    error,
    reset,
    clarificationState,
    handleKnowledgeSelection,
    handleSkipKnowledge,
    handleFileUploaded,
  };
}

// Helper: Extract agent name from description
function extractAgentName(description: string): string {
  // Try to find patterns like "做一个XXX" or "创建XXX" or "帮我做XXX"
  const patterns = [
    /做一个(.+?)(助手|分析师|专家|顾问|机器人|员工)/,
    /创建(.+?)(助手|分析师|专家|顾问|机器人|员工)/,
    /需要(.+?)(助手|分析师|专家|顾问|机器人|员工)/,
    /(.+?)(助手|分析师|专家|顾问)/,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1] + match[2];
    }
  }

  // Fallback: use first 10 chars
  const shortDesc = description.substring(0, 10).replace(/[，。！？]/g, '');
  return `${shortDesc}助手`;
}

/**
 * 硬编码规范化智能体名称
 * 输出格式：核心名称智能体 · 功能标签
 * 支持中英文自适应
 */
function normalizeAgentName(rawName: string, description: string): string {
  // 移除已有的后缀词
  const suffixes = ['智能体', '助手', 'Agent', 'Bot', '机器人', '专家', '顾问', '分析师', '员工'];
  let cleanName = (rawName || '').trim();
  
  for (const suffix of suffixes) {
    if (cleanName.endsWith(suffix)) {
      cleanName = cleanName.slice(0, -suffix.length).trim();
    }
  }
  
  // 移除口语化前缀（"我想要"、"帮我做"、"创建一个"等）
  const prefixPatterns = [
    /^(我想要?|我需要?|帮我|给我|做一?个?|创建一?个?|构建一?个?|生成一?个?)/,
    /^(我现在正?在?|我正在|现在)/,
  ];
  for (const pattern of prefixPatterns) {
    cleanName = cleanName.replace(pattern, '');
  }
  
  // 提取核心关键词（2-6个字符）
  let coreName = cleanName.trim();
  
  // 如果仍然太长，尝试从 description 中提取关键词
  if (coreName.length > 6 || coreName.length < 2) {
    // 匹配常见业务领域词
    const domainPatterns = [
      /(旅[行游]|出行|规划)/,
      /(财务|财报|会计|金融)/,
      /(营销|推广|文案|广告)/,
      /(客服|售后|咨询|问答)/,
      /(代码|编程|开发|技术)/,
      /(数据|分析|报表|统计)/,
      /(电商|跨境|选品|运营)/,
      /(翻译|语言|多语)/,
      /(设计|创意|美工)/,
      /(人事|招聘|HR)/,
      /(法务|合规|法律)/,
      /(医疗|健康|诊断)/,
    ];
    
    const source = description || rawName;
    for (const pattern of domainPatterns) {
      const match = source.match(pattern);
      if (match) {
        coreName = match[1];
        break;
      }
    }
    
    // 如果还是没匹配到，取 description 前 4 个有效字符
    if (coreName.length > 6 || coreName.length < 2) {
      const validChars = (description || rawName)
        .replace(/[我想要帮给做创建一个正在现在，。！？\s]/g, '')
        .slice(0, 4);
      coreName = validChars || '通用';
    }
  }
  
  // 最终限制核心名称长度
  if (coreName.length > 6) {
    coreName = coreName.slice(0, 6);
  }
  
  // 检测是否为纯英文输入，如果是则使用 "Agent" 后缀
  const isEnglishOnly = /^[a-zA-Z\s]+$/.test(coreName);
  const suffix = isEnglishOnly ? ' Agent' : '智能体';
  const baseName = `${coreName}${suffix}`;
  
  // 新增：提取功能标签
  const featureTag = extractFeatureTag(description);
  
  // 格式：核心名称智能体 · 功能标签（限制总长度20字符）
  if (featureTag && baseName.length + featureTag.length + 3 <= 20) {
    return `${baseName} · ${featureTag}`;
  }
  
  return baseName;
}

/**
 * 从描述中提取功能标签
 */
function extractFeatureTag(description: string): string | null {
  if (!description) return null;
  
  const tagPatterns = [
    { pattern: /规划|定制|安排|行程/, tag: '智能规划' },
    { pattern: /分析|洞察|解读|报表/, tag: '数据洞察' },
    { pattern: /多语|翻译|双语|语言/, tag: '多语言' },
    { pattern: /自动化|批量|效率|自动/, tag: '自动化' },
    { pattern: /创作|写作|文案|内容/, tag: '内容创作' },
    { pattern: /问答|对话|客服|咨询/, tag: '智能问答' },
    { pattern: /代码|编程|开发|调试/, tag: '代码生成' },
    { pattern: /搜索|检索|查询|调研/, tag: '信息检索' },
    { pattern: /设计|创意|美工|UI/, tag: '创意设计' },
    { pattern: /财务|会计|财报|金融/, tag: '财务分析' },
    { pattern: /医疗|健康|诊断|医学/, tag: '医疗咨询' },
    { pattern: /法律|合规|法务|合同/, tag: '法律咨询' },
  ];
  
  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(description)) {
      return tag;
    }
  }
  
  return null;
}

// Helper: Extract capabilities from description and config
function extractCapabilities(description: string, config: any): string[] {
  const capabilities: string[] = [];
  
  // Keywords to capability mapping
  const keywordMap: Record<string, string> = {
    '分析': '数据分析与洞察',
    '搜索': '信息检索与搜索',
    '写作': '内容创作与写作',
    '翻译': '多语言翻译',
    '代码': '代码生成与调试',
    '总结': '文档总结与提炼',
    '对话': '智能对话与问答',
    '计算': '数据计算与处理',
    '设计': '创意设计建议',
    '规划': '任务规划与管理',
  };

  for (const [keyword, capability] of Object.entries(keywordMap)) {
    if (description.includes(keyword)) {
      capabilities.push(capability);
    }
  }

  // Add from config if available
  if (config?.suggestedMCPActions?.length > 0) {
    config.suggestedMCPActions.slice(0, 2).forEach((action: any) => {
      if (action.description && !capabilities.includes(action.description)) {
        capabilities.push(action.description);
      }
    });
  }

  // Ensure at least one capability
  if (capabilities.length === 0) {
    capabilities.push('智能对话与问答');
  }

  return capabilities.slice(0, 4);
}
