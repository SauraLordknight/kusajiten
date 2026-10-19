(function () {
  'use strict';
  // Card counts are decimal strings in JSON. This avoids Number precision loss.
  const normalize = value => {
    if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : '0';
    return typeof value === 'string' && /^[1-9][0-9]*$/.test(value) ? value : '0';
  };
  const compare = (value, other) => {
    const left = normalize(value), right = normalize(other);
    return left.length !== right.length ? Math.sign(left.length - right.length) : left === right ? 0 : left < right ? -1 : 1;
  };
  const add = (value, amount = 1) => String(BigInt(normalize(value)) + BigInt(amount));
  const subtract = (value, amount = 1) => {
    const result = BigInt(normalize(value)) - BigInt(amount);
    return result > 0n ? String(result) : '0';
  };
  const format = value => {
    const digits = normalize(value), parts = [];
    for (let end = digits.length; end > 0; end -= 3) parts.push(digits.slice(Math.max(0, end - 3), end));
    return parts.reverse().join(',');
  };
  globalThis.KusaCardCounts = Object.freeze({normalize,compare,add,subtract,format});
})();
