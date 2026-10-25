// Background music: each scene (and each map) has a track, and moving between them
// crossfades. Scenes that share a track (title → intro → map select) keep it playing.
// M mutes, and the choice is saved in the browser.
//
// To add a track: drop the file in public/sounds/, add it to TRACKS, and name it in musicFor().

export const TRACKS = {
    menu: "sounds/menu-music.mp3",
    aggiePark: "sounds/aggie-park.mp3",
    kyleField: "sounds/kyle-field.mp3",
    drillField: "sounds/drill-field.mp3",
    bevoFight: "sounds/bevo-fight.mp3",
};
// short sound effects (not music, so M doesn't mute them)
export const EFFECTS = {
    "bevo-roar": "sounds/bevo-roar.mp3",
    "item-get": "sounds/item-get.mp3",
    "chomp": "sounds/chomp.mp3",
};

const MAP_MUSIC = {
    "aggie-park": "aggiePark",
    "kyle-field": "kyleField",
    "drill-field": "drillField",
};
const MENU_SCENES = new Set(["title", "intro", "profile", "leaderboard", "mapSelect"]);

export const MUSIC_VOLUME = 0.4;
export const FADE_SECONDS = 1;
const MUTE_KEY = "revsdayoff.musicMuted";

// The track for a scene, or null for silence. bossActive: a Bevo fight is on (Drill Field only).
export function musicFor(sceneName, mapId, { bossActive = false } = {}) {
    if (MENU_SCENES.has(sceneName)) return "menu";
    if (sceneName === "explore") return bossActive && mapId === "drill-field" ? "bevoFight" : MAP_MUSIC[mapId] ?? null;
    return null; // the shop, for now
}

// Bevo roars once as he appears and once at the start of every charge.
const ROAR_PHASES = new Set(["spawning", "charging"]);
export function bevoRoars(previousPhase, phase) {
    return ROAR_PHASES.has(phase) && previousPhase !== phase;
}

// play(track) starts a looping track and returns { volume, stop() }.
// Fades run on a plain timer, not KAPLAY tweens, because tweens die with the scene.
export function createMusicPlayer({ play, storage = globalThis.localStorage, every = (fn, ms) => setInterval(fn, ms),
    cancel = (id) => clearInterval(id), fadeSeconds = FADE_SECONDS, volume = MUSIC_VOLUME } = {}) {
    let current = null; // { track, sound }
    let muted = false;
    try { muted = storage?.getItem(MUTE_KEY) === "true"; } catch { /* storage blocked: start unmuted */ }

    // ramp sound.volume to target, then run done
    function fade(sound, target, done = () => {}) {
        const steps = Math.max(1, Math.round(fadeSeconds * 20));
        const start = sound.volume;
        let step = 0;
        const id = every(() => {
            step++;
            sound.volume = start + (target - start) * Math.min(1, step / steps);
            if (step >= steps) { cancel(id); done(); }
        }, 50);
        return id;
    }

    return {
        get track() { return current?.track ?? null; },
        get muted() { return muted; },
        set(track) {
            if (track === (current?.track ?? null)) return; // same track: keep playing
            if (current) {
                const old = current.sound;
                cancel(current.fading);
                fade(old, 0, () => old.stop());
            }
            current = null;
            if (!track) return;
            const sound = play(track);
            sound.volume = 0;
            current = { track, sound, fading: fade(sound, muted ? 0 : volume) };
        },
        // Browsers block sound until the player clicks or presses a key, so a track started
        // before that sits paused. Call this on input to start it.
        resume() {
            if (current?.sound.paused) current.sound.paused = false;
        },
        toggleMute() {
            muted = !muted;
            try { storage?.setItem(MUTE_KEY, String(muted)); } catch { /* still muted for this visit */ }
            if (current) { cancel(current.fading); current.fading = fade(current.sound, muted ? 0 : volume); }
            return muted;
        },
    };
}

let player = null;

// Call once after kaplay(): loads the tracks and turns on the M key.
export function loadMusicTracks() {
    for (const [name, url] of Object.entries(TRACKS)) loadMusic(name, url);
    for (const [name, url] of Object.entries(EFFECTS)) loadSound(name, url);
    player = createMusicPlayer({ play: (track) => play(track, { loop: true, volume: 0 }) });
    window.addEventListener("keydown", (event) => {
        player.resume();
        // the name screen needs the letter m for typing
        if (event.key.toLowerCase() === "m" && !event.repeat && getSceneName() !== "profile") player.toggleMute();
    });
    window.addEventListener("pointerdown", () => player.resume());
}

// Call at the start of each scene (and again when a Bevo fight starts or ends).
export function setSceneMusic(sceneName, mapId, options) {
    player?.set(musicFor(sceneName, mapId, options));
}
