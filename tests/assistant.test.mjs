import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { handleAssistant } from '../server/assistant.mjs';

async function request(method, body, env = {}, headers = {}) {
  const req = Readable.from(body ? [typeof body === 'string' ? body : JSON.stringify(body)] : []);
  req.method = method; req.headers = { host: 'localhost:5173', ...headers };
  let status, response;
  const res = { writeHead(code) { status = code; }, end(text) { response = JSON.parse(text); } };
  await handleAssistant(req, res, env);
  return { status, response };
}
test('missing credential returns explicit preview mode', async () => {
  const result = await request('POST', { messages: [{ role: 'user', content: 'Nature and hiking, please.' }] });
  assert.equal(result.status, 200); assert.equal(result.response.mode, 'preview'); assert.equal(result.response.reply, undefined);
});
test('invalid JSON and invalid conversation are rejected', async () => {
  assert.equal((await request('POST', '{')).status, 400);
  assert.equal((await request('POST', { messages: [{ role: 'system', content: 'Invalid client role' }] })).status, 400);
  assert.equal((await request('POST', { messages: [] })).status, 400);
});
test('cross-origin requests cannot invoke the assistant', async () => {
  assert.equal((await request('POST', { messages: [{ role: 'user', content: 'Hi' }] }, {}, { origin: 'https://unrelated.example' })).status, 403);
});
test('status reports configuration without exposing credentials', async () => {
  const result = await request('GET', null, { OPENAI_API_KEY: 'test-credential' });
  assert.deepEqual(result.response, { mode: 'live' });
});
test('live adapter forwards history and extracts response text', async () => {
  const originalFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (_url, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Try Iceland for a hiking adventure.' }] }] }) }; };
  try {
    const messages = [{ role: 'user', content: 'Where should I hike?' }];
    const result = await request('POST', { messages }, { OPENAI_API_KEY: 'test-credential', OPENAI_MODEL: 'configured-model' });
    assert.equal(result.response.mode, 'live'); assert.equal(result.response.reply, 'Try Iceland for a hiking adventure.');
    assert.deepEqual(payload.input, messages); assert.equal(payload.store, false); assert.equal(payload.model, 'configured-model');
    assert.ok(!JSON.stringify(result).includes('test-credential'));
  } finally { globalThis.fetch = originalFetch; }
});
test('provider failures return a usable error without exposing provider data', async () => {
  const originalFetch = globalThis.fetch; globalThis.fetch = async () => ({ ok: false });
  try { const result = await request('POST', { messages: [{ role: 'user', content: 'Hi' }] }, { OPENAI_API_KEY: 'test-credential' }); assert.equal(result.status, 502); assert.ok(result.response.error); assert.ok(!JSON.stringify(result).includes('test-credential')); }
  finally { globalThis.fetch = originalFetch; }
});
