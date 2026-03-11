# セキュリティ設計書:在留資格更新リマインダー

**作成日**: 2026年2月14日
**バージョン**: 1.0

---

## 1. 概要

### 1.1 セキュリティ設計の目的

在留資格情報という機密性の高い個人情報を扱うため、以下の観点で堅牢なセキュリティ設計を行う。

- **機密性（Confidentiality）**: データの暗号化・アクセス制御
- **完全性（Integrity）**: データ改ざん防止
- **可用性（Availability）**: サービス継続性の確保
- **プライバシー（Privacy）**: 個人情報の最小化・匿名化

### 1.2 準拠法規・ガイドライン

- **個人情報保護法**（日本）
- **GDPR**（EU一般データ保護規則）- 将来の多言語展開に備えて
- **OWASP Top 10**（Webアプリケーションセキュリティ）
- **Apple App Store Review Guidelines**
- **Google Play Developer Program Policies**

---

## 2. データ保護方針

### 2.1 データ分類

| 分類 | データ種別 | 保護レベル | 保存可否 |
|------|----------|----------|---------|
| **機密情報** | 在留カード番号、氏名、生年月日、住所 | 最高 | **保存しない（原則）** |
| **準機密** | 有効期限、資格タイプ、申請開始日 | 高 | 暗号化して保存 |
| **一般情報** | チェックリストの完了状態 | 中 | 平文で保存可 |
| **公開情報** | 資格タイプマスタ、テンプレート | 低 | 平文で保存可 |

### 2.2 データ最小化原則

**要件定義書「3.3 非機能要件」より**:
> 在留カード番号や氏名などは保存しない設計を推奨

**実装方針**:
- 在留カード番号: **保存しない**
- 氏名: **保存しない**
- 生年月日: **保存しない**
- 住所: **保存しない**
- 有効期限: **必須（暗号化推奨）**
- 資格タイプ: **必須（ID参照のみ）**
- メモ: **ユーザー任意（暗号化必須）**

### 2.3 データ保存期間

| データ | 保存期間 | 削除方法 |
|-------|---------|---------|
| 在留カード情報 | ユーザーが削除するまで | 論理削除（deleted_at） |
| チェックリスト項目 | 親カードと同期 | カスケード削除 |
| 通知履歴 | 送信後1年間 | 自動削除（バッチ処理） |
| デバイストークン | 最終使用から6ヶ月 | 自動削除 |
| ユーザーアカウント | 最終アクセスから3年 | 自動削除（通知後） |

---

## 3. 暗号化設計

### 3.1 転送時の暗号化（Transport Encryption）

**TLS/SSL**:
- **プロトコル**: TLS 1.3（最低 TLS 1.2）
- **暗号スイート**: AES-256-GCM 推奨
- **証明書**: Let's Encrypt または信頼された CA
- **HSTS**: Strict-Transport-Security ヘッダーを送信

**HTTPS 強制設定（Nginx）**:
```nginx
server {
    listen 80;
    server_name api.visa-reminder.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.visa-reminder.app;

    ssl_certificate /etc/letsencrypt/live/api.visa-reminder.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.visa-reminder.app/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 3.2 保存時の暗号化（Data at Rest）

#### 3.2.1 暗号化対象フィールド

- `residence_cards.memo` - ユーザーメモ
- `checklist_items.memo` - チェックリスト項目のメモ

#### 3.2.2 暗号化方式

**アルゴリズム**: AES-256-GCM（Galois/Counter Mode）

**選定理由**:
- 認証付き暗号（AEAD）でデータ改ざん検出可能
- NIST推奨の標準方式
- 高速な処理性能

#### 3.2.3 暗号化実装（Node.js）

```javascript
// encryption.js
const crypto = require('crypto');

// 環境変数から暗号化キーを取得（32バイト = 256ビット）
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * データを暗号化
 * @param {string} plaintext - 平文
 * @returns {string} - 暗号化データ（iv:authTag:ciphertext）
 */
function encrypt(plaintext) {
  if (!plaintext) return null;

  // 初期化ベクトル（IV）を生成（16バイト）
  const iv = crypto.randomBytes(16);

  // 暗号化器を作成
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  // 暗号化実行
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // 認証タグを取得
  const authTag = cipher.getAuthTag();

  // iv:authTag:ciphertext の形式で返却
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * データを復号化
 * @param {string} encryptedData - 暗号化データ（iv:authTag:ciphertext）
 * @returns {string} - 平文
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;

  try {
    // iv、authTag、暗号文を分離
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // 復号化器を作成
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    // 復号化実行
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * 暗号化キーを生成（初回セットアップ用）
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey,
};
```

#### 3.2.4 暗号化実装（Python）

```python
# encryption.py
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

# 環境変数から暗号化キーを取得（32バイト）
ENCRYPTION_KEY = bytes.fromhex(os.environ['ENCRYPTION_KEY'])

def encrypt(plaintext: str) -> str:
    """
    データを暗号化
    """
    if not plaintext:
        return None

    # AESGCM インスタンス作成
    aesgcm = AESGCM(ENCRYPTION_KEY)

    # ノンス（IV）を生成（12バイト推奨）
    nonce = os.urandom(12)

    # 暗号化実行
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)

    # nonce:ciphertext の形式で返却（Base64エンコード）
    encrypted_data = base64.b64encode(nonce + ciphertext).decode('utf-8')
    return encrypted_data

def decrypt(encrypted_data: str) -> str:
    """
    データを復号化
    """
    if not encrypted_data:
        return None

    try:
        # Base64デコード
        data = base64.b64decode(encrypted_data.encode('utf-8'))

        # nonce と暗号文を分離
        nonce = data[:12]
        ciphertext = data[12:]

        # AESGCM インスタンス作成
        aesgcm = AESGCM(ENCRYPTION_KEY)

        # 復号化実行
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')
    except Exception as e:
        print(f'Decryption error: {e}')
        raise Exception('Failed to decrypt data')

def generate_encryption_key() -> str:
    """
    暗号化キーを生成（初回セットアップ用）
    """
    return os.urandom(32).hex()
```

### 3.3 暗号化キー管理

#### 3.3.1 キー保存場所

**ローカル（モバイルアプリ）**:
- **iOS**: Keychain Services
- **Android**: Android Keystore System

**クラウド（サーバーサイド）**:
- **AWS**: AWS Secrets Manager / AWS KMS
- **GCP**: Google Cloud Secret Manager / Cloud KMS
- **Azure**: Azure Key Vault

#### 3.3.2 環境変数での管理（開発環境）

```bash
# .env（Gitにコミットしない！）
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**キー生成コマンド**:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Python
python3 -c "import os; print(os.urandom(32).hex())"

# OpenSSL
openssl rand -hex 32
```

#### 3.3.3 キーローテーション戦略

- **頻度**: 年1回（または漏洩疑いがある場合は即座に）
- **手順**:
  1. 新しいキーを生成
  2. 新旧両方のキーで復号化可能な期間を設ける
  3. バックグラウンドで全データを再暗号化
  4. 旧キーを無効化

```javascript
// key-rotation.js
async function rotateEncryptionKey(oldKey, newKey) {
  // 暗号化されたデータを全件取得
  const encryptedRecords = await db.query(`
    SELECT id, memo FROM residence_cards WHERE memo IS NOT NULL
  `);

  for (const record of encryptedRecords) {
    try {
      // 旧キーで復号化
      const plaintext = decryptWithKey(record.memo, oldKey);

      // 新キーで再暗号化
      const reEncrypted = encryptWithKey(plaintext, newKey);

      // 更新
      await db.query(`
        UPDATE residence_cards SET memo = ? WHERE id = ?
      `, [reEncrypted, record.id]);
    } catch (error) {
      console.error(`再暗号化失敗: ${record.id}`, error);
    }
  }
}
```

---

## 4. 認証・認可

### 4.1 認証方式

**MVP フェーズ**: デバイスベース認証（匿名認証）
**将来拡張**: Firebase Authentication、OAuth 2.0

#### 4.1.1 デバイス登録フロー

```
1. アプリ初回起動時にデバイスIDを生成
2. サーバーにデバイス登録リクエスト送信
3. サーバーがユーザーID（UUID）とJWTトークンを発行
4. アプリはトークンをKeychainに保存
5. 以降のAPI呼び出しでトークンを使用
```

#### 4.1.2 JWT（JSON Web Token）設計

**ペイロード**:
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_premium": false,
  "iat": 1708000000,
  "exp": 1708003600
}
```

**署名アルゴリズム**: HS256（対称鍵）または RS256（非対称鍵）推奨

**トークン有効期限**:
- **Access Token**: 1時間
- **Refresh Token**: 30日

**実装例（Node.js）**:
```javascript
// auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/**
 * Access Token 生成
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      user_id: user.id,
      device_id: user.device_id,
      is_premium: user.is_premium,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Refresh Token 生成
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      user_id: user.id,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * トークン検証ミドルウェア
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '認証が必要です' } });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: { code: 'TOKEN_EXPIRED', message: 'トークンが無効または期限切れです' } });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  authenticateToken,
};
```

### 4.2 認可（Authorization）

#### 4.2.1 リソースアクセス制御

**原則**: ユーザーは自分のデータのみアクセス可能

```javascript
// リソース所有権チェック
router.get('/api/residence-cards/:id', authenticateToken, async (req, res) => {
  const cardId = req.params.id;
  const userId = req.user.user_id;

  // カードの所有者チェック
  const card = await db.query(`
    SELECT * FROM residence_cards WHERE id = ? AND user_id = ?
  `, [cardId, userId]);

  if (!card) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'リソースが見つかりません' } });
  }

  res.json(card);
});
```

#### 4.2.2 プレミアム機能の制御

```javascript
// プレミアム機能チェックミドルウェア
function requirePremium(req, res, next) {
  if (!req.user.is_premium) {
    return res.status(403).json({
      error: {
        code: 'PREMIUM_REQUIRED',
        message: 'この機能はプレミアム会員限定です',
      },
    });
  }
  next();
}

// 使用例
router.post('/api/residence-cards', authenticateToken, requirePremium, async (req, res) => {
  // 2件目以降の登録はプレミアム限定
  const cardCount = await getCardCount(req.user.user_id);
  if (cardCount >= 1 && !req.user.is_premium) {
    return res.status(403).json({ error: { code: 'PREMIUM_REQUIRED', message: '複数登録はプレミアム会員限定です' } });
  }
  // ... 登録処理
});
```

---

## 5. 脆弱性対策

### 5.1 SQLインジェクション対策

**対策**: プリペアドステートメント（パラメータ化クエリ）の使用

**悪い例（脆弱）**:
```javascript
// ❌ 絶対にやってはいけない
const query = `SELECT * FROM users WHERE id = '${userId}'`;
db.query(query);
```

**良い例（安全）**:
```javascript
// ✅ プリペアドステートメント
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

### 5.2 XSS（Cross-Site Scripting）対策

**対策**:
- ユーザー入力のサニタイズ・エスケープ
- Content-Security-Policy ヘッダー設定

```javascript
// サニタイズ例
const sanitizeHtml = require('sanitize-html');

function sanitizeInput(input) {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

// 使用例
const userMemo = sanitizeInput(req.body.memo);
```

**CSPヘッダー設定**:
```javascript
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'");
  next();
});
```

### 5.3 CSRF（Cross-Site Request Forgery）対策

**対策**: CSRFトークンの使用

```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.post('/api/residence-cards', csrfProtection, authenticateToken, async (req, res) => {
  // CSRFトークンが検証される
  // ...
});
```

**ヘッダーベース（SPA向け）**:
```javascript
// カスタムヘッダーの検証
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const customHeader = req.headers['x-requested-with'];
    if (customHeader !== 'XMLHttpRequest') {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }
  next();
});
```

### 5.4 レート制限（Rate Limiting）

**対策**: API呼び出し回数の制限

```javascript
const rateLimit = require('express-rate-limit');

// 全体のレート制限
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 60, // 60リクエスト/分
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'レート制限を超過しました' } },
});

app.use('/api/', limiter);

// ログインエンドポイントの厳しい制限
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 5回まで
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'ログイン試行回数が多すぎます' } },
});

app.post('/auth/login', loginLimiter, async (req, res) => {
  // ...
});
```

### 5.5 セッションハイジャック対策

**対策**:
- HTTPS必須（Cookie の Secure フラグ）
- HttpOnly フラグでJavaScriptからのアクセス防止
- SameSite 属性の設定

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS必須
    httpOnly: true, // JavaScriptアクセス禁止
    sameSite: 'strict', // CSRF対策
    maxAge: 3600000, // 1時間
  },
}));
```

---

## 6. プライバシー保護

### 6.1 プライバシーポリシー要件

**必須記載事項**:
1. 取得する情報の種類
   - デバイスID、在留資格の有効期限、資格タイプ、チェックリスト状態
2. 情報の利用目的
   - リマインダー通知の送信、サービス改善
3. 第三者提供の有無
   - 原則として第三者提供なし（Firebase等のサービス利用は明記）
4. 情報の保存期間
   - ユーザーが削除するまで、または最終アクセスから3年
5. ユーザーの権利
   - データの閲覧、訂正、削除の権利
6. お問い合わせ先

### 6.2 データ削除機能

**完全削除API**:
```javascript
router.delete('/api/users/account', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    // トランザクション開始
    await db.beginTransaction();

    // 関連データを全て削除
    await db.query('DELETE FROM notification_logs WHERE residence_card_id IN (SELECT id FROM residence_cards WHERE user_id = ?)', [userId]);
    await db.query('DELETE FROM checklist_items WHERE residence_card_id IN (SELECT id FROM residence_cards WHERE user_id = ?)', [userId]);
    await db.query('DELETE FROM residence_cards WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM reminder_settings WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM device_tokens WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    await db.commit();

    res.status(204).send();
  } catch (error) {
    await db.rollback();
    console.error('アカウント削除エラー:', error);
    res.status(500).json({ error: 'アカウント削除に失敗しました' });
  }
});
```

### 6.3 データエクスポート機能（GDPR対応）

```javascript
router.get('/api/users/data-export', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  // ユーザーの全データを取得
  const userData = {
    user: await db.query('SELECT * FROM users WHERE id = ?', [userId]),
    residence_cards: await db.query('SELECT * FROM residence_cards WHERE user_id = ?', [userId]),
    checklist_items: await db.query(`
      SELECT ci.* FROM checklist_items ci
      INNER JOIN residence_cards rc ON ci.residence_card_id = rc.id
      WHERE rc.user_id = ?
    `, [userId]),
    reminder_settings: await db.query('SELECT * FROM reminder_settings WHERE user_id = ?', [userId]),
  };

  // JSONファイルとして返却
  res.setHeader('Content-Disposition', 'attachment; filename=user-data.json');
  res.setHeader('Content-Type', 'application/json');
  res.json(userData);
});
```

### 6.4 匿名化・仮名化

**ログ記録時の匿名化**:
```javascript
function anonymizeUserId(userId) {
  // ユーザーIDのハッシュ化（ログ用）
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
}

// ログ記録例
logger.info('在留カード登録', {
  user_id_hash: anonymizeUserId(userId), // 元のIDは記録しない
  residence_type: 'work_visa',
  timestamp: new Date().toISOString(),
});
```

---

## 7. アプリケーションセキュリティ

### 7.1 セキュリティヘッダー

```javascript
// security-headers.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
}));
```

**設定されるヘッダー**:
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

### 7.2 入力検証

**バリデーション例**:
```javascript
const { body, validationResult } = require('express-validator');

router.post('/api/residence-cards',
  authenticateToken,
  [
    body('residence_type_id').isString().trim().notEmpty(),
    body('expiry_date').isISO8601().toDate(),
    body('memo').optional().isString().trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    // バリデーション結果チェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'リクエストパラメータが不正です',
          details: errors.array(),
        },
      });
    }

    // 有効期限が未来の日付かチェック
    if (req.body.expiry_date <= new Date()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_EXPIRY_DATE',
          message: '有効期限は未来の日付である必要があります',
        },
      });
    }

    // ... 登録処理
  }
);
```

### 7.3 ログ記録・監査

**セキュリティイベントのログ記録**:
```javascript
// audit-logger.js
const winston = require('winston');

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/audit.log' }),
  ],
});

function logSecurityEvent(event, details) {
  auditLogger.info(event, {
    ...details,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    user_agent: details.user_agent,
  });
}

// 使用例
app.post('/auth/login', async (req, res) => {
  const { device_id } = req.body;

  logSecurityEvent('login_attempt', {
    device_id: device_id,
    ip: req.ip,
    user_agent: req.headers['user-agent'],
  });

  // ... ログイン処理
});
```

**記録すべきイベント**:
- ログイン・ログアウト
- データの作成・更新・削除
- 認証失敗
- 認可エラー
- レート制限超過
- 異常なアクセスパターン

---

## 8. インフラセキュリティ

### 8.1 データベースセキュリティ

**PostgreSQL セキュリティ設定**:
```sql
-- 専用ユーザーの作成（最小権限の原則）
CREATE USER visa_reminder_app WITH PASSWORD 'strong_password_here';

-- 必要なテーブルのみへのアクセス権限付与
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  users, residence_cards, checklist_items, reminder_settings, notification_logs
TO visa_reminder_app;

-- マスタテーブルは読み取り専用
GRANT SELECT ON TABLE residence_types, checklist_templates TO visa_reminder_app;

-- SSL接続の強制
ALTER SYSTEM SET ssl = on;
```

**接続文字列（SSL必須）**:
```javascript
const dbConfig = {
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  },
};
```

### 8.2 ネットワークセキュリティ

**ファイアウォール設定**:
- HTTPSポート（443）のみ公開
- SSHポート（22）は特定IPからのみアクセス許可
- データベースポートは内部ネットワークのみアクセス可

**AWS Security Group 例**:
```json
{
  "IpPermissions": [
    {
      "IpProtocol": "tcp",
      "FromPort": 443,
      "ToPort": 443,
      "IpRanges": [{ "CidrIp": "0.0.0.0/0" }]
    },
    {
      "IpProtocol": "tcp",
      "FromPort": 22,
      "ToPort": 22,
      "IpRanges": [{ "CidrIp": "203.0.113.0/24", "Description": "Office IP" }]
    }
  ]
}
```

### 8.3 環境変数・秘密情報の管理

**環境変数の保護**:
- `.env` ファイルは `.gitignore` に追加
- 本番環境では Secret Manager 使用

**AWS Secrets Manager 使用例**:
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-northeast-1' });

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

// 使用例
const dbCredentials = await getSecret('visa-reminder/db-credentials');
const dbConfig = {
  host: dbCredentials.host,
  user: dbCredentials.username,
  password: dbCredentials.password,
};
```

---

## 9. モバイルアプリセキュリティ

### 9.1 ローカルストレージのセキュリティ（iOS）

**Keychain での機密情報保存**:
```swift
import Security

class KeychainManager {
    static func save(key: String, data: String) -> Bool {
        guard let data = data.data(using: .utf8) else { return false }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)

        if status == errSecSuccess, let data = dataTypeRef as? Data {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
}

// 使用例
KeychainManager.save(key: "jwt_token", data: accessToken)
let token = KeychainManager.load(key: "jwt_token")
```

### 9.2 ローカルストレージのセキュリティ（Android）

**EncryptedSharedPreferences 使用**:
```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureStorage(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveString(key: String, value: String) {
        sharedPreferences.edit().putString(key, value).apply()
    }

    fun getString(key: String): String? {
        return sharedPreferences.getString(key, null)
    }
}

// 使用例
val secureStorage = SecureStorage(context)
secureStorage.saveString("jwt_token", accessToken)
val token = secureStorage.getString("jwt_token")
```

### 9.3 証明書ピンニング（SSL Pinning）

**iOS 実装**:
```swift
class NetworkManager: NSObject, URLSessionDelegate {

    let certificateHashes = [
        "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    ]

    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {

        guard let serverTrust = challenge.protectionSpace.serverTrust,
              let certificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let serverCertificateData = SecCertificateCopyData(certificate) as Data
        let hash = serverCertificateData.sha256()

        if certificateHashes.contains(hash) {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
```

---

## 10. インシデント対応計画

### 10.1 セキュリティインシデントの分類

| レベル | 説明 | 例 |
|--------|------|-----|
| Critical | サービス全体に影響 | データベースの不正アクセス、大規模な情報漏洩 |
| High | 一部ユーザーに影響 | 認証システムの脆弱性、個人情報の漏洩 |
| Medium | 限定的な影響 | レート制限の回避、軽微なXSS脆弱性 |
| Low | 影響最小 | 情報収集活動、軽微な設定ミス |

### 10.2 インシデント対応フロー

```
1. 検知・報告
   ↓
2. 初動対応（影響範囲の特定、証拠保全）
   ↓
3. 封じ込め（攻撃の遮断、脆弱性の修正）
   ↓
4. 復旧（サービス再開）
   ↓
5. 事後対応（原因分析、再発防止策）
   ↓
6. 報告・開示（必要に応じてユーザー通知）
```

### 10.3 連絡体制

```javascript
// インシデント通知設定
const INCIDENT_CONTACTS = {
  critical: [
    { name: 'CTO', email: 'cto@visa-reminder.app', phone: '+81-XX-XXXX-XXXX' },
    { name: 'Lead Engineer', email: 'lead@visa-reminder.app', phone: '+81-XX-XXXX-XXXX' },
  ],
  high: [
    { name: 'Security Team', email: 'security@visa-reminder.app' },
  ],
};

async function notifySecurityIncident(level, details) {
  const contacts = INCIDENT_CONTACTS[level] || [];

  for (const contact of contacts) {
    await sendEmail({
      to: contact.email,
      subject: `[${level.toUpperCase()}] セキュリティインシデント発生`,
      body: `
        インシデント詳細:
        ${JSON.stringify(details, null, 2)}

        担当者: ${contact.name}
        即座に対応してください。
      `,
    });

    if (contact.phone) {
      await sendSMS(contact.phone, `[${level}] セキュリティインシデント発生。メールを確認してください。`);
    }
  }
}
```

---

## 11. セキュリティチェックリスト

### 11.1 開発フェーズ

- [ ] 環境変数で機密情報を管理（ハードコードしない）
- [ ] `.env` ファイルを `.gitignore` に追加
- [ ] プリペアドステートメントを使用（SQLインジェクション対策）
- [ ] ユーザー入力のバリデーション・サニタイズ
- [ ] HTTPS 必須化
- [ ] セキュリティヘッダーの設定（Helmet.js等）
- [ ] レート制限の実装
- [ ] エラーメッセージに機密情報を含めない

### 11.2 デプロイ前

- [ ] 依存パッケージの脆弱性スキャン（`npm audit` / `pip check`）
- [ ] 静的コード解析（SAST）の実行
- [ ] セキュリティテストの実施（OWASP ZAP等）
- [ ] SSL/TLS証明書の設定確認
- [ ] データベースユーザー権限の最小化
- [ ] ファイアウォール設定の確認
- [ ] バックアップ体制の確認

### 11.3 運用フェーズ

- [ ] 定期的な脆弱性スキャン
- [ ] ログの監視（異常アクセスの検知）
- [ ] セキュリティパッチの適用
- [ ] 暗号化キーのローテーション
- [ ] アクセス権限の定期レビュー
- [ ] インシデント対応訓練

---

## 12. 脆弱性診断・ペネトレーションテスト

### 12.1 自動脆弱性スキャン

**依存パッケージのスキャン**:
```bash
# Node.js
npm audit
npm audit fix

# Python
pip install safety
safety check

# 継続的スキャン（GitHub Actions）
- name: Run npm audit
  run: npm audit --audit-level=moderate
```

**Snyk 統合**:
```bash
npm install -g snyk
snyk auth
snyk test
snyk monitor
```

### 12.2 OWASP ZAP によるペネトレーションテスト

```bash
# Docker で OWASP ZAP を起動
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api-dev.visa-reminder.app \
  -r zap-report.html
```

---

## 13. コンプライアンス

### 13.1 個人情報保護法対応

- [ ] 利用目的の明示（プライバシーポリシー）
- [ ] 本人同意の取得（初回起動時）
- [ ] データの適切な管理（暗号化、アクセス制御）
- [ ] 第三者提供の制限
- [ ] 開示・訂正・削除請求への対応

### 13.2 GDPR 対応（将来の国際展開）

- [ ] データ処理の合法的根拠の確保
- [ ] データポータビリティ（エクスポート機能）
- [ ] 忘れられる権利（完全削除機能）
- [ ] データ保護影響評価（DPIA）の実施
- [ ] データ保護責任者（DPO）の任命（必要に応じて）

---

## 14. 改訂履歴

| 版 | 日付 | 変更内容 |
|----|------|----------|
| 1.0 | 2026-02-14 | 初版作成 |

---

**レビュー承認**: _______________
**次回レビュー予定**: 2026-03-14
**セキュリティ監査予定**: 2026-06-01
