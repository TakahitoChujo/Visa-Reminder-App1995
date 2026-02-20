/**
 * Residence Card Repository
 * 在留カード情報のCRUD操作を提供
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ResidenceCard,
  ResidenceCardDecrypted,
  CreateResidenceCardInput,
  UpdateResidenceCardInput,
  ResidenceCardDetail,
  ChecklistProgress,
  DatabaseError,
} from '../../types/database';
import { DatabaseService } from './DatabaseService';
import { EncryptionService } from './EncryptionService';

/**
 * 在留カードリポジトリクラス
 */
export class ResidenceCardRepository {
  private static instance: ResidenceCardRepository;
  private dbService: ReturnType<typeof DatabaseService.getInstance>;
  private encryptionService: ReturnType<typeof EncryptionService.getInstance>;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): ResidenceCardRepository {
    if (!ResidenceCardRepository.instance) {
      ResidenceCardRepository.instance = new ResidenceCardRepository();
    }
    return ResidenceCardRepository.instance;
  }

  /**
   * 在留カードを作成
   */
  public async create(
    userId: string,
    input: CreateResidenceCardInput
  ): Promise<ResidenceCardDecrypted> {
    try {
      const db = this.dbService.getDatabase();

      const id = uuidv4();
      const now = new Date().toISOString();

      // 申請開始日を計算（有効期限の4ヶ月前）
      const expiryDate = new Date(input.expiry_date);
      const applicationStartDate = new Date(expiryDate);
      applicationStartDate.setMonth(applicationStartDate.getMonth() - 4);

      // メモを暗号化
      const encryptedMemo = input.memo
        ? await this.encryptionService.encrypt(input.memo)
        : null;

      await db.runAsync(
        `INSERT INTO residence_cards (
          id, user_id, residence_type_id, expiry_date, application_start_date,
          is_active, memo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          input.residence_type_id,
          input.expiry_date,
          applicationStartDate.toISOString().split('T')[0],
          1,
          encryptedMemo,
          now,
          now,
        ]
      );

      const created = await this.findById(id);
      if (!created) {
        throw new Error('作成した在留カードの取得に失敗しました');
      }

      return created;
    } catch (error) {
      throw new DatabaseError(
        '在留カードの作成に失敗しました',
        'CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * IDで在留カードを取得
   */
  public async findById(id: string): Promise<ResidenceCardDecrypted | null> {
    try {
      const db = this.dbService.getDatabase();

      const result = await db.getFirstAsync<ResidenceCard>(
        `SELECT * FROM residence_cards WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );

      return result ? await this.decryptCard(result) : null;
    } catch (error) {
      throw new DatabaseError(
        '在留カードの取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * ユーザーIDで在留カードを取得（有効なカードのみ）
   */
  public async findByUserId(userId: string): Promise<ResidenceCardDecrypted[]> {
    try {
      const db = this.dbService.getDatabase();

      const results = await db.getAllAsync<ResidenceCard>(
        `SELECT * FROM residence_cards
         WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL
         ORDER BY expiry_date ASC`,
        [userId]
      );

      return Promise.all(results.map((card) => this.decryptCard(card)));
    } catch (error) {
      throw new DatabaseError(
        '在留カードの取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * ユーザーIDで在留カード詳細を取得（関連データ含む）
   */
  public async findDetailsByUserId(
    userId: string
  ): Promise<ResidenceCardDetail[]> {
    try {
      const db = this.dbService.getDatabase();

      const results = await db.getAllAsync<any>(
        `SELECT
          rc.*,
          rt.name_ja as residence_type_name_ja,
          rt.name_en as residence_type_name_en,
          rt.application_months_before,
          CAST((JULIANDAY(rc.expiry_date) - JULIANDAY('now')) AS INTEGER) as days_until_expiry,
          CASE
            WHEN JULIANDAY(rc.expiry_date) - JULIANDAY('now') <= 14 THEN 'critical'
            WHEN JULIANDAY(rc.expiry_date) - JULIANDAY('now') <= 30 THEN 'warning'
            WHEN JULIANDAY(rc.expiry_date) - JULIANDAY('now') <= 90 THEN 'caution'
            ELSE 'normal'
          END as urgency_level
         FROM residence_cards rc
         INNER JOIN residence_types rt ON rc.residence_type_id = rt.id
         WHERE rc.user_id = ? AND rc.is_active = 1 AND rc.deleted_at IS NULL
         ORDER BY rc.expiry_date ASC`,
        [userId]
      );

      const details: ResidenceCardDetail[] = [];

      for (const row of results) {
        const card = await this.decryptCard(row as ResidenceCard);

        // チェックリスト進捗を取得
        const progress = await this.getChecklistProgress(row.id);

        details.push({
          ...card,
          residence_type: {
            id: row.residence_type_id,
            name_ja: row.residence_type_name_ja,
            name_en: row.residence_type_name_en || null,
            application_months_before: row.application_months_before,
            description: null,
            is_active: true,
            created_at: row.created_at,
            updated_at: row.updated_at,
          },
          checklist_progress: progress || undefined,
          days_until_expiry: row.days_until_expiry,
          urgency_level: row.urgency_level as
            | 'critical'
            | 'warning'
            | 'caution'
            | 'normal',
        });
      }

      return details;
    } catch (error) {
      throw new DatabaseError(
        '在留カード詳細の取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * 在留カードを更新
   */
  public async update(
    id: string,
    input: UpdateResidenceCardInput
  ): Promise<ResidenceCardDecrypted> {
    try {
      const db = this.dbService.getDatabase();

      const updates: string[] = [];
      const values: any[] = [];

      if (input.residence_type_id !== undefined) {
        updates.push('residence_type_id = ?');
        values.push(input.residence_type_id);
      }

      if (input.expiry_date !== undefined) {
        updates.push('expiry_date = ?');
        values.push(input.expiry_date);

        // 申請開始日を再計算
        const expiryDate = new Date(input.expiry_date);
        const applicationStartDate = new Date(expiryDate);
        applicationStartDate.setMonth(applicationStartDate.getMonth() - 4);

        updates.push('application_start_date = ?');
        values.push(applicationStartDate.toISOString().split('T')[0]);
      }

      if (input.memo !== undefined) {
        const encryptedMemo = input.memo
          ? await this.encryptionService.encrypt(input.memo)
          : null;
        updates.push('memo = ?');
        values.push(encryptedMemo);
      }

      if (input.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(input.is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        const card = await this.findById(id);
        if (!card) {
          throw new Error('在留カードが見つかりません');
        }
        return card;
      }

      values.push(id);

      await db.runAsync(
        `UPDATE residence_cards SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('更新した在留カードの取得に失敗しました');
      }

      return updated;
    } catch (error) {
      throw new DatabaseError(
        '在留カードの更新に失敗しました',
        'UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 在留カードを論理削除
   */
  public async delete(id: string): Promise<void> {
    try {
      const db = this.dbService.getDatabase();

      const now = new Date().toISOString();

      await db.runAsync(
        `UPDATE residence_cards SET deleted_at = ?, is_active = 0 WHERE id = ?`,
        [now, id]
      );
    } catch (error) {
      throw new DatabaseError(
        '在留カードの削除に失敗しました',
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 在留カードを物理削除（開発用）
   */
  public async hardDelete(id: string): Promise<void> {
    try {
      const db = this.dbService.getDatabase();

      await db.runAsync(`DELETE FROM residence_cards WHERE id = ?`, [id]);
    } catch (error) {
      throw new DatabaseError(
        '在留カードの削除に失敗しました',
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 期限切れ間近の在留カードを取得
   */
  public async findExpiringSoon(
    userId: string,
    daysThreshold: number = 90
  ): Promise<ResidenceCardDecrypted[]> {
    try {
      const db = this.dbService.getDatabase();

      const results = await db.getAllAsync<ResidenceCard>(
        `SELECT * FROM residence_cards
         WHERE user_id = ?
         AND is_active = 1
         AND deleted_at IS NULL
         AND JULIANDAY(expiry_date) - JULIANDAY('now') <= ?
         AND JULIANDAY(expiry_date) - JULIANDAY('now') > 0
         ORDER BY expiry_date ASC`,
        [userId, daysThreshold]
      );

      return Promise.all(results.map((card) => this.decryptCard(card)));
    } catch (error) {
      throw new DatabaseError(
        '期限切れ間近の在留カードの取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * チェックリスト進捗を取得
   */
  private async getChecklistProgress(
    residenceCardId: string
  ): Promise<ChecklistProgress | null> {
    try {
      const db = this.dbService.getDatabase();

      const result = await db.getFirstAsync<any>(
        `SELECT
          residence_card_id,
          COUNT(*) as total_items,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_items,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_items,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_items,
          ROUND(
            CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100,
            2
          ) as completion_rate
         FROM checklist_items
         WHERE residence_card_id = ?
         GROUP BY residence_card_id`,
        [residenceCardId]
      );

      if (!result) {
        return null;
      }

      return {
        residence_card_id: result.residence_card_id,
        user_id: '', // ユーザーIDは必要に応じて取得
        total_items: result.total_items,
        completed_items: result.completed_items,
        in_progress_items: result.in_progress_items,
        pending_items: result.pending_items,
        completion_rate: result.completion_rate || 0,
      };
    } catch (error) {
      console.error('Failed to get checklist progress:', error);
      return null;
    }
  }

  /**
   * 在留カードのメモを復号化（自動移行付き）
   */
  private async decryptCard(
    card: ResidenceCard
  ): Promise<ResidenceCardDecrypted> {
    let decryptedMemo: string | null = null;

    if (card.memo) {
      // バージョン検出
      const version = this.encryptionService.detectEncryptionVersion(card.memo);

      // 復号化
      decryptedMemo = await this.encryptionService.decrypt(card.memo);

      // v1データの場合、v2に自動移行
      if (version === 'v1') {
        try {
          const newEncrypted = await this.encryptionService.encrypt(decryptedMemo);
          const db = this.dbService.getDatabase();

          await db.runAsync(
            `UPDATE residence_cards SET memo = ? WHERE id = ?`,
            [newEncrypted, card.id]
          );

          console.log(`[Migration] Card ${card.id}: v1 → v2 ✓`);
        } catch (error) {
          console.error(`[Migration] Failed to migrate card ${card.id}:`, error);
          // 移行失敗時も復号化データは返す
        }
      }
    }

    return {
      ...card,
      memo: decryptedMemo,
      is_active: Boolean(card.is_active),
    };
  }
}

// シングルトンインスタンスをエクスポート
export default ResidenceCardRepository.getInstance();
