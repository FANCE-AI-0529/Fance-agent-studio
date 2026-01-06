/**
 * Skill format normalization and validation utilities
 * Ensures AI-generated skill templates conform to the expected format
 */

import YAML from 'yaml';

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  permissions: string[];
  inputs: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
    default?: unknown;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

export interface GeneratedFiles {
  skillMd: string;
  handlerPy: string;
  configYaml: string;
}

/**
 * Normalize SKILL.md content to ensure proper frontmatter format
 * Handles common AI generation issues:
 * 1. ```yaml``` code blocks instead of frontmatter
 * 2. Missing closing ---
 * 3. Old field names (parameters/returns → inputs/outputs)
 * 4. Missing required fields
 */
export function normalizeSkillMd(content: string): string {
  if (!content) return content;
  
  let normalized = content.trim();
  
  // Case 1: Content wrapped in ```yaml``` code block
  // Pattern: ---\n```yaml\n...\n```\n# Title
  const codeBlockPattern = /^---\s*\n```(?:yaml|yml)?\s*\n([\s\S]*?)\n```\s*\n([\s\S]*)$/;
  const codeBlockMatch = normalized.match(codeBlockPattern);
  if (codeBlockMatch) {
    const yamlContent = codeBlockMatch[1].trim();
    const markdownContent = codeBlockMatch[2].trim();
    normalized = `---\n${yamlContent}\n---\n\n${markdownContent}`;
  }
  
  // Case 2: Pure ```yaml``` block without any ---
  // Pattern: ```yaml\n...\n```\n# Title
  const pureCodeBlockPattern = /^```(?:yaml|yml)?\s*\n([\s\S]*?)\n```\s*\n([\s\S]*)$/;
  const pureCodeBlockMatch = normalized.match(pureCodeBlockPattern);
  if (pureCodeBlockMatch) {
    const yamlContent = pureCodeBlockMatch[1].trim();
    const markdownContent = pureCodeBlockMatch[2].trim();
    normalized = `---\n${yamlContent}\n---\n\n${markdownContent}`;
  }
  
  // Case 3: Has opening --- but no closing ---
  // Find where YAML ends (first markdown heading or double newline after content)
  if (normalized.startsWith('---\n') && !normalized.match(/^---\n[\s\S]*?\n---/)) {
    const lines = normalized.split('\n');
    let yamlEndIndex = -1;
    
    // Skip the first --- line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // YAML section ends when we hit a markdown heading or empty line followed by content
      if (line.startsWith('#') || (line === '' && i + 1 < lines.length && lines[i + 1].startsWith('#'))) {
        yamlEndIndex = i;
        break;
      }
    }
    
    if (yamlEndIndex > 0) {
      const yamlLines = lines.slice(1, yamlEndIndex);
      const markdownLines = lines.slice(yamlEndIndex);
      normalized = `---\n${yamlLines.join('\n')}\n---\n${markdownLines.join('\n')}`;
    }
  }
  
  // Case 4: Ensure content starts with ---
  if (!normalized.startsWith('---')) {
    // Try to extract YAML-like content from the beginning
    const firstHeadingIndex = normalized.indexOf('\n#');
    if (firstHeadingIndex > 0) {
      const potentialYaml = normalized.substring(0, firstHeadingIndex).trim();
      const markdownContent = normalized.substring(firstHeadingIndex).trim();
      if (potentialYaml.includes(':')) {
        normalized = `---\n${potentialYaml}\n---\n\n${markdownContent}`;
      }
    }
  }
  
  // Now migrate old field names and ensure required fields
  normalized = migrateAndValidateFrontmatter(normalized);
  
  return normalized;
}

/**
 * Migrate old YAML fields and ensure all required fields are present
 */
function migrateAndValidateFrontmatter(content: string): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return content;
  
  const yamlContent = frontmatterMatch[1];
  const restContent = content.substring(frontmatterMatch[0].length);
  
  try {
    const parsed = YAML.parse(yamlContent) || {};
    
    // Migrate old fields
    if (parsed.parameters && !parsed.inputs) {
      parsed.inputs = Array.isArray(parsed.parameters) 
        ? parsed.parameters.map((p: any) => ({
            name: p.name || p,
            type: p.type || 'string',
            description: p.description || '',
            required: p.required ?? true
          }))
        : [];
      delete parsed.parameters;
    }
    
    if (parsed.returns && !parsed.outputs) {
      parsed.outputs = Array.isArray(parsed.returns)
        ? parsed.returns.map((r: any) => ({
            name: r.name || r,
            type: r.type || 'string',
            description: r.description || ''
          }))
        : [{
            name: 'result',
            type: typeof parsed.returns === 'string' ? parsed.returns : 'string',
            description: '处理结果'
          }];
      delete parsed.returns;
    }
    
    // Ensure required fields with defaults
    if (!parsed.name) {
      parsed.name = 'generated-skill';
    }
    if (!parsed.version) {
      parsed.version = '1.0.0';
    }
    if (!parsed.description) {
      parsed.description = '自动生成的技能';
    }
    if (!parsed.author) {
      parsed.author = 'Fance OS';
    }
    if (!parsed.permissions || !Array.isArray(parsed.permissions) || parsed.permissions.length === 0) {
      parsed.permissions = ['compute'];
    }
    if (!parsed.inputs || !Array.isArray(parsed.inputs) || parsed.inputs.length === 0) {
      parsed.inputs = [{
        name: 'input',
        type: 'string',
        description: '输入参数',
        required: true
      }];
    }
    if (!parsed.outputs || !Array.isArray(parsed.outputs) || parsed.outputs.length === 0) {
      parsed.outputs = [{
        name: 'result',
        type: 'string',
        description: '输出结果'
      }];
    }
    
    // Validate and fix inputs format
    parsed.inputs = parsed.inputs.map((input: any) => ({
      name: input.name || 'input',
      type: input.type || 'string',
      description: input.description || '',
      required: input.required ?? true,
      ...(input.default !== undefined ? { default: input.default } : {})
    }));
    
    // Validate and fix outputs format
    parsed.outputs = parsed.outputs.map((output: any) => ({
      name: output.name || 'result',
      type: output.type || 'string',
      description: output.description || ''
    }));
    
    // Rebuild YAML with proper structure
    const newYaml = YAML.stringify(parsed, { indent: 2 });
    return `---\n${newYaml}---${restContent}`;
    
  } catch (e) {
    // If YAML parsing fails, return original
    console.warn('Failed to parse/migrate frontmatter:', e);
    return content;
  }
}

/**
 * Clean code block markers from generated code
 */
export function cleanCodeContent(content: string, language: string): string {
  if (!content) return content;
  
  let cleaned = content.trim();
  
  // Remove markdown code block wrappers
  const patterns = [
    new RegExp(`^\`\`\`${language}\\s*\\n([\\s\\S]*?)\\n\`\`\`$`),
    new RegExp(`^\`\`\`\\s*\\n([\\s\\S]*?)\\n\`\`\`$`),
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = match[1].trim();
      break;
    }
  }
  
  return cleaned;
}

/**
 * Clean and normalize all generated files
 */
export function cleanGeneratedFiles(files: GeneratedFiles): GeneratedFiles {
  return {
    skillMd: normalizeSkillMd(files.skillMd),
    handlerPy: cleanCodeContent(files.handlerPy, 'python'),
    configYaml: cleanCodeContent(files.configYaml, 'yaml'),
  };
}

/**
 * Validate that SKILL.md has proper frontmatter structure
 * Returns null if valid, or error message if invalid
 */
export function validateSkillMdStructure(content: string): string | null {
  if (!content) {
    return '内容为空';
  }
  
  // Check for frontmatter delimiters
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return '缺少 YAML Frontmatter（需要 --- 包裹的元数据）';
  }
  
  // Try to parse YAML
  try {
    const parsed = YAML.parse(frontmatterMatch[1]);
    if (!parsed || typeof parsed !== 'object') {
      return 'YAML 内容无效';
    }
    
    // Check required fields
    const requiredFields = ['name', 'version', 'description', 'permissions', 'inputs', 'outputs'];
    const missingFields = requiredFields.filter(field => !parsed[field]);
    
    if (missingFields.length > 0) {
      return `缺少必填字段: ${missingFields.join(', ')}`;
    }
    
    return null; // Valid
  } catch (e) {
    return `YAML 解析错误: ${e instanceof Error ? e.message : '未知错误'}`;
  }
}

/**
 * Extract skill name from SKILL.md content
 */
export function extractSkillName(content: string): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return 'generated-skill';
  
  try {
    const parsed = YAML.parse(frontmatterMatch[1]);
    return parsed?.name || 'generated-skill';
  } catch {
    return 'generated-skill';
  }
}
