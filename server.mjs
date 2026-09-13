import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChapterJob, estimateGeneration, ValidationError } from './backend/core.mjs';
import { AnimationService, InputError } from './backend/animation.mjs';
import { loadEnvFile } from 'node:process';

try { loadEnvFile(fileURLToPath(new URL('.env', import.meta.url))); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const root = fileURLToPath(new URL('.', import.meta.url));
const jobs = new Map();
const port = Number(process.env.PORT || 4173);
const animations = new AnimationService(join(root, '.mangamotion'));
await animations.init();
const mimeTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function capabilities() {
  const runwayConfigured = Boolean(process.env.RUNWAYML_API_SECRET);
  const paidGenerationEnabled = runwayConfigured && process.env.ENABLE_PAID_GENERATION === 'true';
  return {
    status: 'ok',
    pipeline: {
      chapterUpload: 'browser-local',
      pageShotPlanning: 'available',
      visionUnderstanding: process.env.GEMINI_API_KEY ? 'configured' : 'not-configured',
      characterConsistency: 'shared-appearance-prompts; not guaranteed',
      imageToVideo: paidGenerationEnabled ? 'enabled' : 'guarded',
      mp4Assembly: 'ffmpeg-required'
    },
    provider: {
      name: 'Runway',
      configured: runwayConfigured,
      paidGenerationEnabled,
      environmentVariable: 'RUNWAYML_API_SECRET'
    },
    warning: 'No paid request has been sent. Browser pan/zoom previews are not generated character animation.'
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request, limit = 1_000_000) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > limit) throw new ValidationError('Request too large. Use up to six resized chapter pages and three reference images.');
  }
  try { return body ? JSON.parse(body) : {}; } catch { throw new ValidationError('Request body must be valid JSON.'); }
}

async function serveFile(request, response, pathname) {
  const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!['index.html', 'styles.css', 'ai-studio.css', 'app.js', 'ai-studio.js'].includes(requested)) return sendJson(response, 404, { error: 'Not found' });
  const safePath = normalize(join(root, requested));
  if (!safePath.startsWith(root) || basename(safePath).startsWith('.')) return sendJson(response, 403, { error: 'Forbidden' });
  try {
    const info = await stat(safePath);
    if (!info.isFile()) return sendJson(response, 404, { error: 'Not found' });
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(safePath)] || 'application/octet-stream' });
    if (request.method === 'HEAD') return response.end();
    createReadStream(safePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: 'Not found' });
  }
}

export async function app(request, response) {
 try {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const method = request.method || 'GET';
  const host = request.headers.host || 'localhost';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return sendJson(response, 403, { error: 'Local access only' });
  if (method === 'POST') {
    if (request.headers.origin && request.headers.origin !== `http://${host}`) return sendJson(response, 403, { error: 'Cross-origin request rejected' });
    if (!(request.headers['content-type'] || '').startsWith('application/json')) return sendJson(response, 415, { error: 'Use application/json' });
  }
  if (method === 'POST' && url.pathname === '/api/animations') {
    return sendJson(response, 201, await animations.create(await readJson(request, 18_000_000)));
  }
  const animationMatch = url.pathname.match(/^\/api\/animations\/([a-f0-9-]{36})(?:\/(analyze|generate|video|panel-\d+))?$/);
  if (animationMatch) {
    const [, id, action] = animationMatch;
    const job = animations.get(id);
    if (method === 'GET' && !action) return sendJson(response, 200, job);
    if (method === 'POST' && ['analyze', 'generate'].includes(action)) {
      const payload = await readJson(request);
      if (action === 'generate' && payload.estimatedUsd !== job.estimate?.estimatedUsd) return sendJson(response, 409, { error: 'Review the current video estimate before generating.' });
      return sendJson(response, 202, animations.start(id, action, payload.approved));
    }
    if (method === 'GET' && (action === 'video' || /^panel-\d+$/.test(action || ''))) {
      const video = action === 'video';
      if (video && job.status !== 'complete') return sendJson(response, 409, { error: 'Video is not ready.' });
      const path = join(root, '.mangamotion', id, video ? 'animation.mp4' : `${action}.jpg`);
      if (!existsSync(path)) return sendJson(response, 404, { error: 'Media not found.' });
      const info = await stat(path);
      response.writeHead(200, { 'Content-Type': video ? 'video/mp4' : 'image/jpeg', 'Content-Length': info.size, 'Cache-Control': 'no-store', ...(video ? { 'Content-Disposition': 'inline; filename="mangamotion-animation.mp4"' } : {}) });
      const stream = createReadStream(path); stream.on('error', () => response.destroy()); stream.pipe(response); return;
    }
  }
  if (method === 'GET' && url.pathname === '/api/health') return sendJson(response, 200, capabilities());
  if (method === 'POST' && url.pathname === '/api/estimates') return readJson(request).then(payload => sendJson(response, 200, estimateGeneration(payload))).catch(error => sendJson(response, 400, { error: error.message }));
  if (method === 'POST' && url.pathname === '/api/jobs') return readJson(request).then(payload => {
    const job = createChapterJob(payload);
    jobs.set(job.id, job);
    sendJson(response, 201, job);
  }).catch(error => sendJson(response, error instanceof ValidationError ? 400 : 500, { error: error.message || 'Unable to create job.' }));
  const jobMatch = url.pathname.match(/^\/api\/jobs\/([a-z0-9-]+)$/i);
  if (method === 'GET' && jobMatch) {
    const job = jobs.get(jobMatch[1]);
    return job ? sendJson(response, 200, job) : sendJson(response, 404, { error: 'Job not found. Jobs are held in memory in this development foundation.' });
  }
  const generateMatch = url.pathname.match(/^\/api\/jobs\/([a-z0-9-]+)\/generate$/i);
  if (method === 'POST' && generateMatch) {
    const job = jobs.get(generateMatch[1]);
    if (!job) return sendJson(response, 404, { error: 'Job not found.' });
    const status = capabilities();
    return sendJson(response, 409, {
      error: 'Paid AI generation is deliberately blocked in this build.',
      jobId: job.id,
      required: ['A server-side RUNWAYML_API_SECRET', 'ENABLE_PAID_GENERATION=true', 'A reviewed provider estimate and explicit user approval'],
      provider: status.provider,
      note: 'No chapter data was sent to a video provider and no charge was made.'
    });
  }
  if (method === 'GET' || method === 'HEAD') return await serveFile(request, response, url.pathname);
  return sendJson(response, 405, { error: 'Method not allowed.' });
 } catch (error) {
   return sendJson(response, error instanceof InputError || error instanceof ValidationError ? 400 : 500,
     { error: error instanceof InputError || error instanceof ValidationError ? error.message : 'Unable to process request. Check input files and server setup.' });
 }
}

if (process.argv[1] === fileURLToPath(import.meta.url) && existsSync(process.argv[1])) {
  const server = createServer(app);
  server.on('error', error => {
    console.error(`MangaMotion backend could not start: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`MangaMotion running at http://127.0.0.1:${port} — keep this Terminal open.`));
}
