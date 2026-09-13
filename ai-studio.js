// Shares the decoded chapter images from app.js; provider secrets stay on the server.
let animationJob = null;
const aiStatus = document.querySelector('#aiStatus');
const aiPlan = document.querySelector('#aiPlan');
const aiApproval = document.querySelector('#aiApproval');
const aiAnalyze = document.querySelector('#aiAnalyze');
const aiGenerate = document.querySelector('#aiGenerate');
const approval = document.querySelector('#videoApproval');
let aiBusy = false;
document.addEventListener('chapter-cleared', () => {
  if (aiBusy) return;
  animationJob = null; aiPlan.classList.add('hidden'); aiApproval.classList.add('hidden');
  document.querySelector('#aiVideo').classList.add('hidden'); document.querySelector('#aiDownload').classList.add('hidden');
  aiStatus.textContent = 'Chapter changed. Analyze the new chapter to generate its animation.';
  try { localStorage.removeItem('mangamotion-animation-job'); } catch { /* Optional. */ }
});

async function animationApi(path, payload) {
  const response = await fetch(path, payload === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('The backend did not return JSON. Open http://127.0.0.1:4173 with npm run dev running.'); }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function encodedFrame(image) {
  const scale = Math.min(1, 1400 / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((image.naturalWidth || image.width) * scale);
  canvas.height = Math.round((image.naturalHeight || image.height) * scale);
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', .85);
}

async function lockWhile(work) {
  if (aiBusy) return;
  aiBusy = true;
  const controls = [...document.querySelectorAll('button, input, select')].map(el => [el, el.disabled]);
  controls.forEach(([el]) => { el.disabled = true; });
  try { await work(); } catch (error) { aiStatus.textContent = error.message; }
  finally { controls.forEach(([el, disabled]) => { el.disabled = disabled; }); aiBusy = false; }
}

function displayJob(job) {
  animationJob = job;
  if (job.status === 'analyzing') aiStatus.textContent = 'Reading story, characters and panel boundaries…';
  else if (job.status === 'generating') aiStatus.textContent = `Animating shots: ${job.completedShots} / ${job.manifest.shots.length} complete. Keep the server running.`;
  else if (job.status === 'assembling') aiStatus.textContent = 'Assembling the generated clips into an MP4…';
  else if (job.status === 'ready') {
    aiStatus.textContent = 'Story analysis ready. Review the selected panels before paying for video generation.';
    aiPlan.replaceChildren();
    const summary = document.createElement('p'); summary.textContent = job.manifest.summary; aiPlan.append(summary);
    job.manifest.shots.forEach((shot, index) => {
      const row = document.createElement('figure');
      const img = document.createElement('img'); img.src = `/api/animations/${job.id}/panel-${index}`; img.alt = `Selected panel from page ${shot.page}`;
      const caption = document.createElement('figcaption'); caption.textContent = `${index + 1}. ${shot.action} (page ${shot.page}, 5 seconds)`;
      row.append(img, caption); aiPlan.append(row);
    });
    aiPlan.classList.remove('hidden');
    document.querySelector('#aiQuote').textContent = `${job.estimate.shots} shots · ${job.estimate.generatedSeconds} seconds · estimated $${job.estimate.estimatedUsd.toFixed(2)} for Runway. ${job.estimate.note}`;
    aiApproval.classList.remove('hidden'); approval.checked = false;
  } else if (job.status === 'complete') {
    aiStatus.textContent = 'Your generated MP4 is ready. Review motion, story accuracy and character consistency before sharing.';
    const video = document.querySelector('#aiVideo'); video.src = job.videoUrl; video.classList.remove('hidden');
    const link = document.querySelector('#aiDownload'); link.href = job.videoUrl; link.classList.remove('hidden');
    aiApproval.classList.add('hidden');
  } else if (['failed', 'interrupted'].includes(job.status)) {
    aiStatus.textContent = job.error; aiApproval.classList.add('hidden');
  }
}

async function monitor(id) {
  for (;;) {
    const job = await animationApi(`/api/animations/${id}`); displayJob(job);
    if (!['analyzing', 'generating', 'assembling'].includes(job.status)) return;
    await new Promise(resolve => setTimeout(resolve, 2500));
  }
}

aiAnalyze.addEventListener('click', () => lockWhile(async () => {
  if (!sourceFrames.length || sourceFrames.length > 6) throw new Error('Choose a chapter with 1–6 pages for this first AI test. No pages will be silently skipped.');
  if (!sourceRightsCheck.checked) throw new Error('Confirm your chapter rights first.');
  if (!document.querySelector('#analysisApproval').checked) throw new Error('Approve sending the chapter to Gemini for analysis.');
  if (visualRefs.files.length > 3) throw new Error('Use up to three reference images.');
  if (visualRefs.files.length && !rightsCheck.checked) throw new Error('Confirm your reference rights.');
  if ([...visualRefs.files].some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) throw new Error('For this version, use PNG/JPG/WebP reference images. Reference video processing is not implemented.');
  const health = await animationApi('/api/health');
  if (health.pipeline.visionUnderstanding === 'not-configured') throw new Error('Add GEMINI_API_KEY to .env in the project folder, enable provider calls, and restart npm run dev. Never paste the key in chat.');
  const refs = [];
  for (const file of visualRefs.files) {
    const url = URL.createObjectURL(file);
    try { refs.push(encodedFrame(await loadImage(url))); } finally { URL.revokeObjectURL(url); }
  }
  aiStatus.textContent = 'Uploading chapter to your local backend…';
  aiPlan.classList.add('hidden'); aiApproval.classList.add('hidden');
  document.querySelector('#aiVideo').classList.add('hidden'); document.querySelector('#aiDownload').classList.add('hidden');
  const job = await animationApi('/api/animations', { name: chapterFiles[0]?.name || 'Chapter',
    pages: sourceFrames.map(frame => encodedFrame(frame.image)), references: refs,
    rightsConfirmed: true, referenceRightsConfirmed: rightsCheck.checked,
    frame: document.querySelector('#frameFormat').value, duration: Number(document.querySelector('#targetLength').value),
    motion: document.querySelector('#motionStyle').value });
  animationJob = job;
  try { localStorage.setItem('mangamotion-animation-job', job.id); } catch { /* Saving a pointer is optional. */ }
  await animationApi(`/api/animations/${job.id}/analyze`, { approved: true });
  await monitor(job.id);
}));

aiGenerate.addEventListener('click', () => lockWhile(async () => {
  if (!animationJob || animationJob.status !== 'ready') throw new Error('Analyze the chapter first.');
  if (!approval.checked) throw new Error('Review and approve the video estimate first.');
  const job = await animationApi(`/api/animations/${animationJob.id}/generate`, { approved: true, estimatedUsd: animationJob.estimate.estimatedUsd });
  displayJob(job); await monitor(job.id);
}));

// Reopening a saved job never starts or re-submits paid work.
try {
  const id = localStorage.getItem('mangamotion-animation-job');
  if (id && /^[a-f0-9-]{36}$/.test(id)) animationApi(`/api/animations/${id}`).then(async job => {
    document.querySelector('#emptyOutput').classList.add('hidden');
    document.querySelector('#analysisOutput').classList.remove('hidden');
    displayJob(job);
    if (['analyzing', 'generating', 'assembling'].includes(job.status)) await lockWhile(() => monitor(id));
  }).catch(() => {});
} catch { /* Browser storage may be disabled. */ }
