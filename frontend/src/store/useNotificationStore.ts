/**
 * 通知設定管理ストア - Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReminderSettings,
  NotificationPermissionStatus,
} from '../types';
import { notificationService } from '../services/notificationService';

const STORAGE_KEY = '@visa_reminder_notification_settings';

// デフォルト通知設定
const DEFAULT_SETTINGS: ReminderSettings = {
  fourMonthsBefore: true,
  threeMonthsBefore: true,
  oneMonthBefore: true,
  twoWeeksBefore: true,
  soundEnabled: true,
  badgeEnabled: true,
};

interface NotificationState {
  // 通知設定
  settings: ReminderSettings;

  // パーミッション状態
  permissionStatus: NotificationPermissionStatus;

  // プッシュトークン
  pushToken: string | null;

  // ローディング状態
  isLoading: boolean;

  // アクション
  loadSettings: () => Promise<void>;
  saveSettings: (settings: ReminderSettings) => Promise<void>;
  updateSetting: <K extends keyof ReminderSettings>(
    key: K,
    value: ReminderSettings[K]
  ) => Promise<void>;
  requestPermissions: () => Promise<NotificationPermissionStatus>;
  checkPermissions: () => Promise<void>;
  registerPushToken: () => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  permissionStatus: 'undetermined',
  pushToken: null,
  isLoading: false,

  /**
   * 通知設定をロード
   */
  loadSettings: async () => {
    try {
      set({ isLoading: true });

      // AsyncStorageから設定を取得
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        set({ settings });
      }

      // パーミッション状態を確認
      await get().checkPermissions();

      // 保存されているプッシュトークンを取得
      const token = await notificationService.getSavedPushToken();
      set({ pushToken: token });
    } catch (error) {
      console.error('通知設定ロードエラー:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * 通知設定を保存
   */
  saveSettings: async (settings: ReminderSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      set({ settings });
    } catch (error) {
      console.error('通知設定保存エラー:', error);
      throw error;
    }
  },

  /**
   * 個別設定を更新
   */
  updateSetting: async <K extends keyof ReminderSettings>(
    key: K,
    value: ReminderSettings[K]
  ) => {
    try {
      const currentSettings = get().settings;
      const newSettings = {
        ...currentSettings,
        [key]: value,
      };
      await get().saveSettings(newSettings);
    } catch (error) {
      console.error('通知設定更新エラー:', error);
      throw error;
    }
  },

  /**
   * 通知パーミッションを要求
   */
  requestPermissions: async () => {
    try {
      const status = await notificationService.requestPermissions();
      set({ permissionStatus: status });
      return status;
    } catch (error) {
      console.error('パーミッション要求エラー:', error);
      return 'denied';
    }
  },

  /**
   * パーミッション状態を確認
   */
  checkPermissions: async () => {
    try {
      const status = await notificationService.getPermissionStatus();
      set({ permissionStatus: status });
    } catch (error) {
      console.error('パーミッション確認エラー:', error);
    }
  },

  /**
   * プッシュトークンを登録
   */
  registerPushToken: async () => {
    try {
      const token = await notificationService.registerForPushNotifications();
      set({ pushToken: token });
    } catch (error) {
      console.error('プッシュトークン登録エラー:', error);
    }
  },

  /**
   * 設定をリセット
   */
  resetSettings: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ settings: DEFAULT_SETTINGS });
    } catch (error) {
      console.error('設定リセットエラー:', error);
      throw error;
    }
  },
}));
