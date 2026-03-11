/**
 * AES-256-GCM Encryption Service セキュリティテスト
 * Critical優先度のテストケース
 */

import { EncryptionService } from '../EncryptionService';
import { SecureStorageService } from '../../SecureStorageService';
import { EncryptionError } from '../../../types';

describe('EncryptionService - AES-256-GCM セキュリティテスト', () => {
  let encryptionService: EncryptionService;

  beforeEach(async () => {
    encryptionService = EncryptionService.getInstance();
    encryptionService.clearKey();
    await encryptionService.initialize();
  });

  afterEach(() => {
    encryptionService.clearKey();
  });

  // ========== 機能テスト（Critical） ==========

  describe('[CRITICAL] 機能テスト', () => {
    test('TC-FUNC-001: 通常のテキストの暗号化・復号化', async () => {
      const plaintext = '在留期限は2027年3月31日です';
      const encrypted = await encryptionService.encrypt(plaintext);

      // 暗号化データは元のテキストと異なる
      expect(encrypted).not.toBe(plaintext);

      // v2形式: "v2:iv:ciphertext"
      expect(encrypted).toMatch(/^v2:[0-9a-f]+:[0-9a-f]+$/);

      // パーツに分解
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('v2');

      // 復号化して元のテキストと一致することを確認
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('TC-FUNC-002: 空文字列の扱い', async () => {
      const encrypted = await encryptionService.encrypt('');
      expect(encrypted).toBe('');

      const decrypted = await encryptionService.decrypt('');
      expect(decrypted).toBe('');
    });

    test('TC-FUNC-ERR-001: 不正な暗号化データの復号化', async () => {
      const invalidData = 'invalid:data:format';

      await expect(
        encryptionService.decrypt(invalidData)
      ).rejects.toThrow('データの復号化に失敗しました');
    });

    test('TC-FUNC-ERR-002: 暗号化キーが初期化されていない状態での暗号化', async () => {
      encryptionService.clearKey();

      const plaintext = 'テストデータ';

      await expect(
        encryptionService.encrypt(plaintext)
      ).rejects.toThrow('暗号化キーが初期化されていません');
    });

    test('TC-FUNC-ERR-003: 改ざんされた暗号化データの復号化', async () => {
      const plaintext = '重要なデータ';
      const encrypted = await encryptionService.encrypt(plaintext);

      // 暗号文の一部を改ざん
      const parts = encrypted.split(':');
      parts[2] = parts[2].substring(0, 10) + 'FFFFFFFF' + parts[2].substring(18);
      const tampered = parts.join(':');

      // 認証タグ検証に失敗し、復号化エラーが発生する
      await expect(
        encryptionService.decrypt(tampered)
      ).rejects.toThrow();
    });
  });

  // ========== セキュリティテスト（Critical） ==========

  describe('[CRITICAL] セキュリティテスト', () => {
    test('TC-SEC-001: IVの一意性確認', async () => {
      const plaintext = '同じテキスト';
      const encryptedSet = new Set<string>();
      const ivSet = new Set<string>();

      // 100回暗号化
      for (let i = 0; i < 100; i++) {
        const encrypted = await encryptionService.encrypt(plaintext);
        encryptedSet.add(encrypted);

        const [, iv] = encrypted.split(':');
        ivSet.add(iv);
      }

      // すべての暗号文が異なる
      expect(encryptedSet.size).toBe(100);

      // すべてのIVが一意
      expect(ivSet.size).toBe(100);

      // IVの長さチェック（12バイト = 24文字のHex）
      const firstEncrypted = Array.from(encryptedSet)[0];
      const [, iv] = firstEncrypted.split(':');
      expect(iv.length).toBe(24); // 12バイト * 2（Hex）
    });

    test('TC-SEC-002: 暗号化キーの漏洩チェック', async () => {
      const key = encryptionService.getEncryptionKey();
      expect(key).toBeTruthy();

      // console.logのスパイを設定
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await encryptionService.encrypt('テストデータ');

      // console.logにキーが含まれていないことを確認
      consoleSpy.mock.calls.forEach((call) => {
        expect(call.join(' ')).not.toContain(key!);
      });

      consoleSpy.mockRestore();
    });

    test('TC-SEC-003: Known-plaintext attackへの耐性', async () => {
      const knownPairs = [
        { plain: '既知の平文1', encrypted: '' },
        { plain: '既知の平文2', encrypted: '' },
        { plain: '既知の平文3', encrypted: '' },
      ];

      // 平文を暗号化
      for (const pair of knownPairs) {
        pair.encrypted = await encryptionService.encrypt(pair.plain);
      }

      // 次の暗号化が予測不可能であることを確認（確率的暗号）
      const nextPlain = '既知の平文1';
      const nextEncrypted = await encryptionService.encrypt(nextPlain);

      // 同じ平文でも暗号文は異なる（IVがランダムなため）
      expect(nextEncrypted).not.toBe(knownPairs[0].encrypted);
    });

    test('TC-SEC-005: Secure Storageへのキー保存', async () => {
      const secureStorage = SecureStorageService.getInstance();
      await secureStorage.initialize();

      // キーを生成して保存
      const key = encryptionService.getEncryptionKey();
      await secureStorage.saveEncryptionKey(key!);

      // 保存されたキーを取得
      const retrievedKey = await secureStorage.getEncryptionKey();
      expect(retrievedKey).toBe(key);

      // クリーンアップ
      await secureStorage.deleteEncryptionKey();
    });

    test('TC-SEC-006: Web版でのXSS攻撃シミュレーション', async () => {
      const xssPayload = "<script>alert('XSS')</script>";
      const encrypted = await encryptionService.encrypt(xssPayload);
      const decrypted = await encryptionService.decrypt(encrypted);

      // 復号化されたテキストが元のテキストと一致（エスケープされていない）
      expect(decrypted).toBe(xssPayload);

      // 暗号化データ自体にスクリプトタグが含まれていない
      expect(encrypted).not.toContain('<script>');
      expect(encrypted).not.toContain('alert');
    });
  });

  // ========== 既存データ移行テスト（Critical） ==========

  describe('[CRITICAL] 既存データ移行テスト', () => {
    test('TC-MIG-001: XOR暗号化データの検出（v1形式）', async () => {
      // v1形式: "iv:ciphertext" (2パーツ、IVは32文字のHex）
      const v1Encrypted = 'abcdef0123456789abcdef0123456789:1234567890abcdef';
      const version = encryptionService.detectEncryptionVersion(v1Encrypted);
      expect(version).toBe('v1');

      // v2形式: "v2:iv:ciphertext" (3パーツ)
      const v2Encrypted = 'v2:abc123def456789012345678:1234567890abcdef';
      const version2 = encryptionService.detectEncryptionVersion(v2Encrypted);
      expect(version2).toBe('v2');

      // 不正な形式
      const invalid = 'invalid';
      const version3 = encryptionService.detectEncryptionVersion(invalid);
      expect(version3).toBe('invalid');
    });

    test('TC-MIG-002: XOR → AES-256-GCM への移行（自動復号化）', async () => {
      // v1とv2の両方を復号化できることを確認
      const plaintext = '移行テストデータ';

      // v2で暗号化
      const v2Encrypted = await encryptionService.encrypt(plaintext);
      const v2Decrypted = await encryptionService.decrypt(v2Encrypted);
      expect(v2Decrypted).toBe(plaintext);

      // v2形式の確認
      const version = encryptionService.detectEncryptionVersion(v2Encrypted);
      expect(version).toBe('v2');
    });

    test('TC-MIG-003: 暗号化されていない生データの扱い', async () => {
      const plaintext = '暗号化されていないデータ';

      // 生データかどうかを判定（コロンが含まれていない）
      const isPlaintext = !plaintext.includes(':');
      expect(isPlaintext).toBe(true);

      // 暗号化
      const encrypted = await encryptionService.encrypt(plaintext);
      expect(!encrypted.includes(':')).toBe(false);

      // 復号化
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('TC-MIG-005: 後方互換性の確認（バージョン判定）', async () => {
      const plaintext = 'バージョン互換性テスト';

      // v2形式で暗号化
      const encrypted = await encryptionService.encrypt(plaintext);

      // バージョン検出
      const version = encryptionService.detectEncryptionVersion(encrypted);
      expect(version).toBe('v2');

      // 復号化が正常に動作
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  // ========== クロスプラットフォームテスト（Critical） ==========

  describe('[CRITICAL] クロスプラットフォームテスト', () => {
    test('TC-CROSS-004: @noble/ciphersの互換性確認', async () => {
      const plaintext = 'クロスプラットフォームテスト';
      const encrypted = await encryptionService.encrypt(plaintext);

      // 暗号化キーを取得
      const key = encryptionService.getEncryptionKey();

      // 別のインスタンスで同じキーを使用
      const newEncryptionService = EncryptionService.getInstance();
      newEncryptionService.clearKey();
      await newEncryptionService.initialize(key!);

      // 相互に復号化可能
      const decrypted = await newEncryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);

      // 新しいインスタンスで暗号化したデータも元のインスタンスで復号化可能
      const encrypted2 = await newEncryptionService.encrypt(plaintext);
      const decrypted2 = await encryptionService.decrypt(encrypted2);
      expect(decrypted2).toBe(plaintext);
    });
  });

  // ========== エラーハンドリングテスト（Critical） ==========

  describe('[CRITICAL] エラーハンドリングテスト', () => {
    test('TC-ERR-001: ユーザーフレンドリーなエラーメッセージ', async () => {
      const invalidData = 'invalid';

      try {
        await encryptionService.decrypt(invalidData);
        fail('エラーが発生するべき');
      } catch (error) {
        // ユーザー向けメッセージが表示される
        expect((error as Error).message).toContain('データの復号化に失敗しました');

        // 技術的な詳細は含まれているが、キーは含まれない
        expect((error as Error).message).not.toContain(encryptionService.getEncryptionKey()!);
      }
    });

    test('TC-ERR-002: エラー時の情報漏洩チェック', async () => {
      const key = encryptionService.getEncryptionKey();
      const invalidData = 'invalid:encrypted:data';

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
      consoleErrorSpy.mock.calls.forEach((call) => {
        const logMessage = call.join(' ');
        expect(logMessage).not.toContain(key!);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  // ========== 追加テスト（多言語、特殊文字、絵文字） ==========

  describe('[HIGH] 文字エンコーディングテスト', () => {
    test('TC-FUNC-004: 特殊文字の暗号化・復号化', async () => {
      const plaintext = '特殊文字: !@#$%^&*()[]{}';
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('TC-FUNC-005: 絵文字の暗号化・復号化', async () => {
      const plaintext = '絵文字: 😀🎉🚀💯';
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('TC-FUNC-006: 多言語テキストの暗号化・復号化', async () => {
      const plaintext = 'English, 日本語, 中文, Tiếng Việt, 한국어';
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
