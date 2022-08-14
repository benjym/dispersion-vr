const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
  {
    mode: "development",
    // mode: "production",
    entry: './js/index.js',
    plugins: [new HtmlWebpackPlugin({ title: 'dispersion-vr' })],
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true,
    },
    devServer: {
      static: {
        directory: '.'
      },
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ["css-loader"],
        },
      ],
    },
  },
];
