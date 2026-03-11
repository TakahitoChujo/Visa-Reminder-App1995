# AES-256-GCM暗号化 実装設計書

**作成日**: 2026-02-17
**対象**: フロントエンドエンジニア
**目的**: XOR暗号化からAES-256-GCM暗号化への移行設計

---

## 📋 目次

1. [現状分析](#現状分析)
2. [ライブラリ選定](#ライブラリ選定)
3. [暗号化方式の設計](#暗号化方式の設計)
4. [既存データの移行戦略](#既存データの移行戦略)
5. [Web版の暗号化キー保存の改善](#web版の暗号化キー保存の改善)
6. [セキュリティ考慮事項](#セキュリティ考慮事項)
7. [実装手順](#実装手順)
8. [テスト計画](#テスト計画)

---

## 🔍 現状分析

### 現在の実装（EncryptionService.ts）

**暗号化方式**: XOR暗号化 + SHA256ハッシュ

```typescript
// 現在の暗号化フロー
1. IVを生成（16バイト）
2. キー + IV を SHA256でハッシュ化
3. 平文をBase64エンコード
4. Base64データとハッシュをXOR演算
5. 出力: "iv:ciphertext"（Hex形式）
```

### セキュリティ上の問題点

| 問題点 | リスクレベル | 説明 |
|--------|-------------|------|
| **Known-plaintext attack** | 🔴 Critical | XOR暗号化は既知平文攻撃に脆弱。攻撃者が平文とciphertextのペアを入手すれば、キーストリームが判明し、他のデータも復号化可能 |
| **認証タグなし** | 🟠 High | データの改ざん検出ができない。攻撃者がciphertextを書き換えても検出不可能 |
| **Web版のキー保存** | 🟠 High | localStorageに平文保存。XSS攻撃で暗号化キーが漏洩するリスク |
| **キーストリームの再利用** | 🟡 Medium | 同じIVを使用した場合、XOR暗号化は破綻する（現実装では防止されているが設計上のリスク） |

### 既存データのフォーマット

- **形式**: `"iv:ciphertext"`
- **IV**: 16バイト（32文字のHex）
- **ciphertext**: 可変長（Hex形式）
- **検出方法**: `split(':')` で2つに分割できるかチェック

---

## 📦 ライブラリ選定

### 評価対象ライブラリ

| ライブラリ | React Native | Web | TypeScript | AES-256-GCM | メンテナンス | セキュリティ監査 |
|-----------|--------------|-----|-----------|-------------|-------------|----------------|
| **@noble/ciphers** | ✅ | ✅ | ✅ | ✅ | ✅ 活発 | ✅ あり（Trail of Bits） |
| react-native-aes-crypto | ✅ | ❌ | ⚠️ 部分的 | ⚠️ GCMサポート不明 | ⚠️ 低頻度 | ❌ なし |
| crypto-js | ✅ | ✅ | ⚠️ 型定義あり | ⚠️ GCMなし（CTRのみ） | ⚠️ 2020年以降更新なし | ❌ なし |
| expo-crypto | ✅ | ✅ | ✅ | ❌ ハッシュのみ | ✅ 活発 | ✅ Expoチーム管理 |

### 🎯 推奨: `@noble/ciphers` v2.1.1

**選定理由**:

1. **クロスプラットフォーム対応**
   - React Native（iOS/Android）とWeb版の両方で完全動作
   - Pure TypeScript実装（ネイティブモジュール不要）

2. **セキュリティ**
   - 2023年にTrail of Bitsによるセキュリティ監査済み
   - Paul Miller（@paulmillr）によるメンテナンス（セキュリティコミュニティで高評価）
   - AES-256-GCMの完全実装（NIST準拠）

3. **TypeScript完全対応**
   - 型定義がファーストクラス
   - 型安全なAPI設計

4. **パフォーマンス**
   - 軽量（~10KB minified + gzipped）
   - WebAssemblyやネイティブ依存なし（デプロイが容易）

5. **メンテナンス性**
   - 活発な開発（2024年以降も定期更新）
   - 豊富なドキュメントとサンプルコード

**却下理由（他ライブラリ）**:

- **react-native-aes-crypto**: Web版非対応、GCMサポートが不明確、メンテナンス頻度が低い
- **crypto-js**: GCMモード未サポート、2020年以降更新なし（セキュリティパッチなし）
- **expo-crypto**: AES暗号化自体が未サポート（ハッシュ機能のみ）

---

## 🔐 暗号化方式の設計

### AES-256-GCM の実装方針

**AES-256-GCM (Galois/Counter Mode)** を使用する理由:

- **認証付き暗号化（AEAD: Authenticated Encryption with Associated Data）**
  - 暗号化と同時にデータの完全性を保証
  - 改ざん検出が可能（Authentication Tag）

- **NIST推奨**
  - アメリカ国立標準技術研究所（NIST）が推奨する暗号化方式

- **業界標準**
  - TLS 1.3、Google、AWS、Azureなどで採用

### IV（初期化ベクトル）の生成方法

```typescript
/**
 * IV生成仕様
 *
 * サイズ: 12バイト（96ビット）
 * 理由: GCMモードでは12バイトが推奨（RFC 5116準拠）
 *       16バイトも使用可能だが、12バイトの方がパフォーマンスが良い
 *
 * 生成方法: expo-crypto.getRandomBytesAsync(12)
 * - セキュアな乱数生成器（CSPRNG）を使用
 * - iOS: SecRandomCopyBytes（Keychain乱数生成）
 * - Android: SecureRandom
 * - Web: window.crypto.getRandomValues()
 */
const iv = await Crypto.getRandomBytesAsync(12);
```

**重要**: IVは絶対に再利用してはいけない（同じキーとIVの組み合わせは1回限り）

### Authentication Tag（認証タグ）の扱い

```typescript
/**
 * Authentication Tag仕様
 *
 * サイズ: 16バイト（128ビット）
 * 役割: データの完全性検証（改ざん検出）
 *
 * @noble/ciphersの動作:
 * - encrypt(): ciphertext + authTag を連結して返却
 * - decrypt(): 自動的にauthTagを検証し、改ざんがあれば例外をスロー
 */
```

認証タグは `@noble/ciphers` が自動的に処理するため、手動で分離する必要はない。

### 出力フォーマット

```typescript
/**
 * 暗号化データのフォーマット
 *
 * 形式: "version:iv:ciphertext_with_authTag"
 *
 * 例: "v2:a1b2c3d4e5f6g7h8i9j0k1l2:4a5b6c7d..."
 *
 * - version: "v2"（将来の暗号化方式変更に備える）
 * - iv: 12バイト（24文字のHex）
 * - ciphertext_with_authTag: 可変長（Hex形式、authTag含む）
 *
 * 旧形式（XOR）: "iv:ciphertext"（versionフィールドなし）
 * - iv: 16バイト（32文字のHex）
 * - ciphertext: 可変長（Hex形式）
 */
const encryptedData = `v2:${ivHex}:${ciphertextHex}`;
```

### データフロー図

```
【暗号化】
平文 (UTF-8)
  ↓
TextEncoder → Uint8Array
  ↓
AES-256-GCM encrypt(key, iv, plaintext)
  ↓
ciphertext + authTag (Uint8Array)
  ↓
bytesToHex() → Hex文字列
  ↓
"v2:iv:ciphertext_with_authTag"

【復号化】
"v2:iv:ciphertext_with_authTag"
  ↓
split(':') → [version, iv, ciphertext]
  ↓
hexToBytes() → Uint8Array
  ↓
AES-256-GCM decrypt(key, iv, ciphertext)
  ↓ (authTag検証)
plaintext (Uint8Array)
  ↓
TextDecoder → UTF-8文字列
```

---

## 🔄 既存データの移行戦略

### 移行フロー全体像

```
アプリ起動
  ↓
暗号化サービス初期化
  ↓
旧形式データの検出
  ↓
[旧形式あり] → 移行処理実行
  ↓
旧形式データを復号化（XOR）
  ↓
新形式で再暗号化（AES-256-GCM）
  ↓
データベース更新
  ↓
[移行完了] → 通常運用
```

### 旧形式データの検出方法

```typescript
/**
 * 暗号化データ形式の判定
 *
 * @param encryptedData 暗号化データ
 * @returns 'v2' | 'v1' | 'invalid'
 */
function detectEncryptionVersion(encryptedData: string): 'v2' | 'v1' | 'invalid' {
  if (!encryptedData || typeof encryptedData !== 'string') {
    return 'invalid';
  }

  const parts = encryptedData.split(':');

  // 新形式: "v2:iv:ciphertext" (3パート)
  if (parts.length === 3 && parts[0] === 'v2') {
    return 'v2';
  }

  // 旧形式: "iv:ciphertext" (2パート)
  if (parts.length === 2) {
    // IVのサイズチェック（16バイト = 32文字のHex）
    if (parts[0].length === 32 && /^[0-9a-f]+$/.test(parts[0])) {
      return 'v1';
    }
  }

  return 'invalid';
}
```

### 移行処理の実装方針

#### 1. 段階的移行（推奨）

**メリット**:
- アプリ起動が遅くならない
- エラーハンドリングが容易
- ユーザー体験への影響が最小

**方針**:
- データ読み取り時に旧形式を検出したら、即座に新形式に変換して保存
- バックグラウンドで一括移行は行わない

```typescript
/**
 * 復号化（自動移行付き）
 *
 * @param encryptedData 暗号化データ
 * @param autoMigrate true: 旧形式を自動的に新形式に移行（デフォルト: true）
 * @returns 復号化された平文
 */
async decrypt(
  encryptedData: string,
  autoMigrate: boolean = true
): Promise<string> {
  const version = this.detectEncryptionVersion(encryptedData);

  if (version === 'v2') {
    // 新形式: AES-256-GCMで復号化
    return this.decryptV2(encryptedData);
  }

  if (version === 'v1') {
    // 旧形式: XORで復号化
    const plaintext = await this.decryptV1(encryptedData);

    // 自動移行が有効な場合、新形式で再暗号化
    if (autoMigrate) {
      const newEncryptedData = await this.encrypt(plaintext);
      // 注: ここではデータベース更新は行わない
      // 呼び出し側（Repository層）で更新する
      this.pendingMigrations.set(encryptedData, newEncryptedData);
    }

    return plaintext;
  }

  throw new EncryptionError('不正な暗号化データ形式');
}
```

#### 2. Repository層での移行処理

```typescript
/**
 * ResidenceCardRepository での移行処理例
 */
async getById(id: string): Promise<ResidenceCardDecrypted | null> {
  const card = await this.db.getResidenceCard(id);
  if (!card) return null;

  // メモフィールドを復号化（自動移行あり）
  if (card.memo) {
    const originalEncrypted = card.memo;
    const decryptedMemo = await encryptionService.decrypt(card.memo);

    // 移行が発生した場合、データベースを更新
    const migratedData = encryptionService.getPendingMigration(originalEncrypted);
    if (migratedData) {
      await this.db.updateResidenceCard(id, { memo: migratedData });
      encryptionService.clearPendingMigration(originalEncrypted);
    }

    return {
      ...card,
      memo: decryptedMemo,
    };
  }

  return card as ResidenceCardDecrypted;
}
```

#### 3. 一括移行（オプション）

設定画面に「データ移行」ボタンを追加し、ユーザーが任意のタイミングで実行可能にする。

```typescript
/**
 * 一括移行処理
 *
 * すべての暗号化データをv1→v2に移行
 */
async migrateAllData(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalRecords: 0,
    migratedRecords: 0,
    failedRecords: 0,
    errors: [],
  };

  try {
    // 在留カードのメモを移行
    const cards = await this.residenceCardRepository.getAll();
    result.totalRecords += cards.length;

    for (const card of cards) {
      if (card.memo && this.detectEncryptionVersion(card.memo) === 'v1') {
        try {
          const plaintext = await this.decryptV1(card.memo);
          const newEncrypted = await this.encrypt(plaintext);
          await this.residenceCardRepository.update(card.id, { memo: newEncrypted });
          result.migratedRecords++;
        } catch (error) {
          result.failedRecords++;
          result.errors.push({
            recordId: card.id,
            error: error.message,
          });
        }
      }
    }

    // チェックリスト項目のメモも同様に移行
    // ...

    return result;
  } catch (error) {
    throw new Error('一括移行に失敗しました: ' + error.message);
  }
}
```

### ロールバック戦略

#### 移行失敗時の処理

```typescript
/**
 * 移行失敗時のロールバック
 *
 * 原則: 既存データは削除しない
 * - 移行前のデータはそのまま保持
 * - 新形式への変換に失敗した場合、旧形式で読み取りを継続
 * - エラーログを記録し、次回起動時に再試行
 */
async handleMigrationError(
  recordId: string,
  error: Error
): Promise<void> {
  // エラーログを記録（AsyncStorageまたはファイル）
  await this.logMigrationError({
    recordId,
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
  });

  // ユーザーに通知（任意）
  // この時点ではデータは失われていない
  console.warn(`Migration failed for record ${recordId}:`, error);

  // 旧形式での読み取りを継続
  // 次回起動時に再試行
}
```

#### 緊急時のダウングレード

万が一、AES-256-GCM実装に致命的な問題が発覚した場合:

1. **アプリバージョンのロールバック**
   - 旧バージョンのアプリをリリース
   - 旧形式データはそのまま読み取り可能

2. **暗号化サービスのフォールバック**
   ```typescript
   // 環境変数またはRemote Configで制御
   const FORCE_LEGACY_ENCRYPTION = false;

   async encrypt(plaintext: string): Promise<string> {
     if (FORCE_LEGACY_ENCRYPTION) {
       return this.encryptV1(plaintext); // XOR暗号化に戻す
     }
     return this.encryptV2(plaintext); // AES-256-GCM
   }
   ```

---

## 🌐 Web版の暗号化キー保存の改善

### 現状の問題点

```typescript
// 現在の実装（SecureStorageService.ts）
if (Platform.OS === 'web') {
  // ❌ localStorageに平文で保存
  localStorage.setItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
}
```

**リスク**:
- **XSS攻撃**: 悪意のあるスクリプトが `localStorage.getItem()` でキーを盗む
- **ブラウザ拡張機能**: 悪意のある拡張機能がlocalStorageにアクセス可能
- **開発者ツール**: ユーザー自身が誤ってキーを確認・削除してしまう可能性

### 改善案の比較

| 方法 | セキュリティ | 実装難易度 | ユーザー体験 | 推奨度 |
|-----|------------|----------|-----------|-------|
| **IndexedDB + Web Crypto API** | 🟢 High | 🟡 Medium | 🟢 Good | ⭐⭐⭐⭐⭐ |
| **SessionStorage（セッション限定）** | 🟡 Medium | 🟢 Easy | 🟠 Poor（タブ閉じると消失） | ⭐⭐⭐ |
| **暗号化を無効化（警告表示）** | 🔴 Low | 🟢 Easy | 🟠 Poor（機能制限） | ⭐⭐ |
| **Service Worker + Encrypted Cache** | 🟢 High | 🔴 Hard | 🟢 Good | ⭐⭐⭐⭐ |

### 🎯 推奨: IndexedDB + Web Crypto API

#### 実装方針

```typescript
/**
 * Web版のキー管理方針
 *
 * 1. IndexedDBにキーを保存（localStorageより安全）
 *    - XSS攻撃のリスクは残るが、開発者ツールからの直接アクセスは困難
 *    - ブラウザのセキュリティポリシーでドメイン間の分離が保証される
 *
 * 2. Web Crypto APIでキーをラッピング（追加のセキュリティ層）
 *    - ブラウザのネイティブ暗号化機能を利用
 *    - マスターキーはメモリ上にのみ保持（永続化しない）
 *
 * 3. ユーザーにセキュリティリスクを通知
 *    - Web版はネイティブアプリより安全性が低いことを明示
 *    - 機密性の高いメモは推奨しないことを警告
 */

/**
 * IndexedDB Manager for Web
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
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('キー保存失敗'));
    });
  }

  async getKey(key: string): Promise<string | null> {
    if (!this.db) throw new Error('IndexedDB未初期化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('キー取得失敗'));
    });
  }

  async deleteKey(key: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB未初期化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('キー削除失敗'));
    });
  }
}

/**
 * Web Crypto APIによるキーのラッピング（オプション）
 *
 * さらなるセキュリティ強化が必要な場合に使用
 */
class WebCryptoKeyWrapper {
  private wrapperKey: CryptoKey | null = null;

  /**
   * ラッパーキーを生成（セッションごとに生成、永続化しない）
   */
  async generateWrapperKey(): Promise<void> {
    this.wrapperKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // extractable: false（キーをエクスポート不可にする）
      ['encrypt', 'decrypt']
    );
  }

  /**
   * 暗号化キーをラップ（暗号化）
   */
  async wrapKey(key: string): Promise<string> {
    if (!this.wrapperKey) throw new Error('ラッパーキー未初期化');

    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.wrapperKey,
      data
    );

    // IV + 暗号化データを結合してBase64エンコード
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * 暗号化キーをアンラップ（復号化）
   */
  async unwrapKey(wrappedKey: string): Promise<string> {
    if (!this.wrapperKey) throw new Error('ラッパーキー未初期化');

    // Base64デコード
    const combined = Uint8Array.from(atob(wrappedKey), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.wrapperKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
```

#### SecureStorageServiceの更新

```typescript
/**
 * SecureStorageService（Web版改善版）
 */
export class SecureStorageService {
  private static instance: SecureStorageService;
  private indexedDBStore: IndexedDBKeyStore | null = null;
  private webCryptoWrapper: WebCryptoKeyWrapper | null = null;

  async initialize(): Promise<void> {
    if (Platform.OS === 'web') {
      // IndexedDBを初期化
      this.indexedDBStore = new IndexedDBKeyStore();
      await this.indexedDBStore.initialize();

      // オプション: Web Crypto APIによるラッピング
      this.webCryptoWrapper = new WebCryptoKeyWrapper();
      await this.webCryptoWrapper.generateWrapperKey();

      // ユーザーにWeb版のセキュリティ制限を通知
      this.showWebSecurityWarning();
    }
  }

  async saveEncryptionKey(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (!this.indexedDBStore) {
          throw new Error('IndexedDB未初期化');
        }

        // キーをラッピング（オプション）
        let keyToStore = key;
        if (this.webCryptoWrapper) {
          keyToStore = await this.webCryptoWrapper.wrapKey(key);
        }

        // IndexedDBに保存
        await this.indexedDBStore.saveKey(
          SECURE_STORAGE_KEYS.ENCRYPTION_KEY,
          keyToStore
        );
      } else {
        // iOS/AndroidはSecure Storeを使用（変更なし）
        await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
      }
    } catch (error) {
      console.error('Failed to save encryption key:', error);
      throw new Error('暗号化キーの保存に失敗しました');
    }
  }

  async getEncryptionKey(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (!this.indexedDBStore) {
          throw new Error('IndexedDB未初期化');
        }

        // IndexedDBから取得
        const wrappedKey = await this.indexedDBStore.getKey(
          SECURE_STORAGE_KEYS.ENCRYPTION_KEY
        );
        if (!wrappedKey) return null;

        // キーをアンラップ（オプション）
        if (this.webCryptoWrapper) {
          return await this.webCryptoWrapper.unwrapKey(wrappedKey);
        }

        return wrappedKey;
      } else {
        // iOS/AndroidはSecure Storeから取得（変更なし）
        return await SecureStore.getItemAsync(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
      }
    } catch (error) {
      console.error('Failed to get encryption key:', error);
      throw new Error('暗号化キーの取得に失敗しました');
    }
  }

  /**
   * Web版のセキュリティ警告を表示
   */
  private showWebSecurityWarning(): void {
    // 初回起動時のみ表示
    const hasShownWarning = localStorage.getItem('web_security_warning_shown');
    if (hasShownWarning) return;

    // 警告メッセージ（UI実装は別途）
    console.warn(
      'Web版では暗号化のセキュリティレベルがネイティブアプリより低くなります。' +
      '機密性の高い情報はメモに記載しないことを推奨します。'
    );

    localStorage.setItem('web_security_warning_shown', 'true');
  }
}
```

### 代替案: SessionStorage（簡易版）

IndexedDBの実装が複雑すぎる場合、SessionStorageを使用する簡易版:

```typescript
// SessionStorageを使用（タブを閉じるとキーが消える）
if (Platform.OS === 'web') {
  sessionStorage.setItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
}
```

**メリット**:
- 実装が簡単
- タブを閉じるとキーが自動的に削除される（セキュリティ向上）

**デメリット**:
- タブを閉じるたびにキーが失われる
- ユーザーがページをリロードするとキーを再生成する必要がある

### 最終推奨

1. **本番環境（公開版）**: IndexedDB + Web Crypto API
2. **開発/テスト環境**: SessionStorage（簡易実装）
3. **企業向け版**: サーバーサイド暗号化（バックエンドでキー管理）

---

## 🛡️ セキュリティ考慮事項

### 1. キーの生成と管理

#### キー生成

```typescript
/**
 * 暗号化キーの生成
 *
 * 要件:
 * - 256ビット（32バイト）のランダムキー
 * - 暗号論的に安全な乱数生成器（CSPRNG）を使用
 * - 予測不可能性が保証されること
 */
private async generateKey(): Promise<string> {
  // expo-cryptoはプラットフォームごとに最適なCSPRNGを使用
  // iOS: SecRandomCopyBytes
  // Android: SecureRandom
  // Web: window.crypto.getRandomValues()
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return this.bytesToHex(randomBytes);
}
```

#### キーのライフサイクル

```
キー生成
  ↓
SecureStore/IndexedDBに保存
  ↓
アプリ起動時にメモリにロード
  ↓
使用（暗号化/復号化）
  ↓
アプリ終了時にメモリからクリア
```

**重要**:
- キーはメモリ上でのみ使用し、ログに出力しない
- デバッグビルドでもキーを表示しない
- キーのバックアップは推奨しない（再生成可能にする）

#### キーのローテーション（将来実装）

```typescript
/**
 * キーローテーション戦略
 *
 * トリガー:
 * - ユーザーが明示的にリクエスト（設定画面）
 * - セキュリティインシデント発生時
 * - 定期的なローテーション（例: 1年ごと）
 *
 * 手順:
 * 1. 新しいキーを生成
 * 2. すべての暗号化データを旧キーで復号化
 * 3. 新キーで再暗号化
 * 4. 旧キーを削除
 */
async rotateEncryptionKey(): Promise<void> {
  const oldKey = this.encryptionKey;
  const newKey = await this.generateKey();

  // すべてのデータを再暗号化
  await this.reEncryptAllData(oldKey, newKey);

  // 新キーをSecure Storeに保存
  await this.secureStorageService.saveEncryptionKey(newKey);

  // メモリ上のキーを更新
  this.encryptionKey = newKey;

  // 旧キーをメモリから削除
  oldKey = null; // GC対象にする
}
```

### 2. IVの再利用防止

```typescript
/**
 * IV再利用防止の実装
 *
 * GCMモードでは、同じキーとIVの組み合わせを再利用すると
 * 暗号化が完全に破綻する（Two-Time Pad攻撃）
 *
 * 対策:
 * - 毎回新しいランダムIVを生成（getRandomBytesAsync）
 * - IVをciphertextと一緒に保存（復号化時に必要）
 * - IVの衝突確率は極めて低い（12バイト = 2^96通り）
 */
public async encrypt(plaintext: string): Promise<string> {
  // ✅ 毎回新しいIVを生成
  const iv = await Crypto.getRandomBytesAsync(12);

  // 暗号化処理...

  // IVをciphertextと一緒に保存
  return `v2:${this.bytesToHex(iv)}:${ciphertextHex}`;
}
```

**IVの衝突確率**:
- 12バイトIV: 2^96 ≈ 7.9 × 10^28 通り
- 1秒に100万回暗号化しても、衝突確率は無視できるレベル

### 3. タイミング攻撃対策

```typescript
/**
 * タイミング攻撃対策
 *
 * 問題:
 * - 復号化の成功/失敗で処理時間が異なると、攻撃者がキーを推測できる
 *
 * 対策:
 * - 復号化失敗時も同じ時間かかるようにする（定数時間比較）
 * - @noble/ciphersは内部で定数時間比較を実装している
 * - エラーメッセージを統一する（詳細を漏らさない）
 */
public async decrypt(encryptedData: string): Promise<string> {
  try {
    const version = this.detectEncryptionVersion(encryptedData);

    if (version === 'v2') {
      return await this.decryptV2(encryptedData);
    }

    if (version === 'v1') {
      return await this.decryptV1(encryptedData);
    }

    // ❌ 悪い例: 詳細なエラーメッセージ
    // throw new Error('Invalid format: missing version field');

    // ✅ 良い例: 統一されたエラーメッセージ
    throw new EncryptionError('データの復号化に失敗しました');
  } catch (error) {
    // エラーの詳細をログに記録（サーバー送信は避ける）
    console.error('Decryption error:', error);

    // ユーザーには統一されたエラーメッセージ
    throw new EncryptionError('データの復号化に失敗しました');
  }
}
```

### 4. エラーハンドリング（情報漏洩防止）

```typescript
/**
 * セキュアなエラーハンドリング
 *
 * 原則:
 * - ユーザーには一般的なエラーメッセージのみ表示
 * - 詳細なエラー情報はログに記録（デバッグ用）
 * - ネットワーク経由でエラー詳細を送信しない
 */

// ❌ 悪い例: エラーで情報を漏らす
try {
  const decrypted = await decrypt(data);
} catch (error) {
  alert(`復号化失敗: ${error.message}`); // キー形式などが推測される
}

// ✅ 良い例: 統一されたエラーメッセージ
try {
  const decrypted = await decrypt(data);
} catch (error) {
  // 詳細はログのみ
  console.error('Decryption error:', error);

  // ユーザーには一般的なメッセージ
  showErrorToast('データの読み込みに失敗しました。アプリを再起動してください。');
}
```

### 5. メモリ管理とキーのクリア

```typescript
/**
 * メモリ上のキーをクリア
 *
 * タイミング:
 * - アプリがバックグラウンドに移行したとき（オプション）
 * - ユーザーがログアウトしたとき
 * - アプリがクラッシュする前（可能な範囲で）
 */
public clearKey(): void {
  if (this.encryptionKey) {
    // JavaScriptではメモリの直接クリアはできないが、
    // 参照をnullにしてGCに任せる
    this.encryptionKey = null;
  }
}

// App.tsx での実装例
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background') {
      // オプション: バックグラウンド移行時にキーをクリア
      // encryptionService.clearKey();
      // ※ 再起動時に再度SecureStoreから読み込む
    }
  });

  return () => {
    subscription.remove();
  };
}, []);
```

### 6. 追加のセキュリティ対策（将来実装）

#### 生体認証の統合

```typescript
/**
 * 生体認証によるキー保護
 *
 * expo-local-authenticationを使用
 */
import * as LocalAuthentication from 'expo-local-authentication';

async saveEncryptionKey(key: string): Promise<void> {
  if (Platform.OS !== 'web') {
    // 生体認証が利用可能かチェック
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      // SecureStoreに生体認証を要求
      await SecureStore.setItemAsync(
        SECURE_STORAGE_KEYS.ENCRYPTION_KEY,
        key,
        {
          requireAuthentication: true, // ✅ 読み取り時に生体認証を要求
          authenticationPrompt: '暗号化キーにアクセスするため、認証してください',
        }
      );
      return;
    }
  }

  // フォールバック: 生体認証なし
  await this.saveEncryptionKeyWithoutBiometrics(key);
}
```

#### データの完全性チェック（HMAC）

```typescript
/**
 * 追加の完全性チェック（オプション）
 *
 * AES-GCMのauthTagに加えて、データベース全体のHMACを計算
 * → データベースファイルの改ざん検出
 */
async verifyDatabaseIntegrity(): Promise<boolean> {
  // データベース全体のハッシュを計算
  const dbData = await this.getAllRecords();
  const dataString = JSON.stringify(dbData);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dataString + this.encryptionKey
  );

  // 保存されたハッシュと比較
  const storedHash = await AsyncStorage.getItem('db_integrity_hash');
  return hash === storedHash;
}
```

---

## 🔧 実装手順

### ステップ1: 依存関係のインストール

```bash
cd frontend
npm install @noble/ciphers@^2.1.1
```

### ステップ2: EncryptionService.tsの書き換え

#### 2-1. インポートの追加

```typescript
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/webcrypto';
import * as Crypto from 'expo-crypto';
```

#### 2-2. 暗号化メソッドの実装

```typescript
/**
 * AES-256-GCM暗号化（v2）
 */
private async encryptV2(plaintext: string): Promise<string> {
  if (!this.encryptionKey) {
    throw new EncryptionError('暗号化キーが初期化されていません');
  }

  try {
    // 1. IVを生成（12バイト）
    const iv = await Crypto.getRandomBytesAsync(12);

    // 2. キーをバイト配列に変換
    const keyBytes = this.hexToBytes(this.encryptionKey);

    // 3. 平文をUTF-8バイト配列に変換
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // 4. AES-GCMで暗号化
    const aes = gcm(keyBytes, iv);
    const ciphertext = aes.encrypt(plaintextBytes);

    // 5. IV + ciphertext を返却
    const ivHex = this.bytesToHex(iv);
    const ciphertextHex = this.bytesToHex(ciphertext);

    return `v2:${ivHex}:${ciphertextHex}`;
  } catch (error) {
    throw new EncryptionError(
      'データの暗号化に失敗しました',
      error as Error
    );
  }
}
```

#### 2-3. 復号化メソッドの実装

```typescript
/**
 * AES-256-GCM復号化（v2）
 */
private async decryptV2(encryptedData: string): Promise<string> {
  if (!this.encryptionKey) {
    throw new EncryptionError('暗号化キーが初期化されていません');
  }

  try {
    // 1. データを分解
    const parts = encryptedData.split(':');
    if (parts.length !== 3 || parts[0] !== 'v2') {
      throw new Error('不正な暗号化データ形式（v2）');
    }

    const [, ivHex, ciphertextHex] = parts;

    // 2. Hex → バイト配列に変換
    const iv = this.hexToBytes(ivHex);
    const ciphertext = this.hexToBytes(ciphertextHex);
    const keyBytes = this.hexToBytes(this.encryptionKey);

    // 3. AES-GCMで復号化
    const aes = gcm(keyBytes, iv);
    const plaintextBytes = aes.decrypt(ciphertext);

    // 4. バイト配列 → UTF-8文字列に変換
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBytes);
  } catch (error) {
    // authTag検証失敗の場合もここに到達
    throw new EncryptionError(
      'データの復号化に失敗しました',
      error as Error
    );
  }
}
```

#### 2-4. 旧形式の復号化（v1）

```typescript
/**
 * XOR復号化（v1 - 旧形式）
 *
 * 移行期間中のみ使用
 */
private async decryptV1(encryptedData: string): Promise<string> {
  // 現在の実装をそのまま流用
  // ただし、メソッド名を decryptV1 に変更
  // ...（既存のdecrypt()ロジックをコピー）
}
```

### ステップ3: SecureStorageServiceの改善（Web版）

```typescript
/**
 * IndexedDB実装を追加（前述の実装を参照）
 */
// 実装は「Web版の暗号化キー保存の改善」セクションを参照
```

### ステップ4: Repository層での移行処理

```typescript
/**
 * ResidenceCardRepository.ts に移行ロジックを追加
 */
async getById(id: string): Promise<ResidenceCardDecrypted | null> {
  const card = await this.db.getResidenceCard(id);
  if (!card) return null;

  if (card.memo) {
    const version = encryptionService.detectEncryptionVersion(card.memo);
    const decryptedMemo = await encryptionService.decrypt(card.memo);

    // v1 → v2 移行
    if (version === 'v1') {
      const newEncrypted = await encryptionService.encrypt(decryptedMemo);
      await this.db.updateResidenceCard(id, { memo: newEncrypted });
      console.log(`Migrated encryption for card ${id}: v1 → v2`);
    }

    return {
      ...card,
      memo: decryptedMemo,
    };
  }

  return card as ResidenceCardDecrypted;
}
```

### ステップ5: テスト実装

```typescript
/**
 * EncryptionService.test.ts
 */
describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    service = EncryptionService.getInstance();
    await service.initialize();
  });

  describe('AES-256-GCM暗号化（v2）', () => {
    test('暗号化・復号化が正常に動作する', async () => {
      const plaintext = 'テストメモ';
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('暗号化データは毎回異なる（IV再利用なし）', async () => {
      const plaintext = 'テストメモ';
      const encrypted1 = await service.encrypt(plaintext);
      const encrypted2 = await service.encrypt(plaintext);

      // IVが異なるため、暗号化データも異なる
      expect(encrypted1).not.toBe(encrypted2);

      // ただし、復号化結果は同じ
      expect(await service.decrypt(encrypted1)).toBe(plaintext);
      expect(await service.decrypt(encrypted2)).toBe(plaintext);
    });

    test('改ざんされたデータは復号化失敗', async () => {
      const plaintext = 'テストメモ';
      const encrypted = await service.encrypt(plaintext);

      // ciphertextの一部を改ざん
      const parts = encrypted.split(':');
      const tamperedCiphertext = parts[2].substring(0, parts[2].length - 4) + 'ffff';
      const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

      // 復号化失敗（authTag検証エラー）
      await expect(service.decrypt(tampered)).rejects.toThrow(EncryptionError);
    });

    test('v2形式として検出される', async () => {
      const plaintext = 'テストメモ';
      const encrypted = await service.encrypt(plaintext);

      expect(service.detectEncryptionVersion(encrypted)).toBe('v2');
    });
  });

  describe('旧形式（v1）からの移行', () => {
    test('v1データを復号化できる', async () => {
      // v1形式のテストデータ（実際のXOR暗号化データ）
      const v1Encrypted = '...'; // 実際のv1データ
      const decrypted = await service.decrypt(v1Encrypted);

      expect(decrypted).toBe('期待される平文');
    });

    test('v1形式として検出される', () => {
      const v1Encrypted = '0123456789abcdef0123456789abcdef:abcdef123456';
      expect(service.detectEncryptionVersion(v1Encrypted)).toBe('v1');
    });
  });

  describe('エラーハンドリング', () => {
    test('不正な形式のデータは復号化失敗', async () => {
      await expect(service.decrypt('invalid:format')).rejects.toThrow(
        EncryptionError
      );
    });

    test('空文字列の暗号化・復号化', async () => {
      const encrypted = await service.encrypt('');
      expect(encrypted).toBe('');

      const decrypted = await service.decrypt('');
      expect(decrypted).toBe('');
    });

    test('キー未初期化時はエラー', async () => {
      const uninitializedService = new (EncryptionService as any)();
      await expect(uninitializedService.encrypt('test')).rejects.toThrow(
        '暗号化キーが初期化されていません'
      );
    });
  });

  describe('Unicode文字の暗号化', () => {
    test('日本語を正しく暗号化・復号化', async () => {
      const plaintext = '在留カードのメモ📝';
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('絵文字を正しく暗号化・復号化', async () => {
      const plaintext = '🇯🇵🎌🗾';
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
```

### ステップ6: デプロイ前チェックリスト

- [ ] `@noble/ciphers` がインストールされている
- [ ] すべてのテストがパスする
- [ ] 既存データの移行ロジックが実装されている
- [ ] Web版のIndexedDB実装が完了している
- [ ] エラーメッセージが統一されている（情報漏洩なし）
- [ ] 生体認証の統合（オプション）
- [ ] セキュリティレビューを実施
- [ ] パフォーマンステスト（大量データの暗号化/復号化）

---

## 🧪 テスト計画

### 単体テスト（Unit Tests）

| テストケース | 期待結果 |
|-------------|---------|
| 暗号化・復号化の正常動作 | 平文と復号化結果が一致 |
| IV再利用の防止 | 同じ平文でも暗号化データが異なる |
| 改ざん検出 | 改ざんされたデータの復号化が失敗 |
| v1データの復号化 | 旧形式データが正しく復号化される |
| v1→v2移行 | 旧形式データが新形式に移行される |
| Unicode文字の処理 | 日本語・絵文字が正しく処理される |
| 空文字列の処理 | 空文字列が正しく処理される |
| エラーハンドリング | 不正なデータでエラーがスローされる |

### 結合テスト（Integration Tests）

| テストケース | 期待結果 |
|-------------|---------|
| 在留カードのメモ保存 | 暗号化されてDBに保存される |
| 在留カードのメモ読み取り | 復号化されて表示される |
| チェックリスト項目のメモ保存 | 暗号化されてDBに保存される |
| 移行処理の自動実行 | v1データがv2に自動移行される |
| Web版のキー保存 | IndexedDBに保存される |
| SecureStoreとの連携 | iOS/Androidでキーが保存される |

### E2Eテスト（End-to-End Tests）

| シナリオ | 期待結果 |
|---------|---------|
| 新規ユーザーの登録 | キーが生成され、メモが暗号化される |
| 既存ユーザーのアプリ起動 | v1データがv2に移行される |
| メモの編集 | 暗号化・復号化が正しく動作する |
| アプリの再起動 | キーが正しく読み込まれる |
| データのバックアップ・復元 | 暗号化キーが失われても再生成される |

### パフォーマンステスト

| 測定項目 | 目標値 |
|---------|--------|
| 暗号化速度（100文字） | < 10ms |
| 復号化速度（100文字） | < 10ms |
| 一括移行速度（100件） | < 5秒 |
| メモリ使用量 | < 10MB増加 |

### セキュリティテスト

| テストケース | 期待結果 |
|-------------|---------|
| Known-plaintext attack | 平文とciphertextのペアからキーが推測できない |
| 改ざん検出 | ciphertextの改ざんが検出される |
| タイミング攻撃 | 復号化の成功/失敗で処理時間が変わらない |
| XSS攻撃（Web版） | localStorageにキーが保存されていない |
| メモリダンプ | キーがログに出力されていない |

---

## 📚 参考資料

### 技術仕様

- [NIST SP 800-38D: AES-GCM仕様](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [RFC 5116: Authenticated Encryption with AES-GCM](https://datatracker.ietf.org/doc/html/rfc5116)
- [@noble/ciphers ドキュメント](https://github.com/paulmillr/noble-ciphers)
- [Trail of Bits監査レポート](https://github.com/paulmillr/noble-curves/blob/main/audit/2023-01-trailofbits-audit.pdf)

### セキュリティガイドライン

- [OWASP Mobile Security Testing Guide](https://owasp.org/www-project-mobile-security-testing-guide/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Apple: Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Android: Keystore System](https://developer.android.com/training/articles/keystore)

---

## ✅ 承認

| 役割 | 氏名 | 日付 | 承認 |
|-----|------|------|------|
| セキュリティエンジニア | - | 2026-02-17 | ✅ |
| フロントエンドリーダー | - | - | - |
| プロダクトマネージャー | - | - | - |

---

**最終更新**: 2026-02-17
**バージョン**: 1.0
**次回レビュー**: 実装完了後
