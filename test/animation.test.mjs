import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { AnimationService, validateManifest, quote, providers, assemble } from '../backend/animation.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const manifest = () => ({ summary: 'A cat jumps.', characters: [{ id: 'cat', appearance: 'Orange cat' }], shots: [{ page: 1, box: [0, 0, 1, 1], action: 'The cat jumps onto the table.', characters: ['cat'] }] });
const image = `data:image/png;base64,${(await sharp({ create: { width: 200, height: 200, channels: 3, background: '#ffac44' } }).png().toBuffer()).toString('base64')}`;
const payload = { name: 'Test comic', pages: [image], frame: '16:9', duration: 5, rightsConfirmed: true };
const env = { ENABLE_PAID_GENERATION: 'true', GEMINI_API_KEY: 'test-only', RUNWAYML_API_SECRET: 'test-only' };

test('validates vision boxes, character identity and page provenance', () => {
  const m = manifest(); m.shots[0].box = [.8, 0, .2, 1];
  assert.throws(() => validateManifest(m, 1, 1), /inverted/);
  m.shots[0].box = [0, 0, 1, 1]; m.shots[0].page = 2;
  assert.throws(() => validateManifest(m, 1, 1), /unknown page/);
  m.shots[0].page = 1; m.shots[0].characters = ['stranger'];
  assert.throws(() => validateManifest(m, 1, 1), /Unknown character/);
  assert.equal(quote(Array(3).fill({})).estimatedUsd, .75);
});

test('pipeline crops, generates once, polls, assembles and persists without real provider calls', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mm-pipeline-')); let submits = 0;
  const provider = { analyze: async () => manifest(), submit: async () => { submits++; return 'task-1'; },
    poll: async () => ({ status: 'SUCCEEDED', output: ['https://example.test/video'] }), download: async () => Buffer.from('fixture-video') };
  const service = new AnimationService(dir, { env, provider, render: async (folder) => writeFile(join(folder, 'animation.mp4'), 'assembled-fixture'), wait: async () => {} });
  await service.init(); const job = await service.create(payload);
  assert.throws(() => service.start(job.id, 'analyze', false), /Approve/);
  service.start(job.id, 'analyze', true);
  assert.throws(() => service.start(job.id, 'analyze', true), /Another/);
  await service.operation;
  assert.equal(job.status, 'ready');
  assert.equal((await sharp(await readFile(join(dir, job.id, 'panel-0.jpg'))).metadata()).width, 1280);
  service.start(job.id, 'generate', true); await service.operation;
  assert.equal(job.status, 'complete'); assert.equal(submits, 1);
  assert.throws(() => service.start(job.id, 'generate', true), /Analyze/);
  const restored = new AnimationService(dir); await restored.init(); assert.equal(restored.get(job.id).status, 'complete');
});

test('disabled providers and invalid uploads cannot spend', async () => {
  const service = new AnimationService(await mkdtemp(join(tmpdir(), 'mm-guard-')), { env: {} }); await service.init();
  await assert.rejects(service.create({ ...payload, rightsConfirmed: false }), /rights/);
  await assert.rejects(service.create({ ...payload, pages: Array(7).fill(image) }), /1–6/);
  await assert.rejects(service.create({ ...payload, references: [image] }), /reference rights/);
  const job = await service.create(payload);
  assert.throws(() => service.start(job.id, 'analyze', true), /ENABLE_PAID/);
  assert.equal(job.status, 'uploaded');
});

test('provider failure stops after first submission, never retries a billed POST', async () => {
  let calls = 0;
  const service = new AnimationService(await mkdtemp(join(tmpdir(), 'mm-fail-')), { env, provider: {
    analyze: async () => manifest(), submit: async () => { calls++; throw new Error('network timeout'); }
  } });
  await service.init(); const job = await service.create(payload);
  service.start(job.id, 'analyze', true); await service.operation;
  service.start(job.id, 'generate', true); await service.operation;
  assert.equal(calls, 1); assert.equal(job.status, 'failed');
});

test('provider HTTP request has image data, stable model and supported duration', async () => {
  let request;
  const provider = providers(env, async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ id: 'task-abc' }) }; });
  await provider.submit(Buffer.from('image'), 'cat jumps', '16:9');
  const body = JSON.parse(request.options.body);
  assert.equal(body.duration, 5); assert.equal(body.ratio, '1280:720'); assert.equal(body.model, 'gen4_turbo');
  await assert.rejects(provider.download('http://127.0.0.1/private'), /output host/);
});

test('actual FFmpeg assembly produces playable h264 MP4', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mm-media-'));
  await exec('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=red:s=160x90:d=0.25', '-c:v', 'libx264', join(dir, 'clip-0.mp4')]);
  await assemble(dir, [{}], '16:9');
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', join(dir, 'animation.mp4')]);
  const stream = JSON.parse(stdout).streams[0]; assert.equal(stream.codec_name, 'h264'); assert.equal(stream.width, 1280);
});
