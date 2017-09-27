/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

module.exports = factory => {
  class JsonLdProcessor {
    toString() {
      return '[object JsonLdProcessor]';
    }
  }

  Object.assign(JsonLdProcessor, factory({version: 'json-ld-1.0'}));

  factory.JsonLdProcessor = JsonLdProcessor;

  Object.defineProperty(JsonLdProcessor, 'prototype', {
    writable: false,
    enumerable: false
  });
  Object.defineProperty(JsonLdProcessor.prototype, 'constructor', {
    writable: true,
    enumerable: false,
    configurable: true,
    value: JsonLdProcessor
  });

  return JsonLdProcessor;
};
