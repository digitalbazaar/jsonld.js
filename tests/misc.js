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

// test events
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

  // create event structure
  function makeEvents() {
    return {counts: {}, log: []};
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

  function isObject(v) {
    return Object.prototype.toString.call(v) === '[object Object]';
  }

  // compare partial event array structures
  // for each source, only check fields present in target
  // allows easier checking of just a few key fields
  function comparePartialEvents(source, target, path = []) {
    if(Array.isArray(source)) {
      assert(Array.isArray(target),
        `target not an array, path: ${JSON.stringify(path)}`);
      assert.equal(source.length, target.length,
        `event arrays size mismatch: ${JSON.stringify(path)}`);
      for(let i = 0; i < source.length; ++i) {
        comparePartialEvents(source[i], target[i], [...path, i]);
      }
    } else if(isObject(target)) {
      // check all target keys recursively
      for(const key of Object.keys(target)) {
        assert(key in source,
          `missing expected key: "${key}", path: ${JSON.stringify(path)}`);
        comparePartialEvents(source[key], target[key], [...path, key]);
      }
    } else {
      assert.deepStrictEqual(source, target,
        `not equal, path: ${JSON.stringify(path)}`);
    }
  }

  // test different apis
  // use appropriate options
  async function _test({
    // expand, compact, frame, fromRDF, toRDF, normalize, etc
    type,
    input,
    options,
    expected,
    exception,
    eventCounts,
    // event array
    eventLog,
    // parial event array
    eventPartialLog,
    // event code array
    eventCodeLog,
    testSafe,
    testNotSafe,
    verbose
  }) {
    const events = makeEvents();
    const eventHandler = ({event}) => {
      trackEvent({events, event});
    };

    let result;
    let error;
    const opts = {...options};
    if(eventCounts || eventLog || eventPartialLog || eventCodeLog) {
      opts.eventHandler = eventHandler;
    }
    if(!['expand', 'fromRDF', 'toRDF', 'canonize'].includes(type)) {
      throw new Error(`Unknown test type: "${type}"`);
    }
    try {
      if(type === 'expand') {
        result = await jsonld.expand(input, opts);
      }
      if(type === 'fromRDF') {
        result = await jsonld.fromRDF(input, opts);
      }
      if(type === 'toRDF') {
        result = await jsonld.toRDF(input, {
          // default to n-quads
          format: 'application/n-quads',
          ...opts
        });
      }
      if(type === 'canonize') {
        result = await jsonld.canonize(input, opts);
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
    if(expected !== undefined) {
      assert.deepStrictEqual(result, expected);
    }
    if(eventCounts) {
      assert.deepStrictEqual(events.counts, eventCounts);
    }
    if(eventLog) {
      assert.deepStrictEqual(events.log, eventLog);
    }
    if(eventPartialLog) {
      comparePartialEvents(events.log, eventPartialLog);
    }
    if(eventCodeLog) {
      assert.deepStrictEqual(events.log.map(e => e.code), eventCodeLog);
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

      assert(error, 'missing safe validation error');
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

      const events = makeEvents();
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      jsonld.setDefaultEventHandler({eventHandler});

      const e = await jsonld.expand(d);

      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(events.counts, {
        codes: {
          'empty object': 1,
          'invalid property': 1
        },
        events: 2
      });
      comparePartialEvents(events.log, [
        {
          code: 'invalid property',
          details: {
            property: 'relative',
            expandedProperty: 'relative'
          }
        },
        {
          code: 'empty object'
        }
      ]);

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
          'empty object': 1,
          'invalid property': 1,
          'reserved term': 1
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
          'reserved term': ({event}) => {
            addEventCounts(counts0, event);
          }
        }
      });
      // FIXME: ensure cache is being used
      const e1 = await jsonld.expand(d, {
        eventHandler: {
          'reserved term': ({event}) => {
            addEventCounts(counts1, event);
          }
        }
      });
      assert.deepStrictEqual(e0, ex);
      assert.deepStrictEqual(e1, ex);
      assert.deepStrictEqual(counts0, {
        codes: {
          'reserved term': 1
        },
        events: 1
      }, 'counts 0');
      assert.deepStrictEqual(counts1, {
        codes: {
          'reserved term': 1
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
            if(event.code === 'reserved term') {
              addEventCounts(handledCounts, event);
              return;
            }
          }
        ]
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(handlerCounts0, {
        codes: {
          'empty object': 1,
          'invalid property': 1,
          'reserved term': 1
        },
        events: 3
      }, 'counts handler 0');
      assert.deepStrictEqual(handlerCounts1, {
        codes: {
          'empty object': 1,
          'invalid property': 1,
          'reserved term': 1
        },
        events: 3
      }, 'counts handler 1');
      assert.deepStrictEqual(handledCounts, {
        codes: {
          'reserved term': 1
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
            if(event.code === 'reserved term') {
              addEventCounts(handledCounts, event);
              return;
            }
          }
        ]
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(handlerCounts0, {
        codes: {
          'empty object': 1,
          'invalid property': 1,
          'reserved term': 1
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
          'reserved term': ({event}) => {
            addEventCounts(counts, event);
            assert.strictEqual(event.details.term, '@RESERVED');
          }
        }
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(counts, {
        codes: {
          'reserved term': 1
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
            'reserved term': ({event}) => {
              addEventCounts(handlerCounts3, event);
            }
          }
        ]
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(handlerCounts0, {
        codes: {
          'empty object': 1,
          'invalid property': 1,
          'reserved term': 1
        },
        events: 3
      }, 'counts handler 0');
      assert.deepStrictEqual(handlerCounts1, {
        codes: {
          'empty object': 1,
          'invalid property': 1,
          'reserved term': 1
        },
        events: 3
      }, 'counts handler 1');
      assert.deepStrictEqual(handlerCounts2, {
        codes: {
          'empty object': 1,
          'invalid property': 1,
          'reserved term': 1
        },
        events: 3
      }, 'counts handler 2');
      assert.deepStrictEqual(handlerCounts3, {
        codes: {
          'reserved term': 1
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
      const handledReservedIdValueCounts = {};
      const handledLanguageCounts = {};
      const e = await jsonld.expand(d, {
        eventHandler: {
          'reserved term': ({event}) => {
            addEventCounts(handledReservedTermCounts, event);
          },
          'reserved @id value': ({event}) => {
            addEventCounts(handledReservedIdValueCounts, event);
          },
          'invalid @language value': ({event}) => {
            addEventCounts(handledLanguageCounts, event);
          }
        }
      });
      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(handledReservedTermCounts, {
        codes: {
          'reserved term': 1
        },
        events: 1
      }, 'handled reserved term counts');
      assert.deepStrictEqual(handledReservedIdValueCounts, {
        codes: {
          'reserved @id value': 1
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

  describe('reserved', () => {
    it('should handle reserved context @id values [1]', async () => {
      const input =
{
  "@context": {
    "resId": {"@id": "@RESERVED"}
  },
  "@id": "ex:id",
  "resId": "resIdValue",
  "ex:p": "v"
}
;
      const expected =
[
  {
    "@id": "ex:id",
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
<ex:id> <ex:p> "v" .
`;

      await _test({
        type: 'expand',
        input,
        expected,
        eventPartialLog: [
          {
            code: 'reserved @id value',
            details: {
              id: '@RESERVED'
            }
          },
          {
            code: 'invalid property',
            details: {
              property: 'resId',
              expandedProperty: 'resId'
            }
          }
        ],
        testNotSafe: true
      });

      await _test({
        type: 'toRDF',
        input: expected,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle reserved context @id values [2]', async () => {
      const input =
{
  "@context": {
    "resId": "@RESERVED"
  },
  "@id": "ex:id",
  "resId": "resIdValue",
  "ex:p": "v"
}
;
      const expected =
[
  {
    "@id": "ex:id",
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
<ex:id> <ex:p> "v" .
`;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'reserved @id value',
          'invalid property'
          // .. resId
        ],
        testNotSafe: true
      });

      await _test({
        type: 'toRDF',
        input: expected,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle reserved content @id values', async () => {
      const input =
{
  "@id": "@RESERVED",
  "ex:p": "v"
}
;
      const expected =
[
  {
    "@id": null,
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "v" .
`;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'reserved @id value'
        ],
        testNotSafe: true
      });

      await _test({
        type: 'toRDF',
        input: expected,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle reserved content id values [1]', async () => {
      const input =
{
  "@context": {
    "p": {"@id": "ex:idp", "@type": "@id"}
  },
  "p": "@RESERVED",
  "ex:p": "v"
}
;
      const expected =
[
  {
    "ex:idp": [
      {
        "@id": null
      }
    ],
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "v" .
`;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'reserved @id value'
        ],
        testNotSafe: true
      });

      await _test({
        type: 'toRDF',
        input: expected,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle reserved content id values [2]', async () => {
      const input =
{
  "@context": {
    "id": "@id"
  },
  "id": "@RESERVED",
  "ex:p": "v"
}
;
      const expected =
[
  {
    "@id": null,
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "v" .
`;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'reserved @id value': 1
            // .. '@RESERVED'
          },
          events: 1
        },
        testNotSafe: true
      });

      await _test({
        type: 'toRDF',
        input: expected,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle reserved content id values [3]', async () => {
      const input =
{
  "@context": {
    "p": {"@id": "ex:idp", "@type": "@id"}
  },
  "p": {"@id": "@RESERVED"},
  "ex:p": "v"
}
;
      const expected =
[
  {
    "ex:idp": [
      {
        "@id": null
      }
    ],
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "v" .
`;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'reserved @id value': 1
            // .. '@RESERVED'
          },
          events: 1
        },
        testNotSafe: true
      });

      await _test({
        type: 'toRDF',
        input: expected,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle reserved context terms', async () => {
      const input =
{
  "@context": {
    "@RESERVED": "ex:test"
  },
  "@RESERVED": "test",
  "ex:p": "v"
}
;
      const expected =
[
  {
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "v" .
`;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'reserved term',
          // .. @RESERVED
          'invalid property'
          // .. @RESERVED
        ],
        testNotSafe: true
      });

      await _test({
        type: 'toRDF',
        input: expected,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle reserved content terms', async () => {
      const input =
{
  "@RESERVED": "test",
  "ex:p": "v"
}
;
      const expected =
[
  {
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "v" .
`;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'invalid property': 1,
            // .. '@RESERVED'
          },
          events: 1
        },
        testNotSafe: true
      });

      await _test({
        type: 'toRDF',
        input: expected,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });
  });

  describe('values', () => {
    it('should have zero counts with empty list', async () => {
      const input = [];
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {},
        testSafe: true
      });
    });

    it('should have zero counts with @json value', async () => {
      const input =
{
  "ex:p": {
    "@type": "@json",
    "@value": [null]
  }
}
;
      const expected =
[
  {
    "ex:p": [
      {
        "@type": "@json",
        "@value": [null]
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "[null]"^^<http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON> .
`
;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {},
        testSafe: true
      });
      await _test({
        type: 'toRDF',
        input,
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should count empty top-level object', async () => {
      const input = {};
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'empty object': 1
          },
          events: 1
        },
        testNotSafe: true
      });
    });

    it('should count empty top-level object with only context', async () => {
      const input =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  }
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'empty object': 1
          },
          events: 1
        },
        testNotSafe: true
      });
    });

    it('should not emit for ok @set', async () => {
      const input =
{
  "@set": [
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

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {},
        testSafe: true
      });
    });

    it('should emit for @set free-floating scaler', async () => {
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

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'free-floating scalar': 1,
            // .. 'http://example.com/free-floating-node'
            'object with only @id': 1
          },
          events: 2
        },
        testNotSafe: true
      });
    });

    it('should emit for only @list', async () => {
      const input =
{
  "@list": [
    {
      "@id": "http://example.com/node",
      "urn:property": "nodes are removed with the @list"
    }
  ]
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'object with only @list': 1
          },
          events: 1
        },
        testNotSafe: true
      });
    });

    it('should emit for @list free-floating scaler', async () => {
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
        eventCounts: {
          codes: {
            'free-floating scalar': 1,
            // .. 'http://example.com/free-floating-node'
            'object with only @id': 1,
            'object with only @list': 1
          },
          events: 3
        },
        testNotSafe: true
      });
    });

    it('should not emit for ok @graph', async () => {
      const input =
{
  "@graph": [
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

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {},
        testSafe: true
      });
    });

    it('should emit for @graph free-floating scaler', async () => {
      const input =
{
  "@graph": [
    "free-floating strings in set objects are removed",
    {},
    {
      "@value": "v"
    },
    {
      "@list": [{
        "urn:p": "lv"
      }]
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

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'empty object': 1,
            'free-floating scalar': 1,
            // .. 'free-floating strings in set objects are removed'
            'object with only @list': 1,
            'object with only @value': 1
          },
          events: 4
        },
        testNotSafe: true
      });
    });

    it('should emit for @graph with empty object (1)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    }
  },
  "@id": "urn:id",
  "p": {}
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'empty object',
          'object with only @id'
        ],
        testNotSafe: true
      });
    });

    it('should emit for ok @graph with empty object (2)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    },
    "urn:t": {
      "@type": "@id"
    }
  },
  "@id": "urn:id",
  "urn:t": "urn:id",
  "p": {}
}
;
      const expected =
[
  {
    "@id": "urn:id",
    "urn:t": [
      {
        "@id": "urn:id"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'empty object'
        ],
        testNotSafe: true
      });
    });

    it('should emit with only @id and @graph with empty array', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    }
  },
  "@id": "urn:id",
  "p": []
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'object with only @id'
        ],
        testNotSafe: true
      });
    });

    it('should not emit for @graph with empty array', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    },
    "urn:t": {
      "@type": "@id"
    }
  },
  "@id": "urn:id",
  "urn:t": "urn:id",
  "p": []
}
;
      const expected =
[
  {
    "@id": "urn:id",
    "urn:t": [
      {
        "@id": "urn:id"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: []
      });
    });

    it('should emit for @graph with only @id (1)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    }
  },
  "@id": "urn:id",
  "p": ["urn:id0"]
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'object with only @id',
          'object with only @id'
        ],
        testNotSafe: true
      });
    });

    it('should emit for @graph with only @id (2)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    }
  },
  "@id": "urn:id",
  "p": [
    "urn:id0",
    "urn:id1"
  ]
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'object with only @id',
          'object with only @id',
          'object with only @id'
        ],
        testNotSafe: true
      });
    });

    it('should emit for @graph with only @id (3)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    }
  },
  "@id": "urn:g0",
  "p": [
    {
      "@id": "urn:id0",
      "urn:p0": "v0"
    },
    "urn:id1"
  ]
}
;
      const expected =
[
  {
    "@id": "urn:g0",
    "urn:p": [
      {
        "@graph": [
          {
            "@id": "urn:id0",
            "urn:p0": [
              {
                "@value": "v0"
              }
            ]
          }
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
        eventCodeLog: [
          'object with only @id'
        ],
        testNotSafe: true
      });
    });

    it('should emit for @graph with only @id (4)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    }
  },
  "@id": "urn:g0",
  "p": [
    "urn:id0",
    {
      "@id": "urn:id1",
      "urn:p1": "v1"
    }
  ]
}
;
      const expected =
[
  {
    "@id": "urn:g0",
    "urn:p": [
      {
        "@graph": [
          {
            "@id": "urn:id1",
            "urn:p1": [
              {
                "@value": "v1"
              }
            ]
          }
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
        eventCodeLog: [
          'object with only @id'
        ],
        testNotSafe: true
      });
    });

    it('should emit for @graph with only @id (5)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    },
    "urn:t": {
      "@type": "@id"
    }
  },
  "@id": "urn:id",
  "urn:t": "urn:id",
  "p": ["urn:id0"]
}
;
      const expected =
[
  {
    "@id": "urn:id",
    "urn:t": [
      {
        "@id": "urn:id"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'object with only @id',
        ],
        testNotSafe: true
      });
    });

    it('should emit for @graph with only @id (6)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    },
    "urn:t": {
      "@type": "@id"
    }
  },
  "@id": "urn:id",
  "urn:t": "urn:id",
  "p": "urn:id0"
}
;
      const expected =
[
  {
    "@id": "urn:id",
    "urn:t": [
      {
        "@id": "urn:id"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'object with only @id',
        ],
        testNotSafe: true
      });
    });

    it('should emit for @graph with relative @id (7)', async () => {
      const input =
{
  "@context": {
    "p": {
      "@id": "urn:p",
      "@type": "@id",
      "@container": "@graph"
    },
    "urn:t": {
      "@type": "@id"
    }
  },
  "@id": "urn:id",
  "urn:t": "urn:id",
  "p": {
    "@id": "rel",
    "urn:t": "urn:id0"
  }
}
;
      const expected =
[
  {
    "@id": "urn:id",
    "urn:t": [
      {
        "@id": "urn:id"
      }
    ],
    "urn:p": [
      {
        "@graph": [
          {
            "@id": "rel",
            "urn:t": [
              {
                "@id": "urn:id0"
              }
            ]
          }
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
        eventCodeLog: [
          'relative @id reference',
        ],
        testNotSafe: true
      });
    });

    it('should emit for null @value', async () => {
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
        eventCounts: {
          codes: {
            'empty object': 1,
            'null @value value': 1
          },
          events: 2
        },
        testNotSafe: true
      });
    });

    it('should emit for @language alone', async () => {
      const input =
{
  "urn:property": {
    "@language": "en"
  }
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'empty object': 1,
            'object with only @language': 1,
          },
          events: 2
        },
        testNotSafe: true
      });
    });

    it('should emit for invalid @language value', async () => {
      const input =
{
  "urn:property": {
    "@language": "en_bad",
    "@value": "test"
  }
}
;
      const expected =
[
  {
    "urn:property": [
      {
        "@language": "en_bad",
        "@value": "test"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCounts: {
          codes: {
            'invalid @language value': 1
          },
          events: 1
        },
        testNotSafe: true
      });
    });

    it('should emit for invalid default @language value', async () => {
      const input =
{
  "@context": {
    "@language": "en_bad"
  },
  "urn:property": "value"
}
;
      const expected =
[
  {
    "urn:property": [
      {
        "@language": "en_bad",
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
        eventCodeLog: [
          'invalid @language value'
        ],
        testNotSafe: true
      });
    });

    it('should emit for invalid @language map value', async () => {
      const input =
{
  "@context": {
    "urn:property": {
      "@container": "@language"
    }
  },
  "urn:property": {
    "en_bad": "en",
    "de": "de"
  }
}
;
      const expected =
[
  {
    "urn:property": [
      {
        "@language": "de",
        "@value": "de"
      },
      {
        "@language": "en_bad",
        "@value": "en"
      }
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'invalid @language value'
          // .. en_bad
        ],
        testNotSafe: true
      });
    });

    it('should emit for reserved @reverse value', async () => {
      const input =
{
  "@context": {
    "children": {
      "@reverse": "@RESERVED"
    }
  },
  "@id": "ex:parent",
  "children": [
    {
      "@id": "ex:child"
    }
  ]
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'reserved @reverse value',
          // .. '@RESERVED'
          'invalid property',
          // .. children
          'object with only @id'
        ],
        testNotSafe: true
      });
    });
  });

  describe('properties', () => {
    it('should have zero events with absolute term', async () => {
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
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should have zero events with mapped term', async () => {
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
        eventCodeLog: [],
        testSafe: true
      });
    });

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
        eventLog: [
          {
            code: 'invalid property',
            details: {
              expandedProperty: 'testUndefined',
              property: 'testUndefined'
            },
            level: 'warning'
          },
          {
            code: 'empty object',
            level: 'warning',
            details: {
              value: {}
            }
          }
        ],
        testNotSafe: true
      });
    });

    it('should be called only on top unmapped term', async () => {
      // value of undefined property is dropped and not checked
      const input =
{
  "testUndefined": {
    "subUndefined": "undefined"
  }
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'invalid property',
          // .. 'testUndefined'
          'empty object'
        ],
        testNotSafe: true
      });
    });

    it('should be called on sub unmapped term', async () => {
      const input =
{
  "ex:defined": {
    "testundefined": "undefined"
  }
}
;
      const expected =
[
  {
    "ex:defined": [
      {}
    ]
  }
]
;

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'invalid property'
          // .. 'testUndefined'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          'invalid property',
          // .. 'testUndefined'
          'empty object'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          'invalid property'
          // .. 'testUndefined'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          'invalid property'
          // .. 'testUndefined'
        ],
        testNotSafe: true
      });
    });

    it('should be called on reserved term', async () => {
      const input =
{
  "@context": {
    "@RESERVED": "ex:test-function-handler"
  },
  "@RESERVED": "test"
}
;
      const expected = [];

      await _test({
        type: 'expand',
        input,
        expected,
        eventCodeLog: [
          'reserved term',
          // .. '@RESERVED'
          'invalid property',
          // .. '@RESERVED'
          'empty object'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @id reference',
          // .. 'relativeiri'
          'object with only @id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          ////'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @id reference'
          // .. 'relativeiri'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @id reference'
          // .. 'relativeiri'
        ],
        testNotSafe: true
      });
    });

    it('should be called on relative IRI for id term [4]', async () => {
      const input =
{
  "@id": "34:relativeiri",
  "urn:test": "value"
}
;
      const expected =
[
  {
    "@id": "34:relativeiri",
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
        eventCodeLog: [
          'relative @id reference'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @id reference'
          // .. 'relativeiri'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @id reference'
          // .. 'relativeiri'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @type reference',
          // .. 'relativeiri'
          'invalid property'
          // .. 'id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @type reference',
          // .. 'relativeiri'
          'invalid property'
          // .. 'id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @type reference',
          // .. 'relativeiri'
          //'prepending @base during expansion',
          //// .. 'anotherRelativeiri'
          'relative @type reference',
          // .. 'anotherRelativeiri'
          'invalid property'
          // 'id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @type reference',
          // .. 'relativeiri'
          //'prepending @base during expansion',
          //// .. 'anotherRelativeiri'
          'relative @type reference',
          // .. 'anotherRelativeiri'
          'invalid property'
          // .. 'id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @type reference',
          // .. 'relativeiri'
          'invalid property'
          // .. 'id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          'invalid property',
          // .. 'relativeiri'
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @type reference'
          // .. 'id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @id reference',
          // .. 'relativeiri'
          'object with only @id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @id reference',
          // .. 'relativeiri'
          'object with only @id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeiri'
          'relative @type reference',
          // .. 'relativeiri'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. './'
          'relative @vocab reference',
          // .. './'
          //'prepending @vocab during expansion',
          //// .. 'relativeiri'
          //'prepending @vocab during expansion',
          //// .. 'relativeiri'
          'relative @type reference'
          // .. 'relativeiri'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @vocab during expansion',
          //// .. 'term'
          //'prepending @vocab during expansion',
          //// .. 'term'
          //'prepending @vocab during expansion',
          //// .. 'term'
          //'prepending @vocab during expansion'
          //// .. 'term'
        ],
        testSafe: true
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
        eventCodeLog: [
          //'prepending @vocab during expansion',
          //// .. 'relativeIri'
          //'prepending @vocab during expansion'
          //// .. 'relativeIri'
        ],
        testSafe: true
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
        eventCodeLog: [
          //'prepending @vocab during expansion',
          //// .. 'relativeIri'
          //'prepending @vocab during expansion'
          //// .. 'relativeIri'
        ],
        testSafe: true
      });
    });

    it('should handle scoped relative `@vocab`', async () => {
      const input =
{
  "@context": {
    "@vocab": "urn:abs/"
  },
  "@type": "ta",
  "e:a": {
    "@context": {
      "@vocab": "rel/"
    },
    "@type": "tb"
  }
}
;
      const expected =
[
  {
    "@type": [
      "urn:abs/ta"
    ],
    "e:a": [
      {
        "@type": [
          "urn:abs/rel/tb"
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
        eventCodeLog: [
          //'prepending @vocab during expansion',
          //// .. 'ta'
          //'prepending @vocab during expansion',
          //// .. 'ta'
          //'prepending @vocab during expansion',
          //// .. 'rel/'
          //'prepending @vocab during expansion',
          //// .. 'tb'
          //'prepending @vocab during expansion'
          //// .. 'tb'
        ],
        testSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeIri'
          'object with only @id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion',
          //// .. 'relativeIri'
          'object with only @id'
        ],
        testNotSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion'
          //// .. 'relativeIri'
        ],
        // FIXME
        testSafe: true
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
        eventCodeLog: [
          //'prepending @base during expansion'
          //// .. 'relativeIri'
        ],
        testSafe: true
      });
    });
  });

  // inputs/outputs for @direction+rdfDirection fromRDF/toRDF tests
  const _json_dir_nl_nd =
[
  {
    "@id": "urn:id",
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
  const _json_dir_nl_d =
[
  {
    "@id": "urn:id",
    "ex:p": [
      {
        "@direction": "ltr",
        "@value": "v"
      }
    ]
  }
]
;
  const _json_dir_l_nd =
[
  {
    "@id": "urn:id",
    "ex:p": [
      {
        "@language": "en-us",
        "@value": "v"
      }
    ]
  }
]
;
  const _json_dir_l_d =
[
  {
    "@id": "urn:id",
    "ex:p": [
      {
        "@direction": "ltr",
        "@language": "en-us",
        "@value": "v"
      }
    ]
  }
]
;
  const _nq_dir_nl_nd = `\
<urn:id> <ex:p> "v" .
`;
  const _nq_dir_l_nd_ls = `\
<urn:id> <ex:p> "v"@en-us .
`;
  const _nq_dir_nl_d_i18n = `\
<urn:id> <ex:p> "v"^^<https://www.w3.org/ns/i18n#_ltr> .
`;
  const _nq_dir_l_d_i18n = `\
<urn:id> <ex:p> "v"^^<https://www.w3.org/ns/i18n#en-us_ltr> .
`;

  describe('fromRDF', () => {
    it('should emit for invalid N-Quads @language value', async () => {
      // N-Quads with invalid language tag (too long)
      // FIXME: should N-Quads parser catch this instead?
      const input =
'_:b0 <urn:property> "test"@abcdefghi .'
;
      const expected =
[
  {
    "@id": "_:b0",
    "urn:property": [
      {
        "@language": "abcdefghi",
        "@value": "test"
      }
    ]
  }
]
;

      console.error('FIXME');
      await _test({
        type: 'fromRDF',
        input,
        expected,
        eventCodeLog: [
          'invalid @language value'
          // .. 'abcdefghi'
        ],
        testNotSafe: true
      });
    });

    it('should emit for invalid Dataset @language value', async () => {
      // dataset with invalid language tag (too long)
      // Equivalent N-Quads:
      // '<ex:s> <ex:p> "test"^^<https://www.w3.org/ns/i18n#abcdefghi_rtl> .'
      // Using JSON dataset to bypass N-Quads parser checks.
      const input =
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
      "value": "test",
      "datatype": {
        "termType": "NamedNode",
        "value": "https://www.w3.org/ns/i18n#abcdefghi_rtl"
      }
    },
    "graph": {
      "termType": "DefaultGraph",
      "value": ""
    }
  }
]
;
      const expected =
[
  {
    "@id": "ex:s",
    "ex:p": [
      {
        "@value": "test",
        "@language": "abcdefghi",
        "@direction": "rtl"
      }
    ]
  }
]
;

      await _test({
        type: 'fromRDF',
        input,
        options: {
          rdfDirection: 'i18n-datatype',
        },
        expected,
        eventCodeLog: [
          'invalid @language value'
        ],
        testNotSafe: true
      });
    });

    // 'should handle [no] @lang, [no] @dir, rdfDirection=null'
    // no tests due to no special N-Quads handling

    // other tests only check that rdfDirection type of input
    // tests mixing rdfDirection formats not tested

    it('should handle no @lang, no @dir, rdfDirection=i18n', async () => {
      const input = _nq_dir_nl_nd;
      const expected = _json_dir_nl_nd;

      await _test({
        type: 'fromRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'i18n-datatype'},
        expected,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle no @lang, @dir, rdfDirection=i18n', async () => {
      const input = _nq_dir_nl_d_i18n;
      const expected = _json_dir_nl_d;

      await _test({
        type: 'fromRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'i18n-datatype'},
        expected,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle @lang, no @dir, rdfDirection=i18n', async () => {
      const input = _nq_dir_l_nd_ls;
      const expected = _json_dir_l_nd;

      await _test({
        type: 'fromRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'i18n-datatype'},
        expected,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle @lang, @dir, rdfDirection=i18n', async () => {
      const input = _nq_dir_l_d_i18n;
      const expected = _json_dir_l_d;

      await _test({
        type: 'fromRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'i18n-datatype'},
        expected,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle bad rdfDirection', async () => {
      const input = _nq_dir_l_d_i18n;

      await _test({
        type: 'fromRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'bogus'},
        exception: 'jsonld.InvalidRdfDirection'
      });
    });
  });

  describe('toRDF', () => {
    it('should handle relative graph reference', async () => {
      const input =
[
  {
    "@id": "rel",
    "@graph": [
      {
        "@id": "s:1",
        "ex:p": [
          {
            "@value": "v1"
          }
        ]
      }
    ]
  }
]
;
      const nq = `\
`;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [
          'relative graph reference'
          // .. 'rel'
        ],
        testNotSafe: true
      });
    });

    it('should handle relative subject reference', async () => {
      const input =
[
  {
    "@id": "rel",
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
`;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [
          'relative subject reference'
          // .. 'rel'
        ],
        testNotSafe: true
      });
    });

    it('should handle relative predicate reference', async () => {
      const input =
[
  {
    "rel": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
`;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [
          'relative predicate reference'
          // .. 'rel'
        ],
        testNotSafe: true
      });
    });

    it('should handle relative object reference', async () => {
      const input =
[
  {
    "@type": [
      "rel"
    ],
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "v" .
`;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [
          'relative object reference'
          // .. 'rel'
        ],
        testNotSafe: true
      });
    });

    it('should handle blank node predicates', async () => {
      const input =
[
  {
    "_:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
`;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [
          'blank node predicate'
          // .. '_:p'
        ],
        testNotSafe: true
      });
    });

    it('should handle generlized RDF blank node predicates', async () => {
      const input =
[
  {
    "_:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 _:b1 "v" .
`;

      await _test({
        type: 'toRDF',
        input,
        options: {
          skipExpansion: true,
          produceGeneralizedRdf: true
        },
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle null @id', async () => {
      const input =
[
  {
    "@id": null,
    "ex:p": [
      {
        "@value": "v"
      }
    ]
  }
]
;
      const nq = `\
_:b0 <ex:p> "v" .
`;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle no @lang, no @dir, rdfDirection=null', async () => {
      const input = _json_dir_nl_nd;
      const nq = _nq_dir_nl_nd;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: null},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle no @lang, no @dir, rdfDirection=i18n', async () => {
      const input = _json_dir_nl_nd;
      const nq = _nq_dir_nl_nd;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'i18n-datatype'},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle no @lang, @dir, no rdfDirection', async () => {
      const input = _json_dir_nl_d;
      const nq = _nq_dir_nl_nd;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [
          'rdfDirection not set'
        ],
        testNotSafe: true
      });
    });

    it('should handle no @lang, @dir, rdfDirection=null', async () => {
      const input = _json_dir_nl_d;
      const nq = _nq_dir_nl_nd;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: null},
        expected: nq,
        eventCodeLog: [
          'rdfDirection not set'
        ],
        testNotSafe: true
      });
    });

    it('should handle no @lang, @dir, rdfDirection=i18n', async () => {
      const input = _json_dir_nl_d;
      const nq = _nq_dir_nl_d_i18n;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'i18n-datatype'},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle @lang, no @dir, rdfDirection=null', async () => {
      const input = _json_dir_l_nd;
      const nq = _nq_dir_l_nd_ls;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: null},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle @lang, no @dir, rdfDirection=i18n', async () => {
      const input = _json_dir_l_nd;
      const nq = _nq_dir_l_nd_ls;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'i18n-datatype'},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle @lang, @dir, rdfDirection=null', async () => {
      const input = _json_dir_l_d;
      const nq = _nq_dir_l_nd_ls;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: null},
        expected: nq,
        eventCodeLog: [
          'rdfDirection not set'
        ],
        testNotSafe: true
      });
    });

    it('should handle @lang, @dir, rdfDirection=i18n', async () => {
      const input = _json_dir_l_d;
      const nq = _nq_dir_l_d_i18n;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'i18n-datatype'},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });

    it('should handle bad rdfDirection', async () => {
      const input = _json_dir_l_d;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: true, rdfDirection: 'bogus'},
        exception: 'jsonld.InvalidRdfDirection'
      });
    });

    /* eslint-disable-next-line */
    // https://www.w3.org/TR/json-ld/#example-76-expanded-term-definition-with-language-and-direction
    // simplified complex context example
    const _ctx_dir_input =
{
  "@context": {
    "@version": 1.1,
    "@language": "ar-EG",
    "@direction": "rtl",
    "ex": "urn:ex:",
    "publisher": {"@id": "ex:publisher", "@direction": null},
    "title": {"@id": "ex:title"},
    "title_en": {"@id": "ex:title", "@language": "en", "@direction": "ltr"}
  },
  "publisher": "NULL",
  "title": "RTL",
  "title_en": "LTR"
}
;

    it('should handle ctx @lang/@dir/rdfDirection=null', async () => {
      const input = _ctx_dir_input;
      const nq = `\
_:b0 <urn:ex:publisher> "NULL"@ar-eg .
_:b0 <urn:ex:title> "LTR"@en .
_:b0 <urn:ex:title> "RTL"@ar-eg .
`;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: false, rdfDirection: null},
        expected: nq,
        eventCodeLog: [
          'rdfDirection not set',
          'rdfDirection not set'
        ],
        testNotSafe: true
      });
    });

    it('should handle ctx @lang/@dir/rdfDirection=i18n', async () => {
      const input = _ctx_dir_input;
      const nq = `\
_:b0 <urn:ex:publisher> "NULL"@ar-eg .
_:b0 <urn:ex:title> "LTR"^^<https://www.w3.org/ns/i18n#en_ltr> .
_:b0 <urn:ex:title> "RTL"^^<https://www.w3.org/ns/i18n#ar-eg_rtl> .
`;

      await _test({
        type: 'toRDF',
        input,
        options: {skipExpansion: false, rdfDirection: 'i18n-datatype'},
        expected: nq,
        eventCodeLog: [],
        testSafe: true
      });
    });
  });

  describe('various', () => {
    it('expand and toRDF for non-IRI', async () => {
      const input =
{
  "@context": {
    "ex": "urn:ex#",
    "ex:prop": {
      "@type": "@id"
    }
  },
  "@id": "urn:id",
  "@type": "ex:type",
  "ex:prop": "value"
}
;
      const expanded =
[
  {
    "@id": "urn:id",
    "@type": [
      "urn:ex#type"
    ],
    "urn:ex#prop": [
      {
        "@id": "value"
      }
    ]
  }
]
;
      const nq = `\
<urn:id> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <urn:ex#type> .
`;

      await _test({
        type: 'expand',
        input,
        expected: expanded,
        eventCodeLog: [],
        testSafe: true
      });
      await _test({
        type: 'toRDF',
        input: expanded,
        options: {skipExpansion: true},
        expected: nq,
        eventCodeLog: [
          'relative object reference'
          // .. 'value'
        ],
        testNotSafe: true
      });
    });
  });
});

describe('safe canonize defaults', () => {
  it('does not throw on safe input', async () => {
    const input =
{
  "@id": "ex:id",
  "ex:p": "v"
}
;
    const expected =
'<ex:id> <ex:p> "v" .\n'
;
    const result = await jsonld.canonize(input);
    assert.deepStrictEqual(result, expected);
  });

  it('throws on unsafe input', async () => {
    const input =
{
  "@id": "ex:id",
  "ex:p": "v",
  "unknown": "error"
}
;
    let error;
    try {
      await jsonld.canonize(input);
    } catch(e) {
      error = e;
    }
    assert(error, 'missing safe validation error');
  });

  it('allows override of safe mode', async () => {
    const input =
{
  "@id": "ex:id",
  "ex:p": "v",
  "unknown": "error"
}
;
    const expected =
'<ex:id> <ex:p> "v" .\n'
;
    const result = await jsonld.canonize(input, {
      safe: false
    });
    assert.deepStrictEqual(result, expected);
  });
});
