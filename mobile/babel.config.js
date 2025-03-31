module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Optimize imports
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@utils': './src/utils',
            '@config': './src/config',
            '@assets': './src/assets',
            '@redux': './src/redux',
            '@navigation': './src/navigation',
          },
        },
      ],
      // Reanimated plugin must be listed last
    ],
    // Move reanimated plugin here
    plugins: [
      // Existing module-resolver plugin
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@utils': './src/utils',
            '@config': './src/config',
            '@assets': './src/assets',
            '@redux': './src/redux',
            '@navigation': './src/navigation',
          },
        },
      ],
      // Reanimated plugin listed last
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
