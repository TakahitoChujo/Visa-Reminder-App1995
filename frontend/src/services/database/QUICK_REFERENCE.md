# クイックリファレンス - データベースサービス

## 🚀 初期化（アプリ起動時に1回）

```typescript
import { DatabaseService, EncryptionService } from './src/services/database';

await EncryptionService.initialize();
await DatabaseService.initialize();
```

## 📝 在留カード

### 作成

```typescript
import { ResidenceCardRepository } from './src/services/database';

const card = await ResidenceCardRepository.create('user-id', {
  residence_type_id: 'work_visa',
  expiry_date: '2027-12-31',
  memo: 'メモ',
});
```

### 取得

```typescript
// IDで取得
const card = await ResidenceCardRepository.findById('card-id');

// ユーザーIDで取得
const cards = await ResidenceCardRepository.findByUserId('user-id');

// 詳細取得（関連データ含む）
const details = await ResidenceCardRepository.findDetailsByUserId('user-id');

// 期限切れ間近（90日以内）
const expiring = await ResidenceCardRepository.findExpiringSoon('user-id', 90);
```

### 更新

```typescript
await ResidenceCardRepository.update('card-id', {
  expiry_date: '2028-12-31',
  memo: '更新メモ',
});
```

### 削除

```typescript
// 論理削除
await ResidenceCardRepository.delete('card-id');

// 物理削除（開発用）
await ResidenceCardRepository.hardDelete('card-id');
```

## ✅ チェックリスト

### テンプレートから作成

```typescript
import { ChecklistRepository } from './src/services/database';

const items = await ChecklistRepository.createFromTemplates(
  'card-id',
  'work_visa'
);
```

### 取得

```typescript
// すべて取得
const items = await ChecklistRepository.findByResidenceCardId('card-id');

// カテゴリ別
const byCategory = await ChecklistRepository.findByCategory('card-id');

// ステータス別
const completed = await ChecklistRepository.findByStatus('card-id', 'completed');

// 進捗取得
const progress = await ChecklistRepository.getProgress('card-id');
// => { total: 10, completed: 5, in_progress: 2, pending: 3, completion_rate: 50.0 }
```

### 更新

```typescript
// 完了にする
await ChecklistRepository.complete('item-id');

// 未完了に戻す
await ChecklistRepository.uncomplete('item-id');

// ステータス変更
await ChecklistRepository.updateStatus('item-id', 'in_progress');

// メモ追加
await ChecklistRepository.update('item-id', {
  memo: 'メモ',
});
```

### 削除

```typescript
// 1件削除
await ChecklistRepository.delete('item-id');

// カードのすべての項目を削除
await ChecklistRepository.deleteByResidenceCardId('card-id');
```

## 🔔 リマインダー設定

### 取得（存在しない場合は自動作成）

```typescript
import { ReminderRepository } from './src/services/database';

const settings = await ReminderRepository.findByUserId('user-id');
```

### 更新

```typescript
await ReminderRepository.update('user-id', {
  enabled: true,
  notify_4months: true,
  notify_3months: false,
  notify_1month: true,
  notify_2weeks: true,
  notification_time: '09:00:00',
});
```

### チェック

```typescript
// リマインダーが有効か
const enabled = await ReminderRepository.isEnabled('user-id');

// 特定の通知が有効か
const is4Months = await ReminderRepository.isNotificationEnabled(
  'user-id',
  '4months'
);
```

## 📖 在留資格マスタ

### すべて取得

```typescript
import { ResidenceTypeRepository } from './src/services/database';

const types = await ResidenceTypeRepository.findAll();
```

### IDで取得

```typescript
const workVisa = await ResidenceTypeRepository.findById('work_visa');
```

### 存在チェック

```typescript
const exists = await ResidenceTypeRepository.exists('work_visa');
```

## 🔒 暗号化（手動使用時）

```typescript
import { EncryptionService } from './src/services/database';

// 暗号化
const encrypted = await EncryptionService.encrypt('平文');

// 復号化
const decrypted = await EncryptionService.decrypt(encrypted);
```

## 🛠️ 開発用ユーティリティ

### データベースリセット

```typescript
import { DatabaseService } from './src/services/database';

// すべてのデータを削除して再初期化
await DatabaseService.reset();
```

### 直接SQLを実行

```typescript
const db = DatabaseService.getDatabase();

// SELECT
const results = await db.getAllAsync('SELECT * FROM residence_cards');

// INSERT/UPDATE/DELETE
await db.runAsync('DELETE FROM checklist_items WHERE id = ?', ['item-id']);
```

## 📊 データ型

### CreateResidenceCardInput

```typescript
{
  residence_type_id: string;  // 'work_visa', 'spouse_japanese', etc.
  expiry_date: string;        // 'YYYY-MM-DD'
  memo?: string;              // オプション
}
```

### UpdateResidenceCardInput

```typescript
{
  residence_type_id?: string;
  expiry_date?: string;       // 'YYYY-MM-DD'
  memo?: string;
  is_active?: boolean;
}
```

### ChecklistItemStatus

```typescript
type ChecklistItemStatus = 'pending' | 'in_progress' | 'completed';
```

### NotificationType

```typescript
type NotificationType = '4months' | '3months' | '1month' | '2weeks';
```

## ⚠️ エラーハンドリング

```typescript
import { DatabaseError, EncryptionError } from './src/services/database';

try {
  const card = await ResidenceCardRepository.findById('card-id');
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('Database error:', error.code, error.message);
  } else if (error instanceof EncryptionError) {
    console.error('Encryption error:', error.message);
  }
}
```

## 📦 在留資格タイプ一覧

| ID | 日本語名 | 申請可能月数前 |
|----|---------|--------------|
| work_visa | 技術・人文知識・国際業務 | 4ヶ月 |
| spouse_japanese | 日本人の配偶者等 | 4ヶ月 |
| spouse_permanent | 永住者の配偶者等 | 4ヶ月 |
| permanent_application | 永住申請準備 | 6ヶ月 |
| student | 留学 | 4ヶ月 |
| designated_activities | 特定活動 | 4ヶ月 |
| skilled_worker | 特定技能 | 4ヶ月 |
| other | その他 | 4ヶ月 |

## 🎯 よくある操作パターン

### パターン1: 新規ユーザーのセットアップ

```typescript
// 1. 在留カード作成
const card = await ResidenceCardRepository.create(userId, {
  residence_type_id: 'work_visa',
  expiry_date: '2027-12-31',
});

// 2. チェックリスト作成
await ChecklistRepository.createFromTemplates(card.id, 'work_visa');

// 3. リマインダー設定確認（自動作成される）
const settings = await ReminderRepository.findByUserId(userId);
```

### パターン2: ダッシュボード表示用データ取得

```typescript
// 詳細データを取得（関連データすべて含む）
const cards = await ResidenceCardRepository.findDetailsByUserId(userId);

for (const card of cards) {
  console.log('有効期限:', card.expiry_date);
  console.log('残り日数:', card.days_until_expiry);
  console.log('緊急度:', card.urgency_level);
  console.log('進捗:', card.checklist_progress?.completion_rate + '%');
}
```

### パターン3: チェックリスト完了処理

```typescript
// 1. 項目を完了にする
await ChecklistRepository.complete(itemId);

// 2. 進捗を取得
const progress = await ChecklistRepository.getProgress(cardId);

// 3. すべて完了したか確認
if (progress.completion_rate === 100) {
  console.log('すべてのチェックリストが完了しました！');
}
```

---

詳細は `README.md` を参照してください。
