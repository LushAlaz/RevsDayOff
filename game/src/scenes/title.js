// ---------------------------------------------------------------
// Title screen for Rev's Day Off
// Needs these in public/sprites/:
//   title-bg.png, title-rev.png, cloud-layer.png, wind.png,
//   play-button.png, leaderboard-button.png, title-logo.png
//
// The whole screen is laid out on a small 320x240 canvas and then
// scaled up in whole steps to fit the browser window, so the pixel
// art stays sharp at any window size.
// ---------------------------------------------------------------

import { session, startNewGame } from "../session.js";
import { hasProfile } from "../profile.js";

export function titleScene() {
    loadSprite("title-bg", "sprites/title-bg.png");
    loadSprite("title-rev", "sprites/title-rev.png", {
        sliceX: 4, // 4 frames of fur blowing in the wind
        anims: { breeze: { from: 0, to: 3, loop: true, speed: 5 } },
    });
    loadSprite("cloud-layer", "sprites/cloud-layer.png"); // 320px strip that tiles seamlessly
    loadSprite("wind", "sprites/wind.png", {
        sliceX: 6, // a gust line sweeping through
        anims: { gust: { from: 0, to: 5, loop: true, speed: 9 } },
    });
    // buttons: frame 0 normal, frame 1 hover
    loadSprite("play-button", "sprites/play-button.png", { sliceX: 2 });
    loadSprite("leaderboard-button", "sprites/leaderboard-button.png", { sliceX: 2 });
    loadSprite("title-logo", "sprites/title-logo.png");

    scene("title", () => {
        // the field scene moves the camera to follow Rev; put it back so the
        // title isn't drawn off-center after pressing Esc from the field
        setCamPos(center());
        setBackground(rgb(24, 20, 28)); // colour of the bars around the screen

        let starting = false;
        function startGame() {
            if (starting) return;
            starting = true;
            setCursor("default");
            startNewGame();
            const next = session.introPlayed ? "mapSelect" : "intro";
            if (hasProfile()) go(next);
            else go("profile", { next, back: "title" });
        }

        // a 320x240 "screen" that everything below is added to.
        // mask() clips its children to this rectangle, so the scrolling
        // clouds never show up in the bars beside the screen.
        const screen = add([pos(0, 0), scale(1), rect(320, 240), mask("intersect")]);
        function fitToWindow() {
            const s = Math.max(1, Math.floor(Math.min(width() / 320, height() / 240)));
            screen.scale = vec2(s);
            screen.pos = vec2(Math.floor((width() - 320 * s) / 2), Math.floor((height() - 240 * s) / 2));
        }
        fitToWindow();
        onResize(fitToWindow);

        // still background: sky, sun, ocean, grass
        screen.add([sprite("title-bg"), pos(0, 0)]);

        // clouds: two copies of the same strip side by side, scrolling together.
        // When the strip has moved one full width it's back where it started,
        // so the wrap is invisible and the sky never jumps or has a gap.
        const CLOUD_Y = 20;
        const CLOUD_SPEED = 8; // pixels per second
        const cloudA = screen.add([sprite("cloud-layer"), pos(0, CLOUD_Y)]);
        const cloudB = screen.add([sprite("cloud-layer"), pos(-320, CLOUD_Y)]);
        let cloudOffset = 0;
        onUpdate(() => {
            cloudOffset = (cloudOffset + CLOUD_SPEED * dt()) % 320;
            const x = Math.round(cloudOffset); // whole pixels so the clouds don't shimmer
            cloudA.pos.x = x;
            cloudB.pos.x = x - 320;
        });

        // wind gusts, started at different times so they don't all move together
        const gustSpots = [
            [2, 60], [6, 110],                    // left edge, blowing toward Rev
            [200, 66], [240, 92], [264, 118],     // right side, around the buttons
            [214, 196], [250, 214],               // low, over the grass
        ];
        gustSpots.forEach(([x, y], i) => {
            const gust = screen.add([sprite("wind"), pos(x, y), opacity(0)]);
            wait(i * 0.17, () => {
                gust.opacity = 0.9;
                gust.play("gust");
            });
            // drift is tied to the gust's own animation frame, so the reset
            // happens exactly when the gust starts over and is never visible
            gust.onUpdate(() => {
                gust.pos.x = x + gust.frame * 2;
            });
        });

        // Rev in her sunglasses and blanket, fur blowing in the breeze.
        // The sprite is small and chunky on purpose; scale(2) doubles every pixel.
        screen.add([sprite("title-rev"), pos(26, 40), scale(2)]).play("breeze");

        // menu buttons, stacked and centred in the space to the right of Rev
        function menuButton(spriteName, y, onPress) {
            const btn = screen.add([sprite(spriteName), pos(201, y), area()]);
            btn.onHover(() => {
                btn.frame = 1;
                setCursor("pointer");
            });
            btn.onHoverEnd(() => {
                btn.frame = 0;
                setCursor("default");
            });
            btn.onClick(() => {
                setCursor("default");
                onPress();
            });
            return btn;
        }
        menuButton("play-button", 104, startGame);
        menuButton("leaderboard-button", 142, () => go("leaderboard"));

        // game title across the top, bobbing gently
        const logo = screen.add([sprite("title-logo"), pos(160, 6), anchor("top")]);
        logo.onUpdate(() => {
            logo.pos.y = 6 + Math.round(Math.sin(time() * 2) * 1.5);
        });

        // Enter also starts the game
        onKeyPress("enter", startGame);
    });
}
