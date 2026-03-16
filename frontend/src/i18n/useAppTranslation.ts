/**
 * アプリ用翻訳フック
 * useTranslationのラッパー + ロケール対応の日付フォーマット
 */
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { format, type Locale } from 'date-fns';
import { ja, enUS, vi, zhCN } from 'date-fns/locale';
import type { SupportedLanguage } from './index';

const DATE_FNS_LOCALES: Record<SupportedLanguage, Locale> = {
  ja,
  en: enUS,
  vi,
  zh: zhCN,
};

const DATE_DISPLAY_FORMATS: Record<SupportedLanguage, string> = {
  ja: 'yyyy年M月d日',
  en: 'MMM d, yyyy',
  vi: 'd/M/yyyy',
  zh: 'yyyy年M月d日',
};

export function useAppTranslation(ns?: string | string[]) {
  const { t, i18n } = useTranslation(ns);
  const currentLanguage = (i18n.language || 'ja') as SupportedLanguage;

  /** ロケール対応の日付フォーマット */
  const formatDate = useCallback(
    (date: Date, formatStr: string) => {
      return format(date, formatStr, {
        locale: DATE_FNS_LOCALES[currentLanguage] || ja,
      });
    },
    [currentLanguage],
  );

  /** 表示用日付フォーマット（例: 2026年2月20日 / Feb 20, 2026） */
  const formatDisplayDate = useCallback(
    (date: Date) => {
      return formatDate(
        date,
        DATE_DISPLAY_FORMATS[currentLanguage] || DATE_DISPLAY_FORMATS.ja,
      );
    },
    [currentLanguage, formatDate],
  );

  return { t, i18n, currentLanguage, formatDate, formatDisplayDate };
}
