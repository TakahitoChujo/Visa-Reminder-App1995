/**
 * Residence Type Repository
 * 在留資格マスタデータのリポジトリ
 */

import { ResidenceType, DatabaseError } from '../../types/database';
import { DatabaseService } from './DatabaseService';

/**
 * 在留資格マスタリポジトリクラス
 */
export class ResidenceTypeRepository {
  private static instance: ResidenceTypeRepository;
  private dbService: ReturnType<typeof DatabaseService.getInstance>;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): ResidenceTypeRepository {
    if (!ResidenceTypeRepository.instance) {
      ResidenceTypeRepository.instance = new ResidenceTypeRepository();
    }
    return ResidenceTypeRepository.instance;
  }

  /**
   * すべての有効な在留資格タイプを取得
   */
  public async findAll(): Promise<ResidenceType[]> {
    try {
      const db = this.dbService.getDatabase();

      const results = await db.getAllAsync<ResidenceType>(
        `SELECT * FROM residence_types WHERE is_active = 1 ORDER BY id`
      );

      return results.map((row) => this.mapToResidenceType(row));
    } catch (error) {
      throw new DatabaseError(
        '在留資格タイプの取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * IDで在留資格タイプを取得
   */
  public async findById(id: string): Promise<ResidenceType | null> {
    try {
      const db = this.dbService.getDatabase();

      const result = await db.getFirstAsync<ResidenceType>(
        `SELECT * FROM residence_types WHERE id = ? AND is_active = 1`,
        [id]
      );

      return result ? this.mapToResidenceType(result) : null;
    } catch (error) {
      throw new DatabaseError(
        '在留資格タイプの取得に失敗しました',
        'FETCH_ERROR',
        error as Error
      );
    }
  }

  /**
   * 在留資格タイプが存在するか確認
   */
  public async exists(id: string): Promise<boolean> {
    try {
      const db = this.dbService.getDatabase();

      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM residence_types WHERE id = ? AND is_active = 1`,
        [id]
      );

      return (result?.count || 0) > 0;
    } catch (error) {
      throw new DatabaseError(
        '在留資格タイプの存在確認に失敗しました',
        'CHECK_ERROR',
        error as Error
      );
    }
  }

  /**
   * データベース行を ResidenceType オブジェクトにマッピング
   */
  private mapToResidenceType(row: any): ResidenceType {
    return {
      id: row.id,
      name_ja: row.name_ja,
      name_en: row.name_en || null,
      application_months_before: row.application_months_before,
      description: row.description || null,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// シングルトンインスタンスをエクスポート
export default ResidenceTypeRepository.getInstance();
