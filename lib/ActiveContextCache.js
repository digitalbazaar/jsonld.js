/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {clone} = require('./util');

module.exports = class ActiveContextCache {
  /**
   * Creates an active context cache.
   *
   * @param size the maximum size of the cache.
   */
  constructor(size = 100) {
    this.order = [];
    this.cache = {};
    this.size = size;
  }

  get(activeCtx, localCtx) {
    const key1 = JSON.stringify(activeCtx);
    const key2 = JSON.stringify(localCtx);
    const level1 = this.cache[key1];
    if(level1 && key2 in level1) {
      return level1[key2];
    }
    return null;
  }

  set(activeCtx, localCtx, result) {
    if(this.order.length === this.size) {
      const entry = this.order.shift();
      delete this.cache[entry.activeCtx][entry.localCtx];
    }
    const key1 = JSON.stringify(activeCtx);
    const key2 = JSON.stringify(localCtx);
    this.order.push({activeCtx: key1, localCtx: key2});
    if(!(key1 in this.cache)) {
      this.cache[key1] = {};
    }
    this.cache[key1][key2] = clone(result);
  }
};
