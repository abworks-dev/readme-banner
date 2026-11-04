import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';

/** Preserve pinned Pixelbolt's encoded pixels; make its integer-ms delays exact rational FPS. */
export function exactFrameRate(input, fps, frameCount) {
  assert(Number.isInteger(fps) && fps > 0 && fps <= 65535);
  const png = Buffer.from(input);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let controls = 0, offset = 8;
  while (offset < png.length) {
    assert(offset + 12 <= png.length, 'Truncated PNG chunk');
    const length = png.readUInt32BE(offset), end = offset + length + 12;
    assert(end <= png.length, 'Truncated PNG data');
    const type = png.toString('ascii', offset + 4, offset + 8);
    assert.equal(png.readUInt32BE(end - 4), crc32(png.subarray(offset + 4, end - 4)), 'Invalid original CRC');
    if (type === 'fcTL') {
      assert.equal(length, 26);
      png.writeUInt16BE(1, offset + 8 + 20);
      png.writeUInt16BE(fps, offset + 8 + 22);
      png.writeUInt32BE(crc32(png.subarray(offset + 4, end - 4)), end - 4);
      controls++;
    }
    offset = end;
  }
  assert.equal(controls, frameCount);
  assert.equal(offset, png.length);
  return png;
}
