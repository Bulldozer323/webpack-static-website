const path = require('path');
const fs = require('fs');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSVGPlugin = require('html-webpack-inline-svg-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const webpack = require('webpack');

const entries = {
    entry: ['./src/js/index.js', './src/css/main.css'],
    output: {
        filename: 'js/[name].js',
    },
    resolve: {
        alias: {
            '~': path.resolve(__dirname, './'),
        },
    },

    devtool: 'source-map',
};

// HTML
const generateHtmlPlugins = (templateDir) => {
    const templateFiles = fs.readdirSync(path.resolve(__dirname, templateDir));
    return templateFiles.map(item => {
        const parts = item.split('.');
        const name = parts[0];
        const extension = parts[1];
        return new HtmlWebpackPlugin({
            filename: `${name}.html`,
            hash: true,
            template: path.resolve(__dirname, `${templateDir}/${name}.${extension}`),
            inject: false,
            minify: {
                collapseWhitespace: true,
                removeStyleLinkTypeAttributes: true,
                removeScriptTypeAttributes: true,
                removeComments: true,
            },
        });
    });
};

const htmlPlugins = generateHtmlPlugins('./src/html/pages');

// Plugins
const pluginsMain = [
    new HtmlWebpackInlineSVGPlugin({
        runPreEmit: true,
    }),
    new MiniCssExtractPlugin({
        filename: 'css/[name].css',
    }),
    new CopyWebpackPlugin([
        {
            from: './src/img',
            to: './img',
        },
        {
            from: './src/video',
            to: './video'
        },
        {
            from: './src/fonts',
            to: './fonts',
        },
    ]),
];

const pluginsDev = {
    plugins: [
        ...htmlPlugins,
        ...pluginsMain,
    ]
};

const pluginsProd = {
    plugins: [
        new webpack.ProgressPlugin(),
        new CleanWebpackPlugin(),
        new FaviconsWebpackPlugin({
            logo: './src/favicon/favicon.png',
            prefix: 'favicon/',
        }),
        ...htmlPlugins,
        ...pluginsMain,
    ]
};

// Server
const devServer = {
    overlay: true,
    port: 9000,
    stats: 'errors-only',
};

// Build
module.exports = (env, argv) => {
    const {mode} = argv;
    const postCssPluginsProd = [
        require('postcss-combine-media-query'),
        require('cssnano')({
            preset: [
                'default',
                {
                    discardComments: {
                        removeAll: true
                    },
                },
            ],
        }),
    ];

    const modules = {
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                        },
                    },
                },
                {
                    test: /\.css$/,
                    include: path.resolve(__dirname, 'src/css'),
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                ident: 'postcss',
                                sourceMap: true,
                                plugins: [
                                    require('postcss-import')({
                                        plugins: [
                                            require('stylelint')({
                                                configFile: `src/css/.stylelintrc`,
                                            }),
                                        ],
                                    }),
                                    require('postcss-preset-env')({ stage: 0 }),
                                    require('postcss-focus'),
                                    require('autoprefixer'),
                                ].concat(mode === 'production' ? postCssPluginsProd : []),
                            }
                        }
                    ]
                },
                {
                    test: /\.(woff|woff(2)|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                name: '[name].[ext]',
                                outputPath: 'fonts',
                                publicPath: '../fonts',
                            }
                        }
                    ]
                },
                {
                    test: /\.(png|jpg|gif|svg)$/,
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'img',
                        publicPath: '../img',
                    }
                },
                {
                    test: /\.(mp4)$/,
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'video',
                        publicPath: '../video'
                    }
                },
                {
                    test: /\.html$/,
                    include: path.resolve(__dirname, 'src/html/templates'),
                    use: ['raw-loader'],
                }
            ]
        }
    };

    switch (mode) {
        case 'development': return ({
            ...entries,
            ...modules,
            ...pluginsDev,
            devServer,
        });
        case 'production': return ({
            ...entries,
            ...modules,
            ...pluginsProd,
        });
        default: break;
    }
};
