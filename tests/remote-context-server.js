var express = require('express');
var path = require('path');

var server = express.createServer();

server.configure(function() {
  server.use(express.methodOverride());
  server.use(CORS);
  server.use(express.static(path.resolve('./contexts')));
});

// use CORS
function CORS(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}

server.listen(8000);