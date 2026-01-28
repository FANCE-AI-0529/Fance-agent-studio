/**
 * @file useGitHubContent.ts
 * @description GitHub 内容获取 Hook - 从 awesome-llm-apps 仓库获取文件内容
 */

import { useQuery } from "@tanstack/react-query";
import { GITHUB_RAW_BASE } from "@/data/awesomeLLMAgents";

/**
 * 获取 GitHub 仓库中指定路径的文件内容
 * @param path 相对于仓库根目录的文件路径
 * @returns 文件内容字符串
 */
export function useGitHubContent(path: string | null) {
  return useQuery({
    queryKey: ["github-content", path],
    queryFn: async () => {
      if (!path) return null;
      
      const url = `${GITHUB_RAW_BASE}/${path}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      
      return res.text();
    },
    staleTime: 1000 * 60 * 60, // 1 小时缓存
    gcTime: 1000 * 60 * 60 * 24, // 24 小时保留
    enabled: !!path,
    retry: 2,
  });
}

/**
 * 获取智能体的 README.md 内容
 * @param githubPath 智能体在仓库中的路径
 */
export function useAgentReadme(githubPath: string | null) {
  const readmePath = githubPath ? `${githubPath}README.md` : null;
  return useGitHubContent(readmePath);
}

/**
 * 获取智能体的 requirements.txt 内容
 * @param githubPath 智能体在仓库中的路径
 */
export function useAgentRequirements(githubPath: string | null) {
  const reqPath = githubPath ? `${githubPath}requirements.txt` : null;
  return useGitHubContent(reqPath);
}

/**
 * 获取仓库目录结构（使用 GitHub API）
 * @param githubPath 目录路径
 */
export function useGitHubDirectory(githubPath: string | null) {
  return useQuery({
    queryKey: ["github-directory", githubPath],
    queryFn: async () => {
      if (!githubPath) return [];
      
      const url = `https://api.github.com/repos/Shubhamsaboo/awesome-llm-apps/contents/${githubPath}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch directory: ${res.status}`);
      }
      
      return res.json() as Promise<GitHubFileInfo[]>;
    },
    staleTime: 1000 * 60 * 60, // 1 小时缓存
    enabled: !!githubPath,
    retry: 2,
  });
}

interface GitHubFileInfo {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  download_url: string | null;
  html_url: string;
}
