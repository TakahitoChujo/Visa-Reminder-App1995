# フロントエンドセットアップガイド：在留資格更新リマインダー

**バージョン**: 1.0
**作成日**: 2026-02-14
**対象**: React Native + Expo プロジェクト

---

## 1. 前提条件

### 1.1 必要な環境

| ツール | 最小バージョン | 推奨バージョン | 確認コマンド |
|--------|---------------|---------------|-------------|
| **Node.js** | 18.x | 20.x LTS | `node --version` |
| **npm** | 9.x | 10.x | `npm --version` |
| **Git** | 2.x | 最新版 | `git --version` |
| **Expo CLI** | - | 最新版 | `npx expo --version` |

### 1.2 開発環境（オプション）

- **iOS開発**: macOS + Xcode 14以上
- **Android開発**: Android Studio + Android SDK (API 31以上)
- **エディタ**: VS Code推奨（TypeScript拡張機能）

---

## 2. プロジェクトのセットアップ

### 2.1 リポジトリのクローン

```bash
# GitHubからクローン（実際のURLに置き換えてください）
git clone https://github.com/your-org/residence-reminder.git
cd residence-reminder/frontend/src
```

### 2.2 依存関係のインストール

```bash
# npm を使用する場合
npm install

# または yarn を使用する場合
yarn install
```

インストール時間: 約3〜5分（ネットワーク環境による）

### 2.3 Expo設定

```bash
# Expo CLIのインストール（グローバル）
npm install -g expo-cli

# または npx 経由で使用（推奨）
npx expo --version
```

---

## 3. 開発サーバーの起動

### 3.1 基本起動

```bash
# 開発サーバー起動
npm start

# または
npx expo start
```

起動後、ターミナルにQRコードが表示されます。

### 3.2 プラットフォーム別起動

```bash
# iOS シミュレーター（macOSのみ）
npm run ios

# Android エミュレーター
npm run android

# Webブラウザ
npm run web
```

### 3.3 実機での動作確認

1. **iOS**: App Storeから「Expo Go」アプリをインストール
2. **Android**: Google Playから「Expo Go」アプリをインストール
3. ターミナルのQRコードをスキャン
4. アプリが自動で読み込まれます

---

## 4. ディレクトリ構成の確認

```
frontend/src/
├── App.tsx                      # エントリーポイント
├── app.json                     # Expo設定
├── package.json                 # 依存関係
├── tsconfig.json                # TypeScript設定
│
├── src/
│   ├── components/              # UIコンポーネント
│   │   ├── atoms/               # Button, Input等
│   │   ├── molecules/           # ChecklistItem等
│   │   ├── organisms/           # ResidenceCard等
│   │   └── templates/           # レイアウト
│   │
│   ├── screens/                 # 画面コンポーネント
│   │   ├── HomeScreen.tsx
│   │   ├── RegisterScreen.tsx（未実装）
│   │   └── ChecklistScreen.tsx（未実装）
│   │
│   ├── navigation/              # ナビゲーション（未実装）
│   │
│   ├── store/                   # Zustand ストア
│   │   └── residenceStore.ts
│   │
│   ├── services/                # サービス層
│   │   ├── storage.ts           # AsyncStorage
│   │   └── notification.ts      # プッシュ通知
│   │
│   ├── utils/                   # ユーティリティ
│   │   ├── dateUtils.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   │
│   ├── types/                   # 型定義
│   │   ├── residence.ts
│   │   ├── checklist.ts
│   │   └── notification.ts
│   │
│   └── theme/                   # デザインシステム
│       ├── colors.ts
│       ├── typography.ts
│       ├── spacing.ts
│       └── shadows.ts
```

---

## 5. 開発コマンド

### 5.1 コード品質チェック

```bash
# ESLint実行
npm run lint

# ESLint自動修正
npm run lint:fix

# Prettierフォーマット
npm run format

# TypeScript型チェック
npm run type-check
```

### 5.2 テスト（将来実装）

```bash
# Jest単体テスト
npm run test

# カバレッジ付きテスト
npm run test:coverage
```

---

## 6. エラー解決

### 6.1 よくあるエラー

#### エラー1: `Metro bundler error`

```bash
# キャッシュクリア
npx expo start -c

# または
npm start -- --clear
```

#### エラー2: `Module not found`

```bash
# 依存関係の再インストール
rm -rf node_modules
rm package-lock.json
npm install
```

#### エラー3: `Typescript error`

```bash
# 型定義の再インストール
npm install --save-dev @types/react @types/react-native
```

#### エラー4: `Expo Go app crashes`

- Expo Goアプリとプロジェクトのバージョンが一致しているか確認
- Expo SDKバージョンを確認: `npx expo --version`

### 6.2 トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| QRコードが表示されない | ファイアウォール設定を確認、同じWi-Fiに接続 |
| Hot Reloadが動かない | サーバーを再起動 (`r`キー押下) |
| アイコンが表示されない | `@expo/vector-icons`のインストール確認 |
| 通知が届かない | 実機で確認（シミュレータでは一部機能制限あり） |

---

## 7. ビルド（本番）

### 7.1 EAS Buildのセットアップ

```bash
# EAS CLIのインストール
npm install -g eas-cli

# EASへログイン
eas login

# プロジェクト設定
eas build:configure
```

### 7.2 ビルド実行

```bash
# iOS ビルド
eas build --platform ios

# Android ビルド
eas build --platform android

# 両方ビルド
eas build --platform all
```

### 7.3 ローカルビルド（開発用）

```bash
# Android APKビルド
eas build --platform android --profile preview --local

# iOS シミュレーター用ビルド
eas build --platform ios --profile preview --local
```

---

## 8. デバッグ

### 8.1 React Developer Tools

```bash
# インストール
npm install -g react-devtools

# 起動
react-devtools
```

### 8.2 ログ確認

```bash
# すべてのログ表示
npx expo start

# プラットフォーム別ログ
npx react-native log-ios
npx react-native log-android
```

### 8.3 デバッグメニュー

- **iOS**: `Cmd + D`
- **Android**: `Cmd + M` (macOS) / `Ctrl + M` (Windows/Linux)
- **Expo Go**: デバイスをシェイク

---

## 9. コーディング規約

### 9.1 TypeScript

- すべてのファイルに明示的な型定義
- `any`型の使用は避ける
- インターフェースには`I`プレフィックスを付けない

### 9.2 コンポーネント

- Functional Component + Hooks を使用
- Props には型定義を必ず付ける
- デフォルトエクスポートは避け、名前付きエクスポートを使用

### 9.3 命名規則

| 対象 | 形式 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `ResidenceCard.tsx` |
| Hooks | camelCase (use〜) | `useResidenceStore` |
| ユーティリティ | camelCase | `formatJapaneseDate` |
| 定数 | UPPER_SNAKE_CASE | `STORAGE_KEYS` |
| 型 | PascalCase | `ResidenceType` |

### 9.4 ファイル構成

```tsx
// インポート
import React from 'react';
import { View, StyleSheet } from 'react-native';

// 型定義
interface Props {
  // ...
}

// コンポーネント
export const MyComponent: React.FC<Props> = ({ ... }) => {
  // Hooks
  // ハンドラー
  // レンダリング
  return <View />;
};

// スタイル
const styles = StyleSheet.create({
  // ...
});
```

---

## 10. 次のステップ

### 10.1 MVP実装タスク

- [ ] ナビゲーション実装（React Navigation）
- [ ] 登録・編集画面の実装
- [ ] チェックリスト画面の実装
- [ ] 通知設定画面の実装
- [ ] チェックリストストアの実装
- [ ] 通知スケジュール機能の統合

### 10.2 拡張機能

- [ ] 多言語対応（i18next）
- [ ] ダークモード対応
- [ ] オンボーディング画面
- [ ] データエクスポート機能
- [ ] 課金機能（RevenueCat）

---

## 11. リソース・参考資料

### 公式ドキュメント

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://github.com/pmndrs/zustand)
- [date-fns](https://date-fns.org/)

### 開発ツール

- [Expo Snack](https://snack.expo.dev/) - ブラウザでReact Nativeを試せる
- [React Native Directory](https://reactnative.directory/) - ライブラリ検索

---

## 12. サポート・問い合わせ

### 問題が解決しない場合

1. **ドキュメント確認**: `frontend-architecture.md`を参照
2. **ログ確認**: エラーログを詳細に確認
3. **GitHub Issues**: プロジェクトのIssueを検索
4. **Expoコミュニティ**: [Expo Forums](https://forums.expo.dev/)

---

**最終更新**: 2026-02-14
**セットアップ完了**: 環境構築後、ホーム画面が表示されれば成功です！
