var jsonld = require('../js/jsonld');
var assert = require('assert');

describe('Build a valid header object from pre-defined headers', function() {

  describe('When built with 2 accept headers', function() {
    var headers = {
      'Accept': 'application/json',
      'accept': 'application/ld+json, application/json'
    };


    it('should fail', function() {
      assert.throws(
        jsonld.buildHeaders.bind(null, headers),
        function(err) {
          assert.ok(err instanceof RangeError, 'A range error should be thrown');
          assert.equal(err.message, 'Accept header may be specified only once.');

          return true;
        }
      );
    });
  });

  describe('When built with no explicit headers', function() {
    var headers = {};
    it(
      'the "Accept" header should default to "application/ld+json, application/json"',
      function() {
        var actualHeaders = jsonld.buildHeaders(headers);
        assert.deepEqual(actualHeaders, {
          'Accept': 'application/ld+json, application/json'
        });
      }
    );
  });

  describe('When built with custom headers', function() {
    var headers = {
      'Authorization': 'Bearer d783jkjaods9f87o83hj'
    };
    it('the custom headers should be preserved', function() {
      var actualHeaders = jsonld.buildHeaders(headers);
      assert.deepEqual(actualHeaders, {
        'Authorization': 'Bearer d783jkjaods9f87o83hj',
        'Accept': 'application/ld+json, application/json'
      });
    });
  });

  describe('When built with an accept header equal to the default accept header value', function() {
    var headers = {
      'Accept': 'application/ld+json, application/json'
    };
    it(
      'the accept header should remain unchanged',
      function() {
        var actualHeaders = jsonld.buildHeaders(headers);
        assert.deepEqual(actualHeaders, headers);
      }
    );
  });

  describe('When built with a valid accept headers with extra acceptations', function() {
    var headers = {
      'Accept': 'application/ld+json, application/json, text/html'
    };
    it(
      'the accept header should remain unchanged',
      function() {
        var actualHeaders = jsonld.buildHeaders(headers);
        assert.deepEqual(actualHeaders, headers);
      }
    );
  });

  describe('When built with an invalid accept header', function() {
    var possibleInvalidHeaders = [
      { 'Accept': 'text/html' },
      { 'Accept': 'application/ld+json, application/jsonbourne' },
      { 'Accept': 'application/ld+json application/json' }
    ];

    for (var i in possibleInvalidHeaders) {
      console.log(possibleInvalidHeaders[i]);
      it('should fail', function() {
        assert.throws(
          jsonld.buildHeaders.bind(null, possibleInvalidHeaders[i]),
          function(err) {
            assert.ok(err instanceof RangeError, 'A range error should be thrown');
            assert.equal(
              err.message,
              'Accept header must contains "application/ld+json, application/json".'
            );

            return true;
          }
        );
      });
    }
  });
});
