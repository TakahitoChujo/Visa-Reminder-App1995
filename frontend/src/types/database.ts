/**
 * Database Type Definitions
 * 在留資格更新リマインダーアプリのデータベース型定義
 */

/**
 * ユーザー
 */
export interface User {
  id: string; // UUID
  device_id?: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  last_synced_at?: string | null; // ISO 8601
}

/**
 * 在留資格タイプ（マスタデータ）
 */
export interface ResidenceType {
  id: string; // e.g., 'work_visa', 'spouse_japanese'
  name_ja: string;
  name_en?: string | null;
  application_months_before: number; // デフォルト: 4
  description?: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * 在留カード情報
 */
export interface ResidenceCard {
  id: string; // UUID
  user_id: string;
  residence_type_id: string;
  expiry_date: string; // YYYY-MM-DD
  application_start_date?: string | null; // YYYY-MM-DD
  is_active: boolean;
  memo?: string | null; // 暗号化済み
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at?: string | null; // ISO 8601
}

/**
 * 在留カード情報（復号化済み）
 */
export interface ResidenceCardDecrypted extends Omit<ResidenceCard, 'memo'> {
  memo?: string | null; // 復号化済み平文
}

/**
 * 在留カード作成用入力データ
 */
export interface CreateResidenceCardInput {
  residence_type_id: string;
  expiry_date: string; // YYYY-MM-DD
  memo?: string;
}

/**
 * 在留カード更新用入力データ
 */
export interface UpdateResidenceCardInput {
  residence_type_id?: string;
  expiry_date?: string; // YYYY-MM-DD
  memo?: string;
  is_active?: boolean;
}

/**
 * チェックリストテンプレート
 */
export interface ChecklistTemplate {
  id: string; // UUID
  residence_type_id: string;
  category: string;
  item_name_ja: string;
  item_name_en?: string | null;
  description?: string | null;
  reference_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * チェックリスト項目のステータス
 */
export type ChecklistItemStatus = 'pending' | 'in_progress' | 'completed';

/**
 * チェックリスト項目
 */
export interface ChecklistItem {
  id: string; // UUID
  residence_card_id: string;
  template_id?: string | null;
  item_name: string;
  category: string;
  status: ChecklistItemStatus;
  memo?: string | null; // 暗号化済み
  completed_at?: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * チェックリスト項目（復号化済み）
 */
export interface ChecklistItemDecrypted extends Omit<ChecklistItem, 'memo'> {
  memo?: string | null; // 復号化済み平文
}

/**
 * チェックリスト項目作成用入力データ
 */
export interface CreateChecklistItemInput {
  residence_card_id: string;
  template_id?: string;
  item_name: string;
  category: string;
  memo?: string;
}

/**
 * チェックリスト項目更新用入力データ
 */
export interface UpdateChecklistItemInput {
  item_name?: string;
  category?: string;
  status?: ChecklistItemStatus;
  memo?: string;
}

/**
 * リマインダー設定
 */
export interface ReminderSettings {
  id: string; // UUID
  user_id: string;
  enabled: boolean;
  notify_4months: boolean;
  notify_3months: boolean;
  notify_1month: boolean;
  notify_2weeks: boolean;
  notification_time: string; // HH:MM:SS
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * リマインダー設定更新用入力データ
 */
export interface UpdateReminderSettingsInput {
  enabled?: boolean;
  notify_4months?: boolean;
  notify_3months?: boolean;
  notify_1month?: boolean;
  notify_2weeks?: boolean;
  notification_time?: string; // HH:MM:SS
}

/**
 * 通知タイプ
 */
export type NotificationType = '4months' | '3months' | '1month' | '2weeks';

/**
 * 通知ステータス
 */
export type NotificationStatus = 'scheduled' | 'sent' | 'failed';

/**
 * 通知ログ
 */
export interface NotificationLog {
  id: string; // UUID
  residence_card_id: string;
  notification_type: NotificationType;
  scheduled_date: string; // YYYY-MM-DD
  sent_at?: string | null; // ISO 8601
  is_sent: boolean;
  status: NotificationStatus;
  error_message?: string | null;
  created_at: string; // ISO 8601
}

/**
 * デバイストークン
 */
export interface DeviceToken {
  id: string; // UUID
  user_id: string;
  device_token: string;
  platform: 'ios' | 'android' | 'web';
  device_id?: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  last_used_at?: string | null; // ISO 8601
}

/**
 * チェックリスト進捗サマリー
 */
export interface ChecklistProgress {
  residence_card_id: string;
  user_id: string;
  total_items: number;
  completed_items: number;
  in_progress_items: number;
  pending_items: number;
  completion_rate: number; // 0-100
}

/**
 * 在留カード詳細（関連データ含む）
 */
export interface ResidenceCardDetail extends ResidenceCardDecrypted {
  residence_type?: ResidenceType;
  checklist_progress?: ChecklistProgress;
  days_until_expiry?: number;
  urgency_level?: 'critical' | 'warning' | 'caution' | 'normal';
}

/**
 * データベースエラー
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * 暗号化エラー
 */
export class EncryptionError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'EncryptionError';
  }
}
