var cors = require('cors');
var express = require('express');
var path = require('path');

var app = express();

app.use(cors());
app.use(express.static(path.resolve(path.join(__dirname, 'contexts'))));

var port = 8000;
app.listen(port, function() {
  console.log('Remote context test server running on port ' + port + '...');
});
