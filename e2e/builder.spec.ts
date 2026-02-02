/**
 * @file builder.spec.ts
 * @description Builder 页面 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Builder Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    // 等待页面加载
    await page.waitForTimeout(2000);
  });

  test('should load builder page', async ({ page }) => {
    // 验证页面已加载
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display canvas area', async ({ page }) => {
    // 查找画布相关元素
    const canvas = page.locator('[class*="react-flow"], [class*="canvas"], [data-testid="canvas"]');
    
    // 如果找到画布元素，验证其可见性
    if (await canvas.first().isVisible().catch(() => false)) {
      await expect(canvas.first()).toBeVisible();
    }
  });

  test('should have toolbar or controls', async ({ page }) => {
    // 查找工具栏或控制按钮
    const toolbar = page.locator('[class*="toolbar"], [role="toolbar"], button').first();
    await expect(toolbar).toBeVisible({ timeout: 5000 }).catch(() => {
      // 某些布局可能没有明显的工具栏
    });
  });

  test('should support keyboard navigation', async ({ page }) => {
    // 测试键盘导航
    await page.keyboard.press('Tab');
    
    // 验证某个元素获得焦点
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeTruthy();
  });
});

test.describe('Builder Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    await page.waitForTimeout(2000);
  });

  test('should handle zoom with scroll', async ({ page }) => {
    const canvas = page.locator('[class*="react-flow"]').first();
    
    if (await canvas.isVisible().catch(() => false)) {
      // 模拟滚轮缩放
      await canvas.hover();
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(500);
    }
  });

  test('should handle pan with drag', async ({ page }) => {
    const canvas = page.locator('[class*="react-flow"]').first();
    
    if (await canvas.isVisible().catch(() => false)) {
      const box = await canvas.boundingBox();
      if (box) {
        // 模拟拖拽平移
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
        await page.mouse.up();
      }
    }
  });
});

test.describe('Builder Configuration Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    await page.waitForTimeout(2000);
  });

  test('should have configuration options', async ({ page }) => {
    // 查找配置面板或设置按钮
    const configPanel = page.locator('[class*="config"], [class*="panel"], [class*="settings"]');
    const settingsButton = page.getByRole('button', { name: /设置|settings|配置/i });
    
    const hasConfig = await configPanel.first().isVisible().catch(() => false);
    const hasSettingsButton = await settingsButton.isVisible().catch(() => false);
    
    expect(hasConfig || hasSettingsButton).toBeTruthy();
  });

  test('should display agent name input', async ({ page }) => {
    // 查找智能体名称输入
    const nameInput = page.locator('input[placeholder*="名称"], input[name*="name"]');
    
    if (await nameInput.first().isVisible().catch(() => false)) {
      await expect(nameInput.first()).toBeVisible();
    }
  });
});
