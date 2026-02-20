/**
 * 在留資格カードフォーム共通カスタムフック
 *
 * RegisterScreen と EditScreen で重複していたフォームロジックを共通化する。
 */

import { useState, useCallback } from 'react';
import { subMonths, differenceInDays } from 'date-fns';
import { ResidenceType } from '../types';
import { APPLICATION_PERIOD_MONTHS } from '../utils/constants';
import i18n from '../i18n';

export interface UseResidenceCardFormReturn {
  // state
  expirationDate: string;
  residenceType: ResidenceType | '';
  memo: string;
  showTypePicker: boolean;
  dateError: string;
  // setters
  /** ユーザー入力用（バリデーションあり） */
  handleDateChange: (date: string) => void;
  /** データロード用（バリデーションなし・EditScreen の初期化時に使用） */
  setExpirationDate: (date: string) => void;
  setMemo: (memo: string) => void;
  setShowTypePicker: (show: boolean) => void;
  setResidenceType: (type: ResidenceType | '') => void;
  // computed
  isFormValid: () => boolean;
  isValidDate: (dateString: string) => boolean;
  getApplicationStartDate: () => Date | null;
  getDaysRemaining: () => number | null;
}

interface UseResidenceCardFormOptions {
  initialData?: {
    expirationDate?: string;
    residenceType?: ResidenceType;
    memo?: string;
  };
}

/**
 * 在留資格フォームのステートとロジックを管理するカスタムフック。
 *
 * @param options.initialData 初期値（EditScreen で既存データを設定するときに使用）
 */
export function useResidenceCardForm(
  options?: UseResidenceCardFormOptions
): UseResidenceCardFormReturn {
  const initialData = options?.initialData;

  const [expirationDate, setExpirationDate] = useState(initialData?.expirationDate ?? '');
  const [residenceType, setResidenceType] = useState<ResidenceType | ''>(
    initialData?.residenceType ?? ''
  );
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [dateError, setDateError] = useState('');

  /** 有効期限変更ハンドラ（過去日バリデーション付き） */
  const handleDateChange = useCallback((date: string) => {
    setExpirationDate(date);
    if (date) {
      const selectedDate = new Date(date);
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      if (selectedDate < today) {
        setDateError(i18n.t('form:validation.pastDate'));
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
  }, []);

  /** フォーム全体のバリデーション */
  const isFormValid = useCallback(() => {
    return !!(expirationDate && residenceType && !dateError);
  }, [expirationDate, residenceType, dateError]);

  /** 日付文字列の妥当性チェック */
  const isValidDate = useCallback((dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }, []);

  /** 申請可能開始日（有効期限の APPLICATION_PERIOD_MONTHS ヶ月前） */
  const getApplicationStartDate = useCallback(() => {
    if (!expirationDate || !isValidDate(expirationDate)) return null;
    return subMonths(new Date(expirationDate), APPLICATION_PERIOD_MONTHS);
  }, [expirationDate, isValidDate]);

  /** 有効期限までの残り日数 */
  const getDaysRemaining = useCallback(() => {
    if (!expirationDate || !isValidDate(expirationDate)) return null;
    return differenceInDays(new Date(expirationDate), new Date());
  }, [expirationDate, isValidDate]);

  return {
    expirationDate,
    residenceType,
    memo,
    showTypePicker,
    dateError,
    handleDateChange,
    setExpirationDate,
    setMemo,
    setShowTypePicker,
    setResidenceType,
    isFormValid,
    isValidDate,
    getApplicationStartDate,
    getDaysRemaining,
  };
}
