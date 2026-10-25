// A speech bubble whose tail points down at where(), e.g. a duck or a barrel.
// It follows where() each frame, then fades out after `seconds`.
// shift slides the box sideways (the tail stays put) to keep it on screen near a wall.
export function addBubble(where, line, { seconds = 3.5, shift = 0 } = {}) {
    const cream = rgb(250, 247, 236);
    const ink = rgb(52, 40, 46);
    const bubble = add([pos(where()), z(10), lifespan(seconds, { fade: 0.4 }), opacity(1), {
        draw() {
            drawRect({ pos: vec2(shift - 130, -78), width: 260, height: 52, radius: 6, color: cream, outline: { width: 3, color: ink }, opacity: this.opacity });
            drawTriangle({ p1: vec2(-8, -27), p2: vec2(8, -27), p3: vec2(0, -16), color: cream, opacity: this.opacity });
            drawText({ text: line, font: "pixel", size: 8, width: 236, align: "center", lineSpacing: 8, pos: vec2(shift, -52), anchor: "center", color: ink, opacity: this.opacity });
        },
    }]);
    bubble.onUpdate(() => { bubble.pos = vec2(where()); });
    return bubble;
}

// The bottom-of-screen "Space: ..." prompt, matching the shop door's.
export function addPrompt(label) {
    const prompt = add([
        rect(360, 40, { radius: 6 }), pos(center().x, height() - 112),
        anchor("center"), fixed(), z(20), color(50, 16, 24),
    ]);
    prompt.add([text(label, { font: "pixel", size: 8 }), anchor("center")]);
    prompt.hidden = true;
    return prompt;
}
