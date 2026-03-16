/**
 * 申請理由書テンプレート画面 - 在留資格更新リマインダー
 *
 * 技術・人文知識・国際業務の在留期間更新申請に使用する
 * 「申請理由書」のテンプレートを生成・共有する画面。
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import {
  DocumentTemplateScreenNavigationProp,
  DocumentTemplateScreenRouteProp,
} from '../types/navigation';

// フォームフィールドの状態型
interface FormFields {
  companyName: string;
  fullName: string;
  nationality: string;
  jobTitle: string;
  startDate: string;
  currentPeriod: string;
  jobDescription: string;
}

// フォールバックプレースホルダーを返すユーティリティ
function fieldOrPlaceholder(value: string, placeholder: string): string {
  return value.trim().length > 0 ? value.trim() : placeholder;
}

// テンプレートテキストを生成する純粋関数
function generateTemplateText(fields: FormFields): string {
  const fullName = fieldOrPlaceholder(fields.fullName, '【氏名】');
  const nationality = fieldOrPlaceholder(fields.nationality, '【国籍】');
  const currentPeriod = fieldOrPlaceholder(fields.currentPeriod, '【在留期間】');
  const companyName = fieldOrPlaceholder(fields.companyName, '【会社名】');
  const jobTitle = fieldOrPlaceholder(fields.jobTitle, '【職種】');
  const startDate = fieldOrPlaceholder(fields.startDate, '【入社年月】');
  const jobDescription =
    fields.jobDescription.trim().length > 0
      ? fields.jobDescription.trim()
      : '具体的な業務内容を記載してください。\n例：・システム開発・設計\n・技術仕様書の作成\n・海外取引先との交渉・折衝';

  return `在留期間更新許可申請書に係る理由書

申請人氏名：${fullName}
国籍：${nationality}
現在の在留資格：技術・人文知識・国際業務
現在の在留期間：${currentPeriod}
就労先会社名：${companyName}
職種：${jobTitle}

私は、上記会社において${startDate}より${jobTitle}として就労しております。

【職務内容】
${jobDescription}

引き続き当該会社での就労を継続するため、在留期間の更新を申請いたします。

以上の理由により、在留期間の更新許可を申請いたします。

申請日：　　　年　　月　　日
申請人署名：${fullName}`;
}

export const DocumentTemplateScreen = React.memo(function DocumentTemplateScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DocumentTemplateScreenNavigationProp>();
  const route = useRoute<DocumentTemplateScreenRouteProp>();
  const { residenceLabel } = route.params;

  const [fields, setFields] = useState<FormFields>({
    companyName: '',
    fullName: '',
    nationality: '',
    jobTitle: '',
    startDate: '',
    currentPeriod: '',
    jobDescription: '',
  });

  // フィールド更新ハンドラー（フィールド名でジェネリックに処理）
  const handleFieldChange = useCallback(
    (fieldName: keyof FormFields) =>
      (text: string) => {
        setFields((prev) => ({ ...prev, [fieldName]: text }));
      },
    []
  );

  // テンプレートテキストをリアルタイム生成
  const templateText = generateTemplateText(fields);

  // 共有・コピーハンドラー
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: templateText,
        title: '申請理由書テンプレート',
      });
    } catch {
      // Share API がキャンセルされた場合は何もしない
    }
  }, [templateText]);

  // 戻るボタンハンドラー
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* ナビゲーションバー */}
      <View style={[styles.navBar, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity
          style={styles.navBack}
          onPress={handleGoBack}
          accessibilityLabel="前の画面に戻る"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          申請理由書テンプレート
        </Text>
        {/* 右側スペーサー（ナビバーのタイトルを中央寄せするため） */}
        <View style={styles.navSpacer} />
      </View>

      {/* 免責事項バナー（警告・黄色系） */}
      <View style={styles.disclaimer}>
        <Ionicons name="warning-outline" size={18} color={theme.colors.warningDark} />
        <Text style={styles.disclaimerText}>
          このテンプレートは参考用です。実際の申請前に内容を確認し、必要に応じて行政書士や入管にご相談ください。
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 在留資格ラベル表示 */}
        {residenceLabel.length > 0 && (
          <View style={styles.residenceBadge}>
            <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.residenceBadgeText}>{residenceLabel}</Text>
          </View>
        )}

        {/* ---- フォームセクション ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>申請者情報の入力</Text>

          {/* 会社名 */}
          <Text style={styles.fieldLabel}>就労先会社名</Text>
          <TextInput
            style={styles.fieldInput}
            value={fields.companyName}
            onChangeText={handleFieldChange('companyName')}
            placeholder="例：株式会社〇〇テクノロジー"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="next"
            accessibilityLabel="就労先会社名の入力欄"
          />

          {/* 氏名 */}
          <Text style={styles.fieldLabel}>氏名（ローマ字またはカタカナ）</Text>
          <TextInput
            style={styles.fieldInput}
            value={fields.fullName}
            onChangeText={handleFieldChange('fullName')}
            placeholder="例：YAMADA TARO"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="characters"
            returnKeyType="next"
            accessibilityLabel="氏名の入力欄"
          />

          {/* 国籍 */}
          <Text style={styles.fieldLabel}>国籍</Text>
          <TextInput
            style={styles.fieldInput}
            value={fields.nationality}
            onChangeText={handleFieldChange('nationality')}
            placeholder="例：中国、ベトナム、インド"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="next"
            accessibilityLabel="国籍の入力欄"
          />

          {/* 職種 */}
          <Text style={styles.fieldLabel}>職種</Text>
          <TextInput
            style={styles.fieldInput}
            value={fields.jobTitle}
            onChangeText={handleFieldChange('jobTitle')}
            placeholder="例：システムエンジニア、マーケティング担当"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="next"
            accessibilityLabel="職種の入力欄"
          />

          {/* 入社年月 */}
          <Text style={styles.fieldLabel}>入社年月</Text>
          <TextInput
            style={styles.fieldInput}
            value={fields.startDate}
            onChangeText={handleFieldChange('startDate')}
            placeholder="例：2020年4月"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="next"
            accessibilityLabel="入社年月の入力欄"
          />

          {/* 現在の在留期間 */}
          <Text style={styles.fieldLabel}>現在の在留期間</Text>
          <TextInput
            style={styles.fieldInput}
            value={fields.currentPeriod}
            onChangeText={handleFieldChange('currentPeriod')}
            placeholder="例：3年（2026年3月31日まで）"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="next"
            accessibilityLabel="現在の在留期間の入力欄"
          />

          {/* 業務内容の詳細 */}
          <Text style={styles.fieldLabel}>業務内容の詳細</Text>
          <TextInput
            style={styles.fieldInputMultiline}
            value={fields.jobDescription}
            onChangeText={handleFieldChange('jobDescription')}
            placeholder={
              '例：\n・Webアプリケーションのシステム設計・開発\n・技術仕様書・設計書の作成\n・海外取引先との技術的な折衝・コミュニケーション'
            }
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            accessibilityLabel="業務内容の詳細の入力欄"
          />
        </View>

        {/* ---- プレビューセクション ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>生成されたテンプレート</Text>
          <Text style={styles.previewHint}>
            テキストを長押しして選択・コピーできます。
          </Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText} selectable>
              {templateText}
            </Text>
          </View>
        </View>

        {/* 下部免責事項（スクロール内） */}
        <View style={styles.footerDisclaimer}>
          <Ionicons name="alert-circle-outline" size={14} color={theme.colors.textTertiary} />
          <Text style={styles.footerDisclaimerText}>
            このテンプレートはAIが生成した参考情報です。実際の申請前に入管または行政書士にご確認ください。
          </Text>
        </View>
      </ScrollView>

      {/* 固定フッター：共有ボタン */}
      <View style={[styles.bottomAction, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          accessibilityLabel="テンプレートを共有またはコピーする"
          accessibilityRole="button"
        >
          <Ionicons name="share-outline" size={20} color={theme.colors.textWhite} />
          <Text style={styles.shareButtonText}>テンプレートを共有・コピー</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // ---- レイアウト ----
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ---- ナビゲーションバー ----
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
    flex: 1,
    textAlign: 'center',
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginHorizontal: theme.spacing.sm,
  },
  navSpacer: {
    width: 40,
  },

  // ---- 免責事項バナー（ページ上部・固定） ----
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  disclaimerText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.warningDark,
    lineHeight: 18,
  },

  // ---- スクロールコンテンツ ----
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },

  // ---- 在留資格バッジ ----
  residenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  residenceBadgeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryDark,
    fontWeight: theme.fontWeight.medium,
  },

  // ---- セクション ----
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  // ---- フォームフィールド ----
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  fieldInput: {
    backgroundColor: theme.colors.backgroundWhite,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    height: 44,
  },
  fieldInputMultiline: {
    backgroundColor: theme.colors.backgroundWhite,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // ---- プレビューセクション ----
  previewHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  previewBox: {
    backgroundColor: theme.colors.backgroundWhite,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
  },
  previewText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    fontFamily: 'monospace' as const,
  },

  // ---- スクロール内 フッター免責事項 ----
  footerDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.backgroundGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  footerDisclaimerText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    lineHeight: 17,
  },

  // ---- 固定フッター（共有ボタン） ----
  bottomAction: {
    backgroundColor: theme.colors.backgroundWhite,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  shareButton: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  shareButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textWhite,
  },
});
