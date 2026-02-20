/**
 * Database Usage Examples
 * データベースサービスの使用例
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import {
  DatabaseService,
  EncryptionService,
  ResidenceCardRepository,
  ReminderRepository,
  ChecklistRepository,
  ResidenceTypeRepository,
  ResidenceCardDetail,
} from './index';

/**
 * データベース初期化の例
 */
export function DatabaseInitializationExample() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      // 1. 暗号化サービスを初期化
      await EncryptionService.initialize();

      // 2. データベースを初期化
      await DatabaseService.initialize();

      setInitialized(true);
      console.log('✅ Database initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Database initialization failed:', err);
    }
  };

  return (
    <View>
      {initialized ? (
        <Text>✅ Database initialized</Text>
      ) : error ? (
        <Text>❌ Error: {error}</Text>
      ) : (
        <Text>⏳ Initializing database...</Text>
      )}
    </View>
  );
}

/**
 * 在留カード管理の例
 */
export function ResidenceCardExample() {
  const [cards, setCards] = useState<ResidenceCardDetail[]>([]);
  const userId = 'user-001'; // 実際のユーザーIDを使用

  useEffect(() => {
    loadCards();
  }, []);

  // カード一覧を読み込む
  const loadCards = async () => {
    try {
      const userCards = await ResidenceCardRepository.findDetailsByUserId(
        userId
      );
      setCards(userCards);
      console.log('Loaded cards:', userCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  };

  // 新しいカードを作成
  const createNewCard = async () => {
    try {
      const newCard = await ResidenceCardRepository.create(userId, {
        residence_type_id: 'work_visa',
        expiry_date: '2027-12-31',
        memo: '技術・人文知識・国際業務ビザ',
      });

      console.log('Created card:', newCard);

      // チェックリストも自動作成
      await ChecklistRepository.createFromTemplates(
        newCard.id,
        'work_visa'
      );

      // 再読み込み
      await loadCards();
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  // カードを更新
  const updateCard = async (cardId: string) => {
    try {
      const updated = await ResidenceCardRepository.update(cardId, {
        expiry_date: '2028-06-30',
        memo: '更新済み',
      });

      console.log('Updated card:', updated);
      await loadCards();
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  // カードを削除
  const deleteCard = async (cardId: string) => {
    try {
      await ResidenceCardRepository.delete(cardId);
      console.log('Deleted card:', cardId);
      await loadCards();
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  return (
    <ScrollView>
      <Button title="新しいカードを作成" onPress={createNewCard} />

      {cards.map((card) => (
        <View key={card.id} style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>ID: {card.id}</Text>
          <Text>タイプ: {card.residence_type?.name_ja}</Text>
          <Text>有効期限: {card.expiry_date}</Text>
          <Text>残り日数: {card.days_until_expiry}日</Text>
          <Text>緊急度: {card.urgency_level}</Text>
          <Text>メモ: {card.memo || 'なし'}</Text>

          {card.checklist_progress && (
            <Text>
              進捗: {card.checklist_progress.completed_items}/
              {card.checklist_progress.total_items} (
              {card.checklist_progress.completion_rate}%)
            </Text>
          )}

          <Button
            title="更新"
            onPress={() => updateCard(card.id)}
          />
          <Button
            title="削除"
            onPress={() => deleteCard(card.id)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * チェックリスト管理の例
 */
export function ChecklistExample() {
  const [items, setItems] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const cardId = 'card-001'; // 実際のカードIDを使用

  useEffect(() => {
    loadChecklist();
  }, []);

  // チェックリストを読み込む
  const loadChecklist = async () => {
    try {
      const checklistItems = await ChecklistRepository.findByResidenceCardId(
        cardId
      );
      setItems(checklistItems);

      const checklistProgress = await ChecklistRepository.getProgress(cardId);
      setProgress(checklistProgress);

      console.log('Loaded checklist:', checklistItems);
      console.log('Progress:', checklistProgress);
    } catch (error) {
      console.error('Failed to load checklist:', error);
    }
  };

  // 項目を完了にする
  const completeItem = async (itemId: string) => {
    try {
      await ChecklistRepository.complete(itemId);
      console.log('Completed item:', itemId);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to complete item:', error);
    }
  };

  // 項目を未完了に戻す
  const uncompleteItem = async (itemId: string) => {
    try {
      await ChecklistRepository.uncomplete(itemId);
      console.log('Uncompleted item:', itemId);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to uncomplete item:', error);
    }
  };

  // メモを追加
  const addMemo = async (itemId: string, memo: string) => {
    try {
      await ChecklistRepository.update(itemId, { memo });
      console.log('Added memo to item:', itemId);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to add memo:', error);
    }
  };

  return (
    <ScrollView>
      {progress && (
        <View style={{ padding: 10, backgroundColor: '#f0f0f0' }}>
          <Text>進捗: {progress.completion_rate}%</Text>
          <Text>
            完了: {progress.completed} / 総数: {progress.total}
          </Text>
          <Text>進行中: {progress.in_progress}</Text>
          <Text>未着手: {progress.pending}</Text>
        </View>
      )}

      {items.map((item) => (
        <View key={item.id} style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>{item.item_name}</Text>
          <Text>カテゴリ: {item.category}</Text>
          <Text>ステータス: {item.status}</Text>
          {item.memo && <Text>メモ: {item.memo}</Text>}

          {item.status === 'completed' ? (
            <Button
              title="未完了に戻す"
              onPress={() => uncompleteItem(item.id)}
            />
          ) : (
            <Button
              title="完了にする"
              onPress={() => completeItem(item.id)}
            />
          )}

          <Button
            title="メモを追加"
            onPress={() => addMemo(item.id, 'テストメモ')}
          />
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * リマインダー設定の例
 */
export function ReminderSettingsExample() {
  const [settings, setSettings] = useState<any>(null);
  const userId = 'user-001'; // 実際のユーザーIDを使用

  useEffect(() => {
    loadSettings();
  }, []);

  // 設定を読み込む
  const loadSettings = async () => {
    try {
      const reminderSettings = await ReminderRepository.findByUserId(userId);
      setSettings(reminderSettings);
      console.log('Loaded settings:', reminderSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // 設定を更新
  const updateSettings = async (newSettings: any) => {
    try {
      const updated = await ReminderRepository.update(userId, newSettings);
      setSettings(updated);
      console.log('Updated settings:', updated);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  // リマインダーを有効/無効にする
  const toggleReminder = async () => {
    if (!settings) return;

    await updateSettings({
      enabled: !settings.enabled,
    });
  };

  // 通知タイプを切り替える
  const toggle4Months = async () => {
    if (!settings) return;

    await updateSettings({
      notify_4months: !settings.notify_4months,
    });
  };

  if (!settings) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={{ padding: 10 }}>
      <Text>リマインダー設定</Text>

      <View style={{ marginTop: 10 }}>
        <Text>リマインダー: {settings.enabled ? '有効' : '無効'}</Text>
        <Button
          title={settings.enabled ? '無効にする' : '有効にする'}
          onPress={toggleReminder}
        />
      </View>

      <View style={{ marginTop: 10 }}>
        <Text>4ヶ月前通知: {settings.notify_4months ? 'ON' : 'OFF'}</Text>
        <Text>3ヶ月前通知: {settings.notify_3months ? 'ON' : 'OFF'}</Text>
        <Text>1ヶ月前通知: {settings.notify_1month ? 'ON' : 'OFF'}</Text>
        <Text>2週間前通知: {settings.notify_2weeks ? 'ON' : 'OFF'}</Text>
        <Text>通知時刻: {settings.notification_time}</Text>
      </View>

      <Button title="4ヶ月前通知を切り替え" onPress={toggle4Months} />

      <Button
        title="通知時刻を変更"
        onPress={() =>
          updateSettings({ notification_time: '09:00:00' })
        }
      />
    </View>
  );
}

/**
 * 在留資格マスタの例
 */
export function ResidenceTypesExample() {
  const [types, setTypes] = useState<any[]>([]);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const residenceTypes = await ResidenceTypeRepository.findAll();
      setTypes(residenceTypes);
      console.log('Loaded residence types:', residenceTypes);
    } catch (error) {
      console.error('Failed to load residence types:', error);
    }
  };

  return (
    <ScrollView>
      <Text>在留資格タイプ一覧</Text>

      {types.map((type) => (
        <View key={type.id} style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>ID: {type.id}</Text>
          <Text>日本語名: {type.name_ja}</Text>
          <Text>英語名: {type.name_en || 'N/A'}</Text>
          <Text>
            申請可能月数前: {type.application_months_before}ヶ月
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * 完全な例 - すべての機能を使用
 */
export function FullExample() {
  const [userId] = useState('user-001');

  // アプリ起動時の初期化
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // 1. 暗号化サービスとデータベースを初期化
      await EncryptionService.initialize();
      await DatabaseService.initialize();

      console.log('✅ App initialized');

      // 2. デモデータを作成（初回のみ）
      await createDemoData();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const createDemoData = async () => {
    try {
      // ユーザーの既存カードをチェック
      const existingCards = await ResidenceCardRepository.findByUserId(userId);

      if (existingCards.length > 0) {
        console.log('Demo data already exists');
        return;
      }

      // 在留カードを作成
      const newCard = await ResidenceCardRepository.create(userId, {
        residence_type_id: 'work_visa',
        expiry_date: '2027-12-31',
        memo: 'デモ用の在留カード',
      });

      console.log('Created demo card:', newCard);

      // チェックリストを作成
      const checklist = await ChecklistRepository.createFromTemplates(
        newCard.id,
        'work_visa'
      );

      console.log(`Created ${checklist.length} checklist items`);

      // リマインダー設定を確認（自動作成される）
      const settings = await ReminderRepository.findByUserId(userId);

      console.log('Reminder settings:', settings);
    } catch (error) {
      console.error('Failed to create demo data:', error);
    }
  };

  return (
    <ScrollView>
      <Text style={{ fontSize: 20, fontWeight: 'bold', padding: 10 }}>
        在留資格更新リマインダー
      </Text>

      <ResidenceCardExample />
      <ChecklistExample />
      <ReminderSettingsExample />
      <ResidenceTypesExample />
    </ScrollView>
  );
}
