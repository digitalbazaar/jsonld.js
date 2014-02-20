var through  = require('through');
var join     = require('path').join;
var realpath = require('fs').realpathSync;

var libPath  = realpath(join(__dirname, './js/jsonld.js'));

module.exports = function(file) {
  if(realpath(file) !== libPath) {
    return through();
  }

  return through(write, end);

  function write (buf) {
    this.queue(buf);
  }

  function end () {
    this.queue('\nmodule.exports = jsonldjs;');
    this.queue(null);
  }
}