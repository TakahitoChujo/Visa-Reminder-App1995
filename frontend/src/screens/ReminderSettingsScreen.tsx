/**
 * リマインダー設定画面 - 在留資格更新リマインダー
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert, showConfirm } from '../utils/platform';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useResidenceStore } from '../store/useResidenceStore';
import { notificationService } from '../services/notificationService';
import { theme } from '../theme';
import { addMonths, addDays } from 'date-fns';
import { ReminderSettingsScreenNavigationProp } from '../types/navigation';
import type { NotificationPermissionStatus } from '../types';
import { useAppTranslation } from '../i18n/useAppTranslation';

export const ReminderSettingsScreen = React.memo(function ReminderSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ReminderSettingsScreenNavigationProp>();
  const { t, formatDisplayDate } = useAppTranslation(['reminder', 'common']);
  const { cards, reminderSettings, updateReminderSettings } = useResidenceStore();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(false);

  // 通知許可状態を確認
  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status as NotificationPermissionStatus);
    } catch (error) {
      console.error('Failed to check notification permission:', error);
      setPermissionStatus('undetermined');
    }
  }, []);

  // 通知許可をリクエスト
  const requestNotificationPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status as NotificationPermissionStatus);

      if (status === 'granted') {
        showAlert(t('reminder:permission.successTitle'), t('reminder:permission.successMessage'));
      } else {
        showConfirm(
          t('reminder:permission.deniedTitle'),
          t('reminder:permission.deniedMessage'),
          () => Linking.openSettings(),
          { confirmText: t('reminder:permission.openSettings') }
        );
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // デバイスの通知設定を開く
  const openNotificationSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  // テスト通知を送信
  const handleSendTestNotification = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      showAlert(
        t('reminder:permission.deniedTitle'),
        t('reminder:permission.deniedMessage')
      );
      return;
    }
    try {
      await notificationService.sendTestNotification();
      showAlert(t('reminder:test.sentTitle'), t('reminder:test.sentMessage'));
    } catch (error) {
      showAlert(t('reminder:test.errorTitle'), t('reminder:test.errorMessage'));
    }
  }, [permissionStatus, t]);

  // リマインダー設定の更新
  const handleToggle = useCallback(
    async (key: keyof typeof reminderSettings, value: boolean) => {
      try {
        await updateReminderSettings({ [key]: value });
      } catch (error) {
        console.error('Failed to update reminder settings:', error);
      }
    },
    [updateReminderSettings]
  );

  // 次回通知日を計算
  const calculateNextNotificationDate = useCallback(
    (monthsBefore?: number, daysBefore?: number): string | null => {
      // 最初の在留カードの有効期限を取得
      if (cards.length === 0) {
        return null;
      }

      const firstCard = cards[0];
      const expirationDate = new Date(firstCard.expirationDate);

      if (monthsBefore !== undefined) {
        const notificationDate = addMonths(expirationDate, -monthsBefore);
        return formatDisplayDate(notificationDate);
      }

      if (daysBefore !== undefined) {
        const notificationDate = addDays(expirationDate, -daysBefore);
        return formatDisplayDate(notificationDate);
      }

      return null;
    },
    [cards, formatDisplayDate]
  );

  // 通知許可カードを表示すべきか
  const shouldShowPermissionCard = permissionStatus !== 'granted';

  return (
    <View style={styles.container}>
      {/* ナビゲーションバー */}
      <View style={[styles.navBar, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity
          style={styles.navBack}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel={t('reminder:accessibility.back')}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t('reminder:navTitle')}</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={[styles.scrollContent, { paddingBottom: theme.spacing.xxl * 2 + insets.bottom }]}>
        {/* ページヘッダー */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t('reminder:pageTitle')}</Text>
          <Text style={styles.pageDescription}>
            {t('reminder:pageDescription')}
          </Text>
        </View>

        {/* 通知許可カード */}
        {shouldShowPermissionCard && (
          <View
            style={styles.permissionCard}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            <View style={styles.permissionHeader}>
              <Ionicons name="notifications-outline" size={32} color={theme.colors.textWhite} />
              <Text style={styles.permissionTitle}>{t('reminder:permission.title')}</Text>
            </View>
            <Text style={styles.permissionDescription}>
              {t('reminder:permission.description')}
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, isLoading && styles.permissionButtonDisabled]}
              onPress={requestNotificationPermission}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={t('reminder:accessibility.allowNotification')}
              accessibilityHint={t('reminder:accessibility.allowNotificationHint')}
            >
              <Text style={styles.permissionButtonText}>
                {isLoading ? t('reminder:permission.processing') : t('reminder:permission.button')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* リマインダータイミング */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('reminder:timing.sectionTitle')}</Text>
            <Text style={styles.sectionSubtitle}>{t('reminder:timing.sectionSubtitle')}</Text>
          </View>

          {/* 4ヶ月前 */}
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTitleRow}>
                  <Text style={styles.settingTitle}>{t('reminder:timing.fourMonths')}</Text>
                  <View style={styles.settingBadgeRecommended}>
                    <Text style={styles.settingBadgeTextRecommended}>{t('reminder:timing.recommended')}</Text>
                  </View>
                </View>
                <Text style={styles.settingDescription}>{t('reminder:timing.fourMonthsDescription')}</Text>
                {cards.length > 0 && (
                  <Text style={styles.settingDate}>
                    {t('reminder:timing.nextDate', { date: calculateNextNotificationDate(4) || t('reminder:timing.notSet') })}
                  </Text>
                )}
              </View>
              <Switch
                value={reminderSettings.fourMonthsBefore}
                onValueChange={(value) => handleToggle('fourMonthsBefore', value)}
                trackColor={{
                  false: theme.colors.gray300,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.backgroundWhite}
                accessibilityRole="switch"
                accessibilityLabel={t('reminder:accessibility.fourMonthsNotification')}
                accessibilityHint={t('reminder:accessibility.fourMonthsHint')}
              />
            </View>
          </View>

          {/* 3ヶ月前 */}
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTitleRow}>
                  <Text style={styles.settingTitle}>{t('reminder:timing.threeMonths')}</Text>
                  <View style={styles.settingBadgeRecommended}>
                    <Text style={styles.settingBadgeTextRecommended}>{t('reminder:timing.recommended')}</Text>
                  </View>
                </View>
                <Text style={styles.settingDescription}>{t('reminder:timing.threeMonthsDescription')}</Text>
                {cards.length > 0 && (
                  <Text style={styles.settingDate}>
                    {t('reminder:timing.nextDate', { date: calculateNextNotificationDate(3) || t('reminder:timing.notSet') })}
                  </Text>
                )}
              </View>
              <Switch
                value={reminderSettings.threeMonthsBefore}
                onValueChange={(value) => handleToggle('threeMonthsBefore', value)}
                trackColor={{
                  false: theme.colors.gray300,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.backgroundWhite}
                accessibilityRole="switch"
                accessibilityLabel={t('reminder:accessibility.threeMonthsNotification')}
                accessibilityHint={t('reminder:accessibility.threeMonthsHint')}
              />
            </View>
          </View>

          {/* 1ヶ月前 */}
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('reminder:timing.oneMonth')}</Text>
                <Text style={styles.settingDescription}>{t('reminder:timing.oneMonthDescription')}</Text>
                {cards.length > 0 && (
                  <Text style={styles.settingDate}>
                    {t('reminder:timing.nextDate', { date: calculateNextNotificationDate(1) || t('reminder:timing.notSet') })}
                  </Text>
                )}
              </View>
              <Switch
                value={reminderSettings.oneMonthBefore}
                onValueChange={(value) => handleToggle('oneMonthBefore', value)}
                trackColor={{
                  false: theme.colors.gray300,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.backgroundWhite}
                accessibilityRole="switch"
                accessibilityLabel={t('reminder:accessibility.oneMonthNotification')}
                accessibilityHint={t('reminder:accessibility.oneMonthHint')}
              />
            </View>
          </View>

          {/* 2週間前 */}
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('reminder:timing.twoWeeks')}</Text>
                <Text style={styles.settingDescription}>{t('reminder:timing.twoWeeksDescription')}</Text>
                {cards.length > 0 && (
                  <Text style={styles.settingDate}>
                    {t('reminder:timing.nextDate', { date: calculateNextNotificationDate(undefined, 14) || t('reminder:timing.notSet') })}
                  </Text>
                )}
              </View>
              <Switch
                value={reminderSettings.twoWeeksBefore}
                onValueChange={(value) => handleToggle('twoWeeksBefore', value)}
                trackColor={{
                  false: theme.colors.gray300,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.backgroundWhite}
                accessibilityRole="switch"
                accessibilityLabel={t('reminder:accessibility.twoWeeksNotification')}
                accessibilityHint={t('reminder:accessibility.twoWeeksHint')}
              />
            </View>
          </View>

          {/* インフォボックス */}
          <View style={styles.infoBox}>
            <View style={styles.infoBoxContent}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.colors.warningDark}
              />
              <Text style={styles.infoText}>
                {t('reminder:infoBox')}
              </Text>
            </View>
          </View>
        </View>

        {/* 区切り線 */}
        <View style={styles.divider} />

        {/* 通知プレビュー */}
        {cards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.previewSection}>
              <View style={styles.previewTitleRow}>
                <Ionicons name="eye-outline" size={16} color={theme.colors.textPrimary} />
                <Text style={styles.previewTitle}>{t('reminder:preview.title')}</Text>
              </View>

              <View style={styles.notificationPreview}>
                <View style={styles.notificationHeader}>
                  <View style={styles.appIcon}>
                    <Text style={styles.appIconText}>{t('reminder:preview.appIconText')}</Text>
                  </View>
                  <View style={styles.notificationMeta}>
                    <Text style={styles.appName}>{t('reminder:preview.appName')}</Text>
                    <Text style={styles.notificationTime}>{t('reminder:preview.notificationTime')}</Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.notificationTitle}>
                    {t('reminder:preview.notificationTitle')}
                  </Text>
                  <Text style={styles.notificationBody}>
                    {t('reminder:preview.notificationBody')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* その他の設定 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('reminder:otherSettings.sectionTitle')}</Text>
          </View>

          {/* 通知音 */}
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('reminder:otherSettings.sound')}</Text>
                <Text style={styles.settingDescription}>{t('reminder:otherSettings.soundDescription')}</Text>
              </View>
              <Switch
                value={reminderSettings.soundEnabled}
                onValueChange={(value) => handleToggle('soundEnabled', value)}
                trackColor={{
                  false: theme.colors.gray300,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.backgroundWhite}
                accessibilityRole="switch"
                accessibilityLabel={t('reminder:accessibility.soundNotification')}
                accessibilityHint={t('reminder:accessibility.soundHint')}
              />
            </View>
          </View>

          {/* バッジ表示 */}
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('reminder:otherSettings.badge')}</Text>
                <Text style={styles.settingDescription}>{t('reminder:otherSettings.badgeDescription')}</Text>
              </View>
              <Switch
                value={reminderSettings.badgeEnabled}
                onValueChange={(value) => handleToggle('badgeEnabled', value)}
                trackColor={{
                  false: theme.colors.gray300,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.backgroundWhite}
                accessibilityRole="switch"
                accessibilityLabel={t('reminder:accessibility.badgeNotification')}
                accessibilityHint={t('reminder:accessibility.badgeHint')}
              />
            </View>
          </View>
        </View>

        {/* システム設定へのリンク / テスト通知 */}
        <View style={styles.buttonGroup}>
          {permissionStatus === 'granted' && (
            <TouchableOpacity
              style={[styles.btnLink, styles.btnTestNotification]}
              onPress={handleSendTestNotification}
              accessibilityRole="button"
              accessibilityLabel={t('reminder:test.button')}
              accessibilityHint={t('reminder:test.buttonHint')}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.btnLinkText}>{t('reminder:test.button')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.btnLink}
            onPress={openNotificationSettings}
            accessibilityRole="button"
            accessibilityLabel={t('reminder:accessibility.openDeviceSettings')}
            accessibilityHint={t('reminder:accessibility.openDeviceSettingsHint')}
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.btnLinkText}>{t('reminder:deviceSettings')}</Text>
          </TouchableOpacity>
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
  navBar: {
    height: 56,
    backgroundColor: theme.colors.backgroundWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  navBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  navTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  navSpacer: {
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
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl * 2,
  },
  pageHeader: {
    marginBottom: theme.spacing.xl,
  },
  pageTitle: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  pageDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  permissionCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  permissionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textWhite,
  },
  permissionDescription: {
    fontSize: theme.fontSize.md,
    lineHeight: 21,
    marginBottom: theme.spacing.lg,
    color: theme.colors.textWhite,
    opacity: 0.9,
  },
  permissionButton: {
    width: '100%',
    height: 44,
    backgroundColor: theme.colors.backgroundWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  permissionButtonDisabled: {
    opacity: 0.6,
  },
  permissionButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  settingItem: {
    backgroundColor: theme.colors.backgroundWhite,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.lg,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  settingTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  settingBadgeRecommended: {
    backgroundColor: theme.colors.infoLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  settingBadgeTextRecommended: {
    fontSize: 10,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.infoDark,
  },
  settingDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  settingDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
    marginTop: theme.spacing.xs,
  },
  infoBox: {
    backgroundColor: theme.colors.warningLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.lg,
  },
  infoBoxContent: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warningDark,
    lineHeight: 18,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xl,
  },
  previewSection: {
    backgroundColor: theme.colors.backgroundGray,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  previewTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  notificationPreview: {
    backgroundColor: theme.colors.backgroundWhite,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)' as any,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  appIcon: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: {
    color: theme.colors.textWhite,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.xl,
  },
  notificationMeta: {
    flex: 1,
  },
  appName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  notificationTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  notificationTitle: {
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  notificationBody: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  buttonGroup: {
    marginTop: theme.spacing.xl,
  },
  btnLink: {
    width: '100%',
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  btnLinkText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
  },
  btnTestNotification: {
    marginBottom: theme.spacing.md,
  },
});
