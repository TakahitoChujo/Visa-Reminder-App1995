/**
 * 在留カード管理ストア - Zustand
 */

import { create } from 'zustand';
import { ResidenceCard, ReminderSettings, ChecklistItem } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptionService from '../services/database/EncryptionService';
import SecureStorageService from '../services/SecureStorageService';
import i18n from '../i18n';

interface ResidenceStore {
  // State
  cards: ResidenceCard[];
  currentCardId: string | null;
  reminderSettings: ReminderSettings;
  checklistItems: Record<string, ChecklistItem[]>; // cardId -> items
  isLoading: boolean;
  loadError: string | null;

  // Actions
  addCard: (card: Omit<ResidenceCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCard: (id: string, card: Partial<ResidenceCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  deleteCardsExcept: (keepCardId: string) => Promise<void>;
  setCurrentCard: (id: string | null) => void;

  updateReminderSettings: (settings: Partial<ReminderSettings>) => Promise<void>;

  updateChecklistItem: (cardId: string, itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
  markAllComplete: (cardId: string, itemIds: string[]) => Promise<void>;
  resetChecklist: (cardId: string) => Promise<void>;

  loadData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const STORAGE_KEYS = {
  CARDS: '@residence_cards',
  REMINDER_SETTINGS: '@reminder_settings',
  CHECKLIST_ITEMS: '@checklist_items',
};

const defaultReminderSettings: ReminderSettings = {
  fourMonthsBefore: true,
  threeMonthsBefore: true,
  oneMonthBefore: true,
  twoWeeksBefore: false,
  soundEnabled: true,
  badgeEnabled: true,
};

/**
 * 暗号化キーを初期化
 * アプリ起動時またはデータ読み込み時に呼び出される
 */
async function initializeEncryption(): Promise<void> {
  try {
    // SecureStorageServiceを初期化（Web版でIndexedDBを初期化）
    await SecureStorageService.initialize();

    // Secure Storageから既存のキーを取得
    let encryptionKey = await SecureStorageService.getEncryptionKey();

    if (!encryptionKey) {
      // キーが存在しない場合は新規生成
      await EncryptionService.initialize();
      encryptionKey = EncryptionService.getEncryptionKey();

      if (encryptionKey) {
        // 生成したキーをSecure Storageに保存
        await SecureStorageService.saveEncryptionKey(encryptionKey);
      }
    } else {
      // 既存のキーで初期化
      await EncryptionService.initialize(encryptionKey);
    }
  } catch (error) {
    console.error('Failed to initialize encryption:', error);
    throw new Error(i18n.t('common:error.encryptionFailed'));
  }
}

export const useResidenceStore = create<ResidenceStore>((set, get) => ({
  cards: [],
  currentCardId: null,
  reminderSettings: defaultReminderSettings,
  checklistItems: {},
  isLoading: false,
  loadError: null,

  addCard: async (cardData) => {
    // メモフィールドを暗号化
    let encryptedMemo = cardData.memo;
    if (cardData.memo && cardData.memo.trim() !== '') {
      try {
        encryptedMemo = await EncryptionService.encrypt(cardData.memo);
      } catch (error) {
        console.error('Failed to encrypt memo:', error);
        throw new Error(i18n.t('common:error.memoEncryptionFailed'));
      }
    }

    const newCard: ResidenceCard = {
      ...cardData,
      memo: encryptedMemo,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cards = [...get().cards, newCard];
    set({ cards });

    await AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  },

  updateCard: async (id, updates) => {
    // メモフィールドが更新される場合は暗号化
    let updatedData = { ...updates };
    if (updates.memo !== undefined) {
      if (updates.memo && updates.memo.trim() !== '') {
        try {
          updatedData.memo = await EncryptionService.encrypt(updates.memo);
        } catch (error) {
          console.error('Failed to encrypt memo:', error);
          throw new Error(i18n.t('common:error.memoEncryptionFailed'));
        }
      } else {
        updatedData.memo = '';
      }
    }

    const cards = get().cards.map((card) =>
      card.id === id
        ? { ...card, ...updatedData, updatedAt: new Date().toISOString() }
        : card
    );

    set({ cards });
    await AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  },

  deleteCard: async (id) => {
    const cards = get().cards.filter((card) => card.id !== id);
    const checklistItems = { ...get().checklistItems };
    delete checklistItems[id];

    set({
      cards,
      checklistItems,
      currentCardId: get().currentCardId === id ? null : get().currentCardId
    });

    await AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST_ITEMS, JSON.stringify(checklistItems));
  },

  deleteCardsExcept: async (keepCardId) => {
    const allCards = get().cards;
    const cards = allCards.filter((card) => card.id === keepCardId);
    const checklistItems = { ...get().checklistItems };

    allCards
      .filter((card) => card.id !== keepCardId)
      .forEach((card) => {
        delete checklistItems[card.id];
      });

    set({
      cards,
      checklistItems,
      currentCardId: get().currentCardId !== keepCardId ? null : get().currentCardId,
    });

    await AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST_ITEMS, JSON.stringify(checklistItems));
  },

  setCurrentCard: (id) => {
    set({ currentCardId: id });
  },

  updateReminderSettings: async (settings) => {
    const newSettings = { ...get().reminderSettings, ...settings };
    set({ reminderSettings: newSettings });
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDER_SETTINGS, JSON.stringify(newSettings));
  },

  updateChecklistItem: async (cardId, itemId, updates) => {
    const checklistItems = { ...get().checklistItems };
    const items = checklistItems[cardId] || [];

    // メモフィールドが更新される場合は暗号化
    let updatedData = { ...updates };
    if (updates.note !== undefined) {
      if (updates.note && updates.note.trim() !== '') {
        try {
          updatedData.note = await EncryptionService.encrypt(updates.note);
        } catch (error) {
          console.error('Failed to encrypt checklist note:', error);
          throw new Error(i18n.t('common:error.memoEncryptionFailed'));
        }
      } else {
        updatedData.note = '';
      }
    }

    const existingItem = items.find((item) => item.id === itemId);
    if (existingItem) {
      // 既存アイテムを更新
      checklistItems[cardId] = items.map((item) =>
        item.id === itemId ? { ...item, ...updatedData } : item
      );
    } else {
      // 初回チェック時: アイテムがストアに存在しないので新規追加（upsert）
      checklistItems[cardId] = [...items, { id: itemId, ...updatedData } as ChecklistItem];
    }

    set({ checklistItems });
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST_ITEMS, JSON.stringify(checklistItems));
  },

  markAllComplete: async (cardId, itemIds) => {
    const checklistItems = { ...get().checklistItems };
    const existingItems = checklistItems[cardId] || [];
    const itemMap = new Map(existingItems.map((item) => [item.id, item]));

    for (const itemId of itemIds) {
      const existing = itemMap.get(itemId);
      if (existing) {
        itemMap.set(itemId, { ...existing, completed: true });
      } else {
        // 初回: ストアに存在しない項目は completed のみ設定（他フィールドはテンプレートから補完）
        itemMap.set(itemId, { id: itemId, completed: true } as ChecklistItem);
      }
    }

    checklistItems[cardId] = Array.from(itemMap.values());
    set({ checklistItems });
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST_ITEMS, JSON.stringify(checklistItems));
  },

  resetChecklist: async (cardId) => {
    const checklistItems = { ...get().checklistItems };
    const items = checklistItems[cardId] || [];

    checklistItems[cardId] = items.map((item) => ({
      ...item,
      completed: false,
      note: undefined,
    }));

    set({ checklistItems });
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST_ITEMS, JSON.stringify(checklistItems));
  },

  loadData: async () => {
    set({ isLoading: true });
    set({ loadError: null });

    try {
      // 暗号化キーの初期化
      await initializeEncryption();

      const [cardsJson, settingsJson, checklistJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CARDS),
        AsyncStorage.getItem(STORAGE_KEYS.REMINDER_SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_ITEMS),
      ]);

      let cards = cardsJson ? JSON.parse(cardsJson) : [];
      const reminderSettings = settingsJson ? JSON.parse(settingsJson) : defaultReminderSettings;
      let checklistItems = checklistJson ? JSON.parse(checklistJson) : {};

      // カードのメモフィールドを復号化
      cards = await Promise.all(
        cards.map(async (card: ResidenceCard) => {
          if (card.memo && card.memo.trim() !== '') {
            try {
              // 暗号化されているかチェック（iv:ciphertext形式）
              if (card.memo.includes(':')) {
                const decryptedMemo = await EncryptionService.decrypt(card.memo);
                return { ...card, memo: decryptedMemo };
              } else {
                // 既存の暗号化されていないデータの場合はそのまま返す
                // 次回更新時に暗号化される
                return card;
              }
            } catch (error) {
              console.error('Failed to decrypt memo for card:', card.id, error);
              // 復号化に失敗した場合は空文字を設定
              return { ...card, memo: '' };
            }
          }
          return card;
        })
      );

      // チェックリストのメモフィールドを復号化
      const decryptedChecklistItems: Record<string, ChecklistItem[]> = {};
      for (const [cardId, items] of Object.entries(checklistItems)) {
        decryptedChecklistItems[cardId] = await Promise.all(
          (items as ChecklistItem[]).map(async (item: ChecklistItem) => {
            if (item.note && item.note.trim() !== '') {
              try {
                // 暗号化されているかチェック（iv:ciphertext形式）
                if (item.note.includes(':')) {
                  const decryptedNote = await EncryptionService.decrypt(item.note);
                  return { ...item, note: decryptedNote };
                } else {
                  // 既存の暗号化されていないデータの場合はそのまま返す
                  return item;
                }
              } catch (error) {
                console.error('Failed to decrypt note for checklist item:', item.id, error);
                // 復号化に失敗した場合は空文字を設定
                return { ...item, note: '' };
              }
            }
            return item;
          })
        );
      }

      set({ cards, reminderSettings, checklistItems: decryptedChecklistItems });
    } catch (error) {
      console.error('Failed to load data:', error);
      // ユーザーに通知（Alertはストアでは使えないため、エラーフラグを設定）
      set({ loadError: i18n.t('common:error.loadFailed') });
    } finally {
      set({ isLoading: false });
    }
  },

  clearAllData: async () => {
    set({
      cards: [],
      currentCardId: null,
      reminderSettings: defaultReminderSettings,
      checklistItems: {},
    });

    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.CARDS),
      AsyncStorage.removeItem(STORAGE_KEYS.REMINDER_SETTINGS),
      AsyncStorage.removeItem(STORAGE_KEYS.CHECKLIST_ITEMS),
      SecureStorageService.deleteEncryptionKey(),
    ]);

    // 暗号化キーをメモリからもクリア
    EncryptionService.clearKey();
  },
}));
