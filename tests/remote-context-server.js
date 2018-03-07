const cors = require('cors');
const express = require('express');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.static(path.resolve(path.join(__dirname, 'contexts'))));

const port = 8000;
app.listen(port, function() {
  console.log('Remote context test server running on port ' + port + '...');
});
