# Claude Code用プロジェクト設定

このファイルはClaude Codeがプロジェクトのコンテキストを理解するための設定ファイルです。

---

## プロジェクト概要

**プロジェクト名**: 在留資格更新リマインダー＋手続きガイド アプリ

**目的**: 在留資格（ビザ）の有効期限更新を忘れずに行えるよう、期限リマインダーと資格別の必要書類・手続きチェックリストを提供する個人向けモバイルアプリ

**技術スタック**:
- フロントエンド: React Native + Expo + TypeScript
- 状態管理: Zustand
- ストレージ: AsyncStorage（ローカル）
- 通知: Expo Notifications
- バックエンド（将来）: Node.js + Express + PostgreSQL

---

## プロジェクト構成

```
visa-reminder-app/
├── docs/                       # ドキュメント
│   ├── 次のタスク.md          # 📌 次にやるべきタスク一覧（常に参照）
│   ├── 実装タスク一覧.md      # 詳細タスク分解
│   ├── デザイン仕様.md        # UI/UXデザイン仕様
│   ├── API設計書.md           # API仕様
│   ├── DB設計書.md            # データベース設計
│   └── 共通データ契約.md      # データ型定義
│
├── design/                     # デザインモック（HTML/CSS）
│   ├── 01-home.html           # ホーム画面
│   ├── 02-register.html       # 登録画面
│   ├── 03-reminder.html       # リマインダー設定
│   ├── 04-checklist.html      # チェックリスト
│   └── 05-settings.html       # 設定画面
│
├── frontend/                   # React Nativeアプリ
│   ├── src/
│   │   ├── screens/           # 画面コンポーネント
│   │   ├── components/        # UIコンポーネント
│   │   ├── store/             # Zustand状態管理
│   │   ├── services/          # サービス層（通知、ストレージ等）
│   │   ├── types/             # TypeScript型定義
│   │   ├── theme/             # デザインシステム
│   │   └── utils/             # ユーティリティ関数
│   └── IMPLEMENTATION_SUMMARY.md  # 実装サマリー
│
└── backend/                    # バックエンド設計（将来実装）
    ├── api-specification.md
    ├── database-design.md
    └── security-design.md
```

---

## 開発ワークフロー

### 1. タスク確認
```bash
# 次にやるべきタスクを確認
cat docs/次のタスク.md
```

### 2. チーム開発を活用
複数の専門家を並行起動して効率的に開発：
```
/team-lead [タスク内容]
```

例：
- デザイン + フロントエンド実装を並行実行
- セキュリティレビュー + コード品質レビューを並行実行

### 3. QAテスト
実装完了後、必ずテストを実施：
```
/qa-test-engineer
```

### 4. タスク更新
完了したタスクは `docs/次のタスク.md` にチェックを入れる

### 5. 作業スタイル
**重要**: 実装タスクは確認なしで直接実行する

- ✅ コード実装、ファイル作成・修正は即座に実行
- ✅ タスクを受け取ったら確認を求めずに開始
- ✅ 複数ファイルの同時編集も自動的に進める
- ❌ 「実装してもよろしいですか？」などの確認は不要

**例外（確認が必要な場合）**:
- ファイル削除など破壊的な操作
- 既存の実装を大幅に変更する場合
- 複数の実装方針があり判断が必要な場合

---

## 重要な設計原則

### セキュリティ
- ❌ **個人情報は保存しない**（氏名、在留カード番号等）
- ✅ メモフィールドは暗号化する（実装必須）
- ✅ AsyncStorageのデータは暗号化キーをSecure Storageに保存
- ✅ 生体認証の実装を推奨

### アクセシビリティ
- ✅ WCAG AA基準を遵守
- ✅ 最小タップ領域: 44×44px（iOS）、48×48px（Android）
- ✅ すべてのボタンに `accessibilityLabel` を追加
- ✅ スクリーンリーダー対応

### パフォーマンス
- ✅ `React.memo` で不要な再レンダリング防止
- ✅ `useCallback` / `useMemo` で関数・計算をメモ化
- ✅ FlatListで長いリストを仮想化

### コード品質
- ✅ TypeScript厳格モード有効
- ✅ ESLint + Prettierで自動チェック
- ✅ `as never`, `@ts-ignore` の使用を避ける
- ✅ 型安全性を最優先

---

## 現在の進捗状況

### ✅ 完了
- デザインシステム構築（全5画面）
- フロントエンド基盤実装
- バックエンド設計
- HomeScreen実装
- RegisterScreen実装

### 🔥 次にやること（最優先）
**参照**: `docs/次のタスク.md` の「最優先タスク」セクション

1. **セキュリティ改善（必須）**
   - メモフィールドの暗号化実装
   - 暗号化キーのSecure Storage保存
   - メモの文字数制限追加

2. **残りの画面実装**
   - EditScreen（編集画面）
   - ChecklistScreen（チェックリスト画面）
   - ReminderSettingsScreen（リマインダー設定）
   - SettingsScreen（設定画面）

3. **React Navigation統合**
   - 画面遷移の実装

---

## よく使うコマンド

### フロントエンド開発
```bash
cd frontend
npm install              # 依存関係インストール
npm start                # 開発サーバー起動
npm run ios              # iOSシミュレーター起動
npm run android          # Androidエミュレーター起動
npm run web              # Web版起動
```

### コード品質
```bash
npm run lint             # ESLintチェック
npm run type-check       # TypeScriptチェック
npm test                 # テスト実行
```

---

## Claude Codeへの指示

### タスク開始時
1. まず `docs/次のタスク.md` を確認
2. 最優先タスクから着手
3. チーム開発が効率的な場合は `/team-lead` を使用

### 実装時の注意点
- デザイン仕様（`design/*.html`）に厳密に従う
- 既存の `theme/` を必ず使用
- 型定義（`types/`）を確認して型安全に実装
- セキュリティレビュー結果を考慮

### デグレ防止（重要）
修正時は必ず以下を意識すること：
- ❌ 1箇所を直して別の箇所を壊さない
- ✅ 修正前に関連ファイルをすべて読んで影響範囲を把握してから着手
- ✅ テストが存在する場合は修正後に整合性を確認
- ✅ Web版とネイティブ版（iOS/Android）の両方への影響を確認
- ✅ 個別コンポーネントのスタイル修正より、親コンテナでの制御を優先する（例：フィールド幅はコンテナのmaxWidthで制御）

### レビュー実施
- 実装完了後は必ず `/team-lead` でレビュー実施
- セキュリティ、コード品質、アクセシビリティの3方向から確認

### テスト実施
- 画面実装後は `/qa-test-engineer` でテスト
- バグがあれば即座に修正

### タスク完了後
- `docs/次のタスク.md` を更新（チェックマークを付ける）
- 次の優先タスクに進む

---

## トラブルシューティング

### よくある問題

**問題**: TypeScriptエラー「Type 'X' is not assignable to type 'Y'」
- 解決: `types/index.ts` の型定義を確認し、正しい型を使用

**問題**: 画面遷移が動作しない
- 解決: `types/navigation.ts` を確認し、ナビゲーション型が正しく定義されているか確認

**問題**: AsyncStorageのデータが保存されない
- 解決: `useResidenceStore.ts` の STORAGE_KEYS が正しいか確認

**問題**: デザインが仕様と異なる
- 解決: `theme/` の値を使用しているか確認、`design/*.html` と比較

---

## リソース

### ドキュメント
- [次のタスク一覧](docs/次のタスク.md) ← **最も重要**
- [実装タスク一覧](docs/実装タスク一覧.md)
- [フロントエンド実装総括](frontend/IMPLEMENTATION_SUMMARY.md)
- [チーム開発レポート](TEAM_DEVELOPMENT_REPORT.md)

### デザイン
- [デザインシステム](design/design-system.md)
- [デザイン仕様](docs/デザイン仕様.md)
- [UIモックアップ](design/) - HTML/CSSで実装済み

### 設計
- [API設計書](backend/api-specification.md)
- [DB設計書](backend/database-design.md)
- [セキュリティ設計](backend/security-design.md)

---

**最終更新**: 2026-02-16
**プロジェクトステータス**: MVP開発中（RegisterScreen実装完了）
