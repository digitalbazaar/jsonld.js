/*
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const JsonLdError = require('./JsonLdError');

const {
  isArray: _isArray
} = require('./types');

const {
  asArray: _asArray
} = require('./util');

const api = {};
module.exports = api;

// default handler, store as null or an array
// exposed to allow fast external pre-handleEvent() checks
api.defaultEventHandler = null;

/**
 * Check if event handler is in use in options or by default.
 *
 * This call is used to avoid building event structures and calling the main
 * handleEvent() call. It checks if safe mode is on, an event handler is in the
 * processing options, or a default handler was set.
 *
 * @param {object} options - processing options:
 *   {boolean} [safe] - flag for Safe Mode.
 *   {function|object|array} [eventHandler] - an event handler.
 */
api.hasEventHandler = options => {
  return options.safe || options.eventHandler || api.defaultEventHandler;
};

/**
 * Handle an event.
 *
 * Top level APIs have a common 'eventHandler' option. This option can be a
 * function, array of functions, object mapping event.code to functions (with a
 * default to call next()), or any combination of such handlers. Handlers will
 * be called with an object with an 'event' entry and a 'next' function. Custom
 * handlers should process the event as appropriate. The 'next()' function
 * should be called to let the next handler process the event.
 *
 * @param {object} event - event structure:
 *   {string} code - event code
 *   {string} level - severity level, one of: ['warning']
 *   {string} message - human readable message
 *   {object} details - event specific details
 * @param {object} options - processing options
 */
api.handleEvent = ({
  event,
  options
}) => {
  const handlers = [].concat(
    // priority is safe mode handler, options handler, then default handler
    options.safe ? api.safeModeEventHandler : [],
    options.eventHandler ? _asArray(options.eventHandler) : [],
    api.defaultEventHandler ? api.defaultEventHandler : []
  );
  _handle({event, handlers});
};

function _handle({event, handlers}) {
  let doNext = true;
  for(let i = 0; doNext && i < handlers.length; ++i) {
    doNext = false;
    const handler = handlers[i];
    if(_isArray(handler)) {
      doNext = _handle({event, handlers: handler});
    } else if(typeof handler === 'function') {
      handler({event, next: () => {
        doNext = true;
      }});
    } else if(typeof handler === 'object') {
      if(event.code in handler) {
        handler[event.code]({event, next: () => {
          doNext = true;
        }});
      } else {
        doNext = true;
      }
    } else {
      throw new JsonLdError(
        'Invalid event handler.',
        'jsonld.InvalidEventHandler',
        {event});
    }
  }
  return doNext;
}

// safe handler that rejects unsafe warning conditions
api.safeModeEventHandler = function({event, next}) {
  // fail on all unsafe warnings
  if(event.level === 'warning' && event.tags.includes('unsafe')) {
    throw new JsonLdError(
      'Safe mode violation.',
      'jsonld.SafeModeViolationEvent',
      {event}
    );
  }
  next();
};

// strict handler that rejects all warning conditions
api.strictModeEventHandler = function({event, next}) {
  // fail on all warnings
  if(event.level === 'warning') {
    throw new JsonLdError(
      'Strict mode violation.',
      'jsonld.StrictModeViolationEvent',
      {event}
    );
  }
  next();
};

// logs all events and continues
api.logEventHandler = function({event, next}) {
  console.log(`EVENT: ${event.message}`, {event});
  next();
};

// log 'warning' level events
api.logWarningEventHandler = function({event, next}) {
  if(event.level === 'warning') {
    console.warn(`WARNING: ${event.message}`, {event});
  }
  next();
};

// fallback to throw errors for any unhandled events
api.unhandledEventHandler = function({event}) {
  throw new JsonLdError(
    'No handler for event.',
    'jsonld.UnhandledEvent',
    {event}
  );
};

/**
 * Set default event handler.
 *
 * By default, all event are unhandled. It is recommended to pass in an
 * eventHandler into each call. However, this call allows using a default
 * eventHandler when one is not otherwise provided.
 *
 * @param {object} options - default handler options:
 *   {function|object|array} eventHandler - a default event handler.
 *     falsey to unset.
 */
api.setDefaultEventHandler = function({eventHandler} = {}) {
  api.defaultEventHandler = eventHandler ? _asArray(eventHandler) : null;
};
