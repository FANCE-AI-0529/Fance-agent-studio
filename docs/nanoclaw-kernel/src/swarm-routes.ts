// NanoClaw Kernel — Swarm 批量编排路由
// 新增 /swarm/* 端点用于 Agent Swarm 多容器管理

import { Router } from 'express';
import { spawn } from 'child_process';

const router = Router();

// 活跃 Swarm 会话存储 (进程内缓存)
const activeSwarms = new Map<string, {
  id: string;
  name: string;
  containerMap: Record<string, string>; // memberId → containerId
  createdAt: Date;
}>();

// ─── 1. 批量创建 Swarm 容器组 ───
router.post('/swarm/create', async (req, res) => {
  const { definition } = req.body;

  if (!definition?.id || !definition?.members || !Array.isArray(definition.members)) {
    return res.status(400).json({ error: 'Invalid swarm definition: id and members[] required' });
  }

  const swarmId = definition.id;
  const containerMap: Record<string, string> = {};
  const errors: string[] = [];

  // 为每个 member 创建独立容器
  const createPromises = definition.members.map((member: { id: string; name: string; role: string }) => {
    return new Promise<void>((resolve) => {
      const containerName = `swarm-${swarmId.substring(0, 8)}-${member.id.substring(0, 8)}`;
      const image = definition.containerConfig?.image || 'ubuntu:22.04';
      const memory = definition.containerConfig?.memory || '256m';

      const args = [
        'run', '-d',
        '--name', containerName,
        '--memory', memory,
        '--label', `swarm=${swarmId}`,
        '--label', `member=${member.id}`,
        '--label', `role=${member.role}`,
        image, 'tail', '-f', '/dev/null',
      ];

      const child = spawn('docker', args);
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => { out += d.toString(); });
      child.stderr.on('data', (d) => { err += d.toString(); });
      child.on('close', (code) => {
        if (code === 0) {
          containerMap[member.id] = out.trim().substring(0, 12);
        } else {
          errors.push(`Failed to create container for member ${member.name}: ${err}`);
        }
        resolve();
      });
    });
  });

  await Promise.all(createPromises);

  if (Object.keys(containerMap).length === 0) {
    return res.status(500).json({ error: 'Failed to create any containers', details: errors });
  }

  // 缓存 Swarm 会话
  activeSwarms.set(swarmId, {
    id: swarmId,
    name: definition.name || swarmId,
    containerMap,
    createdAt: new Date(),
  });

  res.json({
    swarmId,
    containerMap,
    totalCreated: Object.keys(containerMap).length,
    totalRequested: definition.members.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// ─── 2. 向指定成员容器分派命令 ───
router.post('/swarm/dispatch', (req, res) => {
  const { swarmId, memberId, command } = req.body;

  if (!swarmId || !memberId || !command) {
    return res.status(400).json({ error: 'Missing swarmId, memberId, or command' });
  }

  const swarm = activeSwarms.get(swarmId);
  if (!swarm) {
    return res.status(404).json({ error: `Swarm ${swarmId} not found` });
  }

  const containerId = swarm.containerMap[memberId];
  if (!containerId) {
    return res.status(404).json({ error: `Member ${memberId} not found in swarm` });
  }

  const child = spawn('docker', ['exec', containerId, 'bash', '-c', command]);
  let stdout = '';
  let stderr = '';
  const start = Date.now();

  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });
  child.on('close', (code) => {
    res.json({
      swarmId,
      memberId,
      containerId,
      stdout,
      stderr,
      exitCode: code ?? 0,
      durationMs: Date.now() - start,
    });
  });
});

// ─── 3. 查询 Swarm 聚合状态 ───
router.get('/swarm/status', async (req, res) => {
  const swarmId = req.query.swarmId as string;

  if (!swarmId) {
    // 列出所有活跃 Swarm
    const swarms = Array.from(activeSwarms.values()).map((s) => ({
      id: s.id,
      name: s.name,
      memberCount: Object.keys(s.containerMap).length,
      createdAt: s.createdAt,
    }));
    return res.json({ swarms });
  }

  const swarm = activeSwarms.get(swarmId);
  if (!swarm) {
    return res.status(404).json({ error: `Swarm ${swarmId} not found` });
  }

  // 逐个检查容器状态
  const memberStatuses: Record<string, string> = {};
  const statusPromises = Object.entries(swarm.containerMap).map(([memberId, containerId]) => {
    return new Promise<void>((resolve) => {
      const child = spawn('docker', ['inspect', '--format', '{{.State.Status}}', containerId]);
      let out = '';
      child.stdout.on('data', (d) => { out += d.toString(); });
      child.on('close', (code) => {
        memberStatuses[memberId] = code === 0 ? out.trim() : 'not_found';
        resolve();
      });
    });
  });

  await Promise.all(statusPromises);

  res.json({
    swarmId,
    name: swarm.name,
    memberStatuses,
    createdAt: swarm.createdAt,
  });
});

// ─── 4. 销毁 Swarm (清理所有容器) ───
router.delete('/swarm/:swarmId', async (req, res) => {
  const { swarmId } = req.params;
  const swarm = activeSwarms.get(swarmId);

  if (!swarm) {
    return res.status(404).json({ error: `Swarm ${swarmId} not found` });
  }

  const results: Record<string, boolean> = {};

  const destroyPromises = Object.entries(swarm.containerMap).map(([memberId, containerId]) => {
    return new Promise<void>((resolve) => {
      const child = spawn('docker', ['rm', '-f', containerId]);
      child.on('close', (code) => {
        results[memberId] = code === 0;
        resolve();
      });
    });
  });

  await Promise.all(destroyPromises);
  activeSwarms.delete(swarmId);

  res.json({ swarmId, destroyed: results });
});

export default router;
