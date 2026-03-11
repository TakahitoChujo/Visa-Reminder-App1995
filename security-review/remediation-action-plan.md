# 🔧 セキュリティ脆弱性 修正アクションプラン

## 📅 修正スケジュール

**目標リリース日**: TBD
**修正開始日**: 2026-02-15
**推奨完了期限**: 4週間以内

---

## Week 1: Critical 脆弱性の修正（優先度：最高）

### ✅ タスク 1: 暗号化キーの永続化 (2-3日)

**担当**: フロントエンド開発者
**影響範囲**: `frontend/src/services/database/EncryptionService.ts`

#### 実施内容
1. `expo-secure-store` をインストール
   ```bash
   cd frontend
   npm install expo-secure-store@~13.0.1
   ```

2. EncryptionService.ts を修正
   ```typescript
   import * as SecureStore from 'expo-secure-store';

   const ENCRYPTION_KEY_STORE = 'visa_reminder_encryption_key';

   public async initialize(): Promise<void> {
     let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORE);

     if (!key) {
       key = await this.generateKey();
       await SecureStore.setItemAsync(ENCRYPTION_KEY_STORE, key);
     }

     this.encryptionKey = key;
   }
   ```

3. `getEncryptionKey()` メソッドを削除

4. テストケースを作成
   - アプリ再起動後もデータが復号化できることを確認
   - キーの永続化を確認

**完了条件**:
- [ ] expo-secure-store がインストールされている
- [ ] 暗号化キーが SecureStore に保存される
- [ ] アプリ再起動後も同じキーが使用される
- [ ] getEncryptionKey() が削除されている
- [ ] テストが通過する

---

### ✅ タスク 2: AES-256-GCM 暗号化への移行 (3-4日)

**担当**: フロントエンド開発者
**影響範囲**: `frontend/src/services/database/EncryptionService.ts`

#### 実施内容
1. `react-native-aes-crypto` をインストール
   ```bash
   npm install react-native-aes-crypto@^2.1.1
   ```

2. XOR暗号を AES-256-GCM に置き換え
   - `encrypt()` メソッドを書き換え
   - `decrypt()` メソッドを書き換え

3. 既存データの移行処理を実装
   ```typescript
   async migrateFromXorToAes(): Promise<void> {
     // 既存の XOR 暗号化データを復号化
     // AES-256-GCM で再暗号化
   }
   ```

4. 統合テスト実施
   - 暗号化/復号化の正常動作確認
   - パフォーマンステスト

**完了条件**:
- [ ] react-native-aes-crypto がインストールされている
- [ ] AES-256-GCM で暗号化される
- [ ] 既存データの移行処理が動作する
- [ ] 暗号化/復号化テストが通過する

---

### ✅ タスク 3: JWT_SECRET バリデーション実装 (1日)

**担当**: バックエンド開発者
**影響範囲**: `backend/sample-implementation/api-server/middleware/auth.js`

#### 実施内容
1. 環境変数検証モジュールを作成
   ```javascript
   // utils/config-validator.js
   function validateEnvironment() {
     const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];

     for (const key of required) {
       if (!process.env[key]) {
         throw new Error(`${key} is not set`);
       }
       if (process.env[key].length < 32) {
         throw new Error(`${key} must be at least 32 characters`);
       }
     }
   }
   ```

2. server.js の起動時に検証を実行

3. .env.example を更新

**完了条件**:
- [ ] 環境変数が未設定の場合、起動時にエラーが発生する
- [ ] キーの長さが不十分な場合、エラーが発生する
- [ ] .env.example に警告コメントが追加されている

---

### ✅ タスク 4: CORS設定の厳格化 (1日)

**担当**: バックエンド開発者
**影響範囲**: `backend/sample-implementation/api-server/server.js`

#### 実施内容
1. CORS設定を修正
   ```javascript
   const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean);

   if (!allowedOrigins?.length && process.env.NODE_ENV === 'production') {
     throw new Error('ALLOWED_ORIGINS must be set in production');
   }

   app.use(cors({
     origin: (origin, callback) => {
       if (!origin || allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new Error('Not allowed by CORS'));
       }
     },
     credentials: true,
   }));
   ```

2. テストケースを作成
   - 許可されたオリジンからのリクエストは成功
   - 許可されていないオリジンは拒否

**完了条件**:
- [ ] ワイルドカード (`*`) が削除されている
- [ ] 本番環境で ALLOWED_ORIGINS が必須になっている
- [ ] CORS テストが通過する

---

### ✅ タスク 5: トークンリフレッシュの async/await 化 (1日)

**担当**: バックエンド開発者
**影響範囲**: `backend/sample-implementation/api-server/routes/auth.js`

#### 実施内容
1. コールバック地獄を解消
   ```javascript
   router.post('/token/refresh', async (req, res) => {
     try {
       const user = jwt.verify(refresh_token, JWT_REFRESH_SECRET);
       const accessToken = jwt.sign(/* ... */);
       return res.json({ access_token: accessToken });
     } catch (err) {
       return res.status(403).json({ error: /* ... */ });
     }
   });
   ```

2. 二重レスポンス送信のテスト

**完了条件**:
- [ ] コールバックが削除されている
- [ ] async/await を使用している
- [ ] 二重レスポンステストが通過する

---

### ✅ タスク 6: データベース接続モジュールの実装 (2日)

**担当**: バックエンド開発者
**影響範囲**: `backend/sample-implementation/api-server/utils/database.js` (新規作成)

#### 実施内容
1. PostgreSQL接続プールを実装
2. パラメータ化クエリを強制
3. エラーハンドリング
4. 接続テスト

**完了条件**:
- [ ] database.js が作成されている
- [ ] プレースホルダーが強制されている
- [ ] 接続プールが動作する
- [ ] ユニットテストが通過する

---

## Week 2: High 脆弱性の修正

### ✅ タスク 7: AsyncStorage → SecureStore 移行 (2-3日)

**担当**: フロントエンド開発者
**影響範囲**: 全ストレージ利用箇所

#### 実施内容
1. 機密情報を特定
   - ユーザーID
   - 認証トークン
   - 暗号化キー
   - その他の個人情報

2. SecureStore への移行処理を実装
   ```typescript
   async function migrateToSecureStore() {
     const sensitiveKeys = ['user_id', 'auth_token', 'encryption_key'];

     for (const key of sensitiveKeys) {
       const value = await AsyncStorage.getItem(key);
       if (value) {
         await SecureStore.setItemAsync(key, value);
         await AsyncStorage.removeItem(key);
       }
     }
   }
   ```

3. 全ての参照を更新

**完了条件**:
- [ ] 機密情報が SecureStore に保存される
- [ ] AsyncStorage から機密情報が削除される
- [ ] 移行処理が完了する
- [ ] 統合テストが通過する

---

### ✅ タスク 8: プッシュ通知メッセージの見直し (1日)

**担当**: フロントエンド開発者 + UX/UIデザイナー
**影響範囲**: `frontend/src/services/notificationService.ts`

#### 実施内容
1. 通知メッセージのプライバシーレビュー
2. 設定画面に「詳細表示」オプションを追加
3. デフォルトはプライバシー重視モード

**通知メッセージ例**:
```typescript
// プライバシー重視（デフォルト）
"在留カード更新のリマインダー"

// 詳細表示（ユーザーが有効化した場合のみ）
"在留資格の更新申請期間です（残り30日）"
```

**完了条件**:
- [ ] プッシュ通知から在留資格タイプが削除されている
- [ ] 設定画面が実装されている
- [ ] デフォルトがプライバシー重視になっている

---

### ✅ タスク 9: 認証エンドポイントのレート制限 (1日)

**担当**: バックエンド開発者
**影響範囲**: `backend/sample-implementation/api-server/server.js`

#### 実施内容
1. 認証用レート制限を追加
   ```javascript
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5,
     message: { error: { code: 'TOO_MANY_ATTEMPTS' } }
   });

   app.use('/auth/', authLimiter);
   ```

2. ブルートフォーステストを実施

**完了条件**:
- [ ] /auth/ にレート制限が適用されている
- [ ] 制限超過時に適切なエラーが返る
- [ ] テストが通過する

---

### ✅ タスク 10: エラーハンドリングの改善 (1日)

**担当**: バックエンド開発者
**影響範囲**: `backend/sample-implementation/api-server/server.js`

#### 実施内容
1. NODE_ENV のデフォルト値を設定
2. 本番環境では詳細なエラーを隠す
3. エラーログを充実化

**完了条件**:
- [ ] 本番環境でスタックトレースが非表示
- [ ] エラーがログに記録される
- [ ] テストが通過する

---

### ✅ タスク 11: ログ出力時の機密情報マスキング (1日)

**担当**: バックエンド開発者
**影響範囲**: `backend/sample-implementation/api-server/utils/logger.js`

#### 実施内容
1. 機密情報フィルタを実装
2. Winston のカスタムフォーマッタを作成
3. ログレビューを実施

**完了条件**:
- [ ] パスワード、トークン等がマスクされる
- [ ] ログサンプルをレビューして確認
- [ ] テストが通過する

---

## Week 3: Medium/Low 脆弱性の修正

### ✅ タスク 12: データベースバージョン管理の改善 (半日)

**担当**: フロントエンド開発者
**影響範囲**: `frontend/src/services/database/DatabaseService.ts`

#### 実施内容
1. バージョン番号の型チェックを追加
2. SQLインジェクション対策を強化

**完了条件**:
- [ ] 型チェックが実装されている
- [ ] テストが通過する

---

### ✅ タスク 13: プッシュ通知トークン管理の実装 (1日)

**担当**: バックエンド開発者
**影響範囲**: `backend/sample-implementation/api-server/routes/devices.js`

#### 実施内容
1. デバイストークン登録エンドポイントを実装
2. トークンのバリデーション
3. 重複管理、期限切れチェック

**完了条件**:
- [ ] エンドポイントが実装されている
- [ ] トークンが正しく保存される
- [ ] テストが通過する

---

### ✅ タスク 14: 環境変数サンプルの更新 (半日)

**担当**: DevOps/バックエンド開発者
**影響範囲**: `.env.example`

#### 実施内容
1. 脆弱なキー例を削除
2. 警告コメントを追加
3. キー生成コマンドを記載

**完了条件**:
- [ ] .env.example が更新されている
- [ ] 警告コメントが追加されている

---

## Week 4: テスト・レビュー・ドキュメント整備

### ✅ タスク 15: セキュリティテストの実施 (2-3日)

**担当**: QAエンジニア + セキュリティエンジニア

#### テスト項目
1. **認証・認可テスト**
   - [ ] 不正なトークンでアクセスできないことを確認
   - [ ] レート制限が動作することを確認
   - [ ] CORS設定が正しいことを確認

2. **暗号化テスト**
   - [ ] データが正しく暗号化/復号化されることを確認
   - [ ] アプリ再起動後もデータが復号化できることを確認

3. **入力バリデーションテスト**
   - [ ] SQLインジェクション攻撃を試行
   - [ ] XSS攻撃を試行
   - [ ] CSRF攻撃を試行

4. **プライバシーテスト**
   - [ ] 通知にプライバシー情報が含まれていないことを確認
   - [ ] ログに機密情報が含まれていないことを確認

---

### ✅ タスク 16: ペネトレーションテスト (2日)

**担当**: 外部セキュリティ専門家（推奨）

#### テスト内容
- [ ] OWASP Top 10 に基づいた脆弱性診断
- [ ] APIエンドポイントのセキュリティテスト
- [ ] 認証バイパステスト
- [ ] 権限昇格テスト

---

### ✅ タスク 17: ドキュメント整備 (1日)

**担当**: テックリード

#### 作成ドキュメント
1. **セキュリティガイドライン**
   - [ ] 開発者向けセキュアコーディング規約
   - [ ] 環境変数管理ガイドライン
   - [ ] デプロイメントチェックリスト

2. **運用ドキュメント**
   - [ ] インシデント対応手順
   - [ ] セキュリティアップデート手順
   - [ ] ログ監視手順

---

### ✅ タスク 18: 依存関係の脆弱性チェック (半日)

**担当**: DevOps

#### 実施内容
```bash
# バックエンド
cd backend/sample-implementation/api-server
npm install
npm audit
npm audit fix

# フロントエンド
cd frontend
npm install
npm audit
npm audit fix --force
```

**完了条件**:
- [ ] Critical/High の脆弱性が解消されている
- [ ] package-lock.json が更新されている

---

### ✅ タスク 19: 最終セキュリティレビュー (1日)

**担当**: セキュリティエンジニア + テックリード

#### レビュー項目
- [ ] すべての Critical 脆弱性が修正されている
- [ ] すべての High 脆弱性が修正されている
- [ ] テストがすべて通過している
- [ ] ドキュメントが整備されている
- [ ] デプロイメントチェックリストが完成している

---

## 📊 進捗管理

### チェックリスト

#### Week 1: Critical 修正 (必須)
- [ ] タスク1: 暗号化キーの永続化
- [ ] タスク2: AES-256-GCM 暗号化
- [ ] タスク3: JWT_SECRET バリデーション
- [ ] タスク4: CORS設定の厳格化
- [ ] タスク5: トークンリフレッシュ修正
- [ ] タスク6: データベース接続実装

#### Week 2: High 修正 (必須)
- [ ] タスク7: SecureStore 移行
- [ ] タスク8: 通知メッセージ見直し
- [ ] タスク9: レート制限追加
- [ ] タスク10: エラーハンドリング改善
- [ ] タスク11: ログマスキング実装

#### Week 3: Medium/Low 修正 (推奨)
- [ ] タスク12: DB バージョン管理改善
- [ ] タスク13: 通知トークン管理
- [ ] タスク14: .env.example 更新

#### Week 4: テスト・レビュー (必須)
- [ ] タスク15: セキュリティテスト
- [ ] タスク16: ペネトレーションテスト
- [ ] タスク17: ドキュメント整備
- [ ] タスク18: 依存関係チェック
- [ ] タスク19: 最終レビュー

---

## 🚨 ブロッカー・リスク管理

### 想定されるブロッカー
1. **react-native-aes-crypto のビルドエラー**
   - 対策: 公式ドキュメント確認、代替ライブラリ検討

2. **既存データの移行失敗**
   - 対策: ロールバック手順を準備、段階的移行

3. **パフォーマンス低下**
   - 対策: 暗号化処理の非同期化、キャッシング

---

## 📞 サポート・エスカレーション

### 技術的な問題が発生した場合
- **担当者**: テックリード
- **エスカレーション先**: CTOまたはセキュリティチーム

### スケジュール遅延の場合
- **1週間遅延**: ステークホルダーに報告
- **2週間遅延**: リリース日の再調整

---

**作成日**: 2026-02-15
**最終更新**: 2026-02-15
**次回レビュー**: 週次
