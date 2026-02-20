/**
 * useUserStore ユニットテスト
 *
 * テスト対象: src/store/useUserStore.ts
 * テストフレームワーク: Jest + jest-expo
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../useUserStore';

/** ストアをデフォルト状態にリセット */
function resetStore() {
  useUserStore.setState({
    userPlan: 'free',
    premiumExpiresAt: null,
    isLoading: false,
  });
}

describe('useUserStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ===== loadUserPlan() =====

  describe('loadUserPlan()', () => {
    it('TC-US-001: AsyncStorage から正しく premium プランを読み込む', async () => {
      const stored = JSON.stringify({ userPlan: 'premium', premiumExpiresAt: '2099-12-31T00:00:00.000Z' });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(stored);

      await useUserStore.getState().loadUserPlan();

      expect(useUserStore.getState().userPlan).toBe('premium');
      expect(useUserStore.getState().premiumExpiresAt).toBe('2099-12-31T00:00:00.000Z');
    });

    it('TC-US-002: AsyncStorage から正しく free プランを読み込む', async () => {
      const stored = JSON.stringify({ userPlan: 'free', premiumExpiresAt: null });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(stored);

      await useUserStore.getState().loadUserPlan();

      expect(useUserStore.getState().userPlan).toBe('free');
      expect(useUserStore.getState().premiumExpiresAt).toBeNull();
    });

    it('TC-US-003: AsyncStorage にデータがない場合は free プランになる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useUserStore.getState().loadUserPlan();

      expect(useUserStore.getState().userPlan).toBe('free');
    });

    it('TC-US-004: AsyncStorage エラー時も free プランのまま（エラーを握りつぶす）', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await useUserStore.getState().loadUserPlan();

      expect(useUserStore.getState().userPlan).toBe('free');
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('TC-US-005: 読み込み完了後に isLoading が false になる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useUserStore.getState().loadUserPlan();

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // ===== updateUserPlan() =====

  describe('updateUserPlan()', () => {
    it('TC-US-006: free から premium プランへ更新される', async () => {
      const expiresAt = '2099-12-31T00:00:00.000Z';

      await useUserStore.getState().updateUserPlan('premium', expiresAt);

      expect(useUserStore.getState().userPlan).toBe('premium');
      expect(useUserStore.getState().premiumExpiresAt).toBe(expiresAt);
    });

    it('TC-US-007: AsyncStorage に正しい形式で保存される', async () => {
      const expiresAt = '2099-12-31T00:00:00.000Z';

      await useUserStore.getState().updateUserPlan('premium', expiresAt);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@user_plan',
        JSON.stringify({ userPlan: 'premium', premiumExpiresAt: expiresAt })
      );
    });

    it('TC-US-008: premium から free への変更が正しく動作する', async () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2099-12-31T00:00:00.000Z' });

      await useUserStore.getState().updateUserPlan('free');

      expect(useUserStore.getState().userPlan).toBe('free');
      expect(useUserStore.getState().premiumExpiresAt).toBeNull();
    });

    it('TC-US-009: expiresAt を省略した場合は premiumExpiresAt が null になる', async () => {
      await useUserStore.getState().updateUserPlan('premium');

      expect(useUserStore.getState().premiumExpiresAt).toBeNull();
    });
  });

  // ===== isPremium() =====

  describe('isPremium()', () => {
    it('TC-US-010: free プランで false を返す', () => {
      useUserStore.setState({ userPlan: 'free', premiumExpiresAt: null });

      expect(useUserStore.getState().isPremium()).toBe(false);
    });

    it('TC-US-011: premium プランかつ期限なし（無期限）で true を返す', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: null });

      expect(useUserStore.getState().isPremium()).toBe(true);
    });

    it('TC-US-012: 期限切れ premium プランで false を返す', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2020-01-01T00:00:00.000Z' });

      expect(useUserStore.getState().isPremium()).toBe(false);
    });

    it('TC-US-013: 期限内 premium プランで true を返す', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2099-12-31T00:00:00.000Z' });

      expect(useUserStore.getState().isPremium()).toBe(true);
    });

    it('TC-US-014: 過去日付（1秒前）の場合は false を返す', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: pastDate });

      expect(useUserStore.getState().isPremium()).toBe(false);
    });

    it('TC-US-015: 未来日付（1年後）の場合は true を返す', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: futureDate });

      expect(useUserStore.getState().isPremium()).toBe(true);
    });
  });

  // ===== canAddCard() =====

  describe('canAddCard()', () => {
    it('TC-US-016: free プランで 0 枚の場合は追加可能（true を返す）', () => {
      useUserStore.setState({ userPlan: 'free', premiumExpiresAt: null });

      expect(useUserStore.getState().canAddCard(0)).toBe(true);
    });

    it('TC-US-017: free プランで 1 枚の場合は追加不可（false を返す）', () => {
      useUserStore.setState({ userPlan: 'free', premiumExpiresAt: null });

      expect(useUserStore.getState().canAddCard(1)).toBe(false);
    });

    it('TC-US-018: premium プランで 1 枚でも追加可能（true を返す）', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2099-12-31T00:00:00.000Z' });

      expect(useUserStore.getState().canAddCard(1)).toBe(true);
    });

    it('TC-US-019: premium プランで 100 枚でも追加可能（true を返す）', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2099-12-31T00:00:00.000Z' });

      expect(useUserStore.getState().canAddCard(100)).toBe(true);
    });
  });

  // ===== getMaxCards() =====

  describe('getMaxCards()', () => {
    it('TC-US-020: free プランで 1 を返す', () => {
      useUserStore.setState({ userPlan: 'free', premiumExpiresAt: null });

      expect(useUserStore.getState().getMaxCards()).toBe(1);
    });

    it('TC-US-021: premium プランで Infinity を返す', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2099-12-31T00:00:00.000Z' });

      expect(useUserStore.getState().getMaxCards()).toBe(Infinity);
    });

    it('TC-US-022: 期限切れ premium プランで 1 を返す（free 扱い）', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2020-01-01T00:00:00.000Z' });

      expect(useUserStore.getState().getMaxCards()).toBe(1);
    });
  });

  // ===== getPlanLimits() =====

  describe('getPlanLimits()', () => {
    it('TC-US-023: free プランの制限が正しく返される', () => {
      useUserStore.setState({ userPlan: 'free', premiumExpiresAt: null });

      const limits = useUserStore.getState().getPlanLimits();

      expect(limits.maxCards).toBe(1);
      expect(limits.hasReminderCustomization).toBe(false);
      expect(limits.hasChecklistNotes).toBe(false);
      expect(limits.hasCloudSync).toBe(false);
    });

    it('TC-US-024: premium プランの機能が全て有効', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2099-12-31T00:00:00.000Z' });

      const limits = useUserStore.getState().getPlanLimits();

      expect(limits.maxCards).toBe(Infinity);
      expect(limits.hasReminderCustomization).toBe(true);
      expect(limits.hasChecklistNotes).toBe(true);
      expect(limits.hasCloudSync).toBe(true);
    });

    it('TC-US-025: 期限切れ premium プランで free プランの制限が適用される', () => {
      useUserStore.setState({ userPlan: 'premium', premiumExpiresAt: '2020-01-01T00:00:00.000Z' });

      const limits = useUserStore.getState().getPlanLimits();

      expect(limits.maxCards).toBe(1);
      expect(limits.hasReminderCustomization).toBe(false);
    });

    it('TC-US-026: getPlanLimits() が PlanLimits の全フィールドを持つオブジェクトを返す', () => {
      useUserStore.setState({ userPlan: 'free', premiumExpiresAt: null });

      const limits = useUserStore.getState().getPlanLimits();

      expect(limits).toHaveProperty('maxCards');
      expect(limits).toHaveProperty('hasReminderCustomization');
      expect(limits).toHaveProperty('hasChecklistNotes');
      expect(limits).toHaveProperty('hasCloudSync');
    });
  });
});
