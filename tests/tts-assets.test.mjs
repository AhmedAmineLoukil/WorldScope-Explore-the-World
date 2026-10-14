import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('the bundled Piper phonemizer data is complete (including after sync conflicts)', async () => {
  const data = await readFile(new URL('../public/wasm/piper/piper_phonemize.data', import.meta.url));
  assert.equal(data.length, 18_077_249, 'Restore the full Piper data file before building.');
  assert.equal(createHash('sha256').update(data).digest('hex'),
    '29f1025eb23a5b5c192cd14a6efbce4509402ff265405072ee6f7d1a09b78f8c');
});
