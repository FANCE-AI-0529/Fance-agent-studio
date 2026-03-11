// =====================================================
// 智能头像生成器 - 根据描述自动匹配图标和颜色
// Smart Avatar Generator - Auto-match icon & color by description
// =====================================================

import type { AgentAvatar } from "../components/builder/AgentAvatarPicker.tsx";

// 图标关键词映射表
const ICON_KEYWORD_MAP: Array<{ iconId: string; keywords: string[] }> = [
  { iconId: 'radar',          keywords: ['竞品', '追踪', '监控', '竞对', '情报', '舆情', '预警'] },
  { iconId: 'message-square', keywords: ['客服', '接待', '对话', '聊天', '沟通', '咨询', '问答', '回复'] },
  { iconId: 'heart-pulse',    keywords: ['医疗', '健康', '诊断', '医生', '病', '养生', '体检', '药'] },
  { iconId: 'brain',          keywords: ['分析', 'AI', '智能', '推理', '决策', '策略', '思维'] },
  { iconId: 'code',           keywords: ['代码', '编程', '开发', '程序', '技术', 'API', '工程', '调试'] },
  { iconId: 'graduation-cap', keywords: ['教育', '学习', '培训', '老师', '课程', '知识', '考试', '辅导'] },
  { iconId: 'scale',          keywords: ['法律', '合规', '法务', '合同', '律师', '政策', '法规'] },
  { iconId: 'wallet',         keywords: ['金融', '财务', '财报', '会计', '银行', '投资', '理财', '基金'] },
  { iconId: 'shopping-cart',   keywords: ['电商', '购物', '选品', '商品', '店铺', '运营', '带货'] },
  { iconId: 'globe',          keywords: ['翻译', '语言', '多语', '国际', '外语', '本地化'] },
  { iconId: 'palette',        keywords: ['设计', '创意', '美工', 'UI', '视觉', '品牌', '配色'] },
  { iconId: 'file-text',      keywords: ['文档', '写作', '报告', '文案', '内容', '总结', '摘要', '笔记'] },
  { iconId: 'database',       keywords: ['数据', '统计', '报表', 'BI', '洞察', '指标', '仪表盘'] },
  { iconId: 'search',         keywords: ['搜索', '检索', '查询', '查找', '爬虫', '抓取'] },
  { iconId: 'shield',         keywords: ['安全', '防护', '风控', '审核', '过滤', '合规检查'] },
  { iconId: 'workflow',       keywords: ['流程', '自动化', '工作流', '审批', '协作'] },
  { iconId: 'building2',      keywords: ['企业', '公司', '组织', '管理', 'HR', '人事', '招聘'] },
  { iconId: 'calculator',     keywords: ['计算', '税务', '预算', '核算', '定价'] },
  { iconId: 'microscope',     keywords: ['科研', '实验', '研究', '论文', '学术'] },
  { iconId: 'music',          keywords: ['音乐', '音频', '声音', '播客', '语音'] },
  { iconId: 'camera',         keywords: ['摄影', '图片', '图像', '拍照', '视频', '直播'] },
  { iconId: 'home',           keywords: ['房产', '房屋', '租房', '装修', '物业'] },
  { iconId: 'leaf',           keywords: ['环保', '绿色', '碳', '可持续', '生态'] },
  { iconId: 'car',            keywords: ['交通', '出行', '物流', '配送', '快递'] },
  { iconId: 'plane',          keywords: ['旅游', '航班', '酒店', '行程', '签证'] },
  { iconId: 'lightbulb',      keywords: ['创新', '灵感', '头脑风暴', '点子', '想法'] },
];

// 颜色关键词映射表
const COLOR_KEYWORD_MAP: Array<{ colorId: string; keywords: string[] }> = [
  { colorId: 'green',  keywords: ['客服', '服务', '对话', '聊天', '咨询', '问答', '沟通'] },
  { colorId: 'blue',   keywords: ['数据', '分析', '统计', '报表', 'BI', '洞察', '搜索'] },
  { colorId: 'cyan',   keywords: ['代码', '编程', '开发', '程序', '技术', 'API', '工程'] },
  { colorId: 'amber',  keywords: ['金融', '财务', '财报', '会计', '银行', '投资', '理财'] },
  { colorId: 'rose',   keywords: ['医疗', '健康', '诊断', '医生', '病', '养生'] },
  { colorId: 'orange', keywords: ['教育', '学习', '培训', '老师', '课程', '知识', '考试'] },
  { colorId: 'indigo', keywords: ['法律', '合规', '法务', '合同', '律师', '政策'] },
  { colorId: 'purple', keywords: ['设计', '创意', '美工', 'UI', '视觉', '品牌'] },
  { colorId: 'teal',   keywords: ['翻译', '语言', '多语', '国际', '外语'] },
  { colorId: 'pink',   keywords: ['电商', '购物', '选品', '商品', '店铺', '运营'] },
  { colorId: 'fuchsia', keywords: ['AI', '智能', '推理', '决策', '自动化'] },
];

// 固定颜色池（用于无匹配时的确定性选择）
const FALLBACK_COLORS = ['blue', 'cyan', 'purple', 'teal', 'indigo', 'green', 'amber', 'rose', 'orange', 'pink', 'fuchsia'];

/**
 * 根据描述文本智能匹配最佳图标和颜色
 * @param description 智能体描述或名称
 * @returns 匹配的 AgentAvatar
 */
export function generateSmartAvatar(description: string): AgentAvatar {
  const text = description.toLowerCase();

  // 匹配图标 - 找到第一个命中关键词的图标
  let matchedIconId = 'bot'; // 默认兜底
  for (const { iconId, keywords } of ICON_KEYWORD_MAP) {
    if (keywords.some(kw => text.includes(kw))) {
      matchedIconId = iconId;
      break;
    }
  }

  // 匹配颜色 - 找到第一个命中关键词的颜色
  let matchedColorId = '';
  for (const { colorId, keywords } of COLOR_KEYWORD_MAP) {
    if (keywords.some(kw => text.includes(kw))) {
      matchedColorId = colorId;
      break;
    }
  }

  // 无颜色匹配时，基于描述哈希确定性选择颜色
  if (!matchedColorId) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    matchedColorId = FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
  }

  return { iconId: matchedIconId, colorId: matchedColorId };
}
