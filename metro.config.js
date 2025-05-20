// NOTE: JS 파일을 권장하므로, js로 유지

const { getDefaultConfig } = require('expo/metro-config');
const nodeLibs = require('node-libs-react-native');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);
  const { transformer, resolver } = defaultConfig;

  defaultConfig.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };

  defaultConfig.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
    extraNodeModules: {
      ...nodeLibs,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('readable-stream'),
      http: require.resolve('stream-http'),
      https: require.resolve('stream-http'),
      url: require.resolve('react-native-url-polyfill'),
      zlib: require.resolve('browserify-zlib'),
      assert: require.resolve('assert'),
      net: require.resolve('node-libs-react-native'),
      tls: require.resolve('node-libs-react-native'),
    },
  };

  return defaultConfig;
})();
