# API仕様書：在留資格更新リマインダー

**作成日**: 2026年2月14日
**バージョン**: 1.0
**API バージョン**: v1

---

## 1. 概要

### 1.1 API設計方針

- **アーキテクチャ**: RESTful API
- **データ形式**: JSON
- **認証**: JWT (JSON Web Token)
- **プロトコル**: HTTPS のみ
- **レート制限**: 1分あたり60リクエスト（認証済みユーザー）

### 1.2 ベースURL

```
開発環境: https://api-dev.visa-reminder.app/v1
本番環境: https://api.visa-reminder.app/v1
```

### 1.3 共通ヘッダー

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {jwt_token}
X-API-Version: 1.0
X-Device-ID: {device_uuid}
```

---

## 2. 認証・認可

### 2.1 デバイス登録

**エンドポイント**: `POST /auth/device/register`

**説明**: デバイスを登録し、匿名ユーザーIDを取得

**リクエスト**:
```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform": "ios",
  "os_version": "17.0",
  "app_version": "1.0.0"
}
```

**レスポンス** (201 Created):
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 2.2 トークン更新

**エンドポイント**: `POST /auth/token/refresh`

**リクエスト**:
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**レスポンス** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

---

## 3. 在留資格管理

### 3.1 在留資格登録

**エンドポイント**: `POST /api/residence-cards`

**説明**: 新しい在留資格情報を登録

**リクエスト**:
```json
{
  "residence_type_id": "work_visa",
  "expiry_date": "2027-12-31",
  "memo": "次回更新時に必要な書類を確認すること"
}
```

**レスポンス** (201 Created):
```json
{
  "id": "card-123e4567-e89b-12d3",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "residence_type_id": "work_visa",
  "residence_type_name": "技術・人文知識・国際業務",
  "expiry_date": "2027-12-31",
  "application_start_date": "2027-08-31",
  "days_until_expiry": 695,
  "is_active": true,
  "memo": "次回更新時に必要な書類を確認すること",
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z",
  "checklist": {
    "total_items": 15,
    "completed_items": 0,
    "completion_rate": 0
  }
}
```

**エラーレスポンス** (400 Bad Request):
```json
{
  "error": {
    "code": "INVALID_EXPIRY_DATE",
    "message": "有効期限は未来の日付である必要があります",
    "details": {
      "field": "expiry_date",
      "provided": "2020-12-31"
    }
  }
}
```

### 3.2 在留資格一覧取得

**エンドポイント**: `GET /api/residence-cards`

**クエリパラメータ**:
- `is_active` (boolean): 有効なカードのみ取得（デフォルト: true）
- `include_deleted` (boolean): 削除済みを含む（デフォルト: false）

**レスポンス** (200 OK):
```json
{
  "data": [
    {
      "id": "card-123e4567-e89b-12d3",
      "residence_type_id": "work_visa",
      "residence_type_name": "技術・人文知識・国際業務",
      "expiry_date": "2027-12-31",
      "application_start_date": "2027-08-31",
      "days_until_expiry": 695,
      "is_active": true,
      "checklist": {
        "total_items": 15,
        "completed_items": 5,
        "completion_rate": 33.33
      },
      "next_reminder": {
        "type": "4months",
        "scheduled_date": "2027-08-31"
      },
      "created_at": "2026-02-14T10:00:00Z",
      "updated_at": "2026-02-14T10:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 20
  }
}
```

### 3.3 在留資格詳細取得

**エンドポイント**: `GET /api/residence-cards/:id`

**レスポンス** (200 OK):
```json
{
  "id": "card-123e4567-e89b-12d3",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "residence_type_id": "work_visa",
  "residence_type": {
    "id": "work_visa",
    "name_ja": "技術・人文知識・国際業務",
    "name_en": "Engineer/Specialist in Humanities/International Services",
    "application_months_before": 4,
    "description": "就労系在留資格"
  },
  "expiry_date": "2027-12-31",
  "application_start_date": "2027-08-31",
  "days_until_expiry": 695,
  "is_active": true,
  "memo": "次回更新時に必要な書類を確認すること",
  "checklist_summary": {
    "total_items": 15,
    "completed_items": 5,
    "in_progress_items": 3,
    "pending_items": 7,
    "completion_rate": 33.33
  },
  "reminders": [
    {
      "type": "4months",
      "scheduled_date": "2027-08-31",
      "status": "scheduled"
    },
    {
      "type": "3months",
      "scheduled_date": "2027-09-30",
      "status": "scheduled"
    }
  ],
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z"
}
```

### 3.4 在留資格更新

**エンドポイント**: `PUT /api/residence-cards/:id`

**リクエスト**:
```json
{
  "expiry_date": "2028-12-31",
  "residence_type_id": "work_visa",
  "memo": "更新完了、次回は2028年8月に申請"
}
```

**レスポンス** (200 OK):
```json
{
  "id": "card-123e4567-e89b-12d3",
  "residence_type_id": "work_visa",
  "expiry_date": "2028-12-31",
  "application_start_date": "2028-08-31",
  "memo": "更新完了、次回は2028年8月に申請",
  "updated_at": "2026-02-14T11:00:00Z"
}
```

### 3.5 在留資格削除

**エンドポイント**: `DELETE /api/residence-cards/:id`

**説明**: 論理削除（deleted_at にタイムスタンプを設定）

**レスポンス** (204 No Content)

---

## 4. チェックリスト管理

### 4.1 チェックリスト取得

**エンドポイント**: `GET /api/residence-cards/:residence_card_id/checklist`

**クエリパラメータ**:
- `category` (string): カテゴリでフィルタ
- `status` (string): ステータスでフィルタ（pending/in_progress/completed）

**レスポンス** (200 OK):
```json
{
  "residence_card_id": "card-123e4567-e89b-12d3",
  "summary": {
    "total_items": 15,
    "completed_items": 5,
    "in_progress_items": 3,
    "pending_items": 7,
    "completion_rate": 33.33
  },
  "items": [
    {
      "id": "item-123e4567",
      "category": "基本書類",
      "item_name": "在留期間更新許可申請書",
      "status": "completed",
      "memo": "2026年2月10日にダウンロード済み",
      "completed_at": "2026-02-10T15:30:00Z",
      "created_at": "2026-02-14T10:00:00Z",
      "updated_at": "2026-02-10T15:30:00Z"
    },
    {
      "id": "item-234e5678",
      "category": "基本書類",
      "item_name": "写真(4cm × 3cm)",
      "status": "in_progress",
      "memo": "証明写真機で撮影予定",
      "completed_at": null,
      "created_at": "2026-02-14T10:00:00Z",
      "updated_at": "2026-02-14T10:00:00Z"
    }
  ],
  "categories": [
    {
      "name": "基本書類",
      "total": 6,
      "completed": 2
    },
    {
      "name": "証明書類",
      "total": 5,
      "completed": 2
    },
    {
      "name": "会社書類",
      "total": 4,
      "completed": 1
    }
  ]
}
```

### 4.2 チェックリスト項目更新

**エンドポイント**: `PUT /api/checklist/items/:item_id`

**リクエスト**:
```json
{
  "status": "completed",
  "memo": "2026年2月14日に取得完了"
}
```

**レスポンス** (200 OK):
```json
{
  "id": "item-123e4567",
  "residence_card_id": "card-123e4567-e89b-12d3",
  "category": "基本書類",
  "item_name": "在留期間更新許可申請書",
  "status": "completed",
  "memo": "2026年2月14日に取得完了",
  "completed_at": "2026-02-14T12:00:00Z",
  "updated_at": "2026-02-14T12:00:00Z"
}
```

### 4.3 カスタム項目追加

**エンドポイント**: `POST /api/residence-cards/:residence_card_id/checklist/items`

**リクエスト**:
```json
{
  "category": "その他",
  "item_name": "行政書士への相談予約",
  "memo": "3月1日 10:00予定"
}
```

**レスポンス** (201 Created):
```json
{
  "id": "item-custom-123",
  "residence_card_id": "card-123e4567-e89b-12d3",
  "template_id": null,
  "category": "その他",
  "item_name": "行政書士への相談予約",
  "status": "pending",
  "memo": "3月1日 10:00予定",
  "created_at": "2026-02-14T12:00:00Z",
  "updated_at": "2026-02-14T12:00:00Z"
}
```

### 4.4 チェックリスト項目削除

**エンドポイント**: `DELETE /api/checklist/items/:item_id`

**レスポンス** (204 No Content)

---

## 5. リマインダー管理

### 5.1 リマインダー設定取得

**エンドポイント**: `GET /api/reminders/settings`

**レスポンス** (200 OK):
```json
{
  "id": "settings-123",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "enabled": true,
  "notify_4months": true,
  "notify_3months": true,
  "notify_1month": true,
  "notify_2weeks": true,
  "notification_time": "10:00:00",
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z"
}
```

### 5.2 リマインダー設定更新

**エンドポイント**: `PUT /api/reminders/settings`

**リクエスト**:
```json
{
  "enabled": true,
  "notify_4months": true,
  "notify_3months": true,
  "notify_1month": false,
  "notify_2weeks": true,
  "notification_time": "09:00:00"
}
```

**レスポンス** (200 OK):
```json
{
  "id": "settings-123",
  "enabled": true,
  "notify_4months": true,
  "notify_3months": true,
  "notify_1month": false,
  "notify_2weeks": true,
  "notification_time": "09:00:00",
  "updated_at": "2026-02-14T12:00:00Z"
}
```

### 5.3 リマインダースケジュール登録

**エンドポイント**: `POST /api/reminders/schedule`

**説明**: 在留カード登録時に自動的にスケジュールされるため、通常は手動呼び出し不要

**リクエスト**:
```json
{
  "residence_card_id": "card-123e4567-e89b-12d3"
}
```

**レスポンス** (201 Created):
```json
{
  "residence_card_id": "card-123e4567-e89b-12d3",
  "scheduled_reminders": [
    {
      "id": "notif-1",
      "type": "4months",
      "scheduled_date": "2027-08-31",
      "status": "scheduled"
    },
    {
      "id": "notif-2",
      "type": "3months",
      "scheduled_date": "2027-09-30",
      "status": "scheduled"
    },
    {
      "id": "notif-3",
      "type": "1month",
      "scheduled_date": "2027-11-30",
      "status": "scheduled"
    },
    {
      "id": "notif-4",
      "type": "2weeks",
      "scheduled_date": "2027-12-17",
      "status": "scheduled"
    }
  ]
}
```

### 5.4 通知履歴取得

**エンドポイント**: `GET /api/reminders/notifications`

**クエリパラメータ**:
- `residence_card_id` (string): 特定のカードの通知のみ取得
- `status` (string): ステータスでフィルタ（scheduled/sent/failed）
- `limit` (integer): 取得件数（デフォルト: 50）

**レスポンス** (200 OK):
```json
{
  "data": [
    {
      "id": "notif-123",
      "residence_card_id": "card-123e4567-e89b-12d3",
      "notification_type": "4months",
      "scheduled_date": "2027-08-31",
      "sent_at": "2027-08-31T10:00:00Z",
      "is_sent": true,
      "status": "sent",
      "created_at": "2026-02-14T10:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 50
  }
}
```

---

## 6. 資格タイプマスタ

### 6.1 資格タイプ一覧取得

**エンドポイント**: `GET /api/residence-types`

**クエリパラメータ**:
- `language` (string): 言語（ja/en、デフォルト: ja）

**レスポンス** (200 OK):
```json
{
  "data": [
    {
      "id": "work_visa",
      "name_ja": "技術・人文知識・国際業務",
      "name_en": "Engineer/Specialist in Humanities/International Services",
      "application_months_before": 4,
      "description": "就労系在留資格",
      "checklist_template_count": 15
    },
    {
      "id": "spouse_japanese",
      "name_ja": "日本人の配偶者等",
      "name_en": "Spouse or Child of Japanese National",
      "application_months_before": 4,
      "description": "配偶者系在留資格",
      "checklist_template_count": 12
    }
  ]
}
```

### 6.2 チェックリストテンプレート取得

**エンドポイント**: `GET /api/residence-types/:id/checklist-template`

**レスポンス** (200 OK):
```json
{
  "residence_type_id": "work_visa",
  "residence_type_name": "技術・人文知識・国際業務",
  "templates": [
    {
      "id": "template-1",
      "category": "基本書類",
      "item_name_ja": "在留期間更新許可申請書",
      "item_name_en": "Application for Extension of Period of Stay",
      "description": "法務省のウェブサイトからダウンロード可能",
      "reference_url": "https://www.moj.go.jp/isa/applications/procedures/...",
      "sort_order": 1
    },
    {
      "id": "template-2",
      "category": "基本書類",
      "item_name_ja": "写真(4cm × 3cm)",
      "item_name_en": "Photo (4cm × 3cm)",
      "description": "申請前3ヶ月以内に撮影したもの",
      "reference_url": null,
      "sort_order": 2
    }
  ]
}
```

---

## 7. 課金・サブスクリプション

### 7.1 課金状態取得

**エンドポイント**: `GET /api/subscription/status`

**レスポンス** (200 OK):
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "is_premium": true,
  "plan": "annual",
  "premium_expires_at": "2027-02-14T10:00:00Z",
  "auto_renew": true,
  "features": {
    "multiple_cards": true,
    "pdf_export": true,
    "csv_export": true,
    "multi_language": true,
    "history_access": true
  }
}
```

### 7.2 課金検証（レシート検証）

**エンドポイント**: `POST /api/subscription/verify`

**リクエスト**:
```json
{
  "platform": "ios",
  "receipt_data": "ewoJInNpZ25hdHVyZSI6ICJBcF...",
  "product_id": "com.visareminder.annual"
}
```

**レスポンス** (200 OK):
```json
{
  "valid": true,
  "product_id": "com.visareminder.annual",
  "purchase_date": "2026-02-14T10:00:00Z",
  "expires_date": "2027-02-14T10:00:00Z",
  "auto_renew_status": true,
  "premium_updated": true
}
```

---

## 8. データ同期

### 8.1 全データ同期

**エンドポイント**: `POST /api/sync`

**リクエスト**:
```json
{
  "last_synced_at": "2026-02-13T10:00:00Z",
  "device_data": {
    "residence_cards": [
      {
        "id": "card-123",
        "updated_at": "2026-02-14T09:00:00Z",
        "data": {...}
      }
    ],
    "checklist_items": [
      {
        "id": "item-123",
        "updated_at": "2026-02-14T08:00:00Z",
        "data": {...}
      }
    ]
  }
}
```

**レスポンス** (200 OK):
```json
{
  "synced_at": "2026-02-14T12:00:00Z",
  "conflicts": [],
  "updated_data": {
    "residence_cards": [
      {
        "id": "card-456",
        "updated_at": "2026-02-14T11:00:00Z",
        "data": {...}
      }
    ],
    "checklist_items": []
  },
  "deleted_ids": {
    "residence_cards": [],
    "checklist_items": ["item-old-123"]
  }
}
```

---

## 9. エラーレスポンス

### 9.1 標準エラーフォーマット

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "人間が読めるエラーメッセージ",
    "details": {
      "field": "問題のあるフィールド名",
      "reason": "詳細な理由"
    },
    "request_id": "req-123e4567-e89b",
    "timestamp": "2026-02-14T12:00:00Z"
  }
}
```

### 9.2 エラーコード一覧

| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | INVALID_REQUEST | リクエストパラメータが不正 |
| 400 | INVALID_EXPIRY_DATE | 有効期限が不正 |
| 400 | INVALID_RESIDENCE_TYPE | 存在しない資格タイプ |
| 401 | UNAUTHORIZED | 認証が必要 |
| 401 | TOKEN_EXPIRED | トークンが期限切れ |
| 403 | FORBIDDEN | 権限不足 |
| 403 | PREMIUM_REQUIRED | 有料機能（プレミアム必須） |
| 404 | NOT_FOUND | リソースが見つからない |
| 409 | CONFLICT | データ競合 |
| 429 | RATE_LIMIT_EXCEEDED | レート制限超過 |
| 500 | INTERNAL_SERVER_ERROR | サーバー内部エラー |
| 503 | SERVICE_UNAVAILABLE | サービス一時停止 |

---

## 10. レート制限

### 10.1 制限値

| ユーザータイプ | リクエスト数/分 | リクエスト数/時 |
|-------------|---------------|---------------|
| 匿名ユーザー | 30 | 300 |
| 認証済みユーザー（無料） | 60 | 1000 |
| プレミアムユーザー | 120 | 3000 |

### 10.2 レート制限ヘッダー

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1708000000
```

**レート制限超過時のレスポンス** (429):
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "レート制限を超過しました。60秒後に再試行してください。",
    "retry_after": 60
  }
}
```

---

## 11. Webhook（将来拡張）

### 11.1 通知イベント

**エンドポイント**: クライアント側で設定するURL

**イベントタイプ**:
- `reminder.scheduled` - リマインダーがスケジュールされた
- `reminder.sent` - 通知が送信された
- `card.expiring_soon` - 有効期限が近い（1ヶ月前）
- `subscription.renewed` - サブスクリプション更新
- `subscription.expired` - サブスクリプション期限切れ

**ペイロード例**:
```json
{
  "event": "reminder.sent",
  "timestamp": "2027-08-31T10:00:00Z",
  "data": {
    "notification_id": "notif-123",
    "residence_card_id": "card-123",
    "notification_type": "4months",
    "user_id": "user-123"
  }
}
```

---

## 12. OpenAPI 3.0 仕様（抜粋）

```yaml
openapi: 3.0.3
info:
  title: 在留資格更新リマインダー API
  version: 1.0.0
  description: 在留資格の有効期限管理とリマインダー機能を提供するAPI

servers:
  - url: https://api.visa-reminder.app/v1
    description: 本番環境
  - url: https://api-dev.visa-reminder.app/v1
    description: 開発環境

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    ResidenceCard:
      type: object
      required:
        - id
        - user_id
        - residence_type_id
        - expiry_date
      properties:
        id:
          type: string
          format: uuid
          example: "card-123e4567-e89b-12d3"
        user_id:
          type: string
          format: uuid
        residence_type_id:
          type: string
          example: "work_visa"
        expiry_date:
          type: string
          format: date
          example: "2027-12-31"
        application_start_date:
          type: string
          format: date
          example: "2027-08-31"
        days_until_expiry:
          type: integer
          example: 695
        is_active:
          type: boolean
          default: true
        memo:
          type: string
          nullable: true
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    ChecklistItem:
      type: object
      required:
        - id
        - residence_card_id
        - item_name
        - category
        - status
      properties:
        id:
          type: string
          format: uuid
        residence_card_id:
          type: string
          format: uuid
        template_id:
          type: string
          format: uuid
          nullable: true
        item_name:
          type: string
          example: "在留期間更新許可申請書"
        category:
          type: string
          example: "基本書類"
        status:
          type: string
          enum: [pending, in_progress, completed]
          default: pending
        memo:
          type: string
          nullable: true
        completed_at:
          type: string
          format: date-time
          nullable: true

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: "INVALID_REQUEST"
        message:
          type: string
          example: "リクエストパラメータが不正です"
        details:
          type: object
        request_id:
          type: string
          format: uuid
        timestamp:
          type: string
          format: date-time

paths:
  /api/residence-cards:
    get:
      summary: 在留資格一覧取得
      security:
        - BearerAuth: []
      parameters:
        - name: is_active
          in: query
          schema:
            type: boolean
            default: true
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/ResidenceCard'
                  meta:
                    type: object
                    properties:
                      total:
                        type: integer
                      page:
                        type: integer
                      per_page:
                        type: integer

    post:
      summary: 在留資格登録
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - residence_type_id
                - expiry_date
              properties:
                residence_type_id:
                  type: string
                expiry_date:
                  type: string
                  format: date
                memo:
                  type: string
      responses:
        '201':
          description: 作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResidenceCard'
        '400':
          description: リクエストエラー
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    $ref: '#/components/schemas/Error'
```

---

## 13. バージョニング戦略

### 13.1 APIバージョン管理

- **URLベース**: `/v1/`, `/v2/` のようにURLにバージョンを含める
- **ヘッダーベース**: `X-API-Version: 1.0` ヘッダーでも指定可能
- **後方互換性**: マイナーバージョンアップでは後方互換性を維持

### 13.2 非推奨化プロセス

1. 新バージョンリリース（例: v2）
2. 旧バージョン（v1）に非推奨警告ヘッダーを追加
   ```http
   Warning: 299 - "API v1 is deprecated. Please migrate to v2."
   X-API-Deprecated: true
   X-API-Sunset: 2027-12-31
   ```
3. 6ヶ月の移行期間
4. 旧バージョンのサポート終了

---

## 14. セキュリティ考慮事項

### 14.1 セキュリティヘッダー

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### 14.2 データ検証

- すべての入力データのバリデーション
- SQLインジェクション対策（プリペアドステートメント）
- XSS対策（出力時のエスケープ）
- CSRF対策（トークンベース）

---

## 15. テストデータ

### 15.1 サンプルユーザー（開発環境のみ）

```json
{
  "user_id": "test-user-001",
  "device_id": "test-device-001",
  "access_token": "test-token-001"
}
```

### 15.2 テスト用在留資格

```json
{
  "id": "test-card-001",
  "residence_type_id": "work_visa",
  "expiry_date": "2027-12-31"
}
```

---

## 16. 改訂履歴

| 版 | 日付 | 変更内容 |
|----|------|----------|
| 1.0 | 2026-02-14 | 初版作成 |

---

**レビュー承認**: _______________
**次回レビュー予定**: 2026-03-14
