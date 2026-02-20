-- ============================================
-- 在留資格更新リマインダー
-- PostgreSQL データベーススキーマ
-- バージョン: 1.0
-- 作成日: 2026-02-14
-- ============================================

-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- テーブル作成
-- ============================================

-- users テーブル
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    premium_expires_at TIMESTAMP
);

CREATE INDEX idx_users_premium ON users(is_premium, premium_expires_at);

COMMENT ON TABLE users IS 'ユーザー情報（デバイスベース匿名管理）';
COMMENT ON COLUMN users.device_id IS 'デバイス識別子（匿名）';
COMMENT ON COLUMN users.is_premium IS '有料版フラグ';

-- residence_types テーブル（マスタデータ）
CREATE TABLE residence_types (
    id VARCHAR(50) PRIMARY KEY,
    name_ja VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    application_months_before INTEGER NOT NULL DEFAULT 4,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_residence_types_active ON residence_types(is_active);

COMMENT ON TABLE residence_types IS '在留資格タイプマスタ';
COMMENT ON COLUMN residence_types.application_months_before IS '申請可能開始月数（有効期限の何ヶ月前から）';

-- residence_cards テーブル
CREATE TABLE residence_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    residence_type_id VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    application_start_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    memo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (residence_type_id) REFERENCES residence_types(id)
);

CREATE INDEX idx_residence_cards_user ON residence_cards(user_id, is_active);
CREATE INDEX idx_residence_cards_expiry ON residence_cards(expiry_date);
CREATE INDEX idx_residence_cards_deleted ON residence_cards(deleted_at);

COMMENT ON TABLE residence_cards IS '在留カード情報';
COMMENT ON COLUMN residence_cards.memo IS 'ユーザーメモ（暗号化推奨）';
COMMENT ON COLUMN residence_cards.deleted_at IS '論理削除日時';

-- checklist_templates テーブル
CREATE TABLE checklist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    residence_type_id VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    item_name_ja VARCHAR(255) NOT NULL,
    item_name_en VARCHAR(255),
    description TEXT,
    reference_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (residence_type_id) REFERENCES residence_types(id)
);

CREATE INDEX idx_checklist_templates_residence ON checklist_templates(residence_type_id, is_active, sort_order);
CREATE INDEX idx_checklist_templates_category ON checklist_templates(category);

COMMENT ON TABLE checklist_templates IS 'チェックリストテンプレート（資格タイプ別）';

-- checklist_items テーブル
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    residence_card_id UUID NOT NULL,
    template_id UUID,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    memo TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (residence_card_id) REFERENCES residence_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE SET NULL,
    CONSTRAINT chk_status CHECK (status IN ('pending', 'in_progress', 'completed'))
);

CREATE INDEX idx_checklist_items_residence ON checklist_items(residence_card_id, status);
CREATE INDEX idx_checklist_items_template ON checklist_items(template_id);

COMMENT ON TABLE checklist_items IS 'チェックリスト項目（ユーザー別）';
COMMENT ON COLUMN checklist_items.memo IS 'ユーザーメモ（暗号化推奨）';

-- reminder_settings テーブル
CREATE TABLE reminder_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notify_4months BOOLEAN NOT NULL DEFAULT TRUE,
    notify_3months BOOLEAN NOT NULL DEFAULT TRUE,
    notify_1month BOOLEAN NOT NULL DEFAULT TRUE,
    notify_2weeks BOOLEAN NOT NULL DEFAULT TRUE,
    notification_time TIME NOT NULL DEFAULT '10:00:00',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_reminder_settings_user ON reminder_settings(user_id);

COMMENT ON TABLE reminder_settings IS 'リマインダー設定（ユーザー別）';
COMMENT ON COLUMN reminder_settings.notification_time IS '通知送信時刻';

-- notification_logs テーブル
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    residence_card_id UUID NOT NULL,
    notification_type VARCHAR(20) NOT NULL,
    scheduled_date DATE NOT NULL,
    sent_at TIMESTAMP,
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (residence_card_id) REFERENCES residence_cards(id) ON DELETE CASCADE,
    CONSTRAINT chk_notification_type CHECK (notification_type IN ('4months', '3months', '1month', '2weeks')),
    CONSTRAINT chk_notification_status CHECK (status IN ('scheduled', 'sent', 'failed'))
);

CREATE INDEX idx_notification_logs_residence ON notification_logs(residence_card_id, notification_type);
CREATE INDEX idx_notification_logs_scheduled ON notification_logs(scheduled_date, is_sent);
CREATE INDEX idx_notification_logs_status ON notification_logs(status, scheduled_date);

COMMENT ON TABLE notification_logs IS '通知履歴・スケジュール';

-- device_tokens テーブル
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    device_token TEXT NOT NULL UNIQUE,
    platform VARCHAR(10) NOT NULL,
    device_id VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_platform CHECK (platform IN ('ios', 'android'))
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id, is_active);
CREATE INDEX idx_device_tokens_platform ON device_tokens(platform);

COMMENT ON TABLE device_tokens IS 'デバイストークン（FCM/APNs）';

-- ============================================
-- トリガー（updated_at自動更新）
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_residence_types_timestamp BEFORE UPDATE ON residence_types
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_residence_cards_timestamp BEFORE UPDATE ON residence_cards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_templates_timestamp BEFORE UPDATE ON checklist_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_timestamp BEFORE UPDATE ON checklist_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_settings_timestamp BEFORE UPDATE ON reminder_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_tokens_timestamp BEFORE UPDATE ON device_tokens
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- マスタデータ初期投入
-- ============================================

-- 在留資格タイプマスタ
INSERT INTO residence_types (id, name_ja, name_en, application_months_before, description) VALUES
('work_visa', '技術・人文知識・国際業務', 'Engineer/Specialist in Humanities/International Services', 4, '就労系在留資格'),
('spouse_japanese', '日本人の配偶者等', 'Spouse or Child of Japanese National', 4, '配偶者系在留資格'),
('spouse_permanent', '永住者の配偶者等', 'Spouse or Child of Permanent Resident', 4, '配偶者系在留資格'),
('permanent_application', '永住申請準備', 'Permanent Residence Application Prep', 6, '永住権申請準備'),
('student', '留学', 'Student', 4, '留学生向け'),
('designated_activities', '特定活動', 'Designated Activities', 4, '特定活動'),
('skilled_worker', '技能', 'Skilled Labor', 4, '技能実習等'),
('highly_skilled', '高度専門職', 'Highly Skilled Professional', 4, '高度人材'),
('other', 'その他', 'Other', 4, 'その他の在留資格');

-- チェックリストテンプレート（技術・人文知識・国際業務）
INSERT INTO checklist_templates (residence_type_id, category, item_name_ja, item_name_en, description, sort_order) VALUES
('work_visa', '基本書類', '在留期間更新許可申請書', 'Application for Extension of Period of Stay', '法務省のウェブサイトからダウンロード可能', 1),
('work_visa', '基本書類', '写真（4cm × 3cm）', 'Photo (4cm × 3cm)', '申請前3ヶ月以内に撮影、無帽・無背景', 2),
('work_visa', '基本書類', '在留カード（原本）', 'Residence Card (Original)', '提示用', 3),
('work_visa', '基本書類', 'パスポート', 'Passport', '提示用', 4),
('work_visa', '証明書類', '在職証明書', 'Certificate of Employment', '勤務先から取得', 5),
('work_visa', '証明書類', '課税証明書・納税証明書', 'Tax Certificate', '市区町村役場で取得', 6),
('work_visa', '証明書類', '住民票（世帯全員）', 'Certificate of Residence', '市区町村役場で取得', 7),
('work_visa', '会社書類', '会社登記簿謄本', 'Company Registration Certificate', '法務局で取得（発行3ヶ月以内）', 8),
('work_visa', '会社書類', '決算報告書（直近年度）', 'Financial Statement', '会社から取得', 9),
('work_visa', '会社書類', '給与支払事務所等の開設届出書', 'Notification of Opening Tax Payment Office', '会社から取得', 10),
('work_visa', 'その他', '健康保険証のコピー', 'Health Insurance Card Copy', '社会保険加入証明', 11),
('work_visa', 'その他', '雇用契約書のコピー', 'Employment Contract Copy', '契約内容の証明', 12);

-- チェックリストテンプレート（日本人の配偶者等）
INSERT INTO checklist_templates (residence_type_id, category, item_name_ja, item_name_en, description, sort_order) VALUES
('spouse_japanese', '基本書類', '在留期間更新許可申請書', 'Application for Extension of Period of Stay', '法務省のウェブサイトからダウンロード', 1),
('spouse_japanese', '基本書類', '写真（4cm × 3cm）', 'Photo (4cm × 3cm)', '申請前3ヶ月以内に撮影', 2),
('spouse_japanese', '基本書類', '在留カード（原本）', 'Residence Card (Original)', '提示用', 3),
('spouse_japanese', '基本書類', 'パスポート', 'Passport', '提示用', 4),
('spouse_japanese', '身分関係書類', '戸籍謄本（配偶者の）', 'Family Register (Spouse)', '配偶者が日本人であることの証明', 5),
('spouse_japanese', '身分関係書類', '結婚証明書', 'Marriage Certificate', '母国の結婚証明書（翻訳文添付）', 6),
('spouse_japanese', '身分関係書類', '配偶者の住民票', 'Spouse Certificate of Residence', '世帯全員記載', 7),
('spouse_japanese', '証明書類', '住民票（世帯全員）', 'Certificate of Residence', '市区町村役場で取得', 8),
('spouse_japanese', '証明書類', '課税証明書・納税証明書', 'Tax Certificate', '配偶者または本人', 9),
('spouse_japanese', '証明書類', '在職証明書', 'Certificate of Employment', '働いている場合', 10),
('spouse_japanese', 'その他', '婚姻関係を証明する写真', 'Photos Proving Marriage', '夫婦一緒の写真複数枚', 11),
('spouse_japanese', 'その他', '質問書', 'Questionnaire', '出会いから結婚までの経緯等', 12),
('spouse_japanese', 'その他', '身元保証書', 'Letter of Guarantee', '配偶者または親族', 13);

-- チェックリストテンプレート（留学）
INSERT INTO checklist_templates (residence_type_id, category, item_name_ja, item_name_en, description, sort_order) VALUES
('student', '基本書類', '在留期間更新許可申請書', 'Application for Extension of Period of Stay', NULL, 1),
('student', '基本書類', '写真（4cm × 3cm）', 'Photo (4cm × 3cm)', NULL, 2),
('student', '基本書類', '在留カード（原本）', 'Residence Card (Original)', NULL, 3),
('student', '基本書類', 'パスポート', 'Passport', NULL, 4),
('student', '学校書類', '在学証明書', 'Certificate of Enrollment', NULL, 5),
('student', '学校書類', '成績証明書', 'Academic Transcript', NULL, 6),
('student', '学校書類', '出席証明書', 'Attendance Certificate', NULL, 7),
('student', '経費支弁書類', '預金残高証明書', 'Bank Statement', NULL, 8),
('student', '経費支弁書類', '奨学金受給証明書', 'Scholarship Certificate', 'ある場合', 9),
('student', 'その他', 'アルバイト先の在職証明書', 'Part-time Work Certificate', 'アルバイトしている場合', 10);

-- ============================================
-- ビュー
-- ============================================

-- 有効期限が近い在留カード一覧
CREATE OR REPLACE VIEW v_expiring_cards AS
SELECT
    rc.id,
    rc.user_id,
    rt.name_ja AS residence_type_name,
    rt.name_en AS residence_type_name_en,
    rc.expiry_date,
    rc.application_start_date,
    (rc.expiry_date - CURRENT_DATE) AS days_until_expiry,
    CASE
        WHEN rc.expiry_date - CURRENT_DATE <= 14 THEN '緊急'
        WHEN rc.expiry_date - CURRENT_DATE <= 30 THEN '警告'
        WHEN rc.expiry_date - CURRENT_DATE <= 90 THEN '注意'
        ELSE '正常'
    END AS urgency_level,
    rc.created_at,
    rc.updated_at
FROM residence_cards rc
INNER JOIN residence_types rt ON rc.residence_type_id = rt.id
WHERE rc.is_active = TRUE
  AND rc.deleted_at IS NULL
  AND rc.expiry_date > CURRENT_DATE
ORDER BY rc.expiry_date ASC;

COMMENT ON VIEW v_expiring_cards IS '有効期限が近い在留カード一覧（緊急度付き）';

-- チェックリスト進捗サマリー
CREATE OR REPLACE VIEW v_checklist_progress AS
SELECT
    rc.id AS residence_card_id,
    rc.user_id,
    COUNT(ci.id) AS total_items,
    COUNT(CASE WHEN ci.status = 'completed' THEN 1 END) AS completed_items,
    COUNT(CASE WHEN ci.status = 'in_progress' THEN 1 END) AS in_progress_items,
    COUNT(CASE WHEN ci.status = 'pending' THEN 1 END) AS pending_items,
    ROUND(
        CAST(COUNT(CASE WHEN ci.status = 'completed' THEN 1 END) AS NUMERIC) / NULLIF(COUNT(ci.id), 0) * 100,
        2
    ) AS completion_rate
FROM residence_cards rc
LEFT JOIN checklist_items ci ON rc.id = ci.residence_card_id
WHERE rc.is_active = TRUE
  AND rc.deleted_at IS NULL
GROUP BY rc.id, rc.user_id;

COMMENT ON VIEW v_checklist_progress IS 'チェックリスト進捗サマリー（カード別）';

-- 通知予定一覧
CREATE OR REPLACE VIEW v_upcoming_notifications AS
SELECT
    nl.id AS notification_id,
    nl.notification_type,
    nl.scheduled_date,
    nl.status,
    rc.id AS residence_card_id,
    rc.expiry_date,
    rt.name_ja AS residence_type_name,
    u.id AS user_id,
    u.is_premium
FROM notification_logs nl
INNER JOIN residence_cards rc ON nl.residence_card_id = rc.id
INNER JOIN residence_types rt ON rc.residence_type_id = rt.id
INNER JOIN users u ON rc.user_id = u.id
WHERE nl.is_sent = FALSE
  AND nl.status = 'scheduled'
  AND rc.is_active = TRUE
  AND rc.deleted_at IS NULL
ORDER BY nl.scheduled_date ASC;

COMMENT ON VIEW v_upcoming_notifications IS '送信予定の通知一覧';

-- ============================================
-- 便利な関数
-- ============================================

-- 申請開始日を自動計算する関数
CREATE OR REPLACE FUNCTION calculate_application_start_date(
    expiry_date DATE,
    months_before INTEGER DEFAULT 4
)
RETURNS DATE AS $$
BEGIN
    RETURN expiry_date - (months_before || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_application_start_date IS '有効期限から申請開始日を計算';

-- 在留カード登録時に通知スケジュールを自動作成するトリガー
CREATE OR REPLACE FUNCTION create_notification_schedule()
RETURNS TRIGGER AS $$
DECLARE
    settings RECORD;
    months_before INTEGER;
BEGIN
    -- ユーザーのリマインダー設定を取得
    SELECT * INTO settings FROM reminder_settings WHERE user_id = NEW.user_id;

    -- 設定がない場合はデフォルト設定で作成
    IF settings IS NULL THEN
        INSERT INTO reminder_settings (user_id) VALUES (NEW.user_id);
        SELECT * INTO settings FROM reminder_settings WHERE user_id = NEW.user_id;
    END IF;

    -- 通知スケジュール作成（設定が有効な場合のみ）
    IF settings.enabled THEN
        -- 4ヶ月前通知
        IF settings.notify_4months THEN
            INSERT INTO notification_logs (residence_card_id, notification_type, scheduled_date)
            VALUES (NEW.id, '4months', NEW.expiry_date - INTERVAL '4 months');
        END IF;

        -- 3ヶ月前通知
        IF settings.notify_3months THEN
            INSERT INTO notification_logs (residence_card_id, notification_type, scheduled_date)
            VALUES (NEW.id, '3months', NEW.expiry_date - INTERVAL '3 months');
        END IF;

        -- 1ヶ月前通知
        IF settings.notify_1month THEN
            INSERT INTO notification_logs (residence_card_id, notification_type, scheduled_date)
            VALUES (NEW.id, '1month', NEW.expiry_date - INTERVAL '1 month');
        END IF;

        -- 2週間前通知
        IF settings.notify_2weeks THEN
            INSERT INTO notification_logs (residence_card_id, notification_type, scheduled_date)
            VALUES (NEW.id, '2weeks', NEW.expiry_date - INTERVAL '2 weeks');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_notification_schedule
AFTER INSERT ON residence_cards
FOR EACH ROW
EXECUTE FUNCTION create_notification_schedule();

COMMENT ON FUNCTION create_notification_schedule IS '在留カード登録時に通知スケジュールを自動作成';

-- ============================================
-- パーティショニング（将来の大規模化対応）
-- ============================================

-- notification_logs テーブルを月別にパーティショニング（例）
-- CREATE TABLE notification_logs_2026_02 PARTITION OF notification_logs
-- FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- ============================================
-- 便利なクエリ例
-- ============================================

-- 例1: 特定ユーザーの在留カード一覧（チェックリスト進捗付き）
/*
SELECT
    rc.id,
    rc.expiry_date,
    rt.name_ja,
    vp.total_items,
    vp.completed_items,
    vp.completion_rate,
    (rc.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM residence_cards rc
INNER JOIN residence_types rt ON rc.residence_type_id = rt.id
LEFT JOIN v_checklist_progress vp ON rc.id = vp.residence_card_id
WHERE rc.user_id = 'ユーザーID'
  AND rc.is_active = TRUE
  AND rc.deleted_at IS NULL
ORDER BY rc.expiry_date ASC;
*/

-- 例2: 今日通知すべき通知一覧
/*
SELECT * FROM v_upcoming_notifications
WHERE scheduled_date = CURRENT_DATE;
*/

-- 例3: カテゴリ別チェックリスト進捗
/*
SELECT
    ci.residence_card_id,
    ci.category,
    COUNT(*) AS total_items,
    COUNT(CASE WHEN ci.status = 'completed' THEN 1 END) AS completed_items,
    ROUND(
        CAST(COUNT(CASE WHEN ci.status = 'completed' THEN 1 END) AS NUMERIC) / COUNT(*) * 100,
        2
    ) AS completion_rate
FROM checklist_items ci
WHERE ci.residence_card_id = 'カードID'
GROUP BY ci.residence_card_id, ci.category
ORDER BY ci.category;
*/
