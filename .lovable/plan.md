

# Plan: Global Rename HIVE → FANCE

## Scope

Replace all instances of "HIVE" (as brand name) with "FANCE" across the entire project. This includes UI text, meta tags, comments, alt attributes, CLI commands in terminal demos, and i18n strings. Internal code identifiers like `archive`, `log_archive` etc. are NOT related to the brand and will not be touched.

## Files to Modify (21 files)

| # | File | Changes |
|---|------|---------|
| 1 | `index.html` | Title, meta description, og/twitter tags: HIVE → FANCE |
| 2 | `src/components/landing/GlassNavbar.tsx` | Logo alt text + brand text span |
| 3 | `src/components/landing/HeroSection.tsx` | `hive-terminal` → `fance-terminal`, `hive deploy` → `fance deploy` |
| 4 | `src/components/landing/Footer.tsx` | "HIVE" heading + "HIVE Studio" → "FANCE Studio" |
| 5 | `src/components/landing/InviteModal.tsx` | "欢迎加入 HIVE" → "欢迎加入 FANCE", "访问 HIVE 控制台" → "访问 FANCE 控制台", "登录 HIVE" → "登录 FANCE" |
| 6 | `src/components/landing/TestimonialsSection.tsx` | "HIVE 让我们..." → "FANCE 让我们...", "用 HIVE" → "用 FANCE" |
| 7 | `src/pages/Landing.tsx` | "使用 HIVE 构建" → "使用 FANCE 构建" |
| 8 | `src/pages/SharedConversation.tsx` | "HIVE" → "FANCE" |
| 9 | `src/components/layout/MainLayout.tsx` | Logo alt + brand text |
| 10 | `src/components/layout/AppSidebar.tsx` | Logo alt + sidebar brand name |
| 11 | `src/components/consumer/ConsumerHeader.tsx` | Logo alt + brand text |
| 12 | `src/components/onboarding/OnboardingProvider.tsx` | "欢迎来到 HIVE" → "欢迎来到 FANCE" |
| 13 | `src/components/settings/ThemeEditor.tsx` | "HIVE" label + "你的 HIVE 外观" |
| 14 | `src/components/settings/DataExportForm.tsx` | "HIVE 数据导出" → "FANCE 数据导出" |
| 15 | `src/components/runtime/AgentSelector.tsx` | `hive-guide` → `fance-guide`, "HIVE 助手" → "FANCE 助手", comment |
| 16 | `src/components/runtime/SystemPromptEditor.tsx` | "HIVE 平台" → "FANCE 平台" |
| 17 | `src/components/foundry/MCPSourceFilter.tsx` | "HIVE" label → "FANCE" |
| 18 | `src/components/pwa/PWAInstallPrompt.tsx` | "安装 HIVE" → "安装 FANCE", "HIVE 已添加" → "FANCE 已添加" |
| 19 | `src/contexts/LanguageContext.tsx` | All brand.name, brand.description, skill.origin.native references |
| 20 | `src/contexts/extendedTranslations.ts` | PWA strings + brand.name values |
| 21 | `src/utils/terminalStylePrompt.ts` | Comment header |

## What Will NOT Change

- `src/integrations/supabase/types.ts` (auto-generated, never edit)
- Database table/column names (e.g. `memory_archives`)
- Internal code identifiers unrelated to brand (e.g. `ArchivesSummary`, `log_archive`)
- "Powered by FANCE.AI" already says FANCE.AI, no change needed
- The `NanoClaw` kernel name stays as-is

## Naming Convention

- Brand display: **FANCE** (uppercase)
- CLI/terminal identifiers: **fance** (lowercase, e.g. `fance-terminal`, `fance deploy`)
- Studio name: **FANCE Studio**

