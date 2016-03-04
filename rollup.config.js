var fs = require('fs-extra');
var path = require('path');

export default {
  entry: './js/main.js',
  moduleName: 'jsonld',
  outro: [
    fs.readFileSync(path.join('./js/outro.js')),
  ].join('\n')
};
