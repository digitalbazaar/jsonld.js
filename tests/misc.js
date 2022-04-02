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

describe('events', () => {
  // FIXME/TODO add object '*' handler and tests?

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
        'invalid property expansion': 1,
        'relative IRI after expansion': 2
      },
      events: 3
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
        'invalid property expansion': 1,
        'invalid reserved term': 1
      },
      events: 2
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
        'invalid property expansion': 1,
        'invalid reserved term': 1
      },
      events: 2
    }, 'counts handler 0');
    assert.deepStrictEqual(handlerCounts1, {
      codes: {
        'invalid property expansion': 1,
        'invalid reserved term': 1
      },
      events: 2
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
        'invalid property expansion': 1,
        'invalid reserved term': 1
      },
      events: 2
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
        'invalid property expansion': 1,
        'invalid reserved term': 1
      },
      events: 2
    }, 'counts handler 0');
    assert.deepStrictEqual(handlerCounts1, {
      codes: {
        'invalid property expansion': 1,
        'invalid reserved term': 1
      },
      events: 2
    }, 'counts handler 1');
    assert.deepStrictEqual(handlerCounts2, {
      codes: {
        'invalid property expansion': 1,
        'invalid reserved term': 1
      },
      events: 2
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

describe('expansionMap', () => {
  // track all the counts
  // use simple count object (don't use tricky test keys!)
  function addCounts(counts, info) {
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

  describe('unmappedValue', () => {
    // FIXME move to value section
    it('should have zero counts with empty input', async () => {
      const docWithNoContent = {};

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithNoContent, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 1,
        unmappedValue: {
          '__unknown__': 1
        }
      });
      console.error('FIXME');
      assert.deepStrictEqual(events, {});
    });

    it('should have zero counts with no terms', async () => {
      const docWithNoTerms =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  }
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithNoTerms, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 1,
        unmappedValue: {
          '__unknown__': 1
        }
      });
      console.error('FIXME');
      assert.deepStrictEqual(events, {});
    });

    it('should notify for @set free-floating scaler', async () => {
      const docWithNoTerms =
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
      const ex =
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

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      const e = await jsonld.expand(docWithNoTerms, {
        expansionMap, eventHandler
      });

      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(mapCounts, {
        expansionMap: 4,
        unmappedValue: {
          '__unknown__': 2,
          'http://example.com/free-floating-node': 2
        }
      });
      console.error('FIXME');
      assert.deepStrictEqual(events, {});
    });

    it('should notify for @list free-floating scaler', async () => {
      const docWithNoTerms =
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
      const ex = [];

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      const e = await jsonld.expand(docWithNoTerms, {
        expansionMap, eventHandler
      });

      assert.deepStrictEqual(e, ex);
      assert.deepStrictEqual(mapCounts, {
        expansionMap: 5,
        unmappedValue: {
          '__unknown__': 3,
          'http://example.com/free-floating-node': 2
        }
      });
      console.error('FIXME');
      assert.deepStrictEqual(events, {});
    });

    it('should notify for null @value', async () => {
      const docWithNoTerms =
{
  "urn:property": {
    "@value": null
  }
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithNoTerms, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 3,
        unmappedValue: {
          '__unknown__': 3
        }
      });
      console.error('FIXME');
      assert.deepStrictEqual(events, {});
    });

    it('should notify for @language alone', async () => {
      const docWithNoTerms =
{
  "urn:property": {
    "@language": "en"
  }
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithNoTerms, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 3,
        unmappedValue: {
          '__unknown__': 2
        }
      });
      console.error('FIXME');
      assert.deepStrictEqual(events, {});
    });
  });

  describe('unmappedProperty', () => {
    it('should have zero counts with absolute term', async () => {
      const docWithMappedTerm =
{
  "urn:definedTerm": "is defined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithMappedTerm, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {});
      assert.deepStrictEqual(events, {});
    });

    it('should have zero counts with mapped term', async () => {
      const docWithMappedTerm =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "definedTerm": "is defined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithMappedTerm, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {});
      assert.deepStrictEqual(events, {});
    });

    it('should be called on unmapped term with no context', async () => {
      const docWithUnMappedTerm =
{
  "testUndefined": "is undefined"
};

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithUnMappedTerm, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 2
        },
        events: 3
      });
      assert.deepStrictEqual(events.log, [
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
      ]);
    });

    it('should be called on unmapped term with context [1]', async () => {
      const docWithUnMappedTerm =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "testUndefined": "is undefined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithUnMappedTerm, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 2
        },
        events: 3
      });
    });

    it('should be called on unmapped term with context [2]', async () => {
      const docWithUnMappedTerm =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "definedTerm": "is defined",
  "testUndefined": "is undefined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithUnMappedTerm, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 3,
        relativeIri: {
          testUndefined: 2
        },
        unmappedProperty: {
          testUndefined: 1
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 2
        },
        events: 3
      });
    });

    it('should be called on nested unmapped term', async () => {
      const docWithUnMappedTerm =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "definedTerm": {
    "testUndefined": "is undefined"
  }
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithUnMappedTerm, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 3,
        relativeIri: {
          testUndefined: 2
        },
        unmappedProperty: {
          testUndefined: 1
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 2
        },
        events: 3
      });
    });
  });

  describe('relativeIri', () => {
    it('should be called on relative IRI for id term [1]', async () => {
      const docWithRelativeIriId =
{
  "@id": "relativeiri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1
      });
    });

    it('should be called on relative IRI for id term [2]', async () => {
      const docWithRelativeIriId =
{
  "@id": "relativeiri",
  "urn:test": "value"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeiri: 1
        },
        relativeIri: {
          relativeiri: 1
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1
      });
    });

    it('should be called on relative IRI for id term [3]', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "@id": "relativeiri",
  "definedTerm": "is defined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeiri: 1
        },
        relativeIri: {
          relativeiri: 1
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1
      });
    });

    it('should be called on relative IRI for id term (nested)', async () => {
      const docWithRelativeIriId =
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

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeiri: 1
        },
        relativeIri: {
          relativeiri: 1
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1
      });
    });

    it('should be called on relative IRI for aliased id term', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "id": "@id",
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "relativeiri",
  "definedTerm": "is defined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeiri: 1
        },
        relativeIri: {
          relativeiri: 1
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1
      });
    });

    it('should be called on relative IRI for type term', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "urn:absoluteiri",
  "@type": "relativeiri",
  "definedTerm": "is defined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 4
        },
        events: 5
      });
    });

    it('should be called on relative IRI for type ' +
      'term in scoped context', async () => {
      const docWithRelativeIriId =
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

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 4
        },
        events: 5
      });
    });

    it('should be called on relative IRI for ' +
      'type term with multiple relative IRI types', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "urn:absoluteiri",
  "@type": ["relativeiri", "anotherRelativeiri"],
  "definedTerm": "is defined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 5
        },
        events: 6
      });
    });

    it('should be called on relative IRI for ' +
      'type term with multiple relative IRI types in scoped context' +
      '', async () => {
      const docWithRelativeIriId =
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

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 5
        },
        events: 6
      });
    });

    it('should be called on relative IRI for ' +
      'type term with multiple types', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "urn:absoluteiri",
  "@type": ["relativeiri", "definedTerm"],
  "definedTerm": "is defined"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 4
        },
        events: 5
      });
    });

    it('should be called on relative IRI for aliased type term', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "type": "@type",
    "definedTerm": "https://example.com#definedTerm"
  },
  "id": "urn:absoluteiri",
  "type": "relativeiri",
  "definedTerm": "is defined"
};

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'invalid property expansion': 1,
          'relative IRI after expansion': 4
        },
        events: 5
      });
    });

    it('should be called on relative IRI when ' +
      '@base value is `null`', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "@base": null
  },
  "@id": "relativeiri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1
      });
    });

    it('should be called on relative IRI when ' +
      '@base value is `./`', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "@base": "./"
  },
  "@id": "relativeiri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
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
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1
      });
    });

    it('should be called on relative IRI when ' +
      '`@vocab` value is `null`', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "@vocab": null
  },
  "@type": "relativeiri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 3,
        prependedIri: {
          relativeiri: 1
        },
        relativeIri: {
          'relativeiri': 2
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 2
        },
        events: 2
      });
    });

    it('should be called on relative IRI when ' +
      '`@vocab` value is `./`', async () => {
      const docWithRelativeIriId =
{
  "@context": {
    "@vocab": "./"
  },
  "@type": "relativeiri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 6,
        prependedIri: {
          './': 1,
          relativeiri: 2
        },
        relativeIri: {
          '/': 1,
          '/relativeiri': 2
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 3
        },
        events: 3
      });
    });
  });

  describe('prependedIri', () => {
    it('should be called when property is ' +
      'being expanded with `@vocab`', async () => {
      const doc =
{
  "@context": {
    "@vocab": "http://example.com/"
  },
  "term": "termValue"
};

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
        assert.deepStrictEqual(info.prependedIri, {
          type: '@vocab',
          vocab: 'http://example.com/',
          value: 'term',
          typeExpansion: false,
          result: 'http://example.com/term'
        });
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(doc, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 4,
        prependedIri: {
          term: 4
        }
      });
      assert.deepStrictEqual(events, {});
    });

    it('should be called when `@type` is ' +
      'being expanded with `@vocab`', async () => {
      const doc =
{
  "@context": {
    "@vocab": "http://example.com/"
  },
  "@type": "relativeIri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
        assert.deepStrictEqual(info.prependedIri, {
          type: '@vocab',
          vocab: 'http://example.com/',
          value: 'relativeIri',
          typeExpansion: true,
          result: 'http://example.com/relativeIri'
        });
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(doc, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 2
        }
      });
      assert.deepStrictEqual(events, {});
    });

    it('should be called when aliased `@type` is ' +
      'being expanded with `@vocab`', async () => {
      const doc =
{
  "@context": {
    "@vocab": "http://example.com/",
    "type": "@type"
  },
  "type": "relativeIri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
        assert.deepStrictEqual(info.prependedIri, {
          type: '@vocab',
          vocab: 'http://example.com/',
          value: 'relativeIri',
          typeExpansion: true,
          result: 'http://example.com/relativeIri'
        });
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(doc, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 2
        }
      });
      assert.deepStrictEqual(events, {});
    });

    it('should be called when `@id` is being ' +
      'expanded with `@base`', async () => {
      const doc =
{
  "@context": {
    "@base": "http://example.com/"
  },
  "@id": "relativeIri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
        if(info.prependedIri) {
          assert.deepStrictEqual(info.prependedIri, {
            type: '@base',
            base: 'http://example.com/',
            value: 'relativeIri',
            typeExpansion: false,
            result: 'http://example.com/relativeIri'
          });
        }
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(doc, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 1
        },
        unmappedValue: {
          'http://example.com/relativeIri': 1
        }
      });
      assert.deepStrictEqual(events, {});
    });

    it('should be called when aliased `@id` ' +
      'is being expanded with `@base`', async () => {
      const doc =
{
  "@context": {
    "@base": "http://example.com/",
    "id": "@id"
  },
  "id": "relativeIri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
        if(info.prependedIri) {
          assert.deepStrictEqual(info.prependedIri, {
            type: '@base',
            base: 'http://example.com/',
            value: 'relativeIri',
            typeExpansion: false,
            result: 'http://example.com/relativeIri'
          });
        }
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(doc, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 1
        },
        unmappedValue: {
          'http://example.com/relativeIri': 1
        }
      });
      assert.deepStrictEqual(events, {});
    });

    it('should be called when `@type` is ' +
      'being expanded with `@base`', async () => {
      const doc =
{
  "@context": {
    "@base": "http://example.com/"
  },
  "@type": "relativeIri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
        if(info.prependedIri) {
          assert.deepStrictEqual(info.prependedIri, {
            type: '@base',
            base: 'http://example.com/',
            value: 'relativeIri',
            typeExpansion: true,
            result: 'http://example.com/relativeIri'
          });
        }
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(doc, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 1
        },
        relativeIri: {
          relativeIri: 1
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1,
        //FIXME: true
      });
    });

    it('should be called when aliased `@type` is ' +
      'being expanded with `@base`', async () => {
      const doc =
{
  "@context": {
    "@base": "http://example.com/",
    "type": "@type"
  },
  "type": "relativeIri"
}
;

      const mapCounts = {};
      const expansionMap = info => {
        addCounts(mapCounts, info);
        if(info.prependedIri) {
          assert.deepStrictEqual(info.prependedIri, {
            type: '@base',
            base: 'http://example.com/',
            value: 'relativeIri',
            typeExpansion: true,
            result: 'http://example.com/relativeIri'
          });
        }
      };
      const events = {};
      const eventHandler = ({event}) => {
        trackEvent({events, event});
      };

      await jsonld.expand(doc, {expansionMap, eventHandler});

      assert.deepStrictEqual(mapCounts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 1
        },
        relativeIri: {
          relativeIri: 1
        }
      });
      assert.deepStrictEqual(events.counts, {
        codes: {
          'relative IRI after expansion': 1
        },
        events: 1,
        //FIXME: true
      });
    });
  });
});
