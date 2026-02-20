/**
 * モバイル用の日付入力コンポーネント
 * カレンダーUIを表示
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../theme';
import { format } from 'date-fns';

interface DateInputProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  style?: any;
}

export function DateInput({ value, onChange, placeholder = '日付を選択してください', style }: DateInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [isFocused, setIsFocused] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      onChange(format(date, 'yyyy-MM-dd'));
    }
  };

  const handlePress = () => {
    setIsFocused(true);
    setShowPicker(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.datePickerButton,
          isFocused && styles.datePickerButtonFocused,
          style
        ]}
        onPress={handlePress}
        onBlur={handleBlur}
        activeOpacity={0.7}
      >
        <Text style={[styles.datePickerText, !value && styles.placeholder]}>
          {value ? format(selectedDate, 'yyyy年M月d日') : placeholder}
        </Text>
        <View style={styles.iconTouchArea}>
          <Ionicons
            name="calendar-outline"
            size={24}
            color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
          locale="ja-JP"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  datePickerButton: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundWhite,
  },
  datePickerButtonFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    paddingHorizontal: theme.spacing.lg - 1,
  },
  datePickerText: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  placeholder: {
    color: theme.colors.textTertiary,
  },
  iconTouchArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -theme.spacing.md,
  },
});
