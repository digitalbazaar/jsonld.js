/**
 * Local tests for the Node.js document loader
 *
 * @author goofballLogic
 */
/* eslint-disable quote-props */
const jsonld = require('..');
const assert = require('assert');
const express = require('express');
const http = require('http');
const https = require('https');

// local test server and url
let _httpServer;
let _httpsServer;
let _httpUrl;
let _httpsUrl;

// test data
const _data = {
  d0: {
    content: {}
  },
  d1: {
    content: {
      'urn:example:p1': 'v1'
    },
    expanded: [{
      'urn:example:p1': [{
        '@value': 'v1'
      }]
    }]
  },
  d2: {
    content: {
      'test': 'v1'
    },
    context: {
      '@context': {
        'test': 'urn:example:test'
      }
    },
    expanded: [{
      'urn:example:test': [{
        '@value': 'v1'
      }]
    }]
  }
};

function _makeUrl({scheme, type, id}) {
  return `${scheme}/${type ? type + '/' : ''}${id}`;
}

function _makeHttpUrl({type, id}) {
  return _makeUrl({scheme: _httpUrl, type, id});
}

function _makeHttpsUrl({type, id}) {
  return _makeUrl({scheme: _httpsUrl, type, id});
}

// local express app
const _app = express();
// store request data for test inspection
// reset manually as needed
let _expressRequests = [];

function _clearExpressRequests() {
  _expressRequests = [];
}

// middleware to store request data
// eslint-disable-next-line no-unused-vars
function _store(req, res, next) {
  _expressRequests.push({
    url: req.url,
    headers: req.headers
  });
  next();
}

_app.get('/data/:id', _store, (req, res) => {
  res.json(_data[req.params.id].content);
});

_app.get('/link/:id', _store, (req, res) => {
  const link = _makeHttpUrl({type: 'data', id: 'd1'});
  res.set('Link',
    `<${link}>; rel="alternate"; type="application/ld+json"`);
  res.set('Content-Type', 'text/plain');
  res.status(200).send('not json');
});

_app.get('/context/:id', _store, (req, res) => {
  res.json(_data[req.params.id].context);
});

_app.get('/contextlink/:id', _store, (req, res) => {
  const link = _makeHttpUrl({type: 'context', id: 'd2'});
  res.set('Link', `<${link}>; rel="http://www.w3.org/ns/json-ld#context"`);
  res.json(_data[req.params.id].content);
});

_app.get('/contextlink2/:id', _store, (req, res) => {
  const link = _makeHttpUrl({type: 'context', id: 'd2'});
  res.set('Link',
    `<${link}>; rel="http://www.w3.org/ns/json-ld#context", ` +
    `<${link}>; rel="http://www.w3.org/ns/json-ld#context"`);
  res.json(_data[req.params.id].content);
});

// infinite redirect to self loop
_app.get('/loop/:id', _store, (req, res) => {
  res.redirect(req.url);
});

// redirect to self id+1 loop, fail at high limit
_app.get('/loopinc/:id', _store, (req, res) => {
  const id = parseInt(req.params.id);
  if(id === 100) {
    res.status(500).send();
    return;
  }
  const nextUrl = `/loopinc/${id + 1}`;
  res.redirect(nextUrl);
});

_app.get('/status/:status', _store, (req, res) => {
  res.status(parseInt(req.params.status)).send();
});

// check headers present
function _checkExpectedHeaders(received, expected) {
  const normalizedReceived =
    new Map(Object.entries(received).map(([k, v]) => [k.toLowerCase(), v]));
  const normalizedExpected =
    new Map(Object.entries(expected).map(([k, v]) => [k.toLowerCase(), v]));

  normalizedExpected.forEach((v, k) => {
    assert.ok(normalizedReceived.has(k), 'header found');
    assert.equal(normalizedReceived.get(k), v, 'value found');
  });
}

// check headers not present
/*
function _checkUnexpectedHeaders(received, unexpected) {
  const normalizedReceived =
    new Map(Object.entries(received).map(([k, v]) => [k.toLowerCase(), v]));
  const normalizedUnexpected =
    new Map(Object.entries(unexpected).map(([k, v]) => [k.toLowerCase(), v]));

  normalizedUnexpected.forEach((v, k) => {
    if(v === null) {
      assert.ok(!normalizedReceived.has(k), 'unexpected header found');
    } else {
      assert.notEqual(normalizedReceived.get(k), v, 'wrong value found');
    }
  });
}
*/

describe('Node.js document loader', function() {
  before(async function() {
    const httpPromise = new Promise(resolve => {
      _httpServer = http.createServer(_app).listen({
        port: 0,
        host: '0.0.0.0'
      }, () => {
        const address = _httpServer.address();
        _httpUrl = `http://${address.address}:${address.port}`;
        //console.log('http listen', {address, url: _httpUrl});
        resolve();
      });
    });
    const httpsPromise = new Promise(resolve => {
      // test HTTPS server self-signed cert
      // inline to avoid fs usage
      //
      // $ openssl genrsa -out test-key.pem 2048
      // $ openssl req -new -sha256 -key test-key.pem -out test-csr.pem
      // $ openssl x509 -req -in test-csr.pem -signkey test-key.pem \
      //     -out test-cert.pem -days 9999
      const options = {
        key: `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAs/ozaW1EcJ06ynTrTclbMsD9S3Qw5DgBYO8KcU3JfyqtJVKC
ZMTu/gGcSNNWn6Li70Co/SsS6So8yxe+tOZjVOoIOYGin7xBaPbRJxZsLj50vnZe
QCJZkq27iHUUc6YvGFXKWmz3fnk1+yKts2+FXWw0z99oX9IhQMsOopAg/w4tkkD0
1UL4XWhVLLPvN8AYiNbcRHXm6eSWOzAn7hTu8N185wACJ4G92PIXYMrKY1wQd0Bs
ZzWltGPI9CZjfTaionUVpod+eW21Gibzo71gOnVytpyVM1vnLVce+bQ9q/nMS5EZ
nLCiHmdTE6Ga+0HXOiDVq+VExf5aoM721dNqqQIDAQABAoIBAQCZEIxS+HwBbqcG
cmOAl2Q5iQqi9mFyZvM9Nm9iJ27b+TaijEabXyWG32XERgDg6Y4pPou6LLz7klF7
xGkLvvjxycxO5CKjyV6z313H6Xj9514wccj8sHoPljPs/O304XwiLSxYtV3TsVCo
kji6Z3k8F//eXrmM7NAdI9UBiqSVZVJwFzuX6h4JxFPHqXB0J9ixqTy2+O1AnUcW
5eMxanm1cZ+c25GuZxB2jeZXC33QdXyYoF8aaUr0DzZoXJvZYFJPOYh8oHfWkl7/
UlrL/xCa0h3AbpswPKUTxh04dX+SLYCLcJngCwc6PrnCYlqEWErz0jM/DsdbvquD
tSTp5UTlAoGBAOaLH9R7bfHMYQsoc949t2dRbqXpBlQZcRpFnC9gMkAzzWfE4+tJ
nQ3td9i4stKa3NIYM11+3LAVnsEtIq1JHoQhOg8TwSVZHxmOD/aBF+x9B0FFFPu+
lDMSFY59xr6byjFYk8Yhx9nSEu4hF8KeOPCgB3VLGndGQfozbvgbYjmbAoGBAMfZ
s5k7vqYWJUwaFGxQn9gNcO/zO0RzW5aUWn+QZj1BTF/lV/AvRfL75VS9cVIdKugf
mU+xX0AMUjQIbF8WkKZsRNLpGbV9wVjop843W1UFwySC/GyS+Hv963RyH3orJ9zd
E2Apu6syFw80bdnuVvr8M0at2CAHNfh1WGxEPGMLAoGAWRgk+emlaI+SZUyB0r5J
FX2L5EQ0tOWMJxoFrO1hHhym4dZeOnydXFeMPE3MlcVRV0QQ/a3cPZRtYLw/rXYX
e/qXRGJe/z783NRg6OOkyjjbR+cZn9xby4zOld2Xo+vy7LUNjsFZSZ18wVg6pXSe
DqfZmgOnO7cEIlwkI2/5uscCgYBrs+h1YVxKd87b54YwJXcvYXcG6ad8KUsnqIXp
D3H5+xHk8F1nBKMG4zfhZkMHBM8Vz8m4yBdUFg/LGOsGh8um1Nx2acdAJyim+KNO
oEipVnSnXawZ+07My7gzxjkuhslx3vbNMVCBX3pL6G53L1pS4s3jflbmU9yDLQJd
PpzopwKBgD3cIlgRyQRIFJXDxP0NaQMcv7PsX+awzczbmxhCc1T66XJMlaDiENNZ
vs9rKXa1CjSfXIWtfS4TZMk2Q1noHaHMtALciFOs2p1vhzW948DpYl9kUdoUXPnK
GHFole/Sy/jni5GD+jfie5OY50ODYpMPFEYVtjwIOQbQJSnm5/Td
-----END RSA PRIVATE KEY-----
`,
        cert: `
-----BEGIN CERTIFICATE-----
MIIDJDCCAgwCCQCaBKuYhp5Y1DANBgkqhkiG9w0BAQUFADBUMQswCQYDVQQGEwJV
UzERMA8GA1UECAwIVmlyZ2luaWExEzARBgNVBAcMCkJsYWNrc2J1cmcxHTAbBgNV
BAoMFERpZ2l0YWwgQmF6YWFyLCBJbmMuMB4XDTIxMDMxMTIzMTYwOFoXDTQ4MDcy
NjIzMTYwOFowVDELMAkGA1UEBhMCVVMxETAPBgNVBAgMCFZpcmdpbmlhMRMwEQYD
VQQHDApCbGFja3NidXJnMR0wGwYDVQQKDBREaWdpdGFsIEJhemFhciwgSW5jLjCC
ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALP6M2ltRHCdOsp0603JWzLA
/Ut0MOQ4AWDvCnFNyX8qrSVSgmTE7v4BnEjTVp+i4u9AqP0rEukqPMsXvrTmY1Tq
CDmBop+8QWj20ScWbC4+dL52XkAiWZKtu4h1FHOmLxhVylps9355NfsirbNvhV1s
NM/faF/SIUDLDqKQIP8OLZJA9NVC+F1oVSyz7zfAGIjW3ER15unkljswJ+4U7vDd
fOcAAieBvdjyF2DKymNcEHdAbGc1pbRjyPQmY302oqJ1FaaHfnlttRom86O9YDp1
craclTNb5y1XHvm0Pav5zEuRGZywoh5nUxOhmvtB1zog1avlRMX+WqDO9tXTaqkC
AwEAATANBgkqhkiG9w0BAQUFAAOCAQEAM51ko21iLRlaV5fh37ErlVXM7iB7BwhU
r14xnmEXQsA+8ibcKyVwKYAdlEiGkn/7ioI6je5oEHxCOSuPS4/aeZeBpbO/uWDu
gYOnPnh2IqD9BIBd+KkBFFfI+z85/4ZKWTV33+7ldV7+jvxs++B4MhbHce/zfdYU
kHN/j2H6jF5LSdHIs6ho0SRTm/T4M1zC3KZqL1xZTXqBJ+XWeW5elN81XmFfvLtY
lZaRF8Gno3eFBOeassnBuopzE+vxV7IUixuPIvWWo7F9r5ebIt4vJszPIkQ8eP7m
pjbO9zEyMn/Ksr6YsbaJ44GPJ5U9/ymu288GMA+aqN+jwQKW7Wo8SQ==
-----END CERTIFICATE-----
`
      };
      _httpsServer = https.createServer(options, _app).listen({
        port: 0,
        host: '0.0.0.0'
      }, () => {
        const address = _httpsServer.address();
        _httpsUrl = `https://${address.address}:${address.port}`;
        //console.log('https listen', {address, url: _httpsUrl});
        resolve();
      });
    });
    return Promise.all([httpPromise, httpsPromise]);
  });

  after(function() {
    _httpServer.close();
    _httpsServer.close();
  });

  const documentLoaderType = 'node';
  const documentLoaderHttpsOptions = {
    // using self-signed cert for these local tests
    strictSSL: false
  };

  describe('When built with no options specified', function() {
    it('http loading should work', async function() {
      jsonld.useDocumentLoader(documentLoaderType);
      const url = _makeHttpUrl({type: 'data', id: 'd1'});
      const expanded = await jsonld.expand(url);
      assert.deepEqual(expanded, _data.d1.expanded);
    });

    it('https loading should work', async function() {
      jsonld.useDocumentLoader(documentLoaderType, documentLoaderHttpsOptions);
      const url = _makeHttpsUrl({type: 'data', id: 'd1'});
      const expanded = await jsonld.expand(url);
      assert.deepEqual(expanded, _data.d1.expanded);
    });
  });

  describe('secure mode', function() {
    it('fail for secure mode with non-https', async function() {
      jsonld.useDocumentLoader(documentLoaderType, {
        ...documentLoaderHttpsOptions,
        secure: true
      });
      const url = _makeHttpUrl({type: 'data', id: 'd0'});
      let err;
      try {
        await jsonld.expand(url);
      } catch(e) {
        err = e;
      }
      assert.ok(err);
      assert.equal(err.details.code, 'loading document failed');
    });
  });

  describe('bad status', function() {
    it('fail for bad status', async function() {
      jsonld.useDocumentLoader(documentLoaderType);
      const url = _makeHttpUrl({type: 'status', id: '500'});
      let err;
      try {
        await jsonld.expand(url);
      } catch(e) {
        err = e;
      }
      assert.ok(err);
      assert.equal(err.details.code, 'loading document failed');
    });
  });

  describe('When built with no explicit headers', function() {
    it('loading should pass just the ld Accept header', async function() {
      jsonld.useDocumentLoader(documentLoaderType);
      _clearExpressRequests();
      const url = _makeHttpUrl({type: 'data', id: 'd0'});
      await jsonld.documentLoader(url);
      const actualRequest = _expressRequests[0] || {};
      const actualHeaders = actualRequest.headers || {};
      const expectedHeaders = {
        'Accept': 'application/ld+json, application/json'
      };
      _checkExpectedHeaders(actualHeaders, expectedHeaders);
    });
  });

  describe('When built using options containing a headers object', function() {
    const options = {};
    options.headers = {
      'x-test-header-1': 'First value',
      'x-test-two': '2.34',
      'Via': '1.0 fred, 1.1 example.com (Apache/1.1)',
      'Authorization': 'Bearer d783jkjaods9f87o83hj'
    };

    it('loading should pass the headers through on the request' +
      '', async function() {
      jsonld.useDocumentLoader(documentLoaderType, options);
      _clearExpressRequests();
      const url = _makeHttpUrl({type: 'data', id: 'd0'});
      await jsonld.documentLoader(url);
      const actualRequest = _expressRequests[0] || {};
      const actualHeaders = actualRequest.headers || {};
      _checkExpectedHeaders(actualHeaders, options.headers);
      _checkExpectedHeaders(actualHeaders, {
        'accept': 'application/ld+json, application/json'
      });
    });
  });

  describe('When built using headers that already contain an Accept header' +
    '', function() {
    const options = {};
    options.headers = {
      'x-test-header-3': 'Third value',
      'Accept': 'video/mp4'
    };

    it('constructing the document loader should fail', function(done) {
      const expectedMessage =
        'Accept header may not be specified; ' +
        'only "application/ld+json, application/json" is supported.';
      assert.throws(
        jsonld.useDocumentLoader.bind(jsonld, documentLoaderType, options),
        function(err) {
          assert.ok(
            err instanceof RangeError, 'A range error should be thrown');
          assert.equal(err.message, expectedMessage);
          return true;
        });
      done();
    });
  });

  describe('Handle user-agent header', function() {
    const options = {};
    options.headers = {
      'user-agent': 'test'
    };

    it('no user-agent set by default' +
      '', async function() {
      jsonld.useDocumentLoader(documentLoaderType);
      _clearExpressRequests();
      const url = _makeHttpUrl({type: 'data', id: 'd0'});
      await jsonld.documentLoader(url);
      const actualRequest = _expressRequests[0] || {};
      const actualHeaders = actualRequest.headers || {};
      _checkExpectedHeaders(actualHeaders, {
        'user-agent': 'jsonld.js'
      });
    });

    it('custom user-agent header set' +
      '', async function() {
      jsonld.useDocumentLoader(documentLoaderType, options);
      _clearExpressRequests();
      const url = _makeHttpUrl({type: 'data', id: 'd0'});
      await jsonld.documentLoader(url);
      const actualRequest = _expressRequests[0] || {};
      const actualHeaders = actualRequest.headers || {};
      _checkExpectedHeaders(actualHeaders, options.headers);
    });
  });

  describe('link header should work', function() {
    // TODO multiple link headers
    it('load url with json-ld link', async function() {
      jsonld.useDocumentLoader(documentLoaderType);
      const url = _makeHttpUrl({type: 'link', id: 'd1'});
      const expanded = await jsonld.expand(url);
      assert.deepEqual(expanded, _data.d1.expanded);
    });
  });

  describe('link context header should work', function() {
    it('load url with context link', async function() {
      jsonld.useDocumentLoader(documentLoaderType);
      const url = _makeHttpUrl({type: 'contextlink', id: 'd2'});
      const expanded = await jsonld.expand(url);
      assert.deepEqual(expanded, _data.d2.expanded);
    });

    it('fail with multiple mcontext link', async function() {
      jsonld.useDocumentLoader(documentLoaderType);
      const url = _makeHttpUrl({type: 'contextlink2', id: 'd2'});
      let err;
      try {
        await jsonld.expand(url);
      } catch(e) {
        //console.log(e);
        err = e;
      }
      assert.ok(err);
      assert.equal(err.details.code, 'multiple context link headers');
    });
  });

  describe('handle redirects', function() {
    it('fails for infinite self redirect loop', async function() {
      jsonld.useDocumentLoader(documentLoaderType);
      const url = _makeHttpUrl({type: 'loop', id: 'd1'});
      let err;
      try {
        await jsonld.expand(url);
      } catch(e) {
        err = e;
      }
      assert.ok(err);
      assert.equal(err.details.code, 'recursive context inclusion');
    });

    it('fails for infinite new redirect loop', async function() {
      jsonld.useDocumentLoader(documentLoaderType, {
        // set a max
        maxRedirects: 10
      });
      const url = _makeHttpUrl({type: 'loopinc', id: '0'});
      let err;
      try {
        await jsonld.expand(url);
      } catch(e) {
        err = e;
      }
      assert.ok(err);
      assert.equal(err.details.code, 'loading document failed');
    });
  });
});
