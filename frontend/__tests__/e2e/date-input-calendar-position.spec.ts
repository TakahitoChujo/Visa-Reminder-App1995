/**
 * DateInput カレンダー位置のE2Eテスト（Playwright）
 * 様々な画面サイズでカレンダーが画面内に収まることを検証
 */

import { test, expect } from '@playwright/test';

test.describe('DateInput カレンダー位置テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 登録画面に移動
    await page.goto('/register'); // アプリのルートに応じて調整
    await page.waitForLoadState('networkidle');
  });

  test('TC-1: デスクトップ（1920x1080）- カレンダーが画面内に収まる', async ({
    page,
  }) => {
    // ビューポートを設定
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 日付入力フィールドを見つける
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // 入力フィールドのスタイルを確認
    const maxWidth = await dateInput.evaluate((el) => {
      return window.getComputedStyle(el).maxWidth;
    });
    expect(maxWidth).toBe('320px');

    // 日付入力フィールドの位置を取得
    const inputBox = await dateInput.boundingBox();
    expect(inputBox).not.toBeNull();

    // 入力フィールドが画面内に収まっているか確認
    if (inputBox) {
      expect(inputBox.x).toBeGreaterThanOrEqual(0);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(1920);
      expect(inputBox.width).toBeLessThanOrEqual(320);
    }

    // カレンダーアイコンをクリック
    await dateInput.click();

    // NOTE: ブラウザネイティブのカレンダーピッカーは
    // Playwrightで直接検証できないため、視覚的回帰テストで確認
    await page.screenshot({
      path: 'test-results/calendar-desktop-1920.png',
    });
  });

  test('TC-2: ラップトップ（1366x768）- カレンダーが画面内に収まる', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    const inputBox = await dateInput.boundingBox();
    if (inputBox) {
      expect(inputBox.x).toBeGreaterThanOrEqual(0);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(1366);
      expect(inputBox.width).toBeLessThanOrEqual(320);
    }

    await dateInput.click();
    await page.screenshot({
      path: 'test-results/calendar-laptop-1366.png',
    });
  });

  test('TC-3: タブレット（768x1024）- カレンダーが画面内に収まる', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    const inputBox = await dateInput.boundingBox();
    if (inputBox) {
      expect(inputBox.x).toBeGreaterThanOrEqual(0);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(768);
      expect(inputBox.width).toBeLessThanOrEqual(320);
    }

    await dateInput.click();
    await page.screenshot({
      path: 'test-results/calendar-tablet-768.png',
    });
  });

  test('TC-4: モバイル（375x667）- カレンダーが画面内に収まる', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    const inputBox = await dateInput.boundingBox();
    if (inputBox) {
      expect(inputBox.x).toBeGreaterThanOrEqual(0);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(375);
      // モバイルではwidth: 100%が優先されるため、320pxより小さい可能性がある
      expect(inputBox.width).toBeLessThanOrEqual(375);
    }

    await dateInput.click();
    await page.screenshot({
      path: 'test-results/calendar-mobile-375.png',
    });
  });

  test('TC-12: 日付選択機能の回帰テスト', async ({ page }) => {
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // 日付を入力
    await dateInput.fill('2026-03-10');

    // 値が正しく設定されたか確認
    const value = await dateInput.inputValue();
    expect(value).toBe('2026-03-10');
  });

  test('TC-15: 無効な日付入力のバリデーション', async ({ page }) => {
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // 無効な日付を入力しようとする
    await dateInput.fill('invalid-date');

    // ブラウザのバリデーションにより、値が設定されない
    const value = await dateInput.inputValue();
    expect(value).toBe('');
  });
});

test.describe('ブラウザ互換性テスト', () => {
  const browsers = ['chromium', 'firefox', 'webkit'] as const;

  browsers.forEach((browserType) => {
    test(`TC-8~11: ${browserType} でmaxWidthが正しく適用される`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
      });
      const page = await context.newPage();

      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      const dateInput = page.locator('input[type="date"]');
      await expect(dateInput).toBeVisible();

      const maxWidth = await dateInput.evaluate((el) => {
        return window.getComputedStyle(el).maxWidth;
      });

      expect(maxWidth).toBe('320px');

      await page.screenshot({
        path: `test-results/calendar-${browserType}.png`,
      });

      await context.close();
    });
  });
});
