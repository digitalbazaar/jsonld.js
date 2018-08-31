/**
 * Test the callback interface.
 */
const jsonld = require('..');
const assert = require('assert');

describe('callback API', () => {
  // common data
  const doc = {};
  const ctx = {};
  const frame = {};
  const options = {};

  it('should compact', done => {
    jsonld.compact(doc, ctx, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, []);
      done();
    });
  });
  it('should compact with options', done => {
    jsonld.compact(doc, ctx, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, []);
      done();
    });
  });

  it('should expand', done => {
    jsonld.expand(doc, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, []);
      done();
    });
  });
  it('should expand with options', done => {
    jsonld.expand(doc, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, []);
      done();
    });
  });

  it('should flatten', done => {
    jsonld.flatten(doc, ctx, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });
  it('should flatten with options', done => {
    jsonld.flatten(doc, ctx, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });

  it('should frame', done => {
    jsonld.frame(doc, frame, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });
  it('should frame with options', done => {
    jsonld.frame(doc, frame, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });

  it('should link', done => {
    jsonld.link(doc, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });
  it('should link with context', done => {
    jsonld.link(doc, ctx, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });
  it('should link with context and options', done => {
    jsonld.link(doc, ctx, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });

  it('should normalize', done => {
    jsonld.normalize(doc, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, '');
      done();
    });
  });
  it('should normalize with options', done => {
    jsonld.normalize(doc, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, '');
      done();
    });
  });

  it('should convert from RDF', done => {
    jsonld.fromRDF('', (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {});
      done();
    });
  });
  it('should convert from RDF with options', done => {
    jsonld.fromRDF('', options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {});
      done();
    });
  });

  it('should convert to RDF', done => {
    jsonld.toRDF(doc, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, []);
      done();
    });
  });
  it('should convert to RDF with options', done => {
    jsonld.toRDF(doc, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, []);
      done();
    });
  });

  it('should create node map', done => {
    jsonld.createNodeMap(doc, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, []);
      done();
    });
  });
  it('should create node map with options', done => {
    jsonld.createNodeMap(doc, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, []);
      done();
    });
  });

  it('should merge', done => {
    jsonld.merge([doc, doc], ctx, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });
  it('should merge with options', done => {
    jsonld.merge([doc, doc], ctx, options, (err, result) => {
      assert.ifError(err);
      assert.deepEqual(result, {'@graph': []});
      done();
    });
  });

  // TODO
  //it('should load document');
  //it('should get document');
  //it('should process context');
});
