/**
 * オンボーディング画面
 * 初回起動時にアプリの機能を説明し、言語を選択してもらう
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { OnboardingScreenNavigationProp } from '../types/navigation';
import { useUserStore } from '../store/useUserStore';
import { SUPPORTED_LANGUAGES, SupportedLanguage, changeLanguage } from '../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_COUNT = 5;

type SlideKey = 'slide1' | 'slide2' | 'slide3' | 'slide4' | 'slide5';

interface SlideConfig {
  key: SlideKey;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}

const SLIDES: SlideConfig[] = [
  { key: 'slide1', icon: 'shield-checkmark', iconColor: theme.colors.primary, iconBg: theme.colors.primaryLight },
  { key: 'slide2', icon: 'create', iconColor: theme.colors.success, iconBg: theme.colors.successLight },
  { key: 'slide3', icon: 'notifications', iconColor: theme.colors.warning, iconBg: theme.colors.warningLight },
  { key: 'slide4', icon: 'checkbox', iconColor: theme.colors.info, iconBg: theme.colors.infoLight },
  { key: 'slide5', icon: 'language', iconColor: theme.colors.primary, iconBg: theme.colors.primaryLight },
];

const LANGUAGE_OPTIONS = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
  code: code as SupportedLanguage,
  label: info.nativeLabel,
}));

export const OnboardingScreen = React.memo(function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { t, i18n } = useTranslation('onboarding');
  const { completeOnboarding } = useUserStore();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'ja'
  );

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    setCurrentIndex(index);
  }, []);

  const goToSlide = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDE_COUNT - 1) {
      goToSlide(currentIndex + 1);
    }
  }, [currentIndex, goToSlide]);

  const handleSkip = useCallback(async () => {
    await completeOnboarding();
    navigation.replace('Home');
  }, [completeOnboarding, navigation]);

  const handleStart = useCallback(async () => {
    if (selectedLanguage !== i18n.language) {
      await changeLanguage(selectedLanguage);
    }
    await completeOnboarding();
    navigation.replace('Home');
  }, [selectedLanguage, i18n.language, completeOnboarding, navigation]);

  const handleSelectLanguage = useCallback(async (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    await changeLanguage(lang);
  }, []);

  const isLastSlide = currentIndex === SLIDE_COUNT - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Skip ボタン */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel={t('button.skip')}
        >
          <Text style={styles.skipText}>{t('button.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* スライドエリア */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        accessibilityLabel="onboarding slides"
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.key} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* アイコン */}
            <View style={[styles.iconContainer, { backgroundColor: slide.iconBg }]}>
              <Ionicons name={slide.icon} size={64} color={slide.iconColor} />
            </View>

            {/* テキスト */}
            <Text style={styles.slideTitle}>{t(`${slide.key}.title`)}</Text>
            <Text style={styles.slideDescription}>{t(`${slide.key}.description`)}</Text>

            {/* 言語選択（最後のスライドのみ） */}
            {index === SLIDE_COUNT - 1 && (
              <View style={styles.languageSection}>
                <Text style={styles.languageLabel}>{t('language.selectLabel')}</Text>
                <View style={styles.languageList}>
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const isSelected = selectedLanguage === lang.code;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          styles.languageOption,
                          isSelected && styles.languageOptionSelected,
                        ]}
                        onPress={() => handleSelectLanguage(lang.code)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={lang.label}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={theme.colors.primary}
                            style={styles.languageCheckIcon}
                          />
                        )}
                        {!isSelected && (
                          <View style={styles.languageRadioEmpty} />
                        )}
                        <Text
                          style={[
                            styles.languageOptionText,
                            isSelected && styles.languageOptionTextSelected,
                          ]}
                        >
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* ページインジケーター */}
      <View style={styles.indicators}>
        {SLIDES.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
            onPress={() => goToSlide(index)}
            accessibilityRole="button"
            accessibilityLabel={`Slide ${index + 1}`}
          />
        ))}
      </View>

      {/* Next / Start ボタン */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={isLastSlide ? handleStart : handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLastSlide ? t('button.start') : t('button.next')}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? t('button.start') : t('button.next')}
          </Text>
          {!isLastSlide && (
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textWhite} style={styles.nextIcon} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundWhite,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: theme.spacing.xl,
    zIndex: 10,
    padding: theme.spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textTertiary,
    fontWeight: theme.fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
  },
  iconContainer: {
    width: 128,
    height: 128,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  slideTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 36,
  },
  slideDescription: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  languageSection: {
    marginTop: theme.spacing.xxl,
    width: '100%',
    maxWidth: 340,
  },
  languageLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  languageList: {
    gap: theme.spacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundWhite,
    minHeight: 52,
  },
  languageOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  languageCheckIcon: {
    marginRight: theme.spacing.md,
  },
  languageRadioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.md,
  },
  languageOptionText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  languageOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  nextButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textWhite,
  },
  nextIcon: {
    marginLeft: theme.spacing.sm,
  },
});
