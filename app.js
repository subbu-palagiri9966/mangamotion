const $ = selector => document.querySelector(selector);

const chapterInput = $('#chapterInput');
const chapterDrop = $('#chapterDrop');
const fileSummary = $('#fileSummary');
const fileTitle = $('#fileTitle');
const fileMeta = $('#fileMeta');
const replaceChapter = $('#replaceChapter');
const visualRefs = $('#visualRefs');
const voiceRefs = $('#voiceRefs');
const musicRef = $('#musicRef');
const rightsCheck = $('#rightsCheck');
const analyzeButton = $('#analyzeButton');
const formStatus = $('#formStatus');
const emptyOutput = $('#emptyOutput');
const analysisOutput = $('#analysisOutput');
const renderOutput = $('#renderOutput');
const shotStrip = $('#shotStrip');
const referenceSummary = $('#referenceSummary');
const generateButton = $('#generateButton');
const motionCanvas = $('#motionCanvas');
const context = motionCanvas.getContext('2d');
const canvasOverlay = $('#canvasOverlay');
const renderStatus = $('#renderStatus');
const playButton = $('#playButton');
const restartButton = $('#restartButton');
const exportButton = $('#exportButton');
const downloadLink = $('#downloadLink');
const exportStatus = $('#exportStatus');
const renderProgress = $('#renderProgress');
const timeReadout = $('#timeReadout');

let chapterFiles = [];
let sourceFrames = [];
let shotFrames = [];
let ownedUrls = [];
let pdfLibraryPromise;
let animationFrame = 0;
let playbackStarted = 0;
let isPlaying = false;
let musicAudio = null;
let musicUrl = '';
let audioContext = null;
let audioSource = null;
let audioDestination = null;

const naturalSort = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function referenceFilesPresent() {
  return visualRefs.files.length + voiceRefs.files.length + musicRef.files.length > 0;
}

function updateReferenceLabel(input) {
  const label = input.closest('label');
  label.classList.toggle('has-files', input.files.length > 0);
  const small = label.querySelector('small');
  if (!small.dataset.defaultCopy) small.dataset.defaultCopy = small.textContent;
  small.textContent = input.files.length
    ? `${input.files.length} file${input.files.length === 1 ? '' : 's'} added`
    : small.dataset.defaultCopy;
}

function releaseFrames() {
  stopPlayback();
  ownedUrls.forEach(url => URL.revokeObjectURL(url));
  ownedUrls = [];
  sourceFrames = [];
  shotFrames = [];
  shotStrip.replaceChildren();
  analysisOutput.classList.add('hidden');
  renderOutput.classList.add('hidden');
  emptyOutput.classList.remove('hidden');
  downloadLink.classList.add('hidden');
}

function setChapter(files) {
  const selected = [...files];
  if (!selected.length) return;
  const allowed = selected.every(file => file.type === 'application/pdf' || file.type.startsWith('image/'));
  const oversized = selected.find(file => file.size > 150 * 1024 * 1024);
  const pdfs = selected.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  if (!allowed) {
    formStatus.textContent = 'Use a PDF or PNG, JPG, or WebP page images.';
    return;
  }
  if (oversized) {
    formStatus.textContent = `${oversized.name} is larger than 150 MB.`;
    return;
  }
  if (pdfs.length > 1 || (pdfs.length && selected.length > 1)) {
    formStatus.textContent = 'Choose one chapter PDF, or a set of page images—not both.';
    return;
  }
  releaseFrames();
  chapterFiles = selected.sort((a, b) => naturalSort.compare(a.name, b.name));
  const totalBytes = chapterFiles.reduce((sum, file) => sum + file.size, 0);
  fileTitle.textContent = chapterFiles.length === 1 ? chapterFiles[0].name : `${chapterFiles.length} ordered page images`;
  fileMeta.textContent = `${formatBytes(totalBytes)} · stays on this device`;
  fileSummary.classList.remove('hidden');
  chapterDrop.classList.add('hidden');
  analyzeButton.disabled = false;
  formStatus.textContent = referenceFilesPresent() && !rightsCheck.checked
    ? 'Confirm your rights to the reference files before mapping.'
    : 'Chapter ready to map.';
}

function loadPdfLibrary() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfLibraryPromise) return pdfLibraryPromise;
  pdfLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (!window.pdfjsLib) return reject(new Error('The PDF reader did not load.'));
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('The PDF reader could not be downloaded. Check your connection.'));
    document.head.append(script);
  });
  return pdfLibraryPromise;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('One of the chapter pages could not be read.'));
    image.src = url;
  });
}

async function imageFrames(files) {
  const frames = [];
  for (let index = 0; index < files.length; index += 1) {
    formStatus.textContent = `Reading page ${index + 1} of ${files.length}…`;
    const url = URL.createObjectURL(files[index]);
    ownedUrls.push(url);
    frames.push({ image: await loadImage(url), url, label: `Page ${index + 1}` });
  }
  return frames;
}

async function pdfFrames(file) {
  const pdfjsLib = await loadPdfLibrary();
  const task = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
  const pdf = await task.promise;
  const frames = [];
  const totalPages = pdf.numPages;
  const pageLimit = Math.min(totalPages, 60);
  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    formStatus.textContent = `Rendering PDF page ${pageNumber} of ${pageLimit}…`;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88));
    const url = URL.createObjectURL(blob);
    ownedUrls.push(url);
    frames.push({ image: await loadImage(url), url, label: `Page ${pageNumber}` });
    page.cleanup();
  }
  pdf.destroy();
  return { frames, totalPages, limited: totalPages > pageLimit };
}

function selectShots(frames, duration) {
  const maximumShots = Math.max(1, Math.floor(duration / 1.5));
  if (frames.length <= maximumShots) return [...frames];
  return Array.from({ length: maximumShots }, (_, index) => {
    const sourceIndex = Math.round(index * (frames.length - 1) / (maximumShots - 1));
    return frames[sourceIndex];
  });
}

function renderShotStrip() {
  shotStrip.replaceChildren();
  shotFrames.slice(0, 8).forEach((frame, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'shot-thumb';
    const image = document.createElement('img');
    image.src = frame.url;
    image.alt = frame.label;
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    thumb.append(image, number);
    shotStrip.append(thumb);
  });
  if (shotFrames.length > 8) {
    const more = document.createElement('div');
    more.className = 'shot-thumb';
    more.textContent = `+${shotFrames.length - 8}`;
    more.style.display = 'grid';
    more.style.placeItems = 'center';
    more.style.fontWeight = '700';
    shotStrip.append(more);
  }
}

function renderReferenceSummary() {
  const parts = [];
  if (visualRefs.files.length) parts.push(`${visualRefs.files.length} visual reference${visualRefs.files.length === 1 ? '' : 's'}`);
  if (voiceRefs.files.length) parts.push(`${voiceRefs.files.length} consented voice sample${voiceRefs.files.length === 1 ? '' : 's'}`);
  if (musicRef.files.length) parts.push('1 music track');
  referenceSummary.textContent = parts.length
    ? `Authorised reference pack staged: ${parts.join(' · ')}. Visual and voice references are reserved for the future generative backend${musicRef.files.length ? '; music can accompany the local preview' : ''}.`
    : 'No reference pack added. The motion cut will use only the uploaded chapter artwork.';
}

async function analyzeChapter() {
  if (!chapterFiles.length) return;
  if (referenceFilesPresent() && !rightsCheck.checked) {
    formStatus.textContent = 'Confirm you have permission to use the reference files.';
    rightsCheck.focus();
    return;
  }
  analyzeButton.disabled = true;
  analyzeButton.textContent = 'Mapping chapter…';
  releaseFrames();
  try {
    let pageTotal = chapterFiles.length;
    let limited = false;
    if (chapterFiles.length === 1 && (chapterFiles[0].type === 'application/pdf' || chapterFiles[0].name.toLowerCase().endsWith('.pdf'))) {
      const result = await pdfFrames(chapterFiles[0]);
      sourceFrames = result.frames;
      pageTotal = result.totalPages;
      limited = result.limited;
    } else {
      sourceFrames = await imageFrames(chapterFiles);
    }
    const duration = Number($('#targetLength').value);
    shotFrames = selectShots(sourceFrames, duration);
    $('#pageCount').textContent = pageTotal;
    $('#shotCount').textContent = shotFrames.length;
    $('#runTime').textContent = `${duration}s`;
    $('#analysisTitle').textContent = chapterFiles.length === 1 ? chapterFiles[0].name.replace(/\.pdf$/i, '') : 'Image chapter';
    renderShotStrip();
    renderReferenceSummary();
    emptyOutput.classList.add('hidden');
    analysisOutput.classList.remove('hidden');
    formStatus.textContent = limited
      ? `Mapped the first ${sourceFrames.length} of ${pageTotal} pages for this browser preview.`
      : `Mapped ${pageTotal} page${pageTotal === 1 ? '' : 's'} into ${shotFrames.length} motion shots.`;
    analysisOutput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    formStatus.textContent = error.message || 'The chapter could not be mapped.';
    emptyOutput.classList.remove('hidden');
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.innerHTML = 'Map chapter into shots <span>→</span>';
  }
}

function configureCanvas() {
  const format = $('#frameFormat').value;
  const sizes = { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [900, 900] };
  [motionCanvas.width, motionCanvas.height] = sizes[format];
  motionCanvas.parentElement.style.aspectRatio = format.replace(':', '/');
}

function easeInOut(value) {
  return value < .5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function drawCover(image, progress, index, alpha = 1) {
  const width = motionCanvas.width;
  const height = motionCanvas.height;
  const style = $('#motionStyle').value;
  const strength = style === 'energetic' ? .16 : style === 'gentle' ? .055 : .1;
  const eased = easeInOut(progress);
  const zoom = 1.02 + eased * strength;
  const baseScale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * baseScale * zoom;
  const drawHeight = image.height * baseScale * zoom;
  const travelX = Math.max(0, drawWidth - width);
  const travelY = Math.max(0, drawHeight - height);
  const horizontal = index % 2 === 0 ? eased : 1 - eased;
  const vertical = index % 3 === 0 ? eased : .5;
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(image, -travelX * horizontal, -travelY * vertical, drawWidth, drawHeight);
  context.restore();
}

function drawFrame(elapsedSeconds) {
  const duration = Number($('#targetLength').value);
  const safeElapsed = Math.min(Math.max(0, elapsedSeconds), duration);
  const shotDuration = duration / shotFrames.length;
  const index = Math.min(shotFrames.length - 1, Math.floor(safeElapsed / shotDuration));
  const localProgress = Math.min(1, (safeElapsed - index * shotDuration) / shotDuration);
  context.fillStyle = '#0b0c10';
  context.fillRect(0, 0, motionCanvas.width, motionCanvas.height);
  drawCover(shotFrames[index].image, localProgress, index);
  if (localProgress > .82 && index < shotFrames.length - 1) {
    const transition = (localProgress - .82) / .18;
    drawCover(shotFrames[index + 1].image, 0, index + 1, transition);
  }
  const shade = context.createLinearGradient(0, motionCanvas.height * .72, 0, motionCanvas.height);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,.62)');
  context.fillStyle = shade;
  context.fillRect(0, 0, motionCanvas.width, motionCanvas.height);
  context.fillStyle = 'rgba(255,255,255,.92)';
  context.font = `700 ${Math.max(18, Math.round(motionCanvas.width * .018))}px Space Grotesk, sans-serif`;
  context.fillText(`SHOT ${String(index + 1).padStart(2, '0')}  ·  ${shotFrames[index].label}`, motionCanvas.width * .035, motionCanvas.height * .94);
  const percent = safeElapsed / duration;
  renderProgress.style.width = `${percent * 100}%`;
  timeReadout.textContent = `${formatTime(safeElapsed)} / ${formatTime(duration)}`;
}

function formatTime(seconds) {
  const rounded = Math.floor(seconds);
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}

function stopMusic() {
  if (!musicAudio) return;
  musicAudio.pause();
  musicAudio.currentTime = 0;
}

function stopPlayback() {
  cancelAnimationFrame(animationFrame);
  isPlaying = false;
  if (playButton) playButton.textContent = '▶ Play';
  stopMusic();
}

async function prepareMusic() {
  if (!musicRef.files.length) return null;
  if (!musicAudio) {
    musicUrl = URL.createObjectURL(musicRef.files[0]);
    musicAudio = new Audio(musicUrl);
    musicAudio.loop = true;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioContext.createMediaElementSource(musicAudio);
    audioDestination = audioContext.createMediaStreamDestination();
    audioSource.connect(audioDestination);
    audioSource.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') await audioContext.resume();
  musicAudio.currentTime = 0;
  return audioDestination;
}

async function startPlayback(onComplete) {
  if (!shotFrames.length) return;
  stopPlayback();
  const duration = Number($('#targetLength').value);
  const music = await prepareMusic();
  if (music) musicAudio.play().catch(() => {});
  isPlaying = true;
  playButton.textContent = 'Playing…';
  playbackStarted = performance.now();
  const tick = now => {
    const elapsed = (now - playbackStarted) / 1000;
    drawFrame(elapsed);
    if (elapsed < duration && isPlaying) animationFrame = requestAnimationFrame(tick);
    else {
      stopPlayback();
      drawFrame(duration);
      if (onComplete) onComplete();
    }
  };
  animationFrame = requestAnimationFrame(tick);
}

function restartPreview() {
  stopPlayback();
  drawFrame(0);
}

function generatePreview() {
  configureCanvas();
  analysisOutput.classList.add('hidden');
  renderOutput.classList.remove('hidden');
  $('#renderTitle').textContent = $('#analysisTitle').textContent;
  canvasOverlay.classList.remove('hidden');
  renderStatus.textContent = 'Building the motion timeline…';
  drawFrame(0);
  window.setTimeout(() => {
    canvasOverlay.classList.add('hidden');
    startPlayback();
  }, 650);
  renderOutput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function supportedMimeType() {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

async function exportVideo() {
  if (!window.MediaRecorder || !motionCanvas.captureStream) {
    exportStatus.textContent = 'This browser cannot export canvas video. Use a current Chrome or Edge browser.';
    return;
  }
  exportButton.disabled = true;
  downloadLink.classList.add('hidden');
  exportStatus.textContent = 'Rendering in real time. Keep this tab open until the full video finishes.';
  stopPlayback();
  drawFrame(0);
  const canvasStream = motionCanvas.captureStream(30);
  const music = await prepareMusic();
  const tracks = [...canvasStream.getVideoTracks(), ...(music ? music.stream.getAudioTracks() : [])];
  const stream = new MediaStream(tracks);
  const mimeType = supportedMimeType();
  const recorderOptions = { videoBitsPerSecond: 8_000_000 };
  if (mimeType) recorderOptions.mimeType = mimeType;
  const recorder = new MediaRecorder(stream, recorderOptions);
  const chunks = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    ownedUrls.push(url);
    downloadLink.href = url;
    downloadLink.download = `${($('#renderTitle').textContent || 'mangamotion').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-motion-cut.webm`;
    downloadLink.classList.remove('hidden');
    exportStatus.textContent = `Video ready · ${formatBytes(blob.size)}`;
    exportButton.disabled = false;
  };
  recorder.start(1000);
  startPlayback(() => recorder.stop());
}

chapterDrop.addEventListener('click', () => chapterInput.click());
replaceChapter.addEventListener('click', () => chapterInput.click());
chapterInput.addEventListener('change', () => setChapter(chapterInput.files));
['dragenter', 'dragover'].forEach(name => chapterDrop.addEventListener(name, event => {
  event.preventDefault();
  chapterDrop.classList.add('dragging');
}));
['dragleave', 'drop'].forEach(name => chapterDrop.addEventListener(name, event => {
  event.preventDefault();
  chapterDrop.classList.remove('dragging');
}));
chapterDrop.addEventListener('drop', event => setChapter(event.dataTransfer.files));
[visualRefs, voiceRefs, musicRef].forEach(input => input.addEventListener('change', () => {
  if (input === musicRef && musicAudio) {
    stopMusic();
    musicAudio = null;
    audioSource = null;
    audioDestination = null;
    if (audioContext) audioContext.close();
    audioContext = null;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    musicUrl = '';
  }
  updateReferenceLabel(input);
  if (referenceFilesPresent() && !rightsCheck.checked) formStatus.textContent = 'Confirm your rights to the reference files before mapping.';
}));
rightsCheck.addEventListener('change', () => {
  formStatus.textContent = rightsCheck.checked ? 'Reference permission confirmed.' : 'Confirm your rights to the reference files before mapping.';
});
analyzeButton.addEventListener('click', analyzeChapter);
generateButton.addEventListener('click', generatePreview);
playButton.addEventListener('click', () => startPlayback());
restartButton.addEventListener('click', restartPreview);
exportButton.addEventListener('click', exportVideo);
window.addEventListener('beforeunload', () => {
  releaseFrames();
  if (musicUrl) URL.revokeObjectURL(musicUrl);
});
