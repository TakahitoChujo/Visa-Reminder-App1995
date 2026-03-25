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
    isLoading: false,
    hasCompletedOnboarding: false,
  });
}

describe('useUserStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ===== loadUserSettings() =====

  describe('loadUserSettings()', () => {
    it('TC-US-001: オンボーディング完了済みの場合 hasCompletedOnboarding が true になる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('true');

      await useUserStore.getState().loadUserSettings();

      expect(useUserStore.getState().hasCompletedOnboarding).toBe(true);
    });

    it('TC-US-002: オンボーディング未完了の場合 hasCompletedOnboarding が false になる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useUserStore.getState().loadUserSettings();

      expect(useUserStore.getState().hasCompletedOnboarding).toBe(false);
    });

    it('TC-US-003: AsyncStorage エラー時も正常に動作する', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await useUserStore.getState().loadUserSettings();

      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('TC-US-004: 読み込み完了後に isLoading が false になる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useUserStore.getState().loadUserSettings();

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // ===== completeOnboarding() =====

  describe('completeOnboarding()', () => {
    it('TC-US-OB-001: completeOnboarding() 呼び出し後 hasCompletedOnboarding が true になる', async () => {
      expect(useUserStore.getState().hasCompletedOnboarding).toBe(false);

      await useUserStore.getState().completeOnboarding();

      expect(useUserStore.getState().hasCompletedOnboarding).toBe(true);
    });

    it('TC-US-OB-002: AsyncStorage に "@onboarding_completed" キーで "true" が保存される', async () => {
      await useUserStore.getState().completeOnboarding();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@onboarding_completed', 'true');
    });

    it('TC-US-OB-003: AsyncStorage エラー時も hasCompletedOnboarding は true のまま', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await useUserStore.getState().completeOnboarding();

      expect(useUserStore.getState().hasCompletedOnboarding).toBe(true);
    });

    it('TC-US-OB-004: 初期状態では hasCompletedOnboarding は false', () => {
      expect(useUserStore.getState().hasCompletedOnboarding).toBe(false);
    });

    it('TC-US-OB-005: completeOnboarding() を複数回呼んでも hasCompletedOnboarding は true のまま', async () => {
      await useUserStore.getState().completeOnboarding();
      await useUserStore.getState().completeOnboarding();

      expect(useUserStore.getState().hasCompletedOnboarding).toBe(true);
    });
  });
});
