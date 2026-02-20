# 技術選定書：在留資格更新リマインダー

**バージョン**: 1.0
**作成日**: 2026-02-14
**対象**: フロントエンド実装

---

## 1. 技術スタックの概要

### 選定結果
本アプリケーションのフロントエンドには **React Native + TypeScript** を採用します。

---

## 2. フレームワーク選定

### React Native vs Flutter の比較

| 評価項目 | React Native | Flutter | 選定理由 |
|---------|--------------|---------|---------|
| **開発言語** | TypeScript/JavaScript | Dart | TypeScriptは一般的で学習コストが低い |
| **パフォーマンス** | ネイティブコンポーネント利用 | 高速レンダリング | 本アプリは高度な描画が不要なため差は小さい |
| **エコシステム** | 非常に豊富（npm） | 成長中だが限定的 | 豊富なライブラリでプッシュ通知・ストレージ等が容易 |
| **コミュニティ** | 大規模で成熟 | 急成長中 | 問題解決のリソースが豊富 |
| **採用実績** | Instagram, Facebook等 | Google Pay, Alibaba等 | 多数の実績がある |
| **開発者の知識** | JavaScript/TypeScript開発者が多い | Dart習得が必要 | 既存スキルを活かしやすい |
| **UIコンポーネント** | ネイティブ寄り | Material/Cupertino | デザインシステムに沿ったカスタマイズが容易 |

### 選定理由（React Native）

1. **広範なエコシステム**: npm/yarnのライブラリが豊富で、プッシュ通知・ストレージ・日付処理などが容易
2. **TypeScriptサポート**: 型安全性が確保され、保守性が高い
3. **学習コスト**: JavaScript/TypeScript経験者が多く、チーム拡張が容易
4. **コミュニティ**: Stack Overflow、GitHub、公式ドキュメントのサポートが充実
5. **実績**: 大規模アプリでの採用実績が豊富
6. **将来性**: React for Webとのコード共有が可能（将来的なWeb版展開に有利）

---

## 3. 技術スタック詳細

### 3.1 コア技術

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|---------|
| **React Native** | 0.73+ | クロスプラットフォームフレームワーク | iOS/Android対応、ネイティブ性能 |
| **TypeScript** | 5.3+ | 開発言語 | 型安全性、コード品質向上 |
| **Expo** | SDK 50+ | 開発環境・ビルド管理 | セットアップ簡素化、OTAアップデート対応 |

### 3.2 状態管理

**選定**: **Zustand**

| 候補 | メリット | デメリット | 評価 |
|-----|---------|-----------|------|
| Redux Toolkit | 実績豊富、開発ツール充実 | ボイラープレート多い、学習コスト高 | △ |
| Context API | React標準、軽量 | 複雑な状態管理に不向き | △ |
| **Zustand** | **軽量、シンプルなAPI、TypeScript親和性** | **比較的新しい** | **◎** |
| Recoil | 柔軟性高い | Meta製だが更新停滞気味 | △ |

**理由**:
- 本アプリの状態は比較的シンプル（在留資格データ、チェックリスト、通知設定）
- ボイラープレートが少なく、開発速度が速い
- TypeScriptとの親和性が高く、型推論が優れている
- 学習コストが低く、小〜中規模アプリに最適

### 3.3 ローカルストレージ

**選定**: **@react-native-async-storage/async-storage**

| 候補 | メリット | デメリット | 評価 |
|-----|---------|-----------|------|
| **AsyncStorage** | **React Native公式推奨、シンプル** | **大量データに不向き** | **◎** |
| SQLite (expo-sqlite) | リレーショナルDB、複雑なクエリ可能 | オーバースペック | △ |
| MMKV | 高速、ネイティブパフォーマンス | 本アプリには過剰 | △ |

**理由**:
- 在留資格データは1〜数件程度でデータ量が少ない
- Key-Value形式で十分（複雑なクエリ不要）
- セットアップが簡単で保守性が高い

### 3.4 プッシュ通知

**選定**: **Expo Notifications**

| 技術 | 選定理由 |
|------|---------|
| **expo-notifications** | Expo環境で統一、FCM/APNsを自動管理、スケジューリング機能内蔵 |
| react-native-push-notification | Bare React Nativeで必要、設定複雑 |

**理由**:
- Expoを採用するため、expo-notificationsが最適
- ローカル通知のスケジューリングが容易
- iOS/Android両対応で設定が簡素

### 3.5 UIコンポーネントライブラリ

**選定**: **カスタムコンポーネント + React Native Paper（補助）**

| 候補 | メリット | デメリット | 評価 |
|-----|---------|-----------|------|
| React Native Paper | Material Design準拠、豊富なコンポーネント | デザインシステムとの乖離 | △ |
| React Native Elements | カスタマイズ性高い | 古い設計、メンテナンス停滞 | × |
| NativeBase | 豊富なコンポーネント | 重い、オーバースペック | × |
| **カスタム実装** | **デザインシステムに完全準拠** | **実装コスト** | **◎** |

**理由**:
- デザインシステムが既に詳細に定義されている
- ブランドアイデンティティを確保
- React Native Paperを補助的に利用（日付ピッカー、モーダル等）

### 3.6 ナビゲーション

**選定**: **React Navigation v6**

- React Nativeのデファクトスタンダード
- スタック、タブ、ドロワーなど多様なナビゲーション対応
- TypeScriptサポート充実

### 3.7 日付処理

**選定**: **date-fns**

| 候補 | メリット | デメリット | 評価 |
|-----|---------|-----------|------|
| **date-fns** | **軽量、Tree-shaking対応、TypeScript対応** | - | **◎** |
| moment.js | 機能豊富 | 重い、メンテナンス終了 | × |
| Day.js | 軽量 | 機能がやや限定的 | △ |

### 3.8 アイコン

**選定**: **@expo/vector-icons (Lucide Icons相当)**

- Expo標準、FontAwesome、MaterialIcons、Ioniconsなど包含
- デザインシステムで推奨されているLucide Icons相当を利用

### 3.9 フォーム管理

**選定**: **React Hook Form**

- 軽量、パフォーマンス良好
- バリデーション機能内蔵
- TypeScriptサポート

### 3.10 課金（将来対応）

**選定**: **react-native-purchases (RevenueCat)**

- App Store / Google Playのサブスク管理を一元化
- クロスプラットフォームで統一的な実装

---

## 4. 依存関係リスト

### 4.1 Core Dependencies

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.4",
    "typescript": "5.3.3",
    "expo": "~50.0.0",
    "expo-status-bar": "~1.11.1",

    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/bottom-tabs": "^6.5.11",

    "zustand": "^4.5.0",

    "@react-native-async-storage/async-storage": "1.21.0",

    "expo-notifications": "~0.27.0",
    "expo-device": "~5.9.0",
    "expo-constants": "~15.4.0",

    "react-hook-form": "^7.49.3",
    "date-fns": "^3.3.0",
    "@expo/vector-icons": "^14.0.0",

    "react-native-paper": "^5.12.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0"
  },
  "devDependencies": {
    "@babel/core": "^7.23.7",
    "@types/react": "~18.2.45",
    "@types/react-native": "^0.73.0",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.1.1"
  }
}
```

### 4.2 将来的な追加候補

- **多言語対応**: `react-i18next`, `i18next`
- **課金**: `react-native-purchases`
- **Analytics**: `@react-native-firebase/analytics`
- **クラッシュレポート**: `@react-native-firebase/crashlytics`

---

## 5. 開発環境・ツール

| ツール | 用途 | バージョン |
|--------|------|-----------|
| **Node.js** | ランタイム | 18.x LTS以上 |
| **npm/yarn** | パッケージマネージャ | npm 9.x / yarn 1.22.x |
| **Expo CLI** | ビルド・開発 | 最新版 |
| **EAS Build** | クラウドビルド | Expoアカウント必要 |
| **ESLint** | コード品質チェック | 8.x |
| **Prettier** | コードフォーマット | 3.x |
| **TypeScript** | 型チェック | 5.3.x |
| **Git** | バージョン管理 | 2.x以上 |

---

## 6. 採用しない技術とその理由

| 技術 | 不採用理由 |
|------|-----------|
| **Flutter** | Dart習得コスト、JavaScriptエコシステムとの乖離 |
| **Ionic/Capacitor** | パフォーマンスがネイティブに劣る、ハイブリッド特有の問題 |
| **Redux** | ボイラープレート多い、本アプリの状態管理には過剰 |
| **SQLite** | データ量少なく不要、AsyncStorageで十分 |
| **moment.js** | 重い、メンテナンス終了 |
| **Bare React Native** | セットアップ複雑、Expoで十分な機能を提供 |

---

## 7. セキュリティ・プライバシー考慮

| 項目 | 対策 |
|------|------|
| **個人情報** | 在留カード番号・氏名は保存しない設計 |
| **ローカルデータ暗号化** | 将来的にexpo-secure-storeを検討（MVP不要） |
| **通知内容** | 通知文面に個人情報を含めない |
| **権限管理** | 通知権限のみ（最小権限の原則） |

---

## 8. パフォーマンス・最適化戦略

| 項目 | 戦略 |
|------|------|
| **バンドルサイズ** | Tree-shaking有効化、不要ライブラリ除外 |
| **レンダリング** | React.memo、useMemo、useCallback活用 |
| **画像** | WebP形式、適切な解像度 |
| **リスト** | FlatListでの仮想化 |
| **初期表示** | スケルトンスクリーンまたはローディング |

---

## 9. テスト戦略（MVP後）

| レイヤー | ツール | 範囲 |
|---------|--------|------|
| **単体テスト** | Jest | ユーティリティ関数、ストア |
| **コンポーネントテスト** | React Native Testing Library | コンポーネント単位 |
| **E2Eテスト** | Detox (将来) | 主要フロー |

---

## 10. CI/CD（MVP後）

- **GitHub Actions**: ESLint、TypeScript型チェック、テスト実行
- **EAS Build**: 自動ビルド・配信
- **TestFlight / Google Play Internal Testing**: ベータ配信

---

## 11. まとめ

### 選定技術スタック
- **フレームワーク**: React Native + Expo
- **言語**: TypeScript
- **状態管理**: Zustand
- **ストレージ**: AsyncStorage
- **通知**: Expo Notifications
- **ナビゲーション**: React Navigation
- **UI**: カスタムコンポーネント + React Native Paper

### 選定理由の要約
1. **開発速度**: Expoによる迅速なセットアップ
2. **保守性**: TypeScriptによる型安全性
3. **拡張性**: 豊富なエコシステム
4. **パフォーマンス**: ネイティブコンポーネント活用
5. **将来性**: Web版展開、多言語対応が容易

---

**最終更新**: 2026-02-14
**承認**: 技術選定完了
