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

let uploadTimers = [];
let previewUrl = '';

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
}

function showPreview(file) {
  clearPreview();
  previewUrl = URL.createObjectURL(file);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
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
