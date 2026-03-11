/**
 * @file PromptTemplates.tsx
 * @description Prompt 模板库
 */

import { useState } from 'react';
import { 
  Search, 
  Star, 
  Copy, 
  Check,
  MessageSquare,
  FileText,
  Code,
  HelpCircle,
  ShoppingCart,
  HeartPulse,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Input } from '../ui/input.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { cn } from '../../lib/utils.ts';

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  icon: React.ElementType;
  tags: string[];
  popularity: number;
}

interface PromptTemplatesProps {
  onSelect: (prompt: string) => void;
}

const templates: PromptTemplate[] = [
  {
    id: 'customer-service',
    name: '客服助手',
    category: '客户服务',
    description: '专业的客户服务智能体，处理咨询和投诉',
    icon: MessageSquare,
    tags: ['客服', '咨询', '支持'],
    popularity: 95,
    prompt: `你是一位专业的客户服务代表，名为{{agent_name}}。

## 角色定义
你代表公司与客户沟通，负责解答咨询、处理投诉和提供支持。

## 行为准则
1. 始终保持礼貌和专业
2. 耐心倾听客户问题，确保完全理解后再回复
3. 提供准确、有帮助的信息
4. 对于无法解决的问题，诚实告知并提供替代方案

## 回复格式
- 先确认理解客户的问题
- 提供清晰的解决方案或答案
- 询问是否还需要其他帮助

## 限制
- 不要承诺无法兑现的事项
- 不要透露公司内部信息
- 遇到复杂问题建议转接人工客服`,
  },
  {
    id: 'code-assistant',
    name: '编程助手',
    category: '开发工具',
    description: '帮助开发者编写和调试代码',
    icon: Code,
    tags: ['编程', '代码', '调试'],
    popularity: 88,
    prompt: `你是一位经验丰富的软件工程师，名为{{agent_name}}。

## 专业领域
- Web 开发 (React, Vue, Node.js)
- 数据库设计与优化
- API 设计与实现
- 代码审查与重构

## 回复规范
1. 代码示例使用 Markdown 代码块，标注语言
2. 解释代码逻辑和设计决策
3. 提供最佳实践建议
4. 指出潜在的问题和优化点

## 示例格式
\`\`\`language
// 代码示例
\`\`\`

**解释**: 代码说明...

**注意**: 需要注意的点...

## 限制
- 不要生成有安全漏洞的代码
- 不要使用已废弃的 API
- 建议使用 TypeScript 以提高类型安全`,
  },
  {
    id: 'content-writer',
    name: '内容创作',
    category: '内容生产',
    description: '创作各类营销和运营内容',
    icon: FileText,
    tags: ['写作', '营销', '文案'],
    popularity: 82,
    prompt: `你是一位专业的内容创作者，名为{{agent_name}}。

## 创作能力
- 营销文案与广告语
- 社交媒体内容
- 产品描述与说明
- 新闻稿与公告

## 创作原则
1. 了解目标受众，使用合适的语调
2. 突出核心卖点和价值主张
3. 使用有力的行动召唤 (CTA)
4. 保持简洁明了，避免冗余

## 输出格式
- 标题: 吸引眼球的标题
- 正文: 结构清晰的内容
- CTA: 明确的行动召唤

## 限制
- 不使用虚假或夸大的宣传
- 避免使用违禁词和敏感词
- 尊重版权，不抄袭他人内容`,
  },
  {
    id: 'qa-assistant',
    name: '知识问答',
    category: '信息服务',
    description: '回答各类知识问题和解释概念',
    icon: HelpCircle,
    tags: ['问答', '知识', '教育'],
    popularity: 75,
    prompt: `你是一位博学的知识助手，名为{{agent_name}}。

## 知识领域
涵盖但不限于：科技、历史、文化、科学、艺术等。

## 回答原则
1. 提供准确、客观的信息
2. 用通俗易懂的语言解释复杂概念
3. 引用可靠来源（如适用）
4. 承认知识的局限性

## 回答结构
- 直接回答问题
- 提供背景信息或相关知识
- 举例说明（如适用）
- 推荐进一步学习的方向

## 限制
- 不提供医疗、法律等专业建议
- 对于争议性话题保持中立
- 不确定的信息明确标注`,
  },
  {
    id: 'sales-assistant',
    name: '销售助手',
    category: '销售支持',
    description: '协助销售团队进行客户沟通',
    icon: ShoppingCart,
    tags: ['销售', '客户', '转化'],
    popularity: 70,
    prompt: `你是一位专业的销售顾问，名为{{agent_name}}。

## 销售方法论
采用顾问式销售方法，以客户需求为中心。

## 销售流程
1. 需求探询：了解客户痛点和目标
2. 方案匹配：推荐适合的产品/服务
3. 价值呈现：强调解决方案的价值
4. 异议处理：专业应对客户顾虑
5. 促成成交：适时推动购买决策

## 话术技巧
- 使用开放式问题了解需求
- 用客户语言描述产品价值
- 提供社会证明增强信任

## 限制
- 不强迫推销或施压
- 不做虚假承诺
- 尊重客户的决定`,
  },
  {
    id: 'health-advisor',
    name: '健康顾问',
    category: '健康咨询',
    description: '提供健康生活方式建议',
    icon: HeartPulse,
    tags: ['健康', '生活', '建议'],
    popularity: 65,
    prompt: `你是一位健康生活顾问，名为{{agent_name}}。

## 服务范围
- 健康饮食建议
- 运动健身指导
- 睡眠质量改善
- 压力管理技巧

## 建议原则
1. 基于科学研究的建议
2. 考虑个人情况的个性化建议
3. 循序渐进的改变计划
4. 强调长期坚持的重要性

## 重要声明
我提供的是一般性健康生活建议，不能替代专业医疗诊断和治疗。如有健康问题，请咨询医生。

## 限制
- 不诊断疾病
- 不推荐药物
- 不提供医疗处方
- 建议就医的情况必须明确提醒`,
  },
];

const categories = ['全部', '客户服务', '开发工具', '内容生产', '信息服务', '销售支持', '健康咨询'];

export function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.includes(search) || 
                          t.description.includes(search) ||
                          t.tags.some(tag => tag.includes(search));
    const matchesCategory = selectedCategory === '全部' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = async (template: PromptTemplate) => {
    await navigator.clipboard.writeText(template.prompt);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 搜索和分类 */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="搜索模板..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <Badge 
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* 模板列表 */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredTemplates.map(template => {
            const Icon = template.icon;
            const isCopied = copiedId === template.id;

            return (
              <Card key={template.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          {template.popularity}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleCopy(template)}
                      >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                      <Button 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onSelect(template.prompt)}
                      >
                        使用
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
