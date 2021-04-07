/*
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const nodeLoader = require('./documentLoaders/node');

const api = {};
module.exports = api;

/**
 * Setup Node.js document loaders.
 *
 * @param jsonld the jsonld api.
 */
api.setupDocumentLoaders = function(jsonld) {
  jsonld.documentLoaders.node = nodeLoader;
  // use node document loader by default
  jsonld.useDocumentLoader('node');
};

/**
 * Setup Node.js globals.
 *
 * @param jsonld the jsonld api.
 */
/* eslint-disable-next-line no-unused-vars */
api.setupGlobals = function(jsonld) {
  // none for Node.js
};
