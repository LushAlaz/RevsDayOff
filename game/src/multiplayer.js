import { io } from "socket.io-client";
import { createPresence } from "./presence.js";
import { addDirtEffect } from "./dirt.js";
import { addSniffingEffect } from "./sniffing-ui.js";
import { createKnockbackPlayback } from "./knockback.js";

export function addMultiplayer(player, map, { getSniffing = () => false, getCadets = () => [],
    onBevoState = () => {}, onBevoHit = () => {} } = {}) {
    const socket = io(import.meta.env.NEXT_PUBLIC_NETWORK_SERVER_DOMAIN || "http://localhost:3001", {
        transports: ["websocket"], autoConnect: false, forceNew: true,
    });
    const views = new Map();
    const cadetViews = new Map();
    const localKnockback = createKnockbackPlayback(() => performance.now() / 1000);
    const presence = createPresence({
        socket, mapId: map.id, bounds: map.bounds, now: () => performance.now() / 1000,
        getLocal: () => ({ x: player.pos.x, y: player.pos.y, direction: player.facing, sniffing: getSniffing(), cadets: getCadets() }),
        onBevoState,
        onForcedMovement: (motion, serverNow) => {
            if (motion) localKnockback.accept(motion, serverNow, player.pos);
            else localKnockback.clear();
        },
        onBevoHit: (hit) => {
            localKnockback.accept(hit, hit.startedAt, player.pos);
            onBevoHit(hit);
        },
        onFound: (position) => addDirtEffect(position, { announce: true }),
        onChomp: ({ x, y }) => {
            // The server supplies a location, not a socket ID. Do not guess an owner.
            add([text("CHOMP!", { font: "pixel", size: 8 }), pos(x, y - 44), anchor("center"),
                color(245, 242, 229), outline(2, rgb(80, 0, 0)), opacity(1),
                move(vec2(0, -1), 30), lifespan(0.5, { fade: 0.2 }), z(6)]);
        },
    });
    function updateForcedPosition() {
        if (localKnockback.motion?.encounterId !== presence.boss.state?.encounterId) localKnockback.clear();
        const forcedPosition = localKnockback.sample();
        if (forcedPosition) player.applyForcedPosition(forcedPosition);
    }
    player.onUpdate(() => {
        updateForcedPosition();
        presence.step();
        const visibleCadets = new Set();
        for (const [owner, record] of presence.records) {
            for (const cadet of record.cadets) {
                const key = JSON.stringify([owner, cadet.id]);
                visibleCadets.add(key);
                let view = cadetViews.get(key);
                if (!view) {
                    // Visual only: no local cadet tag, AI, hitbox, or inventory access.
                    const actor = add([sprite("cadet-senior"), pos(cadet.x, cadet.y), anchor("center"), scale(3), z(3)]);
                    view = { actor, from: { x: cadet.x, y: cadet.y }, target: { x: cadet.x, y: cadet.y }, started: time() };
                    cadetViews.set(key, view);
                }
                if (view.target.x !== cadet.x || view.target.y !== cadet.y) {
                    view.from = { x: view.actor.pos.x, y: view.actor.pos.y };
                    view.target = { x: cadet.x, y: cadet.y };
                    view.started = time();
                }
                const progress = Math.min(1, (time() - view.started) / 0.1);
                view.actor.pos.x = view.from.x + (view.target.x - view.from.x) * progress;
                view.actor.pos.y = view.from.y + (view.target.y - view.from.y) * progress;
                if (view.direction !== cadet.direction || view.moving !== cadet.moving) {
                    if (cadet.moving) view.actor.play("march-" + cadet.direction);
                    else { view.actor.stop(); view.actor.frame = { down: 0, up: 3, left: 6, right: 9 }[cadet.direction]; }
                    view.direction = cadet.direction;
                    view.moving = cadet.moving;
                }
            }
        }
        for (const [key, view] of cadetViews) {
            if (!visibleCadets.has(key)) { view.actor.destroy(); cadetViews.delete(key); }
        }
        for (const [id, view] of views) {
            if (!presence.records.get(id)?.active) {
                view.actor.destroy();
                views.delete(id);
            }
        }
        for (const [id, record] of presence.records) {
            if (!record.active) continue;
            let view = views.get(id);
            if (!view) {
                const actor = add([sprite("reveille", { width: 64, height: 64 }),
                    pos(record.x, record.y), anchor("center"), z(2)]);
                addSniffingEffect(actor, () => {
                    const current = presence.records.get(id);
                    return current?.sniffing === true && !current.digging;
                });
                const diggingLabel = actor.add([
                    text("Digging...", { font: "pixel", size: 8 }), pos(0, -44), anchor("center"),
                    outline(2, rgb(50, 35, 22)), z(4),
                ]);
                view = { actor, from: { x: record.x, y: record.y },
                    target: { x: record.x, y: record.y }, started: time(), movedAt: -Infinity, diggingLabel,
                    knockback: createKnockbackPlayback(() => performance.now() / 1000) };
                views.set(id, view);
            }
            const { actor } = view;
            view.diggingLabel.hidden = !record.digging;
            if (view.knockback.motion?.encounterId !== presence.boss.state?.encounterId) view.knockback.clear();
            if (record.knockback) view.knockback.accept(record.knockback, record.serverNow, actor.pos);
            const forced = view.knockback.sample();
            if (record.x !== view.target.x || record.y !== view.target.y) {
                view.from = { x: actor.pos.x, y: actor.pos.y };
                view.target = { x: record.x, y: record.y };
                view.started = time();
                view.movedAt = time();
            }
            const progress = Math.min(1, (time() - view.started) / 0.1);
            actor.pos.x = forced?.x ?? view.from.x + (view.target.x - view.from.x) * progress;
            actor.pos.y = forced?.y ?? view.from.y + (view.target.y - view.from.y) * progress;
            const walking = !forced && time() - view.movedAt < 0.15;
            const animation = walking ? record.direction : null;
            if (view.animation !== animation || view.direction !== record.direction) {
                actor.flipX = !walking && record.direction === "right";
                if (walking) actor.play(record.direction);
                else {
                    actor.stop();
                    actor.frame = { down: 0, up: 3, left: 6, right: 6 }[record.direction];
                }
                view.animation = animation;
                view.direction = record.direction;
            }
        }
    });
    // KAPLAY pauses rendering in background tabs; stationary presence should
    // continue independently of rendering.
    const heartbeat = setInterval(() => { updateForcedPosition(); presence.step(); }, 100);
    onSceneLeave(() => {
        clearInterval(heartbeat);
        presence.dispose();
        for (const view of views.values()) view.actor.destroy();
        views.clear();
        for (const view of cadetViews.values()) view.actor.destroy();
        cadetViews.clear();
    });
    socket.connect();
    return presence;
}
