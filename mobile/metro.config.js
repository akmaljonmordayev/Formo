const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent worker thread issues on Node 24+
config.transformer.unstable_workerThreads = false;

// Only include node_modules that actually exist on this machine
config.resolver.nodeModulesPaths = [
  path.join(__dirname, 'node_modules'),
].filter(fs.existsSync);

// Only watch folders that exist (avoids Metro crash on missing paths)
config.watchFolders = (config.watchFolders || []).filter(
  (folder) => fs.existsSync(folder)
);

module.exports = config;
