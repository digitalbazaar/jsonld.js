/**
 * Local tests for the node.js document loader
 *
 * @author goofballLogic
 */

var jsonld = require( "../js/jsonld" );
var assert = require( "assert" );

describe( "For the node.js document loader", function() {

	var documentLoaderType = "node";
	var requestMock = function( options, callback ) {

		requestMock.calls.push( [].slice.call( arguments, 0 ) ); // store these for later inspection
		callback( null, { headers: {} }, "" );

	};

	describe( "When built with no options specified", function() {

		var options = {};
		it( "loading should work", function( callback ) {

			jsonld.useDocumentLoader( documentLoaderType );
			jsonld.expand( "http://schema.org/", callback );

		} );

	} );

	describe( "When built with no explicit headers", function() {

		var options = { request: requestMock };

		it( "loading should pass just the ld Accept header", function( callback ) {

			jsonld.useDocumentLoader( documentLoaderType, options );
			requestMock.calls = [];
			var iri = "http://some.thing.test.com/my-thing.jsonld";
			jsonld.documentLoader( iri, e => {

				if( e ) { callback( e ); }
				else {

					var actualOptions = ( requestMock.calls[ 0 ] || {} )[ 0 ] || {};
					var actualHeaders = actualOptions.headers;
					var expectedHeaders = { "Accept": "application/ld+json, application/json" };
					assert.deepEqual( actualHeaders, expectedHeaders );
					callback();

				}

			} );

		} );

	} );

	describe( "When built using options containing a headers object", function() {

		var options = { request: requestMock };
		options.headers = {

			"x-test-header-1": "First value",
			"x-test-two": 2.34,
			"Via": "1.0 fred, 1.1 example.com (Apache/1.1)",
			"Authorization": "Bearer d783jkjaods9f87o83hj"

		};

		it( "loading should pass the headers through on the request", function( callback ) {

			jsonld.useDocumentLoader( documentLoaderType, options );
			requestMock.calls = [];
			var iri = "http://some.thing.test.com/my-thing.jsonld";
			jsonld.documentLoader( iri, e => {

				if( e ) { callback( e ); }
				else {

					var actualOptions = ( requestMock.calls[ 0 ] || {} )[ 0 ] || {};
					var actualHeaders = actualOptions.headers;
					var expectedHeaders = Object.assign(

						{ "Accept": "application/ld+json, application/json" },
						options.headers

					);
					assert.deepEqual( actualHeaders, expectedHeaders );
					callback();

				}

			} );

		} );

	} );

	describe( "When built using headers that already contain an Accept header", function() {

		var options = { request: requestMock };
		options.headers = {

			"x-test-header-3": "Third value",
			"Accept": "video/mp4"

		};

		it( "constructing the document loader should fail", function() {

			var expectedMessage = "Accept header may not be specified as an option; only \"application/ld+json, application/json\" is supported.";
			assert.throws(

				jsonld.useDocumentLoader.bind( jsonld, documentLoaderType, options ),
				err => {

					assert.ok( err instanceof RangeError, "A range error should be thrown" );
					assert.equal( err.message, expectedMessage );
					return true;

				}

			);

		} );

	} );

} );
