// ---------------------------------------------------------------
// Pond ducks: a mama mallard and her ducklings swimming in a line.
// When Rev comes near the pond, mama paddles to the spot on the water
// closest to her, so the family trails Rev as she walks around the bank.
// Otherwise mama drifts between random spots on the pond.
// They're drawn from small pixel maps, so there's no sprite to load.
// ---------------------------------------------------------------

import { addBubble, addPrompt } from "./bubble.js";

export const DUCK_PIXEL = 3;          // screen pixels per art pixel (matches the cadets)
export const FOLLOW_RANGE = 240;      // Rev this close to the pond gets followed
export const MAMA_SPEED = 110;        // pixels per second
export const DUCKLING_SPACING = 30;   // center-to-center gap between ducks in the line
export const TALK_RANGE = 130;        // Rev on the bank this close to a duck can talk to them
export const DUCK_LINE = "Quack! Marcel Reed is a Heisman candidate!";
const TALK_SECONDS = 3.5;
const POND_INSET = { x: 44, y: 34 };  // keeps a whole duck on the water, clear of the rounded bank

// Facing right. g green head, k eye, o beak, w white collar, b brown body, d wing, y yellow, . empty
const MAMA = [
    "......ggg..",
    ".....ggkgoo",
    ".....gggg..",
    "bb....ww...",
    "bbbbddddbb.",
    ".bbbbbbbbb.",
    "..bbbbbbb..",
];
const DUCKLING = [
    "....yy.",
    "....yko",
    "y..yy..",
    "yyddyy.",
    ".yyyy..",
];
const COLORS = {
    g: [38, 110, 62], k: [20, 20, 20], o: [236, 150, 40], w: [240, 240, 232],
    b: [124, 92, 66], d: [92, 66, 48], y: [250, 214, 72],
};

// The part of the pond a duck's center can reach.
export function swimArea(pond) {
    return {
        left: pond.left + POND_INSET.x, right: pond.right - POND_INSET.x,
        top: pond.top + POND_INSET.y, bottom: pond.bottom - POND_INSET.y,
    };
}

// Where mama heads to follow Rev: the closest point on the water to her,
// or null when she's too far from the pond to bother.
export function followTarget(area, dog, range = FOLLOW_RANGE) {
    const x = Math.max(area.left, Math.min(area.right, dog.x));
    const y = Math.max(area.top, Math.min(area.bottom, dog.y));
    return Math.hypot(dog.x - x, dog.y - y) <= range ? { x, y } : null;
}

// Move from toward to by at most step; returns the new point.
export function stepToward(from, to, step) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= step) return { x: to.x, y: to.y };
    return { x: from.x + dx / distance * step, y: from.y + dy / distance * step };
}

// A duckling paddles until it's spacing behind the duck ahead of it.
export function trail(from, leader, spacing = DUCKLING_SPACING) {
    const distance = Math.hypot(leader.x - from.x, leader.y - from.y);
    if (distance <= spacing) return { x: from.x, y: from.y };
    return stepToward(from, leader, distance - spacing);
}

// Easter egg: Rev can talk to the family when she's close to any of them.
export function canReachDucks(dog, ducks, range = TALK_RANGE) {
    return ducks.some((duck) => Math.hypot(duck.x - dog.x, duck.y - dog.y) <= range);
}

// Each pixel map is painted once into a small sprite, shared by every duck that uses it.
const duckSprites = new Map();
function duckSprite(art, wing) {
    const key = art.join("") + wing;
    if (!duckSprites.has(key)) {
        const canvas = document.createElement("canvas");
        canvas.width = art[0].length * DUCK_PIXEL;
        canvas.height = art.length * DUCK_PIXEL;
        const ctx = canvas.getContext("2d");
        art.forEach((row, ry) => [...row].forEach((cell, rx) => {
            if (cell === ".") return;
            ctx.fillStyle = `rgb(${(cell === "d" && wing ? wing : COLORS[cell]).join(",")})`;
            ctx.fillRect(rx * DUCK_PIXEL, ry * DUCK_PIXEL, DUCK_PIXEL, DUCK_PIXEL);
        }));
        duckSprites.set(key, loadSprite(null, canvas));
    }
    return duckSprites.get(key);
}

function addDuck(art, start, wing) {
    const width = art[0].length * DUCK_PIXEL;
    const height = art.length * DUCK_PIXEL;
    const look = duckSprite(art, wing);
    return add([
        pos(start.x, start.y),
        z(-80), // above the water, below Rev, trees and benches
        "duck",
        {
            facing: 1,
            bob: Math.random() * Math.PI * 2,
            draw() {
                const lift = Math.round(Math.sin(time() * 4 + this.bob)) * DUCK_PIXEL / 3;
                // a pale ripple under the body
                drawRect({ pos: vec2(-width / 2 - 3, height / 2 - 4), width: width + 6, height: 4, color: rgb(150, 205, 215), opacity: 0.7 });
                if (look.data) drawSprite({ sprite: look.data, pos: vec2(0, lift), anchor: "center", flipX: this.facing < 0 });
            },
        },
    ]);
}

// pond:    the map's pond rectangle; dog: the player to follow
// canTalk: return false while Space belongs to something else (sniffing, a challenge, the bag)
export function addDucks(pond, dog, { ducklings = 3, canTalk = () => true } = {}) {
    const area = swimArea(pond);
    const start = { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 };
    const family = [addDuck(MAMA, start)];
    for (let i = 1; i <= ducklings; i++) {
        family.push(addDuck(DUCKLING, { x: start.x - i * DUCKLING_SPACING, y: start.y }, [214, 168, 40]));
    }
    const mama = family[0];
    let wander = null;
    let restUntil = 0;

    mama.onUpdate(() => {
        let target = followTarget(area, dog.pos);
        if (target) {
            wander = null;
        } else {
            // no one to follow: drift to a random spot, rest a moment, repeat
            if (!wander && time() >= restUntil) {
                wander = { x: rand(area.left, area.right), y: rand(area.top, area.bottom) };
            }
            target = wander;
        }
        const speed = target === wander ? MAMA_SPEED / 3 : MAMA_SPEED;
        family.forEach((duck, index) => {
            const before = duck.pos.x;
            const next = index === 0
                ? (target ? stepToward(duck.pos, target, speed * dt()) : duck.pos)
                : trail(duck.pos, family[index - 1].pos);
            duck.pos = vec2(next.x, next.y);
            // only turn on a real change of direction so they don't flicker
            if (Math.abs(duck.pos.x - before) > 0.2) duck.facing = Math.sign(duck.pos.x - before);
        });
        if (wander && mama.pos.dist(vec2(wander.x, wander.y)) < 1) {
            wander = null;
            restUntil = time() + rand(1, 3);
        }
    });

    // ---------------- talking ----------------
    const inReach = () => canTalk() && canReachDucks(dog.pos, family.map((duck) => duck.pos));
    const prompt = addPrompt("Space: Talk to the ducks");
    let bubble = null;
    prompt.onUpdate(() => { prompt.hidden = !!bubble || !inReach(); });
    onKeyPress("space", () => {
        if (!inReach()) return;
        if (bubble) destroy(bubble);
        // rides above mama while she swims
        bubble = addBubble(() => mama.pos, DUCK_LINE, { seconds: TALK_SECONDS });
        bubble.onDestroy(() => { bubble = null; });
    });
    return family;
}
