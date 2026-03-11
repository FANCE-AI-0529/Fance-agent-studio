import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.tsx";
import { Switch } from "../ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import {
  FileText,
  Users,
  ClipboardCheck,
  DollarSign,
  FileSearch,
  MessageSquare,
  Briefcase,
  ShieldCheck,
  Search,
  ArrowRight,
  Layers,
  GitBranch,
  Sparkles,
  Building2,
  Scale,
  Receipt,
  UserCheck,
  FileCheck,
  Bot,
  Plus,
  Trash2,
  Share2,
  User,
  Library,
  Download,
  Upload,
  MoreVertical,
  Copy,
  FileDown,
  FileUp,
  Variable,
  History,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { toast } from "sonner";
import { 
  useCustomTemplates, 
  useCreateCustomTemplate, 
  useDeleteCustomTemplate,
  type CustomTemplate 
} from "../../hooks/useCustomTemplates.ts";
import type { TaskChain } from "../../hooks/useTaskChains.ts";
import { TemplateVariableDialog } from "./TemplateVariableDialog.tsx";
import { TemplateVersionHistory } from "./TemplateVersionHistory.tsx";

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  type?: "text" | "number" | "textarea";
}

export interface TemplateStep {
  name: string;
  description: string;
  taskType: string;
  inputMapping?: Record<string, string>;
  outputKey: string;
  parallelGroup?: number;
  variables?: TemplateVariable[];
}

export interface TaskChainTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: keyof typeof templateIcons;
  executionMode: "sequential" | "parallel" | "mixed";
  estimatedTime: string;
  steps: TemplateStep[];
  tags: string[];
  isCustom?: boolean;
  isShared?: boolean;
}

const templateIcons = {
  FileText,
  Users,
  ClipboardCheck,
  DollarSign,
  FileSearch,
  MessageSquare,
  Briefcase,
  ShieldCheck,
  Building2,
  Scale,
  Receipt,
  UserCheck,
  FileCheck,
  Bot,
};

const categoryColors: Record<string, string> = {
  "税务申报": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "审批流程": "bg-green-500/10 text-green-500 border-green-500/20",
  "合规检查": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "客户服务": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "数据处理": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "招聘流程": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "custom": "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const categoryLabels: Record<string, string> = {
  "custom": "自定义",
};

export const taskChainTemplates: TaskChainTemplate[] = [
  // 税务申报流程
  {
    id: "tax-filing-basic",
    name: "企业所得税申报",
    description: "标准企业所得税申报流程，包含数据收集、计算、审核和提交",
    category: "税务申报",
    icon: "Receipt",
    executionMode: "sequential",
    estimatedTime: "约 15 分钟",
    tags: ["企业税务", "年度申报", "自动计算"],
    steps: [
      {
        name: "收集财务数据",
        description: "从财务系统收集年度收入、成本、费用等数据",
        taskType: "extraction",
        outputKey: "financial_data",
      },
      {
        name: "计算应税所得",
        description: "根据税法规定计算应纳税所得额",
        taskType: "analysis",
        inputMapping: { data: "financial_data" },
        outputKey: "taxable_income",
      },
      {
        name: "应用税收优惠",
        description: "检查并应用符合条件的税收优惠政策",
        taskType: "analysis",
        inputMapping: { income: "taxable_income" },
        outputKey: "tax_benefits",
      },
      {
        name: "生成申报表",
        description: "根据计算结果自动填写所得税申报表",
        taskType: "generation",
        inputMapping: { income: "taxable_income", benefits: "tax_benefits" },
        outputKey: "tax_form",
      },
      {
        name: "合规审核",
        description: "审核申报表确保符合税务法规要求",
        taskType: "validation",
        inputMapping: { form: "tax_form" },
        outputKey: "review_result",
      },
    ],
  },
  {
    id: "vat-filing",
    name: "增值税申报",
    description: "增值税纳税申报流程，自动汇总发票数据并生成申报表",
    category: "税务申报",
    icon: "DollarSign",
    executionMode: "sequential",
    estimatedTime: "约 10 分钟",
    tags: ["增值税", "月度申报", "发票汇总"],
    steps: [
      {
        name: "汇总销项发票",
        description: "收集并汇总当期开具的销项发票",
        taskType: "extraction",
        outputKey: "output_invoices",
      },
      {
        name: "汇总进项发票",
        description: "收集并汇总当期取得的进项发票",
        taskType: "extraction",
        outputKey: "input_invoices",
      },
      {
        name: "计算应纳税额",
        description: "计算销项税额减去进项税额得出应纳税额",
        taskType: "analysis",
        inputMapping: { output: "output_invoices", input: "input_invoices" },
        outputKey: "vat_amount",
      },
      {
        name: "生成增值税申报表",
        description: "自动填写增值税纳税申报表",
        taskType: "generation",
        inputMapping: { amount: "vat_amount" },
        outputKey: "vat_form",
      },
    ],
  },

  // 审批流程
  {
    id: "expense-approval",
    name: "费用报销审批",
    description: "员工费用报销多级审批流程，支持金额分级审批",
    category: "审批流程",
    icon: "ClipboardCheck",
    executionMode: "sequential",
    estimatedTime: "约 5 分钟",
    tags: ["报销", "多级审批", "财务"],
    steps: [
      {
        name: "验证报销单据",
        description: "检查发票真伪、金额正确性和合规性",
        taskType: "validation",
        outputKey: "document_validation",
      },
      {
        name: "部门经理审批",
        description: "部门负责人审核费用合理性",
        taskType: "general",
        inputMapping: { validation: "document_validation" },
        outputKey: "manager_approval",
      },
      {
        name: "财务审核",
        description: "财务部门审核单据和预算",
        taskType: "validation",
        inputMapping: { approval: "manager_approval" },
        outputKey: "finance_review",
      },
      {
        name: "付款处理",
        description: "通过财务系统处理付款",
        taskType: "general",
        inputMapping: { review: "finance_review" },
        outputKey: "payment_result",
      },
    ],
  },
  {
    id: "contract-approval",
    name: "合同审批流程",
    description: "合同签订前的多部门会签审批流程",
    category: "审批流程",
    icon: "FileCheck",
    executionMode: "mixed",
    estimatedTime: "约 20 分钟",
    tags: ["合同", "会签", "法务"],
    steps: [
      {
        name: "合同条款审核",
        description: "法务部门审核合同条款的合法性",
        taskType: "validation",
        outputKey: "legal_review",
        parallelGroup: 0,
      },
      {
        name: "商务条款审核",
        description: "商务部门审核价格和付款条款",
        taskType: "validation",
        outputKey: "commercial_review",
        parallelGroup: 0,
      },
      {
        name: "技术条款审核",
        description: "技术部门审核技术规格和交付要求",
        taskType: "validation",
        outputKey: "technical_review",
        parallelGroup: 0,
      },
      {
        name: "汇总审批意见",
        description: "汇总各部门审核意见形成最终结论",
        taskType: "aggregation",
        inputMapping: { 
          legal: "legal_review", 
          commercial: "commercial_review", 
          technical: "technical_review" 
        },
        outputKey: "final_review",
        parallelGroup: 1,
      },
      {
        name: "领导审批",
        description: "提交领导最终审批",
        taskType: "general",
        inputMapping: { review: "final_review" },
        outputKey: "approval_result",
        parallelGroup: 2,
      },
    ],
  },

  // 合规检查
  {
    id: "kyc-verification",
    name: "客户KYC验证",
    description: "客户身份识别和背景调查流程",
    category: "合规检查",
    icon: "UserCheck",
    executionMode: "mixed",
    estimatedTime: "约 8 分钟",
    tags: ["KYC", "反洗钱", "身份验证"],
    steps: [
      {
        name: "身份证件验证",
        description: "验证客户提交的身份证件真伪",
        taskType: "validation",
        outputKey: "id_verification",
        parallelGroup: 0,
      },
      {
        name: "地址证明核实",
        description: "核实客户提供的地址证明文件",
        taskType: "validation",
        outputKey: "address_verification",
        parallelGroup: 0,
      },
      {
        name: "制裁名单筛查",
        description: "在制裁名单中筛查客户信息",
        taskType: "extraction",
        outputKey: "sanctions_check",
        parallelGroup: 0,
      },
      {
        name: "风险评估",
        description: "根据验证结果评估客户风险等级",
        taskType: "analysis",
        inputMapping: { 
          id: "id_verification", 
          address: "address_verification", 
          sanctions: "sanctions_check" 
        },
        outputKey: "risk_assessment",
        parallelGroup: 1,
      },
      {
        name: "生成KYC报告",
        description: "生成完整的KYC验证报告",
        taskType: "generation",
        inputMapping: { assessment: "risk_assessment" },
        outputKey: "kyc_report",
        parallelGroup: 2,
      },
    ],
  },
  {
    id: "compliance-audit",
    name: "合规审计检查",
    description: "定期合规审计检查流程，覆盖关键合规领域",
    category: "合规检查",
    icon: "ShieldCheck",
    executionMode: "parallel",
    estimatedTime: "约 30 分钟",
    tags: ["审计", "合规", "风控"],
    steps: [
      {
        name: "政策遵从性检查",
        description: "检查业务流程是否符合内部政策",
        taskType: "validation",
        outputKey: "policy_check",
        parallelGroup: 0,
      },
      {
        name: "监管要求检查",
        description: "检查是否满足监管机构的要求",
        taskType: "validation",
        outputKey: "regulatory_check",
        parallelGroup: 0,
      },
      {
        name: "数据安全检查",
        description: "检查数据处理和存储的安全性",
        taskType: "validation",
        outputKey: "security_check",
        parallelGroup: 0,
      },
      {
        name: "生成审计报告",
        description: "汇总检查结果生成审计报告",
        taskType: "aggregation",
        inputMapping: { 
          policy: "policy_check", 
          regulatory: "regulatory_check", 
          security: "security_check" 
        },
        outputKey: "audit_report",
        parallelGroup: 1,
      },
    ],
  },

  // 客户服务
  {
    id: "customer-inquiry",
    name: "客户咨询处理",
    description: "智能处理客户咨询，自动分类并生成回复",
    category: "客户服务",
    icon: "MessageSquare",
    executionMode: "sequential",
    estimatedTime: "约 2 分钟",
    tags: ["客服", "智能回复", "工单"],
    steps: [
      {
        name: "意图识别",
        description: "分析客户咨询内容，识别咨询意图",
        taskType: "analysis",
        outputKey: "intent",
      },
      {
        name: "知识库检索",
        description: "从知识库中检索相关答案",
        taskType: "extraction",
        inputMapping: { query: "intent" },
        outputKey: "knowledge",
      },
      {
        name: "生成回复",
        description: "根据检索结果生成个性化回复",
        taskType: "generation",
        inputMapping: { knowledge: "knowledge", intent: "intent" },
        outputKey: "response",
      },
      {
        name: "质量检查",
        description: "检查回复内容的准确性和合规性",
        taskType: "validation",
        inputMapping: { response: "response" },
        outputKey: "final_response",
      },
    ],
  },
  {
    id: "complaint-handling",
    name: "投诉处理流程",
    description: "客户投诉接收、分析和解决的完整流程",
    category: "客户服务",
    icon: "Users",
    executionMode: "sequential",
    estimatedTime: "约 10 分钟",
    tags: ["投诉", "客户满意度", "问题解决"],
    steps: [
      {
        name: "投诉分类",
        description: "分析投诉内容并进行分类",
        taskType: "analysis",
        outputKey: "complaint_category",
      },
      {
        name: "影响评估",
        description: "评估投诉问题的影响范围和严重程度",
        taskType: "analysis",
        inputMapping: { category: "complaint_category" },
        outputKey: "impact_assessment",
      },
      {
        name: "解决方案生成",
        description: "根据问题类型生成解决方案建议",
        taskType: "generation",
        inputMapping: { category: "complaint_category", impact: "impact_assessment" },
        outputKey: "solution",
      },
      {
        name: "回复草拟",
        description: "起草给客户的正式回复",
        taskType: "generation",
        inputMapping: { solution: "solution" },
        outputKey: "response_draft",
      },
      {
        name: "满意度跟进",
        description: "记录处理结果并安排满意度回访",
        taskType: "general",
        inputMapping: { response: "response_draft" },
        outputKey: "followup_plan",
      },
    ],
  },

  // 数据处理
  {
    id: "data-analysis-report",
    name: "数据分析报告",
    description: "自动化数据收集、分析和报告生成流程",
    category: "数据处理",
    icon: "FileSearch",
    executionMode: "sequential",
    estimatedTime: "约 12 分钟",
    tags: ["数据分析", "报告", "可视化"],
    steps: [
      {
        name: "数据收集",
        description: "从多个数据源收集原始数据",
        taskType: "extraction",
        outputKey: "raw_data",
      },
      {
        name: "数据清洗",
        description: "清洗和标准化收集到的数据",
        taskType: "transformation",
        inputMapping: { data: "raw_data" },
        outputKey: "clean_data",
      },
      {
        name: "统计分析",
        description: "进行统计分析和趋势识别",
        taskType: "analysis",
        inputMapping: { data: "clean_data" },
        outputKey: "analysis_result",
      },
      {
        name: "生成可视化",
        description: "生成数据可视化图表",
        taskType: "generation",
        inputMapping: { analysis: "analysis_result" },
        outputKey: "visualizations",
      },
      {
        name: "撰写报告",
        description: "自动撰写分析报告和结论",
        taskType: "generation",
        inputMapping: { analysis: "analysis_result", charts: "visualizations" },
        outputKey: "report",
      },
    ],
  },

  // 招聘流程
  {
    id: "recruitment-process",
    name: "招聘筛选流程",
    description: "简历筛选和候选人评估的自动化流程",
    category: "招聘流程",
    icon: "Briefcase",
    executionMode: "sequential",
    estimatedTime: "约 8 分钟",
    tags: ["HR", "简历筛选", "人才评估"],
    steps: [
      {
        name: "简历解析",
        description: "解析简历内容提取关键信息",
        taskType: "extraction",
        outputKey: "resume_data",
      },
      {
        name: "岗位匹配",
        description: "将候选人信息与岗位要求进行匹配",
        taskType: "analysis",
        inputMapping: { resume: "resume_data" },
        outputKey: "match_score",
      },
      {
        name: "背景筛查",
        description: "进行基础背景信息核实",
        taskType: "validation",
        inputMapping: { resume: "resume_data" },
        outputKey: "background_check",
      },
      {
        name: "生成评估报告",
        description: "生成候选人综合评估报告",
        taskType: "generation",
        inputMapping: { match: "match_score", background: "background_check" },
        outputKey: "evaluation_report",
      },
      {
        name: "安排面试",
        description: "为符合条件的候选人安排面试",
        taskType: "general",
        inputMapping: { evaluation: "evaluation_report" },
        outputKey: "interview_schedule",
      },
    ],
  },
  // 带变量的通用模板
  {
    id: "custom-data-process",
    name: "{{projectName}} 数据处理",
    description: "为 {{clientName}} 处理 {{dataType}} 类型数据的通用流程",
    category: "数据处理",
    icon: "FileSearch",
    executionMode: "sequential",
    estimatedTime: "约 10 分钟",
    tags: ["变量模板", "可定制", "数据处理"],
    steps: [
      {
        name: "获取 {{dataType}} 数据",
        description: "从 {{dataSource}} 获取原始数据",
        taskType: "extraction",
        outputKey: "raw_data",
        variables: [
          { name: "dataType", description: "数据类型 (如: 销售、用户、产品)", required: true },
          { name: "dataSource", description: "数据来源系统", defaultValue: "数据库" },
        ],
      },
      {
        name: "数据清洗与转换",
        description: "按照 {{clientName}} 的要求清洗和转换数据",
        taskType: "analysis",
        inputMapping: { data: "raw_data" },
        outputKey: "cleaned_data",
        variables: [
          { name: "clientName", description: "客户名称", required: true },
        ],
      },
      {
        name: "生成 {{reportType}} 报告",
        description: "为 {{projectName}} 生成最终报告",
        taskType: "generation",
        inputMapping: { data: "cleaned_data" },
        outputKey: "final_report",
        variables: [
          { name: "projectName", description: "项目名称", required: true },
          { name: "reportType", description: "报告类型", defaultValue: "汇总" },
        ],
      },
    ],
  },
];

interface TaskChainTemplatesProps {
  onSelectTemplate: (template: TaskChainTemplate) => void;
  onClose?: () => void;
  chainToSave?: TaskChain | null;
  onSaveComplete?: () => void;
}

export function TaskChainTemplates({ 
  onSelectTemplate, 
  onClose, 
  chainToSave,
  onSaveComplete,
}: TaskChainTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TaskChainTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<string>(chainToSave ? "my" : "all");
  const [showSaveDialog, setShowSaveDialog] = useState(!!chainToSave);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Variable dialog state
  const [variableDialogTemplate, setVariableDialogTemplate] = useState<TaskChainTemplate | null>(null);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  
  // Version history state
  const [versionHistoryTemplate, setVersionHistoryTemplate] = useState<CustomTemplate | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Save template form state
  const [saveForm, setSaveForm] = useState({
    name: chainToSave?.name || "",
    description: chainToSave?.description || "",
    category: "custom",
    icon: "FileText" as keyof typeof templateIcons,
    isShared: false,
  });

  const { data: customTemplates = [], isLoading } = useCustomTemplates();
  const createTemplate = useCreateCustomTemplate();
  const deleteTemplate = useDeleteCustomTemplate();

  const categories = [...new Set(taskChainTemplates.map((t) => t.category))];
  const customCategories = [...new Set(customTemplates.map((t) => t.category))];
  const allCategories = [...new Set([...categories, ...customCategories])];

  // Convert custom templates to TaskChainTemplate format
  const formattedCustomTemplates: TaskChainTemplate[] = customTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description || "",
    category: t.category,
    icon: (t.icon as keyof typeof templateIcons) || "FileText",
    executionMode: "sequential" as const,
    estimatedTime: `${t.steps.length} 步骤`,
    steps: t.steps,
    tags: [],
    isCustom: true,
    isShared: t.is_shared,
  }));

  const allTemplates = activeTab === "my" 
    ? formattedCustomTemplates 
    : [...taskChainTemplates, ...formattedCustomTemplates];

  const filteredTemplates = allTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.tags || []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === null || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Check if template has variables and show dialog
  const handleUseTemplate = (template: TaskChainTemplate) => {
    // Check for variables in template
    const hasVariables = checkTemplateHasVariables(template);
    
    if (hasVariables) {
      setVariableDialogTemplate(template);
      setShowVariableDialog(true);
      setPreviewTemplate(null);
    } else {
      onSelectTemplate(template);
      onClose?.();
    }
  };

  // Check if template contains variables
  const checkTemplateHasVariables = (template: TaskChainTemplate): boolean => {
    const variableRegex = /\{\{(\w+)\}\}|\$\{(\w+)\}/;
    
    // Check template name and description
    if (variableRegex.test(template.name) || variableRegex.test(template.description)) {
      return true;
    }
    
    // Check steps
    for (const step of template.steps) {
      if (variableRegex.test(step.name) || variableRegex.test(step.description)) {
        return true;
      }
      if (step.outputKey && variableRegex.test(step.outputKey)) {
        return true;
      }
      if (step.inputMapping) {
        for (const value of Object.values(step.inputMapping)) {
          if (variableRegex.test(value)) {
            return true;
          }
        }
      }
      // Check if step has defined variables
      if (step.variables && step.variables.length > 0) {
        return true;
      }
    }
    
    return false;
  };

  // Handle variable dialog confirm
  const handleVariableConfirm = (processedTemplate: TaskChainTemplate) => {
    onSelectTemplate(processedTemplate);
    setShowVariableDialog(false);
    setVariableDialogTemplate(null);
    onClose?.();
  };

  const handleSaveAsTemplate = async () => {
    if (!chainToSave) return;

    const steps = chainToSave.steps?.map((step) => ({
      name: step.name,
      description: step.description || "",
      taskType: step.task_type,
      inputMapping: (step.input_mapping as Record<string, string>) || {},
      outputKey: step.output_key || "",
      parallelGroup: step.parallel_group || 0,
    })) || [];

    await createTemplate.mutateAsync({
      name: saveForm.name,
      description: saveForm.description,
      category: saveForm.category,
      icon: saveForm.icon,
      steps,
      isShared: saveForm.isShared,
    });

    setShowSaveDialog(false);
    onSaveComplete?.();
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    await deleteTemplate.mutateAsync(deleteTemplateId);
    setDeleteTemplateId(null);
  };

  // Export a single template
  const handleExportTemplate = (template: TaskChainTemplate) => {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        executionMode: template.executionMode,
        steps: template.steps,
        tags: template.tags || [],
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${template.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("模板已导出");
  };

  // Export all custom templates
  const handleExportAllTemplates = () => {
    if (formattedCustomTemplates.length === 0) {
      toast.error("暂无自定义模板可导出");
      return;
    }

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      templates: formattedCustomTemplates.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
        icon: t.icon,
        executionMode: t.executionMode,
        steps: t.steps,
        tags: t.tags || [],
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `templates-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${formattedCustomTemplates.length} 个模板`);
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportJson(content);
      setImportError("");
      setShowImportDialog(true);
    };
    reader.onerror = () => {
      toast.error("读取文件失败");
    };
    reader.readAsText(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validate and import templates
  const handleImportTemplates = async () => {
    try {
      const data = JSON.parse(importJson);
      
      // Validate structure
      if (!data.version) {
        setImportError("无效的模板文件：缺少版本信息");
        return;
      }

      const templatesToImport: Array<{
        name: string;
        description: string;
        category: string;
        icon: string;
        steps: TemplateStep[];
      }> = [];

      // Handle single template or multiple templates
      if (data.template) {
        templatesToImport.push(data.template);
      } else if (data.templates && Array.isArray(data.templates)) {
        templatesToImport.push(...data.templates);
      } else {
        setImportError("无效的模板文件：缺少模板数据");
        return;
      }

      // Validate each template
      for (const template of templatesToImport) {
        if (!template.name || !template.steps || !Array.isArray(template.steps)) {
          setImportError(`无效的模板数据：${template.name || "未命名模板"} 缺少必要字段`);
          return;
        }
      }

      // Import templates one by one
      let successCount = 0;
      for (const template of templatesToImport) {
        try {
          await createTemplate.mutateAsync({
            name: template.name,
            description: template.description || "",
            category: template.category || "custom",
            icon: template.icon || "FileText",
            steps: template.steps,
            isShared: false,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to import template ${template.name}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`成功导入 ${successCount} 个模板`);
        setShowImportDialog(false);
        setImportJson("");
        setImportError("");
      } else {
        setImportError("导入失败，请检查模板格式");
      }
    } catch (err) {
      setImportError("JSON 格式错误，请检查文件内容");
    }
  };

  // Copy template to clipboard
  const handleCopyTemplate = (template: TaskChainTemplate) => {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        executionMode: template.executionMode,
        steps: template.steps,
        tags: template.tags || [],
      },
    };

    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success("模板已复制到剪贴板");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">任务链模板</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              导入
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportAllTemplates}>
                  <FileDown className="h-4 w-4 mr-2" />
                  导出全部自定义模板
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              全部模板
            </TabsTrigger>
            <TabsTrigger value="my" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              我的模板
              {formattedCustomTemplates.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {formattedCustomTemplates.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索模板..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            全部
          </Badge>
          {allCategories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                selectedCategory !== category && categoryColors[category]
              )}
              onClick={() => setSelectedCategory(category)}
            >
              {categoryLabels[category] || category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <ScrollArea className="flex-1 p-4">
        {isLoading && activeTab === "my" ? (
          <div className="text-center py-12 text-muted-foreground">
            加载中...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {activeTab === "my" ? (
              <>
                <p>暂无自定义模板</p>
                <p className="text-xs mt-1">在任务链面板中保存任务链为模板</p>
              </>
            ) : (
              <>
                <p>未找到匹配的模板</p>
                <p className="text-xs mt-1">尝试调整搜索条件</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const Icon = templateIcons[template.icon] || FileText;
              return (
                <Card
                  key={template.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer group relative"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportTemplate(template)}>
                          <Download className="h-4 w-4 mr-2" />
                          导出模板
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyTemplate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          复制到剪贴板
                        </DropdownMenuItem>
                        {template.isCustom && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                const customTemplate = customTemplates.find(t => t.id === template.id);
                                if (customTemplate) {
                                  setVersionHistoryTemplate(customTemplate);
                                  setShowVersionHistory(true);
                                }
                              }}
                            >
                              <History className="h-4 w-4 mr-2" />
                              版本历史
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTemplateId(template.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除模板
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          categoryColors[template.category] || "bg-muted"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {checkTemplateHasVariables(template) && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                            <Variable className="h-3 w-3 mr-1" />
                            变量
                          </Badge>
                        )}
                        {template.isCustom && (
                          <Badge variant="outline" className="text-[10px]">
                            <User className="h-3 w-3 mr-1" />
                            我的
                          </Badge>
                        )}
                        {template.isShared && (
                          <Badge variant="outline" className="text-[10px]">
                            <Share2 className="h-3 w-3 mr-1" />
                            共享
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px]">
                          {template.executionMode === "sequential" && (
                            <ArrowRight className="h-3 w-3 mr-1" />
                          )}
                          {template.executionMode === "parallel" && (
                            <Layers className="h-3 w-3 mr-1" />
                          )}
                          {template.executionMode === "mixed" && (
                            <GitBranch className="h-3 w-3 mr-1" />
                          )}
                          {template.steps.length} 步骤
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-sm mt-2">{template.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {template.estimatedTime}
                      </span>
                      <Button
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(template);
                        }}
                      >
                        使用模板
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          {previewTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      categoryColors[previewTemplate.category] || "bg-muted"
                    )}
                  >
                    {(() => {
                      const Icon = templateIcons[previewTemplate.icon] || FileText;
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="flex items-center gap-2 flex-wrap">
                      {previewTemplate.name}
                      {checkTemplateHasVariables(previewTemplate) && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                          <Variable className="h-3 w-3 mr-1" />
                          包含变量
                        </Badge>
                      )}
                      {previewTemplate.isCustom && (
                        <Badge variant="outline" className="text-[10px]">
                          我的模板
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription>{previewTemplate.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <Badge variant="secondary">
                    {previewTemplate.executionMode === "sequential" && "串行执行"}
                    {previewTemplate.executionMode === "parallel" && "并行执行"}
                    {previewTemplate.executionMode === "mixed" && "混合模式"}
                  </Badge>
                  <span className="text-muted-foreground">{previewTemplate.estimatedTime}</span>
                  <span className="text-muted-foreground">
                    {previewTemplate.steps.length} 个步骤
                  </span>
                </div>

                {checkTemplateHasVariables(previewTemplate) && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <Variable className="h-4 w-4" />
                      <span className="font-medium">此模板包含可自定义变量</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      使用模板时将提示您填写变量值，变量以 {"{{"}变量名{"}}"} 格式标记
                    </p>
                  </div>
                )}

                {previewTemplate.tags && previewTemplate.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {previewTemplate.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-sm">执行步骤</h4>
                  <div className="space-y-3">
                    {previewTemplate.steps.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{step.name}</span>
                            {previewTemplate.executionMode === "mixed" &&
                              step.parallelGroup !== undefined && (
                                <Badge variant="outline" className="text-[10px]">
                                  组 {step.parallelGroup}
                                </Badge>
                              )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {step.taskType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  取消
                </Button>
                <Button onClick={() => handleUseTemplate(previewTemplate)}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  使用此模板
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存为模板</DialogTitle>
            <DialogDescription>
              将当前任务链保存为可复用的模板
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>模板名称</Label>
              <Input
                value={saveForm.name}
                onChange={(e) => setSaveForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="输入模板名称"
              />
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={saveForm.description}
                onChange={(e) => setSaveForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="描述这个模板的用途"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={saveForm.category}
                onValueChange={(v) => setSaveForm((prev) => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">自定义</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>图标</Label>
              <Select
                value={saveForm.icon}
                onValueChange={(v) => setSaveForm((prev) => ({ ...prev, icon: v as keyof typeof templateIcons }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(templateIcons).map((iconName) => {
                    const Icon = templateIcons[iconName as keyof typeof templateIcons];
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {iconName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>公开共享</Label>
                <p className="text-xs text-muted-foreground">
                  其他用户也可以使用此模板
                </p>
              </div>
              <Switch
                checked={saveForm.isShared}
                onCheckedChange={(v) => setSaveForm((prev) => ({ ...prev, isShared: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSaveAsTemplate}
              disabled={!saveForm.name || createTemplate.isPending}
            >
              {createTemplate.isPending ? "保存中..." : "保存模板"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个模板吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              导入模板
            </DialogTitle>
            <DialogDescription>
              粘贴或编辑 JSON 格式的模板数据，支持导入单个或多个模板
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>模板数据 (JSON)</Label>
              <Textarea
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  setImportError("");
                }}
                placeholder={`{
  "version": "1.0",
  "template": {
    "name": "模板名称",
    "description": "模板描述",
    "category": "custom",
    "icon": "FileText",
    "steps": [
      {
        "name": "步骤1",
        "description": "步骤描述",
        "taskType": "general",
        "outputKey": "step_0"
      }
    ]
  }
}`}
                rows={12}
                className="font-mono text-xs"
              />
            </div>

            {importError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {importError}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">支持的格式：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>单个模板：包含 "template" 字段</li>
                <li>多个模板：包含 "templates" 数组</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleImportTemplates}
              disabled={!importJson || createTemplate.isPending}
            >
              {createTemplate.isPending ? "导入中..." : "导入模板"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Variable Dialog */}
      <TemplateVariableDialog
        open={showVariableDialog}
        onOpenChange={setShowVariableDialog}
        template={variableDialogTemplate}
        onConfirm={handleVariableConfirm}
      />

      {/* Template Version History */}
      <TemplateVersionHistory
        template={versionHistoryTemplate}
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
      />
    </div>
  );
}

export default TaskChainTemplates;
