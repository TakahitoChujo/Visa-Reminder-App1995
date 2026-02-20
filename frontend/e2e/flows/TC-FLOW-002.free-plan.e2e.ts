/**
 * TC-FLOW-002: 無料プラン制限テスト
 *
 * シナリオ:
 * 1. 無料プランで1枚目のカードを登録できる
 * 2. 2枚目の追加ボタンが無効/制限される
 * 3. アップグレード誘導UIが表示される
 *
 * 根拠: useUserStore.ts の PLAN_FEATURES.free.maxCards = 1
 * 前提条件: 無料プラン（デフォルト）の状態
 */
import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { resetApp, TestIDs } from '../helpers/setup';

describe('TC-FLOW-002: 無料プラン制限', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await resetApp();
  });

  it('無料プランで1枚目のカードを登録できる', async () => {
    // 追加ボタンをタップ
    await element(by.id(TestIDs.home.addButton)).tap();
    // 在留資格を選択して保存
    await element(by.id(TestIDs.register.residenceTypeSelector)).tap();
    await element(by.text('技術・人文知識・国際業務')).tap();
    await element(by.id(TestIDs.register.saveButton)).tap();
    // カードリストが表示されることを確認（登録成功）
    await waitFor(element(by.id(TestIDs.home.cardList)))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('無料プランで2枚目の追加が制限される', async () => {
    // 1枚目登録済みの状態で追加ボタンをタップ
    await element(by.id(TestIDs.home.addButton)).tap();
    // プレミアムへのアップグレード誘導モーダルが表示されることを確認
    await detoxExpect(
      element(by.text('プレミアムプランにアップグレード')),
    ).toBeVisible();
  });

  it('無料プランの制限メッセージが表示される', async () => {
    await element(by.id(TestIDs.home.addButton)).tap();
    // 制限に関するメッセージが表示されることを確認
    await detoxExpect(
      element(by.text('無料プランでは1件まで登録できます')),
    ).toBeVisible();
  });
});
