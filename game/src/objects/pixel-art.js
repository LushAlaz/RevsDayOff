// Small pixel art written as strings, one character per pixel ("." is empty).
// Each picture is painted once into a sprite and reused, so drawing it costs one draw call.

const cache = new Map();

// art: rows of characters; colors: { char: [r, g, b] }; pixel: screen pixels per art pixel
export function pixelSprite(art, colors, pixel = 3) {
    const key = JSON.stringify([art, colors, pixel]);
    if (!cache.has(key)) {
        const canvas = document.createElement("canvas");
        canvas.width = art[0].length * pixel;
        canvas.height = art.length * pixel;
        const ctx = canvas.getContext("2d");
        art.forEach((row, y) => [...row].forEach((cell, x) => {
            if (cell === ".") return;
            ctx.fillStyle = `rgb(${colors[cell].join(",")})`;
            ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
        }));
        cache.set(key, loadSprite(null, canvas));
    }
    return cache.get(key);
}

// Draw a pixelSprite inside a custom draw(); it appears once its canvas has loaded.
export function drawPixelSprite(asset, options) {
    if (asset.data) drawSprite({ sprite: asset.data, ...options });
}
