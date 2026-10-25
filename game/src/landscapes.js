import { drawField } from "./field.js";
import { SHOP } from "./shop.js";

export function drawLandscape(map) {
    if (map.id === "kyle-field") { drawField(); return; }
    function patch(x, y, w, h, tint, layer = -95, radius = 0) {
        const snap = (n) => Math.round(n / 4) * 4;
        x = snap(x); y = snap(y);
        w = Math.max(4, snap(w)); h = Math.max(4, snap(h));
        const block = (dx, dy, width, height) => {
            add([rect(width, height), pos(x + dx, y + dy), color(...tint), z(layer)]);
        };
        const corner = Math.min(snap(radius / 2), Math.floor(w / 12) * 4, Math.floor(h / 12) * 4);
        if (!corner) { block(0, 0, w, h); return; }
        // Five rectangular bands give every rounded silhouette deliberate pixel steps.
        block(corner, 0, w - corner * 2, 4);
        block(4, 4, w - 8, corner);
        block(0, corner + 4, w, h - corner * 2 - 8);
        block(4, h - corner - 4, w - 8, corner);
        block(corner, h - 4, w - corner * 2, 4);
    }
    function path(x, y, width, height) {
        patch(x, y, width, height, [131, 117, 87], -98);
        patch(x + 4, y + 4, width - 8, height - 8, [204, 184, 140], -97);
        for (let py = y + 8; py < y + height - 8; py += 16) {
            for (let px = x + 8; px < x + width - 8; px += 24) {
                patch(px, py, 8, 4, [220, 202, 158], -96);
                if ((px + py) % 3 === 0) patch(px + 8, py + 4, 4, 4, [175, 155, 116], -96);
            }
        }
    }
    const w = map.bounds.right;
    const h = map.bounds.bottom;
    patch(0, 0, w, h, [74, 120, 65], -100);
    // Fixed tile motifs: short grass blades, dark flecks, and sunlit clusters.
    for (let y = 8; y < h; y += 32) {
        for (let x = 8; x < w; x += 32) {
            const seed = (x * 13 + y * 29) >>> 0;
            const dx = (seed % 5) * 4;
            const dy = (Math.floor(seed / 7) % 4) * 4;
            patch(x + dx, y + dy, 8, 4, [85, 134, 69], -99);
            patch(x + dx + 4, y + dy - 4, 4, 4, [104, 150, 79], -99);
            if (seed % 3 === 0) patch(x, y + 16, 4, 4, [58, 102, 57], -99);
        }
    }

    if (map.id === "aggie-park") {
        // Paths make a continuous loop around the open center, with a clear shop approach.
        path(90, 240, 380, 48);
        path(430, 240, 46, 520);
        path(430, 240, 750, 46);
        path(1134, 240, 46, 520);
        path(430, 714, 750, 46);
        path(1134, 714, 650, 46);
        path(1738, 240, 46, 520);
        path(1134, 240, 650, 46);
        const p = map.pond;
        patch(p.left - 10, p.top - 10, p.right - p.left + 20, p.bottom - p.top + 20, [151, 160, 105], -94, 42);
        patch(p.left, p.top, p.right - p.left, p.bottom - p.top, [57, 133, 165], -93, 34);
        patch(p.left + 24, p.top + 24, p.right - p.left - 48, p.bottom - p.top - 48, [64, 148, 175], -92, 26);
        patch(p.left + 40, p.top + 48, p.right - p.left - 100, 120, [52, 126, 156], -91, 24);
        for (let y = p.top + 42; y < p.bottom - 28; y += 48) {
            for (let x = p.left + 40; x < p.right - 40; x += 74) {
                patch(x, y, 20, 4, [119, 187, 199], -90);
                patch(x + 20, y - 4, 8, 4, [87, 166, 187], -90);
            }
        }
        // Flower beds stay decorative, leaving the lawn fully connected.
        for (const [x, y] of [[750, 600], [900, 385], [1600, 800]]) {
            patch(x, y, 88, 28, [81, 98, 53]);
            for (let offset = 8; offset < 82; offset += 16) {
                patch(x + offset, y + 8, 4, 12, [41, 88, 49], -94);
                patch(x + offset - 4, y + 4, 12, 8, [220, 162, 103], -93);
                patch(x + offset, y + 4, 4, 4, [250, 220, 145], -92);
            }
        }
    } else {
        // Wrap below and to the right of the whole sprite, including its roof.
        const shopRight = SHOP.position.x + SHOP.width + 36;
        const shopBottom = SHOP.position.y + SHOP.height + 36;
        path(shopRight, 32, w - shopRight - 32, 28);
        path(shopRight, 32, 28, shopBottom + 28 - 32);
        path(32, shopBottom, shopRight - 32 + 28, 28);
        path(SHOP.entrance.x - 12, SHOP.position.y + SHOP.height + 8,
            24, shopBottom + 28 - (SHOP.position.y + SHOP.height + 8));
        path(32, h - 60, w - 64, 28);
        path(32, shopBottom, 28, h - 32 - shopBottom);
        path(w - 60, 32, 28, h - 64);
        // Subtle parade-lawn stripes and short formation markers.
        for (let x = 320; x < w - 100; x += 96) {
            patch(x, 152, 48, 224, [80, 126, 68], -100);
            for (const y of [160, 368]) patch(x + 16, y, 12, 4, [174, 181, 123], -98);
        }
    }

    for (const bench of map.benches) {
        patch(bench.left, bench.top, bench.right - bench.left, bench.bottom - bench.top, [111, 73, 43], -2);
        patch(bench.left + 3, bench.top + 3, bench.right - bench.left - 6, 4, [163, 113, 64], -1);
        patch(bench.left + 4, bench.top + 12, bench.right - bench.left - 8, 4, [198, 147, 84], -1);
    }
    for (const tree of map.trees) {
        patch(tree.x - 24, tree.y - 4, 48, 22, [49, 94, 48], -90, 8);
        patch(tree.x - 10, tree.y - 36, 20, 46, [104, 70, 42], -1);
        patch(tree.x - 6, tree.y - 28, 4, 32, [155, 109, 58], 0);
        // Layered blocky canopies fit the game's top-down pixel-art view.
        patch(tree.x - 38, tree.y - 78, 76, 50, [34, 80, 48], 2, 8);
        patch(tree.x - 30, tree.y - 94, 60, 58, [44, 100, 51], 3, 8);
        patch(tree.x - 23, tree.y - 94, 38, 32, [67, 126, 60], 4, 6);
        for (const [dx, dy] of [[-20, -80], [8, -72], [-8, -52], [24, -48]]) {
            patch(tree.x + dx, tree.y + dy, 12, 8, [83, 143, 67], 5);
            patch(tree.x + dx, tree.y + dy, 4, 4, [117, 162, 78], 6);
        }
    }
    // A small border separates the map from its surrounding camera backdrop.
    patch(0, 0, w, 4, [94, 142, 76], -90);
    patch(0, h - 4, w, 4, [94, 142, 76], -90);
    patch(0, 0, 4, h, [94, 142, 76], -90);
    patch(w - 4, 0, 4, h, [94, 142, 76], -90);
}
