// Player names. The username is a short handle (rev_fan12); the display name is
// what other players see under your dog (Ashi T). Both are saved in this browser.
// express/server.js checks the same rules before sharing names with a room.

export const USERNAME_MAX = 16;
export const DISPLAY_NAME_MAX = 20;
const USERNAME = /^[A-Za-z0-9_]{3,16}$/;
// The pixel font only has plain Latin characters, and KAPLAY reads [ ] as text styling.
const DISPLAY_CHAR = /^[A-Za-z0-9 _.'!?&-]$/;
const STORAGE_KEY = "revs-day-off.profile";

export const profile = { username: "", displayName: "" };

export function validUsername(value) {
    return typeof value === "string" && USERNAME.test(value);
}

export function validDisplayName(value) {
    return typeof value === "string" && value.length >= 1 && value.length <= DISPLAY_NAME_MAX
        && value === value.trim() && !value.includes("  ") && [...value].every((char) => DISPLAY_CHAR.test(char));
}

// Whether char may be typed into a field that currently holds value.
export function acceptsChar(field, value, char) {
    if (field === "username") return value.length < USERNAME_MAX && /^[A-Za-z0-9_]$/.test(char);
    return value.length < DISPLAY_NAME_MAX && DISPLAY_CHAR.test(char) && !(char === " " && (!value || value.endsWith(" ")));
}

// Trim the typed display name; a blank one falls back to the username.
export function finishDisplayName(value, username) {
    const trimmed = value.trim();
    return trimmed || username;
}

// Each returns an error message to show, or "" when the value is fine.
export function usernameError(username) {
    if (username.length < 3) return "Username needs at least 3 characters.";
    if (!validUsername(username)) return "Username: letters, numbers and _ only.";
    return "";
}

export function profileError(username, displayName) {
    const error = usernameError(username);
    if (error) return error;
    if (!validDisplayName(displayName)) return "Display name has a character that can't be shown.";
    return "";
}

export function hasProfile() {
    return validUsername(profile.username) && validDisplayName(profile.displayName);
}

// Storage can be missing or throw (private windows, blocked site data), so every access is guarded.
export function loadProfile(storage = globalThis.localStorage) {
    try {
        const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null");
        if (validUsername(saved?.username) && validDisplayName(saved?.displayName)) {
            profile.username = saved.username;
            profile.displayName = saved.displayName;
        }
    } catch { /* keep the blank profile */ }
    return profile;
}

export function saveProfile(username, displayName, storage = globalThis.localStorage) {
    profile.username = username;
    profile.displayName = displayName;
    try {
        storage?.setItem(STORAGE_KEY, JSON.stringify({ username, displayName }));
    } catch { /* still named for this visit */ }
}
