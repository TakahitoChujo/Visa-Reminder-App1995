/**
 * 型定義 - 在留資格更新リマインダー
 */

// ========== Database types（データベース層専用）==========
// データベースリポジトリで使用される型
export * from './database';

// Database typesから明示的にインポート（再エクスポート用）
import type {
  ResidenceType as ResidenceTypeDB,
  ResidenceCard as ResidenceCardDB,
  ReminderSettings as ReminderSettingsDB,
  ChecklistItem as ChecklistItemDB,
  NotificationType,
} from './database';

// ========== UI層の型定義（UI components用）==========
// UIコンポーネントで使用される型（camelCase形式）

// 在留資格タイプ（UI用）
export type ResidenceType =
  | 'work_visa'
  | 'spouse_japanese'
  | 'spouse_permanent'
  | 'permanent_application'
  | 'student'
  | 'designated_activities'
  | 'skilled_worker'
  | 'other';

// 在留カード情報（UI用）
export interface ResidenceCard {
  id: string;
  expirationDate: string; // ISO 8601形式
  residenceType: ResidenceType;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

// リマインダー設定（UI用）
export interface ReminderSettings {
  fourMonthsBefore: boolean;
  threeMonthsBefore: boolean;
  oneMonthBefore: boolean;
  twoWeeksBefore: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
}

// チェックリスト項目（UI用）
export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  completed: boolean;
  note?: string;
  order: number;
}

// チェックリストカテゴリ
export interface ChecklistCategory {
  id: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
}

// 在留資格タイプ情報
export interface ResidenceTypeInfo {
  value: ResidenceType;
  label: string;
  description?: string;
}

// 通知設定
export interface NotificationConfig {
  enabled: boolean;
  permissions: 'granted' | 'denied' | 'undetermined';
}

// 通知ペイロード
export interface NotificationPayload {
  residenceCardId: string;
  notificationType: NotificationType;
  expiryDate: string;
}

// デバイストークン情報
export interface DeviceToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  registeredAt: Date;
}

// 通知パーミッション状態
export type NotificationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied';

// サポート言語タイプ
export type { SupportedLanguage } from '../i18n';

// アプリケーション設定
export interface AppSettings {
  language: 'ja' | 'en';
  darkMode: boolean;
  notificationSound: boolean;
}

// ナビゲーションパラメータ
export type RootStackParamList = {
  Home: undefined;
  Register: undefined;
  Edit: { cardId: string };
  Checklist: { cardId: string };
  ReminderSettings: undefined;
  Settings: undefined;
};

// タブナビゲーションパラメータ
export type TabParamList = {
  HomeTab: undefined;
  ChecklistTab: undefined;
  SettingsTab: undefined;
};

