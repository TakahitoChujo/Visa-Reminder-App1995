/**
 * ユーザープラン管理ストア - Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserPlanType = 'free' | 'premium';

export interface PlanLimits {
  maxCards: number;
  hasReminderCustomization: boolean;
  hasChecklistNotes: boolean;
  hasCloudSync: boolean;
}

interface UserStore {
  // State
  userPlan: UserPlanType;
  premiumExpiresAt: string | null;
  isLoading: boolean;

  // Computed getters
  isPremium: () => boolean;
  canAddCard: (currentCardCount: number) => boolean;
  getMaxCards: () => number;
  getPlanLimits: () => PlanLimits;

  // Actions
  loadUserPlan: () => Promise<void>;
  updateUserPlan: (plan: UserPlanType, expiresAt?: string) => Promise<void>;
}

const STORAGE_KEY = '@user_plan';

// プラン別の機能制限定義
const PLAN_FEATURES: Record<UserPlanType, PlanLimits> = {
  free: {
    maxCards: 1,
    hasReminderCustomization: false,
    hasChecklistNotes: false,
    hasCloudSync: false,
  },
  premium: {
    maxCards: Infinity,
    hasReminderCustomization: true,
    hasChecklistNotes: true,
    hasCloudSync: true,
  },
};

export const useUserStore = create<UserStore>((set, get) => ({
  // 初期状態
  userPlan: 'free',
  premiumExpiresAt: null,
  isLoading: false,

  // プレミアムユーザーかどうか判定
  isPremium: () => {
    const { userPlan, premiumExpiresAt } = get();

    // プレミアムプランでない場合はfalse
    if (userPlan !== 'premium') return false;

    // 期限が設定されていない場合は無期限プレミアム
    if (!premiumExpiresAt) return true;

    // 期限が現在時刻より後の場合のみtrue
    return new Date(premiumExpiresAt) > new Date();
  },

  // 在留資格を追加できるかチェック
  canAddCard: (currentCardCount: number) => {
    const maxCards = get().getMaxCards();
    return currentCardCount < maxCards;
  },

  // 最大登録可能数を取得
  getMaxCards: () => {
    const isPremium = get().isPremium();
    return isPremium ? Infinity : 1;
  },

  // プラン別の機能制限を取得
  getPlanLimits: () => {
    const { userPlan } = get();
    const isPremium = get().isPremium();

    // 期限切れの場合は無料プランの制限を適用
    if (!isPremium) {
      return PLAN_FEATURES.free;
    }

    return PLAN_FEATURES[userPlan];
  },

  // ストレージからプラン情報を読み込み
  loadUserPlan: async () => {
    set({ isLoading: true });

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);

      if (data) {
        const { userPlan, premiumExpiresAt } = JSON.parse(data);
        set({ userPlan, premiumExpiresAt });
      }
    } catch (error) {
      console.error('Failed to load user plan:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // プラン情報を更新
  updateUserPlan: async (plan, expiresAt) => {
    const data = {
      userPlan: plan,
      premiumExpiresAt: expiresAt || null,
    };

    set(data);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save user plan:', error);
    }
  },
}));
