# プロジェクト構造修正サマリー

**修正日**: 2026-02-14
**担当**: フロントエンドエンジニア
**対象**: tsconfig.json配置とパス設定の修正

---

## 修正概要

tsconfig.jsonの誤配置とパスエイリアス設定の問題を修正し、React Native/Expoプロジェクトの正しいディレクトリ構造に整理しました。

---

## 1. 問題点

### 1.1 ファイル配置の誤り

**問題**:
- tsconfig.jsonが `frontend/src/tsconfig.json` に配置されていた
- package.json, app.json, babel.config.jsも `frontend/src/` に配置されていた

**影響**:
- パスエイリアス（`@/*`）が `src/src/*` を探してしまう
- Expoプロジェクトとして認識されない
- TypeScriptの型チェックが正しく動作しない

### 1.2 パスエイリアスの問題

**問題**:
```json
{
  "baseUrl": ".",  // frontend/src/ を基準としていた
  "paths": {
    "@/*": ["src/*"]  // src/src/* を参照してしまう
  }
}
```

---

## 2. 修正内容

### 2.1 ディレクトリ構造の正常化

**修正前**:
```
frontend/
├── src/
│   ├── tsconfig.json       ❌ 誤った配置
│   ├── package.json        ❌ 誤った配置
│   ├── app.json            ❌ 誤った配置
│   ├── babel.config.js     ❌ 誤った配置
│   └── src/
│       ├── types/
│       ├── theme/
│       └── ...
```

**修正後**:
```
frontend/
├── tsconfig.json           ✅ 正しい配置
├── package.json            ✅ 正しい配置
├── app.json                ✅ 正しい配置
├── babel.config.js         ✅ 正しい配置
├── .eslintrc.js            ✅ 新規作成
├── .prettierrc             ✅ 正しい配置
├── .gitignore              ✅ 新規作成
├── App.tsx                 ✅ エントリーポイント
└── src/
    ├── types/
    ├── theme/
    ├── utils/
    ├── services/
    ├── store/
    ├── components/
    └── screens/
```

### 2.2 tsconfig.json の修正

**修正後の内容**:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "target": "esnext",
    "lib": ["esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-native",
    "baseUrl": ".",               // ✅ frontend/ を基準に修正
    "paths": {
      "@/*": ["./src/*"],         // ✅ ./src/* を正しく参照
      "@components/*": ["./src/components/*"],
      "@screens/*": ["./src/screens/*"],
      "@store/*": ["./src/store/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"],
      "@theme/*": ["./src/theme/*"],
      "@services/*": ["./src/services/*"],
      "@navigation/*": ["./src/navigation/*"]
    }
  },
  "include": [
    "src/**/*.ts",              // ✅ src/ 配下のTSファイル
    "src/**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

**修正ポイント**:
- `baseUrl: "."` が `frontend/` を基準にするように修正
- `paths` が `./src/*` を正しく参照
- パスエイリアス（`@/types/residence` 等）が正しく解決される

---

## 3. 作成・移動したファイル

### 3.1 正しい位置に移動したファイル

| ファイル | 移動前 | 移動後 | 状態 |
|---------|--------|--------|------|
| tsconfig.json | `src/tsconfig.json` | `tsconfig.json` | ✅ 移動 |
| package.json | `src/package.json` | `package.json` | ✅ 移動 |
| app.json | `src/app.json` | `app.json` | ✅ 移動 |
| babel.config.js | `src/babel.config.js` | `babel.config.js` | ✅ 移動 |
| .prettierrc | `src/.prettierrc` | `.prettierrc` | ✅ 移動 |

### 3.2 新規作成したファイル

| ファイル | 配置先 | 目的 |
|---------|--------|------|
| **App.tsx** | `frontend/App.tsx` | エントリーポイント（Expoアプリ起動） |
| **.eslintrc.js** | `frontend/.eslintrc.js` | ESLint設定 |
| **.gitignore** | `frontend/.gitignore` | Git除外設定 |

---

## 4. App.tsx エントリーポイント

**作成内容**:
```typescript
/**
 * App.tsx - エントリーポイント
 * 在留資格更新リマインダー
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from '@/screens';

export default function App() {
  return (
    <SafeAreaProvider>
      <HomeScreen />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
```

**ポイント**:
- パスエイリアス（`@/screens`）を使用
- SafeAreaProviderでラップ
- StatusBarの設定

---

## 5. パスエイリアスの動作確認

### 5.1 エイリアス一覧

| エイリアス | 参照先 | 使用例 |
|-----------|--------|--------|
| `@/*` | `./src/*` | `import { Residence } from '@/types/residence';` |
| `@components/*` | `./src/components/*` | `import { Button } from '@components/atoms';` |
| `@screens/*` | `./src/screens/*` | `import { HomeScreen } from '@screens';` |
| `@store/*` | `./src/store/*` | `import { useResidenceStore } from '@store/residenceStore';` |
| `@types/*` | `./src/types/*` | `import type { Residence } from '@types/residence';` |
| `@utils/*` | `./src/utils/*` | `import { formatJapaneseDate } from '@utils/dateUtils';` |
| `@theme/*` | `./src/theme/*` | `import { colors } from '@theme';` |
| `@services/*` | `./src/services/*` | `import { saveResidences } from '@services/storage';` |
| `@navigation/*` | `./src/navigation/*` | `import { RootNavigator } from '@navigation';` |

### 5.2 動作確認方法

**TypeScript型チェック**:
```bash
cd frontend
npm run type-check
```

**期待結果**: エラーなし、すべてのパスエイリアスが解決される

---

## 6. 最終的なディレクトリ構造

```
frontend/
├── .eslintrc.js              # ESLint設定
├── .gitignore                # Git除外設定
├── .prettierrc               # Prettier設定
├── tsconfig.json             # TypeScript設定 ✅
├── package.json              # 依存関係 ✅
├── app.json                  # Expo設定 ✅
├── babel.config.js           # Babel設定 ✅
├── App.tsx                   # エントリーポイント ✅
│
├── src/
│   ├── types/                # 型定義
│   │   ├── residence.ts
│   │   ├── checklist.ts
│   │   ├── notification.ts
│   │   └── index.ts
│   │
│   ├── theme/                # デザインシステム
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── shadows.ts
│   │   └── index.ts
│   │
│   ├── utils/                # ユーティリティ
│   │   ├── dateUtils.ts
│   │   ├── validation.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   │
│   ├── services/             # サービス層
│   │   ├── storage.ts
│   │   ├── notification.ts
│   │   └── index.ts
│   │
│   ├── store/                # 状態管理
│   │   ├── residenceStore.ts
│   │   └── index.ts
│   │
│   ├── components/           # UIコンポーネント
│   │   ├── atoms/
│   │   ├── molecules/
│   │   └── organisms/
│   │
│   └── screens/              # 画面コンポーネント
│       ├── HomeScreen.tsx
│       └── index.ts
│
└── docs/                     # ドキュメント
    ├── technology-selection.md
    ├── frontend-architecture.md
    ├── frontend-setup.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── CODE_REVIEW_FIX_SUMMARY.md
    └── PROJECT_STRUCTURE_FIX_SUMMARY.md (本ファイル)
```

---

## 7. 確認事項

### 7.1 動作確認チェックリスト

- [x] tsconfig.jsonが `frontend/` 直下に配置されている
- [x] package.jsonが `frontend/` 直下に配置されている
- [x] App.tsxエントリーポイントが作成されている
- [x] パスエイリアス（`@/*`）が正しく設定されている
- [x] `baseUrl: "."` が `frontend/` を基準にしている
- [x] .eslintrc.js、.gitignoreが作成されている

### 7.2 次のステップ

**1. 依存関係のインストール**:
```bash
cd frontend
npm install
```

**2. TypeScript型チェック**:
```bash
npm run type-check
```

**3. 開発サーバー起動**:
```bash
npm start
```

**期待結果**:
- 型エラーなし
- パスエイリアスが正しく解決される
- Expoアプリが正常に起動する

---

## 8. 修正の影響範囲

### 8.1 修正が必要なファイル

**なし** - すべてのインポート文は既にパスエイリアス（`@/...`）を使用しているため、修正不要

### 8.2 修正が不要なファイル

- `src/` 配下のすべてのTypeScriptファイル
  - 既に `@/types/residence` 等のパスエイリアスを使用
  - tsconfig.jsonの修正により自動的に解決される

---

## 9. トラブルシューティング

### 9.1 パスエイリアスが解決されない場合

**原因**: VSCodeのTypeScriptサーバーがtsconfig.jsonを再読み込みしていない

**解決策**:
1. VSCodeを再起動
2. または `Cmd+Shift+P` → "TypeScript: Restart TS Server"

### 9.2 Expoが起動しない場合

**原因**: キャッシュの問題

**解決策**:
```bash
npx expo start -c
```

---

## 10. まとめ

### 修正完了項目

✅ tsconfig.jsonを正しい位置（`frontend/`）に配置
✅ パスエイリアス設定を修正（`baseUrl: "."` → `frontend/` 基準）
✅ package.json, app.json, babel.config.jsを正しい位置に移動
✅ App.tsxエントリーポイントを作成
✅ .eslintrc.js, .gitignoreを作成
✅ プロジェクト構造をReact Native/Expo標準に準拠

### 修正ファイル数

- 移動: 5ファイル（tsconfig.json, package.json, app.json, babel.config.js, .prettierrc）
- 新規作成: 3ファイル（App.tsx, .eslintrc.js, .gitignore）
- **合計**: 8ファイル

### 検証ステータス

- ✅ ディレクトリ構造: React Native/Expo標準に準拠
- ✅ パスエイリアス: 正しく設定
- ✅ tsconfig.json: 正しい位置に配置
- ✅ エントリーポイント: App.tsx作成完了

---

**修正完了**: 2026-02-14
**次のアクション**: `npm install` → `npm run type-check` → `npm start`
