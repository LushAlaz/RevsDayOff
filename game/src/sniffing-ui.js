/** Shared local/remote sniffing visuals. Children clean up with their player. */
export function addSniffingEffect(player, isSniffing) {
    const label = player.add([
        text("Sniffing...", { font: "pixel", size: 8 }), pos(0, -42), anchor("center"),
        outline(3, rgb(25, 30, 25)), z(4),
    ]);
    const motes = Array.from({ length: 3 }, () => player.add([
        circle(3), pos(0, 0), color(224, 236, 198), opacity(0.7), z(4),
    ]));
    label.hidden = true;
    for (const mote of motes) mote.hidden = true;
    let clock = 0;
    player.onUpdate(() => {
        clock += dt();
        const visible = isSniffing();
        label.hidden = !visible;
        motes.forEach((mote, index) => {
            mote.hidden = !visible;
            const age = (clock * 1.7 + index / 3) % 1;
            mote.pos = vec2(-12 + index * 12 + Math.sin(age * 6) * 3, 24 - age * 20);
            mote.opacity = 1 - age;
        });
    });
}
