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
  // core jsonld library (standard)
  // larger version for wide compatibilty
  {
    entry: [
      // main lib
      './lib/index.js'
    ],
    filenameBase: 'jsonld',
    targets: {
      // use slightly looser browserslist defaults
      browsers: 'defaults, > 0.25%'
    }
  },
  // core jsonld library (esm)
  // smaller version using features from browsers with ES Modules support
  {
    entry: [
      // main lib
      './lib/index.js'
    ],
    filenameBase: 'jsonld.esm',
    targets: {
      esmodules: true
    }
  },
  // - custom builds can be created by specifying the high level files you need
  // - webpack will pull in dependencies as needed
  // - Note: if using UMD or similar, add jsonld.js *last* to properly export
  //   the top level jsonld namespace.
  // - see Babel and browserslist docs for targets
  //{
  //  entry: ['./lib/FOO.js', ..., './lib/jsonld.js'],
  //  filenameBase: 'jsonld.custom'
  //  libraryTarget: 'umd',
  //  targets: {
  //    // for example, just target latest browsers for development
  //    browsers: 'last 1 chrome version, last 1 firefox version',
  //  }
  //}
];

outputs.forEach(info => {
  // common to bundle and minified
  const common = {
    // each output uses the "jsonld" name but with different contents
    entry: {
      jsonld: info.entry
    },
    // enable for easier debugging
    //optimization: {
    //  minimize: false
    //},
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
              /(node_modules\/lru-cache)/,
              /(node_modules\/rdf-canonize)/,
              /(node_modules\/yallist)/
            ]
          }],
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    useBuiltIns: 'usage',
                    corejs: '3.9',
                    // TODO: remove for babel 8
                    bugfixes: true,
                    //debug: true,
                    targets: info.targets
                  }
                ]
              ],
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
    devtool: 'cheap-module-source-map'
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
