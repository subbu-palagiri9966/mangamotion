import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.mjs';
import { createServer } from 'node:http';

function invoke(method, url, body = '') {
  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
    end(value = '') { this.body += value; }
  };
  const request = {
    method,
    url,
    headers: { host: 'localhost', 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() { if (body) yield Buffer.from(body); }
  };
  return Promise.resolve(app(request, response)).then(() => response);
}

test('health endpoint accurately reports guarded paid generation', async () => {
  const response = await invoke('GET', '/api/health');
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.pipeline.visionUnderstanding, 'not-configured');
  assert.equal(body.provider.paidGenerationEnabled, false);
});

test('generation endpoint refuses to spend money', async () => {
  const created = await invoke('POST', '/api/jobs', JSON.stringify({ rightsConfirmed: true, chapter: { name: 'Licensed chapter.pdf', pageCount: 3 }, settings: {} }));
  const job = JSON.parse(created.body);
  const blocked = await invoke('POST', `/api/jobs/${job.id}/generate`);
  const body = JSON.parse(blocked.body);
  assert.equal(blocked.statusCode, 409);
  assert.match(body.error, /deliberately blocked/i);
});

test('HTTP serves the studio, blocks private files, and rejects cross-origin spend requests', async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base); assert.equal(page.status, 200); assert.match(await page.text(), /ai-studio.js/);
    for (const path of ['/.env', '/.env.example', '/backend/animation.mjs', '/package.json', '/.mangamotion/job.json']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    const blocked = await fetch(base + '/api/animations', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: '{}' });
    assert.equal(blocked.status, 403);
    const bad = await fetch(base + '/api/animations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(bad.status, 400);
    const health = await (await fetch(base + '/api/health')).json();
    assert.equal(health.provider.paidGenerationEnabled, false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
