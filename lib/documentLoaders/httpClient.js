/*
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {httpClient} = require('@digitalbazaar/http-client');

module.exports = (options, callback) => {
  return httpClient.get(options.url, options).then((result, error) => {
    //  NOTE: in next major release drop using statusCode
    result.statusCode = result.status;
    // NOTE: data needs to be a string in this case
    callback(error, result, JSON.stringify(result.data, null, 2));
  });
};
