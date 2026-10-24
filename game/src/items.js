export const ITEMS = [
    { id: "towel", name: "12th Man Towel", rarity: "Rare", sprite: "loot-towel", path: "sprites/towel-preview.png", sliceX: 4 },
    { id: "jersey", name: "Marcel Reed Jersey", rarity: "Rare", sprite: "loot-jersey", path: "sprites/jersey-10-back-preview.png", sliceX: 1 },
    { id: "ring", name: "Aggie Ring", rarity: "Legendary", sprite: "loot-ring", path: "sprites/ring.png", sliceX: 4 },
    { id: "branch", name: "Century Tree Branch", rarity: "Epic", sprite: "loot-branch", path: "sprites/century-tree-branch.png", sliceX: 1 },
    { id: "tshirt", name: "A&M T-shirt", rarity: "Common", sprite: "loot-tshirt", path: "sprites/aggie-tshirt.png", sliceX: 1 },
    { id: "hat", name: "A&M Hat", rarity: "Common", sprite: "loot-hat", path: "sprites/aggie-cap.png", sliceX: 1 },
    { id: "meal", name: "Maroon Meal", rarity: "Common", sprite: "loot-meal", path: "sprites/maroon-meal.png.png", sliceX: 1 },
];

export const RARITIES = {
    Common: { weight: 60, speed: 120, arc: 90, sellPrice: 5, color: [210, 220, 214] },
    Rare: { weight: 25, speed: 180, arc: 60, sellPrice: 20, color: [100, 185, 255] },
    Epic: { weight: 12, speed: 240, arc: 40, sellPrice: 50, color: [211, 132, 255] },
    Legendary: { weight: 3, speed: 300, arc: 24, sellPrice: 150, color: [255, 207, 82] },
};
