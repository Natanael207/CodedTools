// =================================================================================
// SECTION: UTILITIES
// =================================================================================

/**
 * A minimal Perlin Noise implementation (adapted from various sources).
 * Public domain, for demonstration purposes.
 */
function createPerlinNoiseGenerator() {
    const perm = new Array(512);
    const p = new Array(256);
    for (let i = 0; i < 256; i++) {
        p[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
    }

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
        let h = hash & 15;
        let u = h < 8 ? x : y;
        let v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    function perlinNoise(x, y) {
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        let u = fade(x);
        let v = fade(y);
        let A = perm[X] + Y;
        let AA = perm[A];
        let AB = perm[A + 1];
        let B = perm[X + 1] + Y;
        let BA = perm[B];
        let BB = perm[B + 1];
        let res = lerp(v,
            lerp(u, grad(perm[AA], x, y, 0), grad(perm[BA], x - 1, y, 0)),
            lerp(u, grad(perm[AB], x, y - 1, 0), grad(perm[BB], x - 1, y - 1, 0))
        );
        return (res + 1) / 2; // Normalize to [0, 1]
    }
    
    function seed(s) {
        for (let i = 0; i < 256; i++) { p[i] = Math.floor(Math.random() * 256); }
        if (s !== undefined) {
            let currentSeed = Math.floor(s * 256);
            for (let i = 0; i < 256; i++) {
                let r = (i + currentSeed) % 256;
                let temp = p[i]; p[i] = p[r]; p[r] = temp;
            }
        }
        for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; }
    }

    return { perlinNoise, seed };
}

/**
 * Debounce function to limit the rate at which a function gets called.
 * @param {Function} func The function to debounce.
 * @param {number} delay The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, delay = 250) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}


// =================================================================================
// SECTION: MAIN APPLICATION
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------------------------------------------
    // SUB-SECTION: Global State and Constants
    // -----------------------------------------------------------------------------
    const noiseGenerator = createPerlinNoiseGenerator();

    // DOM Elements
    const canvas = document.getElementById('tile-canvas');
    const ctx = canvas.getContext('2d');
    const symmetrySelect = document.getElementById('symmetry');
    const algorithmSelect = document.getElementById('algorithm');
    const paletteContainer = document.getElementById('color-palette-container');
    const addColorBtn = document.getElementById('add-color-btn');
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');
    const tileWidthInput = document.getElementById('tile-width');
    const tileHeightInput = document.getElementById('tile-height');
    const voronoiBordersToggle = document.getElementById('voronoi-borders-toggle');
    const voronoiOptionsGroup = document.getElementById('voronoi-options-group');
    const voronoiCellCountInput = document.getElementById('voronoi-cell-count');
    const clusterOptionsGroup = document.getElementById('cluster-options-group');
    const clusterNoiseZoomInput = document.getElementById('cluster-noise-zoom');
    const clusterNoiseZoomValueSpan = document.getElementById('cluster-noise-zoom-value');
    const waterOptionsGroup = document.getElementById('water-options-group');
    const waterNoiseZoomInput = document.getElementById('water-noise-zoom');
    const waterNoiseZoomValueSpan = document.getElementById('water-noise-zoom-value');
    const waterWaveFrequencyInput = document.getElementById('water-wave-frequency');
    const waterWaveFrequencyValueSpan = document.getElementById('water-wave-frequency-value');
    const waterWaveAmplitudeInput = document.getElementById('water-wave-amplitude');
    const waterWaveAmplitudeValueSpan = document.getElementById('water-wave-amplitude-value');
    const imageOptionsGroup = document.getElementById('image-options-group');
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const imageContrastInput = document.getElementById('image-contrast');
    const imageContrastValueSpan = document.getElementById('image-contrast-value');
    const postProcessingToggle = document.getElementById('post-processing-toggle');
    const postProcessingOptions = document.getElementById('post-processing-options');
    const seamlessTilingToggle = document.getElementById('seamless-tiling-toggle');
    const transitionToImageToggle = document.getElementById('transition-to-image-toggle');
    const transitionImageControls = document.getElementById('transition-image-controls');
    const transitionImageUpload = document.getElementById('transition-image-upload');
    const transitionImagePreview = document.getElementById('transition-image-preview');
    const transitionStrengthInput = document.getElementById('transition-strength');
    const transitionStrengthValueSpan = document.getElementById('transition-strength-value');

    // State variables
    let grid = [];
    let imageNoiseData = null;
    let transitionImageData = null;

    // Debounced version of the main generation function for performance
    const debouncedGenerateAndRender = debounce(generateAndRender, 250);

    // -----------------------------------------------------------------------------
    // SUB-SECTION: UI and Color Management
    // -----------------------------------------------------------------------------

    /** Creates a new color entry element for the palette UI. */
    function createColorEntry(color = '#ff0000', weight = 50) {
        const entry = document.createElement('div');
        entry.classList.add('color-entry');
        entry.innerHTML = `
            <input type="color" value="${color}">
            <input type="range" class="frequency-slider" min="1" max="100" value="${weight}">
            <span class="frequency-value">${weight}</span>
            <button class="remove-color-btn">X</button>
        `;
        // Add listeners that trigger re-rendering (debounced)
        entry.querySelector('input[type="color"]').addEventListener('input', debouncedGenerateAndRender);
        const freqSlider = entry.querySelector('.frequency-slider');
        freqSlider.addEventListener('input', (e) => {
            entry.querySelector('.frequency-value').textContent = e.target.value;
            debouncedGenerateAndRender();
        });
        return entry;
    }

    /** Adds a new random color to the palette. */
    function addColor() {
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        const newEntry = createColorEntry(randomColor, 50);
        paletteContainer.appendChild(newEntry);
        generateAndRender(); // Immediate update when adding a new color
    }
    
    /** Toggles the visibility of algorithm-specific option panels. */
    function updateAlgorithmOptionsUI() {
        voronoiOptionsGroup.hidden = true;
        clusterOptionsGroup.hidden = true;
        waterOptionsGroup.hidden = true;
        imageOptionsGroup.hidden = true;

        switch (algorithmSelect.value) {
            case 'voronoi': voronoiOptionsGroup.hidden = false; break;
            case 'cluster': clusterOptionsGroup.hidden = false; break;
            case 'water': waterOptionsGroup.hidden = false; break;
            case 'image': imageOptionsGroup.hidden = false; break;
        }
    }

    // -----------------------------------------------------------------------------
    // SUB-SECTION: Generation Algorithms
    // -----------------------------------------------------------------------------

    /** Picks a color from the palette based on weighted randomness. */
    function getWeightedRandomColor(colors) {
        const totalWeight = colors.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight <= 0) return '#000000';
        let random = Math.random() * totalWeight;
        for (const color of colors) {
            random -= color.weight;
            if (random < 0) return color.color;
        }
        return colors[colors.length - 1]?.color || '#000000';
    }

    /** Generates a tile using a "scatter" method. */
    function generateScatter(xEnd, yEnd, weightedColors) {
        for (let y = 0; y < yEnd; y++) {
            for (let x = 0; x < xEnd; x++) {
                grid[y][x] = getWeightedRandomColor(weightedColors);
            }
        }
    }
    
    /** Generates a tile using Perlin noise clusters. (Noise-to-color mapping) */
    function generateCluster(xEnd, yEnd, weightedColors, noiseZoom) {
        noiseGenerator.seed(Math.random());
        const noiseValues = [];
        for (let y = 0; y < yEnd; y++) {
            for (let x = 0; x < xEnd; x++) {
                noiseValues.push({ x, y, noise: noiseGenerator.perlinNoise(x / noiseZoom, y / noiseZoom) });
            }
        }
        noiseValues.sort((a, b) => a.noise - b.noise);
        
        const totalPixels = xEnd * yEnd;
        const totalWeight = weightedColors.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight <= 0) return;

        const colorPixelCounts = weightedColors.map(c => ({
            color: c.color,
            count: Math.round((c.weight / totalWeight) * totalPixels)
        }));
        
        // Ensure total pixel count is exact
        let currentTotal = colorPixelCounts.reduce((sum, c) => sum + c.count, 0);
        let diff = totalPixels - currentTotal;
        for (let i = 0; diff !== 0; i = (i + 1) % colorPixelCounts.length) {
            const adjustment = Math.sign(diff);
            if (colorPixelCounts[i].count + adjustment >= 0) {
               colorPixelCounts[i].count += adjustment;
               diff -= adjustment;
            }
        }

        let pixelIndex = 0;
        for (const { color, count } of colorPixelCounts) {
            for (let i = 0; i < count; i++) {
                if (pixelIndex >= noiseValues.length) break;
                const pixel = noiseValues[pixelIndex];
                grid[pixel.y][pixel.x] = color;
                pixelIndex++;
            }
        }
    }

    /** Generates a tile with a Voronoi ("cobblestone") pattern. */
    function generateVoronoi(xEnd, yEnd, weightedColors) {
        const numSeedPoints = parseInt(voronoiCellCountInput.value, 10);
        const seedPoints = Array.from({ length: numSeedPoints }, (_, i) => ({
            x: Math.random() * xEnd,
            y: Math.random() * yEnd,
            color: getWeightedRandomColor(weightedColors),
            id: i
        }));

        const closestSeedIdGrid = Array.from({ length: yEnd }, () => Array(xEnd).fill(null));
        for (let y = 0; y < yEnd; y++) {
            for (let x = 0; x < xEnd; x++) {
                let minDistSq = Infinity;
                let closestSeed = null;
                for (const seed of seedPoints) {
                    const distSq = (x - seed.x)**2 + (y - seed.y)**2;
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        closestSeed = seed;
                    }
                }
                if (closestSeed) {
                    grid[y][x] = closestSeed.color;
                    closestSeedIdGrid[y][x] = closestSeed.id;
                }
            }
        }

        if (voronoiBordersToggle.checked) {
            const groutColor = '#333333'; // Simple default for now
            for (let y = 0; y < yEnd; y++) {
                for (let x = 0; x < xEnd; x++) {
                    const currentId = closestSeedIdGrid[y][x];
                    if ((x + 1 < xEnd && closestSeedIdGrid[y][x + 1] !== currentId) ||
                        (y + 1 < yEnd && closestSeedIdGrid[y + 1][x] !== currentId)) {
                        grid[y][x] = groutColor;
                    }
                }
            }
        }
    }

    /** Generates a water-like texture with waves. */
    function generateWater(xEnd, yEnd, weightedColors, noiseZoom, waveFrequency, waveAmplitude) {
        noiseGenerator.seed(Math.random());
        const noiseValues = [];
        for (let y = 0; y < yEnd; y++) {
            for (let x = 0; x < xEnd; x++) {
                const yDistorted = y + Math.sin(x * waveFrequency) * waveAmplitude;
                const noiseValue = noiseGenerator.perlinNoise(x / noiseZoom, yDistorted / noiseZoom);
                noiseValues.push({ x, y, noise: noiseValue });
            }
        }
        
        // The rest of this function is identical to generateCluster's color mapping logic
        noiseValues.sort((a, b) => a.noise - b.noise);
        const totalPixels = xEnd * yEnd;
        const totalWeight = weightedColors.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight <= 0) return;
        const colorPixelCounts = weightedColors.map(c => ({
            color: c.color,
            count: Math.round((c.weight / totalWeight) * totalPixels)
        }));
        let currentTotal = colorPixelCounts.reduce((sum, c) => sum + c.count, 0);
        let diff = totalPixels - currentTotal;
        for (let i = 0; diff !== 0; i = (i + 1) % colorPixelCounts.length) {
            const adjustment = Math.sign(diff);
            if (colorPixelCounts[i].count + adjustment >= 0) {
               colorPixelCounts[i].count += adjustment;
               diff -= adjustment;
            }
        }
        let pixelIndex = 0;
        for (const { color, count } of colorPixelCounts) {
            for (let i = 0; i < count; i++) {
                if (pixelIndex >= noiseValues.length) break;
                const pixel = noiseValues[pixelIndex];
                grid[pixel.y][pixel.x] = color;
                pixelIndex++;
            }
        }
    }

    /** Generates a tile by mapping colors to the brightness of an image. */
    function generateImageNoise(xEnd, yEnd, weightedColors, imageContrast) {
        if (!imageNoiseData || imageNoiseData.length !== xEnd * yEnd) {
            generateScatter(xEnd, yEnd, weightedColors); // Fallback
            return;
        }
        
        const sortedWeightedColors = [...weightedColors].sort((a, b) => {
            const getLuminance = (hex) => {
                const r = parseInt(hex.substring(1, 3), 16);
                const g = parseInt(hex.substring(3, 5), 16);
                const b = parseInt(hex.substring(5, 7), 16);
                return (0.2126 * r + 0.7152 * g + 0.0722 * b);
            };
            return getLuminance(a.color) - getLuminance(b.color);
        });

        for (let y = 0; y < yEnd; y++) {
            for (let x = 0; x < xEnd; x++) {
                let luminance = imageNoiseData[y * xEnd + x];
                if (imageContrast !== 0) {
                    const factor = (259 * (imageContrast + 255)) / (255 * (259 - imageContrast));
                    luminance = factor * (luminance * 255 - 128) + 128;
                    luminance = Math.max(0, Math.min(255, luminance)) / 255;
                }
                
                let assignedColor = '#000000';
                if (sortedWeightedColors.length > 0) {
                    const segmentSize = 1 / sortedWeightedColors.length;
                    const colorIndex = Math.min(Math.floor(luminance / segmentSize), sortedWeightedColors.length - 1);
                    assignedColor = sortedWeightedColors[colorIndex].color;
                }
                grid[y][x] = assignedColor;
            }
        }
    }

    // -----------------------------------------------------------------------------
    // SUB-SECTION: Core Logic, Rendering, and Export
    // -----------------------------------------------------------------------------
    
    /** Main function to generate the grid data based on current settings. */
    function generateGrid() {
        const tileWidth = parseInt(tileWidthInput.value, 10);
        const tileHeight = parseInt(tileHeightInput.value, 10);
        grid = Array.from({ length: tileHeight }, () => Array(tileWidth).fill(null));

        const symmetry = symmetrySelect.value;
        const algorithm = algorithmSelect.value;
        const weightedColors = Array.from(paletteContainer.querySelectorAll('.color-entry'))
            .map(entry => ({
                color: entry.querySelector('input[type="color"]').value,
                weight: parseInt(entry.querySelector('.frequency-slider').value, 10)
            }));
        
        const xEnd = (symmetry === 'vertical' || symmetry === 'quadrant') ? Math.ceil(tileWidth / 2) : tileWidth;
        const yEnd = (symmetry === 'horizontal' || symmetry === 'quadrant') ? Math.ceil(tileHeight / 2) : tileHeight;

        switch(algorithm) {
            case 'cluster':
                generateCluster(xEnd, yEnd, weightedColors, parseInt(clusterNoiseZoomInput.value, 10));
                break;
            case 'voronoi':
                generateVoronoi(xEnd, yEnd, weightedColors);
                break;
            case 'water':
                generateWater(xEnd, yEnd, weightedColors,
                    parseInt(waterNoiseZoomInput.value, 10),
                    parseInt(waterWaveFrequencyInput.value, 10) / 100,
                    parseInt(waterWaveAmplitudeInput.value, 10) / 100
                );
                break;
            case 'image':
                generateImageNoise(xEnd, yEnd, weightedColors, parseInt(imageContrastInput.value, 10));
                break;
            default: // 'scatter'
                generateScatter(xEnd, yEnd, weightedColors);
                break;
        }
        
        applySymmetry(symmetry, tileWidth, tileHeight);

        if (postProcessingToggle.checked) {
            if (seamlessTilingToggle.checked) {
                grid = applySeamlessTiling(grid, tileWidth, tileHeight);
            }
            if (transitionToImageToggle.checked && transitionImageData) {
                grid = applyImageTransition(grid, transitionImageData, tileWidth, tileHeight, 
                    parseInt(transitionStrengthInput.value, 10), 
                    noiseGenerator.perlinNoise
                );
            }
        }
    }

    /** Applies symmetry rules to the generated grid. */
    function applySymmetry(symmetry, tileWidth, tileHeight) {
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                const sourceColor = grid[y][x];
                if (sourceColor) {
                    const hMirror = tileWidth - 1 - x;
                    const vMirror = tileHeight - 1 - y;
                    if (symmetry === 'vertical') grid[y][hMirror] = sourceColor;
                    if (symmetry === 'horizontal') grid[vMirror][x] = sourceColor;
                    if (symmetry === 'quadrant') {
                        grid[y][hMirror] = sourceColor;
                        grid[vMirror][x] = sourceColor;
                        grid[vMirror][hMirror] = sourceColor;
                    }
                }
            }
        }
    }
    
    /** Renders the final grid to the canvas. */
    function renderTile() {
        const tileWidth = parseInt(tileWidthInput.value, 10);
        const tileHeight = parseInt(tileHeightInput.value, 10);
        const displayScale = 10;
        canvas.width = tileWidth * displayScale;
        canvas.height = tileHeight * displayScale;
        
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                if (grid[y][x]) {
                    ctx.fillStyle = grid[y][x];
                    ctx.fillRect(x * displayScale, y * displayScale, displayScale, displayScale);
                }
            }
        }
    }

    /** Orchestrator function: generates grid data and then renders it. */
    function generateAndRender() {
        generateGrid();
        renderTile();
    }
    
    /** Exports the current canvas content as a PNG file. */
    function exportAsPNG() {
        const tileWidth = parseInt(tileWidthInput.value, 10);
        const tileHeight = parseInt(tileHeightInput.value, 10);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tileWidth;
        tempCanvas.height = tileHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                if (grid[y] && grid[y][x]) {
                    tempCtx.fillStyle = grid[y][x];
                    tempCtx.fillRect(x, y, 1, 1);
                }
            }
        }

        const link = document.createElement('a');
        link.download = `tile-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }
    
    /** Loads an image file and stores its pixel data for use in transitions. */
    function loadImageAsTransitionData(file) {
        if (!file) {
            transitionImageData = null;
            transitionImagePreview.src = '#';
            transitionImagePreview.style.display = 'none';
            generateAndRender();
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            transitionImagePreview.src = e.target.result;
            transitionImagePreview.style.display = 'block';
            const img = new Image();
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = parseInt(tileWidthInput.value, 10);
                tempCanvas.height = parseInt(tileHeightInput.value, 10);
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
                transitionImageData = [];
                for (let i = 0; i < imageData.length; i += 4) {
                    transitionImageData.push({ r: imageData[i], g: imageData[i+1], b: imageData[i+2] });
                }
                generateAndRender();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    /** Loads an image file and stores its luminance data for the image noise algorithm. */
    function loadImageAsNoiseData(file) {
        if (!file) {
            imageNoiseData = null;
            imagePreview.src = '#';
            imagePreview.style.display = 'none';
            generateAndRender();
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            const img = new Image();
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = parseInt(tileWidthInput.value, 10);
                tempCanvas.height = parseInt(tileHeightInput.value, 10);
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
                imageNoiseData = [];
                for (let i = 0; i < imageData.length; i += 4) {
                    imageNoiseData.push((0.2126*imageData[i] + 0.7152*imageData[i+1] + 0.0722*imageData[i+2]) / 255);
                }
                generateAndRender();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // -----------------------------------------------------------------------------
    // SUB-SECTION: Event Listeners Setup
    // -----------------------------------------------------------------------------
    
    function setupEventListeners() {
        // --- Buttons ---
        generateBtn.addEventListener('click', generateAndRender);
        exportBtn.addEventListener('click', exportAsPNG);
        addColorBtn.addEventListener('click', addColor);
        
        // --- Palette Management ---
        paletteContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-color-btn')) {
                e.target.closest('.color-entry').remove();
                generateAndRender();
            }
        });
        
        // --- Main Controls (Immediate) ---
        algorithmSelect.addEventListener('change', () => {
            updateAlgorithmOptionsUI();
            generateAndRender();
        });
        postProcessingToggle.addEventListener('change', () => {
            postProcessingOptions.hidden = !postProcessingToggle.checked;
            generateAndRender();
        });
        transitionToImageToggle.addEventListener('change', () => {
            transitionImageControls.hidden = !transitionToImageToggle.checked;
            generateAndRender();
        });
        
        // --- File Uploads ---
        imageUploadInput.addEventListener('change', (e) => loadImageAsNoiseData(e.target.files[0]));
        transitionImageUpload.addEventListener('change', (e) => loadImageAsTransitionData(e.target.files[0]));
        
        // --- Sliders and continuous inputs (Debounced for performance) ---
        const setupDebouncedSlider = (slider, valueSpan, formatter) => {
            slider.addEventListener('input', () => {
                if (valueSpan) {
                    valueSpan.textContent = formatter ? formatter(slider.value) : slider.value;
                }
                debouncedGenerateAndRender();
            });
        };

        setupDebouncedSlider(clusterNoiseZoomInput, clusterNoiseZoomValueSpan);
        setupDebouncedSlider(waterNoiseZoomInput, waterNoiseZoomValueSpan);
        setupDebouncedSlider(waterWaveFrequencyInput, waterWaveFrequencyValueSpan);
        setupDebouncedSlider(waterWaveAmplitudeInput, waterWaveAmplitudeValueSpan);
        setupDebouncedSlider(imageContrastInput, imageContrastValueSpan, v => `${v}%`);
        setupDebouncedSlider(transitionStrengthInput, transitionStrengthValueSpan, v => `${v}%`);
        
        // --- Other inputs that should re-render ---
        tileWidthInput.addEventListener('change', generateAndRender);
        tileHeightInput.addEventListener('change', generateAndRender);
        voronoiCellCountInput.addEventListener('change', generateAndRender);
        voronoiBordersToggle.addEventListener('change', generateAndRender);
        symmetrySelect.addEventListener('change', generateAndRender);
    }

    // -----------------------------------------------------------------------------
    // SUB-SECTION: Initialization
    // -----------------------------------------------------------------------------
    
    /** Sets up the initial state of the application. */
    function initialize() {
        const initialColors = [
            { color: "#1a1c2c", weight: 20 },
            { color: "#5d275d", weight: 50 },
            { color: "#b13e53", weight: 30 },
            { color: "#ef7d57", weight: 15 }
        ];
        initialColors.forEach(({ color, weight }) => {
             paletteContainer.appendChild(createColorEntry(color, weight));
        });
        
        // Set initial UI visibility
        postProcessingOptions.hidden = !postProcessingToggle.checked;
        transitionImageControls.hidden = !transitionToImageToggle.checked;
        updateAlgorithmOptionsUI();
        
        // Setup all event listeners
        setupEventListeners();
        
        // Generate the first tile
        generateAndRender();
    }

    // --- Start the application ---
    initialize();
});
