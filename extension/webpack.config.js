const path = require("path");
const webpack = require("webpack");

module.exports = {
  mode: "none",
  entry: "./src/backgroud.js",
  target: "web",

  resolve: {
    extensions: [".js", ".json"],

    modules: ["node_modules", "."],

    // Use our versions of Node modules.
    alias: {
      fs: "browserfs/dist/shims/fs.js",
      buffer: "browserfs/dist/shims/buffer.js",
      path: "browserfs/dist/shims/path.js",
      processGlobal: "browserfs/dist/shims/process.js",
      bufferGlobal: "browserfs/dist/shims/bufferGlobal.js",
      bfsGlobal: require.resolve("browserfs"),
      process: false,
      Buffer: false,
      os: require.resolve("os-browserify"),
      "webworker-threads": false,
      util: require.resolve("util/"),
    },
  },

  // REQUIRED to avoid issue "Uncaught TypeError: BrowserFS.BFSRequire is not a function"
  // See: https://github.com/jvilk/BrowserFS/issues/201
  module: {
    noParse: /browserfs\.js/,
  },

  watch: false,

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "background.js",
  },

  plugins: [
    // Expose BrowserFS, process, and Buffer globals.
    // NOTE: If you intend to use BrowserFS in a script tag, you do not need
    // to expose a BrowserFS global.
    new webpack.ProvidePlugin({
      BrowserFS: "bfsGlobal",
      process: "processGlobal",
      Buffer: "bufferGlobal",
    }),
  ],

  stats: "normal",
};
