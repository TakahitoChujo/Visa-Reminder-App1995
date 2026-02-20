# フロントエンドアーキテクチャ設計書：在留資格更新リマインダー

**バージョン**: 1.0
**作成日**: 2026-02-14
**技術スタック**: React Native + TypeScript + Expo

---

## 1. プロジェクト構成

### 1.1 ディレクトリ構成（Atomic Design ベース）

```
frontend/
├── app.json                      # Expo設定ファイル
├── package.json                  # 依存関係
├── tsconfig.json                 # TypeScript設定
├── babel.config.js               # Babel設定
├── .eslintrc.js                  # ESLint設定
├── .prettierrc                   # Prettier設定
├── App.tsx                       # エントリーポイント
│
├── src/
│   ├── components/               # コンポーネント（Atomic Design）
│   │   ├── atoms/                # 最小単位コンポーネント
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Icon.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── molecules/            # atoms の組み合わせ
│   │   │   ├── FormField.tsx
│   │   │   ├── ChecklistItem.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── ReminderRow.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── organisms/            # molecules/atoms の複合体
│   │   │   ├── ResidenceCard.tsx
│   │   │   ├── ChecklistCategory.tsx
│   │   │   ├── ReminderSettings.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── BottomNavigation.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── templates/            # 画面レイアウト
│   │       ├── ScreenLayout.tsx
│   │       ├── FormLayout.tsx
│   │       └── index.ts
│   │
│   ├── screens/                  # 画面コンポーネント（Pages）
│   │   ├── HomeScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── EditScreen.tsx
│   │   ├── ChecklistScreen.tsx
│   │   ├── ReminderScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── index.ts
│   │
│   ├── navigation/               # ナビゲーション設定
│   │   ├── RootNavigator.tsx
│   │   ├── StackNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── types.ts              # ナビゲーション型定義
│   │
│   ├── store/                    # 状態管理（Zustand）
│   │   ├── residenceStore.ts     # 在留資格データストア
│   │   ├── checklistStore.ts     # チェックリストストア
│   │   ├── notificationStore.ts  # 通知設定ストア
│   │   └── index.ts
│   │
│   ├── services/                 # 外部サービス・API層
│   │   ├── storage.ts            # AsyncStorage ラッパー
│   │   ├── notification.ts       # プッシュ通知管理
│   │   └── index.ts
│   │
│   ├── utils/                    # ユーティリティ関数
│   │   ├── dateUtils.ts          # 日付計算（残り日数、申請可能日等）
│   │   ├── validation.ts         # フォームバリデーション
│   │   ├── constants.ts          # 定数定義
│   │   └── index.ts
│   │
│   ├── types/                    # 型定義
│   │   ├── residence.ts          # 在留資格型
│   │   ├── checklist.ts          # チェックリスト型
│   │   ├── notification.ts       # 通知型
│   │   └── index.ts
│   │
│   ├── assets/                   # 静的リソース
│   │   ├── images/
│   │   └── fonts/
│   │
│   └── theme/                    # デザインシステム
│       ├── colors.ts             # カラーパレット
│       ├── typography.ts         # タイポグラフィ
│       ├── spacing.ts            # スペーシング
│       ├── shadows.ts            # シャドウ
│       └── index.ts
│
└── __tests__/                    # テスト（将来）
    ├── components/
    ├── utils/
    └── screens/
```

---

## 2. コンポーネント設計（Atomic Design）

### 2.1 Atoms（原子）

最小単位のコンポーネント。他のコンポーネントに依存しない。

| コンポーネント | 説明 | Props例 |
|--------------|------|---------|
| **Button** | プライマリ・セカンダリ・テキストボタン | `variant`, `onPress`, `children`, `disabled` |
| **Input** | テキスト入力フィールド | `value`, `onChangeText`, `placeholder`, `error` |
| **StatusBadge** | ステータスバッジ（安全/警告/危険） | `status: 'safe' \| 'warning' \| 'danger'`, `label` |
| **Checkbox** | チェックボックス | `checked`, `onToggle`, `disabled` |
| **Icon** | アイコン（Ionicons/MaterialIconsラッパー） | `name`, `size`, `color` |
| **Text** | テキストコンポーネント（スタイル統一） | `variant`, `color`, `children` |

### 2.2 Molecules（分子）

Atomsを組み合わせた機能的なコンポーネント。

| コンポーネント | 説明 | 使用Atoms |
|--------------|------|-----------|
| **FormField** | ラベル + 入力フィールド + エラー表示 | `Input`, `Text` |
| **ChecklistItem** | チェックボックス + タイトル + 説明 + タグ | `Checkbox`, `Text`, `StatusBadge` |
| **DatePicker** | 日付入力（カレンダー表示） | `Input`, `Icon` |
| **ReminderRow** | リマインダー項目（日付 + 状態） | `Text`, `Icon`, `StatusBadge` |

### 2.3 Organisms（有機体）

Molecules/Atomsの複合体で、特定の機能を持つコンポーネント。

| コンポーネント | 説明 | 使用コンポーネント |
|--------------|------|------------------|
| **ResidenceCard** | 在留資格カード（ホーム画面） | `StatusBadge`, `Text`, `Button` |
| **ChecklistCategory** | チェックリストカテゴリ（複数項目） | `ChecklistItem`, `Text` |
| **ReminderSettings** | リマインダー設定パネル | `ReminderRow`, `Switch` |
| **Header** | 画面ヘッダー（タイトル + アクション） | `Text`, `Icon`, `Button` |
| **BottomNavigation** | ボトムタブナビゲーション | `Icon`, `Text` |

### 2.4 Templates（テンプレート）

画面レイアウトの骨組み。

| テンプレート | 説明 |
|-------------|------|
| **ScreenLayout** | 基本画面レイアウト（ヘッダー + コンテンツ + ナビ） |
| **FormLayout** | フォーム画面レイアウト（スクロール + ボタン固定） |

### 2.5 Pages（画面）

Screensディレクトリで定義。実際の画面コンポーネント。

---

## 3. 画面遷移・ナビゲーション

### 3.1 ナビゲーション構造

```
RootNavigator (Stack)
├── MainTabs (BottomTabs)
│   ├── HomeScreen          (ホーム)
│   ├── ChecklistScreen     (チェックリスト)
│   ├── ReminderScreen      (通知設定)
│   └── SettingsScreen      (設定)
│
└── Modals/Screens (Stack)
    ├── RegisterScreen      (新規登録)
    ├── EditScreen          (編集)
    └── DetailScreen        (詳細)
```

### 3.2 画面遷移図

```
┌─────────────┐
│  HomeScreen │ ←─┐
└─────────────┘   │
       │          │
       ├─→ RegisterScreen (モーダル)
       │          │
       ├─→ EditScreen (モーダル)
       │          │
       └─→ ChecklistScreen (タブ遷移)
                  │
                  └─→ DetailScreen (スタック)
```

### 3.3 ナビゲーション型定義例

```typescript
export type RootStackParamList = {
  MainTabs: undefined;
  Register: undefined;
  Edit: { residenceId: string };
};

export type MainTabsParamList = {
  Home: undefined;
  Checklist: { residenceId?: string };
  Reminder: undefined;
  Settings: undefined;
};
```

---

## 4. データフロー

### 4.1 状態管理アーキテクチャ（Zustand）

```
┌───────────────┐
│   Component   │
└───────┬───────┘
        │ useStore
        ▼
┌───────────────┐
│  Zustand Store│ ←─── Storage (AsyncStorage)
└───────┬───────┘
        │ setState
        ▼
┌───────────────┐
│  Re-render    │
└───────────────┘
```

### 4.2 ストア設計

#### residenceStore.ts（在留資格データ）

```typescript
interface ResidenceState {
  residences: Residence[];            // 在留資格リスト
  currentResidence: Residence | null; // 現在選択中の在留資格

  addResidence: (residence: Residence) => Promise<void>;
  updateResidence: (id: string, data: Partial<Residence>) => Promise<void>;
  deleteResidence: (id: string) => Promise<void>;
  loadResidences: () => Promise<void>;
}
```

#### checklistStore.ts（チェックリスト）

```typescript
interface ChecklistState {
  checklists: Record<string, ChecklistItem[]>; // residenceId → items

  toggleItem: (residenceId: string, itemId: string) => Promise<void>;
  updateNote: (residenceId: string, itemId: string, note: string) => Promise<void>;
  resetChecklist: (residenceId: string) => Promise<void>;
  loadChecklists: () => Promise<void>;
}
```

#### notificationStore.ts（通知設定）

```typescript
interface NotificationState {
  enabled: boolean;
  permissions: boolean;

  scheduleNotifications: (residence: Residence) => Promise<void>;
  cancelNotifications: (residenceId: string) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}
```

### 4.3 データ永続化

```
Component → Store → Storage Service → AsyncStorage
                ↓
          (自動保存)
```

- Store内でデータ変更時、自動的にAsyncStorageに保存
- アプリ起動時、Storageからデータを読み込み

---

## 5. 主要機能フロー

### 5.1 在留資格登録フロー

```
1. HomeScreen
   └→ 「登録」ボタン押下
      └→ RegisterScreen (モーダル表示)
         ├→ 有効期限入力
         ├→ 資格タイプ選択
         ├→ バリデーション
         └→ 登録ボタン押下
            ├→ residenceStore.addResidence()
            ├→ AsyncStorageに保存
            ├→ 通知スケジュール設定
            └→ HomeScreenに戻る（データ反映）
```

### 5.2 チェックリスト完了フロー

```
1. ChecklistScreen
   └→ チェックリスト項目タップ
      └→ checklistStore.toggleItem()
         ├→ 状態反映（完了/未完了）
         ├→ AsyncStorageに保存
         └→ UI更新（取り消し線、色変更）
```

### 5.3 プッシュ通知フロー

```
1. アプリ起動時
   └→ notificationStore.requestPermissions()
      └→ OS通知許可ダイアログ

2. 在留資格登録時
   └→ notificationStore.scheduleNotifications()
      ├→ 4ヶ月前の通知スケジュール
      ├→ 3ヶ月前の通知スケジュール
      ├→ 1ヶ月前の通知スケジュール
      └→ 2週間前の通知スケジュール

3. 通知タップ時
   └→ アプリ起動 → HomeScreen または ChecklistScreen
```

---

## 6. デザインシステム実装

### 6.1 テーマ構成

```typescript
// theme/colors.ts
export const colors = {
  primary: '#2E5BFF',
  primaryDark: '#1E3DB8',
  primaryLight: '#E8EEFF',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  bgPrimary: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  border: '#E5E7EB',
};

// theme/typography.ts
export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '600' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

// theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

### 6.2 コンポーネントでの利用例

```typescript
import { colors, spacing, typography } from '@/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgPrimary,
    padding: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
});
```

---

## 7. エラーハンドリング

### 7.1 エラー種別

| エラー種別 | 対応 |
|----------|------|
| **バリデーションエラー** | フォーム内でリアルタイム表示（赤文字） |
| **ストレージエラー** | トースト通知 + リトライ機能 |
| **通知権限エラー** | 設定画面への誘導ダイアログ |
| **予期しないエラー** | エラーバウンダリでキャッチ、再起動案内 |

### 7.2 エラーバウンダリ実装

```typescript
// App.tsx
<ErrorBoundary>
  <RootNavigator />
</ErrorBoundary>
```

---

## 8. パフォーマンス最適化

### 8.1 レンダリング最適化

| 手法 | 適用箇所 |
|------|---------|
| **React.memo** | ResidenceCard, ChecklistItem 等の繰り返しコンポーネント |
| **useMemo** | 日付計算、フィルタリング処理 |
| **useCallback** | イベントハンドラー |
| **FlatList** | チェックリストのリスト表示 |

### 8.2 バンドルサイズ最適化

- Tree-shaking有効化
- 未使用のアイコンセット除外
- 画像はWebP形式、適切な解像度

---

## 9. アクセシビリティ対応

### 9.1 実装方針

| 項目 | 実装内容 |
|------|---------|
| **スクリーンリーダー** | すべてのインタラクティブ要素に`accessibilityLabel` |
| **タップ領域** | 最小44×44px（iOS）、48×48px（Android） |
| **コントラスト比** | WCAG AA基準（4.5:1以上） |
| **フォーカス管理** | キーボードナビゲーション対応 |

### 9.2 実装例

```typescript
<Button
  accessibilityLabel="在留資格を登録"
  accessibilityHint="新しい在留資格情報を入力する画面を開きます"
  accessibilityRole="button"
>
  登録
</Button>
```

---

## 10. セキュリティ考慮

### 10.1 データ保護

| 項目 | 対策 |
|------|------|
| **個人情報** | 在留カード番号・氏名は保存しない |
| **データ暗号化** | MVP不要（将来的にexpo-secure-store） |
| **通知内容** | 個人を特定できる情報を含めない |
| **ローカルデータ** | AsyncStorage（デバイスのサンドボックス内） |

---

## 11. テスト戦略（MVP後）

### 11.1 テストピラミッド

```
        E2E (Detox)
       ┌─────────┐
      /           \
     /  Component  \
    /   (Testing    \
   /     Library)    \
  ┌───────────────────┐
  │  Unit (Jest)      │
  └───────────────────┘
```

### 11.2 テスト対象

| レイヤー | 対象 | 例 |
|---------|------|-----|
| **Unit** | ユーティリティ関数、ストア | dateUtils.ts, residenceStore.ts |
| **Component** | Atoms, Molecules | Button.tsx, ChecklistItem.tsx |
| **E2E** | 主要フロー | 登録〜通知設定〜チェックリスト完了 |

---

## 12. 将来拡張

### 12.1 多言語対応

- `i18next` + `react-i18next` 導入
- 言語ファイル（ja.json, en.json, vi.json等）
- AsyncStorageで言語設定保存

### 12.2 複数在留資格対応

- residenceStore配列を拡張
- HomeScreenでのリスト表示
- 有料課金機能として実装

### 12.3 サーバー同期（オプション）

- 将来的にバックエンドAPI接続
- ローカルファーストアーキテクチャ維持
- オフライン対応

---

## 13. まとめ

### 13.1 設計原則

1. **コンポーネント再利用性**: Atomic Designによる体系的な設計
2. **型安全性**: TypeScriptによる厳格な型定義
3. **状態管理のシンプルさ**: Zustandによる最小限のボイラープレート
4. **パフォーマンス**: 不要な再レンダリング防止、最適化
5. **保守性**: 明確なディレクトリ構成、命名規則

### 13.2 開発フロー

```
設計 → コンポーネント実装 → 画面実装 → 状態管理統合 → テスト → リリース
```

---

**最終更新**: 2026-02-14
**承認**: アーキテクチャ設計完了
