/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    $0: 'jest',
    jest: { testTimeout: 120000 },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      // Expo Managed Workflow: npx expo run:ios でネイティブビルドを生成
      build: 'npx expo run:ios --configuration Debug',
      binaryPath:
        'ios/build/Build/Products/Debug-iphonesimulator/residencereminder.app',
    },
    'android.debug': {
      type: 'android.apk',
      // Expo Managed Workflow: npx expo run:android でネイティブビルドを生成
      build: 'npx expo run:android',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_33' },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
