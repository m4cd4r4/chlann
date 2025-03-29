// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add optimizations for Metro bundler
module.exports = {
  ...defaultConfig,
  // Increase the max workers to improve bundling performance
  maxWorkers: 4,
  // Increase the Metro server timeout
  server: {
    ...defaultConfig.server,
    timeoutMs: 120000, // 2 minutes
  },
  // Optimize transformer
  transformer: {
    ...defaultConfig.transformer,
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
    },
  },
  // Optimize resolver
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs'],
    // Avoid processing the same files multiple times
    blockList: [/node_modules\/.*\/node_modules\/react-native\/.*/],
    // Cache resolution results
    useWatchman: true,
    // Ensure symlinks are followed
    resolveRequest: null,
  },
  // Optimize caching
  cacheStores: defaultConfig.cacheStores,
  // Increase the watchFolders array to include all necessary directories
  watchFolders: [__dirname],
};
