/**
 * Checklist Repository
 * チェックリスト項目のCRUD操作を提供
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ChecklistItem,
  ChecklistItemDecrypted,
  ChecklistTemplate,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
  ChecklistItemStatus,
  DatabaseError,
} from '../../types/database';
import { DatabaseService } from './DatabaseService';
import { EncryptionService } from './EncryptionService';

/**
 * チェックリストリポジトリクラス
 */
export class ChecklistRepository {
  private static instance: ChecklistRepository;
  private dbService: ReturnType<typeof DatabaseService.getInstance>;
  private encryptionService: ReturnType<typeof EncryptionService.getInstance>;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): ChecklistRepository {
    if (!ChecklistRepository.instance) {
      ChecklistRepository.instance = new ChecklistRepository();
    }
    return ChecklistRepository.instance;
  }

  // ========== チェックリストテンプレート ==========

  /**
   * 在留資格タイプのテンプレートを取得
   */
  public async findTemplatesByResidenceType(
    residenceTypeId: string
  ): Promise<ChecklistTemplate[]> {
    try {
      const db = this.dbService.getDatabase();

      const results = await db.getAllAsync<ChecklistTemplate>(
        `SELECT * FROM checklist_templates
         WHERE residence_type_id = ? AND is_active = 1
         ORDER BY sort_order ASC, created_at ASC`,
        [residenceTypeId]
      );

      return results.map((row) => this.mapToChecklistTemplate(row));
    } catch (error) {
      throw new DatabaseError(
        'チェックリストテンプレートの取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * カテゴリ別にテンプレートを取得
   */
  public async findTemplatesByCategory(
    residenceTypeId: string
  ): Promise<Map<string, ChecklistTemplate[]>> {
    try {
      const templates = await this.findTemplatesByResidenceType(
        residenceTypeId
      );

      const categorized = new Map<string, ChecklistTemplate[]>();

      for (const template of templates) {
        const category = template.category;
        if (!categorized.has(category)) {
          categorized.set(category, []);
        }
        categorized.get(category)!.push(template);
      }

      return categorized;
    } catch (error) {
      throw new DatabaseError(
        'チェックリストテンプレートの取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  // ========== チェックリスト項目 ==========

  /**
   * チェックリスト項目を作成
   */
  public async create(
    input: CreateChecklistItemInput
  ): Promise<ChecklistItemDecrypted> {
    try {
      const db = this.dbService.getDatabase();

      const id = uuidv4();
      const now = new Date().toISOString();

      // メモを暗号化
      const encryptedMemo = input.memo
        ? await this.encryptionService.encrypt(input.memo)
        : null;

      await db.runAsync(
        `INSERT INTO checklist_items (
          id, residence_card_id, template_id, item_name, category,
          status, memo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.residence_card_id,
          input.template_id || null,
          input.item_name,
          input.category,
          'pending',
          encryptedMemo,
          now,
          now,
        ]
      );

      const created = await this.findById(id);
      if (!created) {
        throw new Error('作成したチェックリスト項目の取得に失敗しました');
      }

      return created;
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の作成に失敗しました',
        'CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * テンプレートからチェックリスト項目を一括作成
   */
  public async createFromTemplates(
    residenceCardId: string,
    residenceTypeId: string
  ): Promise<ChecklistItemDecrypted[]> {
    try {
      const templates = await this.findTemplatesByResidenceType(
        residenceTypeId
      );

      const items: ChecklistItemDecrypted[] = [];

      for (const template of templates) {
        const item = await this.create({
          residence_card_id: residenceCardId,
          template_id: template.id,
          item_name: template.item_name_ja,
          category: template.category,
        });
        items.push(item);
      }

      return items;
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の一括作成に失敗しました',
        'BULK_CREATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * IDでチェックリスト項目を取得
   */
  public async findById(id: string): Promise<ChecklistItemDecrypted | null> {
    try {
      const db = this.dbService.getDatabase();

      const result = await db.getFirstAsync<ChecklistItem>(
        `SELECT * FROM checklist_items WHERE id = ?`,
        [id]
      );

      return result ? await this.decryptItem(result) : null;
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * 在留カードIDでチェックリスト項目を取得
   */
  public async findByResidenceCardId(
    residenceCardId: string
  ): Promise<ChecklistItemDecrypted[]> {
    try {
      const db = this.dbService.getDatabase();

      const results = await db.getAllAsync<ChecklistItem>(
        `SELECT * FROM checklist_items
         WHERE residence_card_id = ?
         ORDER BY category ASC, created_at ASC`,
        [residenceCardId]
      );

      return Promise.all(results.map((item) => this.decryptItem(item)));
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * カテゴリ別にチェックリスト項目を取得
   */
  public async findByCategory(
    residenceCardId: string
  ): Promise<Map<string, ChecklistItemDecrypted[]>> {
    try {
      const items = await this.findByResidenceCardId(residenceCardId);

      const categorized = new Map<string, ChecklistItemDecrypted[]>();

      for (const item of items) {
        const category = item.category;
        if (!categorized.has(category)) {
          categorized.set(category, []);
        }
        categorized.get(category)!.push(item);
      }

      return categorized;
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * ステータス別にチェックリスト項目を取得
   */
  public async findByStatus(
    residenceCardId: string,
    status: ChecklistItemStatus
  ): Promise<ChecklistItemDecrypted[]> {
    try {
      const db = this.dbService.getDatabase();

      const results = await db.getAllAsync<ChecklistItem>(
        `SELECT * FROM checklist_items
         WHERE residence_card_id = ? AND status = ?
         ORDER BY category ASC, created_at ASC`,
        [residenceCardId, status]
      );

      return Promise.all(results.map((item) => this.decryptItem(item)));
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * チェックリスト項目を更新
   */
  public async update(
    id: string,
    input: UpdateChecklistItemInput
  ): Promise<ChecklistItemDecrypted> {
    try {
      const db = this.dbService.getDatabase();

      const updates: string[] = [];
      const values: any[] = [];

      if (input.item_name !== undefined) {
        updates.push('item_name = ?');
        values.push(input.item_name);
      }

      if (input.category !== undefined) {
        updates.push('category = ?');
        values.push(input.category);
      }

      if (input.status !== undefined) {
        updates.push('status = ?');
        values.push(input.status);

        // ステータスが completed の場合は completed_at を設定
        if (input.status === 'completed') {
          updates.push('completed_at = ?');
          values.push(new Date().toISOString());
        } else {
          updates.push('completed_at = NULL');
        }
      }

      if (input.memo !== undefined) {
        const encryptedMemo = input.memo
          ? await this.encryptionService.encrypt(input.memo)
          : null;
        updates.push('memo = ?');
        values.push(encryptedMemo);
      }

      if (updates.length === 0) {
        const item = await this.findById(id);
        if (!item) {
          throw new Error('チェックリスト項目が見つかりません');
        }
        return item;
      }

      values.push(id);

      await db.runAsync(
        `UPDATE checklist_items SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('更新したチェックリスト項目の取得に失敗しました');
      }

      return updated;
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の更新に失敗しました',
        'UPDATE_ERROR',
        error as Error
      );
    }
  }

  /**
   * チェックリスト項目のステータスを更新
   */
  public async updateStatus(
    id: string,
    status: ChecklistItemStatus
  ): Promise<ChecklistItemDecrypted> {
    return this.update(id, { status });
  }

  /**
   * チェックリスト項目を完了にする
   */
  public async complete(id: string): Promise<ChecklistItemDecrypted> {
    return this.updateStatus(id, 'completed');
  }

  /**
   * チェックリスト項目を未完了に戻す
   */
  public async uncomplete(id: string): Promise<ChecklistItemDecrypted> {
    return this.updateStatus(id, 'pending');
  }

  /**
   * チェックリスト項目を削除
   */
  public async delete(id: string): Promise<void> {
    try {
      const db = this.dbService.getDatabase();

      await db.runAsync(`DELETE FROM checklist_items WHERE id = ?`, [id]);
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の削除に失敗しました',
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * 在留カードのすべてのチェックリスト項目を削除
   */
  public async deleteByResidenceCardId(residenceCardId: string): Promise<void> {
    try {
      const db = this.dbService.getDatabase();

      await db.runAsync(
        `DELETE FROM checklist_items WHERE residence_card_id = ?`,
        [residenceCardId]
      );
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト項目の削除に失敗しました',
        'DELETE_ERROR',
        error as Error
      );
    }
  }

  /**
   * チェックリスト進捗を取得
   */
  public async getProgress(residenceCardId: string): Promise<{
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    completion_rate: number;
  }> {
    try {
      const db = this.dbService.getDatabase();

      const result = await db.getFirstAsync<any>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
         FROM checklist_items
         WHERE residence_card_id = ?`,
        [residenceCardId]
      );

      const total = result?.total || 0;
      const completed = result?.completed || 0;
      const in_progress = result?.in_progress || 0;
      const pending = result?.pending || 0;

      const completion_rate = total > 0 ? (completed / total) * 100 : 0;

      return {
        total,
        completed,
        in_progress,
        pending,
        completion_rate: Math.round(completion_rate * 100) / 100,
      };
    } catch (error) {
      throw new DatabaseError(
        'チェックリスト進捗の取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * チェックリスト項目のメモを復号化（自動移行付き）
   */
  private async decryptItem(
    item: ChecklistItem
  ): Promise<ChecklistItemDecrypted> {
    let decryptedMemo: string | null = null;

    if (item.memo) {
      // バージョン検出
      const version = this.encryptionService.detectEncryptionVersion(item.memo);

      // 復号化
      decryptedMemo = await this.encryptionService.decrypt(item.memo);

      // v1データの場合、v2に自動移行
      if (version === 'v1') {
        try {
          const newEncrypted = await this.encryptionService.encrypt(decryptedMemo);
          const db = this.dbService.getDatabase();

          await db.runAsync(
            `UPDATE checklist_items SET memo = ? WHERE id = ?`,
            [newEncrypted, item.id]
          );

          console.log(`[Migration] Checklist item ${item.id}: v1 → v2 ✓`);
        } catch (error) {
          console.error(`[Migration] Failed to migrate checklist item ${item.id}:`, error);
          // 移行失敗時も復号化データは返す
        }
      }
    }

    return {
      ...item,
      memo: decryptedMemo,
    };
  }

  /**
   * データベース行を ChecklistTemplate オブジェクトにマッピング
   */
  private mapToChecklistTemplate(row: any): ChecklistTemplate {
    return {
      id: row.id,
      residence_type_id: row.residence_type_id,
      category: row.category,
      item_name_ja: row.item_name_ja,
      item_name_en: row.item_name_en || null,
      description: row.description || null,
      reference_url: row.reference_url || null,
      sort_order: row.sort_order,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// シングルトンインスタンスをエクスポート
export default ChecklistRepository.getInstance();
