const dropZone = document.querySelector('#dropZone');
const fileInput = document.querySelector('#fileInput');
const browseButton = document.querySelector('#browseButton');
const startButton = document.querySelector('#startButton');
const processing = document.querySelector('#processing');
const loadingText = document.querySelector('#loadingText');
const progressNumber = document.querySelector('#progressNumber');
const progressBar = document.querySelector('#progressBar');
const readyCard = document.querySelector('#readyCard');
const readyText = document.querySelector('#readyText');
const tryAgainButton = document.querySelector('#tryAgainButton');
const filePreview = document.querySelector('#filePreview');
const imagePreview = document.querySelector('#imagePreview');
const pdfPreview = document.querySelector('#pdfPreview');
const previewTitle = document.querySelector('#previewTitle');
const previewKind = document.querySelector('#previewKind');
const previewMeta = document.querySelector('#previewMeta');
const scenePlan = document.querySelector('#scenePlan');
const planSource = document.querySelector('#planSource');
const openPlanButton = document.querySelector('#openPlanButton');
const sceneTitle = document.querySelector('#sceneTitle');
const sceneDescription = document.querySelector('#sceneDescription');
const sceneTiming = document.querySelector('#sceneTiming');
const sceneTags = document.querySelector('#sceneTags');
const openEditorButton = document.querySelector('#openEditorButton');
const closeEditorButton = document.querySelector('#closeEditorButton');
const sceneEditor = document.querySelector('#sceneEditor');
const editorTitle = document.querySelector('#editorTitle');
const editorDescription = document.querySelector('#editorDescription');
const editorMood = document.querySelector('#editorMood');
const editorCamera = document.querySelector('#editorCamera');
const editorVoice = document.querySelector('#editorVoice');
const editorDuration = document.querySelector('#editorDuration');
const draftStatus = document.querySelector('#draftStatus');
const panelChoices = document.querySelectorAll('.panel-choice');
const openPreviewButton = document.querySelector('#openPreviewButton');
const closePreviewButton = document.querySelector('#closePreviewButton');
const animationPlayer = document.querySelector('#animationPlayer');
const playerStage = document.querySelector('#playerStage');
const animationImage = document.querySelector('#animationImage');
const storyboardPoster = document.querySelector('#storyboardPoster');
const playerTitle = document.querySelector('#playerTitle');
const playerDetails = document.querySelector('#playerDetails');
const posterPanel = document.querySelector('#posterPanel');
const playerMood = document.querySelector('#playerMood');
const playerTime = document.querySelector('#playerTime');
const playPreviewButton = document.querySelector('#playPreviewButton');
const restartPreviewButton = document.querySelector('#restartPreviewButton');
const previewProgress = document.querySelector('#previewProgress');

let uploadTimers = [];
let previewUrl = '';
let selectedPanel = 'Establishing shot';
let selectedFileIsPdf = false;
let previewFrame = 0;
let previewStartedAt = 0;
const sceneDraftKey = 'mangamotion-scene-draft';

function setTags(tags) {
  sceneTags.replaceChildren();
  tags.forEach(tag => {
    const label = document.createElement('span');
    label.textContent = tag;
    sceneTags.append(label);
  });
}

function updatePanelChoices() {
  panelChoices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.panel === selectedPanel)));
}

function readSceneDraft() {
  return {
    title: editorTitle.value.trim() || 'Untitled scene',
    description: editorDescription.value.trim() || 'Add direction for this scene.',
    mood: editorMood.value,
    camera: editorCamera.value,
    voice: editorVoice.value,
    duration: Math.min(60, Math.max(1, Number(editorDuration.value) || 12)),
    panel: selectedPanel
  };
}

function applySceneDraft(draft) {
  editorTitle.value = draft.title;
  editorDescription.value = draft.description;
  editorMood.value = draft.mood;
  editorCamera.value = draft.camera;
  editorVoice.value = draft.voice;
  editorDuration.value = draft.duration;
  selectedPanel = draft.panel;
  sceneTitle.textContent = draft.title;
  sceneDescription.textContent = draft.description;
  sceneTiming.textContent = `Scene 01 · 00:00–00:${String(draft.duration).padStart(2, '0')}`;
  setTags([draft.mood, draft.camera, `${draft.duration} sec`, draft.panel]);
  updatePanelChoices();
  updatePlayerCopy(draft);
}

function currentSceneDuration() {
  return Math.min(60, Math.max(1, Number(editorDuration.value) || 12));
}

function updatePlayerCopy(draft = readSceneDraft()) {
  playerTitle.textContent = draft.title || 'Your scene in motion';
  playerDetails.textContent = `${draft.panel} · ${draft.camera} · ${draft.voice}`;
  posterPanel.textContent = draft.panel;
  playerMood.textContent = draft.mood;
  playerTime.textContent = `00:00 / 00:${String(draft.duration).padStart(2, '0')}`;
  playerStage.dataset.camera = draft.camera.toLowerCase().replaceAll(' ', '-');
}

function stopPreview() {
  window.cancelAnimationFrame(previewFrame);
  playerStage.classList.remove('is-playing');
  playPreviewButton.textContent = 'Play preview';
}

function restartPreview() {
  stopPreview();
  previewProgress.style.width = '0%';
  playerTime.textContent = `00:00 / 00:${String(currentSceneDuration()).padStart(2, '0')}`;
}

function playPreview() {
  stopPreview();
  const duration = Math.min(currentSceneDuration() * 400, 8000);
  previewStartedAt = performance.now();
  playerStage.classList.add('is-playing');
  playPreviewButton.textContent = 'Playing…';
  const tick = now => {
    const progress = Math.min((now - previewStartedAt) / duration, 1);
    previewProgress.style.width = `${progress * 100}%`;
    const seconds = Math.round(progress * currentSceneDuration());
    playerTime.textContent = `00:${String(seconds).padStart(2, '0')} / 00:${String(currentSceneDuration()).padStart(2, '0')}`;
    if (progress < 1) previewFrame = window.requestAnimationFrame(tick);
    else stopPreview();
  };
  previewFrame = window.requestAnimationFrame(tick);
}

function restoreSceneDraft() {
  try {
    const savedDraft = JSON.parse(localStorage.getItem(sceneDraftKey));
    if (savedDraft && typeof savedDraft.title === 'string') {
      applySceneDraft(savedDraft);
      draftStatus.textContent = 'Your previous scene draft was restored from this browser.';
    }
  } catch {
    // A missing or invalid browser draft should never interrupt the page.
  }
}

function clearUploadTimers() {
  uploadTimers.forEach(window.clearTimeout);
  uploadTimers = [];
}

function formatFileSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  imagePreview.removeAttribute('src');
  pdfPreview.removeAttribute('src');
  imagePreview.classList.add('hidden');
  pdfPreview.classList.add('hidden');
  filePreview.classList.add('hidden');
  scenePlan.classList.add('hidden');
  sceneEditor.classList.add('hidden');
  animationPlayer.classList.add('hidden');
  restartPreview();
}

function showPreview(file) {
  clearPreview();
  previewUrl = URL.createObjectURL(file);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  selectedFileIsPdf = isPdf;
  previewTitle.textContent = file.name;
  previewKind.textContent = isPdf ? 'PDF preview' : 'Image preview';
  previewMeta.textContent = `${formatFileSize(file.size)} · Previewing locally — your file stays on this device.`;
  if (isPdf) {
    pdfPreview.src = `${previewUrl}#page=1&view=FitH`;
    pdfPreview.classList.remove('hidden');
  } else {
    imagePreview.src = previewUrl;
    imagePreview.classList.remove('hidden');
  }
  filePreview.classList.remove('hidden');
}

function beginUpload(file) {
  if (!file) return;
  clearUploadTimers();
  showPreview(file);
  planSource.textContent = `Demo scene direction for ${file.name}.`;
  readyCard.classList.add('hidden');
  processing.classList.remove('hidden');
  progressNumber.textContent = '1 / 3';
  progressBar.style.width = '33%';
  loadingText.textContent = `Preparing ${file.name} for your first animated scene`;
  document.querySelector('#upload').scrollIntoView({ behavior: 'smooth', block: 'center' });
  uploadTimers.push(window.setTimeout(() => {
    progressNumber.textContent = '2 / 3';
    progressBar.style.width = '66%';
    loadingText.textContent = 'Finding panels, dialogue, and character moments';
  }, 1500));
  uploadTimers.push(window.setTimeout(() => {
    progressNumber.textContent = '3 / 3';
    progressBar.style.width = '100%';
    loadingText.textContent = 'Building your first animated scene plan';
  }, 3000));
  uploadTimers.push(window.setTimeout(() => {
    processing.classList.add('hidden');
    readyText.textContent = `${file.name} is ready for scene direction.`;
    readyCard.classList.remove('hidden');
    scenePlan.classList.remove('hidden');
  }, 4300));
}

browseButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => beginUpload(fileInput.files[0]));
startButton.addEventListener('click', () => document.querySelector('#upload').scrollIntoView({ behavior: 'smooth' }));
['dragenter', 'dragover'].forEach(event => dropZone.addEventListener(event, e => { e.preventDefault(); dropZone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(event => dropZone.addEventListener(event, e => { e.preventDefault(); dropZone.classList.remove('dragging'); }));
dropZone.addEventListener('drop', e => beginUpload(e.dataTransfer.files[0]));
tryAgainButton.addEventListener('click', () => {
  fileInput.value = '';
  clearPreview();
  readyCard.classList.add('hidden');
  fileInput.click();
});
openPlanButton.addEventListener('click', () => scenePlan.scrollIntoView({ behavior: 'smooth', block: 'start' }));
openEditorButton.addEventListener('click', () => {
  sceneEditor.classList.remove('hidden');
  sceneEditor.scrollIntoView({ behavior: 'smooth', block: 'center' });
  editorTitle.focus();
});
closeEditorButton.addEventListener('click', () => sceneEditor.classList.add('hidden'));
panelChoices.forEach(choice => choice.addEventListener('click', () => {
  selectedPanel = choice.dataset.panel;
  updatePanelChoices();
  draftStatus.textContent = `${selectedPanel} selected. Save the draft when you are ready.`;
}));
sceneEditor.addEventListener('submit', event => {
  event.preventDefault();
  const draft = readSceneDraft();
  applySceneDraft(draft);
  try {
    localStorage.setItem(sceneDraftKey, JSON.stringify(draft));
    draftStatus.textContent = 'Scene draft saved in this browser on this device.';
  } catch {
    draftStatus.textContent = 'The scene was updated, but this browser could not save the draft.';
  }
});
openPreviewButton.addEventListener('click', () => {
  const draft = readSceneDraft();
  updatePlayerCopy(draft);
  animationImage.classList.toggle('hidden', selectedFileIsPdf || !previewUrl);
  storyboardPoster.classList.toggle('hidden', !selectedFileIsPdf && Boolean(previewUrl));
  if (!selectedFileIsPdf && previewUrl) animationImage.src = previewUrl;
  animationPlayer.classList.remove('hidden');
  restartPreview();
  animationPlayer.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
closePreviewButton.addEventListener('click', () => {
  stopPreview();
  animationPlayer.classList.add('hidden');
});
playPreviewButton.addEventListener('click', playPreview);
restartPreviewButton.addEventListener('click', restartPreview);
restoreSceneDraft();
