# データベースサービス - 在留資格更新リマインダー

このディレクトリには、React Native (Expo) アプリのローカルSQLiteデータベース実装が含まれています。

## 📋 目次

- [概要](#概要)
- [アーキテクチャ](#アーキテクチャ)
- [セットアップ](#セットアップ)
- [使用方法](#使用方法)
- [API リファレンス](#apiリファレンス)
- [セキュリティ](#セキュリティ)
- [トラブルシューティング](#トラブルシューティング)

## 概要

### 技術スタック

- **データベース**: SQLite (expo-sqlite)
- **暗号化**: expo-crypto
- **言語**: TypeScript
- **設計パターン**: Repository Pattern, Singleton Pattern

### 主な機能

- ✅ SQLiteデータベースの初期化とマイグレーション
- ✅ メモフィールドの自動暗号化/復号化
- ✅ 在留カード情報の管理 (CRUD)
- ✅ リマインダー設定の管理
- ✅ チェックリスト項目の管理
- ✅ マスタデータ (在留資格タイプ) の管理
- ✅ トランザクション対応
- ✅ エラーハンドリング

## アーキテクチャ

### ディレクトリ構成

```
src/services/database/
├── DatabaseService.ts           # データベース初期化・マイグレーション
├── EncryptionService.ts         # 暗号化・復号化サービス
├── ResidenceCardRepository.ts   # 在留カード CRUD
├── ReminderRepository.ts        # リマインダー設定 CRUD
├── ChecklistRepository.ts       # チェックリスト CRUD
├── ResidenceTypeRepository.ts   # 在留資格マスタ取得
├── index.ts                     # エクスポートファイル
└── README.md                    # このファイル
```

### データベーススキーマ

主なテーブル:

- `users` - ユーザー情報
- `residence_types` - 在留資格タイプマスタ
- `residence_cards` - 在留カード情報
- `checklist_templates` - チェックリストテンプレート
- `checklist_items` - チェックリスト項目
- `reminder_settings` - リマインダー設定
- `notification_logs` - 通知履歴
- `device_tokens` - デバイストークン

詳細は `backend/sample-implementation/ddl/sqlite-schema.sql` を参照してください。

## セットアップ

### 1. 依存関係のインストール

```bash
cd frontend
npm install
```

必要なパッケージ:
- `expo-sqlite` - SQLiteデータベース
- `expo-crypto` - 暗号化
- `uuid` - UUID生成

### 2. データベースの初期化

アプリ起動時に一度だけ初期化を実行します。

```typescript
import {
  DatabaseService,
  EncryptionService,
} from './src/services/database';

// App.tsx または index.tsx
async function initializeApp() {
  try {
    // 暗号化サービスを初期化
    await EncryptionService.initialize();

    // データベースを初期化
    await DatabaseService.initialize();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// アプリ起動時に実行
useEffect(() => {
  initializeApp();
}, []);
```

## 使用方法

### 基本的な使い方

すべてのリポジトリはシングルトンパターンで実装されています。

```typescript
import {
  ResidenceCardRepository,
  ReminderRepository,
  ChecklistRepository,
  ResidenceTypeRepository,
} from './src/services/database';

// リポジトリのインスタンスを取得
const cardRepo = ResidenceCardRepository;
const reminderRepo = ReminderRepository;
const checklistRepo = ChecklistRepository;
const typeRepo = ResidenceTypeRepository;
```

### 在留カードの管理

#### 在留カードを作成

```typescript
const newCard = await ResidenceCardRepository.create('user-id-123', {
  residence_type_id: 'work_visa',
  expiry_date: '2027-12-31',
  memo: '重要なメモ（自動的に暗号化されます）',
});

console.log('Created card:', newCard);
```

#### 在留カードを取得

```typescript
// IDで取得
const card = await ResidenceCardRepository.findById('card-id-123');

// ユーザーIDで取得（すべて）
const userCards = await ResidenceCardRepository.findByUserId('user-id-123');

// ユーザーIDで詳細取得（関連データ含む）
const cardDetails = await ResidenceCardRepository.findDetailsByUserId(
  'user-id-123'
);

// 期限切れ間近のカードを取得（90日以内）
const expiringCards = await ResidenceCardRepository.findExpiringSoon(
  'user-id-123',
  90
);
```

#### 在留カードを更新

```typescript
const updated = await ResidenceCardRepository.update('card-id-123', {
  expiry_date: '2028-12-31',
  memo: '更新されたメモ',
});
```

#### 在留カードを削除

```typescript
// 論理削除（deleted_at が設定される）
await ResidenceCardRepository.delete('card-id-123');

// 物理削除（開発用）
await ResidenceCardRepository.hardDelete('card-id-123');
```

### リマインダー設定の管理

#### リマインダー設定を取得

```typescript
// ユーザーの設定を取得（存在しない場合はデフォルト設定を作成）
const settings = await ReminderRepository.findByUserId('user-id-123');

console.log(settings);
// {
//   id: 'settings-id-123',
//   user_id: 'user-id-123',
//   enabled: true,
//   notify_4months: true,
//   notify_3months: true,
//   notify_1month: true,
//   notify_2weeks: true,
//   notification_time: '10:00:00',
//   ...
// }
```

#### リマインダー設定を更新

```typescript
const updated = await ReminderRepository.update('user-id-123', {
  enabled: true,
  notify_4months: true,
  notify_3months: false,
  notify_1month: true,
  notify_2weeks: true,
  notification_time: '09:00:00',
});
```

#### 通知が有効かチェック

```typescript
// リマインダー全体が有効か
const isEnabled = await ReminderRepository.isEnabled('user-id-123');

// 特定の通知タイプが有効か
const is4MonthsEnabled = await ReminderRepository.isNotificationEnabled(
  'user-id-123',
  '4months'
);
```

### チェックリストの管理

#### テンプレートから一括作成

```typescript
// 在留資格タイプに応じたチェックリストを自動作成
const items = await ChecklistRepository.createFromTemplates(
  'card-id-123',
  'work_visa'
);

console.log(`Created ${items.length} checklist items`);
```

#### チェックリスト項目を取得

```typescript
// 在留カードのすべてのチェックリスト項目
const items = await ChecklistRepository.findByResidenceCardId('card-id-123');

// カテゴリ別に取得
const categorized = await ChecklistRepository.findByCategory('card-id-123');

// ステータス別に取得
const completed = await ChecklistRepository.findByStatus(
  'card-id-123',
  'completed'
);
```

#### チェックリスト項目を更新

```typescript
// ステータスを更新
await ChecklistRepository.updateStatus('item-id-123', 'in_progress');

// 完了にする
await ChecklistRepository.complete('item-id-123');

// 未完了に戻す
await ChecklistRepository.uncomplete('item-id-123');

// メモを追加
await ChecklistRepository.update('item-id-123', {
  memo: 'メモを追加（自動的に暗号化されます）',
});
```

#### 進捗を取得

```typescript
const progress = await ChecklistRepository.getProgress('card-id-123');

console.log(progress);
// {
//   total: 10,
//   completed: 5,
//   in_progress: 2,
//   pending: 3,
//   completion_rate: 50.0
// }
```

### 在留資格マスタの取得

```typescript
// すべての有効な在留資格タイプを取得
const types = await ResidenceTypeRepository.findAll();

// IDで取得
const workVisa = await ResidenceTypeRepository.findById('work_visa');

console.log(workVisa);
// {
//   id: 'work_visa',
//   name_ja: '技術・人文知識・国際業務',
//   name_en: 'Engineer/Specialist in Humanities/International Services',
//   application_months_before: 4,
//   ...
// }

// 存在チェック
const exists = await ResidenceTypeRepository.exists('work_visa');
```

## API リファレンス

### DatabaseService

データベースの初期化とマイグレーション管理

```typescript
class DatabaseService {
  // データベースを初期化
  initialize(): Promise<void>;

  // データベースインスタンスを取得
  getDatabase(): SQLite.SQLiteDatabase;

  // データベースをクローズ
  close(): Promise<void>;

  // データベースをリセット（開発用）
  reset(): Promise<void>;
}
```

### EncryptionService

データの暗号化・復号化

```typescript
class EncryptionService {
  // 暗号化サービスを初期化
  initialize(key?: string): Promise<void>;

  // データを暗号化
  encrypt(plaintext: string): Promise<string>;

  // データを復号化
  decrypt(encryptedData: string): Promise<string>;

  // 暗号化キーを取得
  getEncryptionKey(): string | null;

  // キーをクリア
  clearKey(): void;
}
```

### ResidenceCardRepository

在留カードのCRUD操作

```typescript
class ResidenceCardRepository {
  // 作成
  create(userId: string, input: CreateResidenceCardInput): Promise<ResidenceCardDecrypted>;

  // 取得
  findById(id: string): Promise<ResidenceCardDecrypted | null>;
  findByUserId(userId: string): Promise<ResidenceCardDecrypted[]>;
  findDetailsByUserId(userId: string): Promise<ResidenceCardDetail[]>;
  findExpiringSoon(userId: string, daysThreshold?: number): Promise<ResidenceCardDecrypted[]>;

  // 更新
  update(id: string, input: UpdateResidenceCardInput): Promise<ResidenceCardDecrypted>;

  // 削除
  delete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
}
```

### ReminderRepository

リマインダー設定のCRUD操作

```typescript
class ReminderRepository {
  // 取得（存在しない場合はデフォルト作成）
  findByUserId(userId: string): Promise<ReminderSettings>;

  // 更新
  update(userId: string, input: UpdateReminderSettingsInput): Promise<ReminderSettings>;

  // 削除
  delete(userId: string): Promise<void>;

  // チェック
  isEnabled(userId: string): Promise<boolean>;
  isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean>;
}
```

### ChecklistRepository

チェックリスト項目のCRUD操作

```typescript
class ChecklistRepository {
  // テンプレート取得
  findTemplatesByResidenceType(residenceTypeId: string): Promise<ChecklistTemplate[]>;
  findTemplatesByCategory(residenceTypeId: string): Promise<Map<string, ChecklistTemplate[]>>;

  // 作成
  create(input: CreateChecklistItemInput): Promise<ChecklistItemDecrypted>;
  createFromTemplates(residenceCardId: string, residenceTypeId: string): Promise<ChecklistItemDecrypted[]>;

  // 取得
  findById(id: string): Promise<ChecklistItemDecrypted | null>;
  findByResidenceCardId(residenceCardId: string): Promise<ChecklistItemDecrypted[]>;
  findByCategory(residenceCardId: string): Promise<Map<string, ChecklistItemDecrypted[]>>;
  findByStatus(residenceCardId: string, status: ChecklistItemStatus): Promise<ChecklistItemDecrypted[]>;

  // 更新
  update(id: string, input: UpdateChecklistItemInput): Promise<ChecklistItemDecrypted>;
  updateStatus(id: string, status: ChecklistItemStatus): Promise<ChecklistItemDecrypted>;
  complete(id: string): Promise<ChecklistItemDecrypted>;
  uncomplete(id: string): Promise<ChecklistItemDecrypted>;

  // 削除
  delete(id: string): Promise<void>;
  deleteByResidenceCardId(residenceCardId: string): Promise<void>;

  // 進捗取得
  getProgress(residenceCardId: string): Promise<ChecklistProgress>;
}
```

### ResidenceTypeRepository

在留資格マスタの取得

```typescript
class ResidenceTypeRepository {
  // すべての有効な在留資格タイプを取得
  findAll(): Promise<ResidenceType[]>;

  // IDで取得
  findById(id: string): Promise<ResidenceType | null>;

  // 存在チェック
  exists(id: string): Promise<boolean>;
}
```

## セキュリティ

### 暗号化

#### 対象フィールド

- `residence_cards.memo` - ユーザーメモ
- `checklist_items.memo` - チェックリスト項目のメモ

#### 暗号化方式

- **アルゴリズム**: AES-256 + XOR (簡易実装)
- **キー長**: 256ビット (32バイト)
- **IV**: ランダム生成 (16バイト)

#### 注意事項

現在の実装は `expo-crypto` の制約により簡易的な暗号化を使用しています。
本番環境では以下のライブラリの使用を推奨します:

- `react-native-aes-crypto` - 完全なAES-GCM実装
- `react-native-keychain` - iOS Keychain / Android Keystore 統合

### データ保護

1. **機密情報の最小化**
   - 在留カード番号は保存しない
   - 氏名・住所は保存しない
   - 必要最小限のデータのみ保存

2. **論理削除**
   - `deleted_at` を使用した論理削除
   - データの復旧が可能

3. **外部キー制約**
   - CASCADE DELETE で関連データを自動削除
   - データの整合性を保証

## トラブルシューティング

### データベースが初期化されない

```typescript
// エラー: Database not initialized
try {
  await DatabaseService.initialize();
} catch (error) {
  console.error('Database initialization failed:', error);
  // アプリを再起動するか、データベースをリセット
  await DatabaseService.reset();
}
```

### 暗号化キーが見つからない

```typescript
// エラー: Encryption key not initialized
await EncryptionService.initialize();

// または、既存のキーを使用
const savedKey = await loadKeyFromSecureStorage();
await EncryptionService.initialize(savedKey);
```

### マイグレーションエラー

```typescript
// データベースをリセット（開発環境のみ）
await DatabaseService.reset();

// 本番環境では手動でマイグレーションを実行
```

### データの復号化エラー

```typescript
try {
  const card = await ResidenceCardRepository.findById('card-id');
  console.log(card.memo); // 自動的に復号化される
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error('Failed to decrypt data:', error);
    // キーが変更された、またはデータが破損している可能性
  }
}
```

## 開発者向けTips

### データベースのリセット

```typescript
// 開発中にデータベースをリセット
await DatabaseService.reset();
```

### SQLクエリのデバッグ

```typescript
const db = DatabaseService.getDatabase();

// 直接SQLを実行
const result = await db.getAllAsync('SELECT * FROM residence_cards');
console.log(result);
```

### パフォーマンス最適化

```typescript
// バッチ挿入
const db = DatabaseService.getDatabase();
await db.execAsync(`
  BEGIN TRANSACTION;
  INSERT INTO checklist_items (...) VALUES (...);
  INSERT INTO checklist_items (...) VALUES (...);
  COMMIT;
`);
```

## ライセンス

MIT License

## サポート

質問やバグ報告は GitHub Issues までお願いします。
