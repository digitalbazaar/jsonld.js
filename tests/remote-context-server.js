var express = require('express');
var path = require('path');

var server = express();

server.configure(function() {
  server.use(express.methodOverride());
  server.use(CORS);
  server.use(express.static(path.resolve(path.join(__dirname, 'contexts'))));
});

// use CORS
function CORS(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}

server.listen(8000);
console.log('Remote context test server running...');
