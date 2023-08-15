const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
  {
    mode: "development",
    // mode: "production",
    entry: './js/index.js',
    plugins: [
      new HtmlWebpackPlugin({ title: 'dispersion-vr' }),
      new webpack.ProvidePlugin({
        THREE : 'three'
      })
    ],
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
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(map|png|jpe?g|gif)$/i,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
          },
        },
      ],
    },
  },
];
