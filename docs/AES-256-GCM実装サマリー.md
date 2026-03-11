# AES-256-GCM実装サマリー（クイックスタート）

**作成日**: 2026-02-17
**対象**: フロントエンドエンジニア
**所要時間**: 2-3時間

---

## 🎯 実装の全体像

XOR暗号化（脆弱）→ AES-256-GCM（NIST準拠の強固な暗号化）への移行

---

## 📦 必要なライブラリ

### インストール

```bash
cd frontend
npm install @noble/ciphers@^2.1.1
```

### 選定理由

- ✅ React Native + Web版の両方で動作（Pure TypeScript）
- ✅ セキュリティ監査済み（Trail of Bits, 2023年）
- ✅ AES-256-GCMの完全サポート
- ✅ 軽量（~10KB gzipped）
- ✅ TypeScript完全対応

---

## 🔧 実装ファイル

### 1. EncryptionService.ts（メイン変更）

**場所**: `frontend/src/services/database/EncryptionService.ts`

#### 追加インポート

```typescript
import { gcm } from '@noble/ciphers/aes';
import * as Crypto from 'expo-crypto';
```

#### 主要メソッド

```typescript
/**
 * v2暗号化（新規実装）
 */
private async encryptV2(plaintext: string): Promise<string> {
  // 1. IVを生成（12バイト）
  const iv = await Crypto.getRandomBytesAsync(12);

  // 2. キー・平文をバイト配列に変換
  const keyBytes = this.hexToBytes(this.encryptionKey!);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // 3. AES-GCM暗号化
  const aes = gcm(keyBytes, iv);
  const ciphertext = aes.encrypt(plaintextBytes);

  // 4. 出力: "v2:iv:ciphertext"
  return `v2:${this.bytesToHex(iv)}:${this.bytesToHex(ciphertext)}`;
}

/**
 * v2復号化（新規実装）
 */
private async decryptV2(encryptedData: string): Promise<string> {
  // 1. データ分解
  const [, ivHex, ciphertextHex] = encryptedData.split(':');

  // 2. Hex → バイト配列
  const iv = this.hexToBytes(ivHex);
  const ciphertext = this.hexToBytes(ciphertextHex);
  const keyBytes = this.hexToBytes(this.encryptionKey!);

  // 3. AES-GCM復号化（authTag自動検証）
  const aes = gcm(keyBytes, iv);
  const plaintextBytes = aes.decrypt(ciphertext);

  // 4. バイト配列 → 文字列
  const decoder = new TextDecoder();
  return decoder.decode(plaintextBytes);
}

/**
 * v1復号化（既存ロジックをリネーム）
 */
private async decryptV1(encryptedData: string): Promise<string> {
  // 既存のXOR復号化ロジック（変更なし）
  // ...
}

/**
 * バージョン検出（新規実装）
 */
private detectEncryptionVersion(encryptedData: string): 'v2' | 'v1' | 'invalid' {
  const parts = encryptedData.split(':');

  // v2: "v2:iv:ciphertext"（3パート）
  if (parts.length === 3 && parts[0] === 'v2') return 'v2';

  // v1: "iv:ciphertext"（2パート、IV=32文字）
  if (parts.length === 2 && parts[0].length === 32) return 'v1';

  return 'invalid';
}

/**
 * encrypt()の更新（v2を使用）
 */
public async encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  if (!this.encryptionKey) {
    throw new EncryptionError('暗号化キーが初期化されていません');
  }

  return this.encryptV2(plaintext); // ✅ v2を使用
}

/**
 * decrypt()の更新（自動バージョン判定）
 */
public async decrypt(encryptedData: string): Promise<string> {
  if (!encryptedData) return '';
  if (!this.encryptionKey) {
    throw new EncryptionError('暗号化キーが初期化されていません');
  }

  const version = this.detectEncryptionVersion(encryptedData);

  if (version === 'v2') return this.decryptV2(encryptedData);
  if (version === 'v1') return this.decryptV1(encryptedData);

  throw new EncryptionError('データの復号化に失敗しました');
}
```

---

### 2. SecureStorageService.ts（Web版改善）

**場所**: `frontend/src/services/SecureStorageService.ts`

#### IndexedDB実装（Web版）

```typescript
/**
 * IndexedDB Manager（Web版のみ）
 */
class IndexedDBKeyStore {
  private dbName = 'SecureKeyStore';
  private storeName = 'keys';
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(new Error('IndexedDB初期化失敗'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async saveKey(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB未初期化');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('キー保存失敗'));
    });
  }

  async getKey(key: string): Promise<string | null> {
    if (!this.db) throw new Error('IndexedDB未初期化');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('キー取得失敗'));
    });
  }

  async deleteKey(key: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB未初期化');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('キー削除失敗'));
    });
  }
}
```

#### SecureStorageServiceの更新

```typescript
export class SecureStorageService {
  private static instance: SecureStorageService;
  private indexedDBStore: IndexedDBKeyStore | null = null;

  async initialize(): Promise<void> {
    if (Platform.OS === 'web') {
      this.indexedDBStore = new IndexedDBKeyStore();
      await this.indexedDBStore.initialize();
    }
  }

  async saveEncryptionKey(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (!this.indexedDBStore) throw new Error('IndexedDB未初期化');
      await this.indexedDBStore.saveKey(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
    } else {
      await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
    }
  }

  async getEncryptionKey(): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (!this.indexedDBStore) throw new Error('IndexedDB未初期化');
      return await this.indexedDBStore.getKey(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
    } else {
      return await SecureStore.getItemAsync(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
    }
  }
}
```

---

### 3. Repository層での自動移行

**場所**: `frontend/src/services/database/ResidenceCardRepository.ts`

```typescript
/**
 * 在留カード取得時に自動移行
 */
async getById(id: string): Promise<ResidenceCardDecrypted | null> {
  const card = await this.db.getResidenceCard(id);
  if (!card) return null;

  if (card.memo) {
    const version = encryptionService.detectEncryptionVersion(card.memo);
    const decryptedMemo = await encryptionService.decrypt(card.memo);

    // v1データを検出した場合、v2に移行
    if (version === 'v1') {
      const newEncrypted = await encryptionService.encrypt(decryptedMemo);
      await this.db.updateResidenceCard(id, { memo: newEncrypted });
      console.log(`[Migration] Card ${id}: v1 → v2`);
    }

    return { ...card, memo: decryptedMemo };
  }

  return card as ResidenceCardDecrypted;
}
```

**同様の処理をChecklistRepositoryにも追加**

---

## 🧪 テストコード

**場所**: `frontend/src/services/database/__tests__/EncryptionService.test.ts`

```typescript
describe('EncryptionService - AES-256-GCM', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    service = EncryptionService.getInstance();
    await service.initialize();
  });

  test('暗号化・復号化が正常動作', async () => {
    const plaintext = 'テストメモ';
    const encrypted = await service.encrypt(plaintext);
    const decrypted = await service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  test('暗号化データは毎回異なる（IV再利用なし）', async () => {
    const plaintext = 'テストメモ';
    const enc1 = await service.encrypt(plaintext);
    const enc2 = await service.encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
  });

  test('改ざん検出が動作する', async () => {
    const encrypted = await service.encrypt('テストメモ');
    const tampered = encrypted.slice(0, -4) + 'ffff';
    await expect(service.decrypt(tampered)).rejects.toThrow();
  });

  test('v2形式として検出される', async () => {
    const encrypted = await service.encrypt('テストメモ');
    expect(service.detectEncryptionVersion(encrypted)).toBe('v2');
  });

  test('v1データを復号化できる', async () => {
    // 実際のv1データでテスト
    const v1Data = '...'; // 既存データから取得
    const decrypted = await service.decrypt(v1Data);
    expect(decrypted).toBeTruthy();
  });

  test('Unicode文字が正しく処理される', async () => {
    const plaintext = '在留カード📝🇯🇵';
    const encrypted = await service.encrypt(plaintext);
    const decrypted = await service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
```

---

## ⚠️ 注意事項

### セキュリティ

1. **IVは絶対に再利用しない**
   - `getRandomBytesAsync(12)` で毎回生成
   - 同じキー + IVの組み合わせは1回限り

2. **エラーメッセージを統一**
   ```typescript
   // ❌ 悪い例
   throw new Error('Invalid IV length: expected 12, got 16');

   // ✅ 良い例
   throw new EncryptionError('データの復号化に失敗しました');
   ```

3. **Web版のリスクを通知**
   - IndexedDBもXSS攻撃のリスクあり
   - 機密性の高いメモは推奨しないことを明示

### 移行戦略

1. **段階的移行**
   - データ読み取り時に自動的にv1 → v2
   - 一括移行は不要（パフォーマンス影響なし）

2. **既存データは削除しない**
   - 移行失敗時も旧形式で読み取り可能
   - ロールバックが容易

3. **移行ログを記録**
   ```typescript
   console.log(`[Migration] Card ${id}: v1 → v2`);
   ```

---

## 📋 実装チェックリスト

- [ ] `@noble/ciphers` をインストール
- [ ] `EncryptionService.ts` を更新
  - [ ] `encryptV2()` 実装
  - [ ] `decryptV2()` 実装
  - [ ] `decryptV1()` リネーム
  - [ ] `detectEncryptionVersion()` 実装
  - [ ] `encrypt()` / `decrypt()` 更新
- [ ] `SecureStorageService.ts` を更新（Web版）
  - [ ] `IndexedDBKeyStore` 実装
  - [ ] `initialize()` 更新
  - [ ] `saveEncryptionKey()` 更新
  - [ ] `getEncryptionKey()` 更新
- [ ] Repository層に移行ロジック追加
  - [ ] `ResidenceCardRepository.ts`
  - [ ] `ChecklistRepository.ts`
- [ ] テストコード作成
  - [ ] 暗号化・復号化テスト
  - [ ] 改ざん検出テスト
  - [ ] v1データの復号化テスト
  - [ ] Unicode文字テスト
- [ ] 動作確認
  - [ ] 新規データの暗号化
  - [ ] 既存データの復号化（v1）
  - [ ] 自動移行の動作確認
  - [ ] Web版での動作確認
- [ ] コードレビュー
  - [ ] セキュリティレビュー
  - [ ] パフォーマンステスト

---

## 🚀 デプロイ手順

1. **開発環境でテスト**
   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

2. **ステージング環境でテスト**
   - 実際のv1データで移行テスト
   - パフォーマンス計測（大量データ）

3. **本番環境へデプロイ**
   - バージョンアップ（例: 1.0.0 → 1.1.0）
   - リリースノートに「セキュリティ強化」を記載

4. **モニタリング**
   - エラーログの監視
   - 移行完了率の確認

---

## 🆘 トラブルシューティング

### エラー: "IndexedDB初期化失敗"

**原因**: Web版でIndexedDBが無効化されている

**解決策**:
```typescript
// フォールバック: sessionStorageを使用
if (Platform.OS === 'web') {
  sessionStorage.setItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
}
```

### エラー: "データの復号化に失敗しました"

**原因1**: v1データの復号化失敗 → XOR実装のバグ
**原因2**: v2データの改ざん → authTag検証失敗

**解決策**: ログを確認してバージョンを特定
```typescript
console.error('Version:', version, 'Data:', encryptedData);
```

### パフォーマンス低下

**原因**: 大量データの一括移行

**解決策**: 段階的移行（読み取り時のみ）
```typescript
// 一括移行は避ける
// データ読み取り時に自動移行する方針
```

---

## 📚 詳細ドキュメント

完全な設計書: `docs/AES-256-GCM暗号化実装設計.md`

---

**最終更新**: 2026-02-17
**所要時間**: 2-3時間
**難易度**: 中級
