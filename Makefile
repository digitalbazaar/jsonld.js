TESTS = tests/test.js
REPORTER = spec

all:

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
	  -A \
	  --reporter $(REPORTER) \
	  $(TESTS) && ./node_modules/.bin/phantomjs tests/test.js

	@#--require should

js-cov:
	./node_modules/visionmedia-jscoverage/jscoverage js js-cov

test-cov: js-cov
	$(MAKE) test JSDIR=js-cov REPORTER=html-cov > coverage.html

clean:
	rm -fr js-cov

.PHONY: test test-cov clean
