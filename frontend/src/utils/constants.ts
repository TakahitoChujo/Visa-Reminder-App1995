/**
 * アプリ共通定数
 *
 * 全画面に散在するマジックナンバーと重複定義を一か所に集約する。
 */

import type { ResidenceType } from '../types';

// ========== ビザ残り日数ステータス閾値 ==========

/**
 * ビザ残り日数に基づくステータス判定閾値（日数）。
 *
 * - SAFE   : 120日以上 → 余裕あり（緑）
 * - WARNING: 30〜119日 → 要確認（黄）
 * - （30日未満）       → 至急（赤）
 */
export const STATUS_DAYS = {
  /** 余裕あり（緑）と判定する残り日数の下限 */
  SAFE: 120,
  /** 要確認（黄）と判定する残り日数の下限（これ未満は至急・赤） */
  WARNING: 30,
} as const;

// ========== メモフィールド ==========

/** メモフィールドの最大文字数 */
export const MEMO_MAX_LENGTH = 500 as const;

// ========== 申請可能期間 ==========

/** 在留資格更新の申請が可能になる時期（有効期限の何ヶ月前から） */
export const APPLICATION_PERIOD_MONTHS = 4 as const;

// ========== 時間計算用 ==========

/** 2週間をミリ秒で表した値（通知スケジュール計算用） */
export const TWO_WEEKS_IN_MS = (14 * 24 * 60 * 60 * 1000) as number;

// ========== 在留資格タイプ一覧 ==========

/**
 * 在留資格タイプの値一覧。
 * 表示ラベルは i18n 経由で取得する: t('common:residenceType.${value}')
 */
export const RESIDENCE_TYPE_VALUES: ReadonlyArray<ResidenceType> = [
  'work_visa',
  'spouse_japanese',
  'spouse_permanent',
  'permanent_application',
  'student',
  'designated_activities',
  'skilled_worker',
  'other',
];
