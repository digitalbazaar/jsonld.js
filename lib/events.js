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
 * Setup event handler.
 *
 * Return an array event handler constructed from an optional safe mode
 * handler, an optional options event handler, and an optional default handler.
 *
 * @param {object} options - processing options
 *   {function|object|array} [eventHandler] - an event handler.
 *
 * @return an array event handler.
 */
api.setupEventHandler = ({options = {}}) => {
  // build in priority order
  const eventHandler = [].concat(
    options.safe ? api.safeEventHandler : [],
    options.eventHandler ? _asArray(options.eventHandler) : [],
    api.defaultEventHandler ? api.defaultEventHandler : []
  );
  // null if no handlers
  return eventHandler.length === 0 ? null : eventHandler;
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
 * NOTE: Only call this function if options.eventHandler is set and is an
 * array of handlers. This is an optimization. Callers are expected to check
 * for an event handler before constructing events and calling this function.
 *
 * @param {object} event - event structure:
 *   {string} code - event code
 *   {string} level - severity level, one of: ['warning']
 *   {string} message - human readable message
 *   {object} details - event specific details
 * @param {object} options - processing options
 *   {array} eventHandler - an event handler array.
 */
api.handleEvent = ({
  event,
  options
}) => {
  _handle({event, handlers: options.eventHandler});
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

const _notSafeEventCodes = new Set([
  'empty object',
  'free-floating scalar',
  'invalid @language value',
  'invalid property',
  // NOTE: spec edge case
  'null @id value',
  'null @value value',
  'object with only @id',
  'object with only @language',
  'object with only @list',
  'object with only @value',
  'relative @id reference',
  'relative @type reference',
  'relative @vocab reference',
  'reserved @id value',
  'reserved @reverse value',
  'reserved term',
  // toRDF
  'blank node predicate',
  'relative graph reference',
  'relative object reference',
  'relative predicate reference',
  'relative subject reference',
  // toRDF / fromRDF
  'rdfDirection not set'
]);

// safe handler that rejects unsafe warning conditions
api.safeEventHandler = function safeEventHandler({event, next}) {
  // fail on all unsafe warnings
  if(event.level === 'warning' && _notSafeEventCodes.has(event.code)) {
    throw new JsonLdError(
      'Safe mode validation error.',
      'jsonld.ValidationError',
      {event}
    );
  }
  next();
};

// logs all events and continues
api.logEventHandler = function logEventHandler({event, next}) {
  console.log(`EVENT: ${event.message}`, {event});
  next();
};

// log 'warning' level events
api.logWarningEventHandler = function logWarningEventHandler({event, next}) {
  if(event.level === 'warning') {
    console.warn(`WARNING: ${event.message}`, {event});
  }
  next();
};

// fallback to throw errors for any unhandled events
api.unhandledEventHandler = function unhandledEventHandler({event}) {
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
