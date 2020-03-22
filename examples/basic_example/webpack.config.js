var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ProgressBarPlugin = require('progress-bar-webpack-plugin');

module.exports = {
	entry: path.resolve(__dirname, 'index.js'),
	output: {
		path: path.resolve(__dirname, 'build'),
		filename: 'main.bundle.js'
	},
	resolve: {
		alias: {
			'@bucky24/redux-websocket': path.resolve(__dirname, '../../src/index.js')
		}
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							require.resolve('@babel/preset-env'),
							'@babel/preset-react'
						],
						plugins: ["@babel/plugin-proposal-class-properties"]
					}
				}
			},
			{
				test: /\.css$/,
				loader: 'style-loader'
			},
			{
				test: /\.css$/,
				loader: 'css-loader',
				query: {
					modules: {
						localIdentName: '[name]__[local]___[hash:base64:5]'
					}
				}
			},
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				loaders: [
					'file-loader?hash=sha512&digest=hex&name=[hash].[ext]',
					{
						loader: 'image-webpack-loader',
						query: {
							optipng: {
								optimizationLevel: 4,
							}
						}
					}
				]
			}
		]
	},
	stats: {
		colors: true
	},
	devtool: 'source-map',
	plugins: [
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, 'index.tmpl.html')
		}),
		new ProgressBarPlugin()
	]
};