/**
 * TC-FLOW-001: 初回登録フロー
 *
 * シナリオ:
 * 1. アプリ起動時に空状態のホーム画面が表示される
 * 2. 「+」ボタンをタップして登録画面に遷移
 * 3. 在留資格タイプを選択（技術・人文知識・国際業務）
 * 4. 有効期限を設定（1年後）
 * 5. メモを入力
 * 6. 保存して、ホーム画面にカードが表示されることを確認
 *
 * 前提条件: アプリデータが空の状態（新規インストール相当）
 * 期待結果: 登録フロー完了後にカードがホーム画面に表示される
 */
import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { resetApp, TestIDs } from '../helpers/setup';

describe('TC-FLOW-001: 初回登録フロー', () => {
  beforeAll(async () => {
    // 新しいインスタンスで起動（クリーンな状態）
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await resetApp();
  });

  it('アプリ起動時にホーム画面が表示される', async () => {
    // 空状態メッセージが表示されることを確認
    await detoxExpect(element(by.id(TestIDs.home.emptyState))).toBeVisible();
  });

  it('追加ボタンで登録画面に遷移できる', async () => {
    await element(by.id(TestIDs.home.addButton)).tap();
    // 登録画面の保存ボタンが表示されることを確認
    await detoxExpect(element(by.id(TestIDs.register.saveButton))).toBeVisible();
  });

  it('在留資格タイプを選択できる', async () => {
    await element(by.id(TestIDs.home.addButton)).tap();
    // ドロップダウンを開いて資格タイプを選択
    await element(by.id(TestIDs.register.residenceTypeSelector)).tap();
    await element(by.text('技術・人文知識・国際業務')).tap();
    // 選択されたテキストが表示されることを確認
    await detoxExpect(element(by.text('技術・人文知識・国際業務'))).toBeVisible();
  });

  it('有効期限を設定してカードを登録できる', async () => {
    await element(by.id(TestIDs.home.addButton)).tap();

    // 在留資格選択
    await element(by.id(TestIDs.register.residenceTypeSelector)).tap();
    await element(by.text('技術・人文知識・国際業務')).tap();

    // 有効期限設定（日付ピッカーをタップ）
    await element(by.id(TestIDs.register.expiryDatePicker)).tap();

    // メモ入力
    await element(by.id(TestIDs.register.memoInput)).typeText('テストメモ');

    // 保存
    await element(by.id(TestIDs.register.saveButton)).tap();

    // ホーム画面に戻り、カードリストが表示されることを確認
    await waitFor(element(by.id(TestIDs.home.cardList)))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('キャンセルでホーム画面に戻れる', async () => {
    await element(by.id(TestIDs.home.addButton)).tap();
    await element(by.id(TestIDs.register.cancelButton)).tap();
    // 空状態のホーム画面に戻ることを確認
    await detoxExpect(element(by.id(TestIDs.home.emptyState))).toBeVisible();
  });
});
