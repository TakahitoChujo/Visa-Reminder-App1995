/**
 * useResidenceStore ユニットテスト
 * Zustand ストアの在留カード管理ロジックを検証する
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// EncryptionService をモック（AES処理を省略し、テストを高速・予測可能にする）
jest.mock('../../services/database/EncryptionService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    encrypt: jest.fn().mockImplementation((text: string) => Promise.resolve(`encrypted:${text}`)),
    decrypt: jest.fn().mockImplementation((text: string) =>
      Promise.resolve(text.startsWith('encrypted:') ? text.replace('encrypted:', '') : text)
    ),
    detectEncryptionVersion: jest.fn().mockImplementation((data: string): 'v2' | 'v1' | 'invalid' => {
      if (!data || typeof data !== 'string') return 'invalid';
      const parts = data.split(':');
      if (parts.length === 3 && parts[0] === 'v2') return 'v2';
      if (parts.length === 2 && parts[0].length === 32 && /^[0-9a-f]+$/i.test(parts[0])) return 'v1';
      return 'invalid';
    }),
    getEncryptionKey: jest.fn().mockReturnValue('mock-hex-key-32bytes-xxxxxxxxxxxx'),
    clearKey: jest.fn(),
  },
}));

// SecureStorageService をモック
jest.mock('../../services/SecureStorageService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getEncryptionKey: jest.fn().mockResolvedValue('mock-hex-key-32bytes-xxxxxxxxxxxx'),
    saveEncryptionKey: jest.fn().mockResolvedValue(undefined),
    deleteEncryptionKey: jest.fn().mockResolvedValue(undefined),
    hasEncryptionKey: jest.fn().mockResolvedValue(true),
    clearAll: jest.fn().mockResolvedValue(undefined),
  },
}));

// notificationService をモック（expo-notifications のネイティブ依存を回避）
jest.mock('../../services/notificationService', () => ({
  notificationService: {
    scheduleNotificationsForCard: jest.fn().mockResolvedValue(undefined),
    cancelNotificationsForCard: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  },
}));

// ストアをインポート（モックが設定された後にインポート）
import { useResidenceStore } from '../useResidenceStore';
import EncryptionService from '../../services/database/EncryptionService';
import SecureStorageService from '../../services/SecureStorageService';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockEncrypt = EncryptionService.encrypt as jest.Mock;
const mockDecrypt = EncryptionService.decrypt as jest.Mock;

/** デフォルトのリマインダー設定 */
const defaultReminderSettings = {
  fourMonthsBefore: true,
  threeMonthsBefore: true,
  oneMonthBefore: true,
  twoWeeksBefore: false,
  soundEnabled: true,
  badgeEnabled: true,
};

/** Zustand ストアの状態をリセットするヘルパー */
function resetStore() {
  useResidenceStore.setState({
    cards: [],
    currentCardId: null,
    reminderSettings: { ...defaultReminderSettings },
    checklistItems: {},
    isLoading: false,
    loadError: null,
  });
}

describe('useResidenceStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
    // デフォルトのモック動作を再設定
    mockEncrypt.mockImplementation((text: string) => Promise.resolve(`encrypted:${text}`));
    mockDecrypt.mockImplementation((text: string) =>
      Promise.resolve(text.startsWith('encrypted:') ? text.replace('encrypted:', '') : text)
    );
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    (SecureStorageService.initialize as jest.Mock).mockResolvedValue(undefined);
    (SecureStorageService.getEncryptionKey as jest.Mock).mockResolvedValue('mock-hex-key');
    (EncryptionService.initialize as jest.Mock).mockResolvedValue(undefined);
  });

  // ===== addCard() =====

  describe('addCard()', () => {
    it('TC-RS-001: カードが正しく追加される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-03-31', residenceType: 'student' });

      const { cards } = useResidenceStore.getState();
      expect(cards).toHaveLength(1);
      expect(cards[0].expirationDate).toBe('2027-03-31');
      expect(cards[0].residenceType).toBe('student');
      expect(cards[0].id).toBeDefined();
      expect(cards[0].createdAt).toBeDefined();
    });

    it('TC-RS-002: メモが暗号化されてストレージに保存され、ストアには平文が保持される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'work_visa', memo: 'テストメモ' });

      expect(mockEncrypt).toHaveBeenCalledWith('テストメモ');
      // ストアには平文メモが保持される（表示用）
      const { cards } = useResidenceStore.getState();
      expect(cards[0].memo).toBe('テストメモ');
      // AsyncStorage には暗号化メモが保存される
      const saved = JSON.parse((mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(saved[0].memo).toBe('encrypted:テストメモ');
    });

    it('TC-RS-003: AsyncStorage にカードデータが保存される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@residence_cards',
        expect.any(String)
      );
      const saved = JSON.parse((mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(saved).toHaveLength(1);
    });

    it('TC-RS-004: メモが空文字の場合は暗号化されない', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student', memo: '' });

      expect(mockEncrypt).not.toHaveBeenCalled();
    });

    it('TC-RS-005: メモなしのカードが正常に追加される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });

      const { cards } = useResidenceStore.getState();
      expect(cards[0].memo).toBeUndefined();
      expect(mockEncrypt).not.toHaveBeenCalled();
    });

    it('TC-RS-006: 複数カードが順番通りに追加される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2026-06-30', residenceType: 'student' });
      await store.addCard({ expirationDate: '2027-12-31', residenceType: 'work_visa' });

      const { cards } = useResidenceStore.getState();
      expect(cards).toHaveLength(2);
      expect(cards[0].residenceType).toBe('student');
      expect(cards[1].residenceType).toBe('work_visa');
    });

    it('TC-RS-007: 暗号化失敗時に「メモの暗号化に失敗しました」エラーがスローされる', async () => {
      mockEncrypt.mockRejectedValueOnce(new Error('AES failure'));

      const store = useResidenceStore.getState();
      await expect(
        store.addCard({ expirationDate: '2027-01-01', residenceType: 'work_visa', memo: 'テスト' })
      ).rejects.toThrow('メモの暗号化に失敗しました');
    });
  });

  // ===== updateCard() =====

  describe('updateCard()', () => {
    it('TC-RS-008: カード情報が正しく更新される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });

      const { cards } = useResidenceStore.getState();
      await store.updateCard(cards[0].id, { expirationDate: '2028-12-31' });

      const updated = useResidenceStore.getState().cards;
      expect(updated[0].expirationDate).toBe('2028-12-31');
    });

    it('TC-RS-009: メモが更新時に再暗号化されてストレージに保存され、ストアには平文が保持される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });
      jest.clearAllMocks();
      mockEncrypt.mockResolvedValueOnce('encrypted:新しいメモ');

      const { cards } = useResidenceStore.getState();
      await store.updateCard(cards[0].id, { memo: '新しいメモ' });

      expect(mockEncrypt).toHaveBeenCalledWith('新しいメモ');
      // ストアには平文メモが保持される（表示用）
      expect(useResidenceStore.getState().cards[0].memo).toBe('新しいメモ');
      // AsyncStorage には暗号化メモが保存される
      const lastCall = (mockAsyncStorage.setItem as jest.Mock).mock.calls.at(-1);
      const saved = JSON.parse(lastCall[1]);
      expect(saved[0].memo).toBe('encrypted:新しいメモ');
    });

    it('TC-RS-010: メモを空文字に更新した場合、暗号化されない', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student', memo: '元のメモ' });
      jest.clearAllMocks();

      const { cards } = useResidenceStore.getState();
      await store.updateCard(cards[0].id, { memo: '' });

      expect(mockEncrypt).not.toHaveBeenCalled();
      expect(useResidenceStore.getState().cards[0].memo).toBe('');
    });

    it('TC-RS-011: 更新後 AsyncStorage に保存される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });
      jest.clearAllMocks();
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const { cards } = useResidenceStore.getState();
      await store.updateCard(cards[0].id, { expirationDate: '2030-01-01' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@residence_cards', expect.any(String));
    });
  });

  // ===== deleteCard() =====

  describe('deleteCard()', () => {
    it('TC-RS-012: カードが削除される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });

      const { cards } = useResidenceStore.getState();
      await store.deleteCard(cards[0].id);

      expect(useResidenceStore.getState().cards).toHaveLength(0);
    });

    it('TC-RS-013: 削除したカードが currentCardId の場合、null になる', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });

      const { cards } = useResidenceStore.getState();
      store.setCurrentCard(cards[0].id);
      await store.deleteCard(cards[0].id);

      expect(useResidenceStore.getState().currentCardId).toBeNull();
    });

    it('TC-RS-014: 削除後 AsyncStorage に空配列が保存される', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });
      jest.clearAllMocks();
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const { cards } = useResidenceStore.getState();
      await store.deleteCard(cards[0].id);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@residence_cards', '[]');
    });

    it('TC-RS-015: 存在しない ID を削除しても状態が変わらない', async () => {
      const store = useResidenceStore.getState();
      await store.addCard({ expirationDate: '2027-01-01', residenceType: 'student' });
      await store.deleteCard('non-existent-id');

      expect(useResidenceStore.getState().cards).toHaveLength(1);
    });
  });

  // ===== loadData() =====

  describe('loadData()', () => {
    it('TC-RS-016: AsyncStorage からデータが正しく読み込まれる', async () => {
      const storedCards = [
        { id: '1', expirationDate: '2027-06-30', residenceType: 'work_visa', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      ];
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === '@residence_cards') return Promise.resolve(JSON.stringify(storedCards));
        return Promise.resolve(null);
      });

      await useResidenceStore.getState().loadData();

      const { cards, isLoading } = useResidenceStore.getState();
      expect(isLoading).toBe(false);
      expect(cards).toHaveLength(1);
      expect(cards[0].expirationDate).toBe('2027-06-30');
    });

    it('TC-RS-017: コロンを含むメモ（暗号化済み）が復号化される', async () => {
      const storedCards = [
        { id: '1', expirationDate: '2027-06-30', residenceType: 'work_visa', memo: 'v2:aabbcc:ddeeff', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      ];
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === '@residence_cards') return Promise.resolve(JSON.stringify(storedCards));
        return Promise.resolve(null);
      });
      mockDecrypt.mockResolvedValueOnce('復号化されたメモ');

      await useResidenceStore.getState().loadData();

      expect(mockDecrypt).toHaveBeenCalledWith('v2:aabbcc:ddeeff');
      expect(useResidenceStore.getState().cards[0].memo).toBe('復号化されたメモ');
    });

    it('TC-RS-018: コロンを含まないメモは復号化をスキップする（既存平文データ）', async () => {
      const storedCards = [
        { id: '1', expirationDate: '2027-06-30', residenceType: 'work_visa', memo: 'プレーンテキスト', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      ];
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === '@residence_cards') return Promise.resolve(JSON.stringify(storedCards));
        return Promise.resolve(null);
      });

      await useResidenceStore.getState().loadData();

      expect(mockDecrypt).not.toHaveBeenCalled();
      expect(useResidenceStore.getState().cards[0].memo).toBe('プレーンテキスト');
    });

    it('TC-RS-019: AsyncStorage にデータがない場合、空配列が設定される', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await useResidenceStore.getState().loadData();

      const { cards, reminderSettings } = useResidenceStore.getState();
      expect(cards).toHaveLength(0);
      expect(reminderSettings.fourMonthsBefore).toBe(true);
    });

    it('TC-RS-020: 暗号化初期化失敗時に loadError が設定される', async () => {
      (SecureStorageService.initialize as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await useResidenceStore.getState().loadData();

      const { loadError, isLoading } = useResidenceStore.getState();
      expect(isLoading).toBe(false);
      expect(loadError).toBe('データの読み込みに失敗しました。アプリを再起動してください。');
    });

    it('TC-RS-021: loadData 完了後 isLoading が false になる', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await useResidenceStore.getState().loadData();

      expect(useResidenceStore.getState().isLoading).toBe(false);
    });
  });

  // ===== updateChecklistItem() =====

  describe('updateChecklistItem()', () => {
    beforeEach(() => {
      useResidenceStore.setState({
        checklistItems: {
          'card-1': [
            { id: 'item-1', title: '住民票', description: '市区町村で取得', category: '書類', tags: ['必須'], completed: false, order: 1 },
            { id: 'item-2', title: '在留カード', description: 'コピーを準備', category: '書類', tags: ['必須'], completed: false, order: 2 },
          ],
        },
      });
    });

    it('TC-RS-022: チェック状態が更新される', async () => {
      const store = useResidenceStore.getState();
      await store.updateChecklistItem('card-1', 'item-1', { completed: true });

      expect(useResidenceStore.getState().checklistItems['card-1'][0].completed).toBe(true);
    });

    it('TC-RS-023: ノートが暗号化されてストレージに保存され、ストアには平文が保持される', async () => {
      mockEncrypt.mockResolvedValueOnce('encrypted:メモ内容');
      const store = useResidenceStore.getState();
      await store.updateChecklistItem('card-1', 'item-1', { note: 'メモ内容' });

      expect(mockEncrypt).toHaveBeenCalledWith('メモ内容');
      // ストアには平文ノートが保持される（表示用）
      expect(useResidenceStore.getState().checklistItems['card-1'][0].note).toBe('メモ内容');
      // AsyncStorage には暗号化ノートが保存される
      const lastCall = (mockAsyncStorage.setItem as jest.Mock).mock.calls.at(-1);
      const saved = JSON.parse(lastCall[1]);
      expect(saved['card-1'][0].note).toBe('encrypted:メモ内容');
    });

    it('TC-RS-024: ノートが空文字の場合は暗号化されない', async () => {
      const store = useResidenceStore.getState();
      await store.updateChecklistItem('card-1', 'item-1', { note: '' });

      expect(mockEncrypt).not.toHaveBeenCalled();
    });

    it('TC-RS-025: 更新後 AsyncStorage に保存される', async () => {
      const store = useResidenceStore.getState();
      await store.updateChecklistItem('card-1', 'item-1', { completed: true });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@checklist_items', expect.any(String));
    });
  });

  // ===== resetChecklist() =====

  describe('resetChecklist()', () => {
    beforeEach(() => {
      useResidenceStore.setState({
        checklistItems: {
          'card-1': [
            { id: 'item-1', title: '住民票', description: '', category: '書類', tags: [], completed: true, note: 'encrypted:取得済み', order: 1 },
            { id: 'item-2', title: '在留カード', description: '', category: '書類', tags: [], completed: true, note: 'encrypted:コピー完了', order: 2 },
          ],
        },
      });
    });

    it('TC-RS-026: チェックリストが初期状態にリセットされる', async () => {
      await useResidenceStore.getState().resetChecklist('card-1');

      const { checklistItems } = useResidenceStore.getState();
      expect(checklistItems['card-1'][0].completed).toBe(false);
      expect(checklistItems['card-1'][1].completed).toBe(false);
    });

    it('TC-RS-027: リセット後、note が undefined になる', async () => {
      await useResidenceStore.getState().resetChecklist('card-1');

      const { checklistItems } = useResidenceStore.getState();
      expect(checklistItems['card-1'][0].note).toBeUndefined();
    });

    it('TC-RS-028: リセット後 AsyncStorage が更新される', async () => {
      await useResidenceStore.getState().resetChecklist('card-1');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@checklist_items', expect.any(String));
    });
  });

  // ===== clearAllData() =====

  describe('clearAllData()', () => {
    it('TC-RS-029: 全データがストアから削除される', async () => {
      useResidenceStore.setState({
        cards: [{ id: '1', expirationDate: '2027-01-01', residenceType: 'student', createdAt: '', updatedAt: '' }],
        currentCardId: '1',
        checklistItems: { '1': [] },
      });

      await useResidenceStore.getState().clearAllData();

      const state = useResidenceStore.getState();
      expect(state.cards).toHaveLength(0);
      expect(state.currentCardId).toBeNull();
      expect(state.checklistItems).toEqual({});
    });

    it('TC-RS-030: AsyncStorage の全キーが削除される', async () => {
      await useResidenceStore.getState().clearAllData();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@residence_cards');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@reminder_settings');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@checklist_items');
    });

    it('TC-RS-031: SecureStorageService.deleteEncryptionKey が呼ばれる', async () => {
      await useResidenceStore.getState().clearAllData();

      expect(SecureStorageService.deleteEncryptionKey).toHaveBeenCalled();
    });

    it('TC-RS-032: EncryptionService.clearKey が呼ばれる', async () => {
      await useResidenceStore.getState().clearAllData();

      expect(EncryptionService.clearKey).toHaveBeenCalled();
    });

    it('TC-RS-033: リマインダー設定がデフォルトに戻る', async () => {
      useResidenceStore.setState({
        reminderSettings: { fourMonthsBefore: false, threeMonthsBefore: false, oneMonthBefore: false, twoWeeksBefore: true, soundEnabled: false, badgeEnabled: false },
      });

      await useResidenceStore.getState().clearAllData();

      const { reminderSettings } = useResidenceStore.getState();
      expect(reminderSettings.fourMonthsBefore).toBe(true);
      expect(reminderSettings.soundEnabled).toBe(true);
    });
  });

  // ===== updateReminderSettings() =====

  describe('updateReminderSettings()', () => {
    it('TC-RS-034: リマインダー設定が部分更新される', async () => {
      await useResidenceStore.getState().updateReminderSettings({ twoWeeksBefore: true });

      const { reminderSettings } = useResidenceStore.getState();
      expect(reminderSettings.twoWeeksBefore).toBe(true);
      // 他の設定は変更されない
      expect(reminderSettings.fourMonthsBefore).toBe(true);
    });

    it('TC-RS-035: リマインダー設定が AsyncStorage に保存される', async () => {
      await useResidenceStore.getState().updateReminderSettings({ soundEnabled: false });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@reminder_settings', expect.any(String));
    });
  });

  // ===== setCurrentCard() =====

  describe('setCurrentCard()', () => {
    it('TC-RS-036: currentCardId が設定される', () => {
      useResidenceStore.getState().setCurrentCard('card-123');
      expect(useResidenceStore.getState().currentCardId).toBe('card-123');
    });

    it('TC-RS-037: null を設定できる', () => {
      useResidenceStore.getState().setCurrentCard('card-123');
      useResidenceStore.getState().setCurrentCard(null);
      expect(useResidenceStore.getState().currentCardId).toBeNull();
    });
  });
});
