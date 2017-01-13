TESTS = tests/test.js
LOCAL_TESTS = test/*.js
REPORTER = spec

all:

test: test-local test-node test-browser test-local-node test-local-browser test-normalization-node test-normalization-browser

test-suite: test-suite-node test-suite-browser

test-suite-node:
	@if [ "x$(JSONLD_TEST_SUITE)" = x ]; then \
		echo "Error: JSONLD_TEST_SUITE env var not set"; \
		exit 1; \
	fi
	@if [ -d $(JSONLD_TEST_SUITE) ]; then \
		NODE_ENV=test ./node_modules/.bin/mocha -t 30000 -A -R $(REPORTER) $(TESTS); \
	else \
		echo "Error: tests not found at $(JSONLD_TEST_SUITE)"; \
		exit 1; \
	fi

test-suite-browser:
	@if [ "x$(JSONLD_TEST_SUITE)" = x ]; then \
		echo "Error: JSONLD_TEST_SUITE env var not set"; \
		exit 1; \
	fi
	@if [ -d $(JSONLD_TEST_SUITE) ]; then \
		NODE_ENV=test ./node_modules/.bin/phantomjs $(TESTS); \
	else \
		echo "Error: tests not found at $(JSONLD_TEST_SUITE)"; \
		exit 1; \
	fi

test-node:
	@JSONLD_TEST_SUITE=../json-ld.org/test-suite $(MAKE) test-suite-node

test-browser:
	@JSONLD_TEST_SUITE=../json-ld.org/test-suite $(MAKE) test-suite-browser

test-local-node:
	@JSONLD_TEST_SUITE=./tests/new-embed-api $(MAKE) test-suite-node

test-local-browser:
	@JSONLD_TEST_SUITE=./tests/new-embed-api $(MAKE) test-suite-browser

test-normalization-node:
	@JSONLD_TEST_SUITE=../normalization/tests $(MAKE) test-suite-node

test-normalization-browser:
	@JSONLD_TEST_SUITE=../normalization/tests $(MAKE) test-suite-browser

test-coverage:
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- \
		-t 30000 -u exports -R $(REPORTER) $(TESTS)

test-coverage-lcov:
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha \
		--report lcovonly -- -t 30000 -u exports -R $(REPORTER) $(TESTS)

test-coverage-report:
	./node_modules/.bin/istanbul report

test-local:
	./node_modules/.bin/mocha -t 30000 -R $(REPORTER) $(LOCAL_TESTS)

clean:
	rm -rf coverage

.PHONY: test test-node test-browser test-local-node test-local-browser test-normalization-node test-normalization-browser test-coverage test-local clean
