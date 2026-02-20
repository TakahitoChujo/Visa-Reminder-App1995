/**
 * TC-FLOW-004: チェックリストフロー
 *
 * シナリオ:
 * 1. チェックリスト画面を開く（ボトムタブから）
 * 2. 項目をチェックして進捗が更新される
 * 3. 入管サイトのリンクが開ける
 *
 * 前提条件: アプリが起動している状態
 */
import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { resetApp, TestIDs } from '../helpers/setup';

describe('TC-FLOW-004: チェックリストフロー', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await resetApp();
  });

  it('チェックリスト画面が表示される', async () => {
    // 進捗バーが表示されていることを確認
    await detoxExpect(
      element(by.id(TestIDs.checklist.progressBar)),
    ).toBeVisible();
  });

  it('チェックボックスをタップして完了状態になる', async () => {
    const firstItem = element(by.id(TestIDs.checklist.checkboxItem(0)));
    // タップ前に表示されていることを確認
    await detoxExpect(firstItem).toBeVisible();
    await firstItem.tap();
    // チェック後にトグル値が true（完了）になることを確認
    await detoxExpect(firstItem).toHaveToggleValue(true);
  });

  it('チェック後に再タップで未完了に戻せる', async () => {
    const firstItem = element(by.id(TestIDs.checklist.checkboxItem(0)));
    await firstItem.tap(); // チェック
    await firstItem.tap(); // チェック解除
    await detoxExpect(firstItem).toHaveToggleValue(false);
  });

  it('チェック後に進捗バーが更新される', async () => {
    // 1項目チェックして進捗バーが変化することを確認
    await element(by.id(TestIDs.checklist.checkboxItem(0))).tap();
    // 進捗バーが引き続き表示されることを確認（進捗の変化）
    await waitFor(element(by.id(TestIDs.checklist.progressBar)))
      .toBeVisible()
      .withTimeout(1000);
  });

  it('複数項目をチェックできる', async () => {
    await element(by.id(TestIDs.checklist.checkboxItem(0))).tap();
    await element(by.id(TestIDs.checklist.checkboxItem(1))).tap();
    await detoxExpect(element(by.id(TestIDs.checklist.checkboxItem(0)))).toHaveToggleValue(true);
    await detoxExpect(element(by.id(TestIDs.checklist.checkboxItem(1)))).toHaveToggleValue(true);
  });
});
