/**
 * 通知関連の型定義
 */

/**
 * 通知タイプ
 * - 4months: 有効期限の4ヶ月前（申請可能時期）
 * - 3months: 有効期限の3ヶ月前（書類準備確認）
 * - 1month: 有効期限の1ヶ月前（最終確認）
 * - 2weeks: 有効期限の2週間前（緊急アラート）
 */
export type NotificationType = '4months' | '3months' | '1month' | '2weeks';

/**
 * 通知設定
 */
export interface NotificationSettings {
  enabled: boolean;
  notify4Months: boolean;
  notify3Months: boolean;
  notify1Month: boolean;
  notify2Weeks: boolean;
  notificationTime: {
    hour: number; // 0-23
    minute: number; // 0-59
  };
}

/**
 * スケジュール済み通知の情報
 */
export interface ScheduledNotification {
  identifier: string;
  residenceCardId: string;
  notificationType: NotificationType;
  scheduledDate: Date;
  title: string;
  body: string;
}

/**
 * 通知ペイロード（通知データに含まれる情報）
 */
export interface NotificationPayload {
  residenceCardId: string;
  notificationType: NotificationType;
  expiryDate: string;
}

/**
 * デバイストークン情報
 */
export interface DeviceToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  registeredAt: Date;
}

/**
 * 通知メッセージテンプレート
 */
export interface NotificationMessage {
  title: string;
  body: string;
}

/**
 * 通知パーミッション状態
 */
export type NotificationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied';
