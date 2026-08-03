module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    targets: {
      chrome: '58',
    },
    plugins: ['react-native-reanimated/plugin'],
  };
};