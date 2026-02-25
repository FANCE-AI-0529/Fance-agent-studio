// Extended translations for P2-09 internationalization support

export type Language = "zh" | "en";

// Extended translation keys for all modules
export const extendedTranslations: Record<Language, Record<string, string>> = {
  zh: {
    // Agent Recommendation
    "recommendation.title": "为你推荐",
    "recommendation.refresh": "刷新",
    "recommendation.no_results": "暂无推荐",
    "recommendation.match_score": "匹配度",
    "recommendation.popular": "热门",
    "recommendation.reason.preference": "符合你的使用偏好",
    "recommendation.reason.related": "与你常用类别相关",
    "recommendation.reason.rating": "高评分",
    "recommendation.reason.smart": "智能推荐",

    // Message Quote
    "quote.reply_user": "回复你的消息",
    "quote.reply_ai": "回复 AI 的消息",
    "quote.button": "引用回复",

    // Skill Rating
    "rating.title": "评价与评论",
    "rating.your_rating": "你的评分",
    "rating.share_experience": "分享你的使用体验...（可选）",
    "rating.submit": "提交评价",
    "rating.update": "更新评价",
    "rating.delete": "删除",
    "rating.latest": "最新评价",
    "rating.view_all": "查看全部",
    "rating.write": "写评价",
    "rating.modify": "修改我的评价",

    // Document Preview
    "preview.title": "文档预览",
    "preview.download": "下载",
    "preview.fullscreen": "全屏",
    "preview.exit_fullscreen": "退出全屏",
    "preview.unsupported": "无法预览此文件",
    "preview.unsupported_desc": "文件类型暂不支持在线预览",
    "preview.loading": "加载文档中...",
    "preview.error": "文件加载失败",

    // Version Diff
    "diff.title": "版本对比",
    "diff.old_version": "旧版本",
    "diff.new_version": "新版本",
    "diff.added": "新增",
    "diff.removed": "删除",
    "diff.modified": "修改",
    "diff.no_diff": "无差异",
    "diff.no_versions": "暂无可对比的版本",
    "diff.need_two": "至少需要两个版本才能进行对比",
    "diff.restore": "恢复到此版本",
    "diff.system_prompt": "系统提示词",
    "diff.mplp_policy": "MPLP 策略",
    "diff.mounted_skills": "挂载技能",
    "diff.personality": "人设配置",

    // Collaboration
    "collab.connected": "已连接",
    "collab.disconnected": "断开连接",
    "collab.chat": "协作聊天",
    "collab.no_messages": "暂无消息",
    "collab.send": "发送",
    "collab.input_placeholder": "输入消息...",
    "collab.editing": "正在编辑",

    // Dark Mode
    "darkmode.title": "深色模式优化",
    "darkmode.light": "浅色",
    "darkmode.dark": "深色",
    "darkmode.system": "系统",
    "darkmode.auto_switch": "跟随系统自动切换",
    "darkmode.contrast_check": "对比度检查",
    "darkmode.reanalyze": "重新分析",
    "darkmode.wcag_info": "WCAG 对比度标准",
    "darkmode.wcag_desc": "AAA: ≥ 7:1 (最佳) | AA: ≥ 4.5:1 (推荐) | 低于4.5:1可能影响可读性",
    "darkmode.passed": "通过",

    // PWA
    "pwa.install": "安装应用",
    "pwa.install_desc": "将 HIVE 添加到主屏幕，获得原生应用体验",
    "pwa.install_button": "立即安装",
    "pwa.installed": "已安装",
    "pwa.offline": "离线模式",
    "pwa.online": "在线",
    "pwa.update_available": "有新版本可用",
    "pwa.update": "更新",

    // Voice Input
    "voice.start": "点击开始语音输入",
    "voice.stop": "点击停止录音",
    "voice.recognizing": "识别中",
    "voice.success": "语音识别完成",
    "voice.unsupported": "您的浏览器不支持语音识别",
    "voice.error.no_speech": "未检测到语音，请重试",
    "voice.error.audio_capture": "无法访问麦克风，请检查权限设置",
    "voice.error.not_allowed": "麦克风权限被拒绝，请在浏览器设置中允许",
    "voice.error.network": "网络错误，请检查网络连接",
    "voice.error.aborted": "语音识别已取消",
    "voice.error.start_failed": "启动语音识别失败",

    // Common
    "common.today": "今天",
    "common.yesterday": "昨天",
    "common.just_now": "刚刚",
    "common.minutes_ago": "分钟前",
    "common.hours_ago": "小时前",
    "common.days_ago": "天前",
  },
  en: {
    // Agent Recommendation
    "recommendation.title": "Recommended for You",
    "recommendation.refresh": "Refresh",
    "recommendation.no_results": "No recommendations",
    "recommendation.match_score": "Match",
    "recommendation.popular": "Popular",
    "recommendation.reason.preference": "Matches your preferences",
    "recommendation.reason.related": "Related to your categories",
    "recommendation.reason.rating": "Highly rated",
    "recommendation.reason.smart": "Smart pick",

    // Message Quote
    "quote.reply_user": "Reply to your message",
    "quote.reply_ai": "Reply to AI message",
    "quote.button": "Quote reply",

    // Skill Rating
    "rating.title": "Ratings & Reviews",
    "rating.your_rating": "Your Rating",
    "rating.share_experience": "Share your experience... (optional)",
    "rating.submit": "Submit Review",
    "rating.update": "Update Review",
    "rating.delete": "Delete",
    "rating.latest": "Latest Reviews",
    "rating.view_all": "View All",
    "rating.write": "Write Review",
    "rating.modify": "Edit My Review",

    // Document Preview
    "preview.title": "Document Preview",
    "preview.download": "Download",
    "preview.fullscreen": "Fullscreen",
    "preview.exit_fullscreen": "Exit Fullscreen",
    "preview.unsupported": "Cannot preview this file",
    "preview.unsupported_desc": "This file type is not supported for preview",
    "preview.loading": "Loading document...",
    "preview.error": "Failed to load file",

    // Version Diff
    "diff.title": "Version Compare",
    "diff.old_version": "Old Version",
    "diff.new_version": "New Version",
    "diff.added": "Added",
    "diff.removed": "Removed",
    "diff.modified": "Modified",
    "diff.no_diff": "No changes",
    "diff.no_versions": "No versions to compare",
    "diff.need_two": "At least two versions required for comparison",
    "diff.restore": "Restore to this version",
    "diff.system_prompt": "System Prompt",
    "diff.mplp_policy": "MPLP Policy",
    "diff.mounted_skills": "Mounted Skills",
    "diff.personality": "Personality Config",

    // Collaboration
    "collab.connected": "Connected",
    "collab.disconnected": "Disconnected",
    "collab.chat": "Team Chat",
    "collab.no_messages": "No messages",
    "collab.send": "Send",
    "collab.input_placeholder": "Type a message...",
    "collab.editing": "is editing",

    // Dark Mode
    "darkmode.title": "Dark Mode Settings",
    "darkmode.light": "Light",
    "darkmode.dark": "Dark",
    "darkmode.system": "System",
    "darkmode.auto_switch": "Follow system preference",
    "darkmode.contrast_check": "Contrast Check",
    "darkmode.reanalyze": "Re-analyze",
    "darkmode.wcag_info": "WCAG Contrast Standards",
    "darkmode.wcag_desc": "AAA: ≥ 7:1 (Best) | AA: ≥ 4.5:1 (Recommended) | Below 4.5:1 may affect readability",
    "darkmode.passed": "Passed",

    // PWA
    "pwa.install": "Install App",
    "pwa.install_desc": "Add HIVE to your home screen for a native app experience",
    "pwa.install_button": "Install Now",
    "pwa.installed": "Installed",
    "pwa.offline": "Offline Mode",
    "pwa.online": "Online",
    "pwa.update_available": "Update available",
    "pwa.update": "Update",

    // Voice Input
    "voice.start": "Click to start voice input",
    "voice.stop": "Click to stop recording",
    "voice.recognizing": "Recognizing",
    "voice.success": "Voice recognition complete",
    "voice.unsupported": "Your browser does not support voice recognition",
    "voice.error.no_speech": "No speech detected, please try again",
    "voice.error.audio_capture": "Cannot access microphone, please check permissions",
    "voice.error.not_allowed": "Microphone permission denied, please allow in browser settings",
    "voice.error.network": "Network error, please check your connection",
    "voice.error.aborted": "Voice recognition cancelled",
    "voice.error.start_failed": "Failed to start voice recognition",

    // Common
    "common.today": "Today",
    "common.yesterday": "Yesterday",
    "common.just_now": "Just now",
    "common.minutes_ago": "minutes ago",
    "common.hours_ago": "hours ago",
    "common.days_ago": "days ago",
  },
};

// Helper to merge with base translations
export function getFullTranslations(lang: Language): Record<string, string> {
  const base = lang === "zh" 
    ? {
        // Brand
        "brand.name": "HIVE",
        "brand.slogan": "技能驱动，智能无限",
        // ... include all base translations
      }
    : {
        "brand.name": "HIVE",
        "brand.slogan": "Skill-driven, Intelligence Unlimited",
        // ... include all base translations
      };
  
  return { ...base, ...extendedTranslations[lang] };
}

export default extendedTranslations;
