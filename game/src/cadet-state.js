export const MAX_CADETS = 128;
const directions = new Set(["up", "down", "left", "right"]);

export function validCadets(value, bounds) {
    if (!Array.isArray(value) || value.length > MAX_CADETS) return false;
    const ids = new Set();
    return value.every((row) => {
        if (!row || typeof row.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(row.id)
            || ids.has(row.id) || !Number.isFinite(row.x) || !Number.isFinite(row.y)
            || row.x < bounds.left + 32 || row.x > bounds.right - 32
            || row.y < bounds.top + 32 || row.y > bounds.bottom - 32
            || !directions.has(row.direction) || typeof row.moving !== "boolean") return false;
        ids.add(row.id);
        return true;
    });
}
