/* jshint trailing:false */
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
      "http://schema.org/url": {"@id": "http://manu.sporny.org/"},
      "http://schema.org/image": {"@id": "http://manu.sporny.org/images/manu.png"}
    },
    ctx = {
      "name": "http://schema.org/name",
      "homepage": {"@id": "http://schema.org/url", "@type": "@id"},
      "image": {"@id": "http://schema.org/image", "@type": "@id"}
    },
    output = {
      compacted:  {
        "@context": ctx,
        image: "http://manu.sporny.org/images/manu.png",
        name: "Manu Sporny",
        homepage: "http://manu.sporny.org/"
      }
    };

  module.exports = function(jsonld){
    describe("API", function(){

      describe("jsonld.compact", function(){
        it("should FAIL on 1 parameter", function(done){
          jsonld.compact(function(err, compacted){
            should.exist(err);
            done();
          });
        });

        it("should FAIL on null context", function(done){
          jsonld.compact(doc, null, function(err, compacted){
            should.exist(err);
            done();
          });
        });

        it("should WIN with `null` input", function(done){
          jsonld.compact(null, ctx, function(err, compacted){
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

        it("should WIN with generated options", function(done){
          jsonld.compact(doc, ctx, {}, function(err, compacted) {
            assert.deepEqual(compacted, output.compacted);
            done();
          });
        });
      });

      describe("jsonld.expand", function(){});
      describe("jsonld.flatten", function(){});
      describe("jsonld.frame", function(){});
      describe("jsonld.normalize", function(){});
      describe("jsonld.toRDF", function(){});
      describe("jsonld.registerRDFParser", function(){})
    });
  };
}).call(this);