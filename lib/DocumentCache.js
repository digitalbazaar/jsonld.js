/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

module.exports = class DocumentCache {
  /**
   * Creates a simple document cache that retains documents for a short
   * period of time.
   *
   * FIXME: Implement simple HTTP caching instead.
   *
   * @param options the options to use:
   *          [size] the maximum size of the cache (default: 50).
   *          [expires] expiration time for each entry in ms (default: 30000).
   */
  constructor({size = 50, expires = 30000}) {
    this.order = [];
    this.cache = {};
    this.size = size;
    this.expires = expires;
  }

  get(url) {
    if(url in this.cache) {
      const entry = this.cache[url];
      if(entry.expires >= Date.now()) {
        return entry.ctx;
      }
      delete this.cache[url];
      this.order.splice(this.order.indexOf(url), 1);
    }
    return null;
  }

  set(url, ctx) {
    if(this.order.length === this.size) {
      delete this.cache[this.order.shift()];
    }
    this.order.push(url);
    this.cache[url] = {ctx, expires: (Date.now() + this.expires)};
  }
};
