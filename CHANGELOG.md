# jsonld ChangeLog

## 0.5.16 - 2018-01-25

### Removed
- **BREAKING**: Remove `jsonld.version` API and `pkginfo` dependency. This
  feature added complexity and browser issues and the use case is likely
  handled by semantic versioning and using a proper dependency.

### Fixed
- Do not use native types to create IRIs in value expansion.
- Improved error detection for @container variations.
- Handle empty and relative `@base`.
- Remove shortcut from compactIri when IRI is a keyword (fixes compact-0073).

### Changed
- Set processingMode from options or first encountered context.
- Use array representation of @container in processing.
- **BREAKING**: Check for keys in term definition outside that expected:
  `@container`, `@id`, `@language`, `@reverse`, and `@type`. This also sets up
  for additional keywords in 1.1.

## 0.5.15 - 2017-10-16

### Changed
- **BREAKING**: Use RDF JS (rdf.js.org) interfaces for internal
  representation of dataset and quads. This should only break
  code that was using undocumented internal datastructures,
  backwards-compat code exists to handle external RDF parsers.
- Update `rdf-canonize` to dependency with native support.

## 0.5.14 - 2017-10-11

### Fixed
- Allow empty lists to be compacted to any @list container term. Fixes
  compact-0074 test.

## 0.5.13 - 2017-10-05

### Fixed
- Remote context retrieval bug.

### Removed
- **BREAKING**: Remove `promisify` API.

## 0.5.12 - 2017-10-05

### Changed
- **BREAKING**: Remove top-layer errors.

## 0.5.11 - 2017-09-28

### Removed
- **BREAKING**: Remove deprecated extensions API, including `jsonld.request`.

## 0.5.10 - 2017-09-21

### Added
- Add `expansionMap` and `compactionMap` options. These
  functions may be provided that will be called when an
  unmapped value or property will be dropped during expansion
  or compaction, respectively. The function map return either
  `undefined` to cause the default behavior, some other
  value to use instead of the default expanded/compacted value,
  or it may throw an error to stop expansion/compaction.

### Removed
- **BREAKING**: Remove deprecated `objectify` and `prependBase` APIs. Now
  `objectify` can be achieved via the `@link` option in framing and
  `prependBase` can be found via `url.prependBase`.
- **BREAKING**: Remove deprecated `namer` option from all public APIs, use
  `issuer` instead.
- **BREAKING**: Last active context used is no longer returned as an optional
  parameter to the `compact` callback.
- **BREAKING**: Do not expose deprecated `DocumentCache`.

### Changed
- **BREAKING**: Change default canonicalization algorithm to `URDNA2015`.

## 0.5.9 - 2017-09-21

### Fixed
- Callbackify bugs.
- Document loaders.
- Request queue.
- Handling of exceptios in callbacks.

### Added
- Various toRDF tests.

### Changed
- Move tests from test/ to tests/.

## 0.5.8 - 2017-09-20

### Changed
- Run all test-suite tests with promises and callbacks.

### Fixed
- Use Node.js "global" or webpack polyfill.

## 0.5.7 - 2017-09-20

### Fixed
- Distribute all js files, for real this time.

## 0.5.6 - 2017-09-20

### Fixed
- Fix `toRDF()`.

## 0.5.5 - 2017-09-20

### Fixed
- Distribute all js files.

## 0.5.4 - 2017-09-20

### Fixed
- Generate all js files for Node.js 6.

## 0.5.3 - 2017-09-20

### Changed
- Significant code reorganization and splitting into multiple files.

### Removed
- **BREAKING**: Explicit IE8 support. Webpack, babel, and/or polyfills may be
  of help if support is still needed.
- **BREAKING**: jQuery document loader. Use the XHR loader.
- `Object.keys` polyfill. Other tools can provide this.

### Fixed
- Handling of "global".

## 0.5.2 - 2017-09-19

### Fixed
- Distribute browser files.

## 0.5.1 - 2017-09-19

### Fixed
- Distribute unminified bundle.

## 0.5.0 - 2017-09-18

### Added
- Add .editorconfig support.
- `fetch-test-suites` and related `fetch-*-test-suite` NPM scripts.
- Support for `@graph` `@container`.

### Removed
- Bower support. Use NPM, a NPM proxy site, or build your own bundle.
- Makefile. Use NPM script targets.

### Changed
- Update url parser to remove default ports from URLs.
- Skip spec version 1.1 tests.
- **BREAKING**: Only support Node.js 6.x and later with ES2015 features.
- Build and use custom Node.js 6.x output so async/await/etc can be used.
- **BREAKING**: Move `js/jsonld.js` to `lib/jsonld.js`.
- **BREAKING**: Switch to CommonJS.
- **BREAKING**: Fixes to allow RFC3986 tests to pass. Some URI edge cases and
  certain base URIs with dot segments may cause different URI outputs.
- Switch to Karma for browser testing.
- Switch to webpack to build browser bundles.
- Add explicit feature compatibility libs to browser bundles.
- Use async APIs for test generation.
  - Done to allow testing in Node.js and browsers.
  - Required major testing changes to make everything async.
  - Workarounds added to get async generated mocha tests working.
- Improved support for loading various types of tests.
  - Can load local files, test manifests, or plain js files (in Node.js).
- Use ES2015 in tests and babel/webpack to support older platforms.
- Use rdf-canonize library, remove local implementation.

## 0.4.12 - 2017-04-24

### Fixed
- Fix `promises.compact` API when called with only 2 parameters.

## 0.4.11 - 2016-04-24

### Changed
- Add optimization for finding best CURIE matches.

## 0.4.10 - 2016-04-24

### Changed
- Add optimization for compacting keywords.

## 0.4.9 - 2016-04-23

### Changed
- Add optimizations for \_compactIri.

## 0.4.8 - 2016-04-14

### Fixed
- Revert es6-promise dependency to 2.x to avoid auto-polyfill behavior.

## 0.4.7 - 2016-04-14

### Fixed
- Testing document loader.

## 0.4.6 - 2016-03-02

### Added
- Add `headers` and `request` option for node doc loader.

### Changed
- Include local tests.

## 0.4.5 - 2016-01-19

### Fixed
- N-Quads comments pattern.
- Local tests.

## 0.4.4 - 2016-01-08

### Fixed
- Document cache in default node document loader is broken; disable
  until HTTP caching is implemented.

## 0.4.3 - 2016-01-05

### Fixed
- N-Quads may contain comments.

## 0.4.2 - 2015-10-12

### Added
- Add inputFormat and algorithm options to normalize.

### Changed
- Add support for normalization test suite.
- Support URDNA2015 normalization algorithm.
- Add async scheduling of normalization algorithms.

### Fixed
- Ignore null values in language maps.

## 0.4.1 - 2015-09-12

### Changed
- Ignore jsonld-request and pkginfo for browserify.

## 0.4.0 - 2015-09-12

### Breaking Changes
- "request" extension moved to [jsonld-request][]. This was done to simplify
  the core JSON-LD processing library. In particular, the extension pulled in
  RDFa processing code and related dependencies. The old method of using this
  exension of `jsonld.use('request')` is deprecated in favor of using the new
  module directly.
- The `jsonld` tool moved to [jsonld-cli][]. This was also done to simplify the
  core JSON-LD processing library and because it uses the [jsonld-request][]
  module.

## 0.3.26 - 2015-09-01

## Before 0.3.26

- See git history for changes.

[jsonld-cli]: https://github.com/digitalbazaar/jsonld-cli
[jsonld-request]: https://github.com/digitalbazaar/jsonld-request
