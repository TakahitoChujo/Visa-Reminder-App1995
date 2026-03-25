/**
 * ユーザー設定ストア - Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserStore {
  // State
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  // Actions
  loadUserSettings: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const ONBOARDING_KEY = '@onboarding_completed';

export const useUserStore = create<UserStore>((set) => ({
  // 初期状態
  isLoading: false,
  hasCompletedOnboarding: false,

  // ストレージからユーザー設定を読み込み
  loadUserSettings: async () => {
    set({ isLoading: true });

    try {
      const onboardingData = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({ hasCompletedOnboarding: onboardingData === 'true' });
    } catch (error) {
      console.error('Failed to load user settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // オンボーディング完了を記録
  completeOnboarding: async () => {
    set({ hasCompletedOnboarding: true });
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  },
}));
