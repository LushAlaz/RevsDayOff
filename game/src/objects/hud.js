// ---------------------------------------------------------------
// HUD: coin counter and a clickable bag, side by side in the bottom-right corner.
//
// The HUD is fixed to the screen, so it stays put when the camera moves.
// Clicking the bag (or pressing B) opens an inventory panel with slots;
// click the bag again, press B or Esc, or click outside the panel to close it.
//
// Needs in public/sprites/: coin.png, coin-panel.png, bag.png, bag-panel.png
// and public/fonts/press-start-2p.woff2
//
// Usage:
//   loadHudSprites();                          // once, after kaplay()
//   // inside a scene:
//   const hud = addHud({ coins: 0 });
//   hud.addCoins(5);                           // counts up with a little coin hop
//   hud.setItems([{ sprite: "ring", name: "Aggie Ring", count: 1 }]);
// ---------------------------------------------------------------

const HUD_Z = 100;
const TEXT_DARK = [52, 40, 46];

export function loadHudSprites() {
    loadFont("hud-font", "fonts/press-start-2p.woff2", { size: 8, filter: "nearest" });
    loadSprite("coin", "sprites/coin.png", {
        sliceX: 6,
        anims: { spin: { from: 0, to: 5, loop: true, speed: 10 } },
    });
    loadSprite("coin-panel", "sprites/coin-panel.png");
    loadSprite("bag", "sprites/bag.png", { sliceX: 3 }); // 0 closed, 1 hover, 2 open
    loadSprite("bag-panel", "sprites/bag-panel.png");
}

// coins: starting coin count
// size:  how much to scale the pixel art (3 matches the cadets)
// items: what's in the bag, e.g. [{ sprite: "ring", name: "Aggie Ring", count: 1 }]
// canOpen: return false to keep the bag shut (e.g. during a dig challenge)
export function addHud({ coins = 0, size = 3, items = [], canOpen = () => true } = {}) {
    const MARGIN = 12;

    // ---------------- coin counter ----------------
    const counter = add([sprite("coin-panel"), pos(0, 0), anchor("botright"), scale(size), fixed(), z(HUD_Z)]);
    // panel art is 76x22; anchor("botright") puts (0,0) at its bottom-right corner
    const PX = -76, PY = -22;
    const coinIcon = counter.add([sprite("coin", { anim: "spin" }), pos(PX + 4, PY + 3)]);
    const coinText = counter.add([
        text(String(coins), { font: "hud-font", size: 8 }),
        pos(PX + 23, PY + 7),
        color(...TEXT_DARK),
    ]);

    let total = coins;     // the real amount
    let shown = coins;     // what the counter is showing while it counts up
    counter.onUpdate(() => {
        if (shown === total) return;
        const step = Math.max(1, Math.ceil(Math.abs(total - shown) * 6 * dt()));
        shown = shown < total ? Math.min(total, shown + step) : Math.max(total, shown - step);
        coinText.text = String(shown);
    });

    function hop() {
        tween(PY + 3, PY, 0.12, (y) => (coinIcon.pos.y = Math.round(y)))
            .onEnd(() => tween(PY, PY + 3, 0.12, (y) => (coinIcon.pos.y = Math.round(y))));
    }

    // ---------------- bag button ----------------
    const bag = add([
        sprite("bag"),
        pos(0, 0),
        anchor("botright"),
        scale(size),
        area(),
        fixed(),
        z(HUD_Z),
    ]);

    // bag in the very corner, coin counter just to its left, centred on the bag
    function layout() {
        bag.pos = vec2(width() - MARGIN, height() - MARGIN);
        counter.pos = vec2(width() - MARGIN - (28 + 4) * size, height() - MARGIN - 3 * size);
    }
    layout();
    onResize(layout);

    let open = false;
    let panel = null;
    let bagItems = items.slice();

    bag.onHover(() => {
        if (!open) bag.frame = 1;
        setCursor("pointer");
    });
    bag.onHoverEnd(() => {
        if (!open) bag.frame = 0;
        setCursor("default");
    });
    bag.onClick(() => (open ? closeBag() : openBag()));

    // ---------------- inventory panel ----------------
    function openBag() {
        if (open || !canOpen()) return;
        open = true;
        bag.frame = 2;

        panel = add([
            sprite("bag-panel"),
            pos(center()),
            anchor("center"),
            scale(0),
            fixed(),
            z(HUD_Z + 1),
            area(),
        ]);
        tween(0, size, 0.12, (s) => (panel.scale = vec2(s)), easings.easeOutBack);

        // panel art is 128x92 with the origin at its centre
        const ox = -64, oy = -46;
        panel.add([text("BAG", { font: "hud-font", size: 8 }), pos(ox + 10, oy + 6), color(...TEXT_DARK)]);
        // hovered item's name shows along the bottom of the panel
        const nameText = panel.add([
            text("", { font: "hud-font", size: 8 }),
            pos(ox + 64, oy + 78),
            anchor("center"),
            color(112, 18, 36),
        ]);

        for (let i = 0; i < 8; i++) {
            const col = i % 4, row = Math.floor(i / 4);
            const sx = ox + 10 + col * 28, sy = oy + 20 + row * 28;
            const slot = panel.add([rect(24, 24), pos(sx, sy), opacity(0), area()]);
            const item = bagItems[i];
            if (!item) continue;
            const icon = panel.add([sprite(item.sprite), pos(sx + 12, sy + 12), anchor("center")]);
            // shrink big sprites (like 32x32 items) so they fit the 20x20 inside of a slot
            const fit = Math.min(1, 20 / Math.max(icon.width, icon.height));
            icon.scale = vec2(fit);
            if (item.count > 1) {
                // small cream tag behind the number so it reads on top of the icon
                const label = String(item.count);
                panel.add([rect(label.length * 8 + 1, 9), pos(sx + 23, sy + 23), anchor("botright"), color(250, 247, 236)]);
                panel.add([
                    text(label, { font: "hud-font", size: 8 }),
                    pos(sx + 23, sy + 23),
                    anchor("botright"),
                    color(...TEXT_DARK),
                ]);
            }
            slot.onHover(() => (nameText.text = item.name ?? ""));
            slot.onHoverEnd(() => (nameText.text = ""));
        }
    }

    function closeBag() {
        if (!open) return;
        open = false;
        bag.frame = bag.isHovering() ? 1 : 0;
        if (panel) destroy(panel);
        panel = null;
    }

    onKeyPress("b", () => (open ? closeBag() : openBag()));
    onKeyPress("escape", closeBag);
    // clicking anywhere outside the panel (and not on the bag) closes it
    onMousePress(() => {
        if (open && panel && !panel.isHovering() && !bag.isHovering()) closeBag();
    });

    return {
        addCoins(n) {
            total += n;
            hop();
        },
        spendCoins(n) {
            if (total < n) return false;
            total -= n;
            return true;
        },
        getCoins: () => total,
        setItems(list) {
            bagItems = list.slice();
            if (open) { closeBag(); openBag(); }
        },
        openBag,
        closeBag,
        isBagOpen: () => open,
    };
}
