/**
 * @file LanguageContext.tsx
 * @description 多语言国际化上下文 - Internationalization Context Provider
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "zh" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    // 品牌
  "brand.name": "FANCE",
    "brand.slogan": "技能驱动，智能无限",
    "brand.description": "FANCE - Agent Skills 驱动的智能体构建平台",
    
    // 导航
    "nav.home": "首页",
    "nav.builder": "创建",
    "nav.foundry": "能力",
    "nav.runtime": "对话",
    "nav.profile": "我的",
    
    // 首页
    "home.title": "打造你的专属AI助手",
    "home.subtitle": "10分钟上手，无需编程",
    "home.quick_start": "快速开始",
    "home.browse_templates": "浏览模板",
    "home.my_agents": "我的助手",
    "home.create_first": "创建你的第一个AI助手",
    "home.scenarios": "我想让AI帮我...",
    "home.stats.conversations": "今日对话",
    "home.stats.time_saved": "节省时间",
    "home.stats.tasks": "完成任务",
    
    // 创建
    "builder.title": "创建AI助手",
    "builder.conversational": "对话式创建",
    "builder.templates": "从模板开始",
    "builder.advanced": "高级配置",
    "foundry.categories": "分类",
    "foundry.installed": "已安装",
    "foundry.create": "创建能力",
    
    // 对话
    "runtime.title": "与AI对话",
    "runtime.type_message": "输入消息...",
    "runtime.send": "发送",
    "runtime.history": "历史记录",
    "runtime.share": "分享",
    
    // 认证
    "auth.login": "登录",
    "auth.signup": "注册",
    "auth.email": "邮箱",
    "auth.password": "密码",
    "auth.phone": "手机号",
    "auth.forgot_password": "忘记密码？",
    "auth.guest_mode": "跳过登录，先体验一下",
    "auth.social_login": "快捷登录",
    
    // 通用
    "common.loading": "加载中...",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.confirm": "确认",
    "common.delete": "删除",
    "common.edit": "编辑",
    "common.search": "搜索",
    "common.more": "更多",
    "common.back": "返回",
    "common.next": "下一步",
    "common.finish": "完成",
    "common.skip": "跳过",
    
    // 付费
    "pricing.title": "选择适合你的计划",
    "pricing.free": "免费版",
    "pricing.pro": "专业版",
    "pricing.team": "团队版",
    "pricing.upgrade": "升级",
    "pricing.current": "当前计划",
    
    // 技能市场
    "skill.market.title": "技能市场",
    "skill.market.search": "搜索技能...",
    "skill.market.available": "可用",
    "skill.market.empty": "技能市场为空",
    "skill.market.empty_desc": "还没有已发布的技能，前往 Foundry 创建第一个技能吧",
    "skill.market.create": "创建技能",
    "skill.market.no_match": "未找到匹配的技能",
    "skill.market.added": "已添加",
    
    // 来源过滤
    "skill.origin.all": "全部",
    "skill.origin.native": "FANCE 原生",
    "skill.origin.mcp": "MCP 生态",
    
    // MCP 确认
    "confirm.mcp.title": "MCP 工具调用确认",
    "confirm.mcp.warning": "此操作将调用外部 MCP 服务器执行命令",
    "confirm.mcp.server": "MCP 服务器",
    "confirm.mcp.tool": "工具名称",
    "confirm.mcp.inputs": "输入参数",
    "confirm.mcp.risk": "风险提示",
    "confirm.mcp.risk_high": "终端命令可能执行任意代码，存在安全风险",
    "confirm.mcp.risk_medium": "此操作将访问外部服务",
    "confirm.remember": "记住此工具的选择（同一会话内）",
    "confirm.cancel": "不，取消",
    "confirm.execute": "是的，执行",
  },
  en: {
    // Brand
    "brand.name": "FANCE",
    "brand.slogan": "Skill-driven, Intelligence Unlimited",
    "brand.description": "FANCE - AI agent building platform powered by Agent Skills",
    
    // Navigation
    "nav.home": "Home",
    "nav.builder": "Build",
    "nav.foundry": "Skills",
    "nav.runtime": "Chat",
    "nav.profile": "Profile",
    
    // Home
    "home.title": "Build Your AI Assistant",
    "home.subtitle": "Get started in 10 minutes, no coding required",
    "home.quick_start": "Quick Start",
    "home.browse_templates": "Browse Templates",
    "home.my_agents": "My Assistants",
    "home.create_first": "Create your first AI assistant",
    "home.scenarios": "I want AI to help me with...",
    "home.stats.conversations": "Today's Chats",
    "home.stats.time_saved": "Time Saved",
    "home.stats.tasks": "Tasks Done",
    
    // Builder
    "builder.title": "Create AI Assistant",
    "builder.conversational": "Conversational",
    "builder.templates": "From Templates",
    "builder.advanced": "Advanced",
    
    // Foundry
    "foundry.title": "Skill Store",
    "foundry.search": "Search skills...",
    "foundry.categories": "Categories",
    "foundry.installed": "Installed",
    "foundry.create": "Create Skill",
    
    // Runtime
    "runtime.title": "Chat with AI",
    "runtime.type_message": "Type a message...",
    "runtime.send": "Send",
    "runtime.history": "History",
    "runtime.share": "Share",
    
    // Auth
    "auth.login": "Login",
    "auth.signup": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.phone": "Phone",
    "auth.forgot_password": "Forgot password?",
    "auth.guest_mode": "Skip login, try it first",
    "auth.social_login": "Quick Login",
    
    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.search": "Search",
    "common.more": "More",
    "common.back": "Back",
    "common.next": "Next",
    "common.finish": "Finish",
    "common.skip": "Skip",
    
    // Pricing
    "pricing.title": "Choose Your Plan",
    "pricing.free": "Free",
    "pricing.pro": "Pro",
    "pricing.team": "Team",
    "pricing.upgrade": "Upgrade",
    "pricing.current": "Current Plan",
    
    // Skill Market
    "skill.market.title": "Skill Market",
    "skill.market.search": "Search skills...",
    "skill.market.available": "available",
    "skill.market.empty": "Skill Market is Empty",
    "skill.market.empty_desc": "No published skills yet. Go to Foundry to create your first skill.",
    "skill.market.create": "Create Skill",
    "skill.market.no_match": "No matching skills found",
    "skill.market.added": "Added",
    
    // Origin filter
    "skill.origin.all": "All",
    "skill.origin.native": "FANCE Native",
    "skill.origin.mcp": "MCP Ecosystem",
    
    // MCP Confirm
    "confirm.mcp.title": "MCP Tool Call Confirmation",
    "confirm.mcp.warning": "This action will invoke an external MCP server to execute commands",
    "confirm.mcp.server": "MCP Server",
    "confirm.mcp.tool": "Tool Name",
    "confirm.mcp.inputs": "Input Parameters",
    "confirm.mcp.risk": "Risk Warning",
    "confirm.mcp.risk_high": "Terminal commands may execute arbitrary code, posing security risks",
    "confirm.mcp.risk_medium": "This operation will access external services",
    "confirm.remember": "Remember choice for this tool (current session)",
    "confirm.cancel": "No, Cancel",
    "confirm.execute": "Yes, Execute",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    if (saved === "zh" || saved === "en") return saved;
    // 检测浏览器语言
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith("zh") ? "zh" : "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
