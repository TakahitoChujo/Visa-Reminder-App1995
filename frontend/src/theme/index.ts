/**
 * テーマ設定 - 在留資格更新リマインダー
 */

import { colors } from './colors';

export const theme = {
  colors,

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // Font sizes
  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 28,
  },

  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Shadows
  shadow: {
    sm: {
      boxShadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
      elevation: 1,
    },
    md: {
      boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.1)',
      elevation: 3,
    },
    lg: {
      boxShadow: '0px 4px 8px 0px rgba(0, 0, 0, 0.15)',
      elevation: 5,
    },
  },
};

export type Theme = typeof theme;
export { colors };
