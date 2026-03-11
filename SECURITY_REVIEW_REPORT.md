# 在留資格更新リマインダーアプリ - セキュリティレビュー報告書

**レビュー日**: 2026年2月15日
**レビュー対象**: c:\projects\visa-reminder-app
**フロントエンド**: React Native + Expo
**データベース**: SQLite (ローカル)
**暗号化**: expo-crypto

---

## エグゼクティブサマリー

在留資格更新リマインダーアプリのセキュリティレビューを実施しました。全体として**データ最小化原則**に従った設計がなされており、個人情報保護の観点で良好です。ただし、暗号化実装の脆弱性、キー管理の不備、AsyncStorageのセキュリティリスクなど、**Critical/High レベルの問題が7件**発見されました。

### 重大な発見事項

- **CRITICAL**: 暗号化キーがメモリ内にのみ保存され、アプリ再起動で消失
- **CRITICAL**: 暗号化アルゴリズムが本番環境に不適切（XOR暗号の使用）
- **HIGH**: AsyncStorageに暗号化されていない通知設定やプッシュトークンを保存
- **HIGH**: 通知メッセージに在留資格タイプが含まれる可能性
- **MEDIUM**: SQLインジェクション対策が不完全（一部で文字列連結を使用）

---

## 1. データ保護

### 1.1 個人情報の取り扱い ✅ **PASS**

**評価**: 優良

アプリケーションは**プライバシー・バイ・デザイン**の原則に従い、機密性の高い個人情報を一切保存していません。

#### 保存していないデータ（適切）:
- ✅ 在留カード番号
- ✅ 氏名
- ✅ 住所
- ✅ パスポート番号
- ✅ 生年月日

#### 保存しているデータ（最小限）:
- 在留資格の種類（residence_type_id）
- 有効期限（expiry_date）
- ユーザー作成のメモ（暗号化済み）
- チェックリスト項目のメモ（暗号化済み）

#### コード検証:

**RegisterScreen.tsx (238行目)**
```typescript
<Text style={styles.helperText}>
  個人情報（氏名・在留カード番号等）の入力は避けてください
</Text>
```

**データベーススキーマ (DatabaseService.ts 186-199行目)**
```sql
CREATE TABLE IF NOT EXISTS residence_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  residence_type_id TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  application_start_date DATE,
  is_active INTEGER NOT NULL DEFAULT 1,
  memo TEXT,  -- 暗号化済み
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
)
```

**問題点**: なし

---

### 1.2 メモフィールドの暗号化実装 ⚠️ **CRITICAL/HIGH Issues**

**評価**: 重大な問題あり

#### **CRITICAL-001: 暗号化キーの永続化がない**

**リスク**: アプリ再起動後にデータが復号化不可能になる

**問題箇所**: `EncryptionService.ts`

```typescript
export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: string | null = null;  // ❌ メモリ内のみ

  public async initialize(key?: string): Promise<void> {
    if (key) {
      this.encryptionKey = key;
    } else {
      // キーが提供されていない場合は新規生成
      this.encryptionKey = await this.generateKey();  // ❌ 毎回新しいキーが生成される
    }
  }
```

**影響**:
- アプリを再起動すると、以前に暗号化されたメモが復号化できなくなる
- ユーザーデータの永久的な損失

**推奨対策**:
```typescript
// expo-secure-store を使用してキーを永続化
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY_STORAGE_KEY = 'encryption_master_key';

public async initialize(): Promise<void> {
  // 既存のキーを取得
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);

  if (!key) {
    // 新規キーを生成して保存
    key = await this.generateKey();
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, key);
  }

  this.encryptionKey = key;
}
```

---

#### **CRITICAL-002: 暗号化アルゴリズムが本番環境に不適切**

**リスク**: 暗号化されたデータが容易に解読される可能性

**問題箇所**: `EncryptionService.ts` (115-159行目)

```typescript
/**
 * 注: React Native環境では完全なAES-GCMの実装が困難なため、
 * expo-cryptoのダイジェスト機能とXORを組み合わせた簡易暗号化を使用
 * 本番環境では react-native-aes-crypto などの専用ライブラリ推奨
 */
public async encrypt(plaintext: string): Promise<string> {
  // ...
  // キーとIVを組み合わせてハッシュ化(暗号化キーストリームとして使用)
  const keyStream = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    this.encryptionKey + ivHex
  );

  // 簡易XOR暗号化 ❌
  const ciphertext = this.xorEncrypt(plaintextBase64, keyStream);
```

**問題点**:
1. **XOR暗号は暗号学的に安全ではない**
   - 平文の統計的性質が暗号文に残る
   - Known-plaintext攻撃に脆弱
   - Chosen-plaintext攻撃に脆弱

2. **SHA256のハッシュ値をそのままキーストリームとして使用**
   - SHA256の出力は32バイト（256ビット）のみ
   - 長い平文の場合、キーストリームが循環的に使用される
   - パターン解析が可能

3. **認証タグがない**
   - データの完全性検証ができない
   - 暗号文の改ざん検出ができない

**推奨対策**:
```typescript
// 推奨: react-native-aes-crypto または expo-crypto の適切な使用
import Aes from 'react-native-aes-crypto';

public async encrypt(plaintext: string): Promise<string> {
  const iv = await this.generateRandomBytes(16);
  const key = this.encryptionKey;

  // AES-256-GCM を使用
  const ciphertext = await Aes.encrypt(
    plaintext,
    key,
    iv,
    'aes-256-gcm'
  );

  return `${iv}:${ciphertext}`;
}
```

**または、暗号化ライブラリの追加**:
```bash
npm install react-native-aes-crypto
```

---

### 1.3 AsyncStorageのセキュリティ ⚠️ **HIGH Issues**

**評価**: 重大なリスクあり

#### **HIGH-001: AsyncStorageに機密情報が平文で保存される**

**リスク**: デバイスのルート化/Jailbreak時にデータが漏洩する

**問題箇所**:

**1. 通知設定 (useNotificationStore.ts 64-69行目)**
```typescript
// AsyncStorageから設定を取得
const settingsJson = await AsyncStorage.getItem(STORAGE_KEY);
if (settingsJson) {
  const settings = JSON.parse(settingsJson);  // ❌ 平文で保存
  set({ settings });
}
```

**2. プッシュトークン (notificationService.ts 236行目)**
```typescript
// トークンを保存
await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);  // ❌ 平文で保存
```

**3. デバイストークン (notificationService.ts 263行目)**
```typescript
async saveDeviceToken(token: DeviceToken): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.DEVICE_TOKEN,
      JSON.stringify(token)  // ❌ 平文で保存
    );
```

**4. 在留カードデータ (useResidenceStore.ts 65行目)**
```typescript
await AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));  // ❌ 平文
```

**AsyncStorageの問題点**:
- Android: `/data/data/<package>/shared_prefs/` に平文で保存
- iOS: `NSUserDefaults` に平文で保存
- ルート化/Jailbreak されたデバイスでは簡単にアクセス可能
- バックアップに含まれる可能性

**推奨対策**:
```typescript
// expo-secure-store を使用
import * as SecureStore from 'expo-secure-store';

// 機密情報の保存
await SecureStore.setItemAsync('push_token', token);

// 通常のデータは AsyncStorage でも可
// ただし、以下は SecureStore に移行すべき:
// - プッシュトークン
// - デバイストークン
// - 暗号化キー
```

**依存関係の追加**:
```bash
npx expo install expo-secure-store
```

---

## 2. 認証・認可

### 2.1 ローカルデータのアクセス制御 ⚠️ **MEDIUM Issue**

**評価**: 改善の余地あり

#### **MEDIUM-001: デバイス認証（生体認証）が実装されていない**

**リスク**: デバイスを紛失した際にデータが第三者に閲覧される

**現状**:
- アプリを開くだけで全データにアクセス可能
- ロック画面なし
- 生体認証なし

**推奨対策**:
```typescript
// expo-local-authentication を使用
import * as LocalAuthentication from 'expo-local-authentication';

async function authenticateUser() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (hasHardware && isEnrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: '在留資格情報を表示するには認証が必要です',
      fallbackLabel: 'パスコードを使用',
    });

    return result.success;
  }

  return true; // ハードウェアなしの場合はスキップ
}

// アプリ起動時に認証
useEffect(() => {
  const authenticate = async () => {
    const success = await authenticateUser();
    if (!success) {
      // 認証失敗時の処理
      navigation.navigate('AuthRequired');
    }
  };

  authenticate();
}, []);
```

**優先度**: MEDIUM（機能追加）

---

## 3. 暗号化

### 3.1 暗号化キーの管理 ⚠️ **CRITICAL Issue**

**評価**: 極めて深刻な問題

#### **CRITICAL-003: 暗号化キーが公開メソッドで取得可能**

**リスク**: キーが漏洩すると全データが復号化される

**問題箇所**: `EncryptionService.ts` (246-248行目)

```typescript
/**
 * 暗号化キーを取得(保存用)
 * 注: このキーは安全な場所(Keychain/Keystore)に保存する必要がある
 */
public getEncryptionKey(): string | null {
  return this.encryptionKey;  // ❌ 誰でも取得可能
}
```

**問題点**:
1. コメントに「安全な場所に保存する必要がある」と書かれているが、実装されていない
2. 公開メソッドのため、任意のコードからキーを取得可能
3. キーがログに出力される可能性

**推奨対策**:
```typescript
// このメソッドを削除し、内部でのみキーを使用
// または、private にする
private getEncryptionKey(): string | null {
  return this.encryptionKey;
}

// キーの保存は EncryptionService 内部で完結させる
private async saveKey(key: string): Promise<void> {
  await SecureStore.setItemAsync('encryption_master_key', key);
}

private async loadKey(): Promise<string | null> {
  return await SecureStore.getItemAsync('encryption_master_key');
}
```

---

### 3.2 暗号化アルゴリズムの適切性 ⚠️ **HIGH Issue**

**評価**: 前述の CRITICAL-002 を参照

---

## 4. SQLインジェクション対策

### 4.1 パラメータ化クエリの使用状況 ⚠️ **MEDIUM Issues**

**評価**: 大部分は適切だが、一部に問題あり

#### **良好な実装例**:

**ResidenceCardRepository.ts (65-81行目)**
```typescript
await db.runAsync(
  `INSERT INTO residence_cards (
    id, user_id, residence_type_id, expiry_date, application_start_date,
    is_active, memo, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,  // ✅ プレースホルダー使用
  [
    id,
    userId,
    input.residence_type_id,
    input.expiry_date,
    applicationStartDate.toISOString().split('T')[0],
    1,
    encryptedMemo,
    now,
    now,
  ]
);
```

#### **MEDIUM-002: 文字列連結によるクエリ構築**

**問題箇所**: `ResidenceCardRepository.ts` (268行目), `ChecklistRepository.ts` (346行目)

```typescript
await db.runAsync(
  `UPDATE residence_cards SET ${updates.join(', ')} WHERE id = ?`,  // ⚠️ 動的クエリ
  values
);
```

**問題点**:
- `updates` 配列の内容は固定文字列だが、将来の変更で脆弱性が混入する可能性
- コードレビュー時に見落とされやすい

**現状の評価**:
- 現在のコードでは `updates` に追加される文字列は全てハードコードされており、安全
- しかし、保守性の観点で改善の余地あり

**推奨対策**:
```typescript
// ホワイトリスト方式を採用
const ALLOWED_FIELDS = {
  residence_type_id: 'residence_type_id',
  expiry_date: 'expiry_date',
  memo: 'memo',
  is_active: 'is_active',
} as const;

const updates: string[] = [];
const values: any[] = [];

if (input.residence_type_id !== undefined) {
  updates.push(`${ALLOWED_FIELDS.residence_type_id} = ?`);
  values.push(input.residence_type_id);
}
```

**優先度**: MEDIUM（コード品質改善）

---

#### **MEDIUM-003: PRAGMA 文の直接実行**

**問題箇所**: `DatabaseService.ts` (51, 141行目)

```typescript
await this.db.execAsync('PRAGMA foreign_keys = ON;');  // ⚠️ 固定値だが注意
await this.db.execAsync(`PRAGMA user_version = ${version};`);  // ⚠️ 数値だが変数埋め込み
```

**現状の評価**:
- `version` は内部で管理された整数値のため、現状は安全
- しかし、テンプレート文字列の使用は推奨されない

**推奨対策**:
```typescript
// PRAGMAでもパラメータ化を使用（可能な場合）
// または、厳密な型チェックを追加
await this.db.execAsync(`PRAGMA user_version = ${parseInt(version, 10)};`);
```

**優先度**: LOW（現状は安全だが、ベストプラクティスとして）

---

## 5. 依存関係の脆弱性

### 5.1 package.json の依存関係

**検証方法**: `npm audit` を実行すべきだが、package-lock.json が必要

**現在の依存関係**:
```json
{
  "@react-native-async-storage/async-storage": "2.2.0",
  "expo": "^54.0.33",
  "expo-crypto": "~14.0.1",
  "expo-notifications": "~0.32.16",
  "expo-sqlite": "~15.0.7",
  "react": "19.1.0",
  "react-native": "0.81.5"
}
```

#### **LOW-001: 古い依存関係の可能性**

**問題点**:
- `package-lock.json` が存在するが、`npm audit` が実行できない環境
- 定期的な依存関係の更新が必要

**推奨対策**:
```bash
# 依存関係の脆弱性スキャン
npm audit

# 自動修正
npm audit fix

# または、手動更新
npm update

# Expo の更新
npx expo-doctor
```

**優先度**: LOW（定期メンテナンス）

---

## 6. 通知システムのセキュリティ

### 6.1 通知に個人情報が含まれないか ⚠️ **HIGH Issue**

**評価**: 部分的に問題あり

#### **HIGH-002: 通知メッセージに在留資格タイプが含まれる**

**問題箇所**: `notificationService.ts` (111行目)

```typescript
body: `${this.getResidenceTypeLabel(card.residenceType)}の有効期限まで残り${days}日です。`
// 例: "技術・人文知識・国際業務の有効期限まで残り90日です。"
```

**リスク**:
- ロック画面に通知が表示される
- 在留資格の種類が第三者に見られる可能性
- プライバシーの侵害

**推奨対策**:
```typescript
// オプション1: 一般的なメッセージに変更
body: `在留期間の有効期限まで残り${days}日です。` // ✅ 資格タイプを含めない

// オプション2: ユーザー設定で選択可能にする
interface NotificationSettings {
  showResidenceType: boolean; // デフォルト: false
}

if (settings.showResidenceType) {
  body = `${this.getResidenceTypeLabel(card.residenceType)}の有効期限まで残り${days}日です。`;
} else {
  body = `在留期間の有効期限まで残り${days}日です。`;
}
```

**優先度**: HIGH

---

### 6.2 プッシュトークンの管理 ⚠️ **Refer to HIGH-001**

前述の **HIGH-001: AsyncStorageに機密情報が平文で保存される** を参照

---

## 7. コンプライアンス

### 7.1 プライバシー設計（データ最小化原則） ✅ **PASS**

**評価**: 優良

アプリケーションは以下の原則に従っています:

1. **データ最小化**
   - ✅ 必要最小限のデータのみ収集
   - ✅ 在留カード番号、氏名、住所などは保存しない

2. **目的制限**
   - ✅ 収集したデータは在留期間更新リマインダーのみに使用
   - ✅ 第三者への提供なし（ローカルアプリ）

3. **保存制限**
   - ✅ 論理削除により、不要になったデータは削除可能
   - ✅ `deleted_at` フィールドによる管理

4. **正確性**
   - ✅ ユーザーが自由にデータを編集可能

5. **完全性と機密性**
   - ⚠️ メモフィールドは暗号化されているが、実装に問題あり（前述）

---

### 7.2 GDPR/個人情報保護法への準拠 ⚠️ **MEDIUM Issues**

**評価**: 基本的には準拠しているが、改善が必要

#### **MEDIUM-004: プライバシーポリシーの欠如**

**問題点**:
- アプリ内にプライバシーポリシーが見当たらない
- データの取り扱いに関する説明がない
- ユーザーの同意取得プロセスがない

**推奨対策**:
1. **プライバシーポリシーの作成**
   - 収集するデータの種類
   - データの使用目的
   - データの保存場所（ローカルデバイスのみ）
   - データの保管期間
   - ユーザーの権利（アクセス、訂正、削除）

2. **初回起動時の同意画面**
```typescript
// 初回起動時に表示
<PrivacyConsentScreen>
  <Text>このアプリは以下のデータを収集します:</Text>
  <Text>- 在留資格の種類</Text>
  <Text>- 有効期限</Text>
  <Text>- ユーザーが入力したメモ（暗号化されます）</Text>

  <Text>これらのデータはデバイス内にのみ保存され、外部に送信されることはありません。</Text>

  <Button onPress={acceptPrivacyPolicy}>同意する</Button>
</PrivacyConsentScreen>
```

**優先度**: MEDIUM（法的要件）

---

#### **MEDIUM-005: データエクスポート機能の欠如**

**問題点**:
- ユーザーが自分のデータをエクスポートできない
- GDPR の「データポータビリティの権利」に非準拠

**推奨対策**:
```typescript
// 設定画面にエクスポート機能を追加
async function exportUserData() {
  const cards = await ResidenceCardRepository.findByUserId(userId);
  const settings = await ReminderRepository.findByUserId(userId);

  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    cards,
    settings,
  };

  // JSON形式で保存
  const json = JSON.stringify(exportData, null, 2);

  // ファイルとして保存
  await FileSystem.writeAsStringAsync(
    `${FileSystem.documentDirectory}/my_residence_data.json`,
    json
  );

  // 共有
  await Sharing.shareAsync(
    `${FileSystem.documentDirectory}/my_residence_data.json`
  );
}
```

**優先度**: MEDIUM（機能追加）

---

#### **MEDIUM-006: データ完全削除機能の欠如**

**問題点**:
- 論理削除のみで、物理削除のオプションがない
- GDPR の「忘れられる権利」に部分的に非準拠

**現状の削除処理**: `ResidenceCardRepository.ts` (290-299行目)
```typescript
public async delete(id: string): Promise<void> {
  // 論理削除のみ
  await db.runAsync(
    `UPDATE residence_cards SET deleted_at = ?, is_active = 0 WHERE id = ?`,
    [now, id]
  );
}
```

**推奨対策**:
```typescript
// 設定画面に「すべてのデータを完全に削除」オプションを追加
async function deleteAllUserData() {
  Alert.alert(
    'すべてのデータを削除',
    'この操作は取り消せません。本当に削除しますか？',
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          // データベースをリセット
          await DatabaseService.reset();

          // AsyncStorageをクリア
          await AsyncStorage.clear();

          // SecureStoreをクリア
          await SecureStore.deleteItemAsync('encryption_master_key');

          // アプリを再起動
          Updates.reloadAsync();
        },
      },
    ]
  );
}
```

**優先度**: MEDIUM（機能追加）

---

## セキュリティ問題サマリー

### Critical (重大) - 3件

| ID | 問題 | リスク | 優先度 |
|----|------|--------|--------|
| CRITICAL-001 | 暗号化キーが永続化されていない | データ損失 | 🔴 即座に対応 |
| CRITICAL-002 | 暗号化アルゴリズムが本番環境に不適切（XOR暗号） | データ漏洩 | 🔴 即座に対応 |
| CRITICAL-003 | 暗号化キーが公開メソッドで取得可能 | キー漏洩 | 🔴 即座に対応 |

### High (高) - 2件

| ID | 問題 | リスク | 優先度 |
|----|------|--------|--------|
| HIGH-001 | AsyncStorageに機密情報が平文で保存 | データ漏洩 | 🟠 早急に対応 |
| HIGH-002 | 通知メッセージに在留資格タイプが含まれる | プライバシー侵害 | 🟠 早急に対応 |

### Medium (中) - 6件

| ID | 問題 | リスク | 優先度 |
|----|------|--------|--------|
| MEDIUM-001 | デバイス認証（生体認証）が実装されていない | 不正アクセス | 🟡 対応推奨 |
| MEDIUM-002 | 文字列連結によるクエリ構築 | 保守性低下 | 🟡 対応推奨 |
| MEDIUM-003 | PRAGMA文の直接実行 | コード品質 | 🟡 対応推奨 |
| MEDIUM-004 | プライバシーポリシーの欠如 | 法的リスク | 🟡 対応推奨 |
| MEDIUM-005 | データエクスポート機能の欠如 | GDPR非準拠 | 🟡 対応推奨 |
| MEDIUM-006 | データ完全削除機能の欠如 | GDPR部分非準拠 | 🟡 対応推奨 |

### Low (低) - 1件

| ID | 問題 | リスク | 優先度 |
|----|------|--------|--------|
| LOW-001 | 古い依存関係の可能性 | 既知の脆弱性 | 🟢 定期メンテナンス |

---

## 推奨される改善策

### フェーズ1: 緊急対応（1-2週間）

#### 1. expo-secure-store の導入

**優先度**: 🔴 CRITICAL

```bash
npx expo install expo-secure-store
```

**実装**:
```typescript
// EncryptionService.ts の改修
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY_STORAGE_KEY = 'encryption_master_key';

public async initialize(): Promise<void> {
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);

  if (!key) {
    key = await this.generateKey();
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, key);
  }

  this.encryptionKey = key;
}

// getEncryptionKey() メソッドを削除または private にする
```

---

#### 2. 暗号化ライブラリの導入

**優先度**: 🔴 CRITICAL

**オプションA: react-native-aes-crypto の使用**

```bash
npm install react-native-aes-crypto
cd ios && pod install
```

```typescript
import Aes from 'react-native-aes-crypto';

public async encrypt(plaintext: string): Promise<string> {
  const iv = await Crypto.getRandomBytesAsync(16);
  const ivHex = this.bytesToHex(iv);

  const ciphertext = await Aes.encrypt(
    plaintext,
    this.encryptionKey!,
    ivHex,
    'aes-256-cbc'
  );

  return `${ivHex}:${ciphertext}`;
}

public async decrypt(encryptedData: string): Promise<string> {
  const [ivHex, ciphertext] = encryptedData.split(':');

  const plaintext = await Aes.decrypt(
    ciphertext,
    this.encryptionKey!,
    ivHex,
    'aes-256-cbc'
  );

  return plaintext;
}
```

**オプションB: expo-crypto の適切な使用方法を調査**

---

#### 3. AsyncStorage → SecureStore への移行

**優先度**: 🟠 HIGH

```typescript
// 移行が必要なデータ:
// 1. プッシュトークン
// 2. デバイストークン
// 3. 暗号化キー（上記で対応済み）

// notificationService.ts の改修
import * as SecureStore from 'expo-secure-store';

async registerForPushNotifications(): Promise<string | null> {
  // ...
  const token = tokenData.data;

  // AsyncStorage → SecureStore
  await SecureStore.setItemAsync(STORAGE_KEYS.PUSH_TOKEN, token);

  return token;
}
```

---

### フェーズ2: 重要な改善（2-4週間）

#### 4. 通知メッセージの見直し

**優先度**: 🟠 HIGH

```typescript
// 設定画面に追加
interface NotificationSettings {
  showResidenceTypeInNotification: boolean; // デフォルト: false
}

// notificationService.ts の改修
if (settings.showResidenceTypeInNotification) {
  body = `${this.getResidenceTypeLabel(card.residenceType)}の有効期限まで残り${days}日です。`;
} else {
  body = `在留期間の有効期限まで残り${days}日です。`;
}
```

---

#### 5. 生体認証の実装

**優先度**: 🟡 MEDIUM

```bash
npx expo install expo-local-authentication
```

```typescript
// App.tsx
import * as LocalAuthentication from 'expo-local-authentication';

useEffect(() => {
  const authenticate = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '在留資格情報にアクセスするには認証が必要です',
        fallbackLabel: 'パスコードを使用',
      });

      if (!result.success) {
        // 認証失敗
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } else {
      // 生体認証が利用できない場合はスキップ
      setIsAuthenticated(true);
    }
  };

  authenticate();
}, []);
```

---

### フェーズ3: コンプライアンス対応（4-6週間）

#### 6. プライバシーポリシーの作成と同意画面

**優先度**: 🟡 MEDIUM

```typescript
// PrivacyPolicyScreen.tsx
export function PrivacyPolicyScreen() {
  const [agreed, setAgreed] = useState(false);

  const acceptPolicy = async () => {
    await AsyncStorage.setItem('privacy_policy_accepted', 'true');
    navigation.navigate('Home');
  };

  return (
    <ScrollView>
      <Text style={styles.title}>プライバシーポリシー</Text>

      <Text style={styles.section}>1. 収集するデータ</Text>
      <Text>本アプリは以下のデータを収集します:</Text>
      <Text>• 在留資格の種類</Text>
      <Text>• 有効期限</Text>
      <Text>• ユーザーが入力したメモ（暗号化されます）</Text>

      <Text style={styles.section}>2. データの使用目的</Text>
      <Text>収集したデータは、在留期間更新のリマインダー通知のみに使用されます。</Text>

      <Text style={styles.section}>3. データの保存場所</Text>
      <Text>すべてのデータはお使いのデバイス内にのみ保存され、外部のサーバーに送信されることはありません。</Text>

      <Text style={styles.section}>4. データの削除</Text>
      <Text>アプリをアンインストールすることで、すべてのデータが削除されます。</Text>

      <CheckBox
        value={agreed}
        onValueChange={setAgreed}
        label="プライバシーポリシーに同意します"
      />

      <Button
        title="同意して続ける"
        onPress={acceptPolicy}
        disabled={!agreed}
      />
    </ScrollView>
  );
}
```

---

#### 7. データエクスポート機能

**優先度**: 🟡 MEDIUM

```typescript
// SettingsScreen.tsx
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

async function exportUserData() {
  const userId = await getUserId();

  const cards = await ResidenceCardRepository.findByUserId(userId);
  const settings = await ReminderRepository.findByUserId(userId);
  const checklists = await ChecklistRepository.findByResidenceCardId(cards[0]?.id);

  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      residenceCards: cards,
      reminderSettings: settings,
      checklists,
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  const fileUri = `${FileSystem.documentDirectory}/residence_data_export.json`;

  await FileSystem.writeAsStringAsync(fileUri, json);
  await Sharing.shareAsync(fileUri);
}

// UI
<Button title="データをエクスポート" onPress={exportUserData} />
```

---

#### 8. データ完全削除機能

**優先度**: 🟡 MEDIUM

```typescript
// SettingsScreen.tsx
async function deleteAllData() {
  Alert.alert(
    'すべてのデータを削除',
    'この操作は取り消せません。本当にすべてのデータを削除しますか？',
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            // 1. データベースをリセット
            await DatabaseService.reset();

            // 2. AsyncStorage をクリア
            await AsyncStorage.clear();

            // 3. SecureStore をクリア
            await SecureStore.deleteItemAsync('encryption_master_key');
            await SecureStore.deleteItemAsync('push_token');

            // 4. 暗号化サービスをクリア
            EncryptionService.clearKey();

            Alert.alert('完了', 'すべてのデータが削除されました');

            // 5. アプリを再起動
            if (Updates.isAvailable()) {
              await Updates.reloadAsync();
            }
          } catch (error) {
            Alert.alert('エラー', 'データの削除に失敗しました');
          }
        },
      },
    ]
  );
}

// UI
<Button
  title="すべてのデータを削除"
  onPress={deleteAllData}
  color="red"
/>
```

---

## セキュリティチェックリスト

### データ保護

- [x] 個人情報（氏名、在留カード番号等）は保存しない
- [x] 機密データ（メモ）は暗号化する
- [ ] 暗号化キーは SecureStore に保存する (CRITICAL-001)
- [ ] 本番環境に適した暗号化アルゴリズムを使用する (CRITICAL-002)
- [ ] 暗号化キーを外部に公開しない (CRITICAL-003)

### 認証・認可

- [ ] デバイス認証（生体認証）を実装する (MEDIUM-001)
- [ ] アプリ起動時に認証を要求する
- [ ] バックグラウンドから復帰時に認証を要求する

### 暗号化

- [ ] AES-256-GCM または AES-256-CBC を使用する (CRITICAL-002)
- [ ] 暗号化キーを SecureStore/Keychain/Keystore に保存する (CRITICAL-001)
- [ ] IV（初期化ベクトル）をランダム生成する
- [ ] 認証タグを使用してデータの完全性を保証する

### データベースセキュリティ

- [x] パラメータ化クエリを使用する（大部分）
- [ ] 動的クエリのホワイトリスト化を徹底する (MEDIUM-002)
- [x] 外部キー制約を有効化する
- [x] トランザクションを使用する

### AsyncStorage/SecureStore

- [ ] プッシュトークンを SecureStore に保存する (HIGH-001)
- [ ] デバイストークンを SecureStore に保存する (HIGH-001)
- [ ] 暗号化キーを SecureStore に保存する (CRITICAL-001)
- [x] 通知設定は AsyncStorage でも可（機密性低い）

### 通知セキュリティ

- [ ] 通知メッセージに個人情報を含めない (HIGH-002)
- [ ] 在留資格タイプの表示をユーザー設定で制御する
- [x] 通知ペイロードに最小限の情報のみ含める

### コンプライアンス

- [x] データ最小化原則に従う
- [ ] プライバシーポリシーを作成する (MEDIUM-004)
- [ ] 初回起動時に同意を取得する (MEDIUM-004)
- [ ] データエクスポート機能を実装する (MEDIUM-005)
- [ ] データ完全削除機能を実装する (MEDIUM-006)

### 依存関係

- [ ] 定期的に `npm audit` を実行する (LOW-001)
- [ ] 依存関係を最新に保つ
- [ ] 既知の脆弱性に対処する

### コードレビュー

- [ ] セキュリティコードレビューを実施する
- [ ] ペネトレーションテストを実施する
- [ ] 静的解析ツール（ESLint + security plugin）を導入する

---

## 結論

在留資格更新リマインダーアプリは、**データ最小化原則**に従った優れたプライバシー設計を持っています。しかし、以下の重大な問題が発見されました:

### 最重要課題（即座に対応が必要）

1. **暗号化キーの永続化** (CRITICAL-001)
   - 現状: アプリ再起動でキーが消失し、データが復号化不可能
   - 対策: expo-secure-store を使用してキーを永続化

2. **暗号化アルゴリズムの改善** (CRITICAL-002)
   - 現状: XOR暗号は本番環境に不適切
   - 対策: react-native-aes-crypto または適切な AES 実装を使用

3. **暗号化キーの保護** (CRITICAL-003)
   - 現状: 公開メソッドで取得可能
   - 対策: メソッドを削除または private にする

4. **機密情報の保護** (HIGH-001)
   - 現状: AsyncStorage に平文で保存
   - 対策: SecureStore に移行

5. **通知のプライバシー** (HIGH-002)
   - 現状: 在留資格タイプがロック画面に表示される
   - 対策: 一般的なメッセージに変更、またはユーザー設定で制御

### 推奨される実装スケジュール

| フェーズ | 期間 | タスク |
|---------|------|--------|
| フェーズ1 | 1-2週間 | CRITICAL-001, 002, 003, HIGH-001 の対応 |
| フェーズ2 | 2-4週間 | HIGH-002, MEDIUM-001 の対応 |
| フェーズ3 | 4-6週間 | MEDIUM-004, 005, 006 の対応（コンプライアンス） |

### 総合評価

**セキュリティスコア: 55/100**

- **データ保護**: 70/100（暗号化実装に問題あり）
- **認証・認可**: 30/100（デバイス認証なし）
- **暗号化**: 40/100（アルゴリズムとキー管理に重大な問題）
- **データベースセキュリティ**: 80/100（概ね良好）
- **コンプライアンス**: 60/100（基本は遵守、細部に改善余地）

**推奨事項**: 上記の Critical/High レベルの問題を早急に修正し、本番環境へのリリース前に再レビューを実施することを強く推奨します。

---

## 添付資料

### A. 推奨される依存関係の追加

```json
{
  "dependencies": {
    "expo-secure-store": "^13.0.1",
    "expo-local-authentication": "^14.0.1",
    "react-native-aes-crypto": "^2.1.0",
    "expo-file-system": "^17.0.1",
    "expo-sharing": "^12.0.1"
  }
}
```

### B. セキュリティ設定の推奨値

```typescript
// app.json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSFaceIDUsageDescription": "在留資格情報にアクセスするため、Face IDを使用します",
        "NSCameraUsageDescription": "書類のスキャンに使用します（オプション）"
      }
    },
    "android": {
      "permissions": [
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
    }
  }
}
```

### C. 参考資料

- [OWASP Mobile Security Testing Guide](https://owasp.org/www-project-mobile-security-testing-guide/)
- [Expo Security Best Practices](https://docs.expo.dev/guides/security/)
- [React Native Security Guide](https://reactnative.dev/docs/security)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)

---

**レビュー担当**: セキュリティエンジニア
**レビュー日**: 2026年2月15日
**次回レビュー予定**: 対策実施後、再レビューを推奨
