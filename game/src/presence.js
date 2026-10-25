const DIRECTIONS = new Set(["up", "down", "left", "right"]);

export function validPosition(value, bounds) {
    return value && Number.isFinite(value.x) && Number.isFinite(value.y)
        && value.x >= bounds.left + 32 && value.x <= bounds.right - 32
        && value.y >= bounds.top + 32 && value.y <= bounds.bottom - 32;
}

/** Adapter for socket-keyed current-room snapshots. Time is seconds. */
export function createPresence({ socket, mapId, bounds, getLocal, now, onChomp = () => {} }) {
    const records = new Map();
    let lastSent = null;
    let lastSentAt = -Infinity;
    let disposed = false;

    function send() {
        const value = getLocal();
        socket.emit("update_position", value);
        lastSent = { ...value };
        lastSentAt = now();
    }
    function connected() {
        records.clear();
        lastSent = null;
        socket.emit("join_room", { room: mapId, ...getLocal() });
        send();
    }
    function disconnected() {
        records.clear();
        lastSent = null;
    }
    function received(data) {
        if (!socket.connected || !data?.room || typeof data.room !== "object" || Array.isArray(data.room)) return;
        const latest = new Map();
        for (const [id, row] of Object.entries(data.room)) {
            if (id === socket.id
                || !validPosition(row, bounds) || !DIRECTIONS.has(row.direction)) continue;
            latest.set(id, { x: row.x, y: row.y, direction: row.direction, active: true });
        }
        for (const id of records.keys()) if (!latest.has(id)) records.delete(id);
        for (const [id, value] of latest) {
            records.set(id, value);
        }
    }
    function chomp(value) {
        if (socket.connected && validPosition(value, bounds)) onChomp({ x: value.x, y: value.y });
    }
    const handlers = { connect: connected, disconnect: disconnected, update_data: received, chomp };
    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);

    return {
        records,
        step() {
            if (disposed) return;
            if (!socket.connected) return;
            const value = getLocal();
            const changed = !lastSent || value.x !== lastSent.x || value.y !== lastSent.y
                || value.direction !== lastSent.direction;
            const elapsed = now() - lastSentAt;
            if ((changed && elapsed >= 0.1 - 1e-9) || elapsed >= 1) send();
        },
        bite() {
            if (!disposed && socket.connected) {
                const { x, y } = getLocal();
                socket.emit("chomp", { x, y });
            }
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
            socket.disconnect();
            records.clear();
        },
    };
}
