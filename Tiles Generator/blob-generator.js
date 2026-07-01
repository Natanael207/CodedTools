document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------------------------------------------
    // SECTION: DOM Element References
    // -----------------------------------------------------------------------------
    const centerUploadInput = document.getElementById('blob-center-upload');
    // Removed centerPreviewImg reference
    const edgeUploadInput = document.getElementById('blob-edge-upload');
    // Removed edgePreviewImg reference
    const previewCanvas = document.getElementById('blob-canvas');
    const previewCtx = previewCanvas.getContext('2d');
    const generateBtn = document.getElementById('blob-generate-btn');
    const exportBtn = document.getElementById('blob-export-btn');

    const blobTransitionToggle = document.getElementById('blob-transition-toggle');
    const blobTransitionControls = document.getElementById('blob-transition-controls');
    const blobTransitionStrengthInput = document.getElementById('blob-transition-strength');
    const blobTransitionStrengthValueSpan = document.getElementById('blob-transition-strength-value');

    const noiseGenerator = createPerlinNoiseGenerator();

    // -----------------------------------------------------------------------------
    // SECTION: State Variables
    // -----------------------------------------------------------------------------
    let centerImage = new Image();
    let edgeImage = new Image();
    let centerImageLoaded = false;
    let edgeImageLoaded = false;
    let generatedBlobCanvas = null; // In-memory canvas for the full-res blob

    let centerImagePixelData = null; // Stores pixel data as hex colors
    let edgeImagePixelData = null;   // Stores pixel data as hex colors
    let blobTileSize = 0; // Stores the size of the source tiles

    // -----------------------------------------------------------------------------
    // SECTION: Image Loading and Handling
    // -----------------------------------------------------------------------------

    /**
     * Handles loading a file from an input into an Image object.
     * The preview element has been removed per user request.
     */
    function handleImageUpload(event, targetImage) { // Removed previewElement parameter
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            targetImage.src = e.target.result;
            // Removed lines for previewElement.src and .style.display
        };
        
        targetImage.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // Assuming square tiles and matching sizes for center and edge
            const size = targetImage.width; 
            tempCanvas.width = size;
            tempCanvas.height = size;
            tempCtx.drawImage(targetImage, 0, 0, size, size);
            
            const imageData = tempCtx.getImageData(0, 0, size, size).data;
            const pixelData = [];
            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i].toString(16).padStart(2, '0');
                const g = imageData[i+1].toString(16).padStart(2, '0');
                const b = imageData[i+2].toString(16).padStart(2, '0');
                pixelData.push(`#${r}${g}${b}`);
            }

             if (targetImage === centerImage) {
                centerImageLoaded = true;
                centerImagePixelData = pixelData;
             } else if (targetImage === edgeImage) {
                edgeImageLoaded = true;
                edgeImagePixelData = pixelData;
             }
             blobTileSize = size; // Set the tile size from the first image loaded
             console.log(`${targetImage === centerImage ? 'Center' : 'Edge'} image loaded. Size: ${size}`);
             generateBlobTileset(); // Re-generate after loading new image
        };
        
        reader.readAsDataURL(file);
    }


    // -----------------------------------------------------------------------------
    // SECTION: Core Blob Generation Logic
    // -----------------------------------------------------------------------------

    /**
     * Generates a 4x4 (16-tile) blob tileset based on a 2x2 quadrant slicing method.
     * This version generates all 16 permutations of the two source tiles across the 4 quadrants.
     */
    function generateBlobTileset() {
        if (!centerImageLoaded || !edgeImageLoaded || !centerImagePixelData || !edgeImagePixelData) {
            alert("Bitte lade sowohl ein 'Center Tile (Y)' als auch ein 'Edge Tile (X)' hoch."); // Updated alert message
            return;
        }

        const tileSize = blobTileSize; // Use the globally determined blobTileSize
        if (tileSize <= 0) {
            alert("Die Bilder müssen die gleiche Grösse haben und quadratisch sein.");
            return;
        }

        const blobCanvas = document.createElement('canvas');
        blobCanvas.width = tileSize * 4;
        blobCanvas.height = tileSize * 4;
        const ctx = blobCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Initialize Perlin noise for varied transitions
        noiseGenerator.seed(Math.random());

        // --- Define Slices (Quadrants) ---
        const half = tileSize / 2;
        const quadrants = {
            topLeft:     [0, 0, half, half],
            topRight:    [half, 0, half, half],
            bottomLeft:  [0, half, half, half],
            bottomRight: [half, half, half, half],
        };
        
        // --- Tile Pattern Generation ---
        const tilePatterns = [];
        for (let i = 0; i < 16; i++) {
            const useCenterFor = {
                tl: (i & 8) >> 3, // YXXX
                tr: (i & 4) >> 2, // XYXX
                bl: (i & 2) >> 1, // XXYX
                br: (i & 1),      // XXXY
            };

            const pattern = [
                useCenterFor.tl ? 'C' : 'E', // Top-Left quadrant
                useCenterFor.tr ? 'C' : 'E', // Top-Right quadrant
                useCenterFor.bl ? 'C' : 'E', // Bottom-Left quadrant
                useCenterFor.br ? 'C' : 'E', // Bottom-Right quadrant
            ];
            tilePatterns.push(pattern);
        }

        // --- Mapping tile index to its position in the final 4x4 image ---
        const tileMapping = [];
        for (let i = 0; i < 16; i++) {
            tileMapping.push({
                tileIndex: i,
                x: i % 4,
                y: Math.floor(i / 4)
            });
        }

        const quadrantPositions = [
            quadrants.topLeft, quadrants.topRight,
            quadrants.bottomLeft, quadrants.bottomRight,
        ];
        
        // --- Main Drawing Loop ---
        for (const mapping of tileMapping) {
            const pattern = tilePatterns[mapping.tileIndex];
            const destX = mapping.x * tileSize;
            const destY = mapping.y * tileSize;

            if (blobTransitionToggle.checked) {
                const currentBlobTileStrength = parseInt(blobTransitionStrengthInput.value, 10);
                const maxDisplacement = (currentBlobTileStrength / 100) * (tileSize / 5);
                const blendWidth = 1 + (currentBlobTileStrength / 100) * (tileSize / 4); // Use a slightly wider blend zone

                for (let y_local = 0; y_local < tileSize; y_local++) {
                    for (let x_local = 0; x_local < tileSize; x_local++) {
                        
                        // 1. Get the four potential source colors for this pixel location
                        const sourcePixelIndex = y_local * tileSize + x_local;
                        const colorFromC = centerImagePixelData[sourcePixelIndex];
                        const colorFromE = edgeImagePixelData[sourcePixelIndex];
                        
                        const c_tl = (pattern[0] === 'C') ? colorFromC : colorFromE;
                        const c_tr = (pattern[1] === 'C') ? colorFromC : colorFromE;
                        const c_bl = (pattern[2] === 'C') ? colorFromC : colorFromE;
                        const c_br = (pattern[3] === 'C') ? colorFromC : colorFromE;

                        // 2. Calculate noisy boundaries for X and Y
                        const noiseX = (noiseGenerator.perlinNoise(y_local / 10, (destY + y_local) / 10) - 0.5) * 2;
                        const boundaryX = half + noiseX * maxDisplacement;
                        
                        const noiseY = (noiseGenerator.perlinNoise(x_local / 10, (destX + x_local) / 10) - 0.5) * 2;
                        const boundaryY = half + noiseY * maxDisplacement;

                        // 3. Calculate blend ratios (u for horizontal, v for vertical)
                        let u = (x_local - boundaryX + blendWidth / 2) / blendWidth;
                        u = Math.max(0, Math.min(1, u));

                        let v = (y_local - boundaryY + blendWidth / 2) / blendWidth;
                        v = Math.max(0, Math.min(1, v));

                        // 4. Perform bilinear interpolation
                        const top_blend = blendHexColors(c_tl, c_tr, u);
                        const bottom_blend = blendHexColors(c_bl, c_br, u);
                        const finalPixelColor = blendHexColors(top_blend, bottom_blend, v);

                        ctx.fillStyle = finalPixelColor;
                        ctx.fillRect(destX + x_local, destY + y_local, 1, 1);
                    }
                }
            } else {
                // Original drawing logic (drawing quadrants directly)
                for (let i = 0; i < 4; i++) {
                    const quadrantSource = pattern[i]; // 'C' or 'E'
                    const sourceImage = (quadrantSource === 'C') ? centerImage : edgeImage;
                    const sliceData = quadrantPositions[i];
                    
                    const sx = sliceData[0];
                    const sy = sliceData[1];
                    const sw = sliceData[2];
                    const sh = sliceData[3];

                    const dx = destX + sx;
                    const dy = destY + sy;
                    const dw = sw;
                    const dh = sh;
                    
                    ctx.drawImage(sourceImage, sx, sy, sw, sh, dx, dy, dw, dh);
                }
            }
        }
        
        generatedBlobCanvas = blobCanvas;
        renderBlobPreview();
    }

    // -----------------------------------------------------------------------------
    // SECTION: Rendering and Export
    // -----------------------------------------------------------------------------

    function renderBlobPreview() {
        if (!generatedBlobCanvas) {
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            return;
        };
        previewCtx.imageSmoothingEnabled = false;
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.drawImage(generatedBlobCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    }
    
    function downloadBlob() {
        if (!generatedBlobCanvas) {
            alert("Bitte generiere zuerst das Blob-Tileset.");
            return;
        }
        const link = document.createElement('a');
        link.download = `blob-tileset-${Date.now()}.png`;
        link.href = generatedBlobCanvas.toDataURL('image/png');
        link.click();
    }

    // -----------------------------------------------------------------------------
    // SECTION: Event Listener Setup
    // -----------------------------------------------------------------------------
    
    centerUploadInput.addEventListener('change', (e) => handleImageUpload(e, centerImage));
    edgeUploadInput.addEventListener('change', (e) => handleImageUpload(e, edgeImage));
    generateBtn.addEventListener('click', generateBlobTileset);
    exportBtn.addEventListener('click', downloadBlob);

    blobTransitionToggle.addEventListener('change', () => {
        blobTransitionControls.hidden = !blobTransitionToggle.checked;
        generateBlobTileset();
    });

    blobTransitionStrengthInput.addEventListener('input', () => {
        blobTransitionStrengthValueSpan.textContent = `${blobTransitionStrengthInput.value}%`;
        generateBlobTileset();
    });

    // Initial state setup for blob transition controls
    blobTransitionControls.hidden = !blobTransitionToggle.checked;
});
