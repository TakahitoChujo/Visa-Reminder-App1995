/**
 * i18n型定義 - TypeScript型安全サポート
 *
 * NOTE: i18nextの厳密な型チェックは namespace:key 形式と相性が悪いため
 * allowObjectInHTMLChildren のみ設定し、キーの型チェックは無効にしている。
 * 翻訳キーの正確性はランタイムテストで担保する。
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    allowObjectInHTMLChildren: true;
  }
}
