/**
 * プラットフォーム共通ユーティリティ
 *
 * Web / Native 環境で繰り返される `Platform.OS === 'web'` 分岐と
 * `@ts-ignore` を集約し、型安全に実装する。
 */

import { Alert, Platform } from 'react-native';

/**
 * シンプルアラートを表示する。
 *
 * - Web: `globalThis.alert()` を使用（タイトルとメッセージを改行で結合）
 * - Native: `Alert.alert()` を使用
 *
 * @param title      アラートのタイトル
 * @param message    メッセージ本文（省略可）
 * @param onDismiss  OKを押したあとのコールバック（省略可）
 */
export function showAlert(title: string, message?: string, onDismiss?: () => void): void {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n${message}` : title;
    (globalThis as any).alert(text);
    onDismiss?.();
  } else {
    Alert.alert(
      title,
      message,
      onDismiss ? [{ text: 'OK', onPress: onDismiss }] : undefined
    );
  }
}

/**
 * 確認ダイアログを表示する。
 *
 * - Web: `globalThis.confirm()` を使用し、戻り値が `true` のとき `onConfirm` を呼び出す
 * - Native: `Alert.alert()` にキャンセル・確認ボタンを設定する
 *
 * @param title     ダイアログのタイトル
 * @param message   メッセージ本文
 * @param onConfirm ユーザーが確認ボタンを押したときのコールバック
 * @param options   表示オプション
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  options?: {
    /** 確認ボタンのテキスト（デフォルト: 'OK'） */
    confirmText?: string;
    /** キャンセルボタンのテキスト（デフォルト: 'キャンセル'） */
    cancelText?: string;
    /** 確認ボタンを破壊的スタイルにするか（デフォルト: false） */
    destructive?: boolean;
  }
): void {
  const confirmText = options?.confirmText ?? 'OK';
  const cancelText = options?.cancelText ?? 'キャンセル';
  const destructive = options?.destructive ?? false;

  if (Platform.OS === 'web') {
    const confirmed = (globalThis as any).confirm(`${title}\n${message}`);
    if (confirmed) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);
  }
}
