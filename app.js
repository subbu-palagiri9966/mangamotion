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

let uploadTimers = [];

function clearUploadTimers() {
  uploadTimers.forEach(window.clearTimeout);
  uploadTimers = [];
}

function beginUpload(file) {
  if (!file) return;
  clearUploadTimers();
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
  readyCard.classList.add('hidden');
  fileInput.click();
});
