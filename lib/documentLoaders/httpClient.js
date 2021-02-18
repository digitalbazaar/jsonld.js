/*
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {httpClient} = require('@digitalbazaar/http-client');

module.exports = (options, callback) => {
  return httpClient.get(options.url, options).then((result, error) => {
    result.statusCode = result.status;
    callback(error, result, result.data);
  });
};
