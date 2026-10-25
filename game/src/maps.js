import { FIELD_LAYOUT } from "./field.js";
import { SHOP } from "./shop.js";

// Inset the bottom edge so Rev can approach from below without a large gap.
// Preserve the raised top edges and the original terrain artwork.
const collisionBounds = (box) => ({ ...box, top: box.top - 16, bottom: box.bottom - 16 });

const tree = (x, y) => ({ x, y, obstacle: collisionBounds({ left: x - 14, top: y - 18, right: x + 14, bottom: y + 10 }) });
const parkTrees = [[330, 200], [580, 380], [780, 700], [1080, 200], [1660, 240],
    [1720, 700], [300, 760], [1450, 810], [600, 850], [920, 820]].map(([x, y]) => tree(x, y));
const drillTrees = [[340, 400], [930, 120]].map(([x, y]) => tree(x, y));
const pond = { left: 1220, top: 300, right: 1580, bottom: 600 };
const benches = [
    { left: 600, top: 215, right: 660, bottom: 235 },
    { left: 1010, top: 710, right: 1070, bottom: 730 },
    { left: 350, top: 520, right: 410, bottom: 540 },
];

export const MAPS = [
    { id: "kyle-field", name: "Kyle Field", bounds: FIELD_LAYOUT.bounds, spawn: FIELD_LAYOUT.center,
        description: "Maybe you'll find the team!", size: "Medium", pin: { x: 248, y: 346 },
        trees: [], benches: [], obstacles: [SHOP.obstacle] },
    { id: "aggie-park", name: "Aggie Park", bounds: { left: 0, top: 0, right: 1920, bottom: 960 },
        spawn: { x: 960, y: 480 }, description: "Biggest area and the best loot!", size: "Large", pin: { x: 498, y: 342 },
        trees: parkTrees, benches, pond, obstacles: [SHOP.obstacle, collisionBounds(pond), ...parkTrees.map((entry) => entry.obstacle), ...benches.map(collisionBounds)] },
    { id: "drill-field", name: "Drill Field", bounds: { left: 0, top: 0, right: 1080, bottom: 480 },
        spawn: { x: 540, y: 240 }, description: "The Corp will be pissed...", size: "Small", pin: { x: 320, y: 170 },
        trees: drillTrees, benches: [], obstacles: [SHOP.obstacle, ...drillTrees.map((entry) => entry.obstacle)] },
];

export function getMap(mapId = "kyle-field") {
    return MAPS.find((map) => map.id === mapId) ?? MAPS[0];
}

export function getShopReturn(mapId) {
    return { mapId: getMap(mapId).id, spawn: { ...SHOP.returnSpawn } };
}

export function cycleMap(mapId, direction) {
    const index = MAPS.indexOf(getMap(mapId));
    return MAPS[(index + direction + MAPS.length) % MAPS.length];
}
