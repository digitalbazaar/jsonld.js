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
      }],
      flattened: {
        no_ctx: [
          {
            "@id": "_:b0",
            "http://schema.org/image": [
              {"@id": "http://manu.sporny.org/images/manu.png"}
            ],
            "http://schema.org/name": [{"@value": "Manu Sporny"}],
            "http://schema.org/url": [{"@id": "http://manu.sporny.org/"}]
          }
        ],
        ctx: {
          "@context": ctx,
          "@graph": [
            {
              "@id": "_:b0",
              "image": "http://manu.sporny.org/images/manu.png",
              "name": "Manu Sporny",
              "homepage": "http://manu.sporny.org/"
            }
          ]
        }
      },
      framed: {
        "@graph": [{
          "@id": "_:b0",
          "http://schema.org/image": {
            "@id": "http://manu.sporny.org/images/manu.png"
          },
          "http://schema.org/name": "Manu Sporny",
          "http://schema.org/url": {
            "@id": "http://manu.sporny.org/"
          }
        }, {
          "@id": "http://manu.sporny.org/"
        }, {
          "@id": "http://manu.sporny.org/images/manu.png"
        }]
      },
      normalized: {
        native: {
          "@default": [
            {
              "subject": {"type": "blank node", "value": "_:c14n0"},
              "predicate": {"type": "IRI", "value": "http://schema.org/image"},
              "object": {"type": "IRI",
                "value": "http://manu.sporny.org/images/manu.png"
              }
            },
            {
              "subject": {"type": "blank node", "value": "_:c14n0"},
              "predicate": {"type": "IRI", "value": "http://schema.org/name"},
              "object": {
                "type": "literal",
                "datatype": "http://www.w3.org/2001/XMLSchema#string",
                "value": "Manu Sporny"
              }
            },
            {
              "subject": {"type": "blank node", "value": "_:c14n0"},
              "predicate": {"type": "IRI", "value": "http://schema.org/url"},
              "object": {"type": "IRI", "value": "http://manu.sporny.org/"}
            }
          ]
        },
        nquads: [
          '_:c14n0 <http://schema.org/image> <http://manu.sporny.org/images/manu.png> .',
          '_:c14n0 <http://schema.org/name> "Manu Sporny" .',
          '_:c14n0 <http://schema.org/url> <http://manu.sporny.org/> .',
          ''
        ].join("\n")
      }
    },
    cb = {
      error: function(done){
        return function(err){ should.exist(err); done(); };
      },
      no_error: function(done){
        return function(err){ should.not.exist(err); done(); };
      },
      equal: function(expected, done){
        return function(err, actual){
          actual.should.equal(expected);
          done();
        };
      },
      deep: function(expected, done){
        return function(err, actual){
          //console.log(JSON.stringify(actual, null, 2));
          assert.deepEqual(actual, expected);
          done();
        };
      }
    },
    throw_done = function(func, args, done){
      var err;
      try{
        func.apply(null, args);
      }catch(e){
        err = e;
      }
      should.exist(err);
      done();
    },
    noop = function(){},
    pcb = {
      error: function(done){
        return function(err){ should.exist(err); done(); };
      },
      deep: function(expected, done){
        return function(actual){
          assert.deepEqual(actual, expected);
          done();
        };
      }
    };

  module.exports = function(jsonld){
    describe("Callback API", function(){

      describe("jsonld.compact", function(){
        it("should FAIL on 1 parameter", function(done){
          jsonld.compact(cb.error(done));
        });

        it("should FAIL on null context", function(done){
          jsonld.compact(doc, null, cb.error(done));
        });

        it("should WIN with `null` input", function(done){
          jsonld.compact(null, ctx, cb.no_error(done));
        });

        it("should WIN without options", function(done){
          jsonld.compact(doc, ctx, cb.deep(output.compacted, done));
        });

        it("should WIN with degenerate options", function(done){
          jsonld.compact(doc, ctx, {}, cb.deep(output.compacted, done));
        });
      });

      describe("jsonld.expand", function(){
        it("should FAIL on 1 parameter", function(done){
          jsonld.expand(cb.error(done));
        });

        it("should WIN without options", function(done){
          jsonld.expand(doc, cb.deep(output.expanded, done));
        });

        it("should WIN with degenerate options", function(done){
          jsonld.expand(doc, {}, cb.deep(output.expanded, done));
        });
      });

      describe("jsonld.flatten", function(){
        it("should FAIL on 1 parameter", function(done){
          jsonld.flatten(cb.error(done));
        });

        it("should WIN without context", function(done){
          jsonld.flatten(doc, cb.deep(output.flattened.no_ctx, done));
        });

        it("should WIN without options", function(done){
          jsonld.flatten(doc, ctx, cb.deep(output.flattened.ctx, done));
        });

        it("should WIN with degenerate optons", function(done){
          jsonld.flatten(doc, ctx, {}, cb.deep(output.flattened.ctx, done));
        });

      });

      describe("jsonld.frame", function(){
        it("should FAIL on 1 parameter", function(done){
          jsonld.frame(cb.error(done));
        });
        it("should FAIL without frame", function(done){
          jsonld.frame(doc, cb.error(done));
        });
        it("should WIN without options parameters", function(done){
          jsonld.frame(doc, {}, cb.deep(output.framed, done));
        });
        it("should WIN with degenerate options", function(done){
          jsonld.frame(doc, {}, {}, cb.deep(output.framed, done));
        });
      });

      describe("jsonld.objectify", function(){});

      describe("jsonld.normalize", function(){
        it("should FAIL on 1 parameter", function(done){
          jsonld.normalize(cb.error(done));
        });
        it("should WIN without options parameters", function(done){
          jsonld.normalize(doc, cb.deep(output.normalized.native, done));
        });
        it("should WIN with degenerate options", function(done){
          jsonld.normalize(doc, {}, cb.deep(output.normalized.native, done));
        });
        it("should WIN as nquads", function(done){
          jsonld.normalize(doc,  {format: "application/nquads"},
            cb.equal(output.normalized.nquads, done));
        });
      });

      describe("jsonld.toRDF", function(){});

      describe("jsonld.fromRDF", function(){});

      describe("jsonld.registerRDFParser", function(){});

    }); // Callback API

    describe("Promise API", function(){
      var promises = jsonld.promises();

      describe("jsonld.promise.compact", function(){
        it("should FAIL with just doc", function(done){
          throw_done(promises.compact, [doc], done);
        });

        it("should WIN with doc and context", function(done){
          promises.compact(doc, ctx)
            .then(pcb.deep(output.compacted, done), noop);
        });
      });

      describe("jsonld.promise.expand", function(){});

      describe("jsonld.promise.flatten", function(){});

      describe("jsonld.promise.frame", function(){});

      describe("jsonld.promise.normalize", function(){});

      describe("jsonld.promise.fromRDF", function(){});

      describe("jsonld.promise.toRDF", function(){});

    }); // Promise API

  }; // module.exports
}).call(this);
