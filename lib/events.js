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

let _defaultEventHandler = [];

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
 * The final default handler will use 'console.warn' for events of level
 * 'warning'.
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
    options.eventHandler ? _asArray(options.eventHandler) : [],
    ..._defaultEventHandler
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

// logs all events and continues
api.logEventHandler = function({event, next}) {
  console.warn(`EVENT: ${event.message}`, {
    code: event.code,
    level: event.level,
    details: event.details
  });
  next();
};

// fallback to throw errors for any unhandled events
api.unhandledEventHandler = function({event}) {
  throw new JsonLdError(
    'No handler for event.',
    'jsonld.UnhandledEvent',
    {event});
};

// throw with event details
api.throwUnacceptableEventHandler = function({event}) {
  throw new JsonLdError(
    'Unacceptable event occurred.',
    'jsonld.UnacceptableEvent',
    {event});
};

// log 'warning' level events
api.logWarningEventHandler = function({event}) {
  if(event.level === 'warning') {
    console.warn(`WARNING: ${event.message}`, {
      code: event.code,
      details: event.details
    });
  }
};

// strict handler that rejects warning conditions
api.strictModeEventHandler = [
  function({event, next}) {
    // fail on all warnings
    if(event.level === 'warning') {
      throw new JsonLdError(
        'Strict mode violation occurred.',
        'jsonld.StrictModeViolationEvent',
        {event});
    }
    next();
  },
  // fail on unhandled events
  // TODO: update when events are added that are acceptable in strict mode
  api.unhandledEventHandler
];

// log warnings to console or fail
api.basicEventHandler = [
  api.logWarningEventHandler,
  api.unhandledEventHandler
];

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
  _defaultEventHandler = eventHandler ? _asArray(eventHandler) : [];
};
