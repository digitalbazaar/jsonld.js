/**
 * Misc tests.
 */
// disable so tests can be copy & pasted
/* eslint-disable quotes, quote-props */
const jsonld = require('..');
const assert = require('assert');

// TODO: need more tests for jsonld.link and jsonld.merge

describe('link tests', () => {
  const doc = {
    "@id": "ex:1",
    "a:foo": {
      "@id": "ex:1"
    }
  };

  it('should create a circular link', done => {
    const p = jsonld.link(doc, {});
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(output => {
      assert.equal(output, output['a:foo']);
      done();
    });
  });
});

describe('merge tests', () => {
  const docA = {"@id": "ex:1", "a:foo": [{"@value": 1}]};
  const docB = {"@id": "ex:1", "b:foo": [{"@value": 2}]};
  const merged = [Object.assign({}, docA, docB)];
  const context = {};
  const ctxMerged = {"@graph": [{"@id": "ex:1", "a:foo": 1, "b:foo": 2}]};

  it('should merge nodes from two different documents', done => {
    const p = jsonld.merge([docA, docB]);
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(output => {
      assert.deepEqual(output, merged);
      done();
    });
  });

  it('should merge nodes from two different documents with context', done => {
    const p = jsonld.merge([docA, docB], context);
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(output => {
      assert.deepEqual(output, ctxMerged);
      done();
    });
  });
});

describe('createNodeMap', () => {
  const doc = {"@id": "ex:1", "a:property": [{"@id": "ex:2"}]};
  it('should create a flattened node hashmap', () => {
    const expected = {
      "ex:1": {
        "@id": "ex:1",
        "a:property": [ {"@id": "ex:2"} ]
      },
      "ex:2": {"@id": "ex:2"}
    };

    return jsonld.createNodeMap(doc).then(map => {
      assert.deepEqual(map, expected);
    });
  });
});

describe('other toRDF tests', () => {
  const emptyRdf = [];

  it('should process with options and promise', done => {
    const p = jsonld.toRDF({}, {});
    assert(p instanceof Promise);
    /* eslint-disable-next-line no-unused-vars */
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with no options and promise', done => {
    const p = jsonld.toRDF({});
    assert(p instanceof Promise);
    /* eslint-disable-next-line no-unused-vars */
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should fail with no args and promise', done => {
    const p = jsonld.toRDF();
    assert(p instanceof Promise);
    /* eslint-disable-next-line no-unused-vars */
    p.then(output => {
      assert.fail();
    }).catch(e => {
      assert(e);
      done();
    });
  });

  it('should fail for bad format and promise', done => {
    const p = jsonld.toRDF({}, {format: 'bogus'});
    assert(p instanceof Promise);
    p.then(() => {
      assert.fail();
    }).catch(e => {
      assert(e);
      assert.equal(e.name, 'jsonld.UnknownFormat');
      done();
    });
  });

  it('should handle N-Quads format', done => {
    const doc = {
      "@id": "https://example.com/",
      "https://example.com/test": "test"
    };
    const p = jsonld.toRDF(doc, {format: 'application/n-quads'});
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(output => {
      assert.equal(
        output,
        '<https://example.com/> <https://example.com/test> "test" .\n');
      done();
    });
  });

  it('should handle deprecated N-Quads format', done => {
    const doc = {
      "@id": "https://example.com/",
      "https://example.com/test": "test"
    };
    const p = jsonld.toRDF(doc, {format: 'application/nquads'});
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(output => {
      assert.equal(
        output,
        '<https://example.com/> <https://example.com/test> "test" .\n');
      done();
    });
  });
});

describe('other fromRDF tests', () => {
  const emptyNQuads = '';
  const emptyRdf = [];

  it('should process with options and promise', done => {
    const p = jsonld.fromRDF(emptyNQuads, {});
    assert(p instanceof Promise);
    /* eslint-disable-next-line no-unused-vars */
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with no options and promise', done => {
    const p = jsonld.fromRDF(emptyNQuads);
    assert(p instanceof Promise);
    /* eslint-disable-next-line no-unused-vars */
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should fail with no args and promise', done => {
    const p = jsonld.fromRDF();
    assert(p instanceof Promise);
    /* eslint-disable-next-line no-unused-vars */
    p.then(output => {
      assert.fail();
    }).catch(e => {
      assert(e);
      done();
    });
  });

  it('should fail for bad format and promise', done => {
    const p = jsonld.fromRDF(emptyNQuads, {format: 'bogus'});
    assert(p instanceof Promise);
    p.then(() => {
      assert.fail();
    }).catch(e => {
      assert(e);
      assert.equal(e.name, 'jsonld.UnknownFormat');
      done();
    });
  });

  it('should handle N-Quads format', done => {
    const nq = '<https://example.com/> <https://example.com/test> "test" .\n';
    const p = jsonld.fromRDF(nq, {format: 'application/n-quads'});
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(output => {
      assert.deepEqual(
        output,
        [{
          "@id": "https://example.com/",
          "https://example.com/test": [{
            "@value": "test"
          }]
        }]);
      done();
    });
  });

  it('should handle deprecated N-Quads format', done => {
    const nq = '<https://example.com/> <https://example.com/test> "test" .\n';
    const p = jsonld.fromRDF(nq, {format: 'application/nquads'});
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(output => {
      assert.deepEqual(
        output,
        [{
          "@id": "https://example.com/",
          "https://example.com/test": [{
            "@value": "test"
          }]
        }]);
      done();
    });
  });
});

describe('loading multiple levels of contexts', () => {
  const documentLoader = url => {
    if(url === 'https://example.com/context1') {
      return {
        document: {
          "@context": {
            "ex": "https://example.com/#"
          }
        },
        contextUrl: null,
        documentUrl: url
      };
    }
    if(url === 'https://example.com/context2') {
      return {
        document: {
          "@context": {
            "ex": "https://example.com/#"
          }
        },
        contextUrl: null,
        documentUrl: url
      };
    }
  };
  const doc = {
    "@context": "https://example.com/context1",
    "ex:foo": {
      "@context": "https://example.com/context2",
      "ex:bar": "test"
    }
  };
  const expected = [{
    "https://example.com/#foo": [{
      "https://example.com/#bar": [{
        "@value": "test"
      }]
    }]
  }];

  it('should handle loading multiple levels of contexts (promise)', () => {
    return jsonld.expand(doc, {documentLoader}).then(output => {
      assert.deepEqual(output, expected);
    });
  });
});

describe('url tests', () => {
  it('should detect absolute IRIs', done => {
    // absolute IRIs
    assert(jsonld.url.isAbsolute('a:'));
    assert(jsonld.url.isAbsolute('a:b'));
    assert(jsonld.url.isAbsolute('a:b:c'));
    // blank nodes
    assert(jsonld.url.isAbsolute('_:'));
    assert(jsonld.url.isAbsolute('_:a'));
    assert(jsonld.url.isAbsolute('_:a:b'));

    // not absolute or blank node
    assert(!jsonld.url.isAbsolute(':'));
    assert(!jsonld.url.isAbsolute('a'));
    assert(!jsonld.url.isAbsolute('/:'));
    assert(!jsonld.url.isAbsolute('/a:'));
    assert(!jsonld.url.isAbsolute('/a:b'));
    assert(!jsonld.url.isAbsolute('_'));
    done();
  });
});

describe('js keywords', () => {
  it('expand js valueOf/toString keywords (top ctx)', async () => {
    const d =
{
  "@context": {
    "valueOf": "http://example.org/valueOf",
    "toString": "http://example.org/toString"
  },
  "valueOf": "first",
  "toString": "second"
}
;
    const ex =
[
  {
    "http://example.org/toString": [
      {
        "@value": "second"
      }
    ],
    "http://example.org/valueOf": [
      {
        "@value": "first"
      }
    ]
  }
]
;
    const e = await jsonld.expand(d);
    assert.deepStrictEqual(e, ex);
  });

  it('expand js valueOf/toString keywords (sub ctx)', async () => {
    const d =
{
  "@context": {
    "@version": 1.1,
    "ex:thing": {
      "@context": {
        "valueOf": "http://example.org/valueOf",
        "toString": "http://example.org/toString"
      }
    }
  },
  "ex:thing": {
    "valueOf": "first",
    "toString": "second"
  }
}
;
    const ex =
[
  {
    "ex:thing": [
      {
        "http://example.org/toString": [
          {
            "@value": "second"
          }
        ],
        "http://example.org/valueOf": [
          {
            "@value": "first"
          }
        ]
      }
    ]
  }
]
;
    const e = await jsonld.expand(d);
    assert.deepStrictEqual(e, ex);
  });

  it('compact js valueOf/toString keywords', async () => {
    const d =
{
  "@context": {
    "valueOf": "http://example.org/valueOf",
    "toString": "http://example.org/toString"
  },
  "valueOf": "first",
  "toString": "second"
}
;
    const ctx =
{
  "@context": {
    "valueOf": "http://example.org/valueOf",
    "toString": "http://example.org/toString"
  }
}
;
    const ex =
{
  "@context": {
    "valueOf": "http://example.org/valueOf",
    "toString": "http://example.org/toString"
  },
  "valueOf": "first",
  "toString": "second"
}
;
    const e = await jsonld.compact(d, ctx);
    assert.deepStrictEqual(e, ex);
  });

  it('frame js valueOf/toString keywords', async () => {
    const d =
{
  "@context": {
    "@vocab": "http://example.org/"
  },
  "toString": {
    "valueOf": "thing"
  }
}
;
    const frame =
{
  "@context": {
    "@vocab": "http://example.org/"
  },
  "toString": {}
}
;
    const ex =
{
  "@context": {
    "@vocab": "http://example.org/"
  },
  "toString": {
    "valueOf": "thing"
  }
}
;
    const e = await jsonld.frame(d, frame);
    assert.deepStrictEqual(e, ex);
  });
});

describe('literal JSON', () => {
  it('handles error', done => {
    const d =
'_:b0 <ex:p> "bogus"^^<http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON> .'
;
    const p = jsonld.fromRDF(d);
    assert(p instanceof Promise);
    p.then(() => {
      assert.fail();
    }).catch(e => {
      assert(e);
      assert.equal(e.name, 'jsonld.InvalidJsonLiteral');
      done();
    });
  });
});

// test both events and expansionMaps
describe('events', () => {
  // track all the event counts
  // use simple count object (don't use tricky test keys!)
  function addEventCounts(counts, event) {
    // overall call counts
    counts.events = counts.events || 0;
    counts.codes = counts.codes || {};

    counts.codes[event.code] = counts.codes[event.code] || 0;

    counts.events++;
    counts.codes[event.code]++;
  }

  // track event and counts
  // use simple count object (don't use tricky test keys!)
  function trackEvent({events, event}) {
    events.counts = events.counts || {};
    events.log = events.log || [];

    addEventCounts(events.counts, event);
    // just log useful comparison details
    events.log.push({
      code: event.code,
      level: event.level,
      details: event.details
    });
  }

  // track all the map counts
  // use simple count object (don't use tricky test keys!)
  function addMapCounts(counts, info) {
    // overall call count
    counts.expansionMap = counts.expansionMap || 0;
    counts.expansionMap++;

    if(info.unmappedProperty) {
      const c = counts.unmappedProperty = counts.unmappedProperty || {};
      const k = info.unmappedProperty;
      c[k] = c[k] || 0;
      c[k]++;
    }

    if(info.unmappedValue) {
      const c = counts.unmappedValue = counts.unmappedValue || {};
      const v = info.unmappedValue;
      let k;
      if(Object.keys(v).length === 1 && '@id' in v) {
        k = v['@id'];
      } else {
        k = '__unknown__';
      }
      c[k] = c[k] || 0;
      c[k]++;
    }

    if(info.relativeIri) {
      const c = counts.relativeIri = counts.relativeIri || {};
      const k = info.relativeIri;
      c[k] = c[k] || 0;
      c[k]++;
    }

    if(info.prependedIri) {
      const c = counts.prependedIri = counts.prependedIri || {};
      const k = info.prependedIri.value;
      c[k] = c[k] || 0;
      c[k]++;
    }
  }

  // track map and counts
  // use simple count object (don't use tricky test keys!)
  function trackMap({maps, info}) {
    maps.counts = maps.counts || {};
    maps.log = maps.log || [];

    addMapCounts(maps.counts, info);
    // just log useful comparison details
    // FIXME
    maps.log.push(info);
    //maps.log.push({
    //  xxx: info.xxx
    //});
  }

  // test different apis
  // use appropriate options
  async function _test({
    // expand, compact, frame, fromRdf, toRdf, etc
    type,
    input,
    expected,
    exception,
    mapCounts,
    mapLog,
    eventCounts,
    eventLog,
    options,
    testSafe,
    testNotSafe,
    testStrict,
    testNotStrict,
    verbose
  }) {
    const maps = {counts: {}, log: []};
    const expansionMap = info => {
      trackMap({maps, info});
    };
    const events = {counts: {}, log: []};
    const eventHandler = ({event}) => {
      trackEvent({events, event});
    };

    let result;
    let error;
    const opts = {...options};
    if(mapCounts || mapLog) {
      opts.expansionMap = expansionMap;
    }
    if(eventCounts || eventLog) {
      opts.eventHandler = eventHandler;
    }
    if(!['expand'].includes(type)) {
      throw new Error(`Unknown test type: "${type}"`);
    }
    try {
      if(type === 'expand') {
        result = await jsonld.expand(input, opts);
      }
    } catch(e) {
      error = e;
    }

    if(verbose) {
      console.log(JSON.stringify({
        type,
        input,
        options,
        expected,
        result,
        maps,
        events
      }, null, 2));
    }
    if(exception) {
      assert(error);
      assert.equal(error.name, exception);
    }
    if(!exception && error) {
      throw error;
    }
    if(expected) {
      assert.deepStrictEqual(result, expected);
    }
    if(mapCounts) {
      assert.deepStrictEqual(maps.counts, mapCounts);
    }
    if(mapLog) {
      assert.deepStrictEqual(maps.log, mapLog);
    }
    if(eventCounts) {
      assert.deepStrictEqual(events.counts, eventCounts);
    }
    if(eventLog) {
      assert.deepStrictEqual(events.log, eventLog);
    }
    // test passes with safe=true
    if(testSafe) {
      await _test({type, input, options: {...options, safe: true}});
    }
    // test fails with safe=true
    if(testNotSafe) {
      let error;
      try {
        await _test({type, input, options: {...options, safe: true}});
      } catch(e) {
        error = e;
      }

      assert(error);
    }
    // test passes with strict event handler
    if(testStrict) {
      await _test({
        type, input, options: {
          eventHandler: jsonld.strictEventHandler
        }
      });
    }
    // test fails with strict event handler
    if(testNotStrict) {
      let error;
      try {
        await _test({
          type, input, options: {
            eventHandler: jsonld.strictEventHandler
          }
        });
      } catch(e) {
        error = e;
      }

      assert(error);
    }
  }

  describe('event system', () => {
    it('check default handler called', async () => {
      const d =
{
  "relative": "test"
}
;
      const ex = [];

      const counts = {};
      const eventHandler = ({event}) => {
        addEventCounts(counts, event);
      };

      jsonld.setDefaultEventHandler({eventHandler});

      const e = await jsonld.expand(d);

      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(counts, {
        codes: {
          'dropping empty object': 1,
          'invalid property expansion': 1,
          'relative IRI after expansion': 2
        },
        events: 4
      });

      // reset default
      jsonld.setDefaultEventHandler();
    });

    it('handle warning event with function', async () => {
      const d =
{
  "@context": {
    "@RESERVED": "ex:test-function-handler"
  },
  "@RESERVED": "test"
}
;
      const ex = [];

      const counts = {};
      const e = await jsonld.expand(d, {
        eventHandler: ({event}) => {
          addEventCounts(counts, event);
        }
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(counts, {
        codes: {
          'dropping empty object': 1,
          'invalid property expansion': 1,
          'invalid reserved term': 1
        },
        events: 3
      });
    });

    it('cached context event replay', async () => {
      const d =
{
  "@context": {
    "@RESERVED": "ex:test"
  },
  "@RESERVED": "test"
}
;
      const ex = [];

      const counts0 = {};
      const counts1 = {};
      const e0 = await jsonld.expand(d, {
        eventHandler: {
          'invalid reserved term': ({event}) => {
            addEventCounts(counts0, event);
          }
        }
      });
      // FIXME: ensure cache is being used
      const e1 = await jsonld.expand(d, {
        eventHandler: {
          'invalid reserved term': ({event}) => {
            addEventCounts(counts1, event);
          }
        }
      });
      assert.deepStrictEqual(e0, ex);
      assert.deepStrictEqual(e1, ex);
      assert.deepStrictEqual(counts0, {
        codes: {
          'invalid reserved term': 1
        },
        events: 1
      }, 'counts 0');
      assert.deepStrictEqual(counts1, {
        codes: {
          'invalid reserved term': 1
        },
        events: 1
      }, 'counts 1');
    });

    it('handle warning event with array of functions', async () => {
      const d =
{
  "@context": {
    "@RESERVED": "ex:test-function-array-handler"
  },
  "@RESERVED": "test"
}
;
      const ex = [];

      const handlerCounts0 = {};
      const handlerCounts1 = {};
      const handledCounts = {};
      const e = await jsonld.expand(d, {
        eventHandler: [
          ({event, next}) => {
            addEventCounts(handlerCounts0, event);
            // skip to next handler
            next();
          },
          ({event}) => {
            addEventCounts(handlerCounts1, event);
            if(event.code === 'invalid reserved term') {
              addEventCounts(handledCounts, event);
              return;
            }
          }
        ]
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(handlerCounts0, {
        codes: {
          'dropping empty object': 1,
          'invalid property expansion': 1,
          'invalid reserved term': 1
        },
        events: 3
      }, 'counts handler 0');
      assert.deepStrictEqual(handlerCounts1, {
        codes: {
          'dropping empty object': 1,
          'invalid property expansion': 1,
          'invalid reserved term': 1
        },
        events: 3
      }, 'counts handler 1');
      assert.deepStrictEqual(handledCounts, {
        codes: {
          'invalid reserved term': 1
        },
        events: 1
      }, 'counts handled');
    });

    it('handle warning event early with array of functions', async () => {
      const d =
{
  "@context": {
    "@RESERVED": "ex:test-function-array-handler"
  },
  "@RESERVED": "test"
}
;
      const ex = [];

      const handlerCounts0 = {};
      const handlerCounts1 = {};
      const handledCounts = {};
      const e = await jsonld.expand(d, {
        eventHandler: [
          ({event}) => {
            addEventCounts(handlerCounts0, event);
            // don't skip to next handler
          },
          ({event}) => {
            addEventCounts(handlerCounts1, event);
            if(event.code === 'invalid reserved term') {
              addEventCounts(handledCounts, event);
              return;
            }
          }
        ]
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(handlerCounts0, {
        codes: {
          'dropping empty object': 1,
          'invalid property expansion': 1,
          'invalid reserved term': 1
        },
        events: 3
      }, 'counts handler 0');
      assert.deepStrictEqual(handlerCounts1, {}, 'counts handler 1');
      assert.deepStrictEqual(handledCounts, {}, 'counts handled');
    });

    it('handle warning event with code:function object', async () => {
      const d =
{
  "@context": {
    "@RESERVED": "ex:test-object-handler"
  },
  "@RESERVED": "test"
}
;
      const ex = [];

      const counts = {};
      const e = await jsonld.expand(d, {
        eventHandler: {
          'invalid reserved term': ({event}) => {
            addEventCounts(counts, event);
            assert.strictEqual(event.details.term, '@RESERVED');
          }
        }
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(counts, {
        codes: {
          'invalid reserved term': 1
        },
        events: 1
      }, 'counts');
    });

    it('handle warning event with complex handler', async () => {
      const d =
{
  "@context": {
    "@RESERVED": "ex:test-complex-handler"
  },
  "@RESERVED": "test"
}
;
      const ex = [];

      const handlerCounts0 = {};
      const handlerCounts1 = {};
      const handlerCounts2 = {};
      const handlerCounts3 = {};
      const e = await jsonld.expand(d, {
        eventHandler: [
          ({event, next}) => {
            addEventCounts(handlerCounts0, event);
            next();
          },
          [
            ({event, next}) => {
              addEventCounts(handlerCounts1, event);
              next();
            },
            {
              'bogus code': () => {}
            }
          ],
          ({event, next}) => {
            addEventCounts(handlerCounts2, event);
            next();
          },
          {
            'invalid reserved term': ({event}) => {
              addEventCounts(handlerCounts3, event);
            }
          }
        ]
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(handlerCounts0, {
        codes: {
          'dropping empty object': 1,
          'invalid property expansion': 1,
          'invalid reserved term': 1
        },
        events: 3
      }, 'counts handler 0');
      assert.deepStrictEqual(handlerCounts1, {
        codes: {
          'dropping empty object': 1,
          'invalid property expansion': 1,
          'invalid reserved term': 1
        },
        events: 3
      }, 'counts handler 1');
      assert.deepStrictEqual(handlerCounts2, {
        codes: {
          'dropping empty object': 1,
          'invalid property expansion': 1,
          'invalid reserved term': 1
        },
        events: 3
      }, 'counts handler 2');
      assert.deepStrictEqual(handlerCounts3, {
        codes: {
          'invalid reserved term': 1
        },
        events: 1
      }, 'counts handler 3');
    });

    it('handle known warning events', async () => {
      const d =
{
  "@context": {
    "id-at": {"@id": "@test"},
    "@RESERVED": "ex:test"
  },
  "@RESERVED": "test",
  "ex:language": {
    "@value": "test",
    "@language": "!"
  }
}
;
      const ex =
[
  {
    "ex:language": [
      {
        "@value": "test",
        "@language": "!"
      }
    ]
  }
]
;

      const handledReservedTermCounts = {};
      const handledReservedValueCounts = {};
      const handledLanguageCounts = {};
      const e = await jsonld.expand(d, {
        eventHandler: {
          'invalid reserved term': ({event}) => {
            addEventCounts(handledReservedTermCounts, event);
          },
          'invalid reserved value': ({event}) => {
            addEventCounts(handledReservedValueCounts, event);
          },
          'invalid @language value': ({event}) => {
            addEventCounts(handledLanguageCounts, event);
          }
        }
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(handledReservedTermCounts, {
        codes: {
          'invalid reserved term': 1
        },
        events: 1
      }, 'handled reserved term counts');
      assert.deepStrictEqual(handledReservedValueCounts, {
        codes: {
          'invalid reserved value': 1
        },
        events: 1
      }, 'handled reserved value counts');
      assert.deepStrictEqual(handledLanguageCounts, {
        codes: {
          'invalid @language value': 1
        },
        events: 1
      }, 'handled language counts');

      // dataset with invalid language tag
      // Equivalent N-Quads:
      // <ex:s> <ex:p> "..."^^<https://www.w3.org/ns/i18n#!_rtl> .'
      // Using JSON dataset to bypass N-Quads parser checks.
      const d2 =
[
  {
    "subject": {
      "termType": "NamedNode",
      "value": "ex:s"
    },
    "predicate": {
      "termType": "NamedNode",
      "value": "ex:p"
    },
    "object": {
      "termType": "Literal",
      "value": "invalid @language value",
      "datatype": {
        "termType": "NamedNode",
        "value": "https://www.w3.org/ns/i18n#!_rtl"
      }
    },
    "graph": {
      "termType": "DefaultGraph",
      "value": ""
    }
  }
]
;
      const ex2 =
[
  {
    "@id": "ex:s",
    "ex:p": [
      {
        "@value": "invalid @language value",
        "@language": "!",
        "@direction": "rtl"
      }
    ]
  }
]
;

      const handledLanguageCounts2 = {};
      const e2 = await jsonld.fromRDF(d2, {
        rdfDirection: 'i18n-datatype',
        eventHandler: {
          'invalid @language value': ({event}) => {
            addEventCounts(handledLanguageCounts2, event);
          }
        }
      });
      assert.deepStrictEqual(e2, ex2);
      assert.deepStrictEqual(handledLanguageCounts2, {
        codes: {
          'invalid @language value': 1
        },
        events: 1
      }, 'handled language counts');
    });
  });

  describe('unmappedValue', () => {
    it('should have zero counts with empty list', async () => {
      const input = [];
      const expected = [];

      console.error('FIXME');

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {},
        // FIXME
        eventCounts: {},
        // FIXME
        testSafe: true,
        testStrict: true
      });
    });

    it('should have zero counts with empty object', async () => {
      const input = {};
      const expected = [];

      console.error('FIXME');

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 1,
          unmappedValue: {
            '__unknown__': 1
          }
        },
        eventCounts: {
          codes: {
            'dropping empty object': 1
          },
          events: 1
        },
        testNotSafe: true,
        testNotStrict: true
      });
    });

    it('should have zero counts with no terms', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  }
}
;
      const expected = [];

      console.error('FIXME');
      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 1,
          unmappedValue: {
            '__unknown__': 1
          }
        },
        eventCounts: {
          codes: {
            'dropping empty object': 1
          },
          events: 1
        },
        testNotSafe: true,
        testNotStrict: false
      });
    });

    it('should notify for @set free-floating scaler', async () => {
      const input =
{
  "@set": [
    "free-floating strings in set objects are removed",
    {
      "@id": "http://example.com/free-floating-node"
    },
    {
      "@id": "http://example.com/node",
      "urn:property": "nodes with properties are not removed"
    }
  ]
}
;
      const expected =
[
  {
    "@id": "http://example.com/node",
    "urn:property": [
      {
        "@value": "nodes with properties are not removed"
      }
    ]
  }
]
;

      console.error('FIXME');
      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 4,
          unmappedValue: {
            '__unknown__': 2,
            'http://example.com/free-floating-node': 2
          }
        },
        eventCounts: {
          codes: {
            'dropping free-floating scalar': 1,
            'dropping object with only @id': 1,
            'no value after expansion': 2
          },
          events: 4
        }
      });
    });

    it('should notify for @list free-floating scaler', async () => {
      const input =
{
  "@list": [
    "free-floating strings in list objects are removed",
    {
      "@id": "http://example.com/free-floating-node"
    },
    {
      "@id": "http://example.com/node",
      "urn:property": "nodes are removed with the @list"
    }
  ]
}
;
      const expected = [];

      console.error('FIXME');
      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 5,
          unmappedValue: {
            '__unknown__': 3,
            'http://example.com/free-floating-node': 2
          }
        },
        eventCounts: {
          codes: {
            'dropping free-floating scalar': 1,
            'dropping object with only @id': 1,
            'dropping object with only @list': 1,
            'no value after expansion': 2
          },
          events: 5
        }
      });
    });

    it('should notify for null @value', async () => {
      const input =
{
  "urn:property": {
    "@value": null
  }
}
;
      const expected = [];

      console.error('FIXME');
      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 3,
          unmappedValue: {
            '__unknown__': 3
          }
        },
        eventCounts: {
          codes: {
            'dropping empty object': 1,
            'no value after expansion': 1
          },
          events: 2
        }
      });
    });

    it('should notify for @language alone', async () => {
      const input =
{
  "urn:property": {
    "@language": "en"
  }
}
;
      const expected = [];

      console.error('FIXME');
      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 3,
          unmappedValue: {
            '__unknown__': 2
          }
        },
        eventCounts: {
          codes: {
            'dropping empty object': 1,
            'dropping object with only @language': 1,
          },
          events: 2
        }
      });
    });
  });

  describe('unmappedProperty', () => {
    it('should have zero counts with absolute term', async () => {
      const input =
{
  "urn:definedTerm": "is defined"
}
;
      const expected =
[
  {
    "urn:definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {},
        eventCounts: {}
      });
    });

    it('should have zero counts with mapped term', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "definedTerm": "is defined"
}
;
      const expected =
[
  {
    "https://example.com#definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {},
        eventCounts: {}
      });
    });

    // XXX
    it('should be called on unmapped term with no context', async () => {
      const input =
{
  "testUndefined": "is undefined"
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 4,
          relativeIri: {
            testUndefined: 2
          },
          unmappedProperty: {
            testUndefined: 1
          },
          unmappedValue: {
            '__unknown__': 1
          }
        },
        eventCounts: {
          codes: {
            'dropping empty object': 1,
            'invalid property expansion': 1,
            'relative IRI after expansion': 2
          },
          events: 4
        },
        eventLog: [
          {
            code: 'relative IRI after expansion',
            details: {
              value: 'testUndefined'
            },
            level: 'warning'
          },
          {
            code: 'relative IRI after expansion',
            details: {
              value: 'testUndefined'
            },
            level: 'warning'
          },
          {
            code: 'invalid property expansion',
            details: {
              property: 'testUndefined'
            },
            level: 'warning'
          }
        ],
        testNotSafe: true,
        testNotStrict: true
      });
    });

    it('should be called on unmapped term with context [1]', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "testUndefined": "is undefined"
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 4,
          relativeIri: {
            testUndefined: 2
          },
          unmappedProperty: {
            testUndefined: 1
          },
          unmappedValue: {
            '__unknown__': 1
          }
        },
        eventCounts: {
          codes: {
            'dropping empty object': 1,
            'invalid property expansion': 1,
            'relative IRI after expansion': 2
          },
          events: 4
        }
      });
    });

    it('should be called on unmapped term with context [2]', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "definedTerm": "is defined",
  "testUndefined": "is undefined"
}
;
      const expected =
[
  {
    "https://example.com#definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 3,
          relativeIri: {
            testUndefined: 2
          },
          unmappedProperty: {
            testUndefined: 1
          }
        },
        eventCounts: {
          codes: {
            'invalid property expansion': 1,
            'relative IRI after expansion': 2
          },
          events: 3
        }
      });
    });

    it('should be called on nested unmapped term', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "definedTerm": {
    "testUndefined": "is undefined"
  }
}
;
      const expected =
[
  {
    "https://example.com#definedTerm": [
      {}
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 3,
          relativeIri: {
            testUndefined: 2
          },
          unmappedProperty: {
            testUndefined: 1
          }
        },
        eventCounts: {
          codes: {
            'invalid property expansion': 1,
            'relative IRI after expansion': 2
          },
          events: 3
        }
      });
    });
  });

  // FIXME naming
  describe('relativeIri', () => {
    it('should be called on relative IRI for id term [1]', async () => {
      const input =
{
  "@id": "relativeiri"
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 3,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            relativeiri: 1
          },
          unmappedValue: {
            relativeiri: 1
          }
        },
        eventCounts: {
          codes: {
            'dropping object with only @id': 1,
            'relative IRI after expansion': 1
          },
          events: 2
        }
      });
    });

    it('should be called on relative IRI for id term [2]', async () => {
      const input =
{
  "@id": "relativeiri",
  "urn:test": "value"
}
;
      const expected =
[
  {
    "@id": "relativeiri",
    "urn:test": [
      {
        "@value": "value"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            relativeiri: 1
          }
        },
        eventCounts: {
          codes: {
            'relative IRI after expansion': 1
          },
          events: 1
        }
      });
    });

    it('should be called on relative IRI for id term [3]', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "@id": "relativeiri",
  "definedTerm": "is defined"
}
;
      const expected =
[
  {
    "@id": "relativeiri",
    "https://example.com#definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            relativeiri: 1
          }
        },
        eventCounts: {
          codes: {
            'relative IRI after expansion': 1
          },
          events: 1
        }
      });
    });

    it('should be called on relative IRI for id term (nested)', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "@id": "urn:absoluteIri",
  "definedTerm": {
    "@id": "relativeiri"
  }
}
;
      const expected =
[
  {
    "@id": "urn:absoluteIri",
    "https://example.com#definedTerm": [
      {
        "@id": "relativeiri"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            relativeiri: 1
          }
        },
        eventCounts: {
          codes: {
            'relative IRI after expansion': 1
          },
          events: 1
        }
      });
    });

    it('should be called on relative IRI for aliased id term', async () => {
      const input =
{
  "@context": {
    "id": "@id",
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "relativeiri",
  "definedTerm": "is defined"
}
;
      const expected =
[
  {
    "@id": "relativeiri",
    "https://example.com#definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            relativeiri: 1
          }
        },
        eventCounts: {
          codes: {
            'relative IRI after expansion': 1
          },
          events: 1
        }
      });
    });

    it('should be called on relative IRI for type term', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "urn:absoluteiri",
  "@type": "relativeiri",
  "definedTerm": "is defined"
}
;
      const expected =
[
  {
    "@type": [
      "relativeiri"
    ],
    "https://example.com#definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 6,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            id: 2,
            relativeiri: 2
          },
          unmappedProperty: {
            id: 1
          }
        },
        eventCounts: {
          codes: {
            'invalid property expansion': 1,
            'relative IRI after expansion': 4
          },
          events: 5
        }
      });
    });

    it('should be called on relative IRI for type ' +
      'term in scoped context', async () => {
      const input =
{
  "@context": {
    "definedType": {
      "@id": "https://example.com#definedType",
      "@context": {
        "definedTerm": "https://example.com#definedTerm"

      }
    }
  },
  "id": "urn:absoluteiri",
  "@type": "definedType",
  "definedTerm": {
    "@type": "relativeiri"
  }
}
;
      const expected =
[
  {
    "@type": [
      "https://example.com#definedType"
    ],
    "https://example.com#definedTerm": [
      {
        "@type": [
          "relativeiri"
        ]
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 6,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            id: 2,
            relativeiri: 2
          },
          unmappedProperty: {
            id: 1
          }
        },
        eventCounts: {
          codes: {
            'invalid property expansion': 1,
            'relative IRI after expansion': 4
          },
          events: 5
        }
      });
    });

    it('should be called on relative IRI for ' +
      'type term with multiple relative IRI types', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "urn:absoluteiri",
  "@type": ["relativeiri", "anotherRelativeiri"],
  "definedTerm": "is defined"
}
;
      const expected =
[
  {
    "@type": [
      "relativeiri",
      "anotherRelativeiri"
    ],
    "https://example.com#definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 8,
          prependedIri: {
            anotherRelativeiri: 1,
            relativeiri: 1
          },
          relativeIri: {
            anotherRelativeiri: 1,
            id: 2,
            relativeiri: 2
          },
          unmappedProperty: {
            id: 1
          }
        },
        eventCounts: {
          codes: {
            'invalid property expansion': 1,
            'relative IRI after expansion': 5
          },
          events: 6
        }
      });
    });

    it('should be called on relative IRI for ' +
      'type term with multiple relative IRI types in scoped context' +
      '', async () => {
      const input =
{
  "@context": {
    "definedType": {
      "@id": "https://example.com#definedType",
      "@context": {
        "definedTerm": "https://example.com#definedTerm"
      }
    }
  },
  "id": "urn:absoluteiri",
  "@type": "definedType",
  "definedTerm": {
    "@type": ["relativeiri", "anotherRelativeiri" ]
  }
}
;
      const expected =
[
  {
    "@type": [
      "https://example.com#definedType"
    ],
    "https://example.com#definedTerm": [
      {
        "@type": [
          "relativeiri",
          "anotherRelativeiri"
        ]
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 8,
          prependedIri: {
            anotherRelativeiri: 1,
            relativeiri: 1
          },
          relativeIri: {
            anotherRelativeiri: 1,
            id: 2,
            relativeiri: 2
          },
          unmappedProperty: {
            id: 1
          }
        },
        eventCounts: {
          codes: {
            'invalid property expansion': 1,
            'relative IRI after expansion': 5
          },
          events: 6
        }
      });
    });

    it('should be called on relative IRI for ' +
      'type term with multiple types', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "urn:absoluteiri",
  "@type": ["relativeiri", "definedTerm"],
  "definedTerm": "is defined"
}
;
      const expected =
[
  {
    "@type": [
      "relativeiri",
      "https://example.com#definedTerm"
    ],
    "https://example.com#definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 6,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            id: 2,
            relativeiri: 2
          },
          unmappedProperty: {
            id: 1
          }
        },
        eventCounts: {
          codes: {
            'invalid property expansion': 1,
            'relative IRI after expansion': 4
          },
          events: 5
        }
      });
    });

    it('should be called on relative IRI for aliased type term', async () => {
      const input =
{
  "@context": {
    "type": "@type",
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "urn:absoluteiri",
  "type": "relativeiri",
  "definedTerm": "is defined"
};
      const expected =
[
  {
    "@type": [
      "relativeiri"
    ],
    "https://example.com#definedTerm": [
      {
        "@value": "is defined"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 6,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            id: 2,
            relativeiri: 2
          },
          unmappedProperty: {
            id: 1
          }
        },
        eventCounts: {
          codes: {
            'invalid property expansion': 1,
            'relative IRI after expansion': 4
          },
          events: 5
        }
      });
    });

    it('should be called on relative IRI when ' +
      '@base value is `null`', async () => {
      const input =
{
  "@context": {
    "@base": null
  },
  "@id": "relativeiri"
}
;
      const expected =
[
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 3,
          prependedIri: {
            'relativeiri': 1
          },
          relativeIri: {
            'relativeiri': 1
          },
          unmappedValue: {
            'relativeiri': 1
          }
        },
        eventCounts: {
          codes: {
            'dropping object with only @id': 1,
            'relative IRI after expansion': 1
          },
          events: 2
        }
      });
    });

    it('should be called on relative IRI when ' +
      '@base value is `./`', async () => {
      const input =
{
  "@context": {
    "@base": "./"
  },
  "@id": "relativeiri"
}
;
      const expected =
[
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 3,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            '/relativeiri': 1
          },
          unmappedValue: {
            '/relativeiri': 1
          }
        },
        eventCounts: {
          codes: {
            'dropping object with only @id': 1,
            'relative IRI after expansion': 1
          },
          events: 2
        }
      });
    });

    it('should be called on relative IRI when ' +
      '`@vocab` value is `null`', async () => {
      const input =
{
  "@context": {
    "@vocab": null
  },
  "@type": "relativeiri"
}
;
      const expected =
[
  {
    "@type": [
      "relativeiri"
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 3,
          prependedIri: {
            relativeiri: 1
          },
          relativeIri: {
            'relativeiri': 2
          }
        },
        eventCounts: {
          codes: {
            'relative IRI after expansion': 2
          },
          events: 2
        }
      });
    });

    it('should be called on relative IRI when ' +
      '`@vocab` value is `./`', async () => {
      const input =
{
  "@context": {
    "@vocab": "./"
  },
  "@type": "relativeiri"
}
;
      const expected =
[
  {
    "@type": [
      "/relativeiri"
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 6,
          prependedIri: {
            './': 1,
            relativeiri: 2
          },
          relativeIri: {
            '/': 1,
            '/relativeiri': 2
          }
        },
        eventCounts: {
          codes: {
            'relative IRI after expansion': 3
          },
          events: 3
        }
      });
    });
  });

  describe('prependedIri', () => {
    it('should be called when property is ' +
      'being expanded with `@vocab`', async () => {
      const input =
{
  "@context": {
    "@vocab": "http://example.com/"
  },
  "term": "termValue"
};
      const expected =
[
  {
    "http://example.com/term": [
      {
        "@value": "termValue"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 4,
          prependedIri: {
            term: 4
          }
        },
        eventCounts: {}
      });
    });

    it('should be called when `@type` is ' +
      'being expanded with `@vocab`', async () => {
      const input =
{
  "@context": {
    "@vocab": "http://example.com/"
  },
  "@type": "relativeIri"
}
;
      const expected =
[
  {
    "@type": [
      "http://example.com/relativeIri"
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeIri: 2
          }
        },
        eventCounts: {}
      });
    });

    it('should be called when aliased `@type` is ' +
      'being expanded with `@vocab`', async () => {
      const input =
{
  "@context": {
    "@vocab": "http://example.com/",
    "type": "@type"
  },
  "type": "relativeIri"
}
;
      const expected =
[
  {
    "@type": [
      "http://example.com/relativeIri"
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeIri: 2
          }
        },
        eventCounts: {}
      });
    });

    it('should be called when `@id` is being ' +
      'expanded with `@base`', async () => {
      const input =
{
  "@context": {
    "@base": "http://example.com/"
  },
  "@id": "relativeIri"
}
;
      const expected =
[
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeIri: 1
          },
          unmappedValue: {
            'http://example.com/relativeIri': 1
          }
        },
        eventCounts: {
          codes: {
            'dropping object with only @id': 1
          },
          events: 1
        }
      });
    });

    it('should be called when aliased `@id` ' +
      'is being expanded with `@base`', async () => {
      const input =
{
  "@context": {
    "@base": "http://example.com/",
    "id": "@id"
  },
  "id": "relativeIri"
}
;
      const expected =
[
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeIri: 1
          },
          unmappedValue: {
            'http://example.com/relativeIri': 1
          }
        },
        eventCounts: {
          codes: {
            'dropping object with only @id': 1
          },
          events: 1
        },
        testNotSafe: true,
        testNotStrict: true
      });
    });

    it('should be called when `@type` is ' +
      'being expanded with `@base`', async () => {
      const input =
{
  "@context": {
    "@base": "http://example.com/"
  },
  "@type": "relativeIri"
}
;
      const expected =
[
  {
    "@type": [
      "http://example.com/relativeIri"
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeIri: 1
          },
          relativeIri: {
            relativeIri: 1
          }
        },
        eventCounts: {
          codes: {
            'relative IRI after expansion': 1
          },
          events: 1,
          //FIXME: true
        }
      });
    });

    it('should be called when aliased `@type` is ' +
      'being expanded with `@base`', async () => {
      const input =
{
  "@context": {
    "@base": "http://example.com/",
    "type": "@type"
  },
  "type": "relativeIri"
}
;
      const expected =
[
  {
    "@type": [
      "http://example.com/relativeIri"
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        mapCounts: {
          expansionMap: 2,
          prependedIri: {
            relativeIri: 1
          },
          relativeIri: {
            relativeIri: 1
          }
        },
        eventCounts: {
          codes: {
            'relative IRI after expansion': 1
          },
          events: 1,
          //FIXME: true
        },
        eventLog: []
      });
    });
  });
});
