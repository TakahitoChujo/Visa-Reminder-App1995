/**
 * Database Service
 * SQLiteデータベースの初期化とマイグレーション管理
 *
 * expo-sqlite を使用したローカルデータベース実装
 */

import * as SQLite from 'expo-sqlite';
import { DatabaseError } from '../../types';

/**
 * データベースバージョン
 * スキーマ変更時にインクリメント
 */
const DATABASE_VERSION = 1;
const DATABASE_NAME = 'visa_reminder.db';

/**
 * データベースサービスクラス
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * データベースを初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // データベースを開く
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);

      // 外部キー制約を有効化
      await this.db.execAsync('PRAGMA foreign_keys = ON;');

      // マイグレーション実行
      await this.runMigrations();

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      throw new DatabaseError(
        'データベースの初期化に失敗しました',
        'DB_INIT_ERROR',
        error as Error
      );
    }
  }

  /**
   * データベースインスタンスを取得
   */
  public getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db || !this.isInitialized) {
      throw new DatabaseError(
        'データベースが初期化されていません',
        'DB_NOT_INITIALIZED'
      );
    }
    return this.db;
  }

  /**
   * マイグレーションを実行
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError(
        'データベースが開かれていません',
        'DB_NOT_OPEN'
      );
    }

    // 現在のバージョンを取得
    const currentVersion = await this.getDatabaseVersion();

    console.log(
      `Current database version: ${currentVersion}, Target version: ${DATABASE_VERSION}`
    );

    // バージョンが同じ場合はスキップ
    if (currentVersion === DATABASE_VERSION) {
      console.log('Database is up to date');
      return;
    }

    // マイグレーション実行
    if (currentVersion === 0) {
      await this.migrateToVersion1();
    }

    // バージョンを更新
    await this.setDatabaseVersion(DATABASE_VERSION);
  }

  /**
   * 現在のデータベースバージョンを取得
   */
  private async getDatabaseVersion(): Promise<number> {
    if (!this.db) {
      return 0;
    }

    try {
      // user_version プラグマを使用してバージョン管理
      const result = await this.db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version;'
      );
      return result?.user_version || 0;
    } catch (error) {
      console.error('Failed to get database version:', error);
      return 0;
    }
  }

  /**
   * データベースバージョンを設定
   */
  private async setDatabaseVersion(version: number): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('データベースが開かれていません', 'DB_NOT_OPEN');
    }

    await this.db.execAsync(`PRAGMA user_version = ${version};`);
    console.log(`Database version set to ${version}`);
  }

  /**
   * バージョン1へのマイグレーション
   * 初期スキーマ作成
   */
  private async migrateToVersion1(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('データベースが開かれていません', 'DB_NOT_OPEN');
    }

    console.log('Running migration to version 1...');

    try {
      await this.db.execAsync(`
        -- users テーブル
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          device_id TEXT UNIQUE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_synced_at DATETIME
        );

        -- residence_types テーブル
        CREATE TABLE IF NOT EXISTS residence_types (
          id TEXT PRIMARY KEY,
          name_ja TEXT NOT NULL,
          name_en TEXT,
          application_months_before INTEGER NOT NULL DEFAULT 4,
          description TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_residence_types_active ON residence_types(is_active);

        -- residence_cards テーブル
        CREATE TABLE IF NOT EXISTS residence_cards (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          residence_type_id TEXT NOT NULL,
          expiry_date DATE NOT NULL,
          application_start_date DATE,
          is_active INTEGER NOT NULL DEFAULT 1,
          memo TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (residence_type_id) REFERENCES residence_types(id)
        );

        CREATE INDEX IF NOT EXISTS idx_residence_cards_user ON residence_cards(user_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_residence_cards_expiry ON residence_cards(expiry_date);
        CREATE INDEX IF NOT EXISTS idx_residence_cards_deleted ON residence_cards(deleted_at);

        -- checklist_templates テーブル
        CREATE TABLE IF NOT EXISTS checklist_templates (
          id TEXT PRIMARY KEY,
          residence_type_id TEXT NOT NULL,
          category TEXT NOT NULL,
          item_name_ja TEXT NOT NULL,
          item_name_en TEXT,
          description TEXT,
          reference_url TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (residence_type_id) REFERENCES residence_types(id)
        );

        CREATE INDEX IF NOT EXISTS idx_checklist_templates_residence ON checklist_templates(residence_type_id, is_active, sort_order);
        CREATE INDEX IF NOT EXISTS idx_checklist_templates_category ON checklist_templates(category);

        -- checklist_items テーブル
        CREATE TABLE IF NOT EXISTS checklist_items (
          id TEXT PRIMARY KEY,
          residence_card_id TEXT NOT NULL,
          template_id TEXT,
          item_name TEXT NOT NULL,
          category TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          memo TEXT,
          completed_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (residence_card_id) REFERENCES residence_cards(id) ON DELETE CASCADE,
          FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_checklist_items_residence ON checklist_items(residence_card_id, status);
        CREATE INDEX IF NOT EXISTS idx_checklist_items_template ON checklist_items(template_id);

        -- reminder_settings テーブル
        CREATE TABLE IF NOT EXISTS reminder_settings (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          enabled INTEGER NOT NULL DEFAULT 1,
          notify_4months INTEGER NOT NULL DEFAULT 1,
          notify_3months INTEGER NOT NULL DEFAULT 1,
          notify_1month INTEGER NOT NULL DEFAULT 1,
          notify_2weeks INTEGER NOT NULL DEFAULT 1,
          notification_time TEXT NOT NULL DEFAULT '10:00:00',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_settings_user ON reminder_settings(user_id);

        -- notification_logs テーブル
        CREATE TABLE IF NOT EXISTS notification_logs (
          id TEXT PRIMARY KEY,
          residence_card_id TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          scheduled_date DATE NOT NULL,
          sent_at DATETIME,
          is_sent INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'scheduled',
          error_message TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (residence_card_id) REFERENCES residence_cards(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_notification_logs_residence ON notification_logs(residence_card_id, notification_type);
        CREATE INDEX IF NOT EXISTS idx_notification_logs_scheduled ON notification_logs(scheduled_date, is_sent);
        CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status, scheduled_date);

        -- device_tokens テーブル
        CREATE TABLE IF NOT EXISTS device_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          device_token TEXT NOT NULL UNIQUE,
          platform TEXT NOT NULL,
          device_id TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_used_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);

        -- トリガー（updated_at自動更新）
        CREATE TRIGGER IF NOT EXISTS update_users_timestamp
        AFTER UPDATE ON users
        BEGIN
          UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_residence_types_timestamp
        AFTER UPDATE ON residence_types
        BEGIN
          UPDATE residence_types SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_residence_cards_timestamp
        AFTER UPDATE ON residence_cards
        BEGIN
          UPDATE residence_cards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_checklist_templates_timestamp
        AFTER UPDATE ON checklist_templates
        BEGIN
          UPDATE checklist_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_checklist_items_timestamp
        AFTER UPDATE ON checklist_items
        BEGIN
          UPDATE checklist_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_reminder_settings_timestamp
        AFTER UPDATE ON reminder_settings
        BEGIN
          UPDATE reminder_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_device_tokens_timestamp
        AFTER UPDATE ON device_tokens
        BEGIN
          UPDATE device_tokens SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `);

      // マスタデータ投入
      await this.seedMasterData();

      console.log('Migration to version 1 completed');
    } catch (error) {
      throw new DatabaseError(
        'マイグレーションに失敗しました',
        'MIGRATION_ERROR',
        error as Error
      );
    }
  }

  /**
   * マスタデータを投入
   */
  private async seedMasterData(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      // 在留資格タイプマスタ
      await this.db.execAsync(`
        INSERT OR IGNORE INTO residence_types (id, name_ja, name_en, application_months_before) VALUES
        ('work_visa', '技術・人文知識・国際業務', 'Engineer/Specialist in Humanities/International Services', 4),
        ('spouse_japanese', '日本人の配偶者等', 'Spouse or Child of Japanese National', 4),
        ('spouse_permanent', '永住者の配偶者等', 'Spouse or Child of Permanent Resident', 4),
        ('permanent_application', '永住申請準備', 'Permanent Residence Application Prep', 6),
        ('student', '留学', 'Student', 4),
        ('designated_activities', '特定活動', 'Designated Activities', 4),
        ('skilled_worker', '特定技能', 'Specified Skilled Worker', 4),
        ('other', 'その他', 'Other', 4);
      `);

      // チェックリストテンプレート（技術・人文知識・国際業務）
      await this.db.execAsync(`
        INSERT OR IGNORE INTO checklist_templates (id, residence_type_id, category, item_name_ja, item_name_en, sort_order) VALUES
        ('tpl_work_1', 'work_visa', '基本書類', '在留期間更新許可申請書', 'Application for Extension of Period of Stay', 1),
        ('tpl_work_2', 'work_visa', '基本書類', '写真（4cm × 3cm）', 'Photo (4cm × 3cm)', 2),
        ('tpl_work_3', 'work_visa', '基本書類', '在留カード（原本）', 'Residence Card (Original)', 3),
        ('tpl_work_4', 'work_visa', '基本書類', 'パスポート', 'Passport', 4),
        ('tpl_work_5', 'work_visa', '証明書類', '在職証明書', 'Certificate of Employment', 5),
        ('tpl_work_6', 'work_visa', '証明書類', '課税証明書・納税証明書', 'Tax Certificate', 6),
        ('tpl_work_7', 'work_visa', '証明書類', '住民票（世帯全員）', 'Certificate of Residence', 7),
        ('tpl_work_8', 'work_visa', '会社書類', '会社登記簿謄本', 'Company Registration Certificate', 8),
        ('tpl_work_9', 'work_visa', '会社書類', '決算報告書', 'Financial Statement', 9),
        ('tpl_work_10', 'work_visa', 'その他', '健康保険証のコピー', 'Health Insurance Card Copy', 10);
      `);

      // チェックリストテンプレート（日本人の配偶者等）
      await this.db.execAsync(`
        INSERT OR IGNORE INTO checklist_templates (id, residence_type_id, category, item_name_ja, item_name_en, sort_order) VALUES
        ('tpl_spouse_1', 'spouse_japanese', '基本書類', '在留期間更新許可申請書', 'Application for Extension of Period of Stay', 1),
        ('tpl_spouse_2', 'spouse_japanese', '基本書類', '写真（4cm × 3cm）', 'Photo (4cm × 3cm)', 2),
        ('tpl_spouse_3', 'spouse_japanese', '基本書類', '在留カード（原本）', 'Residence Card (Original)', 3),
        ('tpl_spouse_4', 'spouse_japanese', '基本書類', 'パスポート', 'Passport', 4),
        ('tpl_spouse_5', 'spouse_japanese', '身分関係書類', '戸籍謄本（配偶者の）', 'Family Register (Spouse)', 5),
        ('tpl_spouse_6', 'spouse_japanese', '身分関係書類', '結婚証明書', 'Marriage Certificate', 6),
        ('tpl_spouse_7', 'spouse_japanese', '証明書類', '住民票（世帯全員）', 'Certificate of Residence', 7),
        ('tpl_spouse_8', 'spouse_japanese', '証明書類', '課税証明書・納税証明書', 'Tax Certificate', 8),
        ('tpl_spouse_9', 'spouse_japanese', 'その他', '婚姻関係を証明する写真', 'Photos Proving Marriage', 9),
        ('tpl_spouse_10', 'spouse_japanese', 'その他', '質問書', 'Questionnaire', 10);
      `);

      console.log('Master data seeded successfully');
    } catch (error) {
      console.error('Failed to seed master data:', error);
      throw error;
    }
  }

  /**
   * データベースをクローズ
   */
  public async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      console.log('Database closed');
    }
  }

  /**
   * データベースをリセット（開発用）
   * 警告: すべてのデータが削除されます
   */
  public async reset(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('データベースが開かれていません', 'DB_NOT_OPEN');
    }

    try {
      // すべてのテーブルを削除
      await this.db.execAsync(`
        DROP TABLE IF EXISTS device_tokens;
        DROP TABLE IF EXISTS notification_logs;
        DROP TABLE IF EXISTS reminder_settings;
        DROP TABLE IF EXISTS checklist_items;
        DROP TABLE IF EXISTS checklist_templates;
        DROP TABLE IF EXISTS residence_cards;
        DROP TABLE IF EXISTS residence_types;
        DROP TABLE IF EXISTS users;
      `);

      // バージョンをリセット
      await this.setDatabaseVersion(0);

      // 再初期化
      this.isInitialized = false;
      await this.initialize();

      console.log('Database reset completed');
    } catch (error) {
      throw new DatabaseError(
        'データベースのリセットに失敗しました',
        'DB_RESET_ERROR',
        error as Error
      );
    }
  }
}

// シングルトンインスタンスをエクスポート
export default DatabaseService.getInstance();
