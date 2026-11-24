import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlacementController } from './placement.mjs';

const left = { x: -12, z: 4 };
const right = { x: 12, z: 4 };
function fixture(commit = () => ({ ok: true })) {
  const calls = [];
  const controller = createPlacementController({ commit(point) {
    calls.push({ ...point });
    return commit(point);
  } });
  return { sample: controller.sample, calls };
}

test('a stable object commits once; removing it does not undo the building', () => {
  const { sample, calls } = fixture();
  assert.equal(sample(left, 0).phase, 'settling');
  assert.equal(sample(left, 1000).progress, .5);
  assert.equal(sample(left, 1999).phase, 'settling');
  assert.equal(sample(left, 2000).phase, 'placed');
  assert.equal(sample(right, 5000).phase, 'placed');
  assert.equal(sample(null, 5300).phase, 'placed');
  assert.equal(sample(null, 5599).phase, 'placed');
  assert.equal(sample(null, 5600).phase, 'empty');
  assert.deepEqual(calls, [left]);
  assert.equal(sample(right, 5601).phase, 'settling');
  assert.equal(sample(right, 7601).phase, 'placed');
  assert.deepEqual(calls, [left, right]);
});

test('one empty frame does not re-arm the placement latch', () => {
  const { sample, calls } = fixture();
  sample(left, 0);
  sample(left, 2000);
  sample(null, 2100);
  assert.equal(sample(right, 5000).phase, 'placed');
  assert.deepEqual(calls, [left]);
});

test('missing observations do not certify time stable or empty', () => {
  const { sample, calls } = fixture();
  sample(left, 0);
  sample(undefined, 999);
  assert.equal(sample(left, 2500).progress, 0);
  assert.equal(sample(left, 4500).phase, 'placed');
  sample(null, 4800);
  sample(undefined, 5000);
  assert.equal(sample(null, 6000).phase, 'placed');
  assert.equal(sample(null, 6300).phase, 'empty');
  assert.deepEqual(calls, [left]);
});

test('small jitter is tolerated; cumulative drift resets the clock', () => {
  const { sample, calls } = fixture();
  sample(left, 0);
  assert.equal(sample({ x: -11.8, z: 4 }, 1000).progress, .5);
  const newAnchor = { x: -11.6, z: 4 };
  assert.equal(sample(newAnchor, 1500).progress, 0);
  assert.equal(sample(newAnchor, 3499).phase, 'settling');
  assert.equal(sample(newAnchor, 3500).phase, 'placed');
  assert.deepEqual(calls, [newAnchor]);
});

test('blocked locations do not repeat; repositioning lets a new valid location commit', () => {
  const { sample, calls } = fixture(point =>
    point.x < 0 ? { ok: false, reason: '挡住了通道' } : { ok: true });
  sample(left, 0);
  assert.deepEqual(sample(left, 2000), {
    phase: 'blocked', point: left, progress: 1, reason: '挡住了通道',
  });
  assert.equal(sample({ x: -12.1, z: 4 }, 5000).phase, 'blocked');
  sample(null, 5500);
  assert.equal(sample(left, 5600).phase, 'blocked');
  assert.equal(sample(right, 5700).phase, 'settling');
  assert.equal(sample(right, 7700).phase, 'placed');
  assert.deepEqual(calls, [left, right]);
});

test('invalid samples do not mutate, and a commit error blocks rather than repeatedly throwing', () => {
  const { sample, calls } = fixture(() => { throw new Error('test failure'); });
  assert.equal(sample(left, 100).phase, 'settling');
  assert.throws(() => sample(left, 99), /timestamp/);
  assert.throws(() => sample({ x: Infinity, z: 4 }, 110), /finite/);
  assert.equal(sample(left, 2100).reason, 'test failure');
  assert.equal(sample(left, 2200).phase, 'blocked');
  assert.deepEqual(calls, [left]);
});

test('callback and consumer cannot mutate the tracked point', () => {
  const { sample, calls } = fixture(point => {
    point.x = 99;
    return { ok: true };
  });
  const preview = sample(left, 0);
  preview.point.x = 123;
  assert.deepEqual(sample(left, 2000).point, left);
  assert.deepEqual(calls, [left]);
});
