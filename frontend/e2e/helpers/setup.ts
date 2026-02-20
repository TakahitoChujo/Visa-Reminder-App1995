import { device } from 'detox';

/**
 * アプリをReact Nativeレベルでリロードしてリセット
 * （ネイティブ層は再起動しない）
 */
export async function resetApp() {
  await device.reloadReactNative();
}

/**
 * アプリデータを完全クリア（iOS Keychainも含む）
 * テストスイートの前に呼び出してクリーンな状態にする
 */
export async function clearAppData() {
  await device.clearKeychain(); // iOS のみ有効
  await resetApp();
}

/**
 * E2Eテスト用 testID 定数
 * 各画面コンポーネントの testID プロパティに対応する値を一元管理
 *
 * 使い方:
 *   element(by.id(TestIDs.home.addButton))
 *   element(by.id(TestIDs.checklist.checkboxItem(0)))
 */
export const TestIDs = {
  home: {
    addButton: 'home-add-button',
    cardList: 'home-card-list',
    emptyState: 'home-empty-state',
    cardItem: (id: string) => `card-item-${id}`,
  },
  register: {
    residenceTypeSelector: 'register-residence-type',
    expiryDatePicker: 'register-expiry-date',
    memoInput: 'register-memo-input',
    saveButton: 'register-save-button',
    cancelButton: 'register-cancel-button',
  },
  edit: {
    residenceTypeSelector: 'edit-residence-type',
    expiryDatePicker: 'edit-expiry-date',
    memoInput: 'edit-memo-input',
    saveButton: 'edit-save-button',
    deleteButton: 'edit-delete-button',
    confirmDeleteButton: 'confirm-delete-button',
  },
  checklist: {
    progressBar: 'checklist-progress-bar',
    checkboxItem: (index: number) => `checklist-item-${index}`,
    immiLink: 'checklist-immi-link',
  },
} as const;
