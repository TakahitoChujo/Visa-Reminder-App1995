/**
 * Navigation 型定義テスト
 * TypeScriptの型チェックを確認
 */

import { RootStackParamList } from '../../types/navigation';

// 型定義が正しいことを確認するテスト
describe('Navigation Type Definitions', () => {
  it('should have correct screen names', () => {
    type ScreenNames = keyof RootStackParamList;

    // 期待される画面名
    const expectedScreens: ScreenNames[] = [
      'Home',
      'Register',
      'Edit',
      'Checklist',
      'ReminderSettings',
      'Settings',
    ];

    expect(expectedScreens.length).toBe(6);
  });

  it('should have correct parameter types', () => {
    // Home画面はパラメータなし
    type HomeParams = RootStackParamList['Home'];
    const homeParams: HomeParams = undefined;
    expect(homeParams).toBeUndefined();

    // Register画面はパラメータなし
    type RegisterParams = RootStackParamList['Register'];
    const registerParams: RegisterParams = undefined;
    expect(registerParams).toBeUndefined();

    // Edit画面はcardIdが必須
    type EditParams = RootStackParamList['Edit'];
    const editParams: EditParams = { cardId: 'test-id' };
    expect(editParams.cardId).toBe('test-id');

    // Checklist画面はcardIdが必須
    type ChecklistParams = RootStackParamList['Checklist'];
    const checklistParams: ChecklistParams = { cardId: 'test-id' };
    expect(checklistParams.cardId).toBe('test-id');

    // ReminderSettings画面はcardIdが必須
    type ReminderSettingsParams = RootStackParamList['ReminderSettings'];
    const reminderParams: ReminderSettingsParams = { cardId: 'test-id' };
    expect(reminderParams.cardId).toBe('test-id');

    // Settings画面はパラメータなし
    type SettingsParams = RootStackParamList['Settings'];
    const settingsParams: SettingsParams = undefined;
    expect(settingsParams).toBeUndefined();
  });
});
