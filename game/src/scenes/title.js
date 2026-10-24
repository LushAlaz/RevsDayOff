export function titleScene() {
    scene("title", () => {
        add([
            text("Rev's Day Off", { size: 48 }),
            pos(center().x, center().y - 100),
            anchor("center"),
        ]);

        const playBtn = add([
            rect(200, 60, { radius: 8 }),
            pos(center().x, center().y + 20),
            anchor("center"),
            area(),          // makes it clickable
            color(80, 160, 255),
            outline(4),
        ]);

        playBtn.add([
            text("Play", { size: 32 }),
            anchor("center"),
            color(255, 255, 255),
        ]);

        playBtn.onHover(() => setCursor("pointer"));
        playBtn.onHoverEnd(() => setCursor("default"));
        playBtn.onClick(() => go("mapSelect"));
    });
}
