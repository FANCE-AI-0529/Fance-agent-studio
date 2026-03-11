/**
 * @file useChatSession.ts
 * @description 对话会话管理钩子模块，提供会话的创建、加载、消息存储及实时更新功能
 * @module Hooks/ChatSession
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "sonner";

/**
 * 对话消息数据结构
 * 定义单条消息的完整信息
 */
interface ChatMessage {
  /** 消息唯一标识符 */
  id: string;
  /** 消息发送者角色 */
  role: "user" | "assistant" | "system";
  /** 消息文本内容 */
  content: string;
  /** 消息时间戳 */
  timestamp: Date;
  /** 使用的技能名称（如有） */
  skill?: string;
  /** MPLP 协议状态 */
  mplpStatus?: string;
}

/**
 * 对话会话数据结构
 * 定义会话的元数据信息
 */
interface ChatSession {
  /** 会话唯一标识符 */
  id: string;
  /** 关联的智能体ID */
  agentId: string;
  /** 会话状态（active/ended） */
  status: string;
  /** 会话创建时间 */
  createdAt: Date;
}

/**
 * 默认智能体ID
 * null 表示通用对话（不绑定特定智能体）
 */
const DEFAULT_AGENT_ID: string | null = null;

/**
 * 对话会话管理钩子
 * 
 * 该钩子函数提供完整的对话会话管理功能，包括：
 * - 会话的创建和加载
 * - 消息的存储和实时更新
 * - 多会话历史管理
 * - 流式响应的消息更新
 * 
 * @returns 返回会话状态和操作函数
 * 
 * @example
 * const { session, messages, addMessage, createSession } = useChatSession();
 */
export function useChatSession() {
  // [认证]：获取当前登录用户
  const { user } = useAuth();
  
  // [状态]：当前活动会话
  const [session, setSession] = useState<ChatSession | null>(null);
  // [状态]：当前会话的消息列表
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // [状态]：加载状态标识
  const [isLoading, setIsLoading] = useState(false);
  // [状态]：用户的所有会话列表
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  /**
   * 加载用户的所有会话列表
   * 按更新时间降序排列
   */
  const loadSessions = useCallback(async () => {
    // [校验]：用户未登录时跳过
    if (!user) return;

    // [查询]：从数据库获取用户的所有会话
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return;
    }

    // [转换]：将数据库格式映射为应用层格式
    setSessions(
      data.map((s) => ({
        id: s.id,
        agentId: s.agent_id,
        status: s.status,
        createdAt: new Date(s.created_at),
      }))
    );
  }, [user]);

  /**
   * 加载指定会话的所有消息
   * 
   * @param {string} sessionId - 会话唯一标识符
   */
  const loadMessages = useCallback(async (sessionId: string) => {
    setIsLoading(true);

    // [查询]：按时间升序获取消息
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("加载消息失败");
      setIsLoading(false);
      return;
    }

    // [转换]：映射消息格式
    setMessages(
      data.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        timestamp: new Date(m.created_at),
        skill: m.skill_used || undefined,
        mplpStatus: m.mplp_status || undefined,
      }))
    );

    setIsLoading(false);
  }, []);

  /**
   * 创建新的对话会话
   * 
   * @param {string} agentId - 可选的智能体ID，不传则创建通用会话
   * @returns {Promise<ChatSession | null>} 返回创建的会话或 null
   */
  const createSession = useCallback(async (agentId?: string) => {
    // [校验]：确保用户已登录
    if (!user) {
      toast.error("请先登录");
      return null;
    }

    // [确定]：使用传入的 agentId 或默认值
    const sessionAgentId = agentId || DEFAULT_AGENT_ID;

    // [插入]：创建新会话记录
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        agent_id: sessionAgentId,
        user_id: user.id,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      toast.error("创建会话失败");
      return null;
    }

    // [构建]：创建会话对象
    const newSession: ChatSession = {
      id: data.id,
      agentId: data.agent_id,
      status: data.status,
      createdAt: new Date(data.created_at),
    };

    // [更新]：设置为当前会话并清空消息
    setSession(newSession);
    setMessages([]);

    return newSession;
  }, [user]);

  /**
   * 加载已存在的会话
   * 
   * @param {string} sessionId - 会话唯一标识符
   * @returns {Promise<ChatSession | null>} 返回加载的会话或 null
   */
  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);

    // [查询]：获取会话信息
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      toast.error("加载会话失败");
      setIsLoading(false);
      return null;
    }

    // [构建]：创建会话对象
    const loadedSession: ChatSession = {
      id: data.id,
      agentId: data.agent_id,
      status: data.status,
      createdAt: new Date(data.created_at),
    };

    setSession(loadedSession);
    
    // [加载]：获取该会话的消息
    await loadMessages(sessionId);

    return loadedSession;
  }, [loadMessages]);

  /**
   * 保存消息到数据库
   * 
   * @param {string} sessionId - 会话ID
   * @param {ChatMessage} message - 消息对象
   * @param {string} skillUsed - 使用的技能名称
   * @param {string} mplpStatus - MPLP 状态
   */
  const saveMessage = useCallback(async (
    sessionId: string,
    message: ChatMessage,
    skillUsed?: string,
    mplpStatus?: string
  ) => {
    // [插入]：将消息写入数据库
    const { error } = await supabase.from("messages").insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      skill_used: skillUsed || message.skill || null,
      mplp_status: mplpStatus || message.mplpStatus || null,
      metadata: {},
    });

    if (error) {
      // [静默]：消息保存失败不影响用户体验
    }

    // [更新]：刷新会话的更新时间
    await supabase
      .from("sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }, []);

  /**
   * 添加新消息并保存
   * 
   * @param {Object} message - 消息内容（不含 id 和 timestamp）
   * @param {string} skillUsed - 使用的技能名称
   * @param {string} mplpStatus - MPLP 状态
   * @returns {Promise<ChatMessage | null>} 返回创建的消息或 null
   */
  const addMessage = useCallback(async (
    message: Omit<ChatMessage, "id" | "timestamp">,
    skillUsed?: string,
    mplpStatus?: string
  ) => {
    // [校验]：确保会话存在
    if (!session) return null;

    // [构建]：创建完整的消息对象
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      skill: skillUsed,
      mplpStatus,
    };

    // [更新]：添加到本地消息列表
    setMessages((prev) => [...prev, newMessage]);
    
    // [持久化]：保存到数据库
    await saveMessage(session.id, newMessage, skillUsed, mplpStatus);

    return newMessage;
  }, [session, saveMessage]);

  /**
   * 更新最后一条助手消息的内容
   * 用于流式响应时的增量更新
   * 
   * @param {string} content - 更新后的完整内容
   */
  const updateLastAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const lastIndex = prev.length - 1;
      
      // [校验]：确保最后一条是助手消息
      if (lastIndex >= 0 && prev[lastIndex].role === "assistant") {
        const updated = [...prev];
        updated[lastIndex] = { ...updated[lastIndex], content };
        return updated;
      }
      return prev;
    });
  }, []);

  /**
   * 删除会话
   * 关联的消息会通过外键级联自动删除
   * 
   * @param {string} sessionId - 会话ID
   * @returns {Promise<boolean>} 删除是否成功
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    // [删除]：从数据库删除会话
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      toast.error("删除会话失败");
      return false;
    }

    // [清理]：如果删除的是当前会话，则清空状态
    if (session?.id === sessionId) {
      setSession(null);
      setMessages([]);
    }

    // [刷新]：重新加载会话列表
    await loadSessions();
    return true;
  }, [session, loadSessions]);

  /**
   * 查找或创建智能体会话
   * 如果该智能体已有会话则加载，否则创建新会话
   * 
   * @param {string | null} agentId - 智能体ID
   * @returns {Promise<ChatSession | null>} 返回会话或 null
   */
  const findOrCreateSessionForAgent = useCallback(async (agentId: string | null) => {
    if (!user) {
      return null;
    }

    // [查询]：查找该智能体的现有会话
    let query = supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    // [条件]：根据 agentId 筛选
    if (agentId) {
      query = query.eq("agent_id", agentId);
    } else {
      query = query.is("agent_id", null);
    }

    const { data: existingSessions, error } = await query;

    if (error) {
      return null;
    }

    // [分支]：存在会话则加载，否则创建
    if (existingSessions && existingSessions.length > 0) {
      return loadSession(existingSessions[0].id);
    }

    return createSession(agentId || undefined);
  }, [user, loadSession, createSession]);

  // [初始化]：用户登录时加载会话列表
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, loadSessions]);

  return {
    /** 当前活动会话 */
    session,
    /** 用户的所有会话列表 */
    sessions,
    /** 当前会话的消息列表 */
    messages,
    /** 加载状态 */
    isLoading,
    /** 创建新会话 */
    createSession,
    /** 加载指定会话 */
    loadSession,
    /** 刷新会话列表 */
    loadSessions,
    /** 添加新消息 */
    addMessage,
    /** 更新最后一条助手消息 */
    updateLastAssistantMessage,
    /** 删除会话 */
    deleteSession,
    /** 直接设置消息列表 */
    setMessages,
    /** 查找或创建智能体会话 */
    findOrCreateSessionForAgent,
  };
}
