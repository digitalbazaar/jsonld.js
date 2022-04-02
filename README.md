jsonld.js
=========

[![Build status](https://img.shields.io/github/workflow/status/digitalbazaar/jsonld.js/Node.js%20CI)](https://github.com/digitalbazaar/jsonld.js/actions?query=workflow%3A%22Node.js+CI%22)
[![Coverage status](https://img.shields.io/codecov/c/github/digitalbazaar/jsonld.js)](https://codecov.io/gh/digitalbazaar/jsonld.js)
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

### Node.js + npm

```
npm install jsonld
```

```js
const jsonld = require('jsonld');
```

### Browser (bundler) + npm

```
npm install jsonld
```

Use your favorite bundling technology ([webpack][], [Rollup][], etc) to
directly bundle your code that loads `jsonld`. Note that you will need support
for ES2017+ code.

### Browser Bundles

The built npm package includes bundled code suitable for use in browsers. Two
versions are provided:

- `./dist/jsonld.min.js`: A version built for wide compatibility with modern
  and older browsers.  Includes many polyfills and code transformations and is
  larger and less efficient.
- `./dist/jsonld.esm.min.js`: A version built for features available in
  browsers that support ES Modules. Fewer polyfills and transformations are
  required making the code smaller and more efficient.

The two bundles can be used at the same to to allow modern browsers to use
newer code. Lookup using `script` tags with `type="module"` and `nomodule`.

Also see the `webpack.config.js` if you would like to make a custom bundle for
specific targets.

#### Browser (AMD) + npm

```
npm install jsonld
```

Use your favorite technology to load `node_modules/dist/jsonld.min.js`.

#### CDNJS CDN

To use [CDNJS](https://cdnjs.com/) include this script tag:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsonld/1.0.0/jsonld.min.js"></script>
```

Check https://cdnjs.com/libraries/jsonld for the latest available version.

#### jsDeliver CDN

To use [jsDeliver](https://www.jsdelivr.com/) include this script tag:

```html
<script src="https://cdn.jsdelivr.net/npm/jsonld@1.0.0/dist/jsonld.min.js"></script>
```

See https://www.jsdelivr.com/package/npm/jsonld for the latest available version.

#### unpkg CDN

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

### Node.js native canonize bindings

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
const compacted = await jsonld.compact(doc, context);
console.log(JSON.stringify(compacted, null, 2));
/* Output:
{
  "@context": {...},
  "name": "Manu Sporny",
  "homepage": "http://manu.sporny.org/",
  "image": "http://manu.sporny.org/images/manu.png"
}
*/

// compact using URLs
const compacted = await jsonld.compact(
  'http://example.org/doc', 'http://example.org/context', ...);
```

### [expand](http://json-ld.org/spec/latest/json-ld/#expanded-document-form)

```js
// expand a document, removing its context
const expanded = await jsonld.expand(compacted);
/* Output:
{
  "http://schema.org/name": [{"@value": "Manu Sporny"}],
  "http://schema.org/url": [{"@id": "http://manu.sporny.org/"}],
  "http://schema.org/image": [{"@id": "http://manu.sporny.org/images/manu.png"}]
}
*/

// expand using URLs
const expanded = await jsonld.expand('http://example.org/doc', ...);
```

### [flatten](http://json-ld.org/spec/latest/json-ld/#flattened-document-form)

```js
// flatten a document
const flattened = await jsonld.flatten(doc);
// output has all deep-level trees flattened to the top-level
```

### [frame](http://json-ld.org/spec/latest/json-ld-framing/#introduction)

```js
// frame a document
const framed = await jsonld.frame(doc, frame);
// output transformed into a particular tree structure per the given frame
```

### <a name="canonize"></a>[canonize](http://json-ld.github.io/normalization/spec/) (normalize)

```js
// canonize (normalize) a document using the RDF Dataset Normalization Algorithm
// (URDNA2015), see:
const canonized = await jsonld.canonize(doc, {
  algorithm: 'URDNA2015',
  format: 'application/n-quads'
});
// canonized is a string that is a canonical representation of the document
// that can be used for hashing, comparison, etc.
```

### <a name="tordf"></a>toRDF (N-Quads)

```js
// serialize a document to N-Quads (RDF)
const nquads = await jsonld.toRDF(doc, {format: 'application/n-quads'});
// nquads is a string of N-Quads
```

### <a name="fromrdf"></a>fromRDF (N-Quads)

```js
// deserialize N-Quads (RDF) to JSON-LD
const doc = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});
// doc is JSON-LD
```

### Custom RDF Parser

```js
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

// grab the built-in Node.js doc loader
const nodeDocumentLoader = jsonld.documentLoaders.node();
// or grab the XHR one: jsonld.documentLoaders.xhr()

// change the default document loader
const customLoader = async (url, options) => {
  if(url in CONTEXTS) {
    return {
      contextUrl: null, // this is for a context via a link header
      document: CONTEXTS[url], // this is the actual document that was loaded
      documentUrl: url // this is the actual context URL after redirects
    };
  }
  // call the default documentLoader
  return nodeDocumentLoader(url);
};
jsonld.documentLoader = customLoader;

// alternatively, pass the custom loader for just a specific call:
const compacted = await jsonld.compact(
  doc, context, {documentLoader: customLoader});
```

### Node.js Document Loader User-Agent

It is recommended to set a default `user-agent` header for Node.js
applications. The default for the default Node.js document loader is
`jsonld.js`.

### Events

**WARNING**: This feature is **experimental** and the API, events, codes,
levels, and messages may change.

Various events may occur during processing. The event handler system allows
callers to handle events as appropriate. Use cases can be as simple as logging
warnings, to displaying helpful UI hints, to failing on specific conditions.

**Note**: By default no event handler is used. This is due to general
performance considerations and the impossibility of providing a default handler
that would work for all use cases. Event construction and the handling system
are avoided by default providing the best performance for use cases where data
quality is known events are unnecessary.

#### Event Structure

Events are basic JSON objects with the following properties:

- **`code`**: A basic string code, similar to existing JSON-LD error codes.
- **`level`**: The severity level. Currently only `warning` is emitted.
- **`tags`**: Optional hints for the type of event. Currently defined:
  - **`unsafe`**: Event is considered unsafe.
  - **`lossy`**: Event is related to potential data loss.
  - **`empty`**: Event is related to empty data structures.
- **`message`**: A human readable message describing the event.
- **`details`**: A JSON object with event specific details.

#### Event Handlers

Event handlers are chainable functions, arrays of handlers, objects mapping
codes to handlers, or any mix of these structures. Each function is passed an
object with two properties:

- **`event`**: The event data.
- **`next`**: A function to call to an `event` and a `next`.

The event handling system will process the handler structure, calling all
handlers, and continuing onto the next handler if `next()` is called. To stop
processing, throw an error, or return without calling `next()`.

This design allows for composable handler structures, for instance to handle
some conditions with a custom handler, and default to generic "unknown event"
or logging handler.

**Note**: Handlers are currently synchronous due to possible performance
issues. This may change to an `async`/`await` design in the future.

```js
// expand a document with a logging event handler
const expanded = await jsonld.expand(data, {
  // simple logging handler
  eventHandler: function({event, next}) {
    console.log('event', {event});
  }
});
```

```js
function logEventHandler({event, next}) {
  console.log('event', {event});
  next();
}

function noWarningsEventHandler({event, next}) {
  if(event.level === 'warning') {
    throw new Error('No warnings!', {event});
  }
  next();
}

function unknownEventHandler({event, next}) {
  throw new Error('Unknown event', {event});
}

// expand a document with an array of event handlers
const expanded = await jsonld.expand(data, {
  // array of handlers
  eventHandler: [
    logEventHandler,
    noWarningsEventHandler,
    unknownEventHandler
  ]}
});
```

```js
const handler = {
  'a mild event code': function({event}) {
    console.log('the thing happened', {event});
  },
  'a serious event code': function({event}) {
    throw new Error('the specific thing happened', {event});
  }
};
// expand a document with a code map event handler
const expanded = await jsonld.expand(data, {eventHandler});
```

#### Safe Mode

A common use case is to avoid JSON-LD constructs that will result in lossy
behavior. The JSON-LD specifications have notes about when data is dropped.
This can be especially important when calling [`canonize`][] in order to
digitally sign data. The event system can be used to detect and avoid these
situations. A special "safe mode" is available that will inject an initial
event handler that fails on conditions that would result in data loss. More
benign events may fall back to the passed event handler, if any.

**Note**: This mode is designed to be the common way that digital signing and
similar applications use this library.

The `safe` options flag set to `true` enables this behavior:

```js
// expand a document in safe mode
const expanded = await jsonld.expand(data, {safe: true});
```

```js
// expand a document in safe mode, with fallback handler
const expanded = await jsonld.expand(data, {
  safe: true
  eventHandler: function({event}) { /* ... */ }
});
```

#### Available Handlers

Some predefined event handlers are available to use alone or as part of a more
complex handler:

- **safeModeEventHandler**: The handler used when `safe` is `true`.
- **strictModeEventHandler**: A handler that is more strict than the `safe`
  handler and also fails on other detectable events related to poor input
  structure.
- **logEventHandler**: A debugging handler that outputs to the console.
- **logWarningHandler**: A debugging handler that outputs `warning` level
  events to the console.
- **unhandledEventHandler**: Throws on all events not yet handled.

#### Default Event Handler

A default event handler can be set. It will be the only handler when not in
safe mode, and the second handler when in safe mode.

```js
// fail on unknown events
jsonld.setDefaultEventHandler(jsonld.unhandledEventHandler);
// will use safe mode handler, like `{safe: true}`
const expanded = await jsonld.expand(data);
```

```js
// always use safe mode event handler, ignore other events
jsonld.setDefaultEventHandler(jsonld.safeModeEventHandler);
// will use safe mode handler, like `{safe: true}`
const expanded = await jsonld.expand(data);
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

    JSONLD_TESTS=`pwd`/tests npm test

To generate EARL reports:

    # generate the EARL report for Node.js
    EARL=earl-node.jsonld npm test

    # generate the EARL report for the browser
    EARL=earl-firefox.jsonld npm run test-karma -- --browser Firefox

To generate an EARL report with the `json-ld-api` and `json-ld-framing` tests
as used on the official [JSON-LD Processor Conformance][] page

    JSONLD_TESTS="`pwd`/../json-ld-api/tests `pwd`/../json-ld-framing/tests" EARL="jsonld-js-earl.jsonld" npm test

The EARL `.jsonld` output can be converted to `.ttl` using the [rdf][] tool:

    rdf serialize jsonld-js-earl.jsonld --output-format turtle -o jsonld-js-earl.ttl

Optionally follow the [report
instructions](https://github.com/w3c/json-ld-api/tree/master/reports) to
generate the HTML report for inspection. Maintainers can
[submit](https://github.com/w3c/json-ld-api/pulls) updated results as needed.

Benchmarks
----------

Benchmarks can be created from any manifest that the test system supports.
Use a command line with a test suite and a benchmark flag:

    JSONLD_TESTS=/tmp/benchmark-manifest.jsonld JSONLD_BENCHMARK=1 npm test

EARL reports with benchmark data can be generated with an optional environment
details:

    JSONLD_TESTS=`pwd`/../json-ld.org/benchmarks/b001-manifiest.jsonld JSONLD_BENCHMARK=1 EARL=earl-test.jsonld TEST_ENV=1 npm test

See `tests/test.js` for more `TEST_ENV` control and options.

These reports can be compared with the `benchmarks/compare/` tool and at the
[JSON-LD Benchmarks][] site.

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

[JSON-LD Benchmarks]: https://json-ld.org/benchmarks/
[JSON-LD Processor Conformance]: https://w3c.github.io/json-ld-api/reports
[JSON-LD WG]: https://www.w3.org/2018/json-ld-wg/
[JSON-LD]: https://json-ld.org/
[Microdata]: http://www.w3.org/TR/microdata/
[Microformats]: http://microformats.org/
[RDFa]: http://www.w3.org/TR/rdfa-core/
[RFC7159]: http://tools.ietf.org/html/rfc7159
[Rollup]: https://rollupjs.org/
[WG test suite]: https://github.com/w3c/json-ld-api/tree/master/tests
[errata]: http://www.w3.org/2014/json-ld-errata
[jsonld-cli]: https://github.com/digitalbazaar/jsonld-cli
[jsonld-request]: https://github.com/digitalbazaar/jsonld-request
[rdf-canonize-native]: https://github.com/digitalbazaar/rdf-canonize-native
[test runner]: https://github.com/digitalbazaar/jsonld.js/blob/master/tests/test-common.js
[test suite]: https://github.com/json-ld/json-ld.org/tree/master/test-suite
[webpack]: https://webpack.js.org/
