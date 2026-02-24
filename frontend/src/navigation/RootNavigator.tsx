/**
 * ルートナビゲーター
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { EditScreen } from '../screens/EditScreen';
import { ChecklistScreen } from '../screens/ChecklistScreen';
import { ReminderSettingsScreen } from '../screens/ReminderSettingsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DocumentTemplateScreen } from '../screens/DocumentTemplateScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Edit" component={EditScreen} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} />
      <Stack.Screen name="ReminderSettings" component={ReminderSettingsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="DocumentTemplate" component={DocumentTemplateScreen} />
    </Stack.Navigator>
  );
}
