import rules from "./bevo-rules.json" with { type: "json" };
import geometry from "./world-geometry.json" with { type: "json" };

export function validKnockback(value) {
    const bounds = geometry.drillField.bounds;
    const point = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)
        && p.x >= bounds.left + 32 && p.x <= bounds.right - 32
        && p.y >= bounds.top + 32 && p.y <= bounds.bottom - 32;
    return value && Number.isSafeInteger(value.encounterId) && value.encounterId >= 0
        && Number.isSafeInteger(value.hitId) && value.hitId > 0
        && Number.isFinite(value.startedAt) && value.startedAt >= 0
        && value.duration === rules.knockbackTime && value.stunDuration === rules.stunTime
        && point(value) && point({ x: value.fromX, y: value.fromY })
        && Array.isArray(value.path) && value.path.length >= 2 && value.path.length <= 64
        && value.path.every(point) && value.path[0].x === value.fromX && value.path[0].y === value.fromY
        && value.path.at(-1).x === value.x && value.path.at(-1).y === value.y;
}

export function sampleKnockback(motion, elapsed) {
    const t = Math.max(0, Math.min(1, elapsed / motion.duration));
    const index = t * (2 - t) * (motion.path.length - 1);
    const a = motion.path[Math.floor(index)], b = motion.path[Math.min(motion.path.length - 1, Math.floor(index) + 1)];
    const fraction = index - Math.floor(index);
    return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

/** Display an authoritative route continuously, without restarting on each snapshot. */
export function createKnockbackPlayback(now) {
    let motion = null, started = 0, acceptedAt = 0, correctionTime = 0, offset, finished = false, endpointApplied = false;
    return {
        get motion() { return motion; },
        accept(value, serverNow, position) {
            if (!validKnockback(value) || !Number.isFinite(serverNow)
                || (motion && (value.encounterId < motion.encounterId
                    || (value.encounterId === motion.encounterId && value.hitId <= motion.hitId)))) return false;
            const elapsed = Math.max(0, serverNow - value.startedAt);
            if (elapsed >= value.stunDuration) return false;
            motion = value; acceptedAt = now(); started = acceptedAt - elapsed; finished = false; endpointApplied = false;
            const sample = sampleKnockback(motion, elapsed);
            // Start from the displayed position, correcting normal network drift
            // during the shove rather than snapping on its first frame.
            offset = { x: position.x - sample.x, y: position.y - sample.y };
            correctionTime = Math.max(0.05, motion.duration - elapsed);
            return true;
        },
        sample() {
            if (!motion || finished) return null;
            // A hidden tab may skip the entire animation. Apply its endpoint
            // once before handing control back, so a heartbeat cannot undo it.
            if (now() - started >= motion.stunDuration) {
                finished = true;
                return endpointApplied ? null : { x: motion.x, y: motion.y };
            }
            const position = sampleKnockback(motion, now() - started);
            const correction = Math.max(0, 1 - (now() - acceptedAt) / correctionTime);
            if (now() - started >= motion.duration && correction === 0) endpointApplied = true;
            return { x: position.x + offset.x * correction, y: position.y + offset.y * correction };
        },
        clear() { motion = null; offset = null; },
    };
}
