# プッシュ通知機能 実装ドキュメント

**作成日**: 2026年2月15日
**バージョン**: 1.0
**担当**: フロントエンドエンジニア

---

## 目次

1. [概要](#概要)
2. [実装内容](#実装内容)
3. [使用方法](#使用方法)
4. [ファイル構成](#ファイル構成)
5. [セットアップ手順](#セットアップ手順)
6. [API仕様](#api仕様)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

### 実装した機能

在留資格更新リマインダーアプリのプッシュ通知機能を実装しました。

#### 主要機能

1. **Expo Notifications統合**
   - ローカル通知のスケジューリング
   - プッシュ通知のサポート
   - デバイストークン管理

2. **通知タイミング設定**
   - 4ヶ月前通知（申請可能時期）
   - 3ヶ月前通知（書類準備確認）
   - 1ヶ月前通知（最終確認）
   - 2週間前通知（緊急アラート）

3. **通知設定管理**
   - ユーザーごとの通知ON/OFF設定
   - 通知音・バッジ表示のカスタマイズ
   - パーミッション管理

4. **通知ハンドリング**
   - 通知タップ時の画面遷移
   - フォアグラウンド通知の表示
   - バッジカウント管理

---

## 実装内容

### 1. 型定義 (`src/types/index.ts`)

通知関連の型を既存の型定義に追加しました。

```typescript
// 通知タイプ
export type NotificationType = '4months' | '3months' | '1month' | '2weeks';

// 通知スケジュール情報
export interface ScheduledNotification {
  identifier: string;
  residenceCardId: string;
  notificationType: NotificationType;
  scheduledDate: Date;
  title: string;
  body: string;
}

// 通知ペイロード
export interface NotificationPayload {
  residenceCardId: string;
  notificationType: NotificationType;
  expiryDate: string;
}

// デバイストークン情報
export interface DeviceToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  registeredAt: Date;
}
```

### 2. 通知サービス (`src/services/notificationService.ts`)

Expo Notificationsを使用した通知管理サービスを実装しました。

#### 主要メソッド

- `requestPermissions()` - 通知パーミッション要求
- `registerForPushNotifications()` - プッシュトークン登録
- `scheduleNotificationsForCard(card, settings)` - 在留カードの通知スケジュール
- `cancelNotificationsForCard(cardId)` - 通知キャンセル
- `updateNotificationsForCard(card, settings)` - 通知更新
- `addNotificationResponseListener(handler)` - 通知タップ時のリスナー
- `sendTestNotification()` - テスト通知送信

### 3. 通知設定ストア (`src/store/useNotificationStore.ts`)

Zustandを使用した通知設定の状態管理。

#### ストア構造

```typescript
{
  settings: ReminderSettings,
  permissionStatus: NotificationPermissionStatus,
  pushToken: string | null,
  isLoading: boolean,

  // アクション
  loadSettings: () => Promise<void>,
  saveSettings: (settings) => Promise<void>,
  updateSetting: (key, value) => Promise<void>,
  requestPermissions: () => Promise<NotificationPermissionStatus>,
  checkPermissions: () => Promise<void>,
  registerPushToken: () => Promise<void>,
  resetSettings: () => Promise<void>,
}
```

### 4. 通知設定画面 (`src/components/NotificationSettingsScreen.tsx`)

ユーザーが通知設定を管理できるUIコンポーネント。

#### 機能

- パーミッション状態の表示と要求
- 通知タイミングのON/OFF切り替え
- 通知音・バッジ設定
- テスト通知送信

### 5. カスタムフック (`src/hooks/useNotifications.ts`)

通知機能を簡単に使用するためのカスタムフック。

---

## 使用方法

### 基本的な使い方

#### 1. アプリ起動時の初期化

```typescript
import { useNotifications } from './src/hooks/useNotifications';

function App() {
  const { requestPermissions, registerPushToken } = useNotifications();

  useEffect(() => {
    // パーミッション要求
    requestPermissions().then(status => {
      if (status === 'granted') {
        // プッシュトークン登録
        registerPushToken();
      }
    });
  }, []);

  return <YourApp />;
}
```

#### 2. 在留カード登録時に通知をスケジュール

```typescript
import { notificationService } from './src/services/notificationService';
import { useNotificationStore } from './src/store/useNotificationStore';

async function registerResidenceCard(cardData) {
  // 在留カードを保存
  const card = await saveCard(cardData);

  // 通知設定を取得
  const settings = useNotificationStore.getState().settings;

  // 通知をスケジュール
  await notificationService.scheduleNotificationsForCard(card, settings);
}
```

#### 3. 在留カード更新時に通知を更新

```typescript
async function updateResidenceCard(cardId, updatedData) {
  // 在留カードを更新
  const card = await updateCard(cardId, updatedData);

  // 通知を更新
  const settings = useNotificationStore.getState().settings;
  await notificationService.updateNotificationsForCard(card, settings);
}
```

#### 4. 在留カード削除時に通知をキャンセル

```typescript
async function deleteResidenceCard(cardId) {
  // 在留カードを削除
  await deleteCard(cardId);

  // 通知をキャンセル
  await notificationService.cancelNotificationsForCard(cardId);
}
```

#### 5. 通知タップ時の処理

通知は自動的に処理され、該当する在留カードの詳細画面に遷移します。
カスタムフック `useNotifications` が自動的にリスナーを登録します。

---

## ファイル構成

```
frontend/
├── src/
│   ├── types/
│   │   ├── index.ts                    # 型定義（通知関連の型を追加）
│   │   ├── notification.ts             # 通知専用型定義（参考）
│   │   └── residenceCard.ts            # 在留カード型定義（参考）
│   │
│   ├── services/
│   │   └── notificationService.ts      # 通知サービス（拡張版）
│   │
│   ├── store/
│   │   └── useNotificationStore.ts     # 通知設定ストア
│   │
│   ├── components/
│   │   └── NotificationSettingsScreen.tsx  # 通知設定画面
│   │
│   └── hooks/
│       └── useNotifications.ts         # 通知カスタムフック
│
├── NOTIFICATION_IMPLEMENTATION.md      # このドキュメント
└── package.json
```

---

## セットアップ手順

### 1. 依存関係の確認

`package.json` に以下のパッケージが含まれていることを確認してください（既にインストール済み）。

```json
{
  "dependencies": {
    "expo-notifications": "~0.32.16",
    "expo-device": "~8.0.10",
    "@react-native-async-storage/async-storage": "2.2.0",
    "zustand": "^4.5.0",
    "date-fns": "^3.3.0"
  }
}
```

### 2. app.jsonの設定

`app.json` に通知設定を追加します。

```json
{
  "expo": {
    "name": "residence-reminder",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#ffffff",
      "androidMode": "default",
      "androidCollapsedTitle": "在留資格更新リマインダー"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "bundleIdentifier": "com.visareminder.app",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

### 3. Android通知アイコンの準備

Android用の通知アイコンを準備します。

```bash
# 白黒の透過PNG（96x96px）を作成
# assets/notification-icon.png に配置
```

### 4. iOS通知設定

iOSで通知を受け取るには、Apple Developer Accountでの設定が必要です。

1. Apple Developer Portalでプッシュ通知を有効化
2. APNs認証キー（.p8ファイル）を取得
3. Expo Application Servicesに登録

### 5. プッシュトークンのプロジェクトID設定

`src/services/notificationService.ts` の `registerForPushNotifications` メソッドで、プロジェクトIDを設定します。

```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-expo-project-id', // app.jsonのextra.eas.projectIdと一致させる
});
```

または、環境変数で管理：

```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: process.env.EXPO_PROJECT_ID,
});
```

---

## API仕様

### NotificationService

#### `requestPermissions(): Promise<NotificationPermissionStatus>`

通知パーミッションを要求します。

**戻り値**: `'granted' | 'denied' | 'undetermined'`

**使用例**:
```typescript
const status = await notificationService.requestPermissions();
if (status === 'granted') {
  console.log('通知が許可されました');
}
```

---

#### `registerForPushNotifications(): Promise<string | null>`

Expo Push Tokenを取得し、AsyncStorageに保存します。

**戻り値**: Push Token文字列、または失敗時は `null`

**使用例**:
```typescript
const token = await notificationService.registerForPushNotifications();
if (token) {
  console.log('Push Token:', token);
  // サーバーに送信
  await sendTokenToServer(token);
}
```

---

#### `scheduleNotificationsForCard(card: ResidenceCard, settings: ReminderSettings): Promise<void>`

在留カードに対する通知をスケジュールします。

**パラメータ**:
- `card`: 在留カード情報
- `settings`: 通知設定

**使用例**:
```typescript
await notificationService.scheduleNotificationsForCard(residenceCard, settings);
```

---

#### `cancelNotificationsForCard(cardId: string): Promise<void>`

特定の在留カードに関する通知をすべてキャンセルします。

**パラメータ**:
- `cardId`: 在留カードID

**使用例**:
```typescript
await notificationService.cancelNotificationsForCard('card-123');
```

---

#### `updateNotificationsForCard(card: ResidenceCard, settings: ReminderSettings): Promise<void>`

在留カードの通知を更新します（既存の通知をキャンセルして再スケジュール）。

**使用例**:
```typescript
await notificationService.updateNotificationsForCard(updatedCard, settings);
```

---

#### `sendTestNotification(): Promise<void>`

テスト通知を2秒後に送信します（開発・デバッグ用）。

**使用例**:
```typescript
await notificationService.sendTestNotification();
```

---

#### `addNotificationResponseListener(handler: (payload: NotificationPayload) => void): Subscription`

通知タップ時のリスナーを登録します。

**パラメータ**:
- `handler`: 通知タップ時に実行される関数

**戻り値**: Subscriptionオブジェクト（`.remove()` でリスナー解除）

**使用例**:
```typescript
const subscription = notificationService.addNotificationResponseListener((payload) => {
  console.log('通知がタップされました:', payload);
  // 画面遷移などの処理
  navigation.navigate('Detail', { cardId: payload.residenceCardId });
});

// クリーンアップ
subscription.remove();
```

---

### NotificationStore

#### `loadSettings(): Promise<void>`

AsyncStorageから通知設定を読み込みます。

**使用例**:
```typescript
const { loadSettings } = useNotificationStore();
await loadSettings();
```

---

#### `updateSetting(key: keyof ReminderSettings, value: any): Promise<void>`

個別の設定項目を更新します。

**使用例**:
```typescript
const { updateSetting } = useNotificationStore();
await updateSetting('fourMonthsBefore', false);
```

---

#### `requestPermissions(): Promise<NotificationPermissionStatus>`

通知パーミッションを要求し、状態を更新します。

**使用例**:
```typescript
const { requestPermissions } = useNotificationStore();
const status = await requestPermissions();
```

---

## トラブルシューティング

### 通知が届かない

#### 1. パーミッション確認

```typescript
const status = await notificationService.getPermissionStatus();
console.log('パーミッション状態:', status);
```

#### 2. スケジュール済み通知の確認

```typescript
const scheduled = await notificationService.getScheduledNotifications();
console.log('スケジュール済み通知:', scheduled);
```

#### 3. デバイスチェック

```typescript
import * as Device from 'expo-device';

if (!Device.isDevice) {
  console.warn('シミュレーターでは通知が動作しません');
}
```

---

### iOS通知が動作しない

1. Apple Developer Portalでプッシュ通知が有効化されているか確認
2. APNs認証キーが正しく設定されているか確認
3. `app.json` の `bundleIdentifier` が正しいか確認
4. 実機でテストしているか確認（シミュレーターでは動作しない）

---

### Android通知が動作しない

1. 通知チャンネルが正しく設定されているか確認
2. `google-services.json` が正しく配置されているか確認
3. Androidのバッテリー最適化設定を確認
4. アプリに通知権限が付与されているか確認

---

### 通知が遅延する

1. デバイスの省電力モードを無効化
2. バッテリー最適化設定でアプリを除外
3. バックグラウンド実行を許可

---

## ベストプラクティス

### 1. 通知スケジュールのタイミング

在留カードを登録・更新するたびに通知を再スケジュールします。

```typescript
async function saveResidenceCard(cardData) {
  const card = await database.save(cardData);

  // 通知をスケジュール
  const settings = useNotificationStore.getState().settings;
  await notificationService.scheduleNotificationsForCard(card, settings);

  return card;
}
```

### 2. パーミッション要求のタイミング

アプリ起動時ではなく、ユーザーが在留カードを初めて登録するタイミングで要求するのが推奨です。

```typescript
async function onRegisterFirstCard(cardData) {
  // パーミッション確認
  const status = await notificationService.getPermissionStatus();

  if (status === 'undetermined') {
    // 説明ダイアログを表示
    showPermissionExplanationDialog(() => {
      notificationService.requestPermissions();
    });
  }

  // カード登録処理
  await saveResidenceCard(cardData);
}
```

### 3. エラーハンドリング

通知のスケジュールに失敗してもアプリの主要機能に影響しないようにします。

```typescript
try {
  await notificationService.scheduleNotificationsForCard(card, settings);
} catch (error) {
  console.error('通知スケジュールエラー:', error);
  // エラーをログに記録するが、ユーザーには警告のみ表示
  showWarning('通知の設定に失敗しました。設定画面から再度設定してください。');
}
```

---

## 今後の拡張予定

1. **サーバーサイド通知**
   - FCM/APNsを使用したリモートプッシュ通知
   - 通知ログの管理
   - 多言語対応のメッセージテンプレート

2. **通知カスタマイズ**
   - 通知時刻の設定
   - カスタム通知メッセージ
   - 通知頻度の調整

3. **分析機能**
   - 通知の開封率
   - 通知からの遷移率
   - 通知設定の利用状況

---

## まとめ

在留資格更新リマインダーアプリのプッシュ通知機能を完全に実装しました。

### 実装した機能

- Expo Notifications統合
- ローカル通知スケジューリング
- 通知パーミッション管理
- デバイストークン取得・保存
- 通知設定UI
- 通知タップ時のハンドリング

### 使用方法

1. `useNotifications` フックをコンポーネントで使用
2. 在留カード登録時に `scheduleNotifications` を呼び出し
3. 通知設定画面でユーザーが設定をカスタマイズ

### 注意事項

- 実機でのテストが必要
- iOS/Androidそれぞれで通知設定が必要
- バッテリー最適化設定の影響を受ける可能性がある

---

**ドキュメント作成者**: Claude Code Assistant
**最終更新日**: 2026年2月15日
