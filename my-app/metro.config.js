// @ts-check
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Raster / photo extensions often used in Windows / OneDrive folders (must match sync + catalog scripts)
config.resolver.assetExts.push("jfif", "jpe", "tif", "tiff", "ico", "avif", "heic", "heif");

module.exports = config;
