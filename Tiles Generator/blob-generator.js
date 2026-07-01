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

    // -----------------------------------------------------------------------------
    // SECTION: State Variables
    // -----------------------------------------------------------------------------
    let centerImage = new Image();
    let edgeImage = new Image();
    let centerImageLoaded = false;
    let edgeImageLoaded = false;
    let generatedBlobCanvas = null; // In-memory canvas for the full-res blob

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
             if (targetImage === centerImage) centerImageLoaded = true;
             if (targetImage === edgeImage) edgeImageLoaded = true;
             console.log(`${targetImage === centerImage ? 'Center' : 'Edge'} image loaded.`);
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
        if (!centerImageLoaded || !edgeImageLoaded) {
            alert("Bitte lade sowohl ein 'Center Tile (Y)' als auch ein 'Edge Tile (X)' hoch."); // Updated alert message
            return;
        }

        const tileSize = centerImage.width;
        if (tileSize <= 0 || tileSize !== edgeImage.width || centerImage.height !== edgeImage.height) {
            alert("Die Bilder müssen die gleiche Grösse haben und quadratisch sein.");
            return;
        }

        const blobCanvas = document.createElement('canvas');
        blobCanvas.width = tileSize * 4;
        blobCanvas.height = tileSize * 4;
        const ctx = blobCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // --- Define Slices (Quadrants) ---
        const half = tileSize / 2;
        const quadrants = {
            topLeft:     [0, 0, half, half],
            topRight:    [half, 0, half, half],
            bottomLeft:  [0, half, half, half],
            bottomRight: [half, half, half, half],
        };
        
        // --- Tile Pattern Generation ---
        // As per the user's request, generate all 16 (2^4) combinations of two colors (C/Y, E/X)
        // across 4 quadrants. The tile index 'i' (0-15) serves as a bitmask.
        // Bit order: 1(TL), 2(TR), 3(BL), 4(BR)
        const tilePatterns = [];
        for (let i = 0; i < 16; i++) {
            // Let's define the bit order as TopLeft, TopRight, BottomLeft, BottomRight
            // So bit 3 -> TL, bit 2 -> TR, bit 1 -> BL, bit 0 -> BR
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

            // Draw the 4 quadrants for this tile
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

});
