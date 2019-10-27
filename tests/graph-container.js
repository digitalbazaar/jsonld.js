/**
 * Temporary graph-container tests.
 */
// disable so tests can be copy & pasted
/* eslint-disable quotes, quote-props */
const jsonld = require('..');
const assert = require('assert');

describe('@graph container', () => {
  it('should expand @graph container', done => {
    const doc = {
      "@context": {
        "@version": 1.1,
        "input": {"@id": "foo:input", "@container": "@graph"},
        "value": "foo:value"
      },
      "input": {
        "value": "x"
      }
    };
    const p = jsonld.expand(doc);
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(expanded => {
      assert.deepEqual(expanded, [{
        "foo:input": [{
          "@graph": [{
            "foo:value": [{
              "@value": "x"
            }]
          }]
        }]
      }]);
      done();
    });
  });

  it('should expand ["@graph", "@set"] container', done => {
    const doc = {
      "@context": {
        "@version": 1.1,
        "input": {"@id": "foo:input", "@container": ["@graph", "@set"]},
        "value": "foo:value"
      },
      "input": [{
        "value": "x"
      }]
    };
    const p = jsonld.expand(doc);
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(expanded => {
      assert.deepEqual(expanded, [{
        "foo:input": [{
          "@graph": [{
            "foo:value": [{
              "@value": "x"
            }]
          }]
        }]
      }]);
      done();
    });
  });

  it('should expand and then compact @graph container', done => {
    const doc = {
      "@context": {
        "@version": 1.1,
        "input": {"@id": "foo:input", "@container": "@graph"},
        "value": "foo:value"
      },
      "input": {
        "value": "x"
      }
    };
    const p = jsonld.expand(doc);
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(expanded => {
      const p = jsonld.compact(expanded, doc['@context']);
      assert(p instanceof Promise);
      p.catch(e => {
        assert.ifError(e);
      }).then(compacted => {
        assert.deepEqual(compacted, {
          "@context": {
            "@version": 1.1,
            "input": {
              "@id": "foo:input",
              "@container": "@graph"
            },
            "value": "foo:value"
          },
          "input": {
            "value": "x"
          }
        });
        done();
      });
    });
  });

  it('should expand and then compact @graph container into a @set', done => {
    const doc = {
      "@context": {
        "@version": 1.1,
        "input": {"@id": "foo:input", "@container": "@graph"},
        "value": "foo:value"
      },
      "input": {
        "value": "x"
      }
    };
    const newContext = {
      "@context": {
        "@version": 1.1,
        "input": {"@id": "foo:input", "@container": ["@graph", "@set"]},
        "value": "foo:value"
      }
    };
    const p = jsonld.expand(doc);
    assert(p instanceof Promise);
    p.catch(e => {
      assert.ifError(e);
    }).then(expanded => {
      const p = jsonld.compact(expanded, newContext);
      assert(p instanceof Promise);
      p.catch(e => {
        assert.ifError(e);
      }).then(compacted => {
        assert.deepEqual(compacted, {
          "@context": {
            "@version": 1.1,
            "input": {
              "@id": "foo:input",
              "@container": [
                "@graph",
                "@set"
              ]
            },
            "value": "foo:value"
          },
          "input": [
            {
              "value": "x"
            }
          ]
        });
        done();
      });
    });
  });
});
