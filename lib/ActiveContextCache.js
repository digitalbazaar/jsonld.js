/*
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
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
    this.cache = new Map();
    this.size = size;
  }

  get(activeCtx, localCtx) {
    const level1 = this.cache.get(activeCtx);
    if(level1) {
      const key = JSON.stringify(localCtx);
      const result = level1.get(key);
      return result || null;
    }
    return null;
  }

  set(activeCtx, localCtx, result) {
    if(this.order.length === this.size) {
      const entry = this.order.shift();
      this.cache.get(entry.activeCtx).delete(entry.localCtx);
    }
    const key = JSON.stringify(localCtx);
    this.order.push({activeCtx, localCtx: key});
    let level1 = this.cache.get(activeCtx);
    if(!level1) {
      level1 = new Map();
      this.cache.set(activeCtx, level1);
    }
    level1.set(key, clone(result));
  }
};
