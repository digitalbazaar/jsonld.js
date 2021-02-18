/*
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {httpClient} = require('@digitalbazaar/http-client');

module.exports = (options, callback) => {
  return httpClient(options).then(response => {
    callback(null, response, response.data);
  }).catch(error => callback(error));
};
