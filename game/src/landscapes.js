import { drawField } from "./field.js";

export function drawLandscape(map) {
    if (map.id === "kyle-field") { drawField(); return; }
    function patch(x, y, w, h, tint, layer = -95, radius = 0) {
        add([rect(w, h, { radius }), pos(x, y), color(...tint), z(layer)]);
    }
    const w = map.bounds.right;
    const h = map.bounds.bottom;
    patch(0, 0, w, h, [66, 119, 64], -100);
    for (let y = 0; y < h; y += 120) patch(0, y, w, 60, [71, 127, 68], -99);

    if (map.id === "aggie-park") {
        // Paths make a continuous loop around the open center, with a clear shop approach.
        const sand = [200, 183, 142];
        patch(90, 240, 380, 48, sand);
        patch(430, 240, 46, 520, sand);
        patch(430, 240, 750, 46, sand);
        patch(1134, 240, 46, 520, sand);
        patch(430, 714, 750, 46, sand);
        patch(1134, 714, 650, 46, sand);
        patch(1738, 240, 46, 520, sand);
        patch(1134, 240, 650, 46, sand);
        const p = map.pond;
        patch(p.left - 10, p.top - 10, p.right - p.left + 20, p.bottom - p.top + 20, [151, 160, 105], -94, 42);
        patch(p.left, p.top, p.right - p.left, p.bottom - p.top, [57, 133, 165], -93, 34);
        patch(p.left + 24, p.top + 24, p.right - p.left - 48, p.bottom - p.top - 48, [64, 148, 175], -92, 26);
        for (let y = p.top + 42; y < p.bottom - 28; y += 48) {
            for (let x = p.left + 40; x < p.right - 40; x += 74) patch(x, y, 22, 3, [119, 187, 199], -91);
        }
        // Flower beds stay decorative, leaving the lawn fully connected.
        for (const [x, y] of [[750, 600], [900, 385], [1600, 800]]) {
            patch(x, y, 88, 28, [81, 98, 53]);
            for (let offset = 8; offset < 82; offset += 16) patch(x + offset, y + 8, 7, 7, [225, 191, 113], -94);
        }
    } else {
        const path = [189, 173, 139];
        patch(220, 32, w - 252, 28, path);
        patch(32, h - 60, w - 64, 28, path);
        patch(32, 260, 28, h - 292, path);
        patch(w - 60, 32, 28, h - 64, path);
        patch(90, 240, 190, 28, path);
        add([text("SIMPSON DRILL FIELD", { font: "pixel", size: 16 }), pos(610, 110), anchor("center"), color(220, 232, 193), z(-90)]);
        patch(540, 65, 3, 32, [215, 215, 203], -90);
        patch(543, 65, 26, 15, [80, 0, 0], -89);
    }

    for (const bench of map.benches) {
        patch(bench.left, bench.top, bench.right - bench.left, bench.bottom - bench.top, [111, 73, 43], -2);
        patch(bench.left + 3, bench.top + 3, bench.right - bench.left - 6, 4, [163, 113, 64], -1);
    }
    for (const tree of map.trees) {
        patch(tree.x - 24, tree.y - 4, 48, 22, [49, 94, 48], -90, 8);
        patch(tree.x - 10, tree.y - 36, 20, 46, [104, 70, 42], -1);
        // Layered blocky canopies fit the game's top-down pixel-art view.
        patch(tree.x - 38, tree.y - 78, 76, 50, [34, 80, 48], 2, 8);
        patch(tree.x - 30, tree.y - 94, 60, 58, [44, 100, 51], 3, 8);
        patch(tree.x - 23, tree.y - 94, 38, 32, [67, 126, 60], 4, 6);
    }
    // A small border separates the map from its surrounding camera backdrop.
    patch(0, 0, w, 4, [94, 142, 76], -90);
    patch(0, h - 4, w, 4, [94, 142, 76], -90);
    patch(0, 0, 4, h, [94, 142, 76], -90);
    patch(w - 4, 0, 4, h, [94, 142, 76], -90);
}
