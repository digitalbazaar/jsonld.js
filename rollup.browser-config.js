import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  entry: './js/main.js',
  format: 'umd',
  moduleName: 'jsonld',
  dest: './dist/browser/jsonld/index.js',
  globals: {
    jsonldjs: 'jsonld',
    JsonLdProcessor: 'jsonld.JsonLdProcessor'
  },
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true,
      browser: true
    }),
    commonjs({
      include: ['node_modules/**'],
    })
  ]
};
