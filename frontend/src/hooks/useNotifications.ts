/**
 * 通知機能を使用するためのカスタムフック
 */

import { useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { useNotificationStore } from '../store/useNotificationStore';
import { ResidenceCard, NotificationPayload } from '../types';
import { useNavigation } from '@react-navigation/native';

/**
 * 通知機能の初期化と管理
 */
export const useNotifications = () => {
  const navigation = useNavigation();
  const {
    settings,
    permissionStatus,
    loadSettings,
    requestPermissions,
    registerPushToken,
  } = useNotificationStore();

  /**
   * 通知タップ時のハンドラー
   */
  const handleNotificationResponse = useCallback(
    (payload: NotificationPayload) => {
      console.log('通知がタップされました:', payload);

      // 在留カード詳細画面に遷移
      if (payload.residenceCardId) {
        // @ts-ignore - navigation型の問題を回避
        navigation.navigate('Edit', { cardId: payload.residenceCardId });
      }

      // バッジをクリア
      notificationService.clearBadge();
    },
    [navigation]
  );

  /**
   * 通知受信時のハンドラー（フォアグラウンド）
   */
  const handleNotificationReceived = useCallback(
    (notification: any) => {
      console.log('通知を受信しました:', notification);
      // 必要に応じて追加の処理を実装
    },
    []
  );

  /**
   * 初期化処理
   */
  useEffect(() => {
    // Androidチャンネル初期化 + 設定ロード + 権限確認
    (async () => {
      await notificationService.initialize();
      await loadSettings();

      // 未決定状態なら初回起動として自動リクエスト
      const status = await notificationService.getPermissionStatus();
      if (status === 'undetermined') {
        await requestPermissions();
      }
    })();

    // 通知リスナーを登録
    const responseSubscription = notificationService.addNotificationResponseListener(
      handleNotificationResponse
    );
    const receivedSubscription = notificationService.addNotificationReceivedListener(
      handleNotificationReceived
    );

    // クリーンアップ
    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  /**
   * 在留カードの通知をスケジュール
   */
  const scheduleNotifications = useCallback(
    async (card: ResidenceCard) => {
      try {
        // パーミッションチェック
        if (permissionStatus !== 'granted') {
          console.warn('通知パーミッションが許可されていません');
          return;
        }

        await notificationService.scheduleNotificationsForCard(card, settings);
        console.log('通知スケジュール完了:', card.id);
      } catch (error) {
        console.error('通知スケジュールエラー:', error);
        throw error;
      }
    },
    [settings, permissionStatus]
  );

  /**
   * 在留カードの通知をキャンセル
   */
  const cancelNotifications = useCallback(async (cardId: string) => {
    try {
      await notificationService.cancelNotificationsForCard(cardId);
      console.log('通知キャンセル完了:', cardId);
    } catch (error) {
      console.error('通知キャンセルエラー:', error);
      throw error;
    }
  }, []);

  /**
   * すべての通知をキャンセル
   */
  const cancelAllNotifications = useCallback(async () => {
    try {
      await notificationService.cancelAllNotifications();
      console.log('すべての通知をキャンセルしました');
    } catch (error) {
      console.error('通知一括キャンセルエラー:', error);
      throw error;
    }
  }, []);

  /**
   * スケジュール済み通知を取得
   */
  const getScheduledNotifications = useCallback(async () => {
    try {
      return await notificationService.getScheduledNotifications();
    } catch (error) {
      console.error('スケジュール通知取得エラー:', error);
      return [];
    }
  }, []);

  return {
    // 状態
    settings,
    permissionStatus,

    // アクション
    requestPermissions,
    registerPushToken,
    scheduleNotifications,
    cancelNotifications,
    cancelAllNotifications,
    getScheduledNotifications,
  };
};
