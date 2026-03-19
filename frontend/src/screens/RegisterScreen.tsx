/**
 * 在留資格登録画面 - RegisterScreen
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useResidenceStore } from '../store/useResidenceStore';
import { ResidenceType } from '../types';
import { theme } from '../theme';
import { RegisterScreenNavigationProp } from '../types/navigation';
import { useResidenceCardForm } from '../hooks/useResidenceCardForm';
import { ResidenceCardForm } from '../components/ResidenceCardForm';
import { showAlert, showConfirm } from '../utils/platform';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { notificationService } from '../services/notificationService';

export const RegisterScreen = React.memo(function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { addCard } = useResidenceStore();
  const { t } = useAppTranslation(['register', 'common', 'plan']);

  const {
    expirationDate,
    residenceType,
    memo,
    showTypePicker,
    dateError,
    handleDateChange,
    setMemo,
    setShowTypePicker,
    setResidenceType,
    isFormValid,
    isValidDate,
    getApplicationStartDate,
    getDaysRemaining,
  } = useResidenceCardForm();

  // 保存処理（確認ダイアログあり）
  const handleSave = () => {
    if (!isFormValid()) return;

    showConfirm(
      t('register:confirm.title'),
      t('register:confirm.message'),
      async () => {
        try {
          // 初回カード登録時に通知パーミッションを要求（既に許可済みならスキップ）
          await notificationService.requestPermissions();

          await addCard({
            expirationDate,
            residenceType: residenceType as ResidenceType,
            memo,
          });
          navigation.navigate('Home');
        } catch {
          showAlert(t('common:error.generic'), t('register:error.registerFailed'));
        }
      },
      { confirmText: t('register:confirm.submit') }
    );
  };

  const formButtons = (
    <>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel={t('register:accessibility.register')}
        accessibilityHint={t('register:accessibility.registerHint')}
        accessibilityState={{ disabled: !isFormValid() }}
      >
        <Ionicons name="checkmark" size={20} color={theme.colors.textWhite} />
        <Text style={styles.primaryButtonText}>{t('common:button.register')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
        accessibilityRole="button"
        accessibilityLabel={t('common:button.cancel')}
        accessibilityHint={t('register:accessibility.cancelHint')}
      >
        <Text style={styles.secondaryButtonText}>{t('common:button.cancel')}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel={t('common:button.back')}
          accessibilityHint={t('register:accessibility.backHint')}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('register:header.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
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
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + theme.spacing.lg }]}>{formButtons}</View>
    </KeyboardAvoidingView>
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
  headerPlaceholder: {
    width: 40,
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
    paddingBottom: 100,
    ...Platform.select({
      web: {
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
        paddingBottom: theme.spacing.lg,
      },
    }),
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
