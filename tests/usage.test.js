/**
 * Tests for API parameter usage for JSON-LD.
 *
 * @author Nicholas Bollweg
 *
 * Copyright (c) 2011-2013 Digital Bazaar, Inc. All rights reserved.
 */
(function() {
  "use strict";
  var chai = require("chai"),
    assert = chai.assert,
    should = chai.should();

  var doc = {
      "http://schema.org/name": "Manu Sporny",
      "http://schema.org/url": {
        "@id": "http://manu.sporny.org/"
      },
      "http://schema.org/image": {
        "@id": "http://manu.sporny.org/images/manu.png"
      }
    },
    ctx = {
      "name": "http://schema.org/name",
      "homepage": {"@id": "http://schema.org/url", "@type": "@id"},
      "image": {"@id": "http://schema.org/image", "@type": "@id"}
    },
    output = {
      compacted:  {
        "@context": ctx,
        "image": "http://manu.sporny.org/images/manu.png",
        "name": "Manu Sporny",
        "homepage": "http://manu.sporny.org/"
      },
      expanded: [{
        "http://schema.org/image": [
          {"@id": "http://manu.sporny.org/images/manu.png"}
        ],
        "http://schema.org/name": [{"@value": "Manu Sporny"}],
        "http://schema.org/url": [{"@id": "http://manu.sporny.org/"}]
      }]
    };

  function callback_error(done){
    return function(err){ should.exist(err); done(); };
  }

  module.exports = function(jsonld){
    describe("API", function(){

      describe("jsonld.compact", function(){
        it("should FAIL on 1 parameter", function(done){
          jsonld.compact(callback_error(done));
        });

        it("should FAIL on null context", function(done){
          jsonld.compact(doc, null, callback_error(done));
        });

        it("should WIN with `null` input", function(done){
          jsonld.compact(null, ctx, function(err){
            should.not.exist(err);
            done();
          });
        });

        it("should WIN without options", function(done){
          jsonld.compact(doc, ctx, function(err, compacted){
            assert.deepEqual(compacted, output.compacted);
            done();
          });
        });

        it("should WIN with degenerate options", function(done){
          jsonld.compact(doc, ctx, {}, function(err, compacted) {
            assert.deepEqual(compacted, output.compacted);
            done();
          });
        });
      });

      describe("jsonld.expand", function(){
        it("should FAIL on 1 parameter", function(done){
          jsonld.expand(callback_error(done));
        });
        

        it("should WIN without options", function(done){
          jsonld.expand(doc, function(err, expanded){
            assert.deepEqual(expanded, output.expanded);
            done();
          });
        });
        
        it("should WIN with degenerate options", function(done){
          jsonld.expand(doc, {}, function(err, expanded){
            assert.deepEqual(expanded, output.expanded);
            done();
          });
        });
      });

      describe("jsonld.flatten", function(){});
      describe("jsonld.frame", function(){});
      describe("jsonld.normalize", function(){});
      describe("jsonld.toRDF", function(){});
      describe("jsonld.registerRDFParser", function(){});
    });
  };
}).call(this);