export function addPlayer() {
    const SPD = 300

    let player = add([
        pos(120, 80),
        sprite("bean"),
        {
            items: [metalde]
        }
    ])

    onKeyDown("w", () => {
        player.move(0, -SPD)
    })

    onKeyDown("s", () => {
        player.move(0, SPD)
    })

    onKeyDown("a", () => {
        player.move(-SPD, 0)
    })

    onKeyDown("d", () => {
        player.move(SPD, 0)
    })

    // when 1 pressed, equip
    // when click, use equipped item
}