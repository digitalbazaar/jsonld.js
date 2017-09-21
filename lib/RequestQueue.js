/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

module.exports = class RequestQueue {
  /**
   * Creates a simple queue for requesting documents.
   */
  constructor() {
    this._requests = {};
  }

  // TODO: simplify after loaders promise API is simplified
  wrapLoader(loader) {
    const self = this;
    self._loader = loader;
    // TODO: normalize loader instead of implementing two separate APIs
    self._usePromise = (loader.length === 1);
    if(self._usePromise) {
      return function(url) {
        return self.add.apply(self, arguments);
      };
    } else {
      return self.add.bind(self);
    }
  }

  // TODO: simplify and declare `async`
  add(url, callback) {
    const self = this;

    // callback must be given if not using promises
    if(!callback && !self._usePromise) {
      throw new Error('callback must be specified.');
    }

    // Promise-based API
    if(self._usePromise) {
      return new Promise((resolve, reject) => {
        let load = self._requests[url];
        if(!load) {
          // load URL then remove from queue
          load = self._requests[url] = self._loader(url)
            .then(function(remoteDoc) {
              delete self._requests[url];
              return remoteDoc;
            }).catch(function(err) {
              delete self._requests[url];
              throw err;
            });
        }
        // resolve/reject promise once URL has been loaded
        load.then(resolve, reject);
      });
    }

    // callback-based API
    if(url in self._requests) {
      self._requests[url].push(callback);
    } else {
      self._requests[url] = [callback];
      self._loader(url, (err, remoteDoc) => {
        const callbacks = self._requests[url];
        delete self._requests[url];
        for(let i = 0; i < callbacks.length; ++i) {
          callbacks[i](err, remoteDoc);
        }
      });
    }
  }
};
