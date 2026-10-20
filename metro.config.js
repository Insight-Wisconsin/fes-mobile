const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  alias: {
    ...config.resolver.alias,
    '@': path.resolve(__dirname, './'),
    '@components': path.resolve(__dirname, './components'),
    '@hooks': path.resolve(__dirname, './hooks'),
    '@constants': path.resolve(__dirname, './constants'),
  },
  extraNodeModules: new Proxy(
    {},
    {
      get: (target, name) => {
        return path.join(process.cwd(), `node_modules/${name}`);
      },
    }
  ),
};

module.exports = config;
