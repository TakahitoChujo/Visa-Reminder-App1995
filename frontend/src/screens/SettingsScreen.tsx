/**
 * 設定画面
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useResidenceStore } from '../store/useResidenceStore';
import { theme } from '../theme';
import { SettingsScreenNavigationProp } from '../types/navigation';
import { showAlert, showConfirm } from '../utils/platform';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { SUPPORTED_LANGUAGES, changeLanguage, SupportedLanguage } from '../i18n';

/**
 * 外部リンクURL
 */
const EXTERNAL_LINKS = {
  terms: 'https://takahitochujo.github.io/Visa-Reminder-App1995/terms-of-service',
  privacy: 'https://takahitochujo.github.io/Visa-Reminder-App1995/privacy-policy',
  contact: 'mailto:jyojoappteam@gmail.com',
};

export const SettingsScreen = React.memo(function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { t, currentLanguage } = useAppTranslation(['settings', 'common', 'plan']);
  const { clearAllData } = useResidenceStore();

  // アプリバージョン情報を取得
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '100';

  /**
   * 外部リンクを開く
   */
  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showAlert(t('common:error.generic'), t('common:error.linkOpenFailed'));
      }
    } catch (error) {
      console.error('Failed to open link:', error);
      showAlert(t('common:error.generic'), t('common:error.linkOpenError'));
    }
  }, []);

  /**
   * 言語切り替え
   */
  const handleChangeLanguage = useCallback(async (lang: SupportedLanguage) => {
    if (lang === currentLanguage) return;
    await changeLanguage(lang);
  }, [currentLanguage]);

  /**
   * データ削除確認ダイアログ
   */
  const handleClearData = useCallback(() => {
    showConfirm(
      t('settings:data.clearConfirmTitle'),
      t('settings:data.clearConfirmMessage'),
      () => performClearData(),
      { confirmText: t('common:button.delete'), destructive: true }
    );
  }, []);

  /**
   * データ削除実行
   */
  const performClearData = async () => {
    try {
      await clearAllData();
      showAlert('', t('settings:data.clearSuccess'));
    } catch (error) {
      showAlert(t('common:error.generic'), t('settings:data.clearError'));
    }
  };
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md, height: 56 + insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel={t('settings:accessibility.back')}
          accessibilityHint={t('settings:accessibility.backHint')}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings:headerTitle')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom }}>
        {/* プロフィールセクション */}
        <View style={styles.profileSection}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileIconText}>{t('settings:profile.iconText')}</Text>
          </View>
          <Text style={styles.profileName}>{t('settings:profile.userName')}</Text>
          <Text style={styles.profileStatus}>{t('plan:status.freeActive')}</Text>
        </View>

        {/* 言語設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings:section.language')}</Text>
          <View style={styles.settingsGroup}>
            {(Object.entries(SUPPORTED_LANGUAGES) as [SupportedLanguage, typeof SUPPORTED_LANGUAGES[SupportedLanguage]][]).map(([langCode, langInfo]) => (
              <TouchableOpacity
                key={langCode}
                style={styles.settingItem}
                onPress={() => handleChangeLanguage(langCode)}
                accessibilityRole="button"
                accessibilityLabel={t('settings:accessibility.languageSelect')}
                accessibilityHint={t('settings:accessibility.languageSelectHint')}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="language-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{langInfo.nativeLabel}</Text>
                  <Text style={styles.settingDescription}>{langInfo.label}</Text>
                </View>
                {currentLanguage === langCode && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 通知設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings:section.notification')}</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ReminderSettings', { cardId: '' })}
              accessibilityRole="link"
              accessibilityLabel={t('settings:accessibility.reminderSettings')}
              accessibilityHint={t('settings:accessibility.reminderSettingsHint')}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('settings:notification.reminderSettings')}</Text>
                <Text style={styles.settingDescription}>{t('settings:notification.reminderDescription')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        {/* データとプライバシー */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings:section.dataPrivacy')}</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => handleOpenLink(EXTERNAL_LINKS.privacy)}
              accessibilityRole="link"
              accessibilityLabel={t('settings:accessibility.privacyPolicy')}
              accessibilityHint={t('settings:accessibility.privacyPolicyHint')}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('settings:privacy.title')}</Text>
                <Text style={styles.settingDescription}>{t('settings:privacy.description')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        {/* サポート */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings:section.support')}</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => handleOpenLink(EXTERNAL_LINKS.contact)}
              accessibilityRole="link"
              accessibilityLabel={t('settings:accessibility.contact')}
              accessibilityHint={t('settings:accessibility.contactHint')}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('settings:support.contact')}</Text>
                <Text style={styles.settingDescription}>{t('settings:support.contactDescription')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.gray300} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => handleOpenLink(EXTERNAL_LINKS.terms)}
              accessibilityRole="link"
              accessibilityLabel={t('settings:accessibility.terms')}
              accessibilityHint={t('settings:accessibility.termsHint')}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('settings:support.terms')}</Text>
                <Text style={styles.settingDescription}>{t('settings:support.termsDescription')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        {/* その他 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings:section.other')}</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity
              style={[styles.settingItem, styles.dangerItem]}
              onPress={handleClearData}
              accessibilityRole="button"
              accessibilityLabel={t('settings:accessibility.clearAll')}
              accessibilityHint={t('settings:accessibility.clearAllHint')}
            >
              <View style={[styles.settingIcon, styles.dangerIcon]}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, styles.dangerText]}>{t('settings:data.clearAll')}</Text>
                <Text style={styles.settingDescription}>{t('settings:data.clearDescription')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        {/* バージョン情報 */}
        <View style={styles.versionInfo}>
          <View style={styles.appLogo}>
            <Text style={styles.appLogoText}>{t('settings:version.appIconText')}</Text>
          </View>
          <Text style={styles.appName}>{t('settings:version.appName')}</Text>
          <Text style={styles.appVersion}>
            {t('settings:version.versionLabel', { version: appVersion, build: buildNumber })}
          </Text>
        </View>
      </ScrollView>
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
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: 0 as any,
      },
    }),
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  profileIconText: {
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textWhite,
  },
  profileName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  premiumBadge: {
    color: theme.colors.premium,
    fontWeight: theme.fontWeight.semibold,
  },
  // Premium card styles
  premiumCardWrapper: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  premiumCard: {
    backgroundColor: theme.colors.premium,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  premiumTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textWhite,
  },
  premiumDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textWhite,
    lineHeight: 21,
    marginBottom: theme.spacing.lg,
    opacity: 0.9,
  },
  premiumFeatures: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  premiumFeatureText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textWhite,
    flex: 1,
  },
  premiumButton: {
    backgroundColor: theme.colors.backgroundWhite,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  premiumButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.premiumDark,
  },
  // Settings sections
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  settingsGroup: {
    backgroundColor: theme.colors.backgroundWhite,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    minHeight: 72,
  },
  settingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundGray,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  dangerItem: {
    backgroundColor: 'transparent',
  },
  dangerIcon: {
    backgroundColor: theme.colors.errorLight,
  },
  dangerText: {
    color: theme.colors.error,
  },
  // Version info
  versionInfo: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  appLogo: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  appLogoText: {
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textWhite,
  },
  appName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
  },
});
