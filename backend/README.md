# 在留資格更新リマインダー バックエンド設計

## 概要

本ディレクトリには、在留資格更新リマインダーアプリのバックエンド設計書と実装サンプルが含まれています。

## ドキュメント構成

### 設計書

1. **[database-design.md](./database-design.md)**
   - データベース設計書
   - ER図、テーブル定義、インデックス設計
   - SQLite と PostgreSQL の DDL
   - データ暗号化設計

2. **[api-specification.md](./api-specification.md)**
   - API仕様書
   - RESTful API エンドポイント定義
   - リクエスト/レスポンス例
   - OpenAPI 3.0 仕様（抜粋）

3. **[notification-system.md](./notification-system.md)**
   - 通知システム設計書
   - FCM/APNs 統合方法
   - 通知スケジューリングロジック
   - Node.js と Python のサンプルコード

4. **[security-design.md](./security-design.md)**
   - セキュリティ設計書
   - データ暗号化方式（AES-256-GCM）
   - 認証・認可設計（JWT）
   - 脆弱性対策（SQL インジェクション、XSS、CSRF等）
   - プライバシー保護

## サンプル実装

### DDL（データベーススキーマ）

- **[sample-implementation/ddl/sqlite-schema.sql](./sample-implementation/ddl/sqlite-schema.sql)**
  - SQLite用のスキーマ定義
  - マスタデータ初期投入
  - サンプルデータ
  - 便利なビュー

- **[sample-implementation/ddl/postgresql-schema.sql](./sample-implementation/ddl/postgresql-schema.sql)**
  - PostgreSQL用のスキーマ定義
  - トリガー、関数の定義
  - パーティショニング例

### APIサーバー（Node.js + Express）

```
sample-implementation/api-server/
├── server.js                # メインサーバーファイル
├── package.json             # 依存関係
├── .env.example             # 環境変数サンプル
├── routes/                  # APIルート
│   ├── auth.js             # 認証API
│   ├── residence-cards.js  # 在留カード管理API
│   ├── checklist.js        # チェックリストAPI
│   ├── reminders.js        # リマインダーAPI
│   ├── residence-types.js  # 資格タイプマスタAPI
│   └── devices.js          # デバイストークン管理API
├── middleware/             # ミドルウェア
│   └── auth.js            # 認証・認可ミドルウェア
└── utils/                 # ユーティリティ
    ├── logger.js          # ロガー（Winston）
    └── encryption.js      # 暗号化ユーティリティ
```

## セットアップ手順

### 1. データベースのセットアップ

#### SQLite（ローカル開発）

```bash
# SQLite データベース作成
sqlite3 database.sqlite < sample-implementation/ddl/sqlite-schema.sql
```

#### PostgreSQL（本番環境）

```bash
# PostgreSQL にログイン
psql -U postgres

# データベース作成
CREATE DATABASE visa_reminder;

# スキーマ投入
\i sample-implementation/ddl/postgresql-schema.sql
```

### 2. APIサーバーのセットアップ

```bash
cd sample-implementation/api-server

# 依存関係のインストール
npm install

# 環境変数設定
cp .env.example .env
# .env ファイルを編集して設定

# 暗号化キー生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 生成されたキーを .env の ENCRYPTION_KEY に設定

# JWT シークレット生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# 生成されたキーを .env の JWT_SECRET に設定

# サーバー起動
npm start

# または開発モード（ホットリロード）
npm run dev
```

### 3. 通知システムのセットアップ

詳細は [notification-system.md](./notification-system.md) を参照。

#### Firebase プロジェクト設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
2. iOS/Android アプリを追加
3. サービスアカウントキー（JSON）をダウンロード
4. `.env` に設定または `FIREBASE_SERVICE_ACCOUNT_PATH` を指定

## 技術スタック

### データベース

- **ローカル**: SQLite 3.x
- **クラウド**: PostgreSQL 14+

### APIサーバー

- **ランタイム**: Node.js 18+
- **フレームワーク**: Express 4.x
- **認証**: JWT (jsonwebtoken)
- **バリデーション**: express-validator
- **セキュリティ**: helmet, cors, express-rate-limit
- **ログ**: winston
- **暗号化**: crypto (Node.js 組み込み)

### 通知サービス

- **iOS**: Apple Push Notification service (APNs)
- **Android**: Firebase Cloud Messaging (FCM)
- **SDK**: firebase-admin

## セキュリティ考慮事項

### 環境変数の管理

**重要**: `.env` ファイルは絶対に Git にコミットしないでください！

```bash
# .gitignore に追加
echo ".env" >> .gitignore
echo "*.log" >> .gitignore
echo "node_modules/" >> .gitignore
```

### 暗号化キーの生成

```bash
# 暗号化キー（32バイト = 64文字のHEX）
openssl rand -hex 32

# JWT シークレット（64バイト推奨）
openssl rand -hex 64
```

### データ暗号化

- **対象フィールド**: `residence_cards.memo`, `checklist_items.memo`
- **方式**: AES-256-GCM
- **実装**: `utils/encryption.js` を参照

### 個人情報の取り扱い

**保存しないデータ**（要件定義書より）:
- 在留カード番号
- 氏名
- 生年月日
- 住所

**保存するデータ**:
- 有効期限（必須）
- 資格タイプ（必須）
- メモ（暗号化、任意）

## API エンドポイント一覧

### 認証

- `POST /auth/device/register` - デバイス登録
- `POST /auth/token/refresh` - トークン更新

### 在留カード管理

- `GET /api/residence-cards` - 一覧取得
- `POST /api/residence-cards` - 新規登録
- `GET /api/residence-cards/:id` - 詳細取得
- `PUT /api/residence-cards/:id` - 更新
- `DELETE /api/residence-cards/:id` - 削除（論理削除）

### チェックリスト

- `GET /api/residence-cards/:residence_card_id/checklist` - 取得
- `PUT /api/checklist/items/:item_id` - 項目更新
- `POST /api/residence-cards/:residence_card_id/checklist/items` - カスタム項目追加

### リマインダー

- `GET /api/reminders/settings` - 設定取得
- `PUT /api/reminders/settings` - 設定更新
- `POST /api/reminders/schedule` - スケジュール登録
- `GET /api/reminders/notifications` - 通知履歴取得

### マスタデータ

- `GET /api/residence-types` - 資格タイプ一覧
- `GET /api/residence-types/:id/checklist-template` - チェックリストテンプレート取得

詳細は [api-specification.md](./api-specification.md) を参照。

## テスト

```bash
# ユニットテスト実行
npm test

# カバレッジ付きテスト
npm test -- --coverage

# 特定のテストファイルのみ実行
npm test -- routes/residence-cards.test.js
```

## デプロイ

### Docker を使用したデプロイ（例）

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```bash
# ビルド
docker build -t visa-reminder-api .

# 実行
docker run -p 3000:3000 --env-file .env visa-reminder-api
```

### クラウドデプロイ例

- **AWS**: Elastic Beanstalk, ECS, Lambda
- **GCP**: App Engine, Cloud Run
- **Azure**: App Service

## モニタリング

### ログファイル

- `logs/error.log` - エラーログ
- `logs/combined.log` - 全ログ

### ログレベル

- `error` - エラーのみ
- `warn` - 警告以上
- `info` - 情報以上（デフォルト）
- `debug` - デバッグ情報含む

環境変数 `LOG_LEVEL` で設定可能。

## パフォーマンス最適化

### データベースインデックス

- `residence_cards(user_id, is_active)`
- `residence_cards(expiry_date)`
- `notification_logs(scheduled_date, is_sent)`

詳細は [database-design.md](./database-design.md) を参照。

### レート制限

- 認証済みユーザー: 60リクエスト/分
- 匿名ユーザー: 30リクエスト/分

## トラブルシューティング

### よくある問題

#### 1. "ENCRYPTION_KEY is not set"

**原因**: 環境変数 `ENCRYPTION_KEY` が設定されていない

**解決策**:
```bash
# 暗号化キーを生成
openssl rand -hex 32

# .env ファイルに追加
echo "ENCRYPTION_KEY=生成されたキー" >> .env
```

#### 2. "JWT_SECRET is not defined"

**原因**: JWT シークレットが設定されていない

**解決策**:
```bash
# シークレットを生成
openssl rand -hex 64

# .env ファイルに追加
echo "JWT_SECRET=生成されたシークレット" >> .env
```

#### 3. データベース接続エラー

**原因**: データベース設定が間違っている

**解決策**: `.env` ファイルの `DB_*` 設定を確認

## ライセンス

MIT License

## サポート

質問や問題がある場合は、以下までお問い合わせください:
- Email: support@visa-reminder.app
- GitHub Issues: (リポジトリURL)

## 参考資料

- [要件定義書](../要件定義書.md)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**作成日**: 2026年2月14日
**バージョン**: 1.0
**最終更新**: 2026年2月14日
