// setup browser global JsonLdProcessor
if(typeof window.JsonLdProcessor === 'undefined') {
  Object.defineProperty(window, 'JsonLdProcessor', {
    writable: true,
    enumerable: false,
    configurable: true,
    value: JsonLdProcessor
  });
}
