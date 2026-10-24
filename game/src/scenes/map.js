export function mapSelectScene() {
    scene("mapSelect", () => {
        add([
            text("Choose a map", { size: 40 }),
            pos(center().x, 80),
            anchor("center"),
        ]);
    });
}
