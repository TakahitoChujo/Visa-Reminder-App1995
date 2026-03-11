/**
 * Reminder Repository
 * リマインダー設定のCRUD操作を提供
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ReminderSettings,
  UpdateReminderSettingsInput,
  DatabaseError,
} from '../../types/database';
import { DatabaseService } from './DatabaseService';

/**
 * リマインダーリポジトリクラス
 */
export class ReminderRepository {
  private static instance: ReminderRepository;
  private dbService: ReturnType<typeof DatabaseService.getInstance>;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): ReminderRepository {
    if (!ReminderRepository.instance) {
      ReminderRepository.instance = new ReminderRepository();
    }
    return ReminderRepository.instance;
  }

  /**
   * ユーザーのリマインダー設定を取得
   * 存在しない場合はデフォルト設定を作成
   */
  public async findByUserId(userId: string): Promise<ReminderSettings> {
    try {
      const db = this.dbService.getDatabase();

      let result = await db.getFirstAsync<ReminderSettings>(
        `SELECT * FROM reminder_settings WHERE user_id = ?`,
        [userId]
      );

      // 設定が存在しない場合はデフォルト設定を作成
      if (!result) {
        result = await this.createDefault(userId);
      }

      return this.mapToReminderSettings(result);
    } catch (error) {
      throw new DatabaseError(
        'リマインダー設定の取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * デフォルトのリマインダー設定を作成
   */
  private async createDefault(userId: string): Promise<ReminderSettings> {
    try {
      const db = this.dbService.getDatabase();

      const id = uuidv4();
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO reminder_settings (
          id, user_id, enabled, notify_4months, notify_3months,
          notify_1month, notify_2weeks, notification_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, 1, 1, 1, 1, 1, '10:00:00', now, now]
      );

      const created = await db.getFirstAsync<ReminderSettings>(
        `SELECT * FROM reminder_settings WHERE id = ?`,
        [id]
      );

      if (!created) {
        throw new Error('デフォルト設定の作成に失敗しました');
      }

      return created;
    } catch (error) {
      throw new DatabaseError(
        'リマインダー設定の作成に失敗しました',
        'CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * リマインダー設定を更新
   */
  public async update(
    userId: string,
    input: UpdateReminderSettingsInput
  ): Promise<ReminderSettings> {
    try {
      const db = this.dbService.getDatabase();

      const updates: string[] = [];
      const values: any[] = [];

      if (input.enabled !== undefined) {
        updates.push('enabled = ?');
        values.push(input.enabled ? 1 : 0);
      }

      if (input.notify_4months !== undefined) {
        updates.push('notify_4months = ?');
        values.push(input.notify_4months ? 1 : 0);
      }

      if (input.notify_3months !== undefined) {
        updates.push('notify_3months = ?');
        values.push(input.notify_3months ? 1 : 0);
      }

      if (input.notify_1month !== undefined) {
        updates.push('notify_1month = ?');
        values.push(input.notify_1month ? 1 : 0);
      }

      if (input.notify_2weeks !== undefined) {
        updates.push('notify_2weeks = ?');
        values.push(input.notify_2weeks ? 1 : 0);
      }

      if (input.notification_time !== undefined) {
        updates.push('notification_time = ?');
        values.push(input.notification_time);
      }

      if (updates.length === 0) {
        return await this.findByUserId(userId);
      }

      values.push(userId);

      await db.runAsync(
        `UPDATE reminder_settings SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );

      return await this.findByUserId(userId);
    } catch (error) {
      throw new DatabaseError(
        'リマインダー設定の更新に失敗しました',
        'UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * リマインダー設定を削除
   */
  public async delete(userId: string): Promise<void> {
    try {
      const db = this.dbService.getDatabase();

      await db.runAsync(`DELETE FROM reminder_settings WHERE user_id = ?`, [
        userId,
      ]);
    } catch (error) {
      throw new DatabaseError(
        'リマインダー設定の削除に失敗しました',
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * リマインダーが有効かチェック
   */
  public async isEnabled(userId: string): Promise<boolean> {
    try {
      const settings = await this.findByUserId(userId);
      return settings.enabled;
    } catch (error) {
      console.error('Failed to check reminder enabled:', error);
      return false;
    }
  }

  /**
   * 特定の通知タイプが有効かチェック
   */
  public async isNotificationEnabled(
    userId: string,
    notificationType: '4months' | '3months' | '1month' | '2weeks'
  ): Promise<boolean> {
    try {
      const settings = await this.findByUserId(userId);

      if (!settings.enabled) {
        return false;
      }

      switch (notificationType) {
        case '4months':
          return settings.notify_4months;
        case '3months':
          return settings.notify_3months;
        case '1month':
          return settings.notify_1month;
        case '2weeks':
          return settings.notify_2weeks;
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to check notification enabled:', error);
      return false;
    }
  }

  /**
   * データベース行を ReminderSettings オブジェクトにマッピング
   */
  private mapToReminderSettings(row: any): ReminderSettings {
    return {
      id: row.id,
      user_id: row.user_id,
      enabled: Boolean(row.enabled),
      notify_4months: Boolean(row.notify_4months),
      notify_3months: Boolean(row.notify_3months),
      notify_1month: Boolean(row.notify_1month),
      notify_2weeks: Boolean(row.notify_2weeks),
      notification_time: row.notification_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// シングルトンインスタンスをエクスポート
export default ReminderRepository.getInstance();
