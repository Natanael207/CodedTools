// Minimal Perlin Noise implementation (adapted from various sources)
// Public domain, for demonstration purposes.
function createPerlinNoiseGenerator() {
    const perm = new Array(512);
    const p = new Array(256);
    for (let i = 0; i < 256; i++) {
        p[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
    }

    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function lerp(t, a, b) {
        return a + t * (b - a);
    }

    function grad(hash, x, y, z) {
        let h = hash & 15;
        let u = h < 8 ? x : y;
        let v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    // 2D Simplex/Perlin noise (simplified to Perlin for 2D)
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
            lerp(u, grad(perm[AA], x, y, 0),
                grad(perm[BA], x - 1, y, 0)),
            lerp(u, grad(perm[AB], x, y - 1, 0),
                grad(perm[BB], x - 1, y - 1, 0))
        );
        // Normalize output to [-1, 1] range, then to [0, 1]
        return (res + 1) / 2;
    }

    return {
        perlinNoise: perlinNoise,
        seed: function(s) { // Simplified seed, just re-initializes p array
            for (let i = 0; i < 256; i++) {
                p[i] = Math.floor(Math.random() * 256);
            }
            // Use provided seed to shuffle p array for deterministic noise (basic)
            if (s !== undefined) {
                let currentSeed = Math.floor(s * 256); // Simple mapping to an int
                for (let i = 0; i < 256; i++) {
                    let r = (i + currentSeed) % 256;
                    let temp = p[i];
                    p[i] = p[r];
                    p[r] = temp;
                }
            }
            for (let i = 0; i < 512; i++) {
                perm[i] = p[i & 255];
            }
        }
    };
}
const noiseGenerator = createPerlinNoiseGenerator();

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('tile-canvas');
    const ctx = canvas.getContext('2d');
    const symmetrySelect = document.getElementById('symmetry');
    const algorithmSelect = document.getElementById('algorithm');
    const paletteContainer = document.getElementById('color-palette-container');
    const addColorBtn = document.getElementById('add-color-btn');
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');

    const TILE_SIZE = 32;
    const PIXEL_SCALE = canvas.width / TILE_SIZE;
    let grid = [];

    // --- Color Management ---

    function createColorEntry(color = '#ff0000', weight = 50) {
        const entry = document.createElement('div');
        entry.classList.add('color-entry');
        entry.innerHTML = `
            <input type="color" value="${color}">
            <input type="range" class="frequency-slider" min="1" max="100" value="${weight}">
            <span class="frequency-value">${weight}</span>
            <button class="remove-color-btn">X</button>
        `;
        entry.querySelector('.frequency-slider').addEventListener('input', (e) => {
            entry.querySelector('.frequency-value').textContent = e.target.value;
        });
        return entry;
    }

    function addColor() {
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        const newEntry = createColorEntry(randomColor, 50);
        paletteContainer.appendChild(newEntry);
    }

    // --- Core Generation Logic ---

    function getWeightedRandomColor(colors) {
        const totalWeight = colors.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight <= 0) return '#000000';

        let random = Math.random() * totalWeight;

        for (const color of colors) {
            random -= color.weight;
            if (random < 0) {
                return color.color;
            }
        }
        return colors[colors.length - 1]?.color || '#000000';
    }

    function generateAndRender() {
        grid = Array.from({ length: TILE_SIZE }, () => Array(TILE_SIZE).fill(null));

        const symmetry = symmetrySelect.value;
        const algorithm = algorithmSelect.value;
        
        const weightedColors = Array.from(paletteContainer.querySelectorAll('.color-entry'))
            .map(entry => ({
                color: entry.querySelector('input[type="color"]').value,
                weight: parseInt(entry.querySelector('.frequency-slider').value, 10)
            }));
        
        const xEnd = (symmetry === 'vertical' || symmetry === 'quadrant') ? Math.ceil(TILE_SIZE / 2) : TILE_SIZE;
        const yEnd = (symmetry === 'horizontal' || symmetry === 'quadrant') ? Math.ceil(TILE_SIZE / 2) : TILE_SIZE;

        if (algorithm === 'cluster') {
            noiseGenerator.seed(Math.random());
            const noiseZoom = 10; // How "zoomed in" the noise is.

            // 1. Generate noise values for all pixels and store them.
            const noiseValues = [];
            for (let y = 0; y < yEnd; y++) {
                for (let x = 0; x < xEnd; x++) {
                    const noiseValue = noiseGenerator.perlinNoise(x / noiseZoom, y / noiseZoom);
                    noiseValues.push({ x, y, noise: noiseValue });
                }
            }

            // 2. Sort pixels by noise value.
            noiseValues.sort((a, b) => a.noise - b.noise);

            // 3. Calculate pixel counts for each color based on weight.
            const totalPixels = xEnd * yEnd;
            const totalWeight = weightedColors.reduce((sum, c) => sum + c.weight, 0);
            
            if (totalWeight > 0) {
                const colorPixelCounts = weightedColors.map(c => ({
                    color: c.color,
                    count: Math.round((c.weight / totalWeight) * totalPixels)
                }));
                
                // Adjust counts to ensure total is exactly totalPixels
                let currentTotal = colorPixelCounts.reduce((sum, c) => sum + c.count, 0);
                let diff = totalPixels - currentTotal;
                if (diff !== 0 && colorPixelCounts.length > 0) {
                    // Distribute difference among colors
                    let i = 0;
                    while(diff !== 0) {
                        const index = i % colorPixelCounts.length;
                        const adjustment = Math.sign(diff);
                        if (colorPixelCounts[index].count + adjustment >= 0) {
                           colorPixelCounts[index].count += adjustment;
                           diff -= adjustment;
                        }
                        i++;
                        if (i > totalPixels * 2) break; // Safety break
                    }
                }

                // 4. Assign colors to the grid based on sorted noise.
                let pixelIndex = 0;
                for (const colorCount of colorPixelCounts) {
                    for (let i = 0; i < colorCount.count; i++) {
                        if (pixelIndex < noiseValues.length) {
                            const pixel = noiseValues[pixelIndex];
                            grid[pixel.y][pixel.x] = colorCount.color;
                            pixelIndex++;
                        }
                    }
                }
            }
        } else { // Scatter algorithm
            for (let y = 0; y < yEnd; y++) {
                for (let x = 0; x < xEnd; x++) {
                    grid[y][x] = getWeightedRandomColor(weightedColors);
                }
            }
        }
        
        applySymmetry(symmetry);
        renderTile();
    }
    
    function applySymmetry(symmetry) {
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                const sourceColor = grid[y][x];
                if (sourceColor) {
                    const hMirror = TILE_SIZE - 1 - x;
                    const vMirror = TILE_SIZE - 1 - y;

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

    // --- Rendering & Export ---

    function renderTile() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                if (grid[y][x]) {
                    ctx.fillStyle = grid[y][x];
                    ctx.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
                }
            }
        }
    }

    function exportAsPNG() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = TILE_SIZE;
        tempCanvas.height = TILE_SIZE;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                if (grid[y][x]) {
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

    // --- Event Listeners ---
    generateBtn.addEventListener('click', generateAndRender);
    exportBtn.addEventListener('click', exportAsPNG);
    addColorBtn.addEventListener('click', addColor);
    paletteContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-color-btn')) {
            e.target.closest('.color-entry').remove();
        }
    });

    // --- Initial Setup ---
    function initialize() {
        const initialColors = [
            { color: "#1a1c2c", weight: 20 },
            { color: "#5d275d", weight: 50 },
            { color: "#b13e53", weight: 30 },
            { color: "#ef7d57", weight: 15 }
        ];
        initialColors.forEach(({ color, weight }) => {
             const newEntry = createColorEntry(color, weight);
             paletteContainer.appendChild(newEntry);
        });
        generateAndRender();
    }

    initialize();
});
