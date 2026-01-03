import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  category?: string;
  sceneBackground?: Record<string, unknown>;
  agentRole?: string;
  userRole?: string;
  openingLines?: string[];
  suggestedPrompts?: string[];
  isMultiAgent?: boolean;
  isPublic?: boolean;
  authorId?: string;
  downloadsCount?: number;
  createdAt: Date;
}

// Default scenario templates
const defaultScenarios: Scenario[] = [
  {
    id: "interview-tech",
    name: "技术面试模拟",
    description: "模拟技术面试场景，AI扮演面试官提问技术问题",
    category: "interview",
    agentRole: "资深技术面试官",
    userRole: "应聘者",
    openingLines: [
      "你好，欢迎参加今天的技术面试。请先简单介绍一下你自己和你的技术背景。",
      "很高兴见到你。在开始之前，能否分享一下你最近参与的项目？",
    ],
    suggestedPrompts: [
      "解释一下什么是闭包",
      "说说你对微服务架构的理解",
      "如何优化数据库查询性能",
    ],
    isPublic: true,
    isMultiAgent: false,
    createdAt: new Date(),
  },
  {
    id: "interview-hr",
    name: "HR面试模拟",
    description: "模拟人力资源面试，练习自我介绍和职业规划",
    category: "interview",
    agentRole: "HR经理",
    userRole: "应聘者",
    openingLines: [
      "你好！请坐。首先，能告诉我你为什么对这个职位感兴趣吗？",
    ],
    suggestedPrompts: [
      "介绍一下你的职业规划",
      "你最大的优点和缺点是什么",
      "为什么选择离开上一家公司",
    ],
    isPublic: true,
    isMultiAgent: false,
    createdAt: new Date(),
  },
  {
    id: "customer-service",
    name: "客服培训",
    description: "模拟客户服务场景，练习处理客户投诉和咨询",
    category: "customer_service",
    agentRole: "客户",
    userRole: "客服代表",
    openingLines: [
      "你好，我想投诉一下你们的产品！买回来才一周就坏了！",
      "我想咨询一下你们的退换货政策。",
    ],
    suggestedPrompts: [
      "如何安抚愤怒的客户",
      "处理退款请求的流程",
      "产品使用问题解答",
    ],
    isPublic: true,
    isMultiAgent: false,
    createdAt: new Date(),
  },
  {
    id: "language-english",
    name: "英语口语练习",
    description: "与AI进行英语对话练习，提升口语能力",
    category: "training",
    agentRole: "英语老师",
    userRole: "学生",
    openingLines: [
      "Hello! Let's practice some English today. How are you feeling?",
      "Good morning! What topics would you like to discuss today?",
    ],
    suggestedPrompts: [
      "纠正我的语法错误",
      "推荐一些日常用语",
      "练习商务英语对话",
    ],
    isPublic: true,
    isMultiAgent: false,
    createdAt: new Date(),
  },
  {
    id: "counseling-stress",
    name: "压力疏导",
    description: "与AI进行轻松的对话，缓解工作和生活压力",
    category: "counseling",
    agentRole: "心理咨询师",
    userRole: "来访者",
    openingLines: [
      "你好，今天感觉怎么样？有什么想和我聊聊的吗？",
      "很高兴见到你。这是一个安全的空间，你可以分享任何困扰你的事情。",
    ],
    suggestedPrompts: [
      "最近工作压力很大",
      "感觉有些焦虑",
      "如何保持积极心态",
    ],
    isPublic: true,
    isMultiAgent: false,
    createdAt: new Date(),
  },
  {
    id: "creative-brainstorm",
    name: "创意头脑风暴",
    description: "与AI一起进行创意头脑风暴，激发灵感",
    category: "creative",
    agentRole: "创意总监",
    userRole: "团队成员",
    openingLines: [
      "太棒了！让我们来一场头脑风暴吧。你今天想探讨什么主题？",
      "创意无限！告诉我你想解决的问题或想探索的领域。",
    ],
    suggestedPrompts: [
      "帮我想一个App创意",
      "如何让会议更有趣",
      "设计一个创新的营销活动",
    ],
    isPublic: true,
    isMultiAgent: false,
    createdAt: new Date(),
  },
  {
    id: "roleplay-adventure",
    name: "冒险故事",
    description: "与AI一起创作互动式冒险故事",
    category: "roleplay",
    agentRole: "故事叙述者",
    userRole: "冒险者",
    openingLines: [
      "在一个遥远的王国，你是一位年轻的冒险者。一天，你收到了一封神秘的信...",
      "暴风雨过后的清晨，你醒来发现自己在一个陌生的森林中。你决定...",
    ],
    suggestedPrompts: [
      "探索附近的山洞",
      "与村民交谈",
      "寻找传说中的宝藏",
    ],
    isPublic: true,
    isMultiAgent: false,
    createdAt: new Date(),
  },
];

export function useScenarios() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scenarios", user?.id],
    queryFn: async () => {
      // Fetch from database
      const { data, error } = await supabase
        .from("conversation_scenarios")
        .select("*")
        .or(`is_public.eq.true,author_id.eq.${user?.id || "00000000-0000-0000-0000-000000000000"}`)
        .order("downloads_count", { ascending: false });

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching scenarios:", error);
      }

      const dbScenarios: Scenario[] = (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || undefined,
        category: s.category || undefined,
        sceneBackground: s.scene_background as Record<string, unknown> | undefined,
        agentRole: s.agent_role || undefined,
        userRole: s.user_role || undefined,
        openingLines: s.opening_lines || undefined,
        suggestedPrompts: s.suggested_prompts || undefined,
        isMultiAgent: s.is_multi_agent || false,
        isPublic: s.is_public || true,
        authorId: s.author_id || undefined,
        downloadsCount: s.downloads_count || 0,
        createdAt: new Date(s.created_at),
      }));

      // Combine with defaults (avoiding duplicates)
      const dbIds = new Set(dbScenarios.map((s) => s.id));
      const combined = [
        ...dbScenarios,
        ...defaultScenarios.filter((s) => !dbIds.has(s.id)),
      ];

      return combined;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (scenario: Omit<Scenario, "id" | "createdAt" | "authorId" | "downloadsCount">) => {
      if (!user) throw new Error("Must be logged in");

      const insertData: Record<string, unknown> = {
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        scene_background: scenario.sceneBackground as object | null,
        agent_role: scenario.agentRole,
        user_role: scenario.userRole,
        opening_lines: scenario.openingLines,
        suggested_prompts: scenario.suggestedPrompts,
        is_multi_agent: scenario.isMultiAgent,
        is_public: scenario.isPublic ?? true,
        author_id: user.id,
      };

      const { data, error } = await supabase
        .from("conversation_scenarios")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
    },
  });
}

export function useActiveScenario(sessionId?: string) {
  return useQuery({
    queryKey: ["active-scenario", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from("sessions")
        .select("scenario_id, scene_config, is_roleplay, conversation_scenarios(*)")
        .eq("id", sessionId)
        .single();

      if (error) return null;
      if (!data.scenario_id) return null;

      const scenario = data.conversation_scenarios as unknown as {
        id: string;
        name: string;
        description?: string;
        category?: string;
        agent_role?: string;
        user_role?: string;
        opening_lines?: string[];
        suggested_prompts?: string[];
      };

      return {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        agentRole: scenario.agent_role,
        userRole: scenario.user_role,
        openingLines: scenario.opening_lines,
        suggestedPrompts: scenario.suggested_prompts,
        sceneConfig: data.scene_config,
        isRoleplay: data.is_roleplay,
      };
    },
    enabled: !!sessionId,
  });
}

export function useSetSessionScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      scenarioId, 
      sceneConfig,
    }: { 
      sessionId: string; 
      scenarioId: string | null;
      sceneConfig?: Record<string, unknown>;
    }) => {
      const updateData: Record<string, unknown> = {
        scenario_id: scenarioId,
        scene_config: sceneConfig as object | null,
        is_roleplay: !!scenarioId,
      };

      const { error } = await supabase
        .from("sessions")
        .update(updateData as any)
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["active-scenario", sessionId] });
    },
  });
}
