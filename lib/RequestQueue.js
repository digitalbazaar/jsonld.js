/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

module.exports = class RequestQueue {
  /**
   * Creates a simple queue for requesting documents.
   */
  constructor() {
    this._requests = {};
  }

  wrapLoader(loader) {
    const self = this;
    self._loader = loader;
    return function(/* url */) {
      return self.add.apply(self, arguments);
    };
  }

  async add(url) {
    let promise = this._requests[url];
    if(promise) {
      // URL already queued, wait for it to load
      return Promise.resolve(promise);
    }

    // queue URL and load it
    promise = this._requests[url] = this._loader(url);

    try {
      return await promise;
    } finally {
      delete this._requests[url];
    }
  }
};
