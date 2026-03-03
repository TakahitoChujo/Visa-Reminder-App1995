/**
 * 通知サービス - Expo Notifications統合
 * 在留資格更新リマインダーのローカル通知・プッシュ通知を管理
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ResidenceCard,
  NotificationPermissionStatus,
  ReminderSettings,
  NotificationType,
  NotificationPayload,
  DeviceToken,
} from '../types';
import { differenceInDays, subMonths, subDays } from 'date-fns';
import i18n from '../i18n';

// AsyncStorageキー
const STORAGE_KEYS = {
  PUSH_TOKEN: '@visa_reminder_push_token',
  DEVICE_TOKEN: '@visa_reminder_device_token',
} as const;

// 通知ハンドラーの設定
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  /**
   * 通知パーミッションをリクエスト
   */
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return 'denied';
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return 'denied';
      }

      // Android用のチャンネル設定
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('visa_reminder_channel', {
          name: i18n.t('notification:channel.name'),
          description: i18n.t('notification:channel.description'),
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      return 'granted';
    } catch (error) {
      console.error('通知パーミッション要求エラー:', error);
      return 'denied';
    }
  }

  /**
   * 現在の通知パーミッション状態を取得
   */
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();

    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  }

  /**
   * 在留カードに対する通知をスケジュール
   */
  async scheduleNotificationsForCard(
    card: ResidenceCard,
    settings: ReminderSettings
  ): Promise<void> {
    // 既存の通知をキャンセル
    await this.cancelNotificationsForCard(card.id);

    const expirationDate = new Date(card.expirationDate);
    const now = new Date();

    // 各タイミングの通知をスケジュール
    const notifications = [];

    const scheduleItems: Array<{
      enabled: boolean;
      date: Date;
      type: '4months' | '3months' | '1month' | '2weeks';
    }> = [
      { enabled: settings.fourMonthsBefore, date: subMonths(expirationDate, 4), type: '4months' },
      { enabled: settings.threeMonthsBefore, date: subMonths(expirationDate, 3), type: '3months' },
      { enabled: settings.oneMonthBefore, date: subMonths(expirationDate, 1), type: '1month' },
      { enabled: settings.twoWeeksBefore, date: subDays(expirationDate, 14), type: '2weeks' },
    ];

    for (const item of scheduleItems) {
      if (item.enabled && item.date > now) {
        const days = differenceInDays(expirationDate, item.date);
        const typeName = this.getResidenceTypeLabel(card.residenceType);
        notifications.push({
          date: item.date,
          type: item.type,
          title: i18n.t(`notification:schedule.${item.type}.title`),
          body: i18n.t(`notification:schedule.${item.type}.body`, { type: typeName, days }),
        });
      }
    }

    // 通知をスケジュール
    for (const notification of notifications) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            residenceCardId: card.id,
            notificationType: notification.type,
            expiryDate: card.expirationDate,
          },
          sound: settings.soundEnabled,
          badge: settings.badgeEnabled ? 1 : undefined,
        },
        trigger: {
          date: notification.date,
          channelId: 'visa_reminder_channel',
        },
        identifier: `${card.id}_${notification.type}`,
      });
    }
  }

  /**
   * 特定カードの通知をキャンセル
   */
  async cancelNotificationsForCard(cardId: string): Promise<void> {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    const notificationsToCance = scheduledNotifications
      .filter((n) => n.identifier.startsWith(`${cardId}_`))
      .map((n) => n.identifier);

    for (const identifier of notificationsToCance) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }
  }

  /**
   * すべての通知をキャンセル
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * スケジュール済み通知を取得
   */
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * バッジカウントをクリア
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * バッジカウントを設定
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Expo Push Tokenを取得・登録
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      const permission = await this.requestPermissions();
      if (permission !== 'granted') {
        return null;
      }

      // Expo Push Tokenの取得
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID, // app.jsonのextra.eas.projectIdから取得
      });

      const token = tokenData.data;

      // トークンを保存
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

      console.log('Push Token:', token);
      return token;
    } catch (error) {
      console.error('Push Token取得エラー:', error);
      return null;
    }
  }

  /**
   * 保存されているPush Tokenを取得
   */
  async getSavedPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    } catch (error) {
      console.error('Push Token取得エラー:', error);
      return null;
    }
  }

  /**
   * デバイストークン情報を保存
   */
  async saveDeviceToken(token: DeviceToken): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, JSON.stringify(token));
    } catch (error) {
      console.error('デバイストークン保存エラー:', error);
    }
  }

  /**
   * 保存されているデバイストークン情報を取得
   */
  async getSavedDeviceToken(): Promise<DeviceToken | null> {
    try {
      const tokenJson = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN);
      if (tokenJson) {
        return JSON.parse(tokenJson);
      }
      return null;
    } catch (error) {
      console.error('デバイストークン取得エラー:', error);
      return null;
    }
  }

  /**
   * 通知タップ時のリスナーを登録
   */
  addNotificationResponseListener(
    handler: (payload: NotificationPayload) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as unknown as NotificationPayload;
      handler(data);
    });
  }

  /**
   * 通知受信時のリスナーを登録（フォアグラウンド）
   */
  addNotificationReceivedListener(
    handler: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(handler);
  }

  /**
   * 特定カードの通知を更新
   */
  async updateNotificationsForCard(
    card: ResidenceCard,
    settings: ReminderSettings
  ): Promise<void> {
    // 既存の通知をキャンセルして再スケジュール
    await this.scheduleNotificationsForCard(card, settings);
  }

  /**
   * テスト通知を送信（開発・デバッグ用）
   */
  async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('notification:test.title'),
          body: i18n.t('notification:test.body'),
          sound: true,
          badge: 1,
        },
        trigger: { seconds: 2 } as Notifications.TimeIntervalTriggerInput,
      });
      console.log('テスト通知を2秒後に送信します');
    } catch (error) {
      console.error('テスト通知送信エラー:', error);
      throw error;
    }
  }

  /**
   * 在留資格タイプのラベルを取得（i18n対応）
   */
  private getResidenceTypeLabel(type: string): string {
    return i18n.t(`common:residenceType.${type}`, { defaultValue: i18n.t('common:residenceType.other') });
  }
}

export const notificationService = new NotificationService();
