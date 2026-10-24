export const ITEMS = [
    { id: "towel", name: "Aggie Rally Towel", sprite: "loot-towel", path: "sprites/towel-preview.png", sliceX: 4 },
    { id: "jersey", name: "Aggie Jersey", sprite: "loot-jersey", path: "sprites/jersey-10-back-preview.png", sliceX: 1 },
    { id: "ring", name: "Aggie Ring", sprite: "loot-ring", path: "sprites/ring.png", sliceX: 4 },
];

export const RARITIES = {
    Common: { weight: 60, speed: 120, arc: 90, color: [210, 220, 214] },
    Rare: { weight: 25, speed: 180, arc: 60, color: [100, 185, 255] },
    Epic: { weight: 12, speed: 240, arc: 40, color: [211, 132, 255] },
    Legendary: { weight: 3, speed: 300, arc: 24, color: [255, 207, 82] },
};
