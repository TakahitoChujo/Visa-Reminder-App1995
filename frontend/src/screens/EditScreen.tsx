/**
 * 在留資格編集画面 - EditScreen
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useResidenceStore } from '../store/useResidenceStore';
import { ResidenceType } from '../types';
import { theme } from '../theme';
import type { EditScreenNavigationProp, EditScreenRouteProp } from '../types/navigation';
import { useResidenceCardForm } from '../hooks/useResidenceCardForm';
import { ResidenceCardForm } from '../components/ResidenceCardForm';
import { showAlert, showConfirm } from '../utils/platform';
import { useAppTranslation } from '../i18n/useAppTranslation';

export const EditScreen = React.memo(function EditScreen() {
  const navigation = useNavigation<EditScreenNavigationProp>();
  const route = useRoute<EditScreenRouteProp>();
  const { cards, updateCard, deleteCard } = useResidenceStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useAppTranslation(['edit', 'common']);

  const cardId = route.params.cardId;

  const {
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
  } = useResidenceCardForm();

  // 既存データの読み込み
  useEffect(() => {
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      setExpirationDate(card.expirationDate);
      setResidenceType(card.residenceType);
      setMemo(card.memo || '');
    } else {
      showAlert(t('common:error.generic'), t('edit:error.notFound'));
      navigation.navigate('Home');
    }
  }, [cardId, cards, navigation]);

  // 保存処理
  const handleSave = useCallback(async () => {
    if (!isFormValid()) return;

    try {
      await updateCard(cardId, {
        expirationDate,
        residenceType: residenceType as ResidenceType,
        memo,
      });
      navigation.navigate('Home');
    } catch {
      showAlert(t('common:error.generic'), t('edit:error.updateFailed'));
    }
  }, [isFormValid, cardId, expirationDate, residenceType, memo, updateCard, navigation]);

  // 削除実行
  const executeDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteCard(cardId);
      showAlert(
        t('edit:delete.successTitle'),
        t('edit:delete.successMessage'),
        () => navigation.navigate('Home')
      );
    } catch {
      showAlert(t('common:error.generic'), t('edit:error.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  }, [cardId, deleteCard, navigation]);

  // 削除確認ダイアログ
  const handleDelete = useCallback(() => {
    showConfirm(
      t('edit:confirm.deleteTitle'),
      t('edit:confirm.deleteMessage'),
      executeDelete,
      { confirmText: t('edit:confirm.deleteButton'), destructive: true }
    );
  }, [executeDelete]);

  const formButtons = (
    <>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSave}
        disabled={!isFormValid()}
        accessibilityRole="button"
        accessibilityLabel={t('edit:accessibility.saveChanges')}
      >
        <Ionicons name="checkmark" size={20} color={theme.colors.textWhite} />
        <Text style={styles.primaryButtonText}>{t('edit:button.save')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
        accessibilityRole="button"
        accessibilityLabel={t('common:button.cancel')}
      >
        <Text style={styles.secondaryButtonText}>{t('common:button.cancel')}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel={t('common:button.back')}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('edit:header.title')}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={!isFormValid()}
          accessibilityRole="button"
          accessibilityLabel={t('edit:accessibility.save')}
        >
          <Text
            style={[
              styles.saveButtonText,
              !isFormValid() && styles.saveButtonTextDisabled,
            ]}
          >
            {t('edit:accessibility.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <ResidenceCardForm
          expirationDate={expirationDate}
          residenceType={residenceType}
          memo={memo}
          showTypePicker={showTypePicker}
          dateError={dateError}
          onDateChange={handleDateChange}
          onTypeChange={(type) => {
            setResidenceType(type);
            setShowTypePicker(false);
          }}
          onMemoChange={setMemo}
          onTogglePicker={() => setShowTypePicker(!showTypePicker)}
          isValidDate={isValidDate}
          getApplicationStartDate={getApplicationStartDate}
          getDaysRemaining={getDaysRemaining}
        />

        {/* 削除ゾーン（EditScreen 固有） */}
        <View style={styles.dangerZone}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel={t('edit:accessibility.deleteCard')}
            accessibilityHint={t('edit:accessibility.deleteCardHint')}
          >
            <Ionicons name="warning-outline" size={20} color={theme.colors.error} />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? t('edit:delete.deleting') : t('edit:delete.label')}
            </Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'web' && (
          <View style={styles.bottomActions}>{formButtons}</View>
        )}
      </ScrollView>

      {Platform.OS !== 'web' && (
        <View style={styles.bottomActions}>{formButtons}</View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  saveButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  saveButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
  content: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: 0 as any,
      },
    }),
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: 60,
    ...Platform.select({
      web: {
        paddingBottom: theme.spacing.lg,
      },
    }),
  },
  dangerZone: {
    marginTop: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
  },
  deleteButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
  },
  bottomActions: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundWhite,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textWhite,
    marginLeft: theme.spacing.xs,
  },
  secondaryButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
});
