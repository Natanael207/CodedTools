// postprocessing.js

// --- Reusable Color Blending Utility ---
function blendHexColors(color1, color2, ratio) {
    // Ensure colors are valid hex strings, provide a fallback if not.
    const safeColor1 = /^#[0-9A-F]{6}$/i.test(color1) ? color1 : '#000000';
    const safeColor2 = /^#[0-9A-F]{6}$/i.test(color2) ? color2 : '#000000';

    const hexToRgb = (hex) => {
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        return { r, g, b };
    };

    const rgbToHex = (r, g, b) => {
        // Clamp values to ensure they are within the valid 0-255 range before converting
        const clamp = (val) => Math.max(0, Math.min(255, val));
        const r_c = clamp(Math.round(r));
        const g_c = clamp(Math.round(g));
        const b_c = clamp(Math.round(b));
        return `#${r_c.toString(16).padStart(2, '0')}${g_c.toString(16).padStart(2, '0')}${b_c.toString(16).padStart(2, '0')}`;
    };

    const c1 = hexToRgb(safeColor1);
    const c2 = hexToRgb(safeColor2);

    const r = c1.r * (1 - ratio) + c2.r * ratio;
    const g = c1.g * (1 - ratio) + c2.g * ratio;
    const b = c1.b * (1 - ratio) + c2.b * ratio;

    return rgbToHex(r, g, b);
}


// Function to make a tile seamless
function applySeamlessTiling(grid, tileWidth, tileHeight) {
    const newGrid = JSON.parse(JSON.stringify(grid)); // Deep copy to modify

    // Apply horizontal seamlessness: Blend left and right edges and apply to both
    if (tileWidth > 1) {
        for (let y = 0; y < tileHeight; y++) {
            const blendedColor = blendHexColors(newGrid[y][0], newGrid[y][tileWidth - 1], 0.5);
            newGrid[y][0] = blendedColor;
            newGrid[y][tileWidth - 1] = blendedColor;
        }
    }

    // Apply vertical seamlessness on the already-modified grid
    if (tileHeight > 1) {
        for (let x = 0; x < tileWidth; x++) {
            const blendedColor = blendHexColors(newGrid[0][x], newGrid[tileHeight - 1][x], 0.5);
            newGrid[0][x] = blendedColor;
            newGrid[tileHeight - 1][x] = blendedColor;
        }
    }
    
    return newGrid;
}


// Function to apply transition to an uploaded image
function applyImageTransition(generatedGrid, transitionImageData, tileWidth, tileHeight, transitionStrength, perlinNoise) {
    const newGrid = JSON.parse(JSON.stringify(generatedGrid)); // Start with a copy of the generated grid

    if (!transitionImageData || transitionImageData.length === 0 || !perlinNoise) {
        console.warn("Transition image data or perlin noise function not available.");
        return newGrid;
    }

    // For convenience, convert the 1D transitionImageData (RGBA objects) into a 2D grid of hex colors
    const transitionGrid = Array.from({ length: tileHeight }, () => Array(tileWidth));
    for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
            const index = y * tileWidth + x;
            if (index < transitionImageData.length) {
                const pixel = transitionImageData[index];
                const r = Math.round(pixel.r).toString(16).padStart(2, '0');
                const g = Math.round(pixel.g).toString(16).padStart(2, '0');
                const b = Math.round(pixel.b).toString(16).padStart(2, '0');
                transitionGrid[y][x] = `#${r}${g}${b}`;
            } else {
                transitionGrid[y][x] = '#000000'; // Fallback for safety
            }
        }
    }

    // 'transitionStrength' controls both the jaggedness of the line and the width of the blend.
    const maxDisplacement = (transitionStrength / 100) * (tileWidth / 2.5);
    const blendWidth = 1 + (transitionStrength / 100) * (tileWidth / 4);

    for (let y = 0; y < tileHeight; y++) {
        const noiseValue = (perlinNoise(y / 15, 0) - 0.5) * 2;
        const displacement = noiseValue * maxDisplacement;
        const boundaryX = (tileWidth / 2) + displacement;

        for (let x = 0; x < tileWidth; x++) {
            const distanceToBoundary = x - boundaryX;
            
            // Calculate blend ratio (0 -> 1) across the blendWidth
            let blendRatio = (distanceToBoundary + blendWidth / 2) / blendWidth;
            blendRatio = Math.max(0, Math.min(1, blendRatio)); // Clamp ratio to [0, 1]

            const generatedColor = generatedGrid[y][x];
            const transitionColor = transitionGrid[y][x];

            // Blend the two colors based on the ratio
            newGrid[y][x] = blendHexColors(generatedColor, transitionColor, blendRatio);
        }
    }

    return newGrid;
}
