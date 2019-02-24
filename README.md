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

Conformance
-----------

This library aims to conform with the following:

* [JSON-LD 1.0][],
  W3C Recommendation,
  2014-01-16, and any [errata][]
* [JSON-LD 1.0 Processing Algorithms and API][JSON-LD 1.0 API],
  W3C Recommendation,
  2014-01-16, and any [errata][]
* [JSON-LD 1.0 Framing][JSON-LD 1.0 Framing],
  Unofficial Draft,
  2012-08-30
* [JSON-LD 1.1][JSON-LD CG 1.1],
  Draft Community Group Report,
  2018-06-07 or [newer][JSON-LD CG latest]
* [JSON-LD 1.1 Processing Algorithms and API][JSON-LD CG 1.1 API],
  Draft Community Group Report,
  2018-06-07 or [newer][JSON-LD CG API latest]
* [JSON-LD 1.1 Framing][JSON-LD CG 1.1 Framing],
  Draft Community Group Report,
  2018-06-07 or [newer][JSON-LD CG Framing latest]
* Community Group [test suite][]

The [JSON-LD Working Group][JSON-LD WG] is now developing JSON-LD 1.1. Library
updates to conform with newer specifications will happen as features stabilize
and development time and resources permit.

* [JSON-LD 1.1][JSON-LD WG 1.1],
  W3C Working Draft,
  2018-12-14 or [newer][JSON-LD WG latest]
* [JSON-LD 1.1 Processing Algorithms and API][JSON-LD WG 1.1 API],
  W3C Working Draft,
  2018-12-14 or [newer][JSON-LD WG API latest]
* [JSON-LD 1.1 Framing][JSON-LD WG 1.1 Framing],
  W3C Working Draft,
  2018-12-14 or [newer][JSON-LD WG Framing latest]
* Working Group [test suite][WG test suite]

The [test runner][] is often updated to note or skip newer tests that are not
yet supported.

Installation
------------

### node.js + npm

```
npm install jsonld
```

```js
const jsonld = require('jsonld');
```

### Browser (AMD) + npm

```
npm install jsonld
```

Use your favorite technology to load `node_modules/dist/jsonld.min.js`.

### CDNJS CDN

To use [CDNJS](https://cdnjs.com/) include this script tag:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsonld/1.0.0/jsonld.min.js"></script>
```

Check https://cdnjs.com/libraries/jsonld for the latest available version.

### jsDeliver CDN

To use [jsDeliver](https://www.jsdelivr.com/) include this script tag:

```html
<script src="https://cdn.jsdelivr.net/npm/jsonld@1.0.0/dist/jsonld.min.js"></script>
```

See https://www.jsdelivr.com/package/npm/jsonld for the latest available version.

### unpkg CDN

To use [unpkg](https://unpkg.com/) include this script tag:

```html

<script src="https://unpkg.com/jsonld@1.0.0/dist/jsonld.min.js"></script>
```

See https://unpkg.com/jsonld/ for the latest available version.

### JSPM

```
jspm install npm:jsonld
```

``` js
import * as jsonld from 'jsonld';
// or
import {promises} from 'jsonld';
// or
import {JsonLdProcessor} from 'jsonld';
```

### node.js native canonize bindings

For specialized use cases there is an optional [rdf-canonize-native][] package
available which provides a native implementation for `canonize()`. It is used
by installing the package and setting the `useNative` option of `canonize()` to
`true`. Before using this mode it is **highly recommended** to run benchmarks
since the JavaScript implementation is often faster and the bindings add
toolchain complexity.

```
npm install jsonld
npm install rdf-canonize-native
```

Examples
--------

Example data and context used throughout examples below:
```js
const doc = {
  "http://schema.org/name": "Manu Sporny",
  "http://schema.org/url": {"@id": "http://manu.sporny.org/"},
  "http://schema.org/image": {"@id": "http://manu.sporny.org/images/manu.png"}
};
const context = {
  "name": "http://schema.org/name",
  "homepage": {"@id": "http://schema.org/url", "@type": "@id"},
  "image": {"@id": "http://schema.org/image", "@type": "@id"}
};
```

### [compact](http://json-ld.org/spec/latest/json-ld/#compacted-document-form)

```js
// compact a document according to a particular context
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

// or using promises
const compacted = await jsonld.compact(doc, context);
```

### [expand](http://json-ld.org/spec/latest/json-ld/#expanded-document-form)

```js
// expand a document, removing its context
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

// or using promises
const expanded = await jsonld.expand(doc);
```

### [flatten](http://json-ld.org/spec/latest/json-ld/#flattened-document-form)

```js
// flatten a document
jsonld.flatten(doc, (err, flattened) => {
  // all deep-level trees flattened to the top-level
});

// or using promises
const flattened = await jsonld.flatten(doc);
```

### [frame](http://json-ld.org/spec/latest/json-ld-framing/#introduction)

```js
// frame a document
jsonld.frame(doc, frame, (err, framed) => {
  // document transformed into a particular tree structure per the given frame
});

// or using promises
const framed = await jsonld.frame(doc, frame);
```

### <a name="canonize"></a>[canonize](http://json-ld.github.io/normalization/spec/) (normalize)

```js
// canonize (normalize) a document using the RDF Dataset Normalization Algorithm
// (URDNA2015), see:
jsonld.canonize(doc, {
  algorithm: 'URDNA2015',
  format: 'application/n-quads'
}, (err, canonized) => {
  // canonized is a string that is a canonical representation of the document
  // that can be used for hashing, comparison, etc.
});

// or using promises
const canonized = await jsonld.canonize(doc, {format: 'application/n-quads'});
```

### <a name="tordf"></a>toRDF (N-Quads)

```js
// serialize a document to N-Quads (RDF)
jsonld.toRDF(doc, {format: 'application/n-quads'}, (err, nquads) => {
  // nquads is a string of N-Quads
});

// or using promises
const rdf = await jsonld.toRDF(doc, {format: 'application/n-quads'});
```

### <a name="fromrdf"></a>fromRDF (N-Quads)

```js
// deserialize N-Quads (RDF) to JSON-LD
jsonld.fromRDF(nquads, {format: 'application/n-quads'}, (err, doc) => {
  // doc is JSON-LD
});

// or using promises
const doc = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});
```

### Custom RDF Parser

```js
// register a custom async-callback-based RDF parser
jsonld.registerRDFParser(contentType, (input, callback) => {
  // parse input to a jsonld.js RDF dataset object...
  callback(err, dataset);
});

// register a custom synchronous RDF parser
jsonld.registerRDFParser(contentType, input => {
  // parse input to a jsonld.js RDF dataset object... and return it
  return dataset;
});

// register a custom promise-based RDF parser
jsonld.registerRDFParser(contentType, async input => {
  // parse input into a jsonld.js RDF dataset object...
  return new Promise(...);
});
```

### Custom Document Loader

```js
// how to override the default document loader with a custom one -- for
// example, one that uses pre-loaded contexts:

// define a mapping of context URL => context doc
const CONTEXTS = {
  "http://example.com": {
    "@context": ...
  }, ...
};

// grab the built-in node.js doc loader
const nodeDocumentLoader = jsonld.documentLoaders.node();
// or grab the XHR one: jsonld.documentLoaders.xhr()

// change the default document loader using the callback API
// (you can also do this using the promise-based API, return a promise instead
// of using a callback)
const customLoader = (url, callback) => {
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
const compacted = await jsonld.compact(
doc, context, {documentLoader: customLoader});
```

Related Modules
---------------

* [jsonld-cli][]: A command line interface tool called `jsonld` that exposes
  most of the basic jsonld.js API.
* [jsonld-request][]: A module that can read data from stdin, URLs, and files
  and in various formats and return JSON-LD.

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

The main test suites are included in external repositories. Check out each of
the following:

    https://github.com/w3c/json-ld-api
    https://github.com/w3c/json-ld-framing
    https://github.com/json-ld/json-ld.org
    https://github.com/json-ld/normalization

They should be sibling directories of the jsonld.js directory or in a
`test-suites` dir. To clone shallow copies into the `test-suites` dir you can
use the following:

    npm run fetch-test-suites

Node.js tests can be run with a simple command:

    npm test

If you installed the test suites elsewhere, or wish to run other tests, use
the `JSONLD_TESTS` environment var:

    JSONLD_TESTS="/tmp/org/test-suites /tmp/norm/tests" npm test

This feature can be used to run the older json-ld.org test suite:

    JSONLD_TESTS=/tmp/json-ld.org/test-suite npm test

Browser testing can be done with Karma:

    npm run test-karma
    npm run test-karma -- --browsers Firefox,Chrome

Code coverage of node tests can be generated in `coverage/`:

    npm run coverage

To display a full coverage report on the console from coverage data:

    npm run coverage-report

The Mocha output reporter can be changed to min, dot, list, nyan, etc:

    REPORTER=dot npm test

Remote context tests are also available:

    # run the context server in the background or another terminal
    node tests/remote-context-server.js

    JSONLD_TESTS=./tests npm test

To generate earl reports:

    # generate the earl report for node.js
    EARL=earl-node.jsonld npm test

    # generate the earl report for the browser
    EARL=earl-firefox.jsonld npm run test-karma -- --browser Firefox

Benchmarks
----------

Benchmarks can be created from any manifest that the test system supports.
Use a command line with a test suite and a benchmark flag:

    JSONLD_TESTS=/tmp/benchmark-manifest.jsonld JSONLD_BENCHMARK=1 npm test

[Digital Bazaar]: https://digitalbazaar.com/

[JSON-LD 1.0 API]: http://www.w3.org/TR/2014/REC-json-ld-api-20140116/
[JSON-LD 1.0 Framing]: https://json-ld.org/spec/ED/json-ld-framing/20120830/
[JSON-LD 1.0]: http://www.w3.org/TR/2014/REC-json-ld-20140116/

[JSON-LD CG 1.1 API]: https://json-ld.org/spec/FCGS/json-ld-api/20180607/
[JSON-LD CG 1.1 Framing]: https://json-ld.org/spec/FCGS/json-ld-framing/20180607/
[JSON-LD CG 1.1]: https://json-ld.org/spec/FCGS/json-ld/20180607/

[JSON-LD CG API latest]: https://json-ld.org/spec/latest/json-ld-api/
[JSON-LD CG Framing latest]: https://json-ld.org/spec/latest/json-ld-framing/
[JSON-LD CG latest]: https://json-ld.org/spec/latest/json-ld/

[JSON-LD WG 1.1 API]: https://www.w3.org/TR/json-ld11-api/
[JSON-LD WG 1.1 Framing]: https://www.w3.org/TR/json-ld11-framing/
[JSON-LD WG 1.1]: https://www.w3.org/TR/json-ld11/

[JSON-LD WG API latest]: https://w3c.github.io/json-ld-api/
[JSON-LD WG Framing latest]: https://w3c.github.io/json-ld-framing/
[JSON-LD WG latest]: https://w3c.github.io/json-ld-syntax/

[JSON-LD WG]: https://www.w3.org/2018/json-ld-wg/
[JSON-LD]: https://json-ld.org/
[Microdata]: http://www.w3.org/TR/microdata/
[Microformats]: http://microformats.org/
[RDFa]: http://www.w3.org/TR/rdfa-core/
[RFC7159]: http://tools.ietf.org/html/rfc7159
[WG test suite]: https://github.com/w3c/json-ld-api/tree/master/tests
[errata]: http://www.w3.org/2014/json-ld-errata
[jsonld-cli]: https://github.com/digitalbazaar/jsonld-cli
[jsonld-request]: https://github.com/digitalbazaar/jsonld-request
[rdf-canonize-native]: https://github.com/digitalbazaar/rdf-canonize-native
[test runner]: https://github.com/digitalbazaar/jsonld.js/blob/master/tests/test-common.js
[test suite]: https://github.com/json-ld/json-ld.org/tree/master/test-suite
