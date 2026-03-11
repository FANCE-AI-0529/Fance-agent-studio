/**
 * 自定义会话互斥管理器
 * 确保 customize session 与标准技能安装之间的隔离性
 */

import { supabase } from '../integrations/supabase/client.ts';

export interface CustomizeSession {
  name: string;
  description?: string;
  startedAt: string;
  filesChanged: string[];
}

/**
 * Client-side customize session tracker.
 * Tracks whether a container has an active customize session,
 * preventing concurrent skill installations.
 */
class CustomizeManager {
  private activeSessions = new Map<string, CustomizeSession>();

  /**
   * Check if a customize session is active for a container
   */
  isActive(containerId: string): boolean {
    return this.activeSessions.has(containerId);
  }

  /**
   * Get active session details
   */
  getSession(containerId: string): CustomizeSession | undefined {
    return this.activeSessions.get(containerId);
  }

  /**
   * Guard: throws if a customize session is active.
   * Call this before applySkill / injectCoreSkills.
   */
  assertNoActiveSession(containerId: string): void {
    const session = this.activeSessions.get(containerId);
    if (session) {
      throw new Error(
        `A customize session is active ("${session.name}", started ${session.startedAt}). ` +
        `Run commitCustomize() or abortCustomize() first.`
      );
    }
  }

  /**
   * Start a customize session — writes pending.yaml to container
   */
  async startCustomize(
    containerId: string,
    name: string,
    nanoclawEndpoint: string,
    authToken: string,
    description?: string,
  ): Promise<CustomizeSession> {
    if (this.activeSessions.has(containerId)) {
      throw new Error('A customize session is already active for this container');
    }

    const session: CustomizeSession = {
      name,
      description,
      startedAt: new Date().toISOString(),
      filesChanged: [],
    };

    // Write pending.yaml to container
    const pendingYaml = [
      `name: "${name}"`,
      description ? `description: "${description}"` : null,
      `started_at: "${session.startedAt}"`,
      `status: pending`,
    ].filter(Boolean).join('\n');

    const { error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'write_file',
        containerId,
        filePath: '.nanoclaw/custom/pending.yaml',
        content: pendingYaml,
        nanoclawEndpoint,
        authToken,
      },
    });

    if (error) throw new Error(`Failed to start customize session: ${error.message}`);
    this.activeSessions.set(containerId, session);
    return session;
  }

  /**
   * Record a file change during an active customize session
   */
  recordFileChange(containerId: string, filePath: string): void {
    const session = this.activeSessions.get(containerId);
    if (!session) throw new Error('No active customize session');
    if (!session.filesChanged.includes(filePath)) {
      session.filesChanged.push(filePath);
    }
  }

  /**
   * Commit the customize session — generates patch and updates state
   */
  async commitCustomize(
    containerId: string,
    nanoclawEndpoint: string,
    authToken: string,
  ): Promise<{ patchGenerated: boolean; filesChanged: string[] }> {
    const session = this.activeSessions.get(containerId);
    if (!session) throw new Error('No active customize session to commit');

    try {
      // Request the container kernel to generate a diff patch
      const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
        body: {
          action: 'execute',
          nanoclawEndpoint,
          authToken,
          request: {
            containerId,
            command: 'cd /workspace && diff -ruN .nanoclaw/base/ . > .nanoclaw/custom/patch.diff 2>/dev/null; echo $?',
          },
        },
      });

      // Clean up pending.yaml
      await supabase.functions.invoke('nanoclaw-gateway', {
        body: {
          action: 'delete_file',
          containerId,
          filePath: '.nanoclaw/custom/pending.yaml',
          nanoclawEndpoint,
          authToken,
        },
      }).catch(() => {});

      this.activeSessions.delete(containerId);

      return {
        patchGenerated: !error && data?.exitCode === 0,
        filesChanged: session.filesChanged,
      };
    } catch (err) {
      // Don't clear session on commit failure so user can retry
      throw err;
    }
  }

  /**
   * Abort the customize session — discard changes
   */
  async abortCustomize(
    containerId: string,
    nanoclawEndpoint: string,
    authToken: string,
  ): Promise<void> {
    // Remove pending.yaml
    await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'delete_file',
        containerId,
        filePath: '.nanoclaw/custom/pending.yaml',
        nanoclawEndpoint,
        authToken,
      },
    }).catch(() => {});

    this.activeSessions.delete(containerId);
  }

  /**
   * Sync session state from container (recover from page refresh)
   */
  async syncFromContainer(
    containerId: string,
    nanoclawEndpoint: string,
    authToken: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
        body: {
          action: 'read_file',
          containerId,
          filePath: '.nanoclaw/custom/pending.yaml',
          nanoclawEndpoint,
          authToken,
        },
      });

      if (error || !data?.content) {
        this.activeSessions.delete(containerId);
        return false;
      }

      // Parse pending.yaml content to restore session
      const content = typeof data.content === 'string' ? data.content : '';
      const nameMatch = content.match(/name:\s*"?(.+?)"?\s*$/m);
      const startedMatch = content.match(/started_at:\s*"?(.+?)"?\s*$/m);

      if (nameMatch) {
        this.activeSessions.set(containerId, {
          name: nameMatch[1],
          startedAt: startedMatch?.[1] || new Date().toISOString(),
          filesChanged: [],
        });
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}

export const customizeManager = new CustomizeManager();
