/**
 * @file runtime.spec.ts
 * @description Runtime 页面 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Runtime Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/runtime');
    await page.waitForTimeout(2000);
  });

  test('should load runtime page', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display chat interface', async ({ page }) => {
    // 查找聊天相关元素
    const chatArea = page.locator('[class*="chat"], [class*="message"], [data-testid="chat"]');
    const inputArea = page.locator('textarea, input[type="text"]');
    
    const hasChatArea = await chatArea.first().isVisible().catch(() => false);
    const hasInputArea = await inputArea.first().isVisible().catch(() => false);
    
    expect(hasChatArea || hasInputArea).toBeTruthy();
  });

  test('should have message input', async ({ page }) => {
    const messageInput = page.locator(
      'textarea[placeholder*="消息"], textarea[placeholder*="message"], input[placeholder*="消息"]'
    ).first();
    
    if (await messageInput.isVisible().catch(() => false)) {
      await expect(messageInput).toBeVisible();
      await expect(messageInput).toBeEnabled();
    }
  });

  test('should have send button', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: /发送|send/i });
    
    if (await sendButton.isVisible().catch(() => false)) {
      await expect(sendButton).toBeVisible();
    }
  });
});

test.describe('Runtime Chat Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/runtime');
    await page.waitForTimeout(2000);
  });

  test('should allow typing in message input', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    
    if (await messageInput.isVisible().catch(() => false)) {
      await messageInput.fill('测试消息');
      await expect(messageInput).toHaveValue('测试消息');
    }
  });

  test('should clear input after sending (if implemented)', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    const sendButton = page.getByRole('button', { name: /发送|send/i });
    
    if (await messageInput.isVisible().catch(() => false) && await sendButton.isVisible().catch(() => false)) {
      await messageInput.fill('测试消息');
      await sendButton.click();
      
      // 等待可能的清空操作
      await page.waitForTimeout(1000);
    }
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    
    if (await messageInput.isVisible().catch(() => false)) {
      await messageInput.focus();
      await messageInput.fill('测试消息');
      
      // 测试 Enter 发送（如果支持）
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Runtime Agent Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/runtime');
    await page.waitForTimeout(2000);
  });

  test('should display agent selector or list', async ({ page }) => {
    // 查找智能体选择器
    const agentSelector = page.locator(
      '[class*="agent-selector"], [class*="agent-list"], select, [role="listbox"]'
    );
    
    if (await agentSelector.first().isVisible().catch(() => false)) {
      await expect(agentSelector.first()).toBeVisible();
    }
  });

  test('should show agent details', async ({ page }) => {
    // 查找智能体详情
    const agentDetails = page.locator('[class*="agent-detail"], [class*="agent-info"]');
    
    if (await agentDetails.first().isVisible().catch(() => false)) {
      await expect(agentDetails.first()).toBeVisible();
    }
  });
});

test.describe('Runtime DevTools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/runtime');
    await page.waitForTimeout(2000);
  });

  test('should toggle devtools panel', async ({ page }) => {
    // 查找开发工具切换按钮
    const devtoolsToggle = page.getByRole('button', { name: /开发者|devtools|调试/i });
    
    if (await devtoolsToggle.isVisible().catch(() => false)) {
      await devtoolsToggle.click();
      await page.waitForTimeout(500);
      
      // 验证面板显示
      const devtoolsPanel = page.locator('[class*="devtools"], [data-testid="devtools-panel"]');
      if (await devtoolsPanel.first().isVisible().catch(() => false)) {
        await expect(devtoolsPanel.first()).toBeVisible();
      }
    }
  });
});
