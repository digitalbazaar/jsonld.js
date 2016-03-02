var rollup = require('rollup');
var commonjs = require('rollup-plugin-commonjs');
var nodeResolve = require('rollup-plugin-node-resolve');

rollup.rollup({
  entry: __dirname + '/js/jsonld.js',
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true
    }),

    commonjs({
      include: __dirname + '/node_modules/**'
    })
  ]
}).then(function(bundle) {
  bundle.write({
    format: 'umd',
    dest: __dirname + '/dist/jsonld.js',
    moduleName: 'jsonld',
    globals: {
      jsonldjs: 'jsonld'
    }
  });
}, function(err) {
  throw err;
});
