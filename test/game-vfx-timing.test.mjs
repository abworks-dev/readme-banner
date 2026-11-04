import assert from 'node:assert/strict';
import test from 'node:test';
import { crc32, deflateSync } from 'node:zlib';
import { exactFrameRate } from '../examples/pixel-game-vfx/apng-timing.mjs';

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length); out.write(type, 4, 4, 'ascii'); out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, -4)), out.length - 4);
  return out;
}
function fixture() {
  const header = Buffer.alloc(13); header.writeUInt32BE(1); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  const animation = Buffer.alloc(8); animation.writeUInt32BE(2);
  const control = (sequence) => {
    const b = Buffer.alloc(26); b.writeUInt32BE(sequence); b.writeUInt32BE(1, 4); b.writeUInt32BE(1, 8);
    b.writeUInt16BE(33, 20); b.writeUInt16BE(1000, 22); return chunk('fcTL', b);
  };
  const compressed = deflateSync(Buffer.from([0, 12, 34, 56, 255]));
  const following = Buffer.alloc(compressed.length + 4); following.writeUInt32BE(2); following.set(compressed, 4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('acTL', animation),
    control(0), chunk('IDAT', compressed), control(1), chunk('fdAT', following), chunk('IEND', Buffer.alloc(0))]);
}
function chunks(png) {
  const result = [];
  for (let offset = 8; offset < png.length;) {
    const n = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + n);
    assert.equal(png.readUInt32BE(offset + 8 + n), crc32(png.subarray(offset + 4, offset + 8 + n)));
    result.push({ type, data }); offset += n + 12;
  }
  return result;
}
test('APNG retiming preserves image chunks and source buffer while encoding exact 1/30 delays', () => {
  const source = fixture(), copy = Buffer.from(source), result = exactFrameRate(source, 30, 2);
  assert.deepEqual(source, copy);
  const before = chunks(source), after = chunks(result);
  assert.deepEqual(after.map((c) => c.type), before.map((c) => c.type));
  after.forEach((c, i) => {
    if (c.type !== 'fcTL') assert.deepEqual(c.data, before[i].data);
    else {
      assert.equal(c.data.readUInt16BE(20), 1); assert.equal(c.data.readUInt16BE(22), 30);
      assert.deepEqual(c.data.subarray(0, 20), before[i].data.subarray(0, 20));
      assert.deepEqual(c.data.subarray(24), before[i].data.subarray(24));
    }
  });
});
test('APNG retiming refuses malformed input rather than publishing bad CRC or partial chunks', () => {
  const broken = fixture(); broken[25] ^= 1;
  assert.throws(() => exactFrameRate(broken, 30, 2), /CRC/);
  assert.throws(() => exactFrameRate(fixture().subarray(0, -2), 30, 2), /Truncated/);
});
test('APNG retiming validates frame count and representable frame rates', () => {
  assert.throws(() => exactFrameRate(fixture(), 30, 3));
  for (const fps of [0, -1, 30.5, 65536, NaN]) assert.throws(() => exactFrameRate(fixture(), fps, 2));
});
