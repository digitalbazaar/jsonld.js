/**
 * jsonld.js webpack build rules.
 *
 * @author Digital Bazaar, Inc.
 *
 * Copyright 2010-2017 Digital Bazaar, Inc.
 */
const path = require('path');
const webpackMerge = require('webpack-merge');

// build multiple outputs
module.exports = [];

// custom setup for each output
// all built files will export the "jsonld" library but with different content
const outputs = [
  // core jsonld library
  {
    entry: [
      // 'babel-polyfill' is very large, list features explicitly
      'core-js/features/array/from',
      'core-js/features/array/includes',
      'core-js/features/map',
      'core-js/features/object/assign',
      'core-js/features/promise',
      'core-js/features/set',
      'core-js/features/string/starts-with',
      'core-js/features/symbol',
      // main lib
      './lib/index.js'
    ],
    filenameBase: 'jsonld'
  },
  /*
  // core jsonld library + extra utils and networking support
  {
    entry: ['./lib/index.all.js'],
    filenameBase: 'jsonld.all'
  }
  */
  // custom builds can be created by specifying the high level files you need
  // webpack will pull in dependencies as needed
  // Note: if using UMD or similar, add jsonld.js *last* to properly export
  // the top level jsonld namespace.
  //{
  //  entry: ['./lib/FOO.js', ..., './lib/jsonld.js'],
  //  filenameBase: 'jsonld.custom'
  //  libraryTarget: 'umd'
  //}
];

outputs.forEach(info => {
  // common to bundle and minified
  const common = {
    // each output uses the "jsonld" name but with different contents
    entry: {
      jsonld: info.entry
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: [{
            // exclude node_modules by default
            exclude: /(node_modules)/
          }, {
            // include specific packages
            include: [
              /(node_modules\/canonicalize)/,
              /(node_modules\/rdf-canonize)/
            ]
          }],
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: [
                [
                  '@babel/plugin-proposal-object-rest-spread',
                  {useBuiltIns: true}
                ],
                '@babel/plugin-transform-modules-commonjs',
                '@babel/plugin-transform-runtime'
              ]
            }
          }
        }
      ]
    },
    plugins: [
      //new webpack.DefinePlugin({
      //})
    ],
    // disable various node shims as jsonld handles this manually
    node: {
      Buffer: false,
      crypto: false,
      process: false,
      setImmediate: false
    }
  };

  // plain unoptimized unminified bundle
  const bundle = webpackMerge(common, {
    mode: 'development',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: info.filenameBase + '.js',
      library: info.library || '[name]',
      libraryTarget: info.libraryTarget || 'umd'
    }
  });
  if(info.library === null) {
    delete bundle.output.library;
  }
  if(info.libraryTarget === null) {
    delete bundle.output.libraryTarget;
  }

  // optimized and minified bundle
  const minify = webpackMerge(common, {
    mode: 'production',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: info.filenameBase + '.min.js',
      library: info.library || '[name]',
      libraryTarget: info.libraryTarget || 'umd'
    },
    devtool: 'cheap-module-source-map',
    plugins: [
      /*
      new webpack.optimize.UglifyJsPlugin({
        //beautify: true,
        compress: {
          warnings: true
        },
        output: {
          comments: false
        },
        sourceMap: true
      })
      */
    ]
  });
  if(info.library === null) {
    delete minify.output.library;
  }
  if(info.libraryTarget === null) {
    delete minify.output.libraryTarget;
  }

  module.exports.push(bundle);
  module.exports.push(minify);
});
