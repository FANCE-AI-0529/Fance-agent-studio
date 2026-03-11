// src/api-server.ts — NanoClaw Kernel API 适配器入口
// 此文件属于独立部署的 NanoClaw Kernel 项目，不在 FANCE Studio (Shell) 中运行

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
// import { applySkill } from './apply.js'; // 引用 NanoClaw 原生技能引擎
import path from 'path';
import fs from 'fs';
import swarmRoutes from './swarm-routes.js';
import process from "node:process";

const app = express();
app.use(cors());
app.use(express.json());

// ─── 鉴权中间件 ───
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization;
  const expectedToken = process.env.KERNEL_AUTH_TOKEN || 'YOUR_SECRET_KERNEL_TOKEN';
  if (token !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized Kernel Access' });
  }
  next();
};

app.use(authMiddleware);

// ─── Swarm 批量编排路由 ───
app.use(swarmRoutes);

// ─── 1. 健康检查 ───
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0',
    engine: 'NanoClaw API Wrapper',
    uptime: process.uptime(),
  });
});

// ─── 2. 流式终端执行 (SSE) ───
app.post('/execute/stream', (req, res) => {
  const { containerId, command } = req.body;

  if (!containerId || !command) {
    return res.status(400).json({ error: 'Missing containerId or command' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const child = spawn('docker', ['exec', containerId, 'bash', '-c', command]);

  child.stdout.on('data', (data) => {
    data.toString().split('\n').forEach((line: string) => {
      if (line) res.write(`event: stdout\ndata: ${JSON.stringify({ content: line + '\n' })}\n\n`);
    });
  });

  child.stderr.on('data', (data) => {
    data.toString().split('\n').forEach((line: string) => {
      if (line) res.write(`event: stderr\ndata: ${JSON.stringify({ content: line + '\n' })}\n\n`);
    });
  });

  child.on('close', (code) => {
    res.write(`event: exit\ndata: ${JSON.stringify({ exitCode: code ?? 0, durationMs: 0 })}\n\n`);
    res.end();
  });

  req.on('close', () => {
    child.kill();
  });
});

// ─── 3. 非流式执行 ───
app.post('/execute', (req, res) => {
  const { containerId, command, workingDir } = req.body;

  if (!containerId || !command) {
    return res.status(400).json({ error: 'Missing containerId or command' });
  }

  const args = ['exec'];
  if (workingDir) args.push('-w', workingDir);
  args.push(containerId, 'bash', '-c', command);

  const child = spawn('docker', args);
  let stdout = '';
  let stderr = '';
  const start = Date.now();

  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });
  child.on('close', (code) => {
    res.json({ stdout, stderr, exitCode: code ?? 0, durationMs: Date.now() - start });
  });
});

// ─── 4. 容器管理 ───
app.post('/containers/create', (req, res) => {
  const { image, name, memory, cpu } = req.body;
  const args = ['run', '-d', '--name', name || `nc-${Date.now()}`];
  if (memory) args.push('--memory', memory);
  if (cpu) args.push('--cpus', cpu);
  args.push(image || 'ubuntu:22.04', 'tail', '-f', '/dev/null');

  const child = spawn('docker', args);
  let out = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.on('close', (code) => {
    if (code === 0) {
      res.json({ id: out.trim().substring(0, 12), status: 'running', name: name || out.trim().substring(0, 12) });
    } else {
      res.status(500).json({ error: 'Failed to create container' });
    }
  });
});

app.delete('/containers/:id', (req, res) => {
  const child = spawn('docker', ['rm', '-f', req.params.id]);
  child.on('close', (code) => {
    res.json({ success: code === 0 });
  });
});

app.get('/containers', (_req, res) => {
  const child = spawn('docker', ['ps', '--format', '{{json .}}']);
  let out = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.on('close', () => {
    const containers = out.trim().split('\n').filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    res.json({ containers });
  });
});

app.get('/containers/:id/status', (req, res) => {
  const child = spawn('docker', ['inspect', '--format', '{{.State.Status}}', req.params.id]);
  let out = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.on('close', (code) => {
    res.json({ status: code === 0 ? out.trim() : 'not_found' });
  });
});

// ─── 5. 技能注入 ───
app.post('/skills/apply', async (req, res) => {
  const { skillName, skillContent } = req.body;
  if (!skillName || !skillContent) {
    return res.status(400).json({ error: 'Missing skillName or skillContent' });
  }

  try {
    const tempDir = path.join(process.cwd(), '.nanoclaw', 'temp_skills', skillName);
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'manifest.yaml'), skillContent);

    // const result = await applySkill(tempDir);  // 取消注释以对接真实引擎
    const result = { success: true, skillName, message: 'Skill applied (stub)' };

    fs.rmSync(tempDir, { recursive: true, force: true });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 6. 容器文件系统 ───
app.post('/files/read', (req, res) => {
  const { containerId, filePath } = req.body;
  const child = spawn('docker', ['exec', containerId, 'cat', filePath]);
  let out = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.on('close', (code) => {
    if (code === 0) res.json({ content: out });
    else res.status(404).json({ error: 'File not found' });
  });
});

app.post('/files/write', (req, res) => {
  const { containerId, filePath, content } = req.body;
  const child = spawn('docker', ['exec', '-i', containerId, 'bash', '-c', `cat > ${filePath}`]);
  child.stdin.write(content);
  child.stdin.end();
  child.on('close', (code) => {
    res.json({ success: code === 0 });
  });
});

// ─── 启动 ───
const PORT = process.env.PORT || 3100;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NanoClaw Kernel API Server is running on port ${PORT}`);
});
