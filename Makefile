TESTS = tests/test.js
REPORTER = spec

all:

test: test-node test-browser

test-node:
	@NODE_ENV=test ./node_modules/.bin/mocha -A -R $(REPORTER) $(TESTS)

test-browser:
	@NODE_ENV=test ./node_modules/.bin/phantomjs $(TESTS)

test-coverage:
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- \
		-u exports -R $(REPORTER) $(TESTS)

clean:
	rm -rf coverage

.PHONY: test test-node test-browser test-coverage clean
