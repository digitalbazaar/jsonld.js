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
    jsonld.link(doc, {}, (err, output) => {
      assert.ifError(err);
      output = output['@graph'][0];
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
    jsonld.merge([docA, docB], (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, merged);
      done();
    });
  });

  it('should merge nodes from two different documents with context', done => {
    jsonld.merge([docA, docB], context, (err, output) => {
      assert.ifError(err);
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

  it('should process with options and callback', done => {
    jsonld.toRDF({}, {}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with no options and callback', done => {
    jsonld.toRDF({}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with options and promise', done => {
    const p = jsonld.toRDF({}, {});
    assert(p instanceof Promise);
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
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should fail with no args and callback', done => {
    jsonld.toRDF((err, output) => {
      assert(err);
      done();
    });
  });

  it('should fail with no args and promise', done => {
    const p = jsonld.toRDF();
    assert(p instanceof Promise);
    p.then(output => {
      assert.fail();
    }).catch(e => {
      assert(e);
      done();
    });
  });

  it('should fail for bad format and callback', done => {
    jsonld.toRDF({}, {format: 'bogus'}, (err, output) => {
      assert(err);
      assert.equal(err.name, 'jsonld.UnknownFormat');
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
    jsonld.toRDF(doc, {format: 'application/n-quads'}, (err, output) => {
      assert.ifError(err);
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
    jsonld.toRDF(doc, {format: 'application/nquads'}, (err, output) => {
      assert.ifError(err);
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

  it('should process with options and callback', done => {
    jsonld.fromRDF('', {}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with no options and callback', done => {
    jsonld.fromRDF(emptyNQuads, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with options and promise', done => {
    const p = jsonld.fromRDF(emptyNQuads, {});
    assert(p instanceof Promise);
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
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should fail with no args and callback', done => {
    jsonld.fromRDF((err, output) => {
      assert(err);
      done();
    });
  });

  it('should fail with no args and promise', done => {
    const p = jsonld.fromRDF();
    assert(p instanceof Promise);
    p.then(output => {
      assert.fail();
    }).catch(e => {
      assert(e);
      done();
    });
  });

  it('should fail for bad format and callback', done => {
    jsonld.fromRDF(emptyNQuads, {format: 'bogus'}, (err, output) => {
      assert(err);
      assert.equal(err.name, 'jsonld.UnknownFormat');
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
    jsonld.fromRDF(nq, {format: 'application/n-quads'}, (err, output) => {
      assert.ifError(err);
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
    jsonld.fromRDF(nq, {format: 'application/nquads'}, (err, output) => {
      assert.ifError(err);
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

  it('should handle loading multiple levels of contexts (callback)', done => {
    jsonld.expand(doc, {documentLoader}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, expected);
      done();
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
  "@graph": [
    {
      "toString": {
        "valueOf": "thing"
      }
    }
  ]
}
;
    const e = await jsonld.frame(d, frame);
    assert.deepStrictEqual(e, ex);
  });
});
