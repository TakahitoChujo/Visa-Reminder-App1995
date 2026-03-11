// Jest setup file

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  mergeItem: jest.fn().mockResolvedValue(undefined),
  multiMerge: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-secure-store
const secureStoreData = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key, value) => {
    secureStoreData[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key) => {
    return Promise.resolve(secureStoreData[key] || null);
  }),
  deleteItemAsync: jest.fn((key) => {
    delete secureStoreData[key];
    return Promise.resolve();
  }),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn((size) => {
    const array = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return Promise.resolve(array);
  }),
  digestStringAsync: jest.fn((algorithm, data) => {
    // Simple hash mock
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash = hash & hash;
    }
    return Promise.resolve(Math.abs(hash).toString(16).padStart(64, '0'));
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
}));

// Mock react-native Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const Platform = {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
    Version: 15,
  };
  return Platform;
});

// Mock react-native module
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
    Version: 15,
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
    hairlineWidth: 1,
  },
  View: 'View',
  Text: 'Text',
  Alert: { alert: jest.fn() },
}));

// Mock IndexedDB for Web tests
global.indexedDB = {
  open: jest.fn(() => ({
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
  })),
};

// Mock sessionStorage and localStorage
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

// Mock btoa/atob for Node.js environment
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Mock TextEncoder/TextDecoder
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock i18next for tests
jest.mock('i18next', () => {
  const jaCommon = require('./src/i18n/locales/ja/common.json');

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const i18n = {
    language: 'ja',
    t: jest.fn((key) => {
      // Handle namespace:key format (e.g., 'common:error.memoEncryptionFailed')
      const parts = key.split(':');
      const actualKey = parts.length > 1 ? parts[1] : parts[0];
      return getNestedValue(jaCommon, actualKey) || key;
    }),
    use: jest.fn(() => i18n),
    init: jest.fn(() => Promise.resolve()),
    changeLanguage: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    off: jest.fn(),
  };
  return { __esModule: true, default: i18n, ...i18n };
});

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: (key) => key,
    i18n: { language: 'ja', changeLanguage: jest.fn() },
  })),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'ja', regionCode: 'JP' }]),
  locale: 'ja-JP',
}));

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
