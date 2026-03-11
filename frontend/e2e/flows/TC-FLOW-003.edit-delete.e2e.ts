/**
 * TC-FLOW-003: 編集・削除フロー
 *
 * シナリオ:
 * 1. 既存カードをタップして編集画面に遷移
 * 2. カード情報を編集して保存
 * 3. カードを削除して確認ダイアログを経て完了
 *
 * 前提条件: カードが1枚登録済みの状態（beforeAllで登録）
 */
import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { resetApp, TestIDs } from '../helpers/setup';

describe('TC-FLOW-003: 編集・削除フロー', () => {
  beforeAll(async () => {
    // アプリを起動してカードを1枚登録した状態にする
    await device.launchApp({ newInstance: true });
    await element(by.id(TestIDs.home.addButton)).tap();
    await element(by.id(TestIDs.register.residenceTypeSelector)).tap();
    await element(by.text('技術・人文知識・国際業務')).tap();
    await element(by.id(TestIDs.register.saveButton)).tap();
    await waitFor(element(by.id(TestIDs.home.cardList)))
      .toBeVisible()
      .withTimeout(3000);
  });

  beforeEach(async () => {
    await resetApp();
  });

  it('カードをタップして編集画面に遷移できる', async () => {
    // カードリストの最初のアイテムをタップ
    await element(by.id(TestIDs.home.cardList)).atIndex(0).tap();
    // 編集画面の保存ボタンが表示されることを確認
    await detoxExpect(element(by.id(TestIDs.edit.saveButton))).toBeVisible();
  });

  it('メモを編集して保存できる', async () => {
    await element(by.id(TestIDs.home.cardList)).atIndex(0).tap();
    // 既存のメモをクリアして新しいテキストを入力
    await element(by.id(TestIDs.edit.memoInput)).clearText();
    await element(by.id(TestIDs.edit.memoInput)).typeText('更新されたメモ');
    await element(by.id(TestIDs.edit.saveButton)).tap();
    // ホーム画面に戻ることを確認
    await waitFor(element(by.id(TestIDs.home.cardList)))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('在留資格タイプを変更できる', async () => {
    await element(by.id(TestIDs.home.cardList)).atIndex(0).tap();
    // 在留資格タイプを変更
    await element(by.id(TestIDs.edit.residenceTypeSelector)).tap();
    await element(by.text('留学')).tap();
    await element(by.id(TestIDs.edit.saveButton)).tap();
    await waitFor(element(by.id(TestIDs.home.cardList)))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('削除ボタンで確認ダイアログが表示される', async () => {
    await element(by.id(TestIDs.home.cardList)).atIndex(0).tap();
    await element(by.id(TestIDs.edit.deleteButton)).tap();
    // 削除確認ボタンが表示されることを確認
    await detoxExpect(
      element(by.id(TestIDs.edit.confirmDeleteButton)),
    ).toBeVisible();
  });

  it('確認後にカードが削除され空状態になる', async () => {
    await element(by.id(TestIDs.home.cardList)).atIndex(0).tap();
    await element(by.id(TestIDs.edit.deleteButton)).tap();
    // 確認ダイアログで削除を承認
    await element(by.id(TestIDs.edit.confirmDeleteButton)).tap();
    // カード削除後、空状態に戻ることを確認
    await waitFor(element(by.id(TestIDs.home.emptyState)))
      .toBeVisible()
      .withTimeout(3000);
  });
});
