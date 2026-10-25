import { BEVO_MARKER, isBevoActive } from "./bevo-state.js";

export function loadBevoSprites() {
    const walk = (from) => ({ from, to: from + 3, loop: true, speed: 6 });
    loadSprite("bevo-boss", "sprites/bevo-boss.png", { sliceX: 4, sliceY: 4,
        anims: { down: walk(0), up: walk(4), left: walk(8), right: walk(12) } });
}

export function addBevoView(player, boss) {
    const marker = add([circle(34), pos(BEVO_MARKER.x, BEVO_MARKER.y), anchor("center"),
        color(205, 144, 52), opacity(0.65), outline(4, rgb(255, 225, 135)), z(0)]);
    const markerLabel = marker.add([text("BEVO", { font: "pixel", size: 8 }), pos(0, -46), anchor("center"),
        color(255, 235, 195), outline(2, rgb(65, 32, 15))]);
    const actor = add([sprite("bevo-boss", { width: 128, height: 128 }), pos(BEVO_MARKER.x, BEVO_MARKER.y),
        anchor("center"), color(255, 255, 255), opacity(1), z(3)]);
    actor.hidden = true;
    const panel = add([rect(380, 58, { radius: 4 }), pos(480, 12), anchor("top"), fixed(), color(48, 25, 19),
        outline(3, rgb(230, 175, 89)), z(50)]);
    const title = panel.add([text("BEVO", { font: "pixel", size: 8 }), pos(0, 12), anchor("center"), color(255, 238, 203)]);
    panel.add([rect(340, 8), pos(-170, 24), color(85, 54, 39)]);
    const fill = panel.add([rect(340, 8), pos(-170, 24), color(223, 121, 46)]);
    const status = panel.add([text("", { font: "pixel", size: 8 }), pos(0, 44), anchor("center"), color(255, 218, 135)]);
    const prompt = add([text("", { font: "pixel", size: 8 }), pos(480, 96), anchor("center"), fixed(),
        color(255, 238, 203), outline(3, rgb(48, 25, 19)), z(50)]);
    let sequence = -1, encounter = -1, from, target, started = 0, animation = null, oldHp = 300, flashUntil = 0;
    actor.onDraw(() => {
        const state = boss.state;
        if (state?.phase !== "windup") return;
        // Draw in actor-local world coordinates; clients only display the server's aim.
        drawLine({ p1: vec2(0, 0), p2: vec2(state.chargeDirection.x * 360, state.chargeDirection.y * 360),
            width: 12, color: rgb(255, 80, 40), opacity: 0.55 });
    });
    actor.onUpdate(() => {
        const state = boss.state;
        panel.hidden = !state || state.phase === "dormant";
        marker.hidden = isBevoActive(state);
        actor.hidden = !state || !isBevoActive(state);
        markerLabel.text = boss.cooldown() > 0 ? `BEVO: ${Math.ceil(boss.cooldown())}s` : "BEVO";
        prompt.text = boss.stunned ? "STUNNED!" : boss.canSummon(player.pos) ? "E: Summon Bevo"
            : isBevoActive(state) ? "E: Bite Bevo   |   Dodge the charge!" : "";
        if (!state) {
            if (Math.hypot(player.pos.x - BEVO_MARKER.x, player.pos.y - BEVO_MARKER.y) <= 96)
                prompt.text = "Connect to the server to summon Bevo";
            sequence = -1; encounter = -1; return;
        }
        title.text = `BEVO - ${state.hp}/${state.maxHp}`;
        fill.width = 340 * state.hp / state.maxHp;
        status.text = { spawning: "Bevo is coming!", chasing: "Stay on your paws!", windup: "CHARGE INCOMING!",
            charging: "DODGE!", recovering: "Bite now!", defeated: `BEVO DEFEATED!  Summon in ${Math.ceil(boss.cooldown())}s` }[state.phase] ?? "";
        if (state.sequence !== sequence || state.encounterId !== encounter) {
            if (encounter !== state.encounterId || !target) {
                actor.pos.x = state.x; actor.pos.y = state.y; oldHp = state.hp;
            }
            if (state.hp < oldHp) flashUntil = time() + 0.15;
            oldHp = state.hp;
            from = { x: actor.pos.x, y: actor.pos.y }; target = { x: state.x, y: state.y };
            started = time(); sequence = state.sequence; encounter = state.encounterId;
        }
        const fraction = Math.min(1, (time() - started) / 0.1);
        actor.pos.x = from.x + (target.x - from.x) * fraction;
        actor.pos.y = from.y + (target.y - from.y) * fraction;
        const moving = state.phase === "chasing" || state.phase === "charging";
        const nextAnimation = `${state.facing}:${moving}`;
        if (animation !== nextAnimation) {
            if (moving) actor.play(state.facing);
            else { actor.stop(); actor.frame = { down: 0, up: 4, left: 8, right: 12 }[state.facing]; }
            animation = nextAnimation;
        }
        actor.color = time() < flashUntil ? rgb(255, 120, 100) : rgb(255, 255, 255);
        actor.opacity = state.phase === "spawning" ? 0.45 + Math.sin(time() * 12) * 0.2 : 1;
    });
}
