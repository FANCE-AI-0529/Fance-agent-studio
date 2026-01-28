/**
 * @file awesomeLLMAgents.ts
 * @description 智能体广场数据 - 来自 awesome-llm-apps 仓库
 * @see https://github.com/Shubhamsaboo/awesome-llm-apps
 */

export type AgentCategory =
  | 'starter-agents'
  | 'advanced-agents'
  | 'voice-agents'
  | 'mcp-agents'
  | 'rag-tutorials'
  | 'multi-agent-teams'
  | 'game-agents'
  | 'llm-apps';

export interface AwesomeLLMAgent {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  category: AgentCategory;
  subCategory?: string;
  githubPath: string;
  tags: string[];
  modelProvider?: string;
  hasLocalVersion?: boolean;
}

export interface AgentCategoryInfo {
  id: AgentCategory;
  name: string;
  emoji: string;
  description: string;
}

export const AGENT_CATEGORIES: AgentCategoryInfo[] = [
  { id: 'starter-agents', name: '入门级智能体', emoji: '🌱', description: '适合初学者的AI智能体示例' },
  { id: 'advanced-agents', name: '高级智能体', emoji: '🚀', description: '高级单/多智能体应用' },
  { id: 'voice-agents', name: '语音智能体', emoji: '🗣️', description: '语音交互AI应用' },
  { id: 'mcp-agents', name: 'MCP 智能体', emoji: '♾️', description: 'Model Context Protocol 智能体' },
  { id: 'rag-tutorials', name: 'RAG 应用', emoji: '📀', description: '检索增强生成教程' },
  { id: 'multi-agent-teams', name: '多智能体团队', emoji: '🤝', description: '多智能体协作团队' },
  { id: 'game-agents', name: '游戏智能体', emoji: '🎮', description: '游戏AI智能体' },
  { id: 'llm-apps', name: 'LLM 应用', emoji: '💬', description: 'Chat with X 等应用' },
];

export const GITHUB_REPO_BASE = 'https://github.com/Shubhamsaboo/awesome-llm-apps';
export const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Shubhamsaboo/awesome-llm-apps/main';

// 从 awesome-llm-apps README 解析的智能体数据
export const awesomeLLMAgents: AwesomeLLMAgent[] = [
  // =================== Starter AI Agents (🌱) ===================
  {
    id: 'ai-travel-agent',
    name: 'AI Travel Agent',
    emoji: '🛫',
    description: 'AI-powered travel planning assistant',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_travel_agent/',
    tags: ['local', 'cloud'],
    hasLocalVersion: true,
  },
  {
    id: 'ai-blog-to-podcast',
    name: 'AI Blog to Podcast Agent',
    emoji: '🎙️',
    description: 'Convert blog posts to podcast episodes',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_blog_to_podcast_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-music-generator',
    name: 'AI Music Generator Agent',
    emoji: '🎵',
    description: 'Generate music with AI',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_music_generator/',
    tags: ['replicate'],
  },
  {
    id: 'ai-meeting-agent',
    name: 'AI Meeting Agent',
    emoji: '📅',
    description: 'AI meeting scheduler and summarizer',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_meeting_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-data-analysis-agent',
    name: 'AI Data Analysis Agent',
    emoji: '📊',
    description: 'Analyze data with AI assistance',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_data_analysis_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-shopping-agent',
    name: 'AI Shopping Agent',
    emoji: '🛒',
    description: 'AI shopping assistant',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_shopping_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-health-fitness-agent',
    name: 'AI Health & Fitness Agent',
    emoji: '🏋️',
    description: 'Health and fitness coaching AI',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_health_fitness_agent/',
    tags: ['local', 'cloud'],
    hasLocalVersion: true,
  },
  {
    id: 'ai-coding-agent',
    name: 'AI Coding Agent',
    emoji: '💻',
    description: 'Code generation and assistance',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_coding_agent/',
    tags: ['claude'],
    modelProvider: 'anthropic',
  },
  {
    id: 'ai-news-agent',
    name: 'AI News Agent',
    emoji: '📰',
    description: 'AI news aggregation and summarization',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_news_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-teaching-agent',
    name: 'AI Teaching Agent',
    emoji: '👨‍🏫',
    description: 'AI-powered teaching assistant',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_teaching_agent/',
    tags: ['gemini'],
    modelProvider: 'google',
  },
  {
    id: 'ai-gift-agent',
    name: 'AI Gift Curator Agent',
    emoji: '🎁',
    description: 'AI gift recommendation',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_gift_curator_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-recipe-agent',
    name: 'AI Recipe Agent',
    emoji: '🍳',
    description: 'AI recipe generation and planning',
    category: 'starter-agents',
    githubPath: 'starter_ai_agents/ai_recipe_agent/',
    tags: ['openai'],
  },

  // =================== Advanced AI Agents (🚀) ===================
  {
    id: 'ai-deep-research-agent',
    name: 'AI Deep Research Agent',
    emoji: '🔍',
    description: 'Deep research and analysis',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_deep_research_agent/',
    tags: ['openai', 'claude'],
  },
  {
    id: 'ai-investment-agent',
    name: 'AI Investment Agent',
    emoji: '📈',
    description: 'Investment analysis and recommendations',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_investment_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-journalist-agent',
    name: 'AI Journalist Agent',
    emoji: '📝',
    description: 'Automated journalism',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_journalist_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-vc-due-diligence',
    name: 'AI VC Due Diligence Agent',
    emoji: '💼',
    description: 'VC due diligence automation',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_vc_due_diligence_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-writer-agent',
    name: 'AI Writer Agent',
    emoji: '✍️',
    description: 'AI writing assistant',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_writer_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-movie-agent',
    name: 'AI Movie Production Agent',
    emoji: '🎬',
    description: 'AI movie production assistant',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_movie_production_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-startup-advisor',
    name: 'AI Startup Advisor Agent',
    emoji: '🚀',
    description: 'AI startup mentorship',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_startup_advisor_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-story-agent',
    name: 'AI Story Agent',
    emoji: '📖',
    description: 'AI storytelling',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_story_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-email-agent',
    name: 'AI Email Agent',
    emoji: '📧',
    description: 'AI email management',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_email_agent/',
    tags: ['openai'],
  },
  {
    id: 'ai-sdr-agent',
    name: 'AI SDR Agent',
    emoji: '💰',
    description: 'AI sales development representative',
    category: 'advanced-agents',
    subCategory: 'single_agent',
    githubPath: 'advanced_ai_agents/single_agent_apps/ai_sdr_agent/',
    tags: ['openai'],
  },

  // =================== Voice AI Agents (🗣️) ===================
  {
    id: 'voice-audio-tour-agent',
    name: 'Voice Audio Tour Agent',
    emoji: '🗺️',
    description: 'Voice-guided tour experience',
    category: 'voice-agents',
    githubPath: 'ai_voice_agents/audio_tour_voice_agent/',
    tags: ['openai', 'elevenlabs'],
  },
  {
    id: 'voice-customer-support',
    name: 'Voice Customer Support Agent',
    emoji: '📞',
    description: 'Voice customer support',
    category: 'voice-agents',
    githubPath: 'ai_voice_agents/customer_support_voice_agent/',
    tags: ['openai', 'elevenlabs'],
  },
  {
    id: 'voice-interviewer',
    name: 'Voice Interviewer Agent',
    emoji: '🎤',
    description: 'AI voice interviewer',
    category: 'voice-agents',
    githubPath: 'ai_voice_agents/interviewer_voice_agent/',
    tags: ['openai', 'elevenlabs'],
  },
  {
    id: 'voice-tutor',
    name: 'Voice Tutor Agent',
    emoji: '📚',
    description: 'Voice-based tutoring',
    category: 'voice-agents',
    githubPath: 'ai_voice_agents/tutor_voice_agent/',
    tags: ['openai', 'elevenlabs'],
  },

  // =================== MCP AI Agents (♾️) ===================
  {
    id: 'mcp-browser-agent',
    name: 'MCP Browser Agent',
    emoji: '🌐',
    description: 'Browser automation with MCP',
    category: 'mcp-agents',
    githubPath: 'mcp_ai_agents/mcp_browser_agent/',
    tags: ['claude', 'mcp'],
    modelProvider: 'anthropic',
  },
  {
    id: 'mcp-github-agent',
    name: 'MCP GitHub Agent',
    emoji: '🐙',
    description: 'GitHub operations with MCP',
    category: 'mcp-agents',
    githubPath: 'mcp_ai_agents/mcp_github_agent/',
    tags: ['claude', 'mcp'],
    modelProvider: 'anthropic',
  },
  {
    id: 'mcp-notion-agent',
    name: 'MCP Notion Agent',
    emoji: '📝',
    description: 'Notion integration with MCP',
    category: 'mcp-agents',
    githubPath: 'mcp_ai_agents/mcp_notion_agent/',
    tags: ['claude', 'mcp'],
    modelProvider: 'anthropic',
  },
  {
    id: 'mcp-slack-agent',
    name: 'MCP Slack Agent',
    emoji: '💬',
    description: 'Slack integration with MCP',
    category: 'mcp-agents',
    githubPath: 'mcp_ai_agents/mcp_slack_agent/',
    tags: ['claude', 'mcp'],
    modelProvider: 'anthropic',
  },

  // =================== RAG Tutorials (📀) ===================
  {
    id: 'agentic-rag',
    name: 'Agentic RAG',
    emoji: '🤖',
    description: 'Agent-based RAG implementation',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/agentic_rag/',
    tags: ['openai', 'rag'],
  },
  {
    id: 'corrective-rag',
    name: 'Corrective RAG',
    emoji: '🔧',
    description: 'Self-correcting RAG',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/corrective_rag/',
    tags: ['openai', 'rag'],
  },
  {
    id: 'vision-rag',
    name: 'Vision RAG',
    emoji: '👁️',
    description: 'Multi-modal RAG with vision',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/vision_rag/',
    tags: ['openai', 'rag'],
  },
  {
    id: 'graph-rag',
    name: 'Graph RAG',
    emoji: '🕸️',
    description: 'Knowledge graph RAG',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/graph_rag/',
    tags: ['openai', 'rag'],
  },
  {
    id: 'hybrid-rag',
    name: 'Hybrid RAG',
    emoji: '🔀',
    description: 'Hybrid search RAG',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/hybrid_rag/',
    tags: ['openai', 'rag'],
  },
  {
    id: 'reranking-rag',
    name: 'Reranking RAG',
    emoji: '📊',
    description: 'RAG with reranking',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/reranking_rag/',
    tags: ['openai', 'cohere', 'rag'],
  },
  {
    id: 'query-expansion-rag',
    name: 'Query Expansion RAG',
    emoji: '🔍',
    description: 'RAG with query expansion',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/query_expansion_rag/',
    tags: ['openai', 'rag'],
  },
  {
    id: 'contextual-compression-rag',
    name: 'Contextual Compression RAG',
    emoji: '📦',
    description: 'RAG with context compression',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/contextual_compression_rag/',
    tags: ['openai', 'rag'],
  },
  {
    id: 'parent-document-rag',
    name: 'Parent Document RAG',
    emoji: '📄',
    description: 'Parent document retrieval',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/parent_document_rag/',
    tags: ['openai', 'rag'],
  },
  {
    id: 'sentence-window-rag',
    name: 'Sentence Window RAG',
    emoji: '🪟',
    description: 'Sentence window retrieval',
    category: 'rag-tutorials',
    githubPath: 'rag_tutorials/sentence_window_rag/',
    tags: ['openai', 'rag'],
  },

  // =================== Multi-Agent Teams (🤝) ===================
  {
    id: 'ai-finance-team',
    name: 'AI Finance Team',
    emoji: '💹',
    description: 'Multi-agent finance team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_finance_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-legal-team',
    name: 'AI Legal Team',
    emoji: '⚖️',
    description: 'Multi-agent legal team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_legal_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-design-team',
    name: 'AI Design Team',
    emoji: '🎨',
    description: 'Multi-agent design team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_design_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-marketing-team',
    name: 'AI Marketing Team',
    emoji: '📣',
    description: 'Multi-agent marketing team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_marketing_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-research-team',
    name: 'AI Research Team',
    emoji: '🔬',
    description: 'Multi-agent research team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_research_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-support-team',
    name: 'AI Support Team',
    emoji: '🛟',
    description: 'Multi-agent support team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_support_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-hr-team',
    name: 'AI HR Team',
    emoji: '👥',
    description: 'Multi-agent HR team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_hr_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-devops-team',
    name: 'AI DevOps Team',
    emoji: '⚙️',
    description: 'Multi-agent DevOps team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_devops_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-sales-team',
    name: 'AI Sales Team',
    emoji: '💰',
    description: 'Multi-agent sales team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_sales_team/',
    tags: ['openai', 'multi-agent'],
  },
  {
    id: 'ai-product-team',
    name: 'AI Product Team',
    emoji: '📦',
    description: 'Multi-agent product team',
    category: 'multi-agent-teams',
    githubPath: 'advanced_ai_agents/multi_agent_teams/ai_product_team/',
    tags: ['openai', 'multi-agent'],
  },

  // =================== Game Playing Agents (🎮) ===================
  {
    id: 'ai-chess-agent',
    name: 'AI Chess Agent',
    emoji: '♟️',
    description: 'AI chess player',
    category: 'game-agents',
    githubPath: 'game_playing_agents/ai_chess_agent/',
    tags: ['openai', 'game'],
  },
  {
    id: 'ai-tictactoe-agent',
    name: 'AI Tic-Tac-Toe Agent',
    emoji: '⭕',
    description: 'AI tic-tac-toe player',
    category: 'game-agents',
    githubPath: 'game_playing_agents/ai_tictactoe_agent/',
    tags: ['openai', 'game'],
  },
  {
    id: 'ai-pygame-3d',
    name: 'AI 3D Pygame Agent',
    emoji: '🕹️',
    description: '3D game AI with Pygame',
    category: 'game-agents',
    githubPath: 'game_playing_agents/ai_3d_pygame_agent/',
    tags: ['openai', 'game'],
  },

  // =================== LLM Apps (💬) ===================
  {
    id: 'chat-with-pdf',
    name: 'Chat with PDF',
    emoji: '📕',
    description: 'Chat with PDF documents',
    category: 'llm-apps',
    githubPath: 'llm_apps/chat_with_pdf/',
    tags: ['openai', 'local'],
    hasLocalVersion: true,
  },
  {
    id: 'chat-with-gmail',
    name: 'Chat with Gmail',
    emoji: '📧',
    description: 'Chat with Gmail inbox',
    category: 'llm-apps',
    githubPath: 'llm_apps/chat_with_gmail/',
    tags: ['openai', 'gemini'],
  },
  {
    id: 'chat-with-youtube',
    name: 'Chat with YouTube',
    emoji: '📺',
    description: 'Chat with YouTube videos',
    category: 'llm-apps',
    githubPath: 'llm_apps/chat_with_youtube/',
    tags: ['openai'],
  },
  {
    id: 'chat-with-github',
    name: 'Chat with GitHub',
    emoji: '🐙',
    description: 'Chat with GitHub repos',
    category: 'llm-apps',
    githubPath: 'llm_apps/chat_with_github/',
    tags: ['openai'],
  },
  {
    id: 'chat-with-website',
    name: 'Chat with Website',
    emoji: '🌐',
    description: 'Chat with any website',
    category: 'llm-apps',
    githubPath: 'llm_apps/chat_with_website/',
    tags: ['openai'],
  },
  {
    id: 'chat-with-csv',
    name: 'Chat with CSV',
    emoji: '📊',
    description: 'Chat with CSV files',
    category: 'llm-apps',
    githubPath: 'llm_apps/chat_with_csv/',
    tags: ['openai'],
  },
  {
    id: 'chat-with-arxiv',
    name: 'Chat with arXiv',
    emoji: '📚',
    description: 'Chat with arXiv papers',
    category: 'llm-apps',
    githubPath: 'llm_apps/chat_with_arxiv/',
    tags: ['openai'],
  },
  {
    id: 'chat-with-image',
    name: 'Chat with Image',
    emoji: '🖼️',
    description: 'Vision-based image chat',
    category: 'llm-apps',
    githubPath: 'llm_apps/chat_with_image/',
    tags: ['openai', 'gemini'],
  },
  {
    id: 'ai-memory-chatbot',
    name: 'AI Memory Chatbot',
    emoji: '🧠',
    description: 'Chatbot with persistent memory',
    category: 'llm-apps',
    githubPath: 'llm_apps/ai_memory_chatbot/',
    tags: ['openai', 'mem0'],
  },
  {
    id: 'local-chatbot',
    name: 'Local LLM Chatbot',
    emoji: '💻',
    description: 'Run LLM locally with Ollama',
    category: 'llm-apps',
    githubPath: 'llm_apps/local_chatbot/',
    tags: ['local', 'ollama'],
    hasLocalVersion: true,
  },
  {
    id: 'multimodal-chatbot',
    name: 'Multimodal Chatbot',
    emoji: '🎭',
    description: 'Text + Image + Audio chat',
    category: 'llm-apps',
    githubPath: 'llm_apps/multimodal_chatbot/',
    tags: ['openai', 'gemini'],
  },
  {
    id: 'llm-router',
    name: 'LLM Router',
    emoji: '🔀',
    description: 'Route to best LLM model',
    category: 'llm-apps',
    githubPath: 'llm_apps/llm_router/',
    tags: ['openai', 'anthropic', 'gemini'],
  },
];

// Helper functions
export function getAgentsByCategory(category: AgentCategory): AwesomeLLMAgent[] {
  return awesomeLLMAgents.filter((agent) => agent.category === category);
}

export function searchAgents(query: string): AwesomeLLMAgent[] {
  const lowerQuery = query.toLowerCase();
  return awesomeLLMAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(lowerQuery) ||
      agent.description?.toLowerCase().includes(lowerQuery) ||
      agent.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

export function filterAgentsByTag(tag: string): AwesomeLLMAgent[] {
  return awesomeLLMAgents.filter((agent) =>
    agent.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

export function getAgentGitHubUrl(agent: AwesomeLLMAgent): string {
  return `${GITHUB_REPO_BASE}/tree/main/${agent.githubPath}`;
}

export function getAgentReadmeUrl(agent: AwesomeLLMAgent): string {
  return `${GITHUB_RAW_BASE}/${agent.githubPath}README.md`;
}
