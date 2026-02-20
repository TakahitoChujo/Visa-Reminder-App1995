# API設計書：在留資格更新リマインダー

**文書バージョン**: 1.0  
**作成日**: 2025年2月14日  
**参照**: [共通データ契約.md](共通データ契約.md)、[DB設計書.md](DB設計書.md)、[要件定義書.md](../要件定義書.md)

---

## 1. スコープと前提

- **MVP**: オフライン優先のため、本 API は「アカウント連携時・将来の同期用」として定義する。クライアントはローカル DB を主とし、オンライン時に同期する想定。
- **認証**: 将来拡張で Bearer Token（JWT 等）を想定。本設計では `Authorization: Bearer <token>` をプレースホルダで記載。未認証時は 401 を返す。
- **日付**: ISO 8601。日付のみの場合は `YYYY-MM-DD`。日時は UTC で `YYYY-MM-DDTHH:mm:ss.sssZ` またはオフセット付きで返す。
- **ベースURL**: 例 `https://api.example.com/v1`（実装時に環境変数で切替）。

---

## 2. エンドポイント一覧

| メソッド | パス | 概要 |
|----------|------|------|
| GET | /me/residence | 在留資格登録1件取得 |
| PUT | /me/residence | 在留資格登録の作成・更新（1件） |
| GET | /me/reminder-settings | リマインダー設定取得 |
| PUT | /me/reminder-settings | リマインダー設定更新 |
| GET | /me/checklist-progress | チェックリスト進捗一覧取得 |
| PUT | /me/checklist-progress | チェックリスト進捗一括更新 |
| PATCH | /me/checklist-progress/items/:item_id | チェックリスト1項目の状態更新（任意） |
| GET | /master/qualification-types | 資格タイプマスタ取得 |
| GET | /master/checklist-templates/:qualificationTypeId | チェックリストテンプレート取得（資格タイプ別） |
| POST | /me/device-tokens | デバイストークン登録（プッシュ通知用・将来） |

---

## 3. 在留資格（/me/residence）

### GET /me/residence

**レスポンス**  
未登録の場合は 204 No Content または 404。登録済みの場合は 200。

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "qualification_type": "work",
  "expires_on": "2026-03-31",
  "created_at": "2025-02-14T00:00:00.000Z",
  "updated_at": "2025-02-14T00:00:00.000Z"
}
```

- `qualification_type`: 共通契約の code（work / spouse / permanent_prep / other）。
- `expires_on`: 有効期限（YYYY-MM-DD）。

### PUT /me/residence

**リクエストボディ**

```json
{
  "qualification_type": "work",
  "expires_on": "2026-03-31"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| qualification_type | string | ○ | 共通契約の code |
| expires_on | string (YYYY-MM-DD) | ○ | 在留カードの有効期限 |

**レスポンス**: 200 OK。ボディは GET と同様のオブジェクト。新規の場合は id を付与して返す。

**バリデーション**: expires_on は今日以降の日付を許容する（更新手続き済みの新しい期限を登録するため）。過去日は 400 で返却してよい。

---

## 4. リマインダー設定（/me/reminder-settings）

### GET /me/reminder-settings

**レスポンス** (200)

```json
{
  "4_months_before": true,
  "3_months_before": true,
  "1_month_before": true,
  "2_weeks_before": true,
  "updated_at": "2025-02-14T00:00:00.000Z"
}
```

- キー名は共通契約のリマインダーキーと一致。

### PUT /me/reminder-settings

**リクエストボディ**

```json
{
  "4_months_before": true,
  "3_months_before": false,
  "1_month_before": true,
  "2_weeks_before": true
}
```

**レスポンス**: 200 OK。ボディは GET と同様（updated_at を更新して返す）。

---

## 5. チェックリスト進捗（/me/checklist-progress）

### GET /me/checklist-progress

**クエリ** (任意): `residence_id` を指定した場合、その在留資格に紐づく進捗のみ返す。

**レスポンス** (200)

```json
{
  "items": [
    {
      "item_id": "work_01",
      "status": "done",
      "memo": null,
      "updated_at": "2025-02-14T00:00:00.000Z"
    },
    {
      "item_id": "work_02",
      "status": "not_started",
      "memo": null,
      "updated_at": "2025-02-14T00:00:00.000Z"
    }
  ]
}
```

- `status`: 共通契約のチェックリスト状態（not_started / done）。

### PUT /me/checklist-progress

**リクエストボディ**: 一括更新。residence_id が決まっている前提で、その residence に紐づく項目だけ送る。

```json
{
  "residence_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    { "item_id": "work_01", "status": "done", "memo": null },
    { "item_id": "work_02", "status": "not_started", "memo": null }
  ]
}
```

**レスポンス**: 200 OK。ボディは GET と同様の形式で返す。

### PATCH /me/checklist-progress/items/:item_id

**リクエストボディ**

```json
{
  "status": "done",
  "memo": "取得済み"
}
```

- `item_id`: 共通契約の item_id（例: work_01）。URL パスとボディで整合させる。
- **レスポンス**: 200 OK。更新後の当該項目1件を返す。

---

## 6. マスタ

### GET /master/qualification-types

**レスポンス** (200)

```json
{
  "qualification_types": [
    {
      "code": "work",
      "label_ja": "就労系（技術・人文・技能等）",
      "i18n_key": "qualification_type.work",
      "application_guide": "有効期限の約4ヶ月前から"
    },
    {
      "code": "spouse",
      "label_ja": "配偶者等（日本人配偶者等・永住者配偶者等）",
      "i18n_key": "qualification_type.spouse",
      "application_guide": "有効期限の約4ヶ月前から"
    },
    {
      "code": "permanent_prep",
      "label_ja": "永住申請前の準備",
      "i18n_key": "qualification_type.permanent_prep",
      "application_guide": "在留期限に応じて案内"
    },
    {
      "code": "other",
      "label_ja": "その他",
      "i18n_key": "qualification_type.other",
      "application_guide": "有効期限の約4ヶ月前から（目安）"
    }
  ]
}
```

- コード・キーは共通データ契約と完全一致。

### GET /master/checklist-templates/:qualificationTypeId

**パス**: `qualificationTypeId` は共通契約の code（work / spouse / permanent_prep / other）。

**レスポンス** (200) 例: qualificationTypeId=work

```json
{
  "qualification_type": "work",
  "items": [
    { "item_id": "work_01", "label_ja": "在留カード（原本）", "i18n_key": "checklist.work_01", "sort_order": 1 },
    { "item_id": "work_02", "label_ja": "写真（縦4cm×横3cm）", "i18n_key": "checklist.work_02", "sort_order": 2 },
    { "item_id": "work_03", "label_ja": "在留期間更新許可申請書", "i18n_key": "checklist.work_03", "sort_order": 3 },
    { "item_id": "work_04", "label_ja": "在職証明書・契約書等", "i18n_key": "checklist.work_04", "sort_order": 4 },
    { "item_id": "work_05", "label_ja": "その他資格別に必要な書類", "i18n_key": "checklist.work_05", "sort_order": 5 }
  ]
}
```

- UI で表示する項目はこのレスンス（またはローカルマスタ）で賄える。

---

## 7. デバイストークン（プッシュ通知・将来）

### POST /me/device-tokens

**リクエストボディ**

```json
{
  "platform": "ios",
  "token": "apns_or_fcm_device_token_string"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| platform | string | ○ | ios / android |
| token | string | ○ | APNs または FCM のデバイストークン |

**レスポンス**: 201 Created。または 200 OK（同一トークンの再登録時）。

- サーバー側でリマインダー日付を計算し、FCM/APNs 経由でプッシュ送信する実装は別ドキュメントで定義。

---

## 8. エラー・HTTP ステータス方針

| ステータス | 用途 |
|------------|------|
| 200 | 取得成功・更新成功 |
| 201 | リソース作成成功（例: device-tokens） |
| 204 | 取得成功かつボディなし（例: residence 未登録） |
| 400 | バリデーションエラー（不正な日付、必須項目欠落など） |
| 401 | 未認証・トークン無効 |
| 404 | リソースが存在しない（例: 存在しない qualificationTypeId） |
| 500 | サーバー内部エラー |

**エラーレスポンス例** (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "expires_on must be a valid date (YYYY-MM-DD).",
    "details": [{ "field": "expires_on", "reason": "invalid_format" }]
  }
}
```

- クライアントは `error.code` で分岐し、UI では `message` を表示する想定。

---

## 9. 他領域との整合

- **DB**: ペイロードのフィールド名・型は [DB設計書.md](DB設計書.md) のエンティティと一致。residence / reminder_settings / checklist_progress の各カラムと対応。
- **UI**: 画面で表示する「有効期限」「残り日数」「資格タイプ」「リマインダー設定」「チェックリスト項目と状態」は、本 API の GET レスンスおよびマスタ API で取得可能。日付はクライアントで「残り○日」「次回リマインド日」を計算可能。
- **共通契約**: qualification_type / item_id / status / リマインダーキーは [共通データ契約.md](共通データ契約.md) のコードと同一。

---

## 改訂履歴

| 版 | 日付 | 変更内容 |
|----|------|----------|
| 1.0 | 2025-02-14 | 初版作成 |
