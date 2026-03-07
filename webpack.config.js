const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
  ...defaultConfig,
  entry: {
    editor: path.resolve(__dirname, 'src', 'editor', 'index.js'),
    view: path.resolve(__dirname, 'src', 'view.js'),
  },
};
