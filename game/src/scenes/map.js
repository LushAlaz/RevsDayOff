scene("mapSelect", () => {
    setBackground(rgb(205, 170, 109))
    
    add([
        text("Choose a map", { size: 40 }),
        pos(center().x, 80),
        anchor("center"),
    ]);
});
