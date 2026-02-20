/**
 * App.tsx - エントリーポイント
 * 在留資格更新リマインダー
 */

import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useResidenceStore } from './src/store/useResidenceStore';
import { initI18n } from './src/i18n';

// Web用のグローバルスタイルを設定（ScrollView対応）
if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
      }
      body > div,
      #root,
      #root > div {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      /* スクロールバーを常に表示 */
      * {
        scrollbar-width: auto;
        scrollbar-color: #888 #f1f1f1;
      }
      *::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      *::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      *::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 10px;
      }
      *::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    `;
    document.head.appendChild(style);
  }
}

// 開発環境で非推奨警告をフィルタリング
if (__DEV__) {
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args) => {
    const message = args[0]?.toString() || '';

    // shadow系の非推奨警告を無視（ライブラリ内部の問題）
    if (message.includes('shadow') && message.includes('deprecated')) {
      return;
    }

    // Viewの子にテキストノードの警告を無視（react-native-webの厳格なチェック）
    if (message.includes('text node') && message.includes('child of a <View>')) {
      return;
    }

    // pointerEventsの非推奨警告を無視（style.pointerEventsへの移行前の暫定対応）
    if (message.includes('pointerEvents') && message.includes('deprecated')) {
      return;
    }

    originalWarn(...args);
  };

  console.error = (...args) => {
    const message = args[0]?.toString() || '';

    // Viewの子にテキストノードのエラーを無視（react-native-webの厳格なチェック）
    if (message.includes('text node') && message.includes('child of a <View>')) {
      return;
    }

    originalError(...args);
  };
}

// Deep linking設定
const linking = {
  prefixes: ['residencereminder://', 'https://residencereminder.app'],
  config: {
    screens: {
      Home: 'home',
      Register: 'register',
      Edit: 'edit/:cardId',
      Checklist: 'checklist/:cardId',
      ReminderSettings: 'reminder/:cardId',
      Settings: 'settings',
    },
  },
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const { loadData } = useResidenceStore();

  useEffect(() => {
    Promise.all([initI18n(), loadData()]).then(() => setIsReady(true));
  }, [loadData]);

  if (!isReady) return null;

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <NavigationContainer linking={linking}>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
