/**
 * 通知関連のヘルパー関数
 */

import { NotificationType } from '../types';
import i18n from '../i18n';

/**
 * 通知タイプからラベルを取得（i18n対応）
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  return i18n.t(`notification:typeLabel.${type}`);
}

/**
 * 通知タイプから説明文を取得（i18n対応）
 */
export function getNotificationTypeDescription(type: NotificationType): string {
  return i18n.t(`notification:typeDescription.${type}`);
}

/**
 * 有効期限から通知日を計算
 */
export function calculateNotificationDate(
  expiryDate: Date,
  type: NotificationType,
  hour: number = 9,
  minute: number = 0
): Date {
  const date = new Date(expiryDate);

  switch (type) {
    case '4months':
      date.setMonth(date.getMonth() - 4);
      break;
    case '3months':
      date.setMonth(date.getMonth() - 3);
      break;
    case '1month':
      date.setMonth(date.getMonth() - 1);
      break;
    case '2weeks':
      date.setDate(date.getDate() - 14);
      break;
  }

  date.setHours(hour);
  date.setMinutes(minute);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

/**
 * 通知が過去の日付かチェック
 */
export function isNotificationDateInPast(
  expiryDate: Date,
  type: NotificationType
): boolean {
  const notificationDate = calculateNotificationDate(expiryDate, type);
  return notificationDate < new Date();
}

/**
 * 通知タイプのソート順を取得
 */
export function getNotificationTypeOrder(type: NotificationType): number {
  const order: Record<NotificationType, number> = {
    '4months': 1,
    '3months': 2,
    '1month': 3,
    '2weeks': 4,
  };
  return order[type];
}

/**
 * 通知識別子を生成
 */
export function generateNotificationIdentifier(
  residenceCardId: string,
  type: NotificationType
): string {
  return `${residenceCardId}_${type}`;
}

/**
 * 通知識別子から在留カードIDと通知タイプを抽出
 */
export function parseNotificationIdentifier(identifier: string): {
  residenceCardId: string;
  notificationType: NotificationType;
} | null {
  const parts = identifier.split('_');
  if (parts.length !== 2) {
    return null;
  }

  const [residenceCardId, typeStr] = parts;
  const notificationType = typeStr as NotificationType;

  if (!['4months', '3months', '1month', '2weeks'].includes(notificationType)) {
    return null;
  }

  return { residenceCardId, notificationType };
}

/**
 * 通知のプライオリティを取得（緊急度が高いほど大きい値）
 */
export function getNotificationPriority(type: NotificationType): number {
  const priority: Record<NotificationType, number> = {
    '2weeks': 4, // 最高
    '1month': 3,
    '3months': 2,
    '4months': 1,
  };
  return priority[type];
}

/**
 * 次に送信される通知タイプを取得
 */
export function getNextNotificationType(
  expiryDate: Date,
  enabledTypes: NotificationType[]
): NotificationType | null {
  const now = new Date();
  let nextType: NotificationType | null = null;
  let minDiff = Infinity;

  for (const type of enabledTypes) {
    const notificationDate = calculateNotificationDate(expiryDate, type);
    const diff = notificationDate.getTime() - now.getTime();

    // 未来の通知で、最も近いものを選択
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      nextType = type;
    }
  }

  return nextType;
}

/**
 * 通知メッセージのフォーマット（i18n対応）
 */
export function formatNotificationMessage(
  type: NotificationType,
  residenceTypeName?: string
): { title: string; body: string } {
  return {
    title: i18n.t(`notification:message.${type}.title`),
    body: i18n.t(`notification:message.${type}.body`, {
      name: residenceTypeName || i18n.t('common:residenceType.other'),
    }),
  };
}
