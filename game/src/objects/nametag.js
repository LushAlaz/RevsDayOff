// A display name under a dog's feet, clear of the "Sniffing..." and "Digging..." labels above her head.
// mine: gold for your own dog, cream for other players.
export function addNameTag(dog, name, { mine = false } = {}) {
    return dog.add([
        text(name, { font: "pixel", size: 8 }), pos(0, 40), anchor("center"),
        color(mine ? rgb(255, 214, 102) : rgb(245, 242, 229)), outline(2, rgb(30, 25, 25)), z(4),
    ]);
}
