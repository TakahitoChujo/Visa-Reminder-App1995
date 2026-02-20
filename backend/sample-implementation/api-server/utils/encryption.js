/**
 * 暗号化ユーティリティ
 * AES-256-GCM を使用したデータ暗号化・復号化
 */

const crypto = require('crypto');

// 環境変数から暗号化キーを取得（32バイト = 256ビット）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : null;

const ALGORITHM = 'aes-256-gcm';

/**
 * 暗号化キーのバリデーション
 */
function validateEncryptionKey() {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables');
  }
  if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
}

/**
 * データを暗号化
 * @param {string} plaintext - 平文
 * @returns {string|null} - 暗号化データ（iv:authTag:ciphertext）
 */
function encrypt(plaintext) {
  if (!plaintext) return null;

  validateEncryptionKey();

  try {
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
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * データを復号化
 * @param {string} encryptedData - 暗号化データ（iv:authTag:ciphertext）
 * @returns {string|null} - 平文
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;

  validateEncryptionKey();

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
 * @returns {string} - 64文字のHEX文字列
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * ハッシュ化（一方向、パスワード等には bcrypt を推奨）
 * @param {string} data - ハッシュ化するデータ
 * @returns {string} - SHA-256ハッシュ
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey,
  hash,
};
