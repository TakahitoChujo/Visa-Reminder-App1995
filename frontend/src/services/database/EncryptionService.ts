/**
 * Encryption Service
 * メモフィールドの暗号化・復号化サービス
 *
 * AES-256-GCM を使用した暗号化実装
 * @noble/ciphers を使用
 */

import { gcm } from '@noble/ciphers/aes';
import * as Crypto from 'expo-crypto';
import { EncryptionError } from '../../types';

/**
 * 暗号化サービスクラス
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: string | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * 暗号化キーを初期化
   * アプリ起動時に一度だけ呼び出す
   */
  public async initialize(key?: string): Promise<void> {
    if (key) {
      this.encryptionKey = key;
    } else {
      // キーが提供されていない場合は新規生成
      this.encryptionKey = await this.generateKey();
    }
  }

  /**
   * 暗号化キーを生成
   * @returns 256ビット(32バイト)のランダムキー(hex形式)
   */
  private async generateKey(): Promise<string> {
    try {
      // 32バイト = 256ビット
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      return this.bytesToHex(randomBytes);
    } catch (error) {
      throw new EncryptionError(
        '暗号化キーの生成に失敗しました',
        error as Error
      );
    }
  }

  /**
   * バイト配列を16進数文字列に変換
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 16進数文字列をバイト配列に変換
   */
  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * 文字列をBase64エンコード
   */
  private stringToBase64(str: string): string {
    // TextEncoder を使用してUTF-8バイト配列に変換
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);

    // バイト配列をBase64に変換
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  /**
   * Base64を文字列にデコード
   */
  private base64ToString(base64: string): string {
    // Base64をバイナリ文字列にデコード
    const binary = atob(base64);

    // バイナリ文字列をバイト配列に変換
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // TextDecoder を使用してUTF-8文字列に変換
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  /**
   * 暗号化バージョンを検出
   * @param encryptedData 暗号化データ
   * @returns 'v2' | 'v1' | 'invalid'
   */
  public detectEncryptionVersion(
    encryptedData: string
  ): 'v2' | 'v1' | 'invalid' {
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
      if (parts[0].length === 32 && /^[0-9a-f]+$/i.test(parts[0])) {
        return 'v1';
      }
    }

    return 'invalid';
  }

  /**
   * AES-256-GCM暗号化（v2）
   * @param plaintext 平文
   * @returns 暗号化データ（v2:iv:ciphertext_with_authTag）
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

  /**
   * AES-256-GCM復号化（v2）
   * @param encryptedData 暗号化データ（v2:iv:ciphertext_with_authTag）
   * @returns 復号化された平文
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

      // 3. AES-GCMで復号化（authTag自動検証）
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

  /**
   * XOR復号化（v1 - 旧形式）
   * 移行期間中のみ使用
   * @param encryptedData 暗号化データ(iv:ciphertext)
   * @returns 復号化された平文
   */
  private async decryptV1(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new EncryptionError('暗号化キーが初期化されていません');
    }

    try {
      // iv と暗号文を分離
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('不正な暗号化データ形式（v1）');
      }

      const [ivHex, ciphertext] = parts;

      // キーとIVを組み合わせてハッシュ化(復号化キーストリームとして使用)
      const keyStream = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        this.encryptionKey + ivHex
      );

      // XOR復号化
      const plaintextBase64 = this.xorDecrypt(ciphertext, keyStream);

      // Base64デコード
      const plaintext = this.base64ToString(plaintextBase64);

      return plaintext;
    } catch (error) {
      throw new EncryptionError(
        'データの復号化に失敗しました（v1）',
        error as Error
      );
    }
  }

  /**
   * データを暗号化（v2形式を使用）
   * @param plaintext 平文
   * @returns 暗号化データ（v2:iv:ciphertext_with_authTag）
   */
  public async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      return '';
    }

    if (!this.encryptionKey) {
      throw new EncryptionError('暗号化キーが初期化されていません');
    }

    // v2形式で暗号化
    return this.encryptV2(plaintext);
  }

  /**
   * データを復号化（自動バージョン判定）
   * v1とv2の両方をサポート
   * @param encryptedData 暗号化データ
   * @returns 復号化された平文
   */
  public async decrypt(encryptedData: string): Promise<string> {
    if (!encryptedData) {
      return '';
    }

    if (!this.encryptionKey) {
      throw new EncryptionError('暗号化キーが初期化されていません');
    }

    try {
      const version = this.detectEncryptionVersion(encryptedData);

      if (version === 'v2') {
        // 新形式: AES-256-GCMで復号化
        return await this.decryptV2(encryptedData);
      }

      if (version === 'v1') {
        // 旧形式: XORで復号化
        return await this.decryptV1(encryptedData);
      }

      // 不正な形式
      throw new Error('不正な暗号化データ形式');
    } catch (error) {
      // エラーの詳細をログに記録（デバッグ用）
      console.error('Decryption error:', error);

      // ユーザーには統一されたエラーメッセージ
      throw new EncryptionError('データの復号化に失敗しました', error as Error);
    }
  }

  /**
   * XOR暗号化
   * @param data データ(Base64)
   * @param key キーストリーム(Hex)
   * @returns 暗号化データ(Hex)
   */
  private xorEncrypt(data: string, key: string): string {
    const dataBytes = Array.from(data).map((c) => c.charCodeAt(0));
    const keyBytes = this.hexToBytes(key);

    const result: number[] = [];
    for (let i = 0; i < dataBytes.length; i++) {
      result.push(dataBytes[i] ^ keyBytes[i % keyBytes.length]);
    }

    return this.bytesToHex(new Uint8Array(result));
  }

  /**
   * XOR復号化
   * @param encryptedHex 暗号化データ(Hex)
   * @param key キーストリーム(Hex)
   * @returns 復号化データ(Base64)
   */
  private xorDecrypt(encryptedHex: string, key: string): string {
    const encryptedBytes = this.hexToBytes(encryptedHex);
    const keyBytes = this.hexToBytes(key);

    const result: number[] = [];
    for (let i = 0; i < encryptedBytes.length; i++) {
      result.push(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
    }

    return String.fromCharCode(...result);
  }

  /**
   * 暗号化キーを取得(保存用)
   * 注: このキーは安全な場所(Keychain/Keystore)に保存する必要がある
   */
  public getEncryptionKey(): string | null {
    return this.encryptionKey;
  }

  /**
   * 暗号化キーをクリア
   */
  public clearKey(): void {
    this.encryptionKey = null;
  }
}

// シングルトンインスタンスをエクスポート
export default EncryptionService.getInstance();
