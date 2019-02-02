/**
 * Temporary graph-container tests.
 */
const jsonld = require('..');
const assert = require('assert');

describe('@graph container', () => {
  it('should expand @graph container', done => {
    const doc = {
      '@context': {
        '@version': 1.1,
        'input': {'@id': 'foo:input', '@container': '@graph'},
        'value': 'foo:value'
      },
      input: {
        value: 'x'
      }
    };
    jsonld.expand(doc, (err, expanded) => {
      assert.ifError(err);
      assert.deepEqual(expanded, [{
        'foo:input': [{
          '@graph': [{
            'foo:value': [{
              '@value': 'x'
            }]
          }]
        }]
      }]);
      done();
    });
  });

  it('should expand ["@graph", "@set"] container', done => {
    const doc = {
      '@context': {
        '@version': 1.1,
        'input': {'@id': 'foo:input', '@container': ['@graph', '@set']},
        'value': 'foo:value'
      },
      input: [{
        value: 'x'
      }]
    };
    jsonld.expand(doc, (err, expanded) => {
      assert.ifError(err);
      assert.deepEqual(expanded, [{
        'foo:input': [{
          '@graph': [{
            'foo:value': [{
              '@value': 'x'
            }]
          }]
        }]
      }]);
      done();
    });
  });

  it('should expand and then compact @graph container', done => {
    const doc = {
      '@context': {
        '@version': 1.1,
        'input': {'@id': 'foo:input', '@container': '@graph'},
        'value': 'foo:value'
      },
      input: {
        value: 'x'
      }
    };
    jsonld.expand(doc, (err, expanded) => {
      assert.ifError(err);

      jsonld.compact(expanded, doc['@context'], (err, compacted) => {
        assert.ifError(err);
        assert.deepEqual(compacted, {
          '@context': {
            '@version': 1.1,
            'input': {
              '@id': 'foo:input',
              '@container': '@graph'
            },
            'value': 'foo:value'
          },
          'input': {
            'value': 'x'
          }
        });
        done();
      });
    });
  });

  it('should expand and then compact @graph container into a @set', done => {
    const doc = {
      '@context': {
        '@version': 1.1,
        'input': {'@id': 'foo:input', '@container': '@graph'},
        'value': 'foo:value'
      },
      input: {
        value: 'x'
      }
    };
    const newContext = {
      '@context': {
        '@version': 1.1,
        'input': {'@id': 'foo:input', '@container': ['@graph', '@set']},
        'value': 'foo:value'
      }
    };
    jsonld.expand(doc, (err, expanded) => {
      assert.ifError(err);

      jsonld.compact(expanded, newContext, (err, compacted) => {
        assert.ifError(err);
        assert.deepEqual(compacted, {
          '@context': {
            '@version': 1.1,
            'input': {
              '@id': 'foo:input',
              '@container': [
                '@graph',
                '@set'
              ]
            },
            'value': 'foo:value'
          },
          'input': [
            {
              'value': 'x'
            }
          ]
        });
        done();
      });
    });
  });
});
