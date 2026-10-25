const bounds = { left: 0, top: 0, right: 1440, bottom: 640 };
const endZoneWidth = 120;
const playingLeft = bounds.left + endZoneWidth;
const playingRight = bounds.right - endZoneWidth;
const pixelsPerYard = (playingRight - playingLeft) / 100;

export const FIELD_LAYOUT = {
    bounds,
    endZoneWidth,
    playingLeft,
    playingRight,
    pixelsPerYard,
    center: { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 },
    yardLines: Array.from({ length: 21 }, (_, index) => playingLeft + index * 5 * pixelsPerYard),
    yardNumbers: Array.from({ length: 9 }, (_, index) => {
        const yard = (index + 1) * 10;
        return { x: playingLeft + yard * pixelsPerYard, label: String(Math.min(yard, 100 - yard)) };
    }),
};

export function drawField() {
    const field = FIELD_LAYOUT;
    const { left, top, right, bottom } = field.bounds;
    const height = bottom - top;
    const white = rgb(245, 242, 229);
    const maroon = rgb(80, 0, 0);

    function patch(x, y, w, h, tint, layer) {
        return add([rect(w, h), pos(x, y), color(tint), z(layer)]);
    }

    patch(left, top, right - left, height, rgb(42, 104, 61), -100);
    for (let band = 0; band < 20; band++) {
        patch(field.playingLeft + band * 5 * field.pixelsPerYard, top,
            5 * field.pixelsPerYard, height,
            band % 2 === 0 ? rgb(48, 115, 68) : rgb(42, 104, 61), -99);
    }

    for (const [x, label, rotation] of [
        [left, "TEXAS A&M", -90], [field.playingRight, "AGGIES", 90],
    ]) {
        patch(x, top, field.endZoneWidth, height, maroon, -98);
        add([
            text(label, { font: "pixel", size: 32 }),
            pos(x + field.endZoneWidth / 2, field.center.y),
            anchor("center"), rotate(rotation), color(white), z(-80),
        ]);
    }

    for (const x of field.yardLines) {
        patch(x - 1, top, 2, height, white, -90);
    }
    // College-style hash rows, plus short marks along both sidelines.
    for (let yard = 1; yard < 100; yard++) {
        if (yard % 5 === 0) continue;
        const x = field.playingLeft + yard * field.pixelsPerYard;
        for (const y of [top + 12, top + height * 0.375, top + height * 0.625, bottom - 22]) {
            patch(x - 1, y, 2, 10, white, -90);
        }
    }

    for (const number of field.yardNumbers) {
        for (const [y, rotation] of [[top + 128, 180], [bottom - 128, 0]]) {
            add([
                text(number.label.split("").join(" "), { font: "pixel", size: 16 }),
                pos(number.x, y), anchor("center"), rotate(rotation), color(white), z(-85),
            ]);
        }
    }

    // Keep the outer white border and pylons entirely inside the playable bounds.
    patch(left, top, right - left, 4, white, -85);
    patch(left, bottom - 4, right - left, 4, white, -85);
    patch(left, top, 4, height, white, -85);
    patch(right - 4, top, 4, height, white, -85);
    for (const x of [field.playingLeft, field.playingRight]) {
        for (const y of [top + 4, bottom - 14]) {
            patch(x - 5, y, 10, 10, rgb(255, 125, 32), -75);
        }
    }

    add([
        sprite("tam-logo", { width: 180 }),
        pos(field.center.x, field.center.y), anchor("center"), z(-80),
    ]);
}
