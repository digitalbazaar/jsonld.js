/**
 * EARL Report
 *
 * @author Dave Longley
 *
 * Copyright (c) 2011-2022 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Create an EARL Reporter.
 *
 * @param options {Object} reporter options
 *          id: {String} report id
 *          env: {Object} environment description
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
  // test environment
  this._environment = null;
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
    'dc:creator': 'https://digitalbazaar.com/',
    'doap:developer': {
      '@id': 'https://digitalbazaar.com/',
      '@type': [
        'foaf:Organization',
        'earl:Assertor'
      ],
      'foaf:name': 'Digital Bazaar, Inc.',
      'foaf:homepage': 'https://digitalbazaar.com/'
    },
    'doap:release': {
      'doap:revision': '',
      'doap:created': today
    },
    'subjectOf': []
  };
  /* eslint-enable quote-props */
  if(this.env && this.env.version) {
    this._report['doap:release']['doap:revision'] = this.env.version;
  }
}

EarlReport.prototype.addAssertion = function(test, pass, options) {
  options = options || {};
  const assertion = {
    '@type': 'earl:Assertion',
    'earl:assertedBy': this._report['doap:developer']['@id'],
    'earl:mode': 'earl:automatic',
    'earl:test': test['@id'],
    'earl:result': {
      '@type': 'earl:TestResult',
      'dc:date': this.now.toISOString(),
      'earl:outcome': pass ? 'earl:passed' : 'earl:failed'
    }
  };
  if(options.benchmarkResult) {
    const result = {
      ...options.benchmarkResult
    };
    if(this._environment) {
      result['jldb:environment'] = this._environment['@id'];
    }
    assertion['jldb:result'] = result;
  }
  this._report.subjectOf.push(assertion);
  return this;
};

EarlReport.prototype.report = function() {
  return this._report;
};

EarlReport.prototype.reportJson = function() {
  return JSON.stringify(this._report, null, 2);
};

/* eslint-disable quote-props */
const _benchmarkContext = {
  'jldb': 'http://json-ld.org/benchmarks/vocab#',
  'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
  'xsd': 'http://www.w3.org/2001/XMLSchema#',

  // environment description
  'jldb:Environment': {'@type': '@id'},

  // per environment
  // label
  // ex: 'Setup 1' (for reports)
  'jldb:label': {'@type': 'xsd:string'},
  // architecture type
  // ex: x86
  'jldb:arch': {'@type': 'xsd:string'},
  // cpu model description (may show multiple cpus)
  // ex: 'Intel(R) Core(TM) i7-4790K CPU @ 4.00GHz'
  'jldb:cpu': {'@type': 'xsd:string'},
  // count of cpus, may not be uniform, just informative
  'jldb:cpuCount': {'@type': 'xsd:integer'},
  // platform name
  // ex: linux
  'jldb:platform': {'@type': 'xsd:string'},
  // runtime name
  // ex: Node.js, Chromium, Ruby
  'jldb:runtime': {'@type': 'xsd:string'},
  // runtime version
  // ex: v14.19.0
  'jldb:runtimeVersion': {'@type': 'xsd:string'},
  // arbitrary comment
  'jldb:comment': 'rdfs:comment',

  // benchmark result
  'jldb:BenchmarkResult': {'@type': '@id'},

  // use in earl:Assertion, type jldb:BenchmarkResult
  'jldb:result': {'@type': '@id'},

  // per BenchmarkResult
  'jldb:environment': {'@type': '@id'},
  'jldb:hz': {'@type': 'xsd:float'},
  'jldb:rme': {'@type': 'xsd:float'}
};
/* eslint-enable quote-props */

// setup @context and environment to handle benchmark data
EarlReport.prototype.setupForBenchmarks = function(options) {
  // add context if needed
  if(!Array.isArray(this._report['@context'])) {
    this._report['@context'] = [this._report['@context']];
  }
  if(!this._report['@context'].some(c => c === _benchmarkContext)) {
    this._report['@context'].push(_benchmarkContext);
  }
  if(options.testEnv) {
    // add report environment
    const fields = [
      ['label', 'jldb:label'],
      ['arch', 'jldb:arch'],
      ['cpu', 'jldb:cpu'],
      ['cpuCount', 'jldb:cpuCount'],
      ['platform', 'jldb:platform'],
      ['runtime', 'jldb:runtime'],
      ['runtimeVersion', 'jldb:runtimeVersion'],
      ['comment', 'jldb:comment']
    ];
    const _env = {
      '@id': '_:environment:0'
    };
    for(const [field, property] of fields) {
      if(options.testEnv[field]) {
        _env[property] = options.testEnv[field];
      }
    }
    this._environment = _env;
    this._report['@included'] = this._report['@included'] || [];
    this._report['@included'].push(_env);
  }
};

module.exports = EarlReport;
