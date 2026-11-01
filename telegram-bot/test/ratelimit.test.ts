import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RateLimiter } from '../src/ratelimit';

describe('RateLimiter', () => {
  it('oynadagi limitgacha ruxsat beradi, keyin rad etadi', () => {
    let now = 0;
    const limiter = new RateLimiter(10_000, 3, () => now);
    assert.equal(limiter.allow('u1'), true);
    assert.equal(limiter.allow('u1'), true);
    assert.equal(limiter.allow('u1'), true);
    assert.equal(limiter.allow('u1'), false);
  });

  it('boshqa foydalanuvchi alohida hisoblanadi', () => {
    let now = 0;
    const limiter = new RateLimiter(10_000, 1, () => now);
    assert.equal(limiter.allow('u1'), true);
    assert.equal(limiter.allow('u2'), true);
    assert.equal(limiter.allow('u1'), false);
  });

  it('oyna tugagach hisoblagich tiklanadi', () => {
    let now = 0;
    const limiter = new RateLimiter(10_000, 1, () => now);
    assert.equal(limiter.allow('u1'), true);
    assert.equal(limiter.allow('u1'), false);
    now = 10_001;
    assert.equal(limiter.allow('u1'), true);
  });
});
