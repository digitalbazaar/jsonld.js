/**
 * Test server.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
const crypto = require('node:crypto');
const express = require('express');
const fs = require('node:fs/promises');
const {join} = require('node:path');

// all known served static paths without proxy prefix
const pathMappings = [
  // JSON-LD Test Suites
  // W3C JSON-LD API
  ['/tests/test-suites/json-ld-api', '../test-suites/json-ld-api/tests'],
  ['/tests/siblings/json-ld-api', '../../json-ld-api/tests'],
  // W3C JSON-LD Framing
  ['/tests/test-suites/json-ld-framing',
    '../test-suites/json-ld-framing/tests'],
  ['/tests/siblings/json-ld-framing', '../../json-ld-framing/tests'],
  // json-ld.org test suite (old)
  // includes various *-manifest.jsonld files
  ['/tests/test-suites/json-ld.org', '../test-suites/json-ld.org/test-suite'],
  ['/tests/siblings/json-ld.org', '../../json-ld.org/test-suite/'],
  // W3C RDF Dataset Canonicalization "rdf-canon" test suite
  ['/tests/test-suites/rdf-canon', '../test-suites/rdf-canon/tests'],
  ['/tests/siblings/rdf-canon', '../../rdf-canon/tests'],
  // WebIDL
  ['/tests/webidl', './webidl']
];

/* eslint-disable */
const defaultManifestPath = '/tests/default/manifest.jsonld';
const defaultManifest = {
  "@context": [
    "https://w3c.github.io/json-ld-api/tests/context.jsonld"
  ],
  "@id": "",
  "@type": "mf:Manifest",
  "name": "jsonld.js common",
  "description": "",
  "baseIri": "",
  "sequence": [
    {
      "@id": "",
      "@type": "mf:Manifest",
      "name": "JSON-LD API",
      "urn:test:sequence:allowMissing": true,
      "urn:test:sequence:min": 1,
      "urn:test:sequence:max": 1,
      "sequence": [
        "../test-suites/json-ld-api",
        "../siblings/json-ld-api"
      ]
    },
    {
      "@id": "",
      "@type": "mf:Manifest",
      "name": "JSON-LD Framing",
      "urn:test:sequence:allowMissing": true,
      "urn:test:sequence:min": 1,
      "urn:test:sequence:max": 1,
      "sequence": [
        "../test-suites/json-ld-framing",
        "../siblings/json-ld-framing"
      ]
    },
    {
      "@id": "",
      "@type": "mf:Manifest",
      "name": "Old JSON-LD Test Suite",
      "skip": true,
      "urn:test:sequence:allowMissing": true,
      "urn:test:sequence:min": 1,
      "urn:test:sequence:max": 1,
      "sequence": [
        "../test-suites/json-ld.org",
        "../siblings/json-ld.org"
      ]
    },
    {
      "@id": "",
      "@type": "mf:Manifest",
      "name": "rdf-cannon",
      "urn:test:sequence:allowMissing": true,
      "urn:test:sequence:min": 1,
      "urn:test:sequence:max": 1,
      "sequence": [
        "../test-suites/rdf-canon",
        "../siblings/rdf-canon"
      ]
    }
  ]
};
/* eslint-enable */

class TestServer {
  constructor({
    earlFilename = null
  } = {}) {
    // allow list for EARL and benchmark file names
    this.earlFilename = earlFilename;
    // random auth token for this session
    this.authToken = crypto.randomUUID();
    this.url = null;
    this.httpServer = null;
    // static paths to serve. [[serverPath, localPath], ...]
    this.staticPaths = [];
    // served test config
    this.config = {};
  }

  checkAuthToken(req, res, next) {
    const auth = req.headers.authorization;
    if(auth !== `Bearer ${this.authToken}`) {
      throw new Error('bad auth');
    }
    next();
  }

  async start({
    port = 0,
    //server = '0.0.0.0'
    server = 'localhost'
  } = {}) {
    this.app = express();
    // limit adjusted to handle large EARL POSTs.
    this.app.use(express.json({limit: '10mb'}));
    // debug
    this.app.get('/ping', (req, res) => {
      res.send('pong');
    });

    // setup static routes
    for(const [route, relpath] of pathMappings) {
      this.app.use(route,
        this.checkAuthToken.bind(this),
        express.static(join(__dirname, relpath), {
          setHeaders: function(res, path/*, stat*/) {
            // handle extra extensions
            if(path.endsWith('.nq')) {
              res.setHeader('Content-Type', 'application/n-quads');
            }
          }
        }));
    }
    // setup routes to save data
    // uses static configured path to address security issues
    this.app.post('/earl',
      this.checkAuthToken.bind(this),
      async (req, res) => {
        if(!req.body) {
          res.status(400).send('no content');
          return;
        }
        await fs.writeFile(
          this.earlFilename,
          JSON.stringify(req.body, null, 2));
        res.status(200).end();
      });

    // test config
    this.app.get('/config',
      this.checkAuthToken.bind(this),
      (req, res) => {
        res.json(this.config);
      });

    // default manifest
    this.app.get(defaultManifestPath,
      this.checkAuthToken.bind(this),
      (req, res) => {
        res.json(defaultManifest);
      });

    const httpServerPromise = new Promise(resolve => {
      this.httpServer = this.app.listen({port, server}, () => {
        const address = this.httpServer.address();
        //const url = `http://${address.address}:${address.port}`;
        this.url = `http://${server}:${address.port}`;
        resolve();
      });
    });

    return httpServerPromise;
  }

  async close() {
    if(this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
  }
}

module.exports = {
  TestServer
};
