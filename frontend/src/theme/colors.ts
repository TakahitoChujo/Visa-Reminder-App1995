/**
 * カラーパレット - 在留資格更新リマインダー
 */

export const colors = {
  // Primary colors
  primary: '#2E5BFF',
  primaryDark: '#1E3DB8',
  primaryLight: '#E8EEFF',

  // Background colors
  background: '#F9FAFB',
  backgroundWhite: '#FFFFFF',
  backgroundGray: '#F3F4F6',

  // Text colors
  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  textWhite: '#FFFFFF',

  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Status colors
  success: '#10B981',
  successLight: '#F0FDF4',
  successDark: '#065F46',

  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#991B1B',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#92400E',

  info: '#2E5BFF',
  infoLight: '#DBEAFE',
  infoDark: '#1E40AF',

  // Gray scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

};

export type ColorName = keyof typeof colors;
