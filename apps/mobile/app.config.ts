import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'LoopOS',
  slug: 'loopos',
  owner: 'felici4nos-team',
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
      projectId: 'bd16c8c9-5240-46d1-b0fe-20aa0c6fe635',
    },
  },
};

export default config;
