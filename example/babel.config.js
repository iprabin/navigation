module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo auto-injects react-native-worklets/plugin (Reanimated 4)
    // when the package is installed — adding it here applies it twice.
    presets: ['babel-preset-expo'],
  };
};
