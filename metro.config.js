// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .txt to asset extensions so Metro treats them as assets
config.resolver.assetExts.push('txt');

module.exports = config;

