'use strict'
// Same API as buffer-equal-constant-time@1.0.1, without SlowBuffer (removed in Node 26).
const { timingSafeEqual } = require('crypto')
const { Buffer } = require('buffer')

function bufferEq(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const origEqual = Buffer.prototype.equal
bufferEq.install = function () {
  Buffer.prototype.equal = function equal(that) { return bufferEq(this, that) }
}
bufferEq.restore = function () { Buffer.prototype.equal = origEqual }

module.exports = bufferEq
