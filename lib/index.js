/**
 * jsonld.js library.
 *
 * @author Dave Longley
 *
 * Copyright 2010-2021 Digital Bazaar, Inc.
 */
const platform = require('./platform');
const jsonld = require('./jsonld');
platform.setupGlobals(jsonld);
platform.setupDocumentLoaders(jsonld);
module.exports = jsonld;
