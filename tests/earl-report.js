/**
 * EARL Report
 *
 * @author Dave Longley
 *
 * Copyright (c) 2011-2017 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Create an EARL Reporter.
 *
 * @param options {Object} reporter options
 *          id: {String} report id
 *          env: {String} environment description
 */
function EarlReport(options) {
  let today = new Date();
  today = today.getFullYear() + '-' +
    (today.getMonth() < 9 ?
      '0' + (today.getMonth() + 1) : today.getMonth() + 1) + '-' +
    (today.getDate() < 10 ? '0' + today.getDate() : today.getDate());
  // one date for tests with no subsecond resolution
  this.now = new Date();
  this.now.setMilliseconds(0);
  this.id = options.id;
  this.env = options.env;
  /* eslint-disable quote-props */
  this._report = {
    '@context': {
      'doap': 'http://usefulinc.com/ns/doap#',
      'foaf': 'http://xmlns.com/foaf/0.1/',
      'dc': 'http://purl.org/dc/terms/',
      'earl': 'http://www.w3.org/ns/earl#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'jsonld': 'http://www.w3.org/ns/json-ld#',
      'doap:homepage': {'@type': '@id'},
      'doap:license': {'@type': '@id'},
      'dc:creator': {'@type': '@id'},
      'foaf:homepage': {'@type': '@id'},
      'subjectOf': {'@reverse': 'earl:subject'},
      'earl:assertedBy': {'@type': '@id'},
      'earl:mode': {'@type': '@id'},
      'earl:test': {'@type': '@id'},
      'earl:outcome': {'@type': '@id'},
      'dc:date': {'@type': 'xsd:date'},
      'doap:created': {'@type': 'xsd:date'}
    },
    '@id': 'https://github.com/digitalbazaar/jsonld.js',
    '@type': [
      'doap:Project',
      'earl:TestSubject',
      'earl:Software'
    ],
    'doap:name': 'jsonld.js',
    'dc:title': 'jsonld.js',
    'doap:homepage': 'https://github.com/digitalbazaar/jsonld.js',
    'doap:license':
      'https://github.com/digitalbazaar/jsonld.js/blob/master/LICENSE',
    'doap:description': 'A JSON-LD processor for JavaScript',
    'doap:programming-language': 'JavaScript',
    'dc:creator': 'https://github.com/dlongley',
    'doap:developer': {
      '@id': 'https://github.com/dlongley',
      '@type': [
        'foaf:Person',
        'earl:Assertor'
      ],
      'foaf:name': 'Dave Longley',
      'foaf:homepage': 'https://github.com/dlongley'
    },
    'doap:release': {
      'doap:name': '',
      'doap:revision': '',
      'doap:created': today
    },
    'subjectOf': []
  };
  /* eslint-enable quote-props */
  this._report['@id'] +=
    '#' + this.id;
  this._report['doap:name'] +=
    ' ' + this.id + (this.env ? ' ' + this.env : '');
  this._report['dc:title'] +=
    ' ' + this.id + (this.env ? ' ' + this.env : '');
}

EarlReport.prototype.addAssertion = function(test, pass, options) {
  options = options || {};
  this._report.subjectOf.push({
    '@type': 'earl:Assertion',
    'earl:assertedBy': this._report['doap:developer']['@id'],
    'earl:mode': 'earl:automatic',
    'earl:test': test['@id'],
    'earl:result': {
      '@type': 'earl:TestResult',
      'dc:date': this.now.toISOString(),
      'earl:outcome': pass ? 'earl:passed' : 'earl:failed'
      ...options.extra
    }
  });
  return this;
};

EarlReport.prototype.report = function() {
  return this._report;
};

EarlReport.prototype.reportJson = function() {
  return JSON.stringify(this._report, null, 2);
};

module.exports = EarlReport;
