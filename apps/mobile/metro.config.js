/**
 * O código do app usa imports relativos com extensão .js apontando para
 * arquivos .ts/.tsx (convenção NodeNext, herdada do monorepo). O tsc
 * resolve isso nativamente; o Metro não. Este resolver tenta primeiro o
 * caminho sem a extensão (deixando o Metro achar .ts/.tsx) e cai na
 * resolução padrão para .js reais.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: @loopos/shared vive em packages/shared, fora do projectRoot.
// O Metro só enxerga arquivos dentro de projectRoot + watchFolders.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (/^\.\.?\//.test(moduleName) && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      // sem correspondente .ts/.tsx — segue para a resolução padrão
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
