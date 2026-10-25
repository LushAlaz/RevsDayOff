import { test } from "node:test";
import assert from "node:assert/strict";
import {
    profile, validUsername, validDisplayName, acceptsChar, finishDisplayName, profileError, usernameError,
    loadProfile, saveProfile, hasProfile,
} from "../src/profile.js";
import { createPresence } from "../src/presence.js";

function memoryStorage(initial = {}) {
    const data = { ...initial };
    return { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); }, data };
}

test("usernames are 3-16 letters, numbers or underscores", () => {
    for (const ok of ["rev", "rev_fan12", "A_B_C_D_E_F_G_H1"]) assert.equal(validUsername(ok), true, ok);
    for (const bad of ["", "ab", "has space", "rev-fan", "x".repeat(17), "[rev]", 42, null]) {
        assert.equal(validUsername(bad), false, String(bad));
    }
    assert.equal(usernameError("ab"), "Username needs at least 3 characters.");
    assert.equal(usernameError("rev_fan"), "");
});

test("display names allow spaces and simple punctuation the pixel font can draw", () => {
    for (const ok of ["Ashi", "Ashi T.", "Gig 'Em!", "A&M fan - 12", "x".repeat(20)]) {
        assert.equal(validDisplayName(ok), true, ok);
    }
    // brackets would turn into KAPLAY text styling; emoji aren't in the font
    for (const bad of ["", " Ashi", "Ashi ", "two  spaces", "[red]", "Rev 🐶", "x".repeat(21)]) {
        assert.equal(validDisplayName(bad), false, bad);
    }
});

test("typing filters each box as you go", () => {
    assert.equal(acceptsChar("username", "rev", "_"), true);
    assert.equal(acceptsChar("username", "rev", " "), false);
    assert.equal(acceptsChar("username", "x".repeat(16), "a"), false);
    assert.equal(acceptsChar("displayName", "Ashi", " "), true);
    assert.equal(acceptsChar("displayName", "", " "), false);
    assert.equal(acceptsChar("displayName", "Ashi ", " "), false);
    assert.equal(acceptsChar("displayName", "Ashi", "["), false);
    assert.equal(acceptsChar("displayName", "x".repeat(20), "a"), false);
});

test("a blank display name falls back to the username, and errors point at the right box", () => {
    assert.equal(finishDisplayName("  ", "rev_fan"), "rev_fan");
    assert.equal(finishDisplayName(" Ashi T ", "rev_fan"), "Ashi T");
    assert.equal(profileError("ab", "Ashi"), "Username needs at least 3 characters.");
    assert.equal(profileError("rev_fan", "Ashi"), "");
});

test("the profile saves to and loads from storage, ignoring bad or broken saves", () => {
    const storage = memoryStorage();
    saveProfile("rev_fan", "Ashi T", storage);
    profile.username = ""; profile.displayName = "";
    assert.equal(hasProfile(), false);
    loadProfile(storage);
    assert.deepEqual({ ...profile }, { username: "rev_fan", displayName: "Ashi T" });
    assert.equal(hasProfile(), true);

    profile.username = ""; profile.displayName = "";
    loadProfile(memoryStorage({ "revs-day-off.profile": "{not json" }));
    loadProfile(memoryStorage({ "revs-day-off.profile": JSON.stringify({ username: "a b", displayName: "x" }) }));
    loadProfile({ getItem() { throw new Error("blocked"); } });
    assert.equal(hasProfile(), false);
    // a storage that refuses writes still names the player for this visit
    saveProfile("rev_fan", "Ashi", { setItem() { throw new Error("blocked"); } });
    assert.equal(profile.displayName, "Ashi");
});

test("presence sends the name when joining and only keeps valid names from others", () => {
    const handlers = new Map();
    const emitted = [];
    const socket = { id: "self", connected: true, on: (event, fn) => handlers.set(event, fn), off() {},
        emit: (event, data) => emitted.push({ event, data }), disconnect() {} };
    const presence = createPresence({ socket, mapId: "kyle-field", bounds: { left: 0, top: 0, right: 1440, bottom: 640 },
        getLocal: () => ({ x: 100, y: 100, direction: "down" }), now: () => 0,
        getProfile: () => ({ username: "rev_fan", displayName: "Ashi T" }) });
    handlers.get("connect")();
    const join = emitted.find(({ event }) => event === "join_room").data;
    assert.equal(join.username, "rev_fan");
    assert.equal(join.displayName, "Ashi T");

    const spot = { y: 300, direction: "left" };
    handlers.get("update_data")({ room: {
        named: { ...spot, x: 300, username: "gig_em", displayName: "Gig Em" },
        sneaky: { ...spot, x: 400, username: "bad", displayName: "[red]hi" },
        unnamed: { ...spot, x: 500 },
    } });
    assert.equal(presence.records.get("named").displayName, "Gig Em");
    assert.equal(presence.records.get("named").username, "gig_em");
    assert.equal(presence.records.get("sneaky").displayName, null);
    assert.equal(presence.records.get("unnamed").displayName, null);
    presence.dispose();
});

test("blocked localStorage access cannot crash profile loading or saving", (t) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const oldProfile = { ...profile };
    t.after(() => {
        if (original) Object.defineProperty(globalThis, "localStorage", original);
        else delete globalThis.localStorage;
        Object.assign(profile, oldProfile);
    });
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        get() { throw new Error("Storage blocked"); },
    });
    profile.username = "";
    profile.displayName = "";
    assert.doesNotThrow(() => loadProfile());
    assert.equal(hasProfile(), false);
    assert.doesNotThrow(() => saveProfile("rev_fan", "Rev Fan"));
    assert.equal(hasProfile(), true);
    assert.equal(profile.displayName, "Rev Fan");
});
