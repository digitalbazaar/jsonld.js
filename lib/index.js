/**
 * jsonld.js library.
 *
 * @author Dave Longley
 *
 * Copyright 2010-2017 Digital Bazaar, Inc.
 */
// FIXME: remove after change to core-js 3 and dropping node6 support
const fromEntries = require('object.fromentries');
if(!Object.fromEntries) {
  fromEntries.shim();
}

if(require('semver').gte(process.version, '8.6.0')) {
  module.exports = require('./jsonld');
} else {
  require('core-js/fn/object/entries');
  module.exports = require('../dist/node6/lib/jsonld');
}
