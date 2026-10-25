// Scene transition: maroon pixel blocks sweep diagonally across the screen, the next
// place's name shows while it's covered, then the blocks clear the same way.
// Use transitionTo("explore", { mapId }, { label: "KYLE FIELD" }) in place of go().

export const COVER_SECONDS = 0.35;
export const HOLD_SECONDS = 0.3;   // name card time; the next scene loads underneath
export const REVEAL_SECONDS = 0.35;
const BLOCK = 60;                  // 16 x 9 blocks over the 960 x 540 view
const SWEEP = 0.5;                 // share of each phase spent sweeping across; the rest grows each block

// How much of block (col, row) is filled, 0..1, at progress 0..1 through a sweep from the top-left.
// Blocks further along the diagonal start later, so the wipe travels across the screen.
export function blockFill(progress, col, row, cols, rows) {
    const delay = (col + row) / (cols + rows - 2 || 1) * SWEEP;
    return Math.max(0, Math.min(1, (progress - delay) / (1 - SWEEP)));
}

let active = false;
export const isTransitioning = () => active;

export function transitionTo(sceneName, args, { label = "" } = {}) {
    if (active) return false; // ignore repeat presses while one is running
    active = true;
    const cols = Math.ceil(width() / BLOCK);
    const rows = Math.ceil(height() / BLOCK);
    let elapsed = 0;
    let switched = false;
    // stay() keeps the overlay alive through go(), so it can uncover the next scene
    const overlay = add([fixed(), z(10000), stay(), {
        draw() {
            const covering = elapsed < COVER_SECONDS;
            const revealing = elapsed >= COVER_SECONDS + HOLD_SECONDS;
            const progress = covering ? elapsed / COVER_SECONDS
                : revealing ? (elapsed - COVER_SECONDS - HOLD_SECONDS) / REVEAL_SECONDS : 1;
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    // covering grows blocks in; revealing shrinks them away in the same direction
                    const fill = revealing ? 1 - blockFill(progress, col, row, cols, rows) : blockFill(progress, col, row, cols, rows);
                    if (fill <= 0) continue;
                    const size = Math.ceil(BLOCK * fill / 4) * 4; // whole 4px steps keep it crisp
                    drawRect({
                        pos: vec2(col * BLOCK + (BLOCK - size) / 2, row * BLOCK + (BLOCK - size) / 2),
                        width: size, height: size, color: rgb(80, 0, 0),
                    });
                }
            }
            if (label && !covering && !revealing) {
                drawText({ text: label, font: "pixel", size: 24, pos: center(), anchor: "center", color: rgb(244, 237, 214) });
            }
        },
    }]);
    overlay.onUpdate(() => {
        elapsed += Math.min(dt(), 0.05); // a slow frame (like the scene loading) can't skip the name card
        if (!switched && elapsed >= COVER_SECONDS) {
            switched = true;
            go(sceneName, args);
        }
        if (elapsed >= COVER_SECONDS + HOLD_SECONDS + REVEAL_SECONDS) {
            active = false;
            destroy(overlay);
        }
    });
    return true;
}
