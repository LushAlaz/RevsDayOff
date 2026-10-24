export function addItem(position, rarity) {
    const Rarity = {
        Common: 1,
        Rare: 2,
        Epic: 3,
        Legendary: 4
    }
    
    let item = add([
        pos(position),
        sprite("bean"),
        {
            rarity: rarity
        }
    ])

    return item
}