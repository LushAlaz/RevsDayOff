import { validCadets } from "./cadet-state.js";
import { createBevoClient } from "./bevo-state.js";
import { validKnockback } from "./knockback.js";
import { validUsername, validDisplayName } from "./profile.js";
const DIRECTIONS = new Set(["up", "down", "left", "right"]);

export function validPosition(value, bounds) {
    return value && Number.isFinite(value.x) && Number.isFinite(value.y)
        && value.x >= bounds.left + 32 && value.x <= bounds.right - 32
        && value.y >= bounds.top + 32 && value.y <= bounds.bottom - 32;
}

/** Adapter for socket-keyed current-room snapshots. Time is seconds. */
// getProfile: { username, displayName } sent once when joining a room, so others can show the name.
export function createPresence({ socket, mapId, bounds, getLocal, now, getProfile = () => ({}), onChomp = () => {}, onFound = () => {},
    onBevoState = () => {}, onBevoHit = () => {}, onForcedMovement = () => {} }) {
    const records = new Map();
    let lastSent = null;
    let lastSentAt = -Infinity;
    let disposed = false;
    let digging = false;
    const boss = createBevoClient({ socket, mapId, now, onState: onBevoState,
        onHit: onBevoHit });

    function sendDigging() {
        const { x, y } = getLocal();
        socket.emit("sniffing", { x, y, active: digging });
    }

    function send() {
        // Rendered intermediate positions must not overwrite server movement,
        // including when a delayed hit arrives after the server's stun ended.
        if (boss.stunned) return;
        const value = getLocal();
        socket.emit("update_position", value);
        lastSent = { ...value };
        lastSentAt = now();
    }
    function connected() {
        records.clear();
        lastSent = null;
        socket.emit("join_room", { room: mapId, ...getLocal(), ...getProfile() });
        send();
        if (digging) sendDigging();
    }
    function disconnected() {
        records.clear();
        lastSent = null;
        boss.clear();
        onForcedMovement(null);
    }
    function received(data) {
        if (!socket.connected || !data?.room || typeof data.room !== "object" || Array.isArray(data.room)) return;
        const latest = new Map();
        for (const [id, row] of Object.entries(data.room)) {
            if (!validPosition(row, bounds) || !DIRECTIONS.has(row.direction)) continue;
            const knockback = mapId === "drill-field" && Number.isFinite(data.serverNow)
                && validKnockback(row.knockback) && row.knockback.encounterId === boss.state?.encounterId
                ? row.knockback : null;
            if (id === socket.id) {
                if (knockback) {
                    boss.syncKnockback(knockback, data.serverNow);
                    onForcedMovement(knockback, data.serverNow);
                }
                continue;
            }
            latest.set(id, { x: row.x, y: row.y, direction: row.direction, active: true,
                knockback, serverNow: data.serverNow,
                cadets: validCadets(row.cadets, bounds) ? row.cadets : [],
                digging: row.digging === true, sniffing: row.sniffing === true && row.digging !== true,
                username: validUsername(row.username) ? row.username : null,
                displayName: validDisplayName(row.displayName) ? row.displayName : null });
        }
        for (const id of records.keys()) if (!latest.has(id)) records.delete(id);
        for (const [id, value] of latest) {
            records.set(id, value);
        }
    }
    function chomp(value) {
        if (socket.connected && validPosition(value, bounds)) onChomp({ x: value.x, y: value.y });
    }
    function found(value) {
        if (socket.connected && typeof value?.id === "string" && value.id !== socket.id
            && validPosition(value, bounds)) onFound({ id: value.id, x: value.x, y: value.y });
    }
    const handlers = { connect: connected, disconnect: disconnected, update_data: received, chomp, "dug-up": found };
    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);

    return {
        records,
        boss,
        setDigging(active) {
            if (disposed || typeof active !== "boolean" || digging === active) return;
            digging = active;
            if (socket.connected) sendDigging();
        },
        reportFind(position) {
            if (!disposed && socket.connected && validPosition(position, bounds)) {
                socket.emit("dug-up", { x: position.x, y: position.y });
            }
        },
        step() {
            if (disposed) return;
            if (!socket.connected) return;
            const value = getLocal();
            const changed = !lastSent || value.x !== lastSent.x || value.y !== lastSent.y
                || value.direction !== lastSent.direction || value.sniffing !== lastSent.sniffing
                || JSON.stringify(value.cadets) !== JSON.stringify(lastSent.cadets);
            const membershipChanged = (value.cadets ?? []).map((c) => c.id).join(",")
                !== (lastSent?.cadets ?? []).map((c) => c.id).join(",");
            const elapsed = now() - lastSentAt;
            if (membershipChanged || (changed && elapsed >= 0.1 - 1e-9) || elapsed >= 1) send();
        },
        bite() {
            if (!disposed && socket.connected) {
                const { x, y } = getLocal();
                socket.emit("chomp", { x, y });
                boss.bite();
            }
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            boss.dispose();
            onForcedMovement(null);
            for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
            socket.disconnect();
            records.clear();
        },
    };
}
