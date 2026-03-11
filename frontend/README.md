# 在留資格更新リマインダー - フロントエンド

React Native + Expo + TypeScript で構築された在留資格更新リマインダーアプリケーションです。

## 実装完了

### 画面（全6画面）
- ✅ HomeScreen - ホーム画面
- ✅ RegisterScreen - 在留カード登録画面
- ✅ EditScreen - 在留カード編集画面
- ✅ ChecklistScreen - チェックリスト画面
- ✅ ReminderSettingsScreen - リマインダー設定画面
- ✅ SettingsScreen - 設定画面

### 技術スタック
- React Native 0.81.5
- Expo ^54.0.33
- TypeScript ^5.3.3
- React Navigation ^6.1.9
- Zustand ^4.5.0
- date-fns ^3.3.0
- AsyncStorage 2.2.0
- Expo Notifications ~0.32.16

## セットアップ

```bash
# 依存関係のインストール
npm install

# アプリの起動
npm start

# iOS
npm run ios

# Android
npm run android
```

## プロジェクト構造

```
src/
├── screens/          # 画面コンポーネント
├── navigation/       # ナビゲーション設定
├── types/           # 型定義
├── theme/           # テーマ設定
├── store/           # Zustand状態管理
├── services/        # サービス層
├── components/      # 共通コンポーネント
└── utils/           # ユーティリティ
```

## デザイン

デザインファイルは `design/` ディレクトリにあります：
- 01-home.html
- 02-register.html
- 03-reminder.html
- 04-checklist.html
- 05-settings.html

## 詳細ドキュメント

- `SCREENS_IMPLEMENTATION.md` - 画面実装の詳細
- `NOTIFICATION_IMPLEMENTATION.md` - 通知機能の実装
- `technology-selection.md` - 技術選定
- `frontend-architecture.md` - アーキテクチャ設計
