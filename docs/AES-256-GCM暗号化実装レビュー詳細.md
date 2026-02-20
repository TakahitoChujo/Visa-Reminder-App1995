# AES-256-GCM暗号化実装 詳細レビュー

**プロジェクト名**: 在留資格更新リマインダーアプリ
**レビュー対象**: EncryptionService.ts, SecureStorageService.ts, ResidenceCardRepository.ts, ChecklistRepository.ts
**レビュー実施日**: 2026-02-17
**レビュアー**: QA/Security Team

---

## 実装コードレビュー

### 1. EncryptionService.ts

#### 実装概要

AES-256-GCMを使用したメモフィールドの暗号化・復号化サービス。`@noble/ciphers`ライブラリを使用し、クロスプラットフォーム対応。

#### レビュー結果

##### ✅ 良い点

1. **暗号化アルゴリズム**
   - AES-256-GCMを採用（認証付き暗号化） ✅
   - IVサイズ: 12バイト（GCMの推奨サイズ） ✅
   - キーサイズ: 32バイト（256ビット） ✅

2. **バージョン管理**
   - v1（XOR）とv2（AES-GCM）の自動判定機能 ✅
   - `detectEncryptionVersion()` メソッドで形式を判定 ✅
   - 後方互換性を維持 ✅

3. **エラーハンドリング**
   - カスタムエラー（`EncryptionError`）を使用 ✅
   - ユーザー向けメッセージが日本語で分かりやすい ✅
   - 機密情報がエラーメッセージに含まれない ✅

4. **セキュリティ**
   - IVは毎回ランダム生成（`Crypto.getRandomBytesAsync(12)`） ✅
   - 暗号化キーは `getEncryptionKey()` でのみ取得可能 ✅
   - キーはメモリ上で管理し、ログに出力しない ✅

##### ⚠️ 改善提案

1. **v1復号化の削除時期**
   - 現在: v1（XOR）復号化をサポート
   - 提案: 移行期間（3ヶ月）後に v1 復号化を削除
   - 理由: セキュリティリスクを最小化

2. **キーローテーション**
   - 現在: キーローテーション機能なし
   - 提案: 将来的にキーローテーション機能を追加
   - 理由: セキュリティベストプラクティス

#### コードスニペット分析

```typescript
// ✅ 良い実装: IVのランダム生成
const iv = await Crypto.getRandomBytesAsync(12);

// ✅ 良い実装: AES-GCMで暗号化
const aes = gcm(keyBytes, iv);
const ciphertext = aes.encrypt(plaintextBytes);

// ✅ 良い実装: バージョン検出
public detectEncryptionVersion(encryptedData: string): 'v2' | 'v1' | 'invalid' {
  const parts = encryptedData.split(':');
  if (parts.length === 3 && parts[0] === 'v2') return 'v2';
  if (parts.length === 2 && parts[0].length === 32) return 'v1';
  return 'invalid';
}
```

---

### 2. SecureStorageService.ts

#### 実装概要

暗号化キーをプラットフォームごとに安全に保存するサービス。iOS/AndroidではSecure Store、Web版ではIndexedDBを使用。

#### レビュー結果

##### ✅ 良い点

1. **プラットフォーム対応**
   - iOS: `expo-secure-store` (Keychain) ✅
   - Android: `expo-secure-store` (Keystore) ✅
   - Web: `IndexedDB` (localStorageよりセキュア) ✅

2. **フォールバック機構**
   - IndexedDB初期化失敗時に sessionStorage を使用 ✅
   - 最終手段として localStorage を使用 ✅

3. **セキュリティ警告**
   - Web版で初回起動時に警告メッセージを表示 ✅
   - `sessionStorage` で警告表示済みフラグを管理 ✅

4. **エラーハンドリング**
   - すべてのメソッドで try-catch を使用 ✅
   - エラーログを `console.error` に出力 ✅

##### ⚠️ 改善提案

1. **Web版のセキュリティ強化**
   - 現在: IndexedDB
   - 提案: Web Crypto API + SubtleCrypto の検討
   - 理由: より高いセキュリティレベル

2. **暗号化キーの暗号化**
   - 現在: キーを平文で保存（iOS/Androidでは Secure Store が暗号化）
   - 提案: Web版でもキーを暗号化して保存
   - 理由: セキュリティの多層化

#### コードスニペット分析

```typescript
// ✅ 良い実装: IndexedDBの使用
class IndexedDBKeyStore {
  private dbName = 'SecureKeyStore';
  private storeName = 'keys';

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      // ... 初期化処理
    });
  }
}

// ✅ 良い実装: プラットフォーム判定
if (Platform.OS === 'web') {
  // IndexedDB or sessionStorage
} else {
  // expo-secure-store (iOS/Android)
}

// ✅ 良い実装: セキュリティ警告
private showWebSecurityWarning(): void {
  console.warn(
    'Web版では暗号化のセキュリティレベルがネイティブアプリより低くなります。'
  );
}
```

---

### 3. ResidenceCardRepository.ts

#### 実装概要

在留カード情報のCRUD操作を提供するリポジトリ。メモフィールドを暗号化して保存。

#### レビュー結果

##### ✅ 良い点

1. **自動暗号化・復号化**
   - `create()`: メモを自動暗号化 ✅
   - `update()`: メモを自動暗号化 ✅
   - `findById()`, `findByUserId()`: メモを自動復号化 ✅

2. **自動移行機能**
   - `decryptCard()` メソッドでv1→v2への自動移行 ✅
   - 移行成功時にログ出力 ✅
   - 移行失敗時もデータを返す（ロールバック不要） ✅

3. **エラーハンドリング**
   - データベースエラーを `DatabaseError` でラップ ✅
   - エラーメッセージが日本語で分かりやすい ✅

##### ⚠️ 改善提案

1. **移行ログの改善**
   - 現在: `console.log` でログ出力
   - 提案: 移行統計（成功件数、失敗件数）を記録
   - 理由: 移行状況を把握しやすくする

2. **移行失敗時の再試行**
   - 現在: 移行失敗時は復号化データのみ返す
   - 提案: 移行失敗時に再試行機構を追加
   - 理由: データの一貫性を保つ

#### コードスニペット分析

```typescript
// ✅ 良い実装: 自動暗号化
const encryptedMemo = input.memo
  ? await this.encryptionService.encrypt(input.memo)
  : null;

// ✅ 良い実装: 自動移行
private async decryptCard(card: ResidenceCard): Promise<ResidenceCardDecrypted> {
  if (card.memo) {
    const version = this.encryptionService.detectEncryptionVersion(card.memo);
    const decryptedMemo = await this.encryptionService.decrypt(card.memo);

    // v1データの場合、v2に自動移行
    if (version === 'v1') {
      const newEncrypted = await this.encryptionService.encrypt(decryptedMemo);
      await db.runAsync(
        `UPDATE residence_cards SET memo = ? WHERE id = ?`,
        [newEncrypted, card.id]
      );
      console.log(`[Migration] Card ${card.id}: v1 → v2 ✓`);
    }
  }
  return { ...card, memo: decryptedMemo };
}
```

---

### 4. ChecklistRepository.ts

#### 実装概要

チェックリスト項目のCRUD操作を提供するリポジトリ。メモフィールドを暗号化して保存。

#### レビュー結果

##### ✅ 良い点

1. **自動暗号化・復号化**
   - ResidenceCardRepositoryと同様の実装 ✅
   - メモの自動暗号化・復号化 ✅

2. **自動移行機能**
   - v1→v2への自動移行 ✅
   - 移行ログ出力 ✅

3. **一貫性**
   - ResidenceCardRepositoryと同じパターンを使用 ✅
   - コードの保守性が高い ✅

##### ⚠️ 改善提案

1. **共通化**
   - 現在: ResidenceCardRepositoryとChecklistRepositoryで同じロジックを重複
   - 提案: 暗号化・復号化ロジックをベースクラスに抽出
   - 理由: DRY原則、保守性向上

#### コードスニペット分析

```typescript
// ✅ 良い実装: ResidenceCardRepositoryと同じパターン
private async decryptItem(item: ChecklistItem): Promise<ChecklistItemDecrypted> {
  if (item.memo) {
    const version = this.encryptionService.detectEncryptionVersion(item.memo);
    const decryptedMemo = await this.encryptionService.decrypt(item.memo);

    if (version === 'v1') {
      // v2に自動移行
      const newEncrypted = await this.encryptionService.encrypt(decryptedMemo);
      await db.runAsync(
        `UPDATE checklist_items SET memo = ? WHERE id = ?`,
        [newEncrypted, item.id]
      );
      console.log(`[Migration] Checklist item ${item.id}: v1 → v2 ✓`);
    }
  }
  return { ...item, memo: decryptedMemo };
}
```

---

## セキュリティ設計書との整合性チェック

### 要件との比較

| 要件 | 設計書 | 実装 | 判定 |
|------|--------|------|------|
| **暗号化アルゴリズム** | AES-256-GCM | AES-256-GCM ✅ | ✅ PASS |
| **キー長** | 256ビット | 256ビット ✅ | ✅ PASS |
| **IV長** | 12バイト | 12バイト ✅ | ✅ PASS |
| **ライブラリ** | @noble/ciphers | @noble/ciphers ✅ | ✅ PASS |
| **キー保存（iOS）** | Keychain | expo-secure-store (Keychain) ✅ | ✅ PASS |
| **キー保存（Android）** | Keystore | expo-secure-store (Keystore) ✅ | ✅ PASS |
| **キー保存（Web）** | IndexedDB | IndexedDB ✅ | ✅ PASS |
| **後方互換性** | v1→v2移行 | 自動移行機能 ✅ | ✅ PASS |
| **エラーハンドリング** | 情報漏洩防止 | 機密情報をエラーメッセージに含まない ✅ | ✅ PASS |

---

## コード品質評価

### TypeScript型安全性

- ✅ すべての関数に型定義あり
- ✅ `as never`, `@ts-ignore` の使用なし
- ✅ strictモード有効

### コード可読性

- ✅ コメントが適切に記載されている
- ✅ メソッド名が分かりやすい
- ✅ 一貫性のあるコーディングスタイル

### パフォーマンス

- ✅ 暗号化・復号化が同期的ではなく非同期（`async/await`）
- ✅ シングルトンパターンでインスタンス管理
- ⚠️ 大量データの移行処理は未テスト（今後のパフォーマンステストで確認）

---

## 総合評価

### セキュリティ評価

✅ **合格（リリース可能）**

すべてのセキュリティ要件を満たしており、実装品質は高い。

### 品質評価

✅ **高品質**

TypeScript型安全性、コード可読性、エラーハンドリングがすべて適切。

---

## 次のアクションアイテム

### 優先度: High

1. ✅ Critical優先度テスト完了
2. ⏳ High優先度テスト実施（パフォーマンス、タイミング攻撃）
3. ⏳ コードカバレッジ測定（目標: 80%以上）

### 優先度: Medium

1. ⏳ 外部セキュリティレビュー
2. ⏳ Web版のセキュリティ強化（Web Crypto API検討）
3. ⏳ 暗号化・復号化ロジックの共通化（リファクタリング）

### 優先度: Low

1. ⏳ v1復号化の削除（移行期間終了後）
2. ⏳ キーローテーション機能の追加
3. ⏳ 移行統計の記録機能

---

**レビュー作成日**: 2026-02-17
**最終更新日**: 2026-02-17
**バージョン**: 1.0
