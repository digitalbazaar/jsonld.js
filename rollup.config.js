var fs = require('fs-extra');
var path = require('path');

export default {
  entry: './lib/main.js',
  moduleName: 'jsonld',
  outro: [
    fs.readFileSync(path.join('./lib/outro.js')),
  ].join('\n'),
  sourceMap: true
};
