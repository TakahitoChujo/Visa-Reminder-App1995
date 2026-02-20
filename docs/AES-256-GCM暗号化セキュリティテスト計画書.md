# AES-256-GCM暗号化実装 セキュリティテスト計画書

**プロジェクト名**: 在留資格更新リマインダーアプリ
**対象機能**: メモフィールドのAES-256-GCM暗号化
**テスト対象**: EncryptionService.ts, SecureStorageService.ts, useResidenceStore.ts
**作成日**: 2026-02-17
**テストエンジニア**: QA/Security Team

---

## 目次

1. [テスト概要](#テスト概要)
2. [テスト環境](#テスト環境)
3. [テストスコープ](#テストスコープ)
4. [機能テスト](#1-機能テスト暗号化復号化)
5. [セキュリティテスト](#2-セキュリティテスト)
6. [既存データ移行テスト](#3-既存データ移行テスト)
7. [パフォーマンステスト](#4-パフォーマンステスト)
8. [クロスプラットフォームテスト](#5-クロスプラットフォームテスト)
9. [エラーハンドリングテスト](#6-エラーハンドリングテスト)
10. [テスト実施スケジュール](#テスト実施スケジュール)
11. [テスト完了基準](#テスト完了基準)
12. [リスクと緩和策](#リスクと緩和策)

---

## テスト概要

### 背景

現在の実装では、XOR暗号化（`expo-crypto`のSHA256ダイジェスト + XOR）を使用していますが、以下のセキュリティリスクがあります：

- **Known-plaintext attack**に対して脆弱
- **Chosen-plaintext attack**に対して脆弱
- 暗号学的に安全な認証付き暗号化（AEAD）ではない

### 目的

XOR暗号化をAES-256-GCMに置き換え、以下を確保する：

1. **機密性**: 平文を第三者から保護
2. **完全性**: データ改ざんの検出
3. **認証性**: 正当な暗号文であることを検証
4. **後方互換性**: 既存のXOR暗号化データからの移行を保証
5. **クロスプラットフォーム互換性**: iOS/Android/Web間でのデータ互換性

### 採用する暗号化ライブラリ

以下のライブラリから選定予定：

| ライブラリ | プラットフォーム | 特徴 |
|----------|--------------|------|
| `@noble/ciphers` | すべて | Pure JavaScript実装、依存なし、軽量 |
| `react-native-aes-crypto` | iOS/Android | ネイティブ実装、高速、Web非対応 |
| Web Crypto API | Web | ブラウザ標準、AES-GCM対応 |

**推奨**: `@noble/ciphers`（すべてのプラットフォーム対応、Pure JavaScript）

---

## テスト環境

### 対象デバイス/環境

| プラットフォーム | バージョン | デバイス/ブラウザ |
|---------------|----------|----------------|
| iOS | 16.0以降 | iPhone 12以降、シミュレーター |
| Android | 12以降 | Pixel 5以降、エミュレーター |
| Web | 最新 | Chrome、Safari、Firefox |

### テストデータ

```typescript
// 通常テキスト
const normalText = "在留期限は2027年3月31日です";

// 空文字列
const emptyText = "";

// 長文（500文字）
const longText = "あ".repeat(500);

// 特殊文字
const specialChars = "特殊文字テスト: !@#$%^&*()[]{}";

// 絵文字
const emojiText = "絵文字テスト: 😀🎉🚀💯";

// 多言語
const multiLang = "English, 日本語, 中文, Tiếng Việt, 한국어";

// HTML/スクリプト（XSS対策確認用）
const xssPayload = "<script>alert('XSS')</script>";
```

---

## テストスコープ

### 対象機能

- [x] `EncryptionService.encrypt()` - 暗号化
- [x] `EncryptionService.decrypt()` - 復号化
- [x] `EncryptionService.initialize()` - 暗号化キー初期化
- [x] `SecureStorageService.saveEncryptionKey()` - 暗号化キー保存
- [x] `SecureStorageService.getEncryptionKey()` - 暗号化キー取得
- [x] `useResidenceStore.addCard()` - カード登録時のメモ暗号化
- [x] `useResidenceStore.updateCard()` - カード更新時のメモ暗号化
- [x] `useResidenceStore.loadData()` - データ読み込み時のメモ復号化
- [x] 既存データ移行ロジック（XOR → AES-256-GCM）

### 対象外

- [ ] チェックリストのメモ暗号化（別途テスト）
- [ ] ネットワーク通信の暗号化（将来実装）
- [ ] バックエンドとのデータ同期（将来実装）

---

## 1. 機能テスト（暗号化・復号化）

### 1.1 正常系テストケース

#### TC-FUNC-001: 通常のテキストの暗号化・復号化

**優先度**: 🔴 Critical
**テストID**: TC-FUNC-001

**前提条件**:
- EncryptionServiceが初期化されている
- 暗号化キーが生成されている

**テスト手順**:
1. 通常の日本語テキストを暗号化
2. 暗号化されたデータが元のテキストと異なることを確認
3. 暗号化されたデータを復号化
4. 復号化されたテキストが元のテキストと一致することを確認

**期待結果**:
- ✅ 暗号化後のデータは元のテキストと異なる
- ✅ 復号化後のテキストは元のテキストと完全に一致
- ✅ 暗号化データの形式: `{iv}:{authTag}:{ciphertext}` (Base64エンコード)

**テストコード例**:
```typescript
test('TC-FUNC-001: 通常のテキストの暗号化・復号化', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "在留期限は2027年3月31日です";
  const encrypted = await encryptionService.encrypt(plaintext);

  expect(encrypted).not.toBe(plaintext);
  expect(encrypted).toContain(':'); // iv:authTag:ciphertext形式

  const decrypted = await encryptionService.decrypt(encrypted);
  expect(decrypted).toBe(plaintext);
});
```

---

#### TC-FUNC-002: 空文字列の扱い

**優先度**: 🔴 Critical
**テストID**: TC-FUNC-002

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 空文字列を暗号化
2. 空文字列が返されることを確認

**期待結果**:
- ✅ 空文字列の暗号化は空文字列を返す
- ✅ エラーが発生しない

**テストコード例**:
```typescript
test('TC-FUNC-002: 空文字列の扱い', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const encrypted = await encryptionService.encrypt("");
  expect(encrypted).toBe("");

  const decrypted = await encryptionService.decrypt("");
  expect(decrypted).toBe("");
});
```

---

#### TC-FUNC-003: 長文（500文字）の暗号化・復号化

**優先度**: 🟡 High
**テストID**: TC-FUNC-003

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 500文字の長文を暗号化
2. 復号化して元のテキストと一致することを確認
3. 処理時間を計測（100ms以内が目標）

**期待結果**:
- ✅ 長文でも正しく暗号化・復号化される
- ✅ 処理時間が100ms以内（パフォーマンス目標）
- ✅ メモリリークが発生しない

**テストコード例**:
```typescript
test('TC-FUNC-003: 長文（500文字）の暗号化・復号化', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "あ".repeat(500);

  const startTime = performance.now();
  const encrypted = await encryptionService.encrypt(plaintext);
  const encryptTime = performance.now() - startTime;

  const decryptStartTime = performance.now();
  const decrypted = await encryptionService.decrypt(encrypted);
  const decryptTime = performance.now() - decryptStartTime;

  expect(decrypted).toBe(plaintext);
  expect(encryptTime).toBeLessThan(100); // 100ms以内
  expect(decryptTime).toBeLessThan(100); // 100ms以内
});
```

---

#### TC-FUNC-004: 特殊文字の暗号化・復号化

**優先度**: 🟡 High
**テストID**: TC-FUNC-004

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 特殊文字を含むテキストを暗号化
2. 復号化して元のテキストと一致することを確認

**期待結果**:
- ✅ 特殊文字が正しく暗号化・復号化される
- ✅ エンコーディングエラーが発生しない

**テストコード例**:
```typescript
test('TC-FUNC-004: 特殊文字の暗号化・復号化', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "特殊文字: !@#$%^&*()[]{}";
  const encrypted = await encryptionService.encrypt(plaintext);
  const decrypted = await encryptionService.decrypt(encrypted);

  expect(decrypted).toBe(plaintext);
});
```

---

#### TC-FUNC-005: 絵文字の暗号化・復号化

**優先度**: 🟡 High
**テストID**: TC-FUNC-005

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 絵文字を含むテキストを暗号化
2. 復号化して元のテキストと一致することを確認

**期待結果**:
- ✅ 絵文字が正しく暗号化・復号化される
- ✅ UTF-8エンコーディングが正しく処理される

**テストコード例**:
```typescript
test('TC-FUNC-005: 絵文字の暗号化・復号化', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "絵文字: 😀🎉🚀💯";
  const encrypted = await encryptionService.encrypt(plaintext);
  const decrypted = await encryptionService.decrypt(encrypted);

  expect(decrypted).toBe(plaintext);
});
```

---

#### TC-FUNC-006: 多言語テキストの暗号化・復号化

**優先度**: 🟡 High
**テストID**: TC-FUNC-006

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 複数の言語を含むテキストを暗号化
2. 復号化して元のテキストと一致することを確認

**期待結果**:
- ✅ 多言語テキストが正しく暗号化・復号化される
- ✅ 文字化けが発生しない

**テストコード例**:
```typescript
test('TC-FUNC-006: 多言語テキストの暗号化・復号化', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "English, 日本語, 中文, Tiếng Việt, 한국어";
  const encrypted = await encryptionService.encrypt(plaintext);
  const decrypted = await encryptionService.decrypt(encrypted);

  expect(decrypted).toBe(plaintext);
});
```

---

### 1.2 異常系テストケース

#### TC-FUNC-ERR-001: 不正な暗号化データの復号化

**優先度**: 🔴 Critical
**テストID**: TC-FUNC-ERR-001

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 不正な形式のデータを復号化
2. EncryptionErrorが発生することを確認
3. エラーメッセージが適切であることを確認

**期待結果**:
- ✅ EncryptionErrorが発生する
- ✅ エラーメッセージ: "データの復号化に失敗しました"
- ✅ スタックトレースに元のエラーが含まれる

**テストコード例**:
```typescript
test('TC-FUNC-ERR-001: 不正な暗号化データの復号化', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const invalidData = "invalid:data:format";

  await expect(
    encryptionService.decrypt(invalidData)
  ).rejects.toThrow('データの復号化に失敗しました');
});
```

---

#### TC-FUNC-ERR-002: 暗号化キーが初期化されていない状態での暗号化

**優先度**: 🔴 Critical
**テストID**: TC-FUNC-ERR-002

**前提条件**:
- EncryptionServiceがクリアされている（初期化されていない）

**テスト手順**:
1. 暗号化キーをクリア
2. 暗号化を試行
3. EncryptionErrorが発生することを確認

**期待結果**:
- ✅ EncryptionErrorが発生する
- ✅ エラーメッセージ: "暗号化キーが初期化されていません"

**テストコード例**:
```typescript
test('TC-FUNC-ERR-002: 暗号化キーが初期化されていない状態', async () => {
  const encryptionService = EncryptionService.getInstance();
  encryptionService.clearKey();

  const plaintext = "テストデータ";

  await expect(
    encryptionService.encrypt(plaintext)
  ).rejects.toThrow('暗号化キーが初期化されていません');
});
```

---

#### TC-FUNC-ERR-003: 改ざんされた暗号化データの復号化

**優先度**: 🔴 Critical
**テストID**: TC-FUNC-ERR-003

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 正常に暗号化されたデータを取得
2. 暗号文の一部を改ざん
3. 復号化を試行
4. 認証タグ検証に失敗することを確認

**期待結果**:
- ✅ 復号化が失敗する
- ✅ EncryptionErrorが発生する
- ✅ データ改ざんが検出される

**テストコード例**:
```typescript
test('TC-FUNC-ERR-003: 改ざんされた暗号化データの復号化', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "重要なデータ";
  const encrypted = await encryptionService.encrypt(plaintext);

  // 暗号文の一部を改ざん
  const parts = encrypted.split(':');
  parts[2] = parts[2].substring(0, 10) + 'XXXX' + parts[2].substring(14);
  const tampered = parts.join(':');

  await expect(
    encryptionService.decrypt(tampered)
  ).rejects.toThrow();
});
```

---

#### TC-FUNC-ERR-004: 異なるキーでの復号化

**優先度**: 🔴 Critical
**テストID**: TC-FUNC-ERR-004

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. キーAで暗号化
2. キーBで復号化を試行
3. 復号化が失敗することを確認

**期待結果**:
- ✅ 復号化が失敗する
- ✅ EncryptionErrorが発生する

**テストコード例**:
```typescript
test('TC-FUNC-ERR-004: 異なるキーでの復号化', async () => {
  const encryptionService1 = EncryptionService.getInstance();
  await encryptionService1.initialize(); // キーA生成

  const plaintext = "機密データ";
  const encrypted = await encryptionService1.encrypt(plaintext);

  // 別のキーで初期化
  await encryptionService1.initialize(); // キーB生成

  await expect(
    encryptionService1.decrypt(encrypted)
  ).rejects.toThrow();
});
```

---

## 2. セキュリティテスト

### 2.1 暗号化強度テスト

#### TC-SEC-001: IVの一意性確認

**優先度**: 🔴 Critical
**テストID**: TC-SEC-001

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 同じ平文を100回暗号化
2. すべての暗号文が異なることを確認
3. すべてのIVが一意であることを確認

**期待結果**:
- ✅ 同じ平文でも毎回異なる暗号文が生成される
- ✅ IVの重複が0件
- ✅ IVの長さが16バイト（128ビット）

**テストコード例**:
```typescript
test('TC-SEC-001: IVの一意性確認', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "同じテキスト";
  const encryptedSet = new Set<string>();
  const ivSet = new Set<string>();

  for (let i = 0; i < 100; i++) {
    const encrypted = await encryptionService.encrypt(plaintext);
    encryptedSet.add(encrypted);

    const [iv] = encrypted.split(':');
    ivSet.add(iv);
  }

  expect(encryptedSet.size).toBe(100); // すべて異なる
  expect(ivSet.size).toBe(100); // すべてのIVが一意
});
```

---

#### TC-SEC-002: 暗号化キーの漏洩チェック（メモリダンプ）

**優先度**: 🔴 Critical
**テストID**: TC-SEC-002

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 暗号化キーを生成
2. メモリ内のすべての文字列をダンプ（開発環境のみ）
3. 暗号化キーが平文で存在しないことを確認
4. `console.log`などでキーが出力されていないことを確認

**期待結果**:
- ✅ 暗号化キーがメモリダンプに平文で含まれない
- ✅ ログファイルに暗号化キーが出力されていない

**テストコード例**:
```typescript
test('TC-SEC-002: 暗号化キーの漏洩チェック', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const key = encryptionService.getEncryptionKey();
  expect(key).toBeTruthy();

  // console.logのスパイを設定
  const consoleSpy = jest.spyOn(console, 'log');

  await encryptionService.encrypt("テストデータ");

  // console.logにキーが含まれていないことを確認
  consoleSpy.mock.calls.forEach(call => {
    expect(call.join(' ')).not.toContain(key);
  });

  consoleSpy.mockRestore();
});
```

---

#### TC-SEC-003: Known-plaintext attackへの耐性

**優先度**: 🔴 Critical
**テストID**: TC-SEC-003

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 既知の平文と暗号文のペアを複数取得
2. 暗号化キーを推測できないことを確認
3. 次の暗号文を予測できないことを確認

**期待結果**:
- ✅ 平文と暗号文のペアから暗号化キーを推測できない
- ✅ 次の暗号文を予測できない（確率的暗号）
- ✅ AES-256-GCMの暗号学的強度を維持

**テストコード例**:
```typescript
test('TC-SEC-003: Known-plaintext attackへの耐性', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const knownPairs = [
    { plain: "既知の平文1", encrypted: "" },
    { plain: "既知の平文2", encrypted: "" },
    { plain: "既知の平文3", encrypted: "" },
  ];

  // 平文を暗号化
  for (const pair of knownPairs) {
    pair.encrypted = await encryptionService.encrypt(pair.plain);
  }

  // 次の暗号化が予測不可能であることを確認
  const nextPlain = "既知の平文1";
  const nextEncrypted = await encryptionService.encrypt(nextPlain);

  expect(nextEncrypted).not.toBe(knownPairs[0].encrypted);
});
```

---

#### TC-SEC-004: タイミング攻撃への耐性

**優先度**: 🟡 High
**テストID**: TC-SEC-004

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 正しい暗号文の復号化時間を計測（1000回）
2. 不正な暗号文の復号化失敗時間を計測（1000回）
3. 時間差が統計的に有意でないことを確認

**期待結果**:
- ✅ 成功/失敗時の処理時間に有意な差がない
- ✅ タイミング情報からキーを推測できない

**テストコード例**:
```typescript
test('TC-SEC-004: タイミング攻撃への耐性', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "テストデータ";
  const validEncrypted = await encryptionService.encrypt(plaintext);
  const invalidEncrypted = "invalid:data:format";

  // 正しい復号化の処理時間
  const validTimes: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    await encryptionService.decrypt(validEncrypted);
    validTimes.push(performance.now() - start);
  }

  // 不正な復号化の処理時間
  const invalidTimes: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    try {
      await encryptionService.decrypt(invalidEncrypted);
    } catch {
      // エラーは無視
    }
    invalidTimes.push(performance.now() - start);
  }

  const validAvg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
  const invalidAvg = invalidTimes.reduce((a, b) => a + b, 0) / invalidTimes.length;

  // 時間差が10%以内であることを確認
  const timeDiff = Math.abs(validAvg - invalidAvg);
  expect(timeDiff).toBeLessThan(validAvg * 0.1);
});
```

---

### 2.2 キー管理テスト

#### TC-SEC-005: Secure Storageへのキー保存

**優先度**: 🔴 Critical
**テストID**: TC-SEC-005

**前提条件**:
- アプリが初回起動状態

**テスト手順**:
1. アプリ初回起動時に暗号化キーを生成
2. SecureStorageServiceでキーを保存
3. iOS: Keychainに保存されることを確認
4. Android: Keystoreに保存されることを確認
5. Web: localStorageに保存されることを確認（警告を表示）

**期待結果**:
- ✅ iOS: Keychainに安全に保存される
- ✅ Android: Keystoreに安全に保存される
- ✅ Web: localStorageに保存される（警告表示）

**テストコード例**:
```typescript
test('TC-SEC-005: Secure Storageへのキー保存', async () => {
  const secureStorage = SecureStorageService.getInstance();

  // キーを生成して保存
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();
  const key = encryptionService.getEncryptionKey();

  await secureStorage.saveEncryptionKey(key!);

  // 保存されたキーを取得
  const retrievedKey = await secureStorage.getEncryptionKey();
  expect(retrievedKey).toBe(key);
});
```

---

#### TC-SEC-006: Web版でのXSS攻撃シミュレーション

**優先度**: 🔴 Critical
**テストID**: TC-SEC-006

**前提条件**:
- Web版でアプリを起動

**テスト手順**:
1. XSSペイロードを含むメモを登録
2. メモが正しくエスケープされて表示されることを確認
3. スクリプトが実行されないことを確認
4. localStorageから暗号化キーを取得できないことを確認（HttpOnly相当の保護）

**期待結果**:
- ✅ XSSペイロードがエスケープされて表示される
- ✅ スクリプトが実行されない
- ✅ 暗号化キーが漏洩しない

**テストコード例**:
```typescript
test('TC-SEC-006: XSS攻撃シミュレーション', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const xssPayload = "<script>alert('XSS')</script>";
  const encrypted = await encryptionService.encrypt(xssPayload);
  const decrypted = await encryptionService.decrypt(encrypted);

  // 復号化されたテキストが元のテキストと一致（エスケープされていない）
  expect(decrypted).toBe(xssPayload);

  // 表示時にエスケープされることを確認（React Nativeは自動エスケープ）
  // Web版ではDOMPurifyなどでサニタイズを推奨
});
```

---

#### TC-SEC-007: 暗号化キーのローテーション

**優先度**: 🟢 Medium
**テストID**: TC-SEC-007

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. キーAでデータを暗号化
2. キーBに変更
3. 既存データの再暗号化
4. すべてのデータが正しく復号化されることを確認

**期待結果**:
- ✅ キーのローテーションが正常に完了する
- ✅ データの損失がない

**テストコード例**:
```typescript
test('TC-SEC-007: 暗号化キーのローテーション', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "機密データ";
  const encrypted1 = await encryptionService.encrypt(plaintext);

  // 新しいキーで再初期化
  await encryptionService.initialize();

  // 既存データは復号化できない（異なるキー）
  await expect(
    encryptionService.decrypt(encrypted1)
  ).rejects.toThrow();

  // 新しいキーで再暗号化
  const encrypted2 = await encryptionService.encrypt(plaintext);
  const decrypted = await encryptionService.decrypt(encrypted2);

  expect(decrypted).toBe(plaintext);
});
```

---

## 3. 既存データ移行テスト

### 3.1 移行ロジックテスト

#### TC-MIG-001: XOR暗号化データの検出

**優先度**: 🔴 Critical
**テストID**: TC-MIG-001

**前提条件**:
- XOR暗号化されたデータが存在する

**テスト手順**:
1. XOR暗号化データをAsyncStorageに保存
2. アプリを起動
3. XOR暗号化データが検出されることを確認
4. 検出ロジック: `data.includes(':')` かつ Base64形式ではない

**期待結果**:
- ✅ XOR暗号化データが正しく検出される
- ✅ AES-256-GCM暗号化データと誤検出しない

**テストコード例**:
```typescript
test('TC-MIG-001: XOR暗号化データの検出', async () => {
  // XOR暗号化データをモック
  const xorEncrypted = "abc123:def456"; // XOR形式（現在の実装）

  // 検出ロジック
  const isXorEncrypted = (data: string) => {
    if (!data.includes(':')) return false;

    const parts = data.split(':');
    // XOR: iv:ciphertext (2パーツ)
    // AES-GCM: iv:authTag:ciphertext (3パーツ) と区別
    return parts.length === 2;
  };

  expect(isXorEncrypted(xorEncrypted)).toBe(true);

  const aesGcmEncrypted = "iv123:tag456:cipher789";
  expect(isXorEncrypted(aesGcmEncrypted)).toBe(false);
});
```

---

#### TC-MIG-002: XOR → AES-256-GCM への移行

**優先度**: 🔴 Critical
**テストID**: TC-MIG-002

**前提条件**:
- XOR暗号化されたデータが存在する

**テスト手順**:
1. XOR暗号化データを復号化（既存のXOR復号化ロジック使用）
2. 復号化された平文をAES-256-GCMで再暗号化
3. AsyncStorageに保存
4. 次回起動時に正しく復号化されることを確認

**期待結果**:
- ✅ XOR暗号化データが正しく復号化される
- ✅ AES-256-GCMで再暗号化される
- ✅ データの損失がない

**テストコード例**:
```typescript
test('TC-MIG-002: XOR → AES-256-GCM への移行', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  // XOR暗号化データをモック（既存実装で暗号化されたデータ）
  const plaintext = "移行テストデータ";
  const xorEncrypted = await encryptXorLegacy(plaintext); // 既存のXOR実装

  // XOR復号化
  const decrypted = await decryptXorLegacy(xorEncrypted);
  expect(decrypted).toBe(plaintext);

  // AES-256-GCMで再暗号化
  const aesEncrypted = await encryptionService.encrypt(decrypted);

  // 再暗号化されたデータを復号化
  const finalDecrypted = await encryptionService.decrypt(aesEncrypted);
  expect(finalDecrypted).toBe(plaintext);
});
```

---

#### TC-MIG-003: 暗号化されていない生データの扱い

**優先度**: 🔴 Critical
**テストID**: TC-MIG-003

**前提条件**:
- 暗号化されていない生データが存在する

**テスト手順**:
1. 生データ（平文）をAsyncStorageに保存
2. アプリを起動
3. 生データが検出されることを確認
4. AES-256-GCMで暗号化
5. 次回起動時に正しく復号化されることを確認

**期待結果**:
- ✅ 生データが正しく検出される
- ✅ AES-256-GCMで暗号化される
- ✅ データの損失がない

**テストコード例**:
```typescript
test('TC-MIG-003: 暗号化されていない生データの扱い', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "暗号化されていないデータ";

  // 生データかどうかを判定
  const isPlaintext = (data: string) => !data.includes(':');

  expect(isPlaintext(plaintext)).toBe(true);

  // 暗号化
  const encrypted = await encryptionService.encrypt(plaintext);
  expect(isPlaintext(encrypted)).toBe(false);

  // 復号化
  const decrypted = await encryptionService.decrypt(encrypted);
  expect(decrypted).toBe(plaintext);
});
```

---

#### TC-MIG-004: 移行失敗時のロールバック

**優先度**: 🟡 High
**テストID**: TC-MIG-004

**前提条件**:
- XOR暗号化されたデータが存在する

**テスト手順**:
1. 移行処理中にエラーを発生させる
2. データがロールバックされることを確認
3. 元のXOR暗号化データが保持されることを確認

**期待結果**:
- ✅ 移行失敗時にロールバックされる
- ✅ 元のデータが保持される
- ✅ エラーメッセージが表示される

**テストコード例**:
```typescript
test('TC-MIG-004: 移行失敗時のロールバック', async () => {
  const store = useResidenceStore.getState();

  // XOR暗号化データをモック
  await AsyncStorage.setItem(
    '@residence_cards',
    JSON.stringify([{ id: '1', memo: 'xor:encrypted:data' }])
  );

  // 移行処理をモック（失敗させる）
  jest.spyOn(EncryptionService.prototype, 'encrypt')
    .mockRejectedValueOnce(new Error('Migration failed'));

  // データ読み込み
  await store.loadData();

  // 元のデータが保持されている
  const cards = await AsyncStorage.getItem('@residence_cards');
  expect(JSON.parse(cards!)[0].memo).toBe('xor:encrypted:data');
});
```

---

#### TC-MIG-005: 後方互換性の確認

**優先度**: 🔴 Critical
**テストID**: TC-MIG-005

**前提条件**:
- 旧バージョンのアプリでデータを作成

**テスト手順**:
1. 旧バージョン（XOR暗号化）のデータを準備
2. 新バージョン（AES-256-GCM）で起動
3. データが正しく移行されることを確認
4. ダウングレード時のエラーハンドリングを確認

**期待結果**:
- ✅ 旧バージョンのデータが正しく移行される
- ✅ ダウングレード時に適切なエラーメッセージが表示される

**テストコード例**:
```typescript
test('TC-MIG-005: 後方互換性の確認', async () => {
  const store = useResidenceStore.getState();

  // 旧バージョンのデータ（XOR暗号化）
  const legacyData = [
    {
      id: '1',
      expirationDate: '2027-03-31',
      residenceType: 'work_visa',
      memo: 'xor:encrypted:memo',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  await AsyncStorage.setItem('@residence_cards', JSON.stringify(legacyData));

  // データ読み込み（自動移行）
  await store.loadData();

  // 移行されたデータを確認
  const cards = store.cards;
  expect(cards.length).toBe(1);
  expect(cards[0].memo).not.toBe('xor:encrypted:memo'); // 移行済み
});
```

---

## 4. パフォーマンステスト

### 4.1 処理時間テスト

#### TC-PERF-001: 暗号化処理時間（100ms以内）

**優先度**: 🟡 High
**テストID**: TC-PERF-001

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 500文字のテキストを暗号化
2. 処理時間を計測
3. 100ms以内であることを確認

**期待結果**:
- ✅ 暗号化処理時間が100ms以内
- ✅ 95パーセンタイルで100ms以内

**テストコード例**:
```typescript
test('TC-PERF-001: 暗号化処理時間', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "あ".repeat(500);
  const times: number[] = [];

  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await encryptionService.encrypt(plaintext);
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times.sort((a, b) => a - b)[94]; // 95パーセンタイル

  expect(avg).toBeLessThan(100);
  expect(p95).toBeLessThan(100);
});
```

---

#### TC-PERF-002: 復号化処理時間（100ms以内）

**優先度**: 🟡 High
**テストID**: TC-PERF-002

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 500文字のテキストを暗号化
2. 復号化処理時間を計測
3. 100ms以内であることを確認

**期待結果**:
- ✅ 復号化処理時間が100ms以内
- ✅ 95パーセンタイルで100ms以内

**テストコード例**:
```typescript
test('TC-PERF-002: 復号化処理時間', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "あ".repeat(500);
  const encrypted = await encryptionService.encrypt(plaintext);
  const times: number[] = [];

  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await encryptionService.decrypt(encrypted);
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times.sort((a, b) => a - b)[94];

  expect(avg).toBeLessThan(100);
  expect(p95).toBeLessThan(100);
});
```

---

#### TC-PERF-003: データ移行処理時間

**優先度**: 🟢 Medium
**テストID**: TC-PERF-003

**前提条件**:
- 100件のXOR暗号化データが存在する

**テスト手順**:
1. 100件のXOR暗号化データを準備
2. 移行処理時間を計測
3. 5秒以内であることを確認

**期待結果**:
- ✅ 100件の移行が5秒以内に完了
- ✅ UI がブロックされない（非同期処理）

**テストコード例**:
```typescript
test('TC-PERF-003: データ移行処理時間', async () => {
  const store = useResidenceStore.getState();

  // 100件のXOR暗号化データを準備
  const legacyData = Array.from({ length: 100 }, (_, i) => ({
    id: String(i),
    expirationDate: '2027-03-31',
    residenceType: 'work_visa',
    memo: `xor:encrypted:memo${i}`,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }));

  await AsyncStorage.setItem('@residence_cards', JSON.stringify(legacyData));

  const start = performance.now();
  await store.loadData();
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(5000); // 5秒以内
  expect(store.cards.length).toBe(100);
});
```

---

### 4.2 メモリ使用量テスト

#### TC-PERF-004: メモリリークチェック

**優先度**: 🟡 High
**テストID**: TC-PERF-004

**前提条件**:
- EncryptionServiceが初期化されている

**テスト手順**:
1. 1000回暗号化・復号化を繰り返す
2. メモリ使用量を監視
3. メモリリークがないことを確認

**期待結果**:
- ✅ メモリリークが発生しない
- ✅ メモリ使用量が一定範囲内に収まる

**テストコード例**:
```typescript
test('TC-PERF-004: メモリリークチェック', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "テストデータ";

  // 初期メモリ使用量
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

  // 1000回暗号化・復号化
  for (let i = 0; i < 1000; i++) {
    const encrypted = await encryptionService.encrypt(plaintext);
    await encryptionService.decrypt(encrypted);
  }

  // 最終メモリ使用量
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
  const memoryIncrease = finalMemory - initialMemory;

  // メモリ増加が10MB以下であることを確認
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
});
```

---

### 4.3 バッテリー消費テスト（モバイルのみ）

#### TC-PERF-005: バッテリー消費テスト

**優先度**: 🟢 Medium
**テストID**: TC-PERF-005

**前提条件**:
- iOS/Androidデバイスで実行

**テスト手順**:
1. バッテリー使用量を計測開始
2. 100回暗号化・復号化を実行
3. バッテリー消費量を確認
4. 許容範囲内（1%以下）であることを確認

**期待結果**:
- ✅ バッテリー消費が1%以下

**手動テスト**:
- iOS: Instruments - Energy Log
- Android: Battery Historian

---

## 5. クロスプラットフォームテスト

### 5.1 プラットフォーム間互換性

#### TC-CROSS-001: iOS → Android データ移行

**優先度**: 🔴 Critical
**テストID**: TC-CROSS-001

**前提条件**:
- iOSで暗号化されたデータが存在する

**テスト手順**:
1. iOSでデータを暗号化
2. AsyncStorageのデータをAndroidに移行
3. Androidで復号化
4. データが正しく復号化されることを確認

**期待結果**:
- ✅ プラットフォーム間でデータ互換性がある
- ✅ データの損失がない

**テストコード例**:
```typescript
test('TC-CROSS-001: iOS → Android データ移行', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "クロスプラットフォームテスト";
  const encrypted = await encryptionService.encrypt(plaintext);

  // 暗号化キーを保存
  const key = encryptionService.getEncryptionKey();

  // 別のプラットフォームでのシミュレーション
  // （実際には異なるデバイスで実行）
  const newEncryptionService = EncryptionService.getInstance();
  newEncryptionService.clearKey();
  await newEncryptionService.initialize(key!);

  const decrypted = await newEncryptionService.decrypt(encrypted);
  expect(decrypted).toBe(plaintext);
});
```

---

#### TC-CROSS-002: Android → Web データ移行

**優先度**: 🔴 Critical
**テストID**: TC-CROSS-002

**前提条件**:
- Androidで暗号化されたデータが存在する

**テスト手順**:
1. Androidでデータを暗号化
2. AsyncStorageのデータをWebに移行
3. Webで復号化
4. データが正しく復号化されることを確認

**期待結果**:
- ✅ プラットフォーム間でデータ互換性がある

**テストコード例**:
```typescript
test('TC-CROSS-002: Android → Web データ移行', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "Android → Web移行テスト";
  const encrypted = await encryptionService.encrypt(plaintext);

  // Web環境でのシミュレーション
  const key = encryptionService.getEncryptionKey();

  // 別のインスタンスでテスト
  const webEncryptionService = EncryptionService.getInstance();
  webEncryptionService.clearKey();
  await webEncryptionService.initialize(key!);

  const decrypted = await webEncryptionService.decrypt(encrypted);
  expect(decrypted).toBe(plaintext);
});
```

---

#### TC-CROSS-003: Web → iOS データ移行

**優先度**: 🔴 Critical
**テストID**: TC-CROSS-003

**前提条件**:
- Webで暗号化されたデータが存在する

**テスト手順**:
1. Webでデータを暗号化
2. localStorageのデータをiOSに移行
3. iOSで復号化
4. データが正しく復号化されることを確認

**期待結果**:
- ✅ プラットフォーム間でデータ互換性がある

**テストコード例**:
```typescript
test('TC-CROSS-003: Web → iOS データ移行', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const plaintext = "Web → iOS移行テスト";
  const encrypted = await encryptionService.encrypt(plaintext);

  const key = encryptionService.getEncryptionKey();

  // iOS環境でのシミュレーション
  const iosEncryptionService = EncryptionService.getInstance();
  iosEncryptionService.clearKey();
  await iosEncryptionService.initialize(key!);

  const decrypted = await iosEncryptionService.decrypt(encrypted);
  expect(decrypted).toBe(plaintext);
});
```

---

### 5.2 ライブラリ互換性テスト

#### TC-CROSS-004: @noble/ciphersの互換性確認

**優先度**: 🔴 Critical
**テストID**: TC-CROSS-004

**前提条件**:
- `@noble/ciphers`がインストールされている

**テスト手順**:
1. iOS/Android/Webですべて同じライブラリを使用
2. 各プラットフォームで暗号化・復号化
3. すべてのプラットフォームで互換性があることを確認

**期待結果**:
- ✅ すべてのプラットフォームで同じ暗号化結果
- ✅ 相互に復号化可能

---

## 6. エラーハンドリングテスト

### 6.1 ユーザー向けエラーメッセージ

#### TC-ERR-001: ユーザーフレンドリーなエラーメッセージ

**優先度**: 🔴 Critical
**テストID**: TC-ERR-001

**前提条件**:
- アプリが起動している

**テスト手順**:
1. 暗号化初期化失敗をシミュレート
2. エラーメッセージが表示されることを確認
3. エラーメッセージが日本語で分かりやすいことを確認

**期待結果**:
- ✅ エラーメッセージ: "データの読み込みに失敗しました。アプリを再起動してください。"
- ✅ 技術的な詳細がユーザーに表示されない

**テストコード例**:
```typescript
test('TC-ERR-001: ユーザーフレンドリーなエラーメッセージ', async () => {
  const store = useResidenceStore.getState();

  // 暗号化初期化失敗をモック
  jest.spyOn(EncryptionService.prototype, 'initialize')
    .mockRejectedValueOnce(new Error('Internal error'));

  // アラートをモック
  const alertSpy = jest.spyOn(global, 'alert').mockImplementation();

  await store.loadData();

  // ユーザー向けメッセージが表示される
  expect(alertSpy).toHaveBeenCalledWith(
    expect.stringContaining('データの読み込みに失敗しました')
  );

  alertSpy.mockRestore();
});
```

---

#### TC-ERR-002: エラー時の情報漏洩チェック

**優先度**: 🔴 Critical
**テストID**: TC-ERR-002

**前提条件**:
- アプリが起動している

**テスト手順**:
1. 復号化失敗をシミュレート
2. エラーメッセージに暗号化キーが含まれていないことを確認
3. エラーメッセージに暗号化データが含まれていないことを確認

**期待結果**:
- ✅ 暗号化キーが漏洩しない
- ✅ 暗号化データが漏洩しない
- ✅ エラーログに機密情報が含まれない

**テストコード例**:
```typescript
test('TC-ERR-002: エラー時の情報漏洩チェック', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const key = encryptionService.getEncryptionKey();
  const invalidData = "invalid:encrypted:data";

  // console.errorをスパイ
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  try {
    await encryptionService.decrypt(invalidData);
  } catch (error) {
    const errorMessage = (error as Error).message;

    // エラーメッセージに暗号化キーが含まれていない
    expect(errorMessage).not.toContain(key!);

    // エラーメッセージに暗号化データが含まれていない
    expect(errorMessage).not.toContain(invalidData);
  }

  // console.errorにも機密情報が含まれていない
  consoleErrorSpy.mock.calls.forEach(call => {
    expect(call.join(' ')).not.toContain(key!);
  });

  consoleErrorSpy.mockRestore();
});
```

---

#### TC-ERR-003: エラーログの適切性

**優先度**: 🟡 High
**テストID**: TC-ERR-003

**前提条件**:
- アプリが起動している

**テスト手順**:
1. 暗号化エラーを発生させる
2. console.errorにエラーがログ出力されることを確認
3. ログに適切なコンテキスト情報が含まれることを確認

**期待結果**:
- ✅ エラーがログ出力される
- ✅ ログにエラー種別、タイムスタンプが含まれる
- ✅ 機密情報が含まれない

**テストコード例**:
```typescript
test('TC-ERR-003: エラーログの適切性', async () => {
  const encryptionService = EncryptionService.getInstance();
  await encryptionService.initialize();

  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  try {
    await encryptionService.decrypt("invalid");
  } catch (error) {
    // エラーがキャッチされる
  }

  // console.errorが呼び出されている
  expect(consoleErrorSpy).toHaveBeenCalled();

  // ログに適切な情報が含まれる
  const logMessage = consoleErrorSpy.mock.calls[0].join(' ');
  expect(logMessage).toContain('Failed to decrypt');

  consoleErrorSpy.mockRestore();
});
```

---

## テスト実施スケジュール

### Phase 1: 機能テスト（1日目）

- [ ] TC-FUNC-001 ~ TC-FUNC-006（正常系）
- [ ] TC-FUNC-ERR-001 ~ TC-FUNC-ERR-004（異常系）

**担当**: フロントエンドエンジニア
**推定工数**: 8時間

---

### Phase 2: セキュリティテスト（2日目）

- [ ] TC-SEC-001 ~ TC-SEC-007（暗号化強度、キー管理）
- [ ] セキュリティレビュー（外部専門家）

**担当**: セキュリティエンジニア
**推定工数**: 8時間

---

### Phase 3: 移行テスト（3日目午前）

- [ ] TC-MIG-001 ~ TC-MIG-005（既存データ移行）

**担当**: バックエンドエンジニア
**推定工数**: 4時間

---

### Phase 4: パフォーマンステスト（3日目午後）

- [ ] TC-PERF-001 ~ TC-PERF-005（処理時間、メモリ、バッテリー）

**担当**: QAエンジニア
**推定工数**: 4時間

---

### Phase 5: クロスプラットフォームテスト（4日目）

- [ ] TC-CROSS-001 ~ TC-CROSS-004（iOS/Android/Web互換性）

**担当**: フロントエンドエンジニア（全プラットフォーム）
**推定工数**: 8時間

---

### Phase 6: エラーハンドリングテスト（5日目午前）

- [ ] TC-ERR-001 ~ TC-ERR-003（エラーメッセージ、情報漏洩）

**担当**: QAエンジニア
**推定工数**: 4時間

---

### Phase 7: 総合テスト・レポート作成（5日目午後）

- [ ] すべてのテストケースの最終確認
- [ ] テストレポート作成
- [ ] リリース判定会議

**担当**: QAリード
**推定工数**: 4時間

---

## テスト完了基準

### 必須条件（すべて満たす必要あり）

- [ ] **機能テスト合格率**: 100%（すべてのテストケースが合格）
- [ ] **セキュリティテスト合格率**: 100%（Critical/High優先度）
- [ ] **移行テスト合格率**: 100%（データ損失0件）
- [ ] **パフォーマンステスト合格率**: 90%以上（処理時間100ms以内）
- [ ] **クロスプラットフォームテスト合格率**: 100%（すべてのプラットフォームで互換性）
- [ ] **エラーハンドリングテスト合格率**: 100%（情報漏洩0件）

### 推奨条件（品質向上）

- [ ] **コードカバレッジ**: 80%以上（EncryptionService、SecureStorageService）
- [ ] **セキュリティ外部レビュー**: 脆弱性0件
- [ ] **パフォーマンス95パーセンタイル**: 100ms以内

---

## リスクと緩和策

### リスク1: データ移行失敗

**リスクレベル**: 🔴 Critical

**影響**: ユーザーのメモデータが消失

**緩和策**:
1. 移行前に自動バックアップ作成
2. 移行失敗時のロールバック実装
3. 段階的ロールアウト（β版→正式版）

---

### リスク2: クロスプラットフォーム互換性

**リスクレベル**: 🟡 High

**影響**: プラットフォーム間でデータが復号化できない

**緩和策**:
1. `@noble/ciphers`（Pure JavaScript）を採用
2. すべてのプラットフォームで同じライブラリを使用
3. エンディアンネス（バイトオーダー）を統一

---

### リスク3: パフォーマンス劣化

**リスクレベル**: 🟢 Medium

**影響**: 暗号化・復号化が遅く、UXが悪化

**緩和策**:
1. ネイティブ実装の検討（`react-native-aes-crypto`）
2. Web Worker（Web版）での非同期処理
3. キャッシュ機構の導入

---

### リスク4: Web版のセキュリティ

**リスクレベル**: 🟡 High

**影響**: XSS攻撃により暗号化キーが漏洩

**緩和策**:
1. Web Crypto API + IndexedDBへの移行
2. または、Web版では暗号化を無効化し警告表示
3. CSP（Content Security Policy）の導入

---

## テスト成果物

### 1. テストレポート

- 各テストケースの実施結果
- 合格/不合格の判定
- 不具合票（Issueトラッカー）

### 2. テストエビデンス

- スクリーンショット
- ログファイル
- パフォーマンス計測結果

### 3. セキュリティレビューレポート

- セキュリティ専門家による評価
- 脆弱性診断結果
- 改善推奨事項

### 4. リリース判定書

- テスト完了基準の達成状況
- リリース可否の判断
- 残存リスクの評価

---

## 付録

### A. テスト環境構築手順

```bash
# 1. 依存パッケージのインストール
cd frontend
npm install @noble/ciphers

# 2. テストフレームワークのセットアップ
npm install --save-dev jest @testing-library/react-native

# 3. テストの実行
npm test

# 4. カバレッジレポート生成
npm test -- --coverage
```

### B. テストデータ生成スクリプト

```typescript
// generateTestData.ts
export const generateTestData = () => {
  return {
    normalText: "在留期限は2027年3月31日です",
    emptyText: "",
    longText: "あ".repeat(500),
    specialChars: "特殊文字: !@#$%^&*()[]{}",
    emojiText: "絵文字: 😀🎉🚀💯",
    multiLang: "English, 日本語, 中文, Tiếng Việt, 한국어",
    xssPayload: "<script>alert('XSS')</script>",
  };
};
```

### C. XOR暗号化実装（既存・移行用）

```typescript
// legacyXorEncryption.ts
// 既存のXOR暗号化実装（移行テスト用）
export async function encryptXorLegacy(plaintext: string): Promise<string> {
  // 現在の実装と同じロジック
  // ...
}

export async function decryptXorLegacy(encryptedData: string): Promise<string> {
  // 現在の実装と同じロジック
  // ...
}
```

---

**テスト計画書バージョン**: 1.0
**最終更新日**: 2026-02-17
**承認者**: QAリード、セキュリティリード、開発リード
**次回レビュー日**: 実装完了後

---

**注意事項**:
- このテスト計画は、AES-256-GCM実装の開始前に承認される必要があります
- テスト実施中に新たなリスクが発見された場合は、即座に計画を更新してください
- すべてのCritical/High優先度のテストケースは必須です
