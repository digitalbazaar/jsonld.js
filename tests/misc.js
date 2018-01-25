/**
 * Misc tests.
 */
const jsonld = require('..');
const assert = require('assert');

// TODO: need more tests for jsonld.link and jsonld.merge

describe('link tests', () => {
  const doc = {
    '@id': 'ex:1',
    'a:foo': {
      '@id': 'ex:1'
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
  const docA = {'@id': 'ex:1', 'a:foo': [{'@value': 1}]};
  const docB = {'@id': 'ex:1', 'b:foo': [{'@value': 2}]};
  const merged = [Object.assign({}, docA, docB)];

  it('should merge nodes from two different documents', done => {
    jsonld.merge([docA, docB], (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, merged);
      done();
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
    })
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

  it('should handle nquads format', done => {
    const doc = {
      '@id': 'https://example.com/',
      'https://example.com/test': 'test'
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

describe('loading multiple levels of contexts', () => {
  const documentLoader = url => {
    if(url === 'https://example.com/context1') {
      return {
        document: {
          '@context': {
            'ex': 'https://example.com/#'
          }
        },
        contextUrl: null,
        documentUrl: url
      }
    }
    if(url === 'https://example.com/context2') {
      return {
        document: {
          '@context': {
            'ex': 'https://example.com/#'
          }
        },
        contextUrl: null,
        documentUrl: url
      }
    }
  };
  const doc = {
    '@context': 'https://example.com/context1',
    'ex:foo': {
      '@context': 'https://example.com/context2',
      'ex:bar': 'test'
    }
  };
  const expected = [{
    'https://example.com/#foo': [{
      'https://example.com/#bar': [{
        '@value': 'test'
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
