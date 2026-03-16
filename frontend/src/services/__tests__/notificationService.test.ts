/**
 * notificationService ユニットテスト
 * プッシュ通知スケジューリングロジックを検証する
 */

// expo-notifications をモック（jest.mock はホイストされるため factory 内で jest.fn() を定義）
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  AndroidImportance: { MAX: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

// react-native をモック
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios },
}));

// i18n をモック
jest.mock('../../i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'notification:schedule.4months.title': '在留期間更新の申請が可能になりました',
      'notification:schedule.4months.body': '有効期限まで残り{{days}}日です',
      'notification:schedule.3months.title': '在留期間更新の準備を進めましょう',
      'notification:schedule.3months.body': '有効期限まで残り{{days}}日です',
      'notification:schedule.1month.title': '在留期間更新の期限が近づいています',
      'notification:schedule.1month.body': '有効期限まで残り{{days}}日です',
      'notification:schedule.2weeks.title': '在留期間更新の最終確認',
      'notification:schedule.2weeks.body': '有効期限まで残り14日です',
      'notification:test.title': 'テスト通知',
      'notification:test.body': 'テスト通知です',
      'notification:channel.name': '在留資格更新リマインダー',
      'notification:channel.description': '在留資格の有効期限に関する通知',
      'common:residenceType.student': '留学',
      'common:residenceType.other': 'その他',
    };
    return map[key] ?? key;
  },
}));

// AsyncStorage をモック
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

import * as Notifications from 'expo-notifications';
import { notificationService } from '../notificationService';
import { ReminderSettings, ResidenceCard } from '../../types';

// モック関数の型付き参照
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

/** テスト用カードデータ（有効期限: 180日後） */
function makeCard(overrides?: Partial<ResidenceCard>): ResidenceCard {
  const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  return {
    id: 'test-card-1',
    residenceType: 'student',
    expirationDate: futureDate.toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** デフォルトリマインダー設定 */
const defaultSettings: ReminderSettings = {
  fourMonthsBefore: true,
  threeMonthsBefore: true,
  oneMonthBefore: true,
  twoWeeksBefore: false,
  soundEnabled: true,
  badgeEnabled: true,
};

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルト: 権限granted、スケジュール済み通知なし
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
    mockNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id');
    mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockNotifications.setNotificationChannelAsync.mockResolvedValue(null as any);
  });

  // ===== initialize() =====

  describe('initialize()', () => {
    it('TC-NS-001: iOSではチャンネル作成をスキップする', async () => {
      // Platform.OS は 'ios' のまま
      await notificationService.initialize();
      expect(mockNotifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('TC-NS-002: Androidではチャンネルを作成する', async () => {
      const { Platform } = require('react-native');
      Platform.OS = 'android';
      try {
        await notificationService.initialize();
        expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
          'visa_reminder_channel',
          expect.objectContaining({ importance: 5 })
        );
      } finally {
        Platform.OS = 'ios';
      }
    });
  });

  // ===== requestPermissions() =====

  describe('requestPermissions()', () => {
    it('TC-NS-003: 既に権限がある場合はリクエストせず granted を返す', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' } as any);

      const result = await notificationService.requestPermissions();

      expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(result).toBe('granted');
    });

    it('TC-NS-004: 未決定の場合はリクエストを行う', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' } as any);
      mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' } as any);

      const result = await notificationService.requestPermissions();

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(result).toBe('granted');
    });

    it('TC-NS-005: ユーザーが拒否した場合は denied を返す', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' } as any);
      mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as any);

      const result = await notificationService.requestPermissions();

      expect(result).toBe('denied');
    });
  });

  // ===== scheduleNotificationsForCard() =====

  describe('scheduleNotificationsForCard()', () => {
    it('TC-NS-006: 権限がない場合はスケジュールしない', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as any);
      const card = makeCard();

      await notificationService.scheduleNotificationsForCard(card, defaultSettings);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('TC-NS-007: 有効な設定でONになった通知がスケジュールされる', async () => {
      const card = makeCard();

      await notificationService.scheduleNotificationsForCard(card, defaultSettings);

      // fourMonthsBefore=true, threeMonthsBefore=true, oneMonthBefore=true → 3件
      // twoWeeksBefore=false → スキップ
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    });

    it('TC-NS-008: 通知IDが cardId_type 形式で設定される', async () => {
      const card = makeCard({ id: 'card-abc' });

      await notificationService.scheduleNotificationsForCard(card, {
        ...defaultSettings,
        threeMonthsBefore: false,
        oneMonthBefore: false,
      });

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'card-abc_4months' })
      );
    });

    it('TC-NS-009: 有効期限が過去の場合、通知はスケジュールされない', async () => {
      const card = makeCard({ expirationDate: '2020-01-01' });

      await notificationService.scheduleNotificationsForCard(card, defaultSettings);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('TC-NS-010: スケジュール前に既存通知がキャンセルされる', async () => {
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
        { identifier: 'test-card-1_4months' } as any,
        { identifier: 'test-card-1_3months' } as any,
        { identifier: 'other-card_4months' } as any,
      ]);
      const card = makeCard();

      await notificationService.scheduleNotificationsForCard(card, defaultSettings);

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('test-card-1_4months');
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('test-card-1_3months');
      expect(mockNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('other-card_4months');
    });

    it('TC-NS-011: 全スイッチOFFの場合、通知はスケジュールされない', async () => {
      const card = makeCard();
      const allOffSettings: ReminderSettings = {
        ...defaultSettings,
        fourMonthsBefore: false,
        threeMonthsBefore: false,
        oneMonthBefore: false,
        twoWeeksBefore: false,
      };

      await notificationService.scheduleNotificationsForCard(card, allOffSettings);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('TC-NS-012: 通知ペイロードに在留カードIDが含まれない（セキュリティ確認）', async () => {
      const card = makeCard({ id: 'card-xyz', residenceType: 'student' });

      await notificationService.scheduleNotificationsForCard(card, {
        ...defaultSettings,
        threeMonthsBefore: false,
        oneMonthBefore: false,
        twoWeeksBefore: false,
      });

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      const callArg = mockNotifications.scheduleNotificationAsync.mock.calls[0][0];
      const body: string = (callArg as any).content.body;
      // 在留カードIDが通知本文に含まれないこと
      expect(body).not.toContain('card-xyz');
    });
  });

  // ===== cancelNotificationsForCard() =====

  describe('cancelNotificationsForCard()', () => {
    it('TC-NS-013: 該当カードの通知のみキャンセルされる', async () => {
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
        { identifier: 'card-1_4months' } as any,
        { identifier: 'card-1_3months' } as any,
        { identifier: 'card-2_4months' } as any,
      ]);

      await notificationService.cancelNotificationsForCard('card-1');

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('card-1_4months');
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('card-1_3months');
      expect(mockNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('card-2_4months');
    });
  });

  // ===== sendTestNotification() =====

  describe('sendTestNotification()', () => {
    it('TC-NS-014: テスト通知が2秒後にスケジュールされる', async () => {
      await notificationService.sendTestNotification();

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ seconds: 2 }),
        })
      );
    });
  });
});
