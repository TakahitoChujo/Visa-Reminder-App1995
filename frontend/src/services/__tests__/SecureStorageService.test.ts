/**
 * SecureStorageService ユニットテスト
 * Keychain/Keystore/IndexedDB へのキー保存サービスのテスト
 * Platform.OS = 'ios' (jest.setup.js でモック済み)
 */

import * as SecureStore from 'expo-secure-store';
// デフォルトエクスポートのシングルトンインスタンスを使用
import secureStorageService from '../SecureStorageService';
import { SecureStorageService } from '../SecureStorageService';

describe('SecureStorageService', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
    // initialized フラグとinitializationPromiseをリセットしてテスト間を独立させる
    // @ts-expect-error private フィールドへのアクセス（テスト用）
    secureStorageService['initialized'] = false;
    // @ts-expect-error private フィールドへのアクセス（テスト用）
    secureStorageService['initializationPromise'] = null;
  });

  // ===== initialize() =====

  describe('initialize()', () => {
    it('TC-SS-001: Native環境では IndexedDB を使用しない', async () => {
      await secureStorageService.initialize();

      // iOS ではIndexedDBが呼ばれないことを確認
      expect(global.indexedDB.open).not.toHaveBeenCalled();
    });

    it('TC-SS-002: 2回目の initialize() は早期リターンする', async () => {
      await secureStorageService.initialize();
      await secureStorageService.initialize(); // 2回目

      // 2回目はIndexedDB/SecureStoreにアクセスしない
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('TC-SS-003: initialize() 後に isInitialized 状態になる', async () => {
      await secureStorageService.initialize();

      // @ts-expect-error private フィールドへのアクセス
      expect(secureStorageService['initialized']).toBe(true);
    });
  });

  // ===== saveEncryptionKey() =====

  describe('saveEncryptionKey()', () => {
    beforeEach(async () => {
      await secureStorageService.initialize();
    });

    it('TC-SS-004: Native環境で expo-secure-store に保存される', async () => {
      const testKey = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

      await secureStorageService.saveEncryptionKey(testKey);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'app_encryption_key',
        testKey
      );
    });

    it('TC-SS-005: エラー時に「暗号化キーの保存に失敗しました」をスローする', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Keychain access denied')
      );

      await expect(
        secureStorageService.saveEncryptionKey('test-key')
      ).rejects.toThrow('暗号化キーの保存に失敗しました');
    });

    it('TC-SS-006: 保存したキーを後で取得できる', async () => {
      const testKey = 'stored-key-value-hex';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValueOnce(undefined);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(testKey);

      await secureStorageService.saveEncryptionKey(testKey);
      const retrieved = await secureStorageService.getEncryptionKey();

      expect(retrieved).toBe(testKey);
    });
  });

  // ===== getEncryptionKey() =====

  describe('getEncryptionKey()', () => {
    beforeEach(async () => {
      await secureStorageService.initialize();
    });

    it('TC-SS-007: 保存したキーが正しく取得できる', async () => {
      const testKey = 'abc123def456789012345678';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(testKey);

      const result = await secureStorageService.getEncryptionKey();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('app_encryption_key');
      expect(result).toBe(testKey);
    });

    it('TC-SS-008: キーが存在しない場合 null を返す', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await secureStorageService.getEncryptionKey();

      expect(result).toBeNull();
    });

    it('TC-SS-009: エラー時に「暗号化キーの取得に失敗しました」をスローする', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Keychain unavailable')
      );

      await expect(
        secureStorageService.getEncryptionKey()
      ).rejects.toThrow('暗号化キーの取得に失敗しました');
    });
  });

  // ===== hasEncryptionKey() =====

  describe('hasEncryptionKey()', () => {
    beforeEach(async () => {
      await secureStorageService.initialize();
    });

    it('TC-SS-010: キーが存在する場合 true を返す', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('existing-key');

      const result = await secureStorageService.hasEncryptionKey();

      expect(result).toBe(true);
    });

    it('TC-SS-011: キーが存在しない場合（null）false を返す', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await secureStorageService.hasEncryptionKey();

      expect(result).toBe(false);
    });

    it('TC-SS-012: キーが空文字の場合 false を返す', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('');

      const result = await secureStorageService.hasEncryptionKey();

      expect(result).toBe(false);
    });

    it('TC-SS-013: getEncryptionKey がエラーを投げた場合 false を返す（エラーを伝播しない）', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      // hasEncryptionKey はエラーを握りつぶして false を返す
      const result = await secureStorageService.hasEncryptionKey();

      expect(result).toBe(false);
    });
  });

  // ===== deleteEncryptionKey() =====

  describe('deleteEncryptionKey()', () => {
    beforeEach(async () => {
      await secureStorageService.initialize();
    });

    it('TC-SS-014: Native環境で expo-secure-store からキーが削除される', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

      await secureStorageService.deleteEncryptionKey();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('app_encryption_key');
    });

    it('TC-SS-015: エラー時に「暗号化キーの削除に失敗しました」をスローする', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Delete failed')
      );

      await expect(
        secureStorageService.deleteEncryptionKey()
      ).rejects.toThrow('暗号化キーの削除に失敗しました');
    });
  });

  // ===== clearAll() =====

  describe('clearAll()', () => {
    beforeEach(async () => {
      await secureStorageService.initialize();
    });

    it('TC-SS-016: clearAll() が deleteEncryptionKey を呼び出す（内部で SecureStore.deleteItemAsync が呼ばれる）', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

      await secureStorageService.clearAll();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('app_encryption_key');
    });

    it('TC-SS-017: エラー時に「セキュアストレージのクリアに失敗しました」をスローする', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Clear failed')
      );

      await expect(
        secureStorageService.clearAll()
      ).rejects.toThrow('セキュアストレージのクリアに失敗しました');
    });

    it('TC-SS-018: clearAll() 後にキーが存在しない', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValueOnce(undefined);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      await secureStorageService.clearAll();
      const result = await secureStorageService.hasEncryptionKey();

      expect(result).toBe(false);
    });
  });

  // ===== getInstance() シングルトン =====

  describe('getInstance()', () => {
    it('TC-SS-019: 同一インスタンスが返される', () => {
      const instance1 = SecureStorageService.getInstance();
      const instance2 = SecureStorageService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('TC-SS-020: デフォルトエクスポートは getInstance() と同一インスタンス', () => {
      expect(secureStorageService).toBe(SecureStorageService.getInstance());
    });
  });
});
