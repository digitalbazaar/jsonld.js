TESTS = tests/test.js
REPORTER = spec

all:

test: test-node test-browser test-local-node test-local-browser

test-node:
	@NODE_ENV=test ./node_modules/.bin/mocha -A -R $(REPORTER) $(TESTS)

test-browser:
	@NODE_ENV=test ./node_modules/.bin/phantomjs $(TESTS)

test-local-node:
	@NODE_ENV=test JSONLD_TEST_SUITE=./tests/new-embed-api ./node_modules/.bin/mocha -A -R $(REPORTER) $(TESTS); 

test-local-browser:
	@NODE_ENV=test JSONLD_TEST_SUITE=./tests/new-embed-api ./node_modules/.bin/phantomjs $(TESTS)

test-coverage:
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- \
		-u exports -R $(REPORTER) $(TESTS)

clean:
	rm -rf coverage

.PHONY: test test-node test-browser test-local-node test-local-browser test-coverage clean
