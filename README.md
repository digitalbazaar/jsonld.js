Introduction
------------

JSON, as specified in RFC4627, is a simple language for representing
objects on the Web. Linked Data is a way of describing content across
different documents or Web sites. Web resources are described using
IRIs, and typically are dereferencable entities that may be used to find
more information, creating a "Web of Knowledge". JSON-LD is intended to
be a simple publishing method for expressing not only Linked Data in
JSON, but for adding semantics to existing JSON.

This library is an implementation of the [JSON-LD] specification
in [JavaScript].

JSON-LD is designed as a light-weight syntax that can be used to express
Linked Data. It is primarily intended to be a way to express Linked Data
in Javascript and other Web-based programming environments. It is also
useful when building interoperable Web Services and when storing Linked
Data in JSON-based document storage engines. It is practical and
designed to be as simple as possible, utilizing the large number of JSON
parsers and existing code that is in use today. It is designed to be
able to express key-value pairs, RDF data, RDFa [RDFA-CORE] data,
Microformats [MICROFORMATS] data, and Microdata [MICRODATA]. That is, it
supports every major Web-based structured data model in use today.

The syntax does not require many applications to change their JSON, but
easily add meaning by adding context in a way that is either in-band or
out-of-band. The syntax is designed to not disturb already deployed
systems running on JSON, but provide a smooth migration path from JSON
to JSON with added semantics. Finally, the format is intended to be fast
to parse, fast to generate, stream-based and document-based processing
compatible, and require a very small memory footprint in order to operate.

Commercial Support
------------------

Commercial support for this library is available upon request from 
Digital Bazaar: support@digitalbazaar.com

Source
------

The source code for the JavaScript implementation of the JSON-LD API
is available at:

http://github.com/digitalbazaar/jsonld.js

This library includes a sample testing utility which may be used to verify
that changes to the processor maintain the correct output.

To run the sample tests you will need to get the test suite files from the
[json-ld.org repository][json-ld.org] hosted on GitHub.

https://github.com/json-ld/json-ld.org

Then run the nodejs-jsonld.tests.js application and point it at the directory
containing the tests.

    node tests/nodejs-jsonld.tests.js {PATH_TO_JSON_LD_ORG/test-suite/tests}

[JSON-LD]: http://json-ld.org/
[json-ld.org]: https://github.com/json-ld/json-ld.org

