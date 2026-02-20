/**
 * ホーム画面 - 在留資格更新リマインダー
 */
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useResidenceStore } from '../store/useResidenceStore';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../theme';
import { differenceInDays } from 'date-fns';
import { showAlert } from '../utils/platform';
import { STATUS_DAYS } from '../utils/constants';
import { HomeScreenNavigationProp } from '../types/navigation';
import { useAppTranslation } from '../i18n/useAppTranslation';

export const HomeScreen = React.memo(function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { cards, loadData, isLoading, loadError } = useResidenceStore();
  const { isPremium, getMaxCards, canAddCard, loadUserPlan } = useUserStore();
  const { t, formatDisplayDate } = useAppTranslation(['home', 'common', 'plan']);

  const maxCards = getMaxCards();
  const canAdd = canAddCard(cards.length);
  const isPremiumUser = isPremium();

  useEffect(() => {
    loadData();
    loadUserPlan();
  }, []);

  useEffect(() => {
    if (loadError) {
      showAlert(t('common:error.dataLoadError'), loadError);
    }
  }, [loadError, t]);
  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const getStatusColor = useCallback((expirationDate: string) => {
    const daysRemaining = differenceInDays(new Date(expirationDate), new Date());
    if (daysRemaining > STATUS_DAYS.SAFE) return 'safe';
    if (daysRemaining > STATUS_DAYS.WARNING) return 'warning';
    return 'danger';
  }, []);

  const getStatusLabel = useCallback((expirationDate: string) => {
    const daysRemaining = differenceInDays(new Date(expirationDate), new Date());
    if (daysRemaining > STATUS_DAYS.SAFE) return t('common:status.safe');
    if (daysRemaining > STATUS_DAYS.WARNING) return t('common:status.warning');
    return t('common:status.danger');
  }, [t]);

  const getResidenceTypeLabel = useCallback((type: string) => {
    return t(`common:residenceType.${type}`, { defaultValue: t('common:residenceType.other') });
  }, [t]);
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-outline" size={64} color={theme.colors.gray300} />
      <Text style={styles.emptyTitle}>{t('home:empty.title')}</Text>
      <Text style={styles.emptyDescription}>
        {t('home:empty.description')}
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('Register')}
        accessibilityRole="button"
        accessibilityLabel={t('home:accessibility.registerCard')}
        accessibilityHint={t('home:accessibility.registerCardHint')}
      >
        <Ionicons name="add" size={24} color={theme.colors.textWhite} />
        <Text style={styles.addButtonText}>{t('home:card.registerNew')}</Text>
      </TouchableOpacity>
    </View>
  );
  const renderVisaCard = (card: any) => {
    const status = getStatusColor(card.expirationDate);
    const daysRemaining = differenceInDays(new Date(card.expirationDate), new Date());
    const statusKey = `visaCard${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    const statusBadgeKey = `statusBadge${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    const statusBadgeTextKey = `statusBadgeText${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    const daysIndicatorKey = `daysIndicator${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    const daysValueKey = `daysValue${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    const daysLabelKey = `daysLabel${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    return (
      <View
        key={card.id}
        style={[styles.visaCard, (styles as any)[statusKey]]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('Edit', { cardId: card.id })}
          accessibilityRole="button"
          accessibilityLabel={t('home:accessibility.cardDetail', { type: getResidenceTypeLabel(card.residenceType), days: daysRemaining })}
          accessibilityHint={t('home:accessibility.cardDetailHint')}
        >
          <View style={styles.visaCardHeader}>
            <Text style={styles.visaType}>{getResidenceTypeLabel(card.residenceType)}</Text>
            <View style={[styles.statusBadge, (styles as any)[statusBadgeKey]]}>
              <Text style={[styles.statusBadgeText, (styles as any)[statusBadgeTextKey]]}>
                {getStatusLabel(card.expirationDate)}
              </Text>
            </View>
          </View>
          <View style={styles.visaCardBody}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.dateLabel}>{t('common:date.expiration')}</Text>
              <Text style={styles.dateValue}>
                {formatDisplayDate(new Date(card.expirationDate))}
              </Text>
            </View>
            <View style={styles.daysRow}>
              <View style={[styles.daysIndicator, (styles as any)[daysIndicatorKey]]}>
                <Text style={[styles.daysValue, (styles as any)[daysValueKey]]}>
                  {daysRemaining}
                </Text>
                <Text style={[styles.daysLabel, (styles as any)[daysLabelKey]]}>
                  {t('home:card.day')}
                </Text>
              </View>
              <Text style={styles.daysText}>{t('common:date.remaining')}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.visaCardFooter}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Checklist', { cardId: card.id })}
            accessibilityRole="button"
            accessibilityLabel={t('home:accessibility.openChecklist')}
            accessibilityHint={t('home:accessibility.openChecklistHint')}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>{t('home:card.checklist')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.appTitle}>{t('home:title')}</Text>
          <View style={styles.headerActions}>
            {isPremiumUser && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={14} color={theme.colors.premium} />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel={t('common:accessibility.settings')}
              accessibilityHint={t('common:accessibility.openSettings')}
            >
              <Ionicons name="settings-outline" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.greeting}>{t('home:registeredCards')}</Text>
        {cards.length > 0 && (
          <View style={styles.summaryStats}>
            <View style={[styles.statCard, { marginRight: theme.spacing.md }]}>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{cards.length}</Text>
                {!isPremiumUser && (
                  <Text style={styles.statLimit}> / {maxCards}</Text>
                )}
              </View>
              <Text style={styles.statLabel}>{t('home:registrationCount')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {cards.filter((c) => getStatusColor(c.expirationDate) === 'warning' || getStatusColor(c.expirationDate) === 'danger').length}
              </Text>
              <Text style={styles.statLabel}>{t('home:needsAttention')}</Text>
            </View>
          </View>
        )}
      </View>
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        {cards.length === 0 ? renderEmptyState() : cards.map(renderVisaCard)}
        {cards.length > 0 && (
          <>
            {canAdd ? (
              <TouchableOpacity
                style={styles.addCardButton}
                onPress={() => navigation.navigate('Register')}
                accessibilityRole="button"
                accessibilityLabel={t('home:accessibility.registerNewCard')}
                accessibilityHint={t('home:accessibility.registerNewCardHint')}
              >
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.addCardButtonText}>{t('home:card.registerNewLong')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.limitReachedBanner}>
                <View style={styles.limitReachedContent}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.warning} />
                  <Text style={styles.limitReachedText}>
                    {t('plan:limit.freeMax', { limit: maxCards })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.upgradeBadge}
                  accessibilityRole="button"
                  accessibilityLabel={t('plan:upgrade.button')}
                  accessibilityHint={t('home:accessibility.upgradeHint')}
                  onPress={() => {
                    // TODO: アップグレード画面への遷移（Phase 3で実装）
                    showAlert(t('common:alert.notice'), t('plan:comingSoon'));
                  }}
                >
                  <Ionicons name="star" size={16} color={theme.colors.textWhite} />
                  <Text style={styles.upgradeText}>{t('plan:upgrade.button')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
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
    backgroundColor: theme.colors.backgroundWhite,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  appTitle: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  greeting: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  summaryStats: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    ...Platform.select({
      web: {
        minHeight: 0 as any,
      },
    }),
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  addButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textWhite,
    marginLeft: theme.spacing.sm,
  },
  visaCard: {
    backgroundColor: theme.colors.backgroundWhite,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  visaCardSafe: {
    borderLeftColor: theme.colors.success,
  },
  visaCardWarning: {
    borderLeftColor: theme.colors.warning,
  },
  visaCardDanger: {
    borderLeftColor: theme.colors.error,
  },
  visaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  visaType: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  statusBadgeSafe: {
    backgroundColor: theme.colors.successLight,
  },
  statusBadgeWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  statusBadgeDanger: {
    backgroundColor: theme.colors.errorLight,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  statusBadgeTextSafe: {
    color: theme.colors.successDark,
  },
  statusBadgeTextWarning: {
    color: theme.colors.warningDark,
  },
  statusBadgeTextDanger: {
    color: theme.colors.errorDark,
  },
  visaCardBody: {
    marginBottom: theme.spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  dateValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysIndicator: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
  },
  daysIndicatorSafe: {
    backgroundColor: theme.colors.successLight,
  },
  daysIndicatorWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  daysIndicatorDanger: {
    backgroundColor: theme.colors.errorLight,
  },
  daysValue: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
  },
  daysValueSafe: {
    color: theme.colors.successDark,
  },
  daysValueWarning: {
    color: theme.colors.warningDark,
  },
  daysValueDanger: {
    color: theme.colors.errorDark,
  },
  daysLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    marginLeft: theme.spacing.xs,
  },
  daysLabelSafe: {
    color: theme.colors.successDark,
  },
  daysLabelWarning: {
    color: theme.colors.warningDark,
  },
  daysLabelDanger: {
    color: theme.colors.errorDark,
  },
  daysText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  visaCardFooter: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
    marginLeft: theme.spacing.xs,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  addCardButtonText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
    marginLeft: theme.spacing.sm,
  },
  // プラン機能関連のスタイル
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  premiumBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.warningDark,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statLimit: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  limitReachedBanner: {
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  limitReachedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  limitReachedText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.warningDark,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.premium,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  upgradeText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textWhite,
  },
});
