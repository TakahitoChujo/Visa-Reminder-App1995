# インストールガイド - 在留資格更新リマインダーアプリ

## 🎯 概要

このガイドでは、ローカルSQLiteデータベース実装を含む在留資格更新リマインダーアプリのセットアップ方法を説明します。

---

## 📋 前提条件

### 必須環境

- Node.js 18.x 以上
- npm または yarn
- Expo CLI
- iOS Simulator（Mac）または Android Emulator

### 推奨環境

- macOS（iOS開発の場合）
- Windows/Linux（Android開発の場合）
- VSCode または WebStorm

---

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
# プロジェクトディレクトリに移動
cd c:/projects/visa-reminder-app
```

### 2. 依存関係のインストール

```bash
cd frontend
npm install
```

インストールされる主要パッケージ:
- `expo-sqlite` ~15.0.7 - SQLiteデータベース
- `expo-crypto` ~14.0.1 - 暗号化
- `uuid` ^9.0.1 - UUID生成
- その他のExpoおよびReact Native関連パッケージ

### 3. アプリの初期化コードを追加

`frontend/App.tsx` を以下のように更新:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { DatabaseService, EncryptionService } from './src/services/database';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      console.log('Initializing database...');

      // 暗号化サービスを初期化
      await EncryptionService.initialize();
      console.log('✅ Encryption service initialized');

      // データベースを初期化
      await DatabaseService.initialize();
      console.log('✅ Database initialized');

      setDbReady(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Database initialization failed:', err);
    }
  };

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>初期化エラー</Text>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>データベースを初期化中...</Text>
      </View>
    );
  }

  // データベース初期化完了後のメインアプリ
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>在留資格更新リマインダー</Text>
      <Text style={{ marginTop: 10 }}>データベース準備完了 ✅</Text>
    </View>
  );
}
```

### 4. アプリの起動

```bash
# Expo開発サーバーを起動
npm start

# または特定のプラットフォームで起動
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Webブラウザ
```

### 5. 動作確認

アプリが起動すると、以下のログがコンソールに表示されます:

```
Initializing database...
✅ Encryption service initialized
Current database version: 0, Target version: 1
Running migration to version 1...
Master data seeded successfully
Migration to version 1 completed
Database version set to 1
✅ Database initialized
Database initialized successfully
```

---

## 🧪 動作テスト

### 基本的な動作確認

`App.tsx` にテストコードを追加:

```typescript
import { ResidenceTypeRepository } from './src/services/database';

// データベース初期化後に実行
useEffect(() => {
  if (dbReady) {
    testDatabase();
  }
}, [dbReady]);

const testDatabase = async () => {
  try {
    // 在留資格マスタを取得
    const types = await ResidenceTypeRepository.findAll();
    console.log('✅ Residence types loaded:', types.length);

    // マスタデータが正しく投入されているか確認
    types.forEach(type => {
      console.log(`- ${type.id}: ${type.name_ja}`);
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
```

期待される出力:

```
✅ Residence types loaded: 8
- work_visa: 技術・人文知識・国際業務
- spouse_japanese: 日本人の配偶者等
- spouse_permanent: 永住者の配偶者等
- permanent_application: 永住申請準備
- student: 留学
- designated_activities: 特定活動
- skilled_worker: 特定技能
- other: その他
```

### CRUD操作のテスト

```typescript
import {
  ResidenceCardRepository,
  ChecklistRepository,
} from './src/services/database';

const testCRUD = async () => {
  const userId = 'test-user-001';

  try {
    // 1. 在留カード作成
    console.log('Creating residence card...');
    const card = await ResidenceCardRepository.create(userId, {
      residence_type_id: 'work_visa',
      expiry_date: '2027-12-31',
      memo: 'テスト用カード',
    });
    console.log('✅ Card created:', card.id);

    // 2. チェックリスト作成
    console.log('Creating checklist...');
    const items = await ChecklistRepository.createFromTemplates(
      card.id,
      'work_visa'
    );
    console.log('✅ Checklist created:', items.length, 'items');

    // 3. データ取得
    console.log('Fetching card details...');
    const details = await ResidenceCardRepository.findDetailsByUserId(userId);
    console.log('✅ Card details:', details[0]);

    // 4. 進捗確認
    const progress = await ChecklistRepository.getProgress(card.id);
    console.log('✅ Progress:', progress);

    console.log('All tests passed! 🎉');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
```

---

## 📱 プラットフォーム別の注意事項

### iOS

1. **Xcode インストール**（macOSのみ）
   ```bash
   xcode-select --install
   ```

2. **CocoaPods インストール**
   ```bash
   sudo gem install cocoapods
   cd ios
   pod install
   ```

3. **実行**
   ```bash
   npm run ios
   ```

### Android

1. **Android Studio インストール**
   - Android SDKをインストール
   - Android Emulatorを設定

2. **環境変数設定**
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

3. **実行**
   ```bash
   npm run android
   ```

### Web

Webプラットフォームでは `expo-sqlite` が動作しません。
代わりに以下の対応が必要:

1. **Web用のモック実装を作成**
   ```typescript
   // Platform-specific import
   import { Platform } from 'react-native';

   if (Platform.OS === 'web') {
     // Use IndexedDB or LocalStorage
     console.warn('SQLite is not available on web');
   }
   ```

2. **または、Webでの実行を無効化**
   ```bash
   # モバイルプラットフォームのみで実行
   npm run ios
   npm run android
   ```

---

## 🔧 トラブルシューティング

### エラー: "expo-sqlite module not found"

```bash
# キャッシュをクリアして再インストール
npm cache clean --force
rm -rf node_modules
npm install
```

### エラー: "Database initialization failed"

```typescript
// データベースをリセット
import { DatabaseService } from './src/services/database';

await DatabaseService.reset();
```

### エラー: "Encryption key not initialized"

```typescript
// 暗号化サービスを先に初期化
await EncryptionService.initialize();
await DatabaseService.initialize();
```

### メモが復号化されない

```typescript
// 暗号化キーが変更された可能性
// 開発環境ではデータベースをリセット
await DatabaseService.reset();
```

### パフォーマンスが遅い

```typescript
// インデックスを確認
const db = DatabaseService.getDatabase();
const indexes = await db.getAllAsync(`
  SELECT name FROM sqlite_master
  WHERE type = 'index'
`);
console.log('Indexes:', indexes);
```

---

## 📚 次のステップ

### 1. 使用例を確認

```bash
# 詳細な使用例
frontend/src/services/database/USAGE_EXAMPLE.tsx

# クイックリファレンス
frontend/src/services/database/QUICK_REFERENCE.md

# 完全なドキュメント
frontend/src/services/database/README.md
```

### 2. UI実装

```typescript
// 在留カード一覧画面
import { ResidenceCardRepository } from './src/services/database';

// チェックリスト画面
import { ChecklistRepository } from './src/services/database';

// 設定画面
import { ReminderRepository } from './src/services/database';
```

### 3. 通知機能の統合

```typescript
// expo-notifications と連携
import * as Notifications from 'expo-notifications';
import { ReminderRepository } from './src/services/database';

// リマインダー設定に基づいて通知をスケジュール
const settings = await ReminderRepository.findByUserId(userId);
if (settings.enabled && settings.notify_4months) {
  // 通知をスケジュール
}
```

---

## 🎓 学習リソース

### 公式ドキュメント

- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/)
- [React Native](https://reactnative.dev/)

### プロジェクトドキュメント

- データベース設計: `backend/database-design.md`
- セキュリティ設計: `backend/security-design.md`
- SQLスキーマ: `backend/sample-implementation/ddl/sqlite-schema.sql`

---

## 💡 開発のヒント

### 1. デバッグモードでSQL文を出力

```typescript
// DatabaseService.ts に追加
console.log('Executing SQL:', sql, params);
```

### 2. データベースファイルの場所

```typescript
import * as FileSystem from 'expo-file-system';

console.log('Database path:', FileSystem.documentDirectory + 'SQLite/visa_reminder.db');
```

### 3. パフォーマンス計測

```typescript
const start = Date.now();
const cards = await ResidenceCardRepository.findByUserId(userId);
console.log('Query took:', Date.now() - start, 'ms');
```

---

## ✅ チェックリスト

セットアップ完了の確認:

- [ ] Node.js と npm がインストールされている
- [ ] プロジェクトをクローンした
- [ ] `npm install` を実行した
- [ ] `App.tsx` を更新した
- [ ] アプリが起動した
- [ ] データベース初期化ログが表示された
- [ ] 在留資格マスタが取得できた
- [ ] CRUD操作が動作した

---

## 🆘 サポート

### 問い合わせ先

- GitHub Issues: [プロジェクトリポジトリ]
- Email: [サポートメール]

### よくある質問

**Q: Webでも動作しますか？**
A: 現在の実装はモバイル専用です。Webでは IndexedDB を使用する必要があります。

**Q: データのバックアップはどうすればよいですか？**
A: SQLiteファイルを直接コピーするか、エクスポート機能を実装してください。

**Q: 暗号化は本番環境でも十分ですか？**
A: 現在は簡易実装です。本番環境では `react-native-aes-crypto` の使用を推奨します。

---

**最終更新**: 2026年2月15日
**バージョン**: 1.0
