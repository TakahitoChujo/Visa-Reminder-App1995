/**
 * チェックリスト画面 - 在留資格更新リマインダー
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert, showConfirm } from '../utils/platform';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useResidenceStore } from '../store/useResidenceStore';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { CHECKLIST_TEMPLATES } from '../data/checklistTemplates';
import { theme } from '../theme';
import { ResidenceType, ChecklistItem, ChecklistCategory } from '../types';
import { RootStackParamList, ChecklistScreenNavigationProp } from '../types/navigation';

type ChecklistScreenRouteProp = RouteProp<RootStackParamList, 'Checklist'>;

export const ChecklistScreen = React.memo(function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ChecklistScreenNavigationProp>();
  const route = useRoute<ChecklistScreenRouteProp>();
  const { cardId } = route.params;
  const { t } = useAppTranslation(['checklist', 'checklistData', 'common']);

  const { cards, checklistItems, updateChecklistItem, markAllComplete, resetChecklist } = useResidenceStore();
  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  const card = cards.find((c) => c.id === cardId);

  // テンプレートからチェックリストカテゴリを解決する
  const resolveTemplateCategories = useCallback(
    (residenceTypeKey: string): ChecklistCategory[] => {
      const templateCategories = CHECKLIST_TEMPLATES[residenceTypeKey] || [];
      return templateCategories.map((template) => ({
        id: template.id,
        title: t(template.titleKey),
        icon: template.icon,
        items: template.items.map((templateItem) => ({
          id: templateItem.id,
          title: t(templateItem.titleKey),
          description: t(templateItem.descriptionKey),
          category: template.id,
          tags: templateItem.tagKeys.map((tagKey) => t(tagKey)),
          completed: false,
          order: templateItem.order,
        })),
      }));
    },
    [t]
  );

  // 在留資格タイプに応じたチェックリストデータを初期化
  useEffect(() => {
    if (!card) return;

    const residenceTypeKey = getResidenceTypeKey(card.residenceType);
    const templateCategories = resolveTemplateCategories(residenceTypeKey);

    // 保存されているチェック状態をロード
    const savedItems = checklistItems[cardId] || [];

    // テンプレートと保存済みデータをマージ
    // savedItem はチェック状態・メモのみを持つ部分オブジェクトの場合があるため
    // テンプレート項目をベースにして completed / note のみ上書きする
    const mergedCategories = templateCategories.map((category) => ({
      ...category,
      items: category.items.map((templateItem) => {
        const savedItem = savedItems.find((item) => item.id === templateItem.id);
        if (!savedItem) return templateItem;
        return {
          ...templateItem,
          completed: savedItem.completed ?? templateItem.completed,
          note: savedItem.note ?? templateItem.note,
        };
      }),
    }));

    setCategories(mergedCategories);
  }, [card, cardId, checklistItems, resolveTemplateCategories]);

  // 在留資格タイプをキーに変換
  const getResidenceTypeKey = (type: ResidenceType): string => {
    const typeMapping: Record<ResidenceType, string> = {
      work_visa: 'engineer',
      spouse_japanese: 'spouse-japanese',
      spouse_permanent: 'spouse-permanent',
      permanent_application: 'engineer',
      student: 'student',
      designated_activities: 'engineer',
      skilled_worker: 'engineer',
      other: 'engineer',
    };
    return typeMapping[type] || 'engineer';
  };

  // 進捗計算
  const calculateProgress = useCallback(() => {
    const allItems = categories.flatMap((cat) => cat.items);
    const completedItems = allItems.filter((item) => item.completed);
    const total = allItems.length;
    const completed = completedItems.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [categories]);

  // チェックボックストグル
  const handleToggleItem = useCallback(
    async (categoryId: string, itemId: string) => {
      const updatedCategories = categories.map((category) => {
        if (category.id === categoryId) {
          return {
            ...category,
            items: category.items.map((item) => {
              if (item.id === itemId) {
                const updated = { ...item, completed: !item.completed };
                // ストアを更新
                updateChecklistItem(cardId, itemId, { completed: updated.completed });
                return updated;
              }
              return item;
            }),
          };
        }
        return category;
      });
      setCategories(updatedCategories);
    },
    [categories, cardId, updateChecklistItem]
  );

  // メモの切り替え
  const handleToggleNote = useCallback((itemId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // メモの更新
  const handleUpdateNote = useCallback(
    async (categoryId: string, itemId: string, note: string) => {
      const updatedCategories = categories.map((category) => {
        if (category.id === categoryId) {
          return {
            ...category,
            items: category.items.map((item) => {
              if (item.id === itemId) {
                const updated = { ...item, note };
                // ストアを更新（暗号化はストア側で処理）
                updateChecklistItem(cardId, itemId, { note });
                return updated;
              }
              return item;
            }),
          };
        }
        return category;
      });
      setCategories(updatedCategories);
    },
    [categories, cardId, updateChecklistItem]
  );

  // すべて完了
  const handleMarkAllComplete = useCallback(async () => {
    if (isMarkingComplete) return;
    const allItems = categories.flatMap((cat) => cat.items);
    const itemIds = allItems.map((item) => item.id);
    setIsMarkingComplete(true);
    try {
      // 単一のアトミック操作でストアを更新（Race Condition回避）
      await markAllComplete(cardId, itemIds);
      showAlert(
        t('checklist:alert.allCompleteTitle'),
        t('checklist:alert.allCompleteMessage', { total: itemIds.length })
      );
    } finally {
      setIsMarkingComplete(false);
    }
  }, [isMarkingComplete, categories, cardId, markAllComplete, t]);

  // リセット
  const handleReset = useCallback(() => {
    const resetAction = () => {
      resetChecklist(cardId);
      const residenceTypeKey = getResidenceTypeKey(card!.residenceType);
      setCategories(resolveTemplateCategories(residenceTypeKey));
      setExpandedNotes(new Set());
    };

    showConfirm(
      t('checklist:alert.resetTitle'),
      t('checklist:alert.resetMessage'),
      resetAction,
      { confirmText: t('checklist:alert.resetConfirm'), destructive: true }
    );
  }, [cardId, card, resetChecklist, t, resolveTemplateCategories]);

  // 外部リンクを開く
  const handleOpenLink = useCallback(() => {
    const url = 'https://www.moj.go.jp/isa/applications/procedures/index.html';
    Linking.openURL(url);
  }, []);

  // チェックリストを共有
  const handleShare = useCallback(async () => {
    const allItems = categories.flatMap((cat) => cat.items);
    const completed = allItems.filter((item) => item.completed).length;
    const total = allItems.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const checklistText = categories
      .map((cat) => {
        const catItems = cat.items
          .map((item) => `${item.completed ? '✓' : '□'} ${item.title}`)
          .join('\n');
        return `【${cat.title}】\n${catItems}`;
      })
      .join('\n\n');

    const shareText =
      `${t(`common:residenceType.${card!.residenceType}`)} ${t('checklist:screen.title')}\n` +
      `(${completed}/${total} - ${percentage}%)\n\n` +
      checklistText;

    try {
      await Share.share({
        message: shareText,
        title: t('checklist:screen.title'),
      });
    } catch {
      // キャンセルまたは失敗 - 何もしない
    }
  }, [categories, card, t]);

  if (!card) {
    return (
      <View style={styles.container}>
        <Text>{t('checklist:error.cardNotFound')}</Text>
      </View>
    );
  }

  const progress = calculateProgress();
  const allCompleted = progress.total > 0 && progress.completed === progress.total;
  const markAllDisabled = isMarkingComplete || allCompleted;

  // 就労系在留資格かどうか（申請理由書テンプレート対象）
  const isEngineerType =
    card.residenceType === 'work_visa' ||
    card.residenceType === 'designated_activities' ||
    card.residenceType === 'skilled_worker';

  const actionButtons = (
    <>
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={handleShare}
        accessibilityLabel={t('checklist:accessibility.shareChecklist')}
        accessibilityRole="button"
      >
        <Ionicons name="share-outline" size={20} color={theme.colors.textSecondary} />
        <Text style={styles.btnSecondaryText}>{t('common:button.share')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btnPrimary, markAllDisabled && styles.btnPrimaryDisabled]}
        onPress={handleMarkAllComplete}
        disabled={markAllDisabled}
        accessibilityLabel={t('checklist:accessibility.markAllComplete')}
        accessibilityRole="button"
        accessibilityState={{ disabled: markAllDisabled }}
      >
        <Ionicons name="checkmark-done" size={20} color={theme.colors.textWhite} />
        <Text style={styles.btnPrimaryText}>{t('common:button.markAllComplete')}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      {/* ナビゲーションバー */}
      <View style={[styles.navBar, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity
          style={styles.navBack}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
          accessibilityLabel={t('checklist:accessibility.back')}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t('checklist:screen.title')}</Text>
        <TouchableOpacity
          onPress={handleReset}
          accessibilityLabel={t('checklist:accessibility.reset')}
          accessibilityRole="button"
        >
          <Text style={styles.navAction}>{t('checklist:action.reset')}</Text>
        </TouchableOpacity>
      </View>

      {/* ヘッダーセクション */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>{t(`common:residenceType.${card.residenceType}`)}</Text>
        <Text style={styles.headerSubtitle}>{t('checklist:screen.headerSubtitle')}</Text>

        {/* プログレスバー */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{t('checklist:progress.label')}</Text>
            <Text style={styles.progressPercentage}>
              {t('checklist:progress.status', {
                completed: progress.completed,
                total: progress.total,
                percentage: progress.percentage,
              })}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
          </View>
        </View>
      </View>

      {/* コンテンツ */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* 入管へのリンク */}
        <TouchableOpacity
          style={styles.infoLink}
          onPress={handleOpenLink}
          accessibilityLabel={t('checklist:link.officialPage')}
          accessibilityRole="link"
          accessibilityHint={t('checklist:accessibility.officialPageHint')}
        >
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.infoLinkText}>{t('checklist:link.officialPage')}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* 理由書テンプレートへのリンク（就労系在留資格のみ） */}
        {isEngineerType && (
          <TouchableOpacity
            style={styles.infoLink}
            onPress={() =>
              navigation.navigate('DocumentTemplate', {
                residenceType: card.residenceType,
                residenceLabel: t(`common:residenceType.${card.residenceType}`),
              })
            }
            accessibilityLabel={t('checklist:link.documentTemplate')}
            accessibilityRole="button"
          >
            <Ionicons name="document-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.infoLinkText}>{t('checklist:link.documentTemplate')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        {/* カテゴリ別チェックリスト */}
        {categories.map((category, categoryIndex) => (
          <View key={category.id}>
            {categoryIndex > 0 && <View style={styles.divider} />}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>
                    {t('checklist:progress.categoryCount', {
                      completed: category.items.filter((item) => item.completed).length,
                      total: category.items.length,
                    })}
                  </Text>
                </View>
              </View>

              {/* チェックリスト項目 */}
              {category.items.map((item) => (
                <ChecklistItemComponent
                  key={item.id}
                  item={item}
                  categoryId={category.id}
                  onToggle={handleToggleItem}
                  onToggleNote={handleToggleNote}
                  onUpdateNote={handleUpdateNote}
                  isNoteExpanded={expandedNotes.has(item.id)}
                />
              ))}
            </View>
          </View>
        ))}
        {Platform.OS === 'web' && (
          <View style={styles.bottomAction}>{actionButtons}</View>
        )}
      </ScrollView>

      {/* ボトムアクション（ネイティブのみ固定フッター） */}
      {Platform.OS !== 'web' && (
        <View style={[styles.bottomAction, { paddingBottom: theme.spacing.lg + insets.bottom }]}>{actionButtons}</View>
      )}
    </View>
  );
});

// チェックリスト項目コンポーネント
interface ChecklistItemProps {
  item: ChecklistItem;
  categoryId: string;
  onToggle: (categoryId: string, itemId: string) => void;
  onToggleNote: (itemId: string) => void;
  onUpdateNote: (categoryId: string, itemId: string, note: string) => void;
  isNoteExpanded: boolean;
}

function ChecklistItemComponent({
  item,
  categoryId,
  onToggle,
  onToggleNote,
  onUpdateNote,
  isNoteExpanded,
}: ChecklistItemProps) {
  const { t } = useAppTranslation(['checklist', 'common']);
  const [noteText, setNoteText] = useState(item.note || '');

  const handleNoteChange = (text: string) => {
    setNoteText(text);
    onUpdateNote(categoryId, item.id, text);
  };

  return (
    <TouchableOpacity
      style={[styles.checklistItem, item.completed && styles.checklistItemCompleted]}
      onPress={() => onToggle(categoryId, item.id)}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.completed }}
      accessibilityLabel={`${item.title}、${item.completed ? t('checklist:accessibility.itemCompleted') : t('checklist:accessibility.itemIncomplete')}`}
    >
      <View style={styles.itemMain}>
        {/* チェックボックス */}
        <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
          {item.completed && <Ionicons name="checkmark" size={14} color={theme.colors.textWhite} />}
        </View>

        <View style={styles.itemContent}>
          {/* タイトル */}
          <Text style={[styles.itemTitle, item.completed && styles.itemTitleCompleted]}>
            {item.title}
          </Text>

          {/* 説明 */}
          <Text style={styles.itemDescription}>{item.description}</Text>

          {/* タグ */}
          <View style={styles.itemTags}>
            {item.tags.map((tag, index) => (
              <View
                key={index}
                style={[
                  styles.itemTag,
                  tag === t('common:tag.required') && styles.tagRequired,
                  tag === t('common:tag.optional') && styles.tagOptional,
                  (tag === t('common:tag.applicationDoc') || tag === t('common:tag.companyDoc') || tag === t('common:tag.schoolDoc')) && styles.tagDocument,
                ]}
              >
                <Text
                  style={[
                    styles.itemTagText,
                    tag === t('common:tag.required') && styles.tagRequiredText,
                    tag === t('common:tag.optional') && styles.tagOptionalText,
                    (tag === t('common:tag.applicationDoc') || tag === t('common:tag.companyDoc') || tag === t('common:tag.schoolDoc')) && styles.tagDocumentText,
                  ]}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* メモエリア */}
          {isNoteExpanded && (
            <View style={styles.itemNote}>
              <TextInput
                style={styles.noteInput}
                placeholder={t('checklist:note.placeholder')}
                placeholderTextColor={theme.colors.textTertiary}
                value={noteText}
                onChangeText={handleNoteChange}
                multiline
                numberOfLines={3}
                maxLength={500}
                accessibilityLabel={t('checklist:accessibility.noteInput')}
              />
            </View>
          )}

          {/* メモトグルボタン */}
          <TouchableOpacity
            style={styles.noteToggle}
            onPress={() => onToggleNote(item.id)}
            accessibilityLabel={isNoteExpanded ? t('checklist:note.collapse') : t('checklist:note.expand')}
            accessibilityRole="button"
          >
            <Ionicons
              name={isNoteExpanded ? 'chevron-up' : 'create-outline'}
              size={14}
              color={theme.colors.primary}
            />
            <Text style={styles.noteToggleText}>
              {isNoteExpanded ? t('checklist:note.collapse') : t('checklist:note.expand')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ナビゲーションバー
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
  navAction: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },

  // ヘッダーセクション
  headerSection: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.sm,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textWhite,
    opacity: 0.9,
    marginBottom: theme.spacing.lg,
  },

  // プログレスバー
  progressSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textWhite,
  },
  progressPercentage: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textWhite,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.textWhite,
    borderRadius: 4,
  },

  // コンテンツ
  content: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: 0 as any,
      },
    }),
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },

  // リンク
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoLinkText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.primaryDark,
    fontWeight: theme.fontWeight.medium,
    marginLeft: theme.spacing.sm,
  },

  // カテゴリ
  categorySection: {
    marginBottom: theme.spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  categoryTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  categoryCount: {
    backgroundColor: theme.colors.backgroundGray,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.xl,
  },
  categoryCountText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },

  // チェックリスト項目
  checklistItem: {
    backgroundColor: theme.colors.backgroundWhite,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  checklistItemCompleted: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.success,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    minWidth: 24,
    borderWidth: 2,
    borderColor: theme.colors.gray300,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.fontSize.md + 1,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  itemTitleCompleted: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  itemDescription: {
    fontSize: theme.fontSize.sm + 1,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  itemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  itemTag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemTagText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  tagRequired: {
    backgroundColor: theme.colors.errorLight,
  },
  tagRequiredText: {
    color: theme.colors.errorDark,
  },
  tagOptional: {
    backgroundColor: theme.colors.infoLight,
  },
  tagOptionalText: {
    color: theme.colors.infoDark,
  },
  tagDocument: {
    backgroundColor: theme.colors.warningLight,
  },
  tagDocumentText: {
    color: theme.colors.warningDark,
  },

  // メモエリア
  itemNote: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundGray,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noteInput: {
    fontSize: theme.fontSize.sm + 1,
    color: theme.colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  noteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  noteToggleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
    marginLeft: theme.spacing.xs,
  },

  // 区切り線
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },

  // ボトムアクション
  bottomAction: {
    backgroundColor: theme.colors.backgroundWhite,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  btnPrimary: {
    flex: 1,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  btnPrimaryText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textWhite,
  },
  btnPrimaryDisabled: {
    opacity: 0.5,
  },
  btnSecondary: {
    flex: 1,
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
  btnSecondaryText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
});
