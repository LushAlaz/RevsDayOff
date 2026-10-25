import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { musicFor, bevoRoars, createMusicPlayer, TRACKS, EFFECTS, MUSIC_VOLUME } from "../src/music.js";

test("menus share the menu theme, each map has its own, and the shop is silent for now", () => {
    for (const scene of ["title", "intro", "profile", "leaderboard", "mapSelect"]) assert.equal(musicFor(scene), "menu", scene);
    assert.equal(musicFor("explore", "aggie-park"), "aggiePark");
    assert.equal(musicFor("explore", "kyle-field"), "kyleField");
    assert.equal(musicFor("explore", "drill-field"), "drillField");
    assert.equal(musicFor("shop"), null);
});

test("the Bevo fight theme takes over the Drill Field only while he's up", () => {
    assert.equal(musicFor("explore", "drill-field", { bossActive: true }), "bevoFight");
    assert.equal(musicFor("explore", "drill-field", { bossActive: false }), "drillField");
    assert.equal(musicFor("explore", "kyle-field", { bossActive: true }), "kyleField", "Bevo only lives on the Drill Field");
});

test("Bevo roars once as he appears and once per charge, not on every update", () => {
    assert.equal(bevoRoars("dormant", "spawning"), true);
    assert.equal(bevoRoars(null, "spawning"), true, "joining while he spawns");
    assert.equal(bevoRoars("spawning", "spawning"), false);
    assert.equal(bevoRoars("windup", "charging"), true, "every charge");
    assert.equal(bevoRoars("charging", "charging"), false, "one roar per charge");
    for (const phase of ["chasing", "windup", "recovering", "defeated", "dormant"]) {
        assert.equal(bevoRoars("spawning", phase), false, phase);
    }
    // a full fight cycle: one roar to appear, then one each time he charges
    const phases = ["dormant", "spawning", "spawning", "chasing", "windup", "charging", "charging", "recovering",
        "chasing", "windup", "charging", "recovering", "defeated"];
    const roars = phases.filter((phase, i) => bevoRoars(phases[i - 1] ?? null, phase)).length;
    assert.equal(roars, 3);
});

test("every track and effect file exists, with a lowercase name so it also loads on Vercel's case-sensitive servers", () => {
    for (const path of [...Object.values(TRACKS), ...Object.values(EFFECTS)]) {
        assert.ok(existsSync(new URL(`../public/${path}`, import.meta.url)), path);
        assert.equal(path, path.toLowerCase());
    }
});

// A fake clock: timers only run when tick() is called.
// blocked: the browser hasn't allowed sound yet, so tracks start paused
function harness({ saved = {}, blocked = false } = {}) {
    const timers = new Map();
    let nextId = 0;
    const started = [];
    const storage = { getItem: (key) => saved[key] ?? null, setItem: (key, value) => { saved[key] = value; } };
    const music = createMusicPlayer({
        play: (track) => {
            const sound = { track, volume: 1, stopped: false, paused: blocked, stop() { this.stopped = true; } };
            started.push(sound);
            return sound;
        },
        storage,
        every: (fn) => { timers.set(++nextId, fn); return nextId; },
        cancel: (id) => timers.delete(id),
    });
    const tick = (count = 40) => { for (let i = 0; i < count; i++) for (const fn of [...timers.values()]) fn(); };
    return { music, started, tick, saved };
}

test("a track fades in, keeps playing through scenes that share it, and crossfades to the next", () => {
    const { music, started, tick } = harness();
    music.set("menu");
    assert.equal(started[0].volume, 0, "starts silent");
    tick();
    assert.equal(started[0].volume, MUSIC_VOLUME);
    music.set("menu");
    assert.equal(started.length, 1, "same track does not restart");
    music.set("aggiePark");
    tick();
    assert.equal(started[0].stopped, true, "old track fades out then stops");
    assert.equal(started[1].track, "aggiePark");
    assert.equal(started[1].volume, MUSIC_VOLUME);
    music.set(null);
    tick();
    assert.equal(started[1].stopped, true, "silent places stop the music");
    assert.equal(music.track, null);
});

test("M mutes and unmutes, and the choice is remembered on the next visit", () => {
    const first = harness();
    first.music.set("menu");
    first.tick();
    assert.equal(first.music.toggleMute(), true);
    first.tick();
    assert.equal(first.started[0].volume, 0);
    assert.equal(first.saved["revsdayoff.musicMuted"], "true");
    first.music.set("aggiePark");
    first.tick();
    assert.equal(first.started[1].volume, 0, "new tracks stay muted");

    const next = harness({ saved: first.saved });
    assert.equal(next.music.muted, true);
    next.music.set("menu");
    next.tick();
    assert.equal(next.started[0].volume, 0);
    next.music.toggleMute();
    next.tick();
    assert.equal(next.started[0].volume, MUSIC_VOLUME);
});

test("a track blocked before the first click or key starts on that input, and only then", () => {
    const { music, started } = harness({ blocked: true });
    music.set("menu");
    assert.equal(started[0].paused, true, "browser blocked it");
    music.set("menu");
    assert.equal(started[0].paused, true, "same track: set() alone never retries");
    music.resume();
    assert.equal(started[0].paused, false, "the first input starts it");
    assert.equal(started.length, 1, "resumed, not restarted");
    music.set(null);
    music.resume();
});
