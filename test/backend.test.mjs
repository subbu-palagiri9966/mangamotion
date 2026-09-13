import test from 'node:test';
import assert from 'node:assert/strict';
import { createChapterJob, estimateGeneration } from '../backend/core.mjs';

test('a licensed chapter creates an honest page-based plan', () => {
  const job = createChapterJob({ rightsConfirmed: true, chapter: { name: 'Original chapter.pdf', pageCount: 12 }, settings: { frame: '16:9', duration: 30, motion: 'cinematic' } });
  assert.equal(job.status, 'planned');
  assert.equal(job.analysis.state, 'not-configured');
  assert.equal(job.analysis.shots.length, 12);
  assert.match(job.analysis.message, /not AI story/i);
});

test('a job cannot be created without rights confirmation', () => {
  assert.throws(() => createChapterJob({ chapter: { name: 'Unknown.pdf', pageCount: 1 } }), /Confirm that this is/);
});

test('Runway estimate is calculated without making a paid request', () => {
  const estimate = estimateGeneration({ duration: 30, shotCount: 6, attempts: 1 });
  assert.equal(estimate.estimatedUsd, 1.5);
  assert.equal(estimate.model, 'gen4_turbo');
});
