//import multiEntry from 'rollup-plugin-multi-entry';
//import commonjs from 'rollup-plugin-commonjs';
//import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  //entry: ['dist/dev/jsonld.js', 'dist/dev/URGNA2012.js', 'dist/dev/_esnextifiedPrivateJsonLdProcessor.js', 'dist/dev/*.js'],
  //entry: 'dist/dev/*.js',
  entry: './js/main.js',
  format: 'umd',
  moduleName: 'jsonld',
  dest: './dist/node/jsonld/index.js',
  //plugins: [multiEntry()]
  /*
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true
    }),
    commonjs({
      include: ['node_modules/**']
    })
  ]
  //*/
};
