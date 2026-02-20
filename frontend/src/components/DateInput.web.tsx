/**
 * Web専用の日付入力コンポーネント
 * HTML5のネイティブdate inputを使用してカレンダーUIを表示
 */

import React from 'react';
import { theme } from '../theme';

interface DateInputProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  style?: any;
}

export function DateInput({ value, onChange, placeholder, style }: DateInputProps) {
  // @ts-ignore - Web specific implementation - DOM elements can be returned directly
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: 48,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.lg,
        fontSize: theme.fontSize.lg,
        color: theme.colors.textPrimary,
        backgroundColor: theme.colors.backgroundWhite,
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
        ...(style as any),
      }}
    />
  );
}
