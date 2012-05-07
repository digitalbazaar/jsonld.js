var express = require('express');
var path = require('path');

var server = express.createServer();
server.use('/', express.static(path.resolve('./contexts/')));
server.listen(8000);