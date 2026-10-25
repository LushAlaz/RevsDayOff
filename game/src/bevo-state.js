import rules from "./bevo-rules.json" with { type: "json" };
import { validKnockback } from "./knockback.js";
export const BEVO_MARKER = Object.freeze(rules.marker);
export const BEVO_SUMMON_RANGE = rules.summonRange;
const phases = new Set(["dormant", "spawning", "chasing", "windup", "charging", "recovering", "defeated"]);
const directions = new Set(["up", "down", "left", "right"]);
export const isBevoActive = (state) => !!state && !["dormant", "defeated"].includes(state.phase);

export function validBevoState(value) {
    return value && Number.isSafeInteger(value.encounterId) && value.encounterId >= 0
        && Number.isSafeInteger(value.sequence) && value.sequence >= 0 && phases.has(value.phase)
        && Number.isFinite(value.x) && value.x >= 40 && value.x <= 1040
        && Number.isFinite(value.y) && value.y >= 40 && value.y <= 440
        && directions.has(value.facing) && Number.isFinite(value.hp) && value.hp >= 0
        && value.maxHp === rules.hp && value.hp <= value.maxHp
        && (value.target === null || typeof value.target === "string")
        && Number.isFinite(value.chargeDirection?.x) && Number.isFinite(value.chargeDirection?.y)
        && Math.abs(value.chargeDirection.x) <= 1 && Math.abs(value.chargeDirection.y) <= 1
        && Number.isFinite(value.phaseEndsAt) && Number.isFinite(value.resummonAt) && Number.isFinite(value.serverNow);
}

/** Network intent and snapshot adapter. No boss simulation runs on a client. */
export function createBevoClient({ socket, mapId, now, onState = () => {}, onHit = () => {} }) {
    let state = null, receivedAt = 0, lastHit = -1, stunnedUntil = 0, disposed = false;
    const enabled = () => !disposed && socket.connected && mapId === "drill-field";
    const serverTime = () => state ? state.serverNow + now() - receivedAt : 0;
    function receive(value) {
        if (!enabled() || !validBevoState(value) || (state && (value.encounterId < state.encounterId
            || value.sequence <= state.sequence))) return;
        if (state?.encounterId !== value.encounterId) { lastHit = -1; stunnedUntil = 0; }
        state = value; receivedAt = now(); onState(state);
    }
    function hit(value) {
        if (!enabled() || !state || !validKnockback(value) || value.encounterId !== state.encounterId
            || value.hitId <= lastHit) return;
        lastHit = value.hitId; stunnedUntil = now() + value.stunDuration; onHit(value);
    }
    function clear() { state = null; stunnedUntil = 0; lastHit = -1; onState(null); }
    socket.on("bevo_state", receive); socket.on("bevo_hit", hit);
    return {
        get state() { return state; },
        get active() { return isBevoActive(state); },
        get stunned() { return now() < stunnedUntil; },
        clear,
        syncKnockback(value, serverNow) {
            if (!enabled() || !state || !validKnockback(value) || value.encounterId !== state.encounterId
                || !Number.isFinite(serverNow) || value.hitId <= lastHit) return;
            lastHit = Math.max(lastHit, value.hitId);
            stunnedUntil = Math.max(stunnedUntil, now() + Math.max(0, value.startedAt + value.stunDuration - serverNow));
        },
        cooldown() { return state ? Math.max(0, state.resummonAt - serverTime()) : 0; },
        canSummon(position) {
            return enabled() && !!state && !isBevoActive(state) && now() >= stunnedUntil
                && serverTime() >= state.resummonAt
                && Math.hypot(position.x - BEVO_MARKER.x, position.y - BEVO_MARKER.y) <= BEVO_SUMMON_RANGE;
        },
        summon(position) {
            if (!this.canSummon(position)) return false;
            socket.emit("bevo_summon", { encounterId: state.encounterId }); return true;
        },
        bite() {
            if (enabled() && isBevoActive(state) && state.phase !== "spawning" && now() >= stunnedUntil)
                socket.emit("bevo_bite", { encounterId: state.encounterId });
        },
        dispose() {
            disposed = true;
            socket.off("bevo_state", receive); socket.off("bevo_hit", hit);
            clear();
        },
    };
}
