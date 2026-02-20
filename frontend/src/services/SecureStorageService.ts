/**
 * Secure Storage Service
 * 暗号化キーをKeychainまたはKeystoreに安全に保存するサービス
 *
 * iOS: Keychain
 * Android: Keystore
 * Web: IndexedDB（localStorageより安全）
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * ストレージキー
 */
const SECURE_STORAGE_KEYS = {
  ENCRYPTION_KEY: 'app_encryption_key',
} as const;

/**
 * IndexedDB Manager for Web
 * Web版でのキー保存にIndexedDBを使用
 */
class IndexedDBKeyStore {
  private dbName = 'SecureKeyStore';
  private storeName = 'keys';
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    // Web環境でのみIndexedDBを使用
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available');
    }

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
    if (!this.db) return null;

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
 * セキュアストレージサービスクラス
 */
export class SecureStorageService {
  private static instance: SecureStorageService;
  private indexedDBStore: IndexedDBKeyStore | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * サービスを初期化
   * Web版ではIndexedDBを初期化
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // 並行呼び出し時は同じPromiseを共有して競合を防ぐ
    if (!this.initializationPromise) {
      this.initializationPromise = this._doInitialize();
    }

    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        this.indexedDBStore = new IndexedDBKeyStore();
        await this.indexedDBStore.initialize();
        this.showWebSecurityWarning();
      } catch (error) {
        console.error('IndexedDB initialization failed, falling back to sessionStorage:', error);
        // IndexedDB初期化失敗時はsessionStorageを使用
        this.indexedDBStore = null;
      }
    }

    this.initialized = true;
    this.initializationPromise = null;
  }

  /**
   * Web版のセキュリティ警告を表示
   */
  private showWebSecurityWarning(): void {
    // 初回起動時のみ表示
    if (typeof sessionStorage === 'undefined') return;

    const hasShownWarning = sessionStorage.getItem('web_security_warning_shown');
    if (hasShownWarning) return;

    console.warn(
      'Web版では暗号化のセキュリティレベルがネイティブアプリより低くなります。' +
      '機密性の高い情報はメモに記載しないことを推奨します。'
    );

    sessionStorage.setItem('web_security_warning_shown', 'true');
  }

  /**
   * 暗号化キーを保存
   * @param key 暗号化キー(hex形式)
   */
  public async saveEncryptionKey(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // IndexedDBが利用可能な場合はIndexedDBを使用
        if (this.indexedDBStore) {
          await this.indexedDBStore.saveKey(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
        } else {
          // フォールバック: sessionStorageを使用
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
          } else {
            // 最終手段: localStorage
            localStorage.setItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
          }
        }
      } else {
        // iOS/AndroidではSecure Storeを使用
        await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.ENCRYPTION_KEY, key);
      }
    } catch (error) {
      console.error('Failed to save encryption key:', error);
      throw new Error('暗号化キーの保存に失敗しました');
    }
  }

  /**
   * 暗号化キーを取得
   * @returns 暗号化キー(hex形式)、存在しない場合はnull
   */
  public async getEncryptionKey(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // IndexedDBが利用可能な場合はIndexedDBから取得
        if (this.indexedDBStore) {
          return await this.indexedDBStore.getKey(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
        } else {
          // フォールバック: sessionStorageから取得
          if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
          } else {
            // 最終手段: localStorageから取得
            return localStorage.getItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
          }
        }
      } else {
        // iOS/AndroidではSecure Storeから取得
        return await SecureStore.getItemAsync(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
      }
    } catch (error) {
      console.error('Failed to get encryption key:', error);
      throw new Error('暗号化キーの取得に失敗しました');
    }
  }

  /**
   * 暗号化キーを削除
   */
  public async deleteEncryptionKey(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // IndexedDBが利用可能な場合はIndexedDBから削除
        if (this.indexedDBStore) {
          await this.indexedDBStore.deleteKey(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
        } else {
          // フォールバック: sessionStorageから削除
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
          }
          // localStorageからも削除
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
          }
        }
      } else {
        // iOS/AndroidではSecure Storeから削除
        await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.ENCRYPTION_KEY);
      }
    } catch (error) {
      console.error('Failed to delete encryption key:', error);
      throw new Error('暗号化キーの削除に失敗しました');
    }
  }

  /**
   * 暗号化キーが存在するかチェック
   * @returns キーが存在する場合true
   */
  public async hasEncryptionKey(): Promise<boolean> {
    try {
      const key = await this.getEncryptionKey();
      return key !== null && key !== '';
    } catch (error) {
      console.error('Failed to check encryption key:', error);
      return false;
    }
  }

  /**
   * すべてのセキュアデータを削除（アプリリセット時など）
   */
  public async clearAll(): Promise<void> {
    try {
      await this.deleteEncryptionKey();
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
      throw new Error('セキュアストレージのクリアに失敗しました');
    }
  }
}

// シングルトンインスタンスをエクスポート
export default SecureStorageService.getInstance();
