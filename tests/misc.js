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

describe.only('expansionMap', () => {
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

  describe('unmappedProperty', () => {
    // FIXME move to value section
    it.skip('should have zero counts with empty input', async () => {
      const docWithNoContent = {};

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithNoContent, {expansionMap});

      assert.deepStrictEqual(counts, {});
    });

    // FIXME move to value section
    it.skip('should have zero counts with no terms', async () => {
      const docWithNoTerms = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        }
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithNoTerms, {expansionMap});

      assert.deepStrictEqual(counts, {});
    });

    it.skip('should have zero counts with mapped term', async () => {
      const docWithMappedTerm = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        },
        definedTerm: "is defined"
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithMappedTerm, {expansionMap});

      assert.deepStrictEqual(counts, {});
    });

    it('should be called on unmapped term', async () => {
      const docWithUnMappedTerm = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        },
        definedTerm: "is defined",
        testUndefined: "is undefined"
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithUnMappedTerm, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 3,
        relativeIri: {
          testUndefined: 2
        },
        unmappedProperty: {
          testUndefined: 1
        }
      });
    });

    it('should be called on nested unmapped term', async () => {
      const docWithUnMappedTerm = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        },
        definedTerm: {
          testUndefined: "is undefined"
        }
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithUnMappedTerm, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 3,
        relativeIri: {
          testUndefined: 2
        },
        unmappedProperty: {
          testUndefined: 1
        }
      });
    });
  });

  describe('relativeIri', () => {
    it('should be called on relative iri for id term', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        },
        '@id': "relativeiri",
        definedTerm: "is defined"
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeiri: 1
        },
        relativeIri: {
          relativeiri: 1
        }
      });
    });

    it('should be called on relative iri for id term (nested)', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        },
        '@id': "urn:absoluteIri",
        definedTerm: {
          '@id': "relativeiri"
        }
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeiri: 1
        },
        relativeIri: {
          relativeiri: 1
        }
      });
    });

    it('should be called on relative iri for aliased id term', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'id': '@id',
          'definedTerm': 'https://example.com#definedTerm'
        },
        'id': "relativeiri",
        definedTerm: "is defined"
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeiri: 1
        },
        relativeIri: {
          relativeiri: 1
        }
      });
    });

    it('should be called on relative iri for type term', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        },
        'id': "urn:absoluteiri",
        '@type': "relativeiri",
        definedTerm: "is defined"
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
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
    });

    it('should be called on relative iri for type ' +
      'term in scoped context', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'definedType': {
            '@id': 'https://example.com#definedType',
            '@context': {
              'definedTerm': 'https://example.com#definedTerm'

            }
          }
        },
        'id': "urn:absoluteiri",
        '@type': "definedType",
        definedTerm: {
          '@type': 'relativeiri'
        }
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
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
    });

    it('should be called on relative iri for ' +
      'type term with multiple relative iri types', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        },
        'id': "urn:absoluteiri",
        '@type': ["relativeiri", "anotherRelativeiri" ],
        definedTerm: "is defined"
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
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
    });

    it('should be called on relative iri for ' +
      'type term with multiple relative iri types in scoped context' +
      '', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'definedType': {
            '@id': 'https://example.com#definedType',
            '@context': {
              'definedTerm': 'https://example.com#definedTerm'

            }
          }
        },
        'id': "urn:absoluteiri",
        '@type': "definedType",
        definedTerm: {
          '@type': ["relativeiri", "anotherRelativeiri" ]
        }
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
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
    });

    it('should be called on relative iri for ' +
      'type term with multiple types', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'definedTerm': 'https://example.com#definedTerm'
        },
        'id': "urn:absoluteiri",
        '@type': ["relativeiri", "definedTerm" ],
        definedTerm: "is defined"
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
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
    });

    it('should be called on relative iri for aliased type term', async () => {
      const docWithRelativeIriId = {
        '@context': {
          'type': "@type",
          'definedTerm': 'https://example.com#definedTerm'
        },
        'id': "urn:absoluteiri",
        'type': "relativeiri",
        definedTerm: "is defined"
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
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
    });

    it("should be called on relative iri when " +
      "@base value is './'", async () => {
      const docWithRelativeIriId = {
        '@context': {
          "@base": "./",
        },
        '@id': "relativeiri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 3,
        prependedIri: {
          'relativeiri': 1
        },
        relativeIri: {
          '/relativeiri': 1
        },
        unmappedValue: {
          '/relativeiri': 1
        }
      });
    });

    it("should be called on relative iri when " +
      "@base value is './'", async () => {
      const docWithRelativeIriId = {
        '@context': {
          "@base": "./",
        },
        '@id': "relativeiri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
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
    });

    it("should be called on relative iri when " +
      "@vocab value is './'", async () => {
      const docWithRelativeIriId = {
        '@context': {
          "@vocab": "./",
        },
        '@type': "relativeiri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
      };

      await jsonld.expand(docWithRelativeIriId, {expansionMap});

      assert.deepStrictEqual(counts, {
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
    });
  });

  describe('prependedIri', () => {
    it("should be called when property is " +
      "being expanded with `@vocab`", async () => {
      const doc = {
        '@context': {
          "@vocab": "http://example.com/",
        },
        'term': "termValue",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
        assert.deepStrictEqual(info.prependedIri, {
          type: '@vocab',
          vocab: 'http://example.com/',
          value: 'term',
          typeExpansion: false,
          result: 'http://example.com/term'
        });
      };

      await jsonld.expand(doc, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 4,
        prependedIri: {
          term: 4
        }
      });
    });

    it("should be called when '@type' is " +
      "being expanded with `@vocab`", async () => {
      const doc = {
        '@context': {
          "@vocab": "http://example.com/",
        },
        '@type': "relativeIri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
        assert.deepStrictEqual(info.prependedIri, {
          type: '@vocab',
          vocab: 'http://example.com/',
          value: 'relativeIri',
          typeExpansion: true,
          result: 'http://example.com/relativeIri'
        });
      };

      await jsonld.expand(doc, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 2
        }
      });
    });

    it("should be called when aliased '@type' is " +
      "being expanded with `@vocab`", async () => {
      const doc = {
        '@context': {
          "@vocab": "http://example.com/",
          "type": "@type"
        },
        'type': "relativeIri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
        assert.deepStrictEqual(info.prependedIri, {
          type: '@vocab',
          vocab: 'http://example.com/',
          value: 'relativeIri',
          typeExpansion: true,
          result: 'http://example.com/relativeIri'
        });
      };

      await jsonld.expand(doc, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 2
        }
      });
    });

    it("should be called when '@id' is being " +
      "expanded with `@base`", async () => {
      const doc = {
        '@context': {
          "@base": "http://example.com/",
        },
        '@id': "relativeIri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
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

      await jsonld.expand(doc, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 1
        },
        unmappedValue: {
          'http://example.com/relativeIri': 1
        }
      });
    });

    it("should be called when aliased '@id' " +
      "is being expanded with `@base`", async () => {
      const doc = {
        '@context': {
          "@base": "http://example.com/",
          "id": "@id"
        },
        'id': "relativeIri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
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

      await jsonld.expand(doc, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 1
        },
        unmappedValue: {
          'http://example.com/relativeIri': 1
        }
      });
    });

    it("should be called when '@type' is " +
      "being expanded with `@base`", async () => {
      const doc = {
        '@context': {
          "@base": "http://example.com/",
        },
        '@type': "relativeIri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
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

      await jsonld.expand(doc, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 1
        },
        relativeIri: {
          relativeIri: 1
        }
      });
    });

    it("should be called when aliased '@type' is " +
      "being expanded with `@base`", async () => {
      const doc = {
        '@context': {
          "@base": "http://example.com/",
          "type": "@type"
        },
        'type': "relativeIri",
      };

      const counts = {};
      const expansionMap = info => {
        addCounts(counts, info);
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

      await jsonld.expand(doc, {expansionMap});

      assert.deepStrictEqual(counts, {
        expansionMap: 2,
        prependedIri: {
          relativeIri: 1
        },
        relativeIri: {
          relativeIri: 1
        }
      });
    });
  });
});

describe.only('events', () => {
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

    let handled = false;
    const e = await jsonld.expand(d, {
      eventHandler: ({event, next}) => {
        if(event.code === 'invalid reserved term') {
          handled = true;
        } else {
          next();
        }
      }
    });
    assert.deepStrictEqual(e, ex);
    assert.equal(handled, true);
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

    let handled0 = false;
    let handled1 = false;
    const e0 = await jsonld.expand(d, {
      eventHandler: {
        'invalid reserved term': () => {
          handled0 = true;
        }
      }
    });
    // FIXME: ensure cache is being used
    const e1 = await jsonld.expand(d, {
      eventHandler: {
        'invalid reserved term': () => {
          handled1 = true;
        }
      }
    });
    assert.deepStrictEqual(e0, ex);
    assert.deepStrictEqual(e1, ex);
    assert.equal(handled0, true, 'handled 0');
    assert.equal(handled1, true, 'handled 1');
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

    let ranHandler0 = false;
    let ranHandler1 = false;
    let handled = false;
    const e = await jsonld.expand(d, {
      eventHandler: [
        ({next}) => {
          ranHandler0 = true;
          // skip to next handler
          next();
        },
        ({event, next}) => {
          ranHandler1 = true;
          if(event.code === 'invalid reserved term') {
            handled = true;
            return;
          }
          next();
        }
      ]
    });
    assert.deepStrictEqual(e, ex);
    assert.equal(ranHandler0, true, 'ran handler 0');
    assert.equal(ranHandler1, true, 'ran handler 1');
    assert.equal(handled, true, 'handled');
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

    let handled = false;
    const e = await jsonld.expand(d, {
      eventHandler: {
        'invalid reserved term': ({event}) => {
          assert.equal(event.details.term, '@RESERVED');
          handled = true;
        }
      }
    });
    assert.deepStrictEqual(e, ex);
    assert.equal(handled, true, 'handled');
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

    let ranHandler0 = false;
    let ranHandler1 = false;
    let ranHandler2 = false;
    let ranHandler3 = false;
    let handled = false;
    const e = await jsonld.expand(d, {
      eventHandler: [
        ({next}) => {
          ranHandler0 = true;
          next();
        },
        [
          ({next}) => {
            ranHandler1 = true;
            next();
          },
          {
            'bogus code': () => {}
          }
        ],
        ({next}) => {
          ranHandler2 = true;
          next();
        },
        {
          'invalid reserved term': () => {
            ranHandler3 = true;
            handled = true;
          }
        }
      ]
    });
    assert.deepStrictEqual(e, ex);
    assert.equal(ranHandler0, true, 'ran handler 0');
    assert.equal(ranHandler1, true, 'ran handler 1');
    assert.equal(ranHandler2, true, 'ran handler 2');
    assert.equal(ranHandler3, true, 'ran handler 3');
    assert.equal(handled, true, 'handled');
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

    let handledReservedTerm = false;
    let handledReservedValue = false;
    let handledLanguage = false;
    const e = await jsonld.expand(d, {
      eventHandler: {
        'invalid reserved term': () => {
          handledReservedTerm = true;
        },
        'invalid reserved value': () => {
          handledReservedValue = true;
        },
        'invalid @language value': () => {
          handledLanguage = true;
        }
      }
    });
    assert.deepStrictEqual(e, ex);
    assert.equal(handledReservedTerm, true);
    assert.equal(handledReservedValue, true);
    assert.equal(handledLanguage, true);

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

    let handledLanguage2 = false;
    const e2 = await jsonld.fromRDF(d2, {
      rdfDirection: 'i18n-datatype',
      eventHandler: {
        'invalid @language value': () => {
          handledLanguage2 = true;
        }
      }
    });
    assert.deepStrictEqual(e2, ex2);
    assert.equal(handledLanguage2, true);
  });
});
