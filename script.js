let viewer;
let collectedManifests = []; // This will hold the individual manifests

document.addEventListener('DOMContentLoaded', () => {
  viewer = OpenSeadragon({
    id: 'viewer',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.0.0/images/',
    tileSources: []
  });

  // Initialize resizer functionality
  initializeResizer();

  // Initialize all event listeners
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
    document.body.style.userSelect = 'none'; // Prevent text selection while dragging
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const containerWidth = document.querySelector('.container').offsetWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;

    // Set bounds for resizing (min 20%, max 80%)
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
    // Prevent dragging if clicking on image or links
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
    const lastItem = items[items.length - 1]; // Get the last instance found
    if (Array.isArray(lastItem.value)) {
      return lastItem.value[0]; // Return the first value of the array
    }
    return lastItem.value; // Return the value directly if it's not an array
  }

  return items.length > 0 ? items[0].value : null; // Return the first instance or null
}

// Helper function to check if URL is absolute
function isAbsoluteURL(url) {
  return /^(http|https):\/\//i.test(url);
}

// Function to add a canvas to the gallery
function addCanvasToGallery(canvas, manifest) {
  const imageService = canvas.images[0].resource.service;

  if (!imageService || !imageService['@id']) {
    console.error('Image service is missing or does not contain an @id field:', canvas);
    return;
  }

  const imageUrl = `${imageService['@id']}/full/!200,200/0/default.jpg`;
  const highResUrl = `${imageService['@id']}/info.json`;

  // Retrieve metadata from both the manifest and the canvas
  const manifestMetadata = manifest.metadata || [];    
  const canvasMetadata = canvas.metadata || [];

  console.log('Manifest Metadata:', manifestMetadata);
  console.log('Canvas Metadata:', canvasMetadata);

  // Extract metadata values
  const title = manifest.label || canvas.label || 'No title';
  const author = getMetadataValue(manifestMetadata, 'Author') || getMetadataValue(canvasMetadata, 'Author') || 'Unknown';
  const date = getMetadataValue(manifestMetadata, 'Date') || getMetadataValue(canvasMetadata, 'Date') || 'Unknown';
  const collection = getMetadataValue(manifestMetadata, 'Collection') || getMetadataValue(canvasMetadata, 'Collection') || 'Unknown';
  const attribution = manifest.attribution || 'No attribution';
  
  // Get location link from various possible sources
  let locationLink = null;

  // Check for a valid URL in the related field (David Rumsey / LUNA)
  if (manifest.related) {
    // If related is an object and has an @id
    if (typeof manifest.related === 'object' && manifest.related["@id"]) {
      locationLink = manifest.related["@id"];
    } 
    // If it's a string, use that directly
    else if (typeof manifest.related === 'string') {
      locationLink = manifest.related;
    }
  }

  // If locationLink is still not defined, check other sources
  if (!locationLink) {
    locationLink = getMetadataValue(canvasMetadata, 'Identifier') || 
                   getMetadataValue(manifestMetadata, 'Identifier', true) || // Get last occurrence
                   getMetadataValue(canvasMetadata, 'Item Url') || // LOC label
                   getMetadataValue(manifestMetadata, 'Item Url') || // covering canvas and manifest metadata sources
                   canvas['@id'] || 
                   'No link available';
  }

  // Debugging logs for verification
  console.log('Location Link:', locationLink);

  // Ensure the link is absolute
  if (!isAbsoluteURL(locationLink) && locationLink !== 'No link available') {
    locationLink = 'https://' + locationLink; // Make it an absolute URL
  }

  // Create card element
  const card = document.createElement('div');
  card.className = 'card';
  
  // Make card draggable
  makeCardDraggable(card);

  // Create image element
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = title;

  // Click to view in OpenSeadragon
  img.addEventListener('click', () => {
    viewer.open(highResUrl);
  });

  // Create delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', () => {
    const shouldRemove = confirm('Do you want to remove this image from the gallery?');
    if (shouldRemove) {
      card.remove();
    }
  });

  // Create metadata elements
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

  // Create link to item
  const locationLinkEl = document.createElement('a');
  locationLinkEl.href = locationLink;
  locationLinkEl.textContent = 'View Item';
  locationLinkEl.target = '_blank';

  const locationParagraph = document.createElement('p');
  locationParagraph.appendChild(locationLinkEl);

  // Create link to IIIF manifest
  const manifestLinkEl = document.createElement('a');
  manifestLinkEl.href = manifest['@id'] || '#';
  manifestLinkEl.textContent = 'View IIIF Manifest';
  manifestLinkEl.target = '_blank';
  manifestLinkEl.className = 'manifest-link';

  const manifestParagraph = document.createElement('p');
  manifestParagraph.appendChild(manifestLinkEl);

  // Append all elements to card
  card.appendChild(deleteBtn);
  card.appendChild(img);
  card.appendChild(titleEl);
  card.appendChild(authorEl);
  card.appendChild(dateEl);
  card.appendChild(collectionEl);
  card.appendChild(attributionEl);
  card.appendChild(locationParagraph);
  card.appendChild(manifestParagraph);  // Add manifest link

  // Add card to gallery
  document.getElementById('gallery').appendChild(card);
}

// Clear current gallery and add images from loaded collection
function repopulateGallery(manifestData) {
  const gallery = document.getElementById('gallery');
  
  if (!gallery) {
    console.error('Gallery element not found!');
    return;
  }
  
  gallery.innerHTML = ''; // Clear the current gallery

  // Check if items array exists
  const manifests = manifestData.items; // Update based on IIIF spec

  if (!Array.isArray(manifests)) {
    console.error('No valid items found in the manifest data.');
    return;
  }

  // Clear the collectedManifests array and repopulate it
  collectedManifests = [];

  manifests.forEach(manifest => {
    // Store the manifest
    collectedManifests.push(manifest);
    
    // Access the sequences within each manifest
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

// Function to add a IIIF manifest to the gallery
async function addManifestToGallery(manifestUrl) {
  try {
    const response = await fetch(manifestUrl);

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const manifest = await response.json();

    if (!manifest.sequences || !manifest.sequences[0].canvases) {
      throw new Error('Manifest does not contain sequences or canvases in the expected format.');
    }

    // Store the manifest for later export
    collectedManifests.push(manifest);

    const canvasItems = manifest.sequences[0].canvases;

    canvasItems.forEach(canvas => {
      addCanvasToGallery(canvas, manifest);
    });

  } catch (error) {
    console.error('Error fetching IIIF Manifest:', error);
    alert(`There was an error fetching the IIIF Manifest: ${error.message}`);
  }
}

// Function to export combined manifest
function exportCombinedManifest() {
  const manifestName = document.getElementById('manifestName').value.trim();
  
  if (!manifestName) {
    alert('Please enter a name for the manifest.');
    return;
  }

  if (collectedManifests.length === 0) {
    alert('No manifests to export. Please add some manifests first.');
    return;
  }

  // Create a combined manifest structure
  const combinedManifest = {
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    '@type': 'sc:Collection',
    '@id': `https://example.org/collection/${manifestName}`,
    'label': manifestName,
    'items': collectedManifests
  };

  // Convert to JSON string
  const manifestJson = JSON.stringify(combinedManifest, null, 2);

  // Create a blob and download
  const blob = new Blob([manifestJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${manifestName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`Manifest "${manifestName}" has been exported successfully!`);
}

// Initialize all event listeners
function initializeEventListeners() {
  // Show selected filename when file is chosen
  document.getElementById('uploadManifest').addEventListener('change', function(e) {
    console.log('Change event fired!');
    const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    document.getElementById('fileName').textContent = fileName;
  });

  // Event listener to add manifest URLs to the gallery
  document.getElementById('addManifest').addEventListener('click', async () => {
    const manifestUrls = document.getElementById('manifestUrl').value.split(',').map(url => url.trim());
    if (!manifestUrls.length) {
      alert('Please enter one or more IIIF Manifest URLs');
      return;
    }

    for (const manifestUrl of manifestUrls) {
      if (manifestUrl) {
        await addManifestToGallery(manifestUrl);
      }
    }
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

  // Event listener for the export button
  document.getElementById('export-manifest').addEventListener('click', exportCombinedManifest);

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

}