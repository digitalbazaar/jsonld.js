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

/**
 * Handle an event.
 *
 * Top level APIs have a common 'handleEvent' option. This option can be a
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
 * @param {object} options - original API options
 */
api.handleEvent = ({
  event,
  options
}) => {
  const handlers = [].concat(
    options.handleEvent ? _asArray(options.handleEvent) : [],
    _defaultHandler
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

function _defaultHandler({event}) {
  if(event.level === 'warning') {
    console.warn(`WARNING: ${event.message}`, {
      code: event.code,
      details: event.details
    });
    return;
  }
  // fallback to ensure events are handled somehow
  throw new JsonLdError(
    'No handler for event.',
    'jsonld.UnhandledEvent',
    {event});
}
