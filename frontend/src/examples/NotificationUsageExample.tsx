/**
 * 通知機能の使用例
 * このファイルは実装の参考例です
 */

import React, { useEffect } from 'react';
import { View, Button, Alert } from 'react-native';
import { notificationService } from '../services/notificationService';
import { useNotificationStore } from '../store/useNotificationStore';
import { useNotifications } from '../hooks/useNotifications';
import { ResidenceCard } from '../types';

/**
 * 例1: アプリ起動時の初期化
 */
export function AppInitializationExample() {
  const { requestPermissions, registerPushToken } = useNotifications();

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    // パーミッション要求
    const status = await requestPermissions();

    if (status === 'granted') {
      // プッシュトークンを登録
      await registerPushToken();
    } else {
      console.warn('通知パーミッションが拒否されました');
    }
  };

  return <View />;
}

/**
 * 例2: 在留カード登録時の通知スケジュール
 */
export function ResidenceCardRegistrationExample() {
  const { scheduleNotifications } = useNotifications();
  const settings = useNotificationStore((state) => state.settings);

  const handleRegisterCard = async (cardData: Partial<ResidenceCard>) => {
    try {
      // 在留カードを保存（仮のデータベース保存処理）
      const savedCard: ResidenceCard = {
        id: 'card-123',
        expirationDate: cardData.expirationDate || new Date().toISOString(),
        residenceType: cardData.residenceType || 'work_visa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 通知をスケジュール
      await scheduleNotifications(savedCard);

      Alert.alert('成功', '在留カードが登録され、通知が設定されました。');
    } catch (error) {
      console.error('登録エラー:', error);
      Alert.alert('エラー', '在留カードの登録に失敗しました。');
    }
  };

  return (
    <View>
      <Button
        title="在留カードを登録"
        onPress={() =>
          handleRegisterCard({
            expirationDate: new Date('2027-12-31').toISOString(),
            residenceType: 'work_visa',
          })
        }
      />
    </View>
  );
}

/**
 * 例3: 在留カード更新時の通知更新
 */
export function ResidenceCardUpdateExample() {
  const settings = useNotificationStore((state) => state.settings);

  const handleUpdateCard = async (
    cardId: string,
    updatedData: Partial<ResidenceCard>
  ) => {
    try {
      // 在留カードを更新（仮のデータベース更新処理）
      const updatedCard: ResidenceCard = {
        id: cardId,
        expirationDate:
          updatedData.expirationDate || new Date().toISOString(),
        residenceType: updatedData.residenceType || 'work_visa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 通知を更新
      await notificationService.updateNotificationsForCard(
        updatedCard,
        settings
      );

      Alert.alert('成功', '在留カードが更新され、通知が再設定されました。');
    } catch (error) {
      console.error('更新エラー:', error);
      Alert.alert('エラー', '在留カードの更新に失敗しました。');
    }
  };

  return (
    <View>
      <Button
        title="在留カードを更新"
        onPress={() =>
          handleUpdateCard('card-123', {
            expirationDate: new Date('2028-06-30').toISOString(),
          })
        }
      />
    </View>
  );
}

/**
 * 例4: 在留カード削除時の通知キャンセル
 */
export function ResidenceCardDeletionExample() {
  const { cancelNotifications } = useNotifications();

  const handleDeleteCard = async (cardId: string) => {
    try {
      // 在留カードを削除（仮のデータベース削除処理）
      // await database.deleteCard(cardId);

      // 通知をキャンセル
      await cancelNotifications(cardId);

      Alert.alert('成功', '在留カードが削除され、通知がキャンセルされました。');
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', '在留カードの削除に失敗しました。');
    }
  };

  return (
    <View>
      <Button
        title="在留カードを削除"
        onPress={() => handleDeleteCard('card-123')}
      />
    </View>
  );
}

/**
 * 例5: 通知設定の変更時に全カードの通知を更新
 */
export function NotificationSettingsChangeExample() {
  const { updateSetting } = useNotificationStore();

  const handleSettingChange = async (
    key: keyof ReminderSettings,
    value: boolean
  ) => {
    try {
      // 設定を更新
      await updateSetting(key, value);

      // すべての在留カードの通知を再スケジュール
      // const cards = await database.getAllCards();
      // const settings = useNotificationStore.getState().settings;
      //
      // for (const card of cards) {
      //   await notificationService.updateNotificationsForCard(card, settings);
      // }

      Alert.alert('成功', '通知設定が更新されました。');
    } catch (error) {
      console.error('設定更新エラー:', error);
      Alert.alert('エラー', '通知設定の更新に失敗しました。');
    }
  };

  return (
    <View>
      <Button
        title="4ヶ月前通知をOFF"
        onPress={() => handleSettingChange('fourMonthsBefore', false)}
      />
    </View>
  );
}

/**
 * 例6: スケジュール済み通知の確認
 */
export function ScheduledNotificationsExample() {
  const { getScheduledNotifications } = useNotifications();

  const handleCheckScheduled = async () => {
    try {
      const scheduled = await getScheduledNotifications();
      console.log('スケジュール済み通知:', scheduled);

      Alert.alert(
        'スケジュール済み通知',
        `${scheduled.length}件の通知がスケジュールされています。`
      );
    } catch (error) {
      console.error('通知確認エラー:', error);
    }
  };

  return (
    <View>
      <Button title="スケジュール済み通知を確認" onPress={handleCheckScheduled} />
    </View>
  );
}

/**
 * 例7: テスト通知の送信
 */
export function TestNotificationExample() {
  const handleSendTest = async () => {
    try {
      await notificationService.sendTestNotification();
      Alert.alert('テスト通知', '2秒後にテスト通知が送信されます。');
    } catch (error) {
      console.error('テスト通知エラー:', error);
      Alert.alert('エラー', 'テスト通知の送信に失敗しました。');
    }
  };

  return (
    <View>
      <Button title="テスト通知を送信" onPress={handleSendTest} />
    </View>
  );
}

/**
 * 例8: 通知タップ時のカスタムハンドリング
 */
export function NotificationResponseExample() {
  useEffect(() => {
    // 通知タップ時のリスナーを登録
    const subscription = notificationService.addNotificationResponseListener(
      (payload) => {
        console.log('通知がタップされました:', payload);

        // カスタム処理
        if (payload.notificationType === '2weeks') {
          // 緊急アラートの場合は特別な処理
          Alert.alert(
            '緊急',
            '有効期限まで2週間です。至急更新手続きを行ってください。',
            [
              {
                text: 'チェックリストを確認',
                onPress: () => {
                  // チェックリスト画面に遷移
                  // navigation.navigate('Checklist', { cardId: payload.residenceCardId });
                },
              },
              { text: 'OK' },
            ]
          );
        }
      }
    );

    // クリーンアップ
    return () => {
      subscription.remove();
    };
  }, []);

  return <View />;
}

// ReminderSettingsの型をインポート
import { ReminderSettings } from '../types';
