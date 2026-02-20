/**
 * 在留資格カード 共通フォームコンポーネント
 *
 * RegisterScreen と EditScreen で共通のフォームUI部分を担当する。
 * ヘッダー・ボトムアクション・削除ボタンは各画面側で実装する。
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subMonths } from 'date-fns';
import { ResidenceType } from '../types';
import { theme } from '../theme';
import { DateInput } from './DateInput';
import {
  MEMO_MAX_LENGTH,
  RESIDENCE_TYPE_VALUES,
  TWO_WEEKS_IN_MS,
} from '../utils/constants';
import { useAppTranslation } from '../i18n/useAppTranslation';

interface ResidenceCardFormProps {
  expirationDate: string;
  residenceType: ResidenceType | '';
  memo: string;
  showTypePicker: boolean;
  dateError: string;
  onDateChange: (date: string) => void;
  onTypeChange: (type: ResidenceType) => void;
  onMemoChange: (memo: string) => void;
  onTogglePicker: () => void;
  isValidDate: (dateString: string) => boolean;
  getApplicationStartDate: () => Date | null;
  getDaysRemaining: () => number | null;
}

export const ResidenceCardForm = React.memo(function ResidenceCardForm({
  expirationDate,
  residenceType,
  memo,
  showTypePicker,
  dateError,
  onDateChange,
  onTypeChange,
  onMemoChange,
  onTogglePicker,
  isValidDate,
  getApplicationStartDate,
  getDaysRemaining,
}: ResidenceCardFormProps) {
  const { t, formatDisplayDate } = useAppTranslation(['form', 'common']);
  const selectedTypeLabel = residenceType
    ? t(`common:residenceType.${residenceType}`)
    : '';

  return (
    <>
      {/* ===== セクション1: 基本情報 ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>{t('form:section.basicInfo')}</Text>
        </View>

        {/* 有効期限 */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t('form:label.expirationDate')}<Text style={styles.required}>*</Text>
          </Text>
          <DateInput
            value={expirationDate}
            onChange={onDateChange}
            placeholder={t('form:placeholder.selectDate')}
          />
          {dateError ? (
            <Text style={styles.errorText}>{dateError}</Text>
          ) : (
            <View style={styles.helper}>
              <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.helperText}>
                {Platform.OS === 'web'
                  ? t('form:helper.dateWeb')
                  : t('form:helper.dateNative')
                }
              </Text>
            </View>
          )}
        </View>

        {/* 資格タイプ */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t('form:label.residenceType')}<Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={onTogglePicker}
            accessibilityRole="button"
            accessibilityLabel={t('form:accessibility.residenceType', { type: selectedTypeLabel || t('form:accessibility.residenceTypeUnselected') })}
            accessibilityHint={t('form:accessibility.residenceTypeHint')}
            accessibilityState={{ expanded: showTypePicker }}
          >
            <Text style={[styles.pickerText, !residenceType && styles.pickerPlaceholder]}>
              {selectedTypeLabel || t('form:placeholder.selectType')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {showTypePicker && (
            <View style={styles.pickerOptions}>
              {RESIDENCE_TYPE_VALUES.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={styles.pickerOption}
                  onPress={() => onTypeChange(value)}
                  accessibilityRole="radio"
                  accessibilityLabel={t(`common:residenceType.${value}`)}
                  accessibilityState={{ selected: residenceType === value }}
                >
                  <Text style={styles.pickerOptionText}>{t(`common:residenceType.${value}`)}</Text>
                  {residenceType === value && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.helper}>
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.helperText}>{t('form:helper.typeAutoSet')}</Text>
          </View>
        </View>

        {/* 申請可能時期 infoBox */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>{t('form:info.applicationPeriodTitle')}</Text>
          <Text style={styles.infoBoxText}>
            {t('form:info.applicationPeriodBody')}
          </Text>
        </View>
      </View>

      {/* ===== セクション2: 期限情報（日付が有効なときのみ表示） ===== */}
      {expirationDate && isValidDate(expirationDate) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>{t('form:section.deadlineInfo')}</Text>
          </View>

          <View style={styles.datePreview}>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>{t('form:datePreview.expirationDate')}</Text>
              <Text style={[styles.dateValue, styles.dateValueHighlight]}>
                {formatDisplayDate(new Date(expirationDate))}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>{t('form:datePreview.applicationStart')}</Text>
              <Text style={styles.dateValue}>
                {getApplicationStartDate()
                  ? `${formatDisplayDate(getApplicationStartDate()!)}${t('form:datePreview.applicationStartSuffix')}`
                  : '-'}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>{t('form:datePreview.daysRemaining')}</Text>
              <Text style={styles.dateValue}>{getDaysRemaining() ?? 0}{t('form:datePreview.daySuffix')}</Text>
            </View>
          </View>

          <View style={styles.reminderPreview}>
            <View style={styles.reminderHeader}>
              <Ionicons name="notifications-outline" size={16} color={theme.colors.successDark} />
              <Text style={styles.reminderTitle}>{t('form:reminder.title')}</Text>
            </View>
            <View style={styles.reminderList}>
              {[
                { labelKey: 'form:reminder.fourMonths' as const, date: subMonths(new Date(expirationDate), 4) },
                { labelKey: 'form:reminder.threeMonths' as const, date: subMonths(new Date(expirationDate), 3) },
                { labelKey: 'form:reminder.oneMonth' as const, date: subMonths(new Date(expirationDate), 1) },
                {
                  labelKey: 'form:reminder.twoWeeks' as const,
                  date: new Date(new Date(expirationDate).getTime() - TWO_WEEKS_IN_MS),
                },
              ].map((reminder, index) => (
                <View key={index} style={styles.reminderItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.successDark} />
                  <Text style={styles.reminderItemText}>
                    {t(reminder.labelKey)}（{formatDisplayDate(reminder.date)}）
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ===== セクション3: メモ ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>{t('form:section.memo')}</Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('form:label.memo')}</Text>
            <Text
              style={[
                styles.charCounter,
                memo.length >= MEMO_MAX_LENGTH && styles.charCounterLimit,
              ]}
            >
              {memo.length} / {MEMO_MAX_LENGTH}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('form:placeholder.memoInput')}
            value={memo}
            onChangeText={onMemoChange}
            multiline
            numberOfLines={4}
            maxLength={MEMO_MAX_LENGTH}
            placeholderTextColor={theme.colors.textTertiary}
            accessibilityLabel={t('form:label.memo')}
            accessibilityHint={t('form:accessibility.memoHint', { max: MEMO_MAX_LENGTH })}
          />
          <View style={styles.helper}>
            <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.helperText}>
              {t('form:helper.memoEncrypted')}
            </Text>
          </View>
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  required: {
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
  },
  charCounter: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  charCounterLimit: {
    color: theme.colors.warning,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundWhite,
  },
  textArea: {
    height: 100,
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
  },
  picker: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundWhite,
  },
  pickerText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  pickerPlaceholder: {
    color: theme.colors.textTertiary,
  },
  pickerOptions: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundWhite,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  pickerOptionText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  helper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  helperText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  infoBox: {
    backgroundColor: theme.colors.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.md,
  },
  infoBoxTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.xs,
  },
  infoBoxText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryDark,
    lineHeight: 18,
  },
  datePreview: {
    backgroundColor: theme.colors.backgroundGray,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  dateLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  dateValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  dateValueHighlight: {
    color: theme.colors.primary,
  },
  reminderPreview: {
    backgroundColor: theme.colors.successLight,
    borderWidth: 1,
    borderColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  reminderTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.successDark,
    marginLeft: theme.spacing.xs,
  },
  reminderList: {
    marginTop: theme.spacing.xs,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  reminderItemText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.successDark,
    marginLeft: theme.spacing.xs,
  },
});
