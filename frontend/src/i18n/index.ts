/**
 * i18n設定 - 多言語対応の初期化と管理
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 日本語ロケール
import jaCommon from './locales/ja/common.json';
import jaHome from './locales/ja/home.json';
import jaForm from './locales/ja/form.json';
import jaRegister from './locales/ja/register.json';
import jaEdit from './locales/ja/edit.json';
import jaNotification from './locales/ja/notification.json';
import jaChecklist from './locales/ja/checklist.json';
import jaChecklistData from './locales/ja/checklistData.json';
import jaReminder from './locales/ja/reminder.json';
import jaSettings from './locales/ja/settings.json';

import jaOnboarding from './locales/ja/onboarding.json';

// 英語ロケール
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enForm from './locales/en/form.json';
import enRegister from './locales/en/register.json';
import enEdit from './locales/en/edit.json';
import enNotification from './locales/en/notification.json';
import enChecklist from './locales/en/checklist.json';
import enChecklistData from './locales/en/checklistData.json';
import enReminder from './locales/en/reminder.json';
import enSettings from './locales/en/settings.json';

import enOnboarding from './locales/en/onboarding.json';

// ベトナム語ロケール
import viCommon from './locales/vi/common.json';
import viHome from './locales/vi/home.json';
import viForm from './locales/vi/form.json';
import viRegister from './locales/vi/register.json';
import viEdit from './locales/vi/edit.json';
import viNotification from './locales/vi/notification.json';
import viChecklist from './locales/vi/checklist.json';
import viChecklistData from './locales/vi/checklistData.json';
import viReminder from './locales/vi/reminder.json';
import viSettings from './locales/vi/settings.json';

import viOnboarding from './locales/vi/onboarding.json';

// 中国語（簡体字）ロケール
import zhCommon from './locales/zh/common.json';
import zhHome from './locales/zh/home.json';
import zhForm from './locales/zh/form.json';
import zhRegister from './locales/zh/register.json';
import zhEdit from './locales/zh/edit.json';
import zhNotification from './locales/zh/notification.json';
import zhChecklist from './locales/zh/checklist.json';
import zhChecklistData from './locales/zh/checklistData.json';
import zhReminder from './locales/zh/reminder.json';
import zhSettings from './locales/zh/settings.json';

import zhOnboarding from './locales/zh/onboarding.json';

const LANGUAGE_STORAGE_KEY = '@app_language';

/** サポート言語の定義 */
export const SUPPORTED_LANGUAGES = {
  ja: { label: '日本語', nativeLabel: '日本語' },
  en: { label: 'English', nativeLabel: 'English' },
  vi: { label: 'Tiếng Việt', nativeLabel: 'Tiếng Việt' },
  zh: { label: '中文简体', nativeLabel: '中文简体' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/** i18nリソース定義 */
const resources = {
  ja: {
    common: jaCommon,
    home: jaHome,
    form: jaForm,
    register: jaRegister,
    edit: jaEdit,
    notification: jaNotification,
    checklist: jaChecklist,
    checklistData: jaChecklistData,
    reminder: jaReminder,
    settings: jaSettings,

    onboarding: jaOnboarding,
  },
  en: {
    common: enCommon,
    home: enHome,
    form: enForm,
    register: enRegister,
    edit: enEdit,
    notification: enNotification,
    checklist: enChecklist,
    checklistData: enChecklistData,
    reminder: enReminder,
    settings: enSettings,

    onboarding: enOnboarding,
  },
  vi: {
    common: viCommon,
    home: viHome,
    form: viForm,
    register: viRegister,
    edit: viEdit,
    notification: viNotification,
    checklist: viChecklist,
    checklistData: viChecklistData,
    reminder: viReminder,
    settings: viSettings,

    onboarding: viOnboarding,
  },
  zh: {
    common: zhCommon,
    home: zhHome,
    form: zhForm,
    register: zhRegister,
    edit: zhEdit,
    notification: zhNotification,
    checklist: zhChecklist,
    checklistData: zhChecklistData,
    reminder: zhReminder,
    settings: zhSettings,

    onboarding: zhOnboarding,
  },
} as const;

export type Resources = typeof resources['ja'];

/**
 * 初期言語を決定する
 * 優先順位: 保存済み設定 > デバイスロケール > 'ja'フォールバック
 */
async function getInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && stored in SUPPORTED_LANGUAGES) {
      return stored as SupportedLanguage;
    }
  } catch {
    // AsyncStorage読み取り失敗時はフォールバック
  }

  const deviceLocale = Localization.getLocales()[0]?.languageCode;
  if (deviceLocale && deviceLocale in SUPPORTED_LANGUAGES) {
    return deviceLocale as SupportedLanguage;
  }

  return 'ja';
}

/** i18nを初期化する（アプリ起動時に1回呼ぶ） */
export async function initI18n(): Promise<void> {
  const lng = await getInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'ja',
    defaultNS: 'common',
    ns: ['common', 'home', 'form', 'register', 'edit', 'notification', 'checklist', 'checklistData', 'reminder', 'settings', 'onboarding'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

/** 言語を切り替える */
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export default i18n;
