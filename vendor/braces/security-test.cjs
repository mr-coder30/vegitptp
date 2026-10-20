const assert = require('node:assert/strict');
const braces = require('braces');

assert.deepEqual(braces('a/{b,c}/d'), ['a/(b|c)/d']);
assert.deepEqual(braces('a/{b,c}/d', { expand: true }), ['a/b/d', 'a/c/d']);

for (const [open, close] of [['{', '}'], ['(', ')']]) {
  const nestedPattern = open.repeat(2000) + 'x' + close.repeat(2000);
  assert.throws(
    () => braces(nestedPattern),
    error => error instanceof SyntaxError && /nesting depth exceeds maximum/.test(error.message),
  );
}

console.log('braces security regression checks passed');
