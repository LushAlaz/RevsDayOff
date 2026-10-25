import { session } from "../session.js";
import { setSceneMusic } from "../music.js";

// each string is one line
const STORY = [
    "Howdy! This is Reveille, First Lady of Aggieland.",
    "Every day, Rev is on duty. Classes, football games, and more photos than she can count.",
    "But today is different. Today is Rev's day off.",
    "And Rev knows a secret: campus is full of buried Aggie treasure.",
    "Rally towels, old jerseys, even a lost Aggie Ring or two.",
    "Marcel Reed is buying up Aggie memorabilia, and he pays in coins.",
    "Your mission: help Rev sniff out and dig up treasure around campus.",
    "Spend your coins on upgrades to sniff sharper, dig faster, and find rarer treasure.",
    "Ready, Rev? Time to dig in. Gig 'em!"
];

const NEXT_SCENE = "mapSelect";  // where to go when the story ends
const CHARS_PER_SEC = 30;        // normal reading speed
const FAST_MULTIPLIER = 4;       // while a button is held
const PAUSE_COMMA = 0.12;        // seconds to linger after , : ;
const PAUSE_STOP = 0.3;          // seconds to linger after . ! ?
const FONT_SIZE = 8;             // Press Start 2P is built on an 8px grid
const LINE_CHARS = 34;           // characters that fit on one line
const LINE_H = 16;               // distance between the two lines
const SCROLL_TIME = 0.12;        // how long the scroll-up takes

const TEXT_COLOR = [52, 40, 46];
const SHADOW_COLOR = [214, 204, 184];

// Break a message into lines up front, so words never jump to the next
// line halfway through being typed.
function wrap(str, max) {
    const lines = [];
    let line = "";
    for (const word of str.split(" ")) {
        if (line && (line + " " + word).length > max) {
            lines.push(line);
            line = word;
        } else {
            line = line ? line + " " + word : word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

export function introScene() {
    loadSprite("dialog-box", "sprites/dialog-box.png");
    loadSprite("next-arrow", "sprites/next-arrow.png", {
        sliceX: 2,
        anims: { bob: { from: 0, to: 1, loop: true, speed: 3 } },
    });
    loadSound("text-advance", "sounds/advance.wav");

    scene("intro", () => {
        setSceneMusic("intro");
        setBackground(rgb(0, 0, 0));

        // same 320x240 screen as the title, scaled to fit the window
        const screen = add([pos(0, 0), scale(1)]);
        function fitToWindow() {
            const s = Math.max(1, Math.floor(Math.min(width() / 320, height() / 240)));
            screen.scale = vec2(s);
            screen.pos = vec2(Math.floor((width() - 320 * s) / 2), Math.floor((height() - 240 * s) / 2));
        }
        fitToWindow();
        onResize(fitToWindow);

        // the text box along the bottom of the screen
        const BOX_X = 4, BOX_Y = 182;
        const box = screen.add([sprite("dialog-box"), pos(BOX_X, BOX_Y), opacity(0)]);

        // text lives inside a clipped window, so lines can scroll up out of view
        const textArea = screen.add([
            rect(298, 44),
            pos(BOX_X + 5, BOX_Y + 5),
            color(250, 247, 236),
            mask("intersect"),
            opacity(0),
        ]);
        const scroller = textArea.add([pos(0, 0)]);
        const arrow = screen.add([sprite("next-arrow"), pos(BOX_X + 292, BOX_Y + 42), opacity(0)]);
        arrow.play("bob");

        screen.add([
            text("ESC: SKIP", { font: "pixel", size: FONT_SIZE }),
            pos(316, 4),
            anchor("topright"),
            color(90, 84, 80),
        ]);

        // one text line = dark text with a soft light shadow, Pokemon style
        function makeLine(slot) {
            const y = 8 + slot * LINE_H;
            const shadow = scroller.add([text("", { font: "pixel", size: FONT_SIZE }), pos(8, y + 1), color(...SHADOW_COLOR)]);
            const main = scroller.add([text("", { font: "pixel", size: FONT_SIZE }), pos(7, y), color(...TEXT_COLOR)]);
            return {
                set(str) { main.text = str; shadow.text = str; },
                destroy() { destroy(main); destroy(shadow); },
            };
        }

        // ---- state ----
        let msg = 0;          // which STORY entry
        let lines = [];       // wrapped lines of the current entry
        let lineObjs = [];    // text objects made so far for this entry
        let lineIdx = 0;      // line currently being typed
        let charPos = 0;      // characters typed on that line (fractional)
        let pause = 0;        // punctuation pause left
        let topLine = 0;      // which line is in the top slot of the box
        let state = "fading"; // fading | typing | waitScroll | waitNext | scrolling | done

        function startMessage(i) {
            lineObjs.forEach((o) => o.destroy());
            scroller.pos.y = 0;
            lines = wrap(STORY[i], LINE_CHARS);
            lineObjs = [];
            lineIdx = 0;
            charPos = 0;
            pause = 0;
            topLine = 0;
            lineObjs.push(makeLine(0));
            arrow.opacity = 0;
            state = "typing";
        }

        // fade the box in, then start
        tween(0, 1, 0.35, (v) => {
            box.opacity = v;
            textArea.opacity = v;
        }).onEnd(() => startMessage(0));

        const held = () => isKeyDown("space") || isKeyDown("enter") || isMouseDown();

        onUpdate(() => {
            if (state !== "typing") return;
            const speed = CHARS_PER_SEC * (held() ? FAST_MULTIPLIER : 1);
            if (pause > 0) {
                pause -= dt() * (held() ? FAST_MULTIPLIER : 1);
                return;
            }
            const line = lines[lineIdx];
            const before = Math.floor(charPos);
            charPos = Math.min(line.length, charPos + speed * dt());
            const now = Math.floor(charPos);
            lineObjs[lineIdx].set(line.slice(0, now));

            // linger a moment after punctuation, like someone reading aloud
            if (now > before) {
                const ch = line[now - 1];
                if (".!?".includes(ch)) pause = PAUSE_STOP;
                else if (",:;".includes(ch)) pause = PAUSE_COMMA;
            }

            if (charPos >= line.length) {
                const lastLine = lineIdx === lines.length - 1;
                const boxFull = lineIdx - topLine === 1;
                if (lastLine) {
                    state = "waitNext";      // message finished: wait for a press
                    arrow.opacity = 1;
                } else if (boxFull) {
                    state = "waitScroll";    // both lines used: wait, then scroll up
                    arrow.opacity = 1;
                } else {
                    lineIdx++;               // move down to the second line
                    charPos = 0;
                    lineObjs.push(makeLine(lineIdx));
                }
            }
        });

        function scrollUp() {
            state = "scrolling";
            arrow.opacity = 0;
            const from = -topLine * LINE_H;
            tween(from, from - LINE_H, SCROLL_TIME, (v) => (scroller.pos.y = Math.round(v))).onEnd(() => {
                lineObjs[topLine].set(""); // that line has scrolled out; clear its last sliver
                topLine++;
                lineIdx++;
                charPos = 0;
                lineObjs.push(makeLine(lineIdx));
                state = "typing";
            });
        }

        function finish() {
            if (state === "done") return;
            state = "done";
            session.introPlayed = true;
            go(NEXT_SCENE);
        }

        function press() {
            if (state === "waitScroll") {
                play("text-advance", { volume: 0.35 });
                scrollUp();
            } else if (state === "waitNext") {
                play("text-advance", { volume: 0.35 });
                msg++;
                if (msg >= STORY.length) finish();
                else startMessage(msg);
            }
            // while typing, holding the button speeds the text up instead
        }

        onKeyPress("space", press);
        onKeyPress("enter", press);
        onMousePress(press);
        onKeyPress("escape", finish);
    });
}
