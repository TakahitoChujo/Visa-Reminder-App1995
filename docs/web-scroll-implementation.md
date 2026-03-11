# Web画面スクロール対応実装ドキュメント

## 概要
React Native Webアプリケーションにおいて、Web画面でスクロールバーが表示されず、スクロールできない問題を解決した実装記録。

## 問題
- Web画面でスクロールバーが表示されない
- コンテンツが画面に収まりきらず、下部が見切れる
- ScrollViewがWeb上で正しく動作しない

## 原因
1. React Native WebのScrollViewは、デフォルトではネイティブアプリと同じタッチ/スワイプでのスクロールを想定している
2. `flex: 1`だけでは、親要素に明確な高さがないとスクロールが発生しない
3. Web版では通常のdivとCSSスクロールを使う必要がある

## 解決策

### 1. グローバルスクロールバースタイルの追加 (App.tsx)

```typescript
// App.tsx
if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
      }
      body > div,
      #root,
      #root > div {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      /* スクロールバーを常に表示 */
      * {
        scrollbar-width: auto;
        scrollbar-color: #888 #f1f1f1;
      }
      *::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      *::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      *::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 10px;
      }
      *::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    `;
    document.head.appendChild(style);
  }
}
```

### 2. ScrollViewをWeb版ではViewに置き換え (RegisterScreen.tsx)

```typescript
// コンポーネント内
const ScrollComponent = Platform.OS === 'web' ? View : ScrollView;
const scrollProps = Platform.OS === 'web' ? {} : { contentContainerStyle: styles.contentContainer };

return (
  <View style={styles.container}>
    <View style={styles.header}>
      {/* ヘッダー内容 */}
    </View>
    <ScrollComponent
      style={styles.content}
      {...scrollProps}
    >
      {/* コンテンツ */}
    </ScrollComponent>
    <View style={styles.bottomActions}>
      {/* ボタン */}
    </View>
  </View>
);
```

### 3. containerに明示的な高さを設定

```typescript
container: {
  flex: 1,
  ...Platform.select({
    web: {
      height: '100vh' as any,  // ビューポートの高さ100%
      display: 'flex' as any,
      flexDirection: 'column' as any,
    },
  }),
  backgroundColor: theme.colors.background,
},
```

### 4. contentにスクロール設定

```typescript
content: {
  flex: 1,
  ...Platform.select({
    web: {
      overflowY: 'scroll' as any,  // 常にスクロールバー表示
      padding: theme.spacing.lg,
      paddingBottom: 100,
    },
  }),
},
```

### 5. bottomActionsを固定位置に

```typescript
bottomActions: {
  padding: theme.spacing.lg,
  backgroundColor: theme.colors.backgroundWhite,
  borderTopWidth: 1,
  borderTopColor: theme.colors.border,
  ...Platform.select({
    web: {
      position: 'sticky' as any,  // スクロールしても下部に固定
      bottom: 0,
      zIndex: 10,
    },
  }),
},
```

## 適用した画面
- RegisterScreen (在留資格登録画面) - 完了 ✅
- HomeScreen (ホーム画面) - 完了 ✅
- EditScreen (編集画面) - 完了 ✅
- SettingsScreen (設定画面) - 完了 ✅
- ReminderSettingsScreen (リマインダー設定画面) - 完了 ✅
- ChecklistScreen (チェックリスト画面) - 完了 ✅

## 全画面対応完了 🎉
全ての画面でWeb版スクロールバー対応が完了しました。

### 対応手順
1. `ScrollComponent`の条件分岐を追加
2. `container`に`height: 100vh`を設定
3. `content`に`overflowY: 'scroll'`を設定
4. 下部ボタンがある画面は`position: sticky`を設定

## 動作確認
- ✅ スクロールバーが常に表示される
- ✅ 最後のコンテンツまでスクロール可能
- ✅ 下部のボタンが常に画面下部に固定される
- ✅ ネイティブアプリの動作に影響なし（Platform.selectで分岐）

## 注意点
1. `overflow-y: auto`ではスクロールバーが自動非表示になるため、`scroll`を使用
2. `height: 100vh`はビューポート全体の高さなので、ナビゲーションバー等がある場合は調整が必要
3. `position: sticky`はIE11では動作しないが、React Native Webの対象ブラウザでは問題なし

## 参考
- React Native Web: https://necolas.github.io/react-native-web/
- CSS overflow: https://developer.mozilla.org/ja/docs/Web/CSS/overflow
- CSS position sticky: https://developer.mozilla.org/ja/docs/Web/CSS/position
