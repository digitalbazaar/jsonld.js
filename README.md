jsonld.js
=========

[![Build status](https://img.shields.io/travis/digitalbazaar/jsonld.js.svg)](https://travis-ci.org/digitalbazaar/jsonld.js)
[![Dependency Status](https://img.shields.io/david/digitalbazaar/jsonld.js.svg)](https://david-dm.org/digitalbazaar/jsonld.js)

Introduction
------------

This library is an implementation of the [JSON-LD][] specification in
JavaScript.

JSON, as specified in [RFC7159][], is a simple language for representing
objects on the Web. Linked Data is a way of describing content across
different documents or Web sites. Web resources are described using
IRIs, and typically are dereferencable entities that may be used to find
more information, creating a "Web of Knowledge". [JSON-LD][] is intended
to be a simple publishing method for expressing not only Linked Data in
JSON, but for adding semantics to existing JSON.

JSON-LD is designed as a light-weight syntax that can be used to express
Linked Data. It is primarily intended to be a way to express Linked Data
in JavaScript and other Web-based programming environments. It is also
useful when building interoperable Web Services and when storing Linked
Data in JSON-based document storage engines. It is practical and
designed to be as simple as possible, utilizing the large number of JSON
parsers and existing code that is in use today. It is designed to be
able to express key-value pairs, RDF data, [RDFa][] data,
[Microformats][] data, and [Microdata][]. That is, it supports every
major Web-based structured data model in use today.

The syntax does not require many applications to change their JSON, but
easily add meaning by adding context in a way that is either in-band or
out-of-band. The syntax is designed to not disturb already deployed
systems running on JSON, but provide a smooth migration path from JSON
to JSON with added semantics. Finally, the format is intended to be fast
to parse, fast to generate, stream-based and document-based processing
compatible, and require a very small memory footprint in order to operate.

## Requiring jsonld.js:

### node.js + npm

```
npm install jsonld
```

```js
var jsonld = require('jsonld');
```

### Browser (AMD) + bower

```
bower install jsonld
```

```js
require.config({
  paths: {
    jsonld: 'bower_components/jsonld/js/jsonld'
  }
});
define(['jsonld'], function(jsonld) { ... });
```

### Browser + script tag

```html
<!-- For legacy browsers include a Promise polyfill like
  es6-promise before including jsonld.js -->
<script src="//cdn.jsdelivr.net/g/es6-promise@1.0.0"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/jsonld/0.3.15/jsonld.js"></script>
```

## Quick Examples

```js
var doc = {
  "http://schema.org/name": "Manu Sporny",
  "http://schema.org/url": {"@id": "http://manu.sporny.org/"},
  "http://schema.org/image": {"@id": "http://manu.sporny.org/images/manu.png"}
};
var context = {
  "name": "http://schema.org/name",
  "homepage": {"@id": "http://schema.org/url", "@type": "@id"},
  "image": {"@id": "http://schema.org/image", "@type": "@id"}
};

// compact a document according to a particular context
// see: http://json-ld.org/spec/latest/json-ld/#compacted-document-form
jsonld.compact(doc, context, function(err, compacted) {
  console.log(JSON.stringify(compacted, null, 2));
  /* Output:
  {
    "@context": {...},
    "name": "Manu Sporny",
    "homepage": "http://manu.sporny.org/",
    "image": "http://manu.sporny.org/images/manu.png"
  }
  */
});

// compact using URLs
jsonld.compact('http://example.org/doc', 'http://example.org/context', ...);

// expand a document, removing its context
// see: http://json-ld.org/spec/latest/json-ld/#expanded-document-form
jsonld.expand(compacted, function(err, expanded) {
  /* Output:
  {
    "http://schema.org/name": [{"@value": "Manu Sporny"}],
    "http://schema.org/url": [{"@id": "http://manu.sporny.org/"}],
    "http://schema.org/image": [{"@id": "http://manu.sporny.org/images/manu.png"}]
  }
  */
});

// expand using URLs
jsonld.expand('http://example.org/doc', ...);

// flatten a document
// see: http://json-ld.org/spec/latest/json-ld/#flattened-document-form
jsonld.flatten(doc, function(err, flattened) {
  // all deep-level trees flattened to the top-level
});

// frame a document
// see: http://json-ld.org/spec/latest/json-ld-framing/#introduction
jsonld.frame(doc, frame, function(err, framed) {
  // document transformed into a particular tree structure per the given frame
});

// normalize a document
jsonld.normalize(doc, {format: 'application/nquads'}, function(err, normalized) {
  // normalized is a string that is a canonical representation of the document
  // that can be used for hashing
});

// serialize a document to N-Quads (RDF)
jsonld.toRDF(doc, {format: 'application/nquads'}, function(err, nquads) {
  // nquads is a string of nquads
});

// deserialize N-Quads (RDF) to JSON-LD
jsonld.fromRDF(nquads, {format: 'application/nquads'}, function(err, doc) {
  // doc is JSON-LD
});

// register a custom async-callback-based RDF parser
jsonld.registerRDFParser = function(contentType, function(input, callback) {
  // parse input to a jsonld.js RDF dataset object...
  callback(err, dataset);
});

// register a custom synchronous RDF parser
jsonld.registerRDFParser = function(contentType, function(input) {
  // parse input to a jsonld.js RDF dataset object... and return it
  return dataset;
});

// use the promises API
var promises = jsonld.promises;

// compaction
var promise = promises.compact(doc, context);
promise.then(function(compacted) {...}, function(err) {...});

// expansion
var promise = promises.expand(doc);
promise.then(function(expanded) {...}, function(err) {...});

// flattening
var promise = promises.flatten(doc);
promise.then(function(flattened) {...}, function(err) {...});

// framing
var promise = promises.frame(doc, frame);
promise.then(function(framed) {...}, function(err) {...});

// normalization
var promise = promises.normalize(doc, {format: 'application/nquads'});
promise.then(function(normalized) {...}, function(err) {...});

// serialize to RDF
var promise = promises.toRDF(doc, {format: 'application/nquads'});
promise.then(function(nquads) {...}, function(err) {...});

// deserialize from RDF
var promise = promises.fromRDF(nquads, {format: 'application/nquads'});
promise.then(function(doc) {...}, function(err) {...});

// register a custom promise-based RDF parser
jsonld.registerRDFParser = function(contentType, function(input) {
  // parse input into a jsonld.js RDF dataset object...
  return new Promise(...);
});

// how to override the default document loader with a custom one -- for
// example, one that uses pre-loaded contexts:

// define a mapping of context URL => context doc
var CONTEXTS = {
  "http://example.com": {
    "@context": ...
  }, ...
};

// grab the built-in node.js doc loader
var nodeDocumentLoader = jsonld.documentLoaders.node();
// or grab the XHR one: jsonld.documentLoaders.xhr()
// or grab the jquery one: jsonld.documentLoaders.jquery()

// change the default document loader using the callback API
// (you can also do this using the promise-based API, return a promise instead
// of using a callback)
var customLoader = function(url, callback) {
  if(url in CONTEXTS) {
    return callback(
      null, {
        contextUrl: null, // this is for a context via a link header
        document: CONTEXTS[url], // this is the actual document that was loaded
        documentUrl: url // this is the actual context URL after redirects
      });
  }
  // call the underlining documentLoader using the callback API.
  nodeDocumentLoader(url, callback);
  /* Note: By default, the node.js document loader uses a callback, but
  browser-based document loaders (xhr or jquery) return promises if they
  are supported (or polyfilled) in the browser. This behavior can be
  controlled with the 'usePromise' option when constructing the document
  loader. For example: jsonld.documentLoaders.xhr({usePromise: false}); */
};
jsonld.documentLoader = customLoader;

// alternatively, pass the custom loader for just a specific call:
jsonld.compact(doc, context, {documentLoader: customLoader},
  function(err, compacted) { ... });
```

Using the Command-line Tool
---------------------------

The jsonld command line tool can be used to:

 * Transform JSON-LD to compact, expanded, normalized, or flattened form
 * Transform RDFa to JSON-LD
 * Normalize JSON-LD/RDFa Datasets to NQuads

Install the tool:

    npm install -g jsonld

To compact a document on the Web using a JSON-LD context published on
the Web:

    jsonld compact -c "https://w3id.org/payswarm/v1" "http://recipes.payswarm.com/?p=10554"

The command above will read in a PaySwarm Asset and Listing in RDFa 1.0 format,
convert it to JSON-LD expanded form, compact it using the
'https://w3id.org/payswarm/v1' context, and dump it out to the console in
compacted form.

    jsonld normalize -q "http://recipes.payswarm.com/?p=10554"

The command above will read in a PaySwarm Asset and Listing in RDFa 1.0 format,
normalize the data using the RDF Dataset normalization algorithm, and
then dump the output to normalized NQuads format. The NQuads can then be
processed via SHA-256, or similar algorithm, to get a deterministic hash
of the contents of the Dataset.

Commercial Support
------------------

Commercial support for this library is available upon request from
[Digital Bazaar][]: support@digitalbazaar.com

Source
------

The source code for the JavaScript implementation of the JSON-LD API
is available at:

http://github.com/digitalbazaar/jsonld.js

Tests
-----

This library includes a sample testing utility which may be used to verify
that changes to the processor maintain the correct output.

To run the sample tests you will need to get the test suite files by cloning
the [json-ld.org repository][json-ld.org] hosted on GitHub:

https://github.com/json-ld/json-ld.org

If the json-ld.org directory is a sibling of the jsonld.js directory:

    make test

If you installed the test suite elsewhere:

    make test JSONLD_TEST_SUITE={PATH_TO_YOUR_JSON_LD_ORG}/test-suite}

The standard tests will run node and browser tests. Just one type can also
be run:

    make test-node
    make test-browser

Code coverage of node tests can be generated in `coverage/`:

    make test-coverage

The Mocha output reporter can be changed to min, dot, list, nyan, etc:

    make test REPORTER=dot

Remote context tests are also available:

    # run the context server in the background or another terminal
    node tests/remote-context-server.js

    make test JSONLD_TEST_SUITE=./tests

To generate earl reports:

    # generate the earl report for node.js
    ./node_modules/.bin/mocha -R spec tests/test.js --earl earl-node.jsonld

    # generate the earl report for the browser
    ./node_modules/.bin/phantomjs tests/test.js --earl earl-browser.jsonld

[Digital Bazaar]: http://digitalbazaar.com/
[JSON-LD]: http://json-ld.org/
[Microdata]: http://www.w3.org/TR/microdata/
[Microformats]: http://microformats.org/
[RDFa]: http://www.w3.org/TR/rdfa-core/
[RFC7159]: http://tools.ietf.org/html/rfc7159
[json-ld.org]: https://github.com/json-ld/json-ld.org
