/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {callbackify, normalizeDocumentLoader} = require('./util');

module.exports = class RequestQueue {
  /**
   * Creates a simple queue for requesting documents.
   */
  constructor() {
    this._requests = {};
    this.add = callbackify(this.add.bind(this));
  }

  wrapLoader(loader) {
    const self = this;
    self._loader = normalizeDocumentLoader(loader);
    return function(/* url */) {
      return self.add.apply(self, arguments);
    };
  }

  async add(url) {
    const self = this;

    let promise = self._requests[url];
    if(promise) {
      // URL already queued, wait for it to load
      return Promise.resolve(promise);
    }

    // queue URL and load it
    promise = self._requests[url] = self._loader(url);

    try {
      return await promise;
    } finally {
      delete self._requests[url];
    }
  }
};
