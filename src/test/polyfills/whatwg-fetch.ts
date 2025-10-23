// Minimal shim that mimics the side effects of `whatwg-fetch` by ensuring
// the standard Fetch API globals are available in the Node.js environment.
if (typeof globalThis.fetch !== 'function') {
  throw new Error('Fetch API is not available in this environment.');
}

export {};
