// Placeholder so the LEADERBOARD button has somewhere to go.
// Swap the inside for the real leaderboard when it's ready.
export function leaderboardScene() {
    scene("leaderboard", () => {
        setBackground(rgb(24, 20, 28));
        add([text("Leaderboard coming soon", { size: 32 }), pos(center()), anchor("center")]);
        add([text("Press Esc to go back", { size: 20 }), pos(center().x, center().y + 50), anchor("center")]);
        onKeyPress("escape", () => go("title"));
    });
}
