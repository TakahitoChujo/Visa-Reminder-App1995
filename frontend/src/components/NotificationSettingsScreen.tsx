/**
 * 通知設定画面コンポーネント
 */

import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Switch,
  Text,
  Card,
  Button,
  List,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useNotificationStore } from '../store/useNotificationStore';
import { notificationService } from '../services/notificationService';

export const NotificationSettingsScreen: React.FC = () => {
  const theme = useTheme();
  const {
    settings,
    permissionStatus,
    pushToken,
    loadSettings,
    updateSetting,
    requestPermissions,
    registerPushToken,
  } = useNotificationStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const handlePermissionRequest = async () => {
    const status = await requestPermissions();
    if (status === 'granted') {
      Alert.alert('通知許可', '通知が許可されました。');
      // プッシュトークンを登録
      await registerPushToken();
    } else {
      Alert.alert(
        '通知許可が必要です',
        '通知を受け取るには、デバイスの設定から通知を許可してください。'
      );
    }
  };

  const handleTestNotification = async () => {
    try {
      if (permissionStatus !== 'granted') {
        Alert.alert(
          '通知許可が必要です',
          '通知を受け取るには、まず通知を許可してください。'
        );
        return;
      }
      await notificationService.sendTestNotification();
      Alert.alert('テスト通知', '2秒後にテスト通知が送信されます。');
    } catch (error) {
      Alert.alert('エラー', 'テスト通知の送信に失敗しました。');
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return '許可済み';
      case 'denied':
        return '拒否';
      case 'undetermined':
        return '未設定';
      default:
        return '不明';
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return theme.colors.primary;
      case 'denied':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* パーミッション状態 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            通知の許可状態
          </Text>
          <View style={styles.permissionRow}>
            <Text variant="bodyMedium">現在の状態:</Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.permissionStatus,
                { color: getPermissionStatusColor() },
              ]}
            >
              {getPermissionStatusText()}
            </Text>
          </View>

          {permissionStatus !== 'granted' && (
            <Button
              mode="contained"
              onPress={handlePermissionRequest}
              style={styles.button}
            >
              通知を許可する
            </Button>
          )}

          {pushToken && (
            <Text variant="bodySmall" style={styles.tokenText}>
              デバイストークン: {pushToken.substring(0, 20)}...
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* 通知タイミング設定 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            通知タイミング
          </Text>
          <Text variant="bodySmall" style={styles.description}>
            在留資格の有効期限に基づいて通知するタイミングを選択できます。
          </Text>
        </Card.Content>

        <List.Item
          title="4ヶ月前通知"
          description="申請可能時期の開始を通知"
          left={(props) => <List.Icon {...props} icon="calendar-alert" />}
          right={() => (
            <Switch
              value={settings.fourMonthsBefore}
              onValueChange={(value) => updateSetting('fourMonthsBefore', value)}
              disabled={permissionStatus !== 'granted'}
            />
          )}
        />
        <Divider />

        <List.Item
          title="3ヶ月前通知"
          description="書類準備の確認"
          left={(props) => <List.Icon {...props} icon="file-document-outline" />}
          right={() => (
            <Switch
              value={settings.threeMonthsBefore}
              onValueChange={(value) => updateSetting('threeMonthsBefore', value)}
              disabled={permissionStatus !== 'granted'}
            />
          )}
        />
        <Divider />

        <List.Item
          title="1ヶ月前通知"
          description="申請忘れ防止（最終確認）"
          left={(props) => <List.Icon {...props} icon="bell-outline" />}
          right={() => (
            <Switch
              value={settings.oneMonthBefore}
              onValueChange={(value) => updateSetting('oneMonthBefore', value)}
              disabled={permissionStatus !== 'granted'}
            />
          )}
        />
        <Divider />

        <List.Item
          title="2週間前通知"
          description="緊急アラート"
          left={(props) => <List.Icon {...props} icon="alert" />}
          right={() => (
            <Switch
              value={settings.twoWeeksBefore}
              onValueChange={(value) => updateSetting('twoWeeksBefore', value)}
              disabled={permissionStatus !== 'granted'}
            />
          )}
        />
      </Card>

      {/* 通知オプション */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            通知オプション
          </Text>
        </Card.Content>

        <List.Item
          title="通知音"
          description="通知時に音を鳴らす"
          left={(props) => <List.Icon {...props} icon="volume-high" />}
          right={() => (
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) => updateSetting('soundEnabled', value)}
              disabled={permissionStatus !== 'granted'}
            />
          )}
        />
        <Divider />

        <List.Item
          title="バッジ表示"
          description="アプリアイコンにバッジを表示"
          left={(props) => <List.Icon {...props} icon="numeric" />}
          right={() => (
            <Switch
              value={settings.badgeEnabled}
              onValueChange={(value) => updateSetting('badgeEnabled', value)}
              disabled={permissionStatus !== 'granted'}
            />
          )}
        />
      </Card>

      {/* テスト通知 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            テスト
          </Text>
          <Text variant="bodySmall" style={styles.description}>
            通知が正しく動作するか確認できます。
          </Text>
          <Button
            mode="outlined"
            onPress={handleTestNotification}
            style={styles.button}
            icon="bell-ring"
          >
            テスト通知を送信
          </Button>
        </Card.Content>
      </Card>

      {/* 注意事項 */}
      <Card style={[styles.card, styles.lastCard]}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            注意事項
          </Text>
          <Text variant="bodySmall" style={styles.infoText}>
            • 通知は在留カードの有効期限に基づいて自動的にスケジュールされます
          </Text>
          <Text variant="bodySmall" style={styles.infoText}>
            • 在留カードを登録・更新すると、通知が再設定されます
          </Text>
          <Text variant="bodySmall" style={styles.infoText}>
            • デバイスの電源が入っている必要があります
          </Text>
          <Text variant="bodySmall" style={styles.infoText}>
            • バッテリー最適化設定により通知が遅延する場合があります
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 8,
    marginBottom: 0,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  description: {
    marginBottom: 12,
    opacity: 0.7,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  permissionStatus: {
    fontWeight: 'bold',
  },
  button: {
    marginTop: 12,
  },
  tokenText: {
    marginTop: 8,
    opacity: 0.5,
    fontSize: 10,
  },
  infoText: {
    marginBottom: 4,
    lineHeight: 20,
    opacity: 0.7,
  },
});
