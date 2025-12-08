let viewer;
let collectedManifests = [];

// --- begin deeplink fileopening script --
(function() {
const FILE_INPUT_SELECTOR = '#uploadManifest';
const LOAD_BUTTON_SELECTOR = '#loadManifest';

// Wait for DOM, then defer to the next tick so other DOMContentLoaded handlers
// (like initializeEventListeners) have time to attach their listeners.
document.addEventListener('DOMContentLoaded', () => {
setTimeout(() => {
openHostedFileFromQuery().catch(err => {
console.error('Deep-link file loading failed:', err);
alert('Unable to load file from URL. Make sure it is public and supports CORS.');
});
}, 0);
});

async function openHostedFileFromQuery() {
const params = new URLSearchParams(window.location.search);
const rawParam = params.get('file') || params.get('url');
if (!rawParam) return;

const fileUrl = normalizeFileUrl(rawParam);
const response = await fetch(fileUrl, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${fileUrl}`);

const blob = await response.blob();
const filename = params.get('filename') || deriveFilenameFromUrl(fileUrl);
const fileObj = new File([blob], filename, { type: blob.type || 'application/json' });

const input = document.querySelector(FILE_INPUT_SELECTOR) || document.querySelector('input[type="file"]');
if (!input || input.type !== 'file') {
  throw new Error('File input not found. Set FILE_INPUT_SELECTOR to your input element.');
}

// Insert the file and trigger your existing change handler
const dt = new DataTransfer();
dt.items.add(fileObj);
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));

// Autoload by clicking your existing Load button
const loadBtn = document.querySelector(LOAD_BUTTON_SELECTOR);
if (loadBtn) {
  // Ensure the click runs after all change handlers complete
  setTimeout(() => {
    loadBtn.click();
  }, 0);
} else {
  console.warn('Load button not found. Set LOAD_BUTTON_SELECTOR correctly.');
}

}

function normalizeFileUrl(u) {
try {
const url = new URL(u);
if (url.hostname === 'github.com') {
const parts = url.pathname.split('/');
const blobIdx = parts.indexOf('blob');
if (blobIdx !== -1) {
const newPath = parts.slice(0, blobIdx).concat(parts.slice(blobIdx + 1)).join('/');
return 'https://raw.githubusercontent.com' + newPath;
}
}
return u;
} catch (e) {
return u;
}
}

function deriveFilenameFromUrl(u) {
try {
const url = new URL(u);
const base = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
return decodeURIComponent(base || 'download.json');
} catch {
return 'download.json';
}
}
})();

/* --- end deeplink fileloading -- */

document.addEventListener('DOMContentLoaded', () => {
  viewer = OpenSeadragon({
    id: 'viewer',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.0.0/images/',
    tileSources: []
  });

  // Initialize resizer functionality
  initializeResizer();

  // Initialize event listeners
  initializeEventListeners();
});

// Function to make the viewer resizable
function initializeResizer() {
  const resizer = document.getElementById('resizer');
  const leftPanel = document.querySelector('.left-panel');
  const viewer = document.getElementById('viewer');
  
  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const containerWidth = document.querySelector('.container').offsetWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;

    if (newLeftWidth > 20 && newLeftWidth < 80) {
      leftPanel.style.width = `${newLeftWidth}%`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
  });
}

// Function to make cards draggable and reorderable
function makeCardDraggable(card) {
  card.draggable = true;

  card.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
      e.preventDefault();
      return;
    }
    
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', card.innerHTML);
  });

  card.addEventListener('dragend', (e) => {
    card.classList.remove('dragging');
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggingCard = document.querySelector('.dragging');
    if (draggingCard && draggingCard !== card) {
      card.classList.add('drag-over');
    }
  });

  card.addEventListener('dragleave', (e) => {
    card.classList.remove('drag-over');
  });

  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
    
    const draggingCard = document.querySelector('.dragging');
    if (draggingCard && draggingCard !== card) {
      const gallery = document.getElementById('gallery');
      const allCards = [...gallery.querySelectorAll('.card')];
      const draggedIndex = allCards.indexOf(draggingCard);
      const targetIndex = allCards.indexOf(card);

      if (draggedIndex < targetIndex) {
        card.parentNode.insertBefore(draggingCard, card.nextSibling);
      } else {
        card.parentNode.insertBefore(draggingCard, card);
      }
    }
  });
}

// Helper function to get metadata values
function getMetadataValue(metadata, label, getLast = false) {
  const items = metadata.filter(item => item.label === label);
  
  if (getLast && items.length > 0) {
    const lastItem = items[items.length - 1];
    if (Array.isArray(lastItem.value)) {
      return lastItem.value[0];
    }
    return lastItem.value;
  }

  return items.length > 0 ? items[0].value : null;
}

// Helper function to check if URL is absolute
function isAbsoluteURL(url) {
  return /^(http|https):\/\//i.test(url);
}

 // --- Construct the Allmaps Link ---
  //Get the manifest URL
  const manifestUrlForGeoreferencing = manifest.id || manifest['@id'];

  //Create the full Allmaps Editor URL
  const allmapsLink = `https://editor.allmaps.org/?url=${encodeURIComponent(manifestUrlForGeoreferencing)}`;


// Function to add a canvas to the gallery (VIEWER VERSION - NO DELETE BUTTON)
function addCanvasToGallery(canvas, manifest) {
  const imageService = canvas.images[0].resource.service;

  if (!imageService || !imageService['@id']) {
    console.error('Image service is missing or does not contain an @id field:', canvas);
    return;
  }

  const imageUrl = `${imageService['@id']}/full/!200,200/0/default.jpg`;
  const highResUrl = `${imageService['@id']}/info.json`;

  const manifestMetadata = manifest.metadata || [];    
  const canvasMetadata = canvas.metadata || [];

  const title = manifest.label || canvas.label || 'No title';
  const author = getMetadataValue(manifestMetadata, 'Author') || getMetadataValue(canvasMetadata, 'Author') || 'Unknown';
  const date = getMetadataValue(manifestMetadata, 'Date') || getMetadataValue(canvasMetadata, 'Date') || 'Unknown';
  const collection = getMetadataValue(manifestMetadata, 'Collection') || getMetadataValue(canvasMetadata, 'Collection') || 'Unknown';
  const attribution = manifest.attribution || 'No attribution';
  
  let locationLink = null;

  if (manifest.related) {
    if (typeof manifest.related === 'object' && manifest.related["@id"]) {
      locationLink = manifest.related["@id"];
    } else if (typeof manifest.related === 'string') {
      locationLink = manifest.related;
    }
  }

  if (!locationLink) {
    locationLink = getMetadataValue(canvasMetadata, 'Identifier') || 
                   getMetadataValue(manifestMetadata, 'Identifier', true) ||
                   getMetadataValue(canvasMetadata, 'Item Url') ||
                   getMetadataValue(manifestMetadata, 'Item Url') ||
                   canvas['@id'] || 
                   'No link available';
  }

  if (!isAbsoluteURL(locationLink) && locationLink !== 'No link available') {
    locationLink = 'https://' + locationLink;
  }

  const card = document.createElement('div');
  card.className = 'card';
  
  makeCardDraggable(card);

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = title;

  img.addEventListener('click', () => {
    viewer.open(highResUrl);
  });

  const titleEl = document.createElement('p');
  titleEl.innerHTML = `<strong>Title:</strong> ${title}`;

  const authorEl = document.createElement('p');
  authorEl.innerHTML = `<strong>Author:</strong> ${author}`;

  const dateEl = document.createElement('p');
  dateEl.innerHTML = `<strong>Date:</strong> ${date}`;

  const collectionEl = document.createElement('p');
  collectionEl.innerHTML = `<strong>Collection:</strong> ${collection}`;

  const attributionEl = document.createElement('p');
  attributionEl.innerHTML = `<strong>Attribution:</strong> ${attribution}`;

  const locationLinkEl = document.createElement('a');
  locationLinkEl.href = locationLink;
  locationLinkEl.textContent = 'View Item';
  locationLinkEl.target = '_blank';

  const locationParagraph = document.createElement('p');
  locationParagraph.appendChild(locationLinkEl);

  const manifestLinkEl = document.createElement('a');
  manifestLinkEl.href = manifest['@id'] || '#';
  manifestLinkEl.textContent = 'View IIIF Manifest';
  manifestLinkEl.target = '_blank';
  manifestLinkEl.className = 'manifest-link';

  const manifestParagraph = document.createElement('p');
  manifestParagraph.appendChild(manifestLinkEl);

  // Create link to Allmaps
  const allmapsLinkEl = document.createElement('a');
  allmapsLinkEl.href = allmapsLink;
  allmapsLinkEl.textContent = 'Open in Allmaps Editor';
  allmapsLinkEl.target = '_blank';

  const allmapsParagraph = document.createElement('p');
  allmapsParagraph.appendChild(allmapsLinkEl);


  // NOTE: No delete button in viewer version
  card.appendChild(img);
  card.appendChild(titleEl);
  card.appendChild(authorEl);
  card.appendChild(dateEl);
  card.appendChild(collectionEl);
  card.appendChild(attributionEl);
  card.appendChild(locationParagraph);
  card.appendChild(manifestParagraph);
  card.appendChild(allmapsParagraph);


  document.getElementById('gallery').appendChild(card);
}

// Clear current gallery and add images from loaded collection
function repopulateGallery(manifestData) {
  const gallery = document.getElementById('gallery');
  
  if (!gallery) {
    console.error('Gallery element not found!');
    return;
  }
  
  gallery.innerHTML = '';

  const manifests = manifestData.items;

  if (!Array.isArray(manifests)) {
    console.error('No valid items found in the manifest data.');
    return;
  }

  collectedManifests = [];

  manifests.forEach(manifest => {
    collectedManifests.push(manifest);
    
    if (manifest.sequences && manifest.sequences.length > 0) {
      const canvasItems = manifest.sequences[0].canvases;
      canvasItems.forEach(canvas => {
        addCanvasToGallery(canvas, manifest);
      });
    } else {
      console.error('Manifest does not contain valid sequences.');
    }
  });
}
// Initialize all event listeners
function initializeEventListeners() {
  // Event listener for toggle input panel button
document.getElementById('toggleInputs').addEventListener('click', function() {
  const inputPanel = document.getElementById('inputPanel');
  const toggleBtn = document.getElementById('toggleInputs');
  
  if (inputPanel.classList.contains('hidden')) {
    inputPanel.classList.remove('hidden');
    toggleBtn.textContent = 'Hide Input Panel';
  } else {
    inputPanel.classList.add('hidden');
    toggleBtn.textContent = 'Show Input Panel';
  }
});

  // Show selected filename when file is chosen
  document.getElementById('uploadManifest').addEventListener('change', function(e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    document.getElementById('fileName').textContent = fileName;
  });


  // Event listener to load the uploaded combined manifest
  document.getElementById('loadManifest').addEventListener('click', async () => {
    const fileInput = document.getElementById('uploadManifest');
    const file = fileInput.files[0];

    if (!file) {
      alert('Please select a JSON file to upload.');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async function(event) {
      const jsonContent = event.target.result;
      try {
        const manifestData = JSON.parse(jsonContent);
        repopulateGallery(manifestData);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Failed to load manifest: ' + error.message);
      }
    };

    reader.readAsText(file);
  });
}
