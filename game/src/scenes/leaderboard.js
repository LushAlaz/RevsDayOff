// Placeholder so the LEADERBOARD button has somewhere to go.
// Swap the inside for the real leaderboard when it's ready.
export function leaderboardScene() {
    scene("leaderboard", () => {
        setBackground(rgb(24, 20, 28));
        add([text("Leaderboard coming NEVER!!!!!!!!", { font: "pixel", size: 16 }), pos(center()), anchor("center")]);
        add([text("Press Esc to go back", { font: "pixel", size: 8 }), pos(center().x, center().y + 50), anchor("center")]);
        onKeyPress("escape", () => go("title"));
    });
}
