import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'LoopOS',
  slug: 'loopos',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0a0a0a',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.loopos.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a0a0a',
    },
    package: 'com.loopos.app',
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
