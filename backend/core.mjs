import { randomUUID } from 'node:crypto';

export const RUNWAY_PRICING = {
  provider: 'Runway',
  model: 'gen4_turbo',
  creditsPerSecond: 5,
  usdPerCredit: 0.01,
  usdPerSecond: 0.05,
  source: 'https://docs.dev.runwayml.com/guides/pricing/'
};

const allowedFormats = new Set(['16:9', '9:16', '1:1']);
const allowedMotion = new Set(['cinematic', 'energetic', 'gentle']);

export function estimateGeneration({ duration = 30, shotCount = 6, attempts = 1 } = {}) {
  const safeDuration = clampInteger(duration, 1, 60, 30);
  const safeShotCount = clampInteger(shotCount, 1, 40, 6);
  const safeAttempts = clampInteger(attempts, 1, 5, 1);
  const secondsPerShot = safeDuration / safeShotCount;
  const estimatedUsd = roundMoney(safeDuration * safeAttempts * RUNWAY_PRICING.usdPerSecond);
  return {
    provider: RUNWAY_PRICING.provider,
    model: RUNWAY_PRICING.model,
    durationSeconds: safeDuration,
    shotCount: safeShotCount,
    secondsPerShot: Number(secondsPerShot.toFixed(1)),
    attemptsPerShot: safeAttempts,
    estimatedUsd,
    notes: [
      'Estimate covers image-to-video generation only; it excludes storage, taxes, vision analysis, and retries beyond the selected attempt count.',
      'This estimate does not charge your account. A paid request remains blocked until the server is explicitly enabled.'
    ]
  };
}

export function createChapterJob(payload = {}) {
  if (!payload.rightsConfirmed) {
    throw new ValidationError('Confirm that this is an original, public-domain, or licensed chapter before creating a generation job.');
  }
  const chapter = payload.chapter || {};
  const name = String(chapter.name || '').trim();
  const pageCount = clampInteger(chapter.pageCount, 1, 60, 0);
  if (!name || !pageCount) throw new ValidationError('A chapter name and page count are required.');

  const inputSettings = payload.settings || {};
  const settings = {
    frame: allowedFormats.has(inputSettings.frame) ? inputSettings.frame : '16:9',
    duration: clampInteger(inputSettings.duration, 1, 60, 30),
    motion: allowedMotion.has(inputSettings.motion) ? inputSettings.motion : 'cinematic'
  };
  const maxShots = Math.max(1, Math.floor(settings.duration / 2.5));
  const shotCount = Math.min(pageCount, maxShots);

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'planned',
    chapter: { name, pageCount },
    settings,
    analysis: {
      state: 'not-configured',
      message: 'No vision model is configured. This is a page-based shot plan, not AI story, character, or action understanding.',
      shots: buildPageShotPlan(pageCount, shotCount, settings.duration)
    },
    nextStep: 'Configure a vision model for panel, character, and action analysis before requesting image-to-video generation.'
  };
}

export function buildPageShotPlan(pageCount, shotCount, duration) {
  return Array.from({ length: shotCount }, (_, index) => {
    const page = shotCount === 1 ? 1 : Math.round(index * (pageCount - 1) / (shotCount - 1)) + 1;
    return {
      id: `shot-${index + 1}`,
      order: index + 1,
      page,
      durationSeconds: Number((duration / shotCount).toFixed(1)),
      state: 'needs-vision-analysis',
      description: `Page ${page} selected for a future analyzed shot. Character identity and action are not yet inferred.`
    };
  });
}

export class ValidationError extends Error {}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
