-- ============================================
-- 在留資格更新リマインダー
-- SQLite データベーススキーマ
-- バージョン: 1.0
-- 作成日: 2026-02-14
-- ============================================

-- users テーブル
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_synced_at DATETIME,
    is_premium INTEGER NOT NULL DEFAULT 0,
    premium_expires_at DATETIME
);

CREATE INDEX idx_users_premium ON users(is_premium, premium_expires_at);

-- residence_types テーブル（マスタデータ）
CREATE TABLE residence_types (
    id TEXT PRIMARY KEY,
    name_ja TEXT NOT NULL,
    name_en TEXT,
    application_months_before INTEGER NOT NULL DEFAULT 4,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_residence_types_active ON residence_types(is_active);

-- residence_cards テーブル
CREATE TABLE residence_cards (
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

CREATE INDEX idx_residence_cards_user ON residence_cards(user_id, is_active);
CREATE INDEX idx_residence_cards_expiry ON residence_cards(expiry_date);
CREATE INDEX idx_residence_cards_deleted ON residence_cards(deleted_at);

-- checklist_templates テーブル
CREATE TABLE checklist_templates (
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

CREATE INDEX idx_checklist_templates_residence ON checklist_templates(residence_type_id, is_active, sort_order);
CREATE INDEX idx_checklist_templates_category ON checklist_templates(category);

-- checklist_items テーブル
CREATE TABLE checklist_items (
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

CREATE INDEX idx_checklist_items_residence ON checklist_items(residence_card_id, status);
CREATE INDEX idx_checklist_items_template ON checklist_items(template_id);

-- reminder_settings テーブル
CREATE TABLE reminder_settings (
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

CREATE UNIQUE INDEX idx_reminder_settings_user ON reminder_settings(user_id);

-- notification_logs テーブル
CREATE TABLE notification_logs (
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

CREATE INDEX idx_notification_logs_residence ON notification_logs(residence_card_id, notification_type);
CREATE INDEX idx_notification_logs_scheduled ON notification_logs(scheduled_date, is_sent);
CREATE INDEX idx_notification_logs_status ON notification_logs(status, scheduled_date);

-- device_tokens テーブル
CREATE TABLE device_tokens (
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

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id, is_active);
CREATE INDEX idx_device_tokens_platform ON device_tokens(platform);

-- ============================================
-- トリガー（updated_at自動更新）
-- ============================================

CREATE TRIGGER update_users_timestamp
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_residence_types_timestamp
AFTER UPDATE ON residence_types
BEGIN
    UPDATE residence_types SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_residence_cards_timestamp
AFTER UPDATE ON residence_cards
BEGIN
    UPDATE residence_cards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_checklist_templates_timestamp
AFTER UPDATE ON checklist_templates
BEGIN
    UPDATE checklist_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_checklist_items_timestamp
AFTER UPDATE ON checklist_items
BEGIN
    UPDATE checklist_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_reminder_settings_timestamp
AFTER UPDATE ON reminder_settings
BEGIN
    UPDATE reminder_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_device_tokens_timestamp
AFTER UPDATE ON device_tokens
BEGIN
    UPDATE device_tokens SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- マスタデータ初期投入
-- ============================================

-- 在留資格タイプマスタ
INSERT INTO residence_types (id, name_ja, name_en, application_months_before) VALUES
('work_visa', '技術・人文知識・国際業務', 'Engineer/Specialist in Humanities/International Services', 4),
('spouse_japanese', '日本人の配偶者等', 'Spouse or Child of Japanese National', 4),
('spouse_permanent', '永住者の配偶者等', 'Spouse or Child of Permanent Resident', 4),
('permanent_application', '永住申請準備', 'Permanent Residence Application Prep', 6),
('student', '留学', 'Student', 4),
('designated_activities', '特定活動', 'Designated Activities', 4),
('other', 'その他', 'Other', 4);

-- チェックリストテンプレート（技術・人文知識・国際業務）
INSERT INTO checklist_templates (id, residence_type_id, category, item_name_ja, item_name_en, sort_order) VALUES
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

-- チェックリストテンプレート（日本人の配偶者等）
INSERT INTO checklist_templates (id, residence_type_id, category, item_name_ja, item_name_en, sort_order) VALUES
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

-- ============================================
-- サンプルデータ（開発・テスト用）
-- ============================================

-- サンプルユーザー
INSERT INTO users (id, device_id, is_premium) VALUES
('user-test-001', 'device-test-001', 0);

-- サンプル在留カード
INSERT INTO residence_cards (id, user_id, residence_type_id, expiry_date, application_start_date)
VALUES ('card-test-001', 'user-test-001', 'work_visa', '2027-12-31', '2027-08-31');

-- サンプルリマインダー設定
INSERT INTO reminder_settings (id, user_id) VALUES
('settings-test-001', 'user-test-001');

-- サンプルチェックリスト項目（テンプレートから自動生成）
INSERT INTO checklist_items (id, residence_card_id, template_id, item_name, category, status)
SELECT
    'item-' || substr(id, 5),
    'card-test-001',
    id,
    item_name_ja,
    category,
    'pending'
FROM checklist_templates
WHERE residence_type_id = 'work_visa';

-- ============================================
-- ビュー（便利なクエリ）
-- ============================================

-- 有効期限が近い在留カード一覧
CREATE VIEW v_expiring_cards AS
SELECT
    rc.id,
    rc.user_id,
    rt.name_ja AS residence_type_name,
    rc.expiry_date,
    rc.application_start_date,
    CAST((JULIANDAY(rc.expiry_date) - JULIANDAY('now')) AS INTEGER) AS days_until_expiry,
    CASE
        WHEN JULIANDAY(rc.expiry_date) - JULIANDAY('now') <= 14 THEN '緊急'
        WHEN JULIANDAY(rc.expiry_date) - JULIANDAY('now') <= 30 THEN '警告'
        WHEN JULIANDAY(rc.expiry_date) - JULIANDAY('now') <= 90 THEN '注意'
        ELSE '正常'
    END AS urgency_level
FROM residence_cards rc
INNER JOIN residence_types rt ON rc.residence_type_id = rt.id
WHERE rc.is_active = 1
  AND rc.deleted_at IS NULL
  AND rc.expiry_date > DATE('now')
ORDER BY rc.expiry_date ASC;

-- チェックリスト進捗サマリー
CREATE VIEW v_checklist_progress AS
SELECT
    rc.id AS residence_card_id,
    rc.user_id,
    COUNT(ci.id) AS total_items,
    SUM(CASE WHEN ci.status = 'completed' THEN 1 ELSE 0 END) AS completed_items,
    SUM(CASE WHEN ci.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_items,
    SUM(CASE WHEN ci.status = 'pending' THEN 1 ELSE 0 END) AS pending_items,
    ROUND(
        CAST(SUM(CASE WHEN ci.status = 'completed' THEN 1 ELSE 0 END) AS REAL) / COUNT(ci.id) * 100,
        2
    ) AS completion_rate
FROM residence_cards rc
LEFT JOIN checklist_items ci ON rc.id = ci.residence_card_id
WHERE rc.is_active = 1
  AND rc.deleted_at IS NULL
GROUP BY rc.id, rc.user_id;

-- ============================================
-- 便利なクエリ例
-- ============================================

-- 例1: 特定ユーザーの在留カード一覧（チェックリスト進捗付き）
-- SELECT
--     rc.*,
--     rt.name_ja,
--     vp.total_items,
--     vp.completed_items,
--     vp.completion_rate
-- FROM residence_cards rc
-- INNER JOIN residence_types rt ON rc.residence_type_id = rt.id
-- LEFT JOIN v_checklist_progress vp ON rc.id = vp.residence_card_id
-- WHERE rc.user_id = 'user-test-001'
--   AND rc.is_active = 1
--   AND rc.deleted_at IS NULL;

-- 例2: 今日通知すべき通知ログ
-- SELECT
--     nl.*,
--     rc.expiry_date,
--     rt.name_ja AS residence_type_name,
--     u.id AS user_id,
--     dt.device_token
-- FROM notification_logs nl
-- INNER JOIN residence_cards rc ON nl.residence_card_id = rc.id
-- INNER JOIN residence_types rt ON rc.residence_type_id = rt.id
-- INNER JOIN users u ON rc.user_id = u.id
-- INNER JOIN device_tokens dt ON u.id = dt.user_id
-- WHERE nl.scheduled_date = DATE('now')
--   AND nl.is_sent = 0
--   AND nl.status = 'scheduled'
--   AND rc.is_active = 1
--   AND rc.deleted_at IS NULL
--   AND dt.is_active = 1;

-- 例3: カテゴリ別チェックリスト進捗
-- SELECT
--     ci.residence_card_id,
--     ci.category,
--     COUNT(*) AS total_items,
--     SUM(CASE WHEN ci.status = 'completed' THEN 1 ELSE 0 END) AS completed_items
-- FROM checklist_items ci
-- WHERE ci.residence_card_id = 'card-test-001'
-- GROUP BY ci.residence_card_id, ci.category
-- ORDER BY ci.category;
