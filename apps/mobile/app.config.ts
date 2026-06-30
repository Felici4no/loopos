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
    bundleIdentifier: 'com.felici4no.loopos',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a0a0a',
    },
    package: 'com.felici4no.loopos',
  },
  experiments: {
    typedRoutes: true,
  },
  // EAS Build/Submit precisa de um projectId.
  // Gerado automaticamente na primeira execução de `eas build` (cria o projeto
  // no servidor EAS se ainda não existir) ou manualmente via `eas init`.
  // Sem segredo aqui — projectId é um identificador público, não uma credencial.
  extra: {
    eas: {
      projectId: undefined, // preenchido por `eas init` / primeiro `eas build`
    },
  },
};

export default config;
