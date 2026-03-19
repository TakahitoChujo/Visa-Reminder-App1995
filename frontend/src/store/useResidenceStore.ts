/**
 * 在留カード管理ストア - Zustand
 */

import { create } from 'zustand';
import { ResidenceCard, ReminderSettings, ChecklistItem } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptionService from '../services/database/EncryptionService';
import SecureStorageService from '../services/SecureStorageService';
import { notificationService } from '../services/notificationService';
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
    // メモフィールドを暗号化（ストレージ用）
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
      // ストアには平文メモを保持（表示用）
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cards = [...get().cards, newCard];
    set({ cards }); // 平文メモをストアにセット

    // AsyncStorage には暗号化メモを保存
    const cardsForStorage = cards.map((c) =>
      c.id === newCard.id ? { ...c, memo: encryptedMemo } : c
    );
    await AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cardsForStorage));

    // 通知をスケジュール
    try {
      await notificationService.scheduleNotificationsForCard(newCard, get().reminderSettings);
    } catch (error) {
      console.warn('Failed to schedule notifications for new card:', error);
    }
  },

  updateCard: async (id, updates) => {
    // メモフィールドが更新される場合は暗号化（ストレージ用）
    let encryptedMemo: string | undefined;
    if (updates.memo !== undefined) {
      if (updates.memo && updates.memo.trim() !== '') {
        try {
          encryptedMemo = await EncryptionService.encrypt(updates.memo);
        } catch (error) {
          console.error('Failed to encrypt memo:', error);
          throw new Error(i18n.t('common:error.memoEncryptionFailed'));
        }
      } else {
        encryptedMemo = '';
      }
    }

    // ストアには平文メモを保持（表示用）
    const cards = get().cards.map((card) =>
      card.id === id
        ? { ...card, ...updates, updatedAt: new Date().toISOString() }
        : card
    );
    set({ cards });

    // AsyncStorage には暗号化メモを保存
    const cardsForStorage = cards.map((card) => {
      if (card.id === id && encryptedMemo !== undefined) {
        return { ...card, memo: encryptedMemo };
      }
      return card;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cardsForStorage));

    // 通知を再スケジュール
    const updatedCard = cards.find((c) => c.id === id);
    if (updatedCard) {
      try {
        await notificationService.scheduleNotificationsForCard(updatedCard, get().reminderSettings);
      } catch (error) {
        console.warn('Failed to reschedule notifications for updated card:', error);
      }
    }
  },

  deleteCard: async (id) => {
    // 通知をキャンセル（削除前に実行）
    try {
      await notificationService.cancelNotificationsForCard(id);
    } catch (error) {
      console.warn('Failed to cancel notifications for deleted card:', error);
    }

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
    const cardsToDelete = allCards.filter((card) => card.id !== keepCardId);

    // 削除対象カードの通知をキャンセル
    for (const card of cardsToDelete) {
      try {
        await notificationService.cancelNotificationsForCard(card.id);
      } catch (error) {
        console.warn('Failed to cancel notifications for card:', card.id, error);
      }
    }

    const cards = allCards.filter((card) => card.id === keepCardId);
    const checklistItems = { ...get().checklistItems };

    cardsToDelete.forEach((card) => {
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

    // 全カードの通知を新しい設定で再スケジュール
    for (const card of get().cards) {
      try {
        await notificationService.scheduleNotificationsForCard(card, newSettings);
      } catch (error) {
        console.warn('Failed to reschedule notifications for card:', card.id, error);
      }
    }
  },

  updateChecklistItem: async (cardId, itemId, updates) => {
    const checklistItems = { ...get().checklistItems };
    const items = checklistItems[cardId] || [];

    // ノートが更新される場合は暗号化（ストレージ用）
    let encryptedNote: string | undefined;
    if (updates.note !== undefined) {
      if (updates.note && updates.note.trim() !== '') {
        try {
          encryptedNote = await EncryptionService.encrypt(updates.note);
        } catch (error) {
          console.error('Failed to encrypt checklist note:', error);
          throw new Error(i18n.t('common:error.memoEncryptionFailed'));
        }
      } else {
        encryptedNote = '';
      }
    }

    // ストアには平文ノートを保持（表示用）
    const existingItem = items.find((item) => item.id === itemId);
    if (existingItem) {
      checklistItems[cardId] = items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
    } else {
      checklistItems[cardId] = [...items, { id: itemId, ...updates } as ChecklistItem];
    }
    set({ checklistItems });

    // AsyncStorage には暗号化ノートを保存
    const checklistForStorage = { ...checklistItems };
    if (encryptedNote !== undefined) {
      checklistForStorage[cardId] = checklistItems[cardId].map((item) =>
        item.id === itemId ? { ...item, note: encryptedNote } : item
      );
    }
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST_ITEMS, JSON.stringify(checklistForStorage));
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
              // detectEncryptionVersionで正確に暗号化済みかチェック（v1/v2両対応）
              // includes(':')だとプレーンテキストの':'を誤検知するためこちらを使用
              if (EncryptionService.detectEncryptionVersion(card.memo) !== 'invalid') {
                const decryptedMemo = await EncryptionService.decrypt(card.memo);
                return { ...card, memo: decryptedMemo };
              } else {
                // 暗号化されていない既存データはそのまま返す（次回更新時に暗号化）
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
                // detectEncryptionVersionで正確に暗号化済みかチェック
                if (EncryptionService.detectEncryptionVersion(item.note) !== 'invalid') {
                  const decryptedNote = await EncryptionService.decrypt(item.note);
                  return { ...item, note: decryptedNote };
                } else {
                  // 暗号化されていない既存データはそのまま返す
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

      // アプリ起動時に既存カードの通知を再スケジュール（再インストール・通知クリア後の復元）
      for (const card of cards) {
        try {
          await notificationService.scheduleNotificationsForCard(card, reminderSettings);
        } catch (error) {
          console.warn('Failed to reschedule notifications on startup for card:', card.id, error);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // ユーザーに通知（Alertはストアでは使えないため、エラーフラグを設定）
      set({ loadError: i18n.t('common:error.loadFailed') });
    } finally {
      set({ isLoading: false });
    }
  },

  clearAllData: async () => {
    // スケジュール済み通知を全てキャンセル（データ削除後に通知が届かないように）
    try {
      await notificationService.cancelAllNotifications();
    } catch (error) {
      console.warn('Failed to cancel all notifications on clearAllData:', error);
    }

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
