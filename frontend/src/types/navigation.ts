/**
 * React Navigation の型定義
 */

import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

/**
 * ルートスタックのパラメータリスト
 * 各画面の名前とパラメータを定義
 */
export type RootStackParamList = {
  Home: undefined;
  Register: undefined;
  Edit: { cardId: string };
  Checklist: { cardId: string };
  ReminderSettings: { cardId: string };
  Settings: undefined;
  DocumentTemplate: { residenceType: string; residenceLabel: string };
};

/**
 * ナビゲーションプロップの型定義
 */
export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * 各画面のナビゲーションプロップとルートプロップの型定義
 */
export type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

export type EditScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Edit'>;
export type EditScreenRouteProp = RouteProp<RootStackParamList, 'Edit'>;

export type ChecklistScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Checklist'>;
export type ChecklistScreenRouteProp = RouteProp<RootStackParamList, 'Checklist'>;

export type ReminderSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ReminderSettings'>;
export type ReminderSettingsScreenRouteProp = RouteProp<RootStackParamList, 'ReminderSettings'>;

export type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export type DocumentTemplateScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DocumentTemplate'>;
export type DocumentTemplateScreenRouteProp = RouteProp<RootStackParamList, 'DocumentTemplate'>;
