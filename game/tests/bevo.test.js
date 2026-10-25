import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createLootController } from "../src/loot.js";
import { ITEMS } from "../src/items.js";
const { RULES, createBevoState, createBevoController, clear, move } = createRequire(import.meta.url)("../../express/bevo.js");

function fixture() {
    let clock = 0;
    const players = { a: { x: 700, y: 240 }, b: { x: 850, y: 240 } };
    const state = createBevoState(), hits = [], snapshots = [];
    const boss = createBevoController(state, { getPlayers: () => players, now: () => clock,
        onHit: (id, hit) => hits.push({ id, ...hit }), onState: (value) => snapshots.push(value) });
    return { state, boss, players, hits, snapshots,
        at(value, dt = 0) { clock = value; boss.step(dt); },
        summon() { assert.equal(boss.summon("a", state.encounterId), true); },
    };
}

test("summoning creates exactly one shared encounter; range and encounter checks apply", () => {
    const f = fixture();
    f.players.a.x = 400;
    assert.equal(f.boss.summon("a", 0), false);
    assert.equal(f.boss.summon("unknown", 0), false);
    f.players.a.x = 700; f.summon();
    assert.equal(f.state.phase, "spawning");
    assert.equal(f.state.hp, 300);
    assert.equal(f.boss.summon("b", 0), false);
    assert.equal(f.boss.summon("b", 1), false);
    assert.equal(f.boss.bite("a", 1), false, "spawning cannot be damaged");
});

test("phase deadlines, nearest targeting, and a fixed charging direction are server simulated", () => {
    const f = fixture(); f.summon();
    f.players.a.x = 660; f.players.b.x = 880;
    f.at(2); assert.equal(f.state.phase, "chasing");
    f.at(2.05, 0.05); assert.equal(f.state.target, "b");
    assert.equal(f.state.x, 786, "120 world pixels per second");
    f.at(5); assert.equal(f.state.phase, "windup");
    assert.deepEqual(f.state.chargeDirection, { x: 1, y: 0 });
    delete f.players.b;
    f.at(5.1); assert.equal(f.state.target, "a");
    assert.deepEqual(f.state.chargeDirection, { x: -1, y: 0 });
    f.at(5.81); assert.equal(f.state.phase, "charging");
    f.players.a.y = 350;
    f.at(5.85, 0.05);
    assert.deepEqual(f.state.chargeDirection, { x: -1, y: 0 });
    assert.equal(f.state.x, 763.5);
    f.at(6.62); assert.equal(f.state.phase, "recovering");
    f.at(7.83); assert.equal(f.state.phase, "chasing");
});

test("players subtract from one HP pool with individual range, cooldown, and stale encounter checks", () => {
    const f = fixture(); f.summon(); f.at(2);
    assert.equal(f.boss.bite("a", 0), false);
    assert.equal(f.boss.bite("a", 1), true);
    assert.equal(f.boss.bite("a", 1), false);
    assert.equal(f.boss.bite("b", 1), true);
    assert.equal(f.state.hp, 280);
    f.at(2.41);
    f.players.a.x = f.state.x - RULES.biteRange;
    assert.equal(f.boss.bite("a", 1), true, "range boundary included");
    f.at(2.82); f.players.a.x--;
    assert.equal(f.boss.bite("a", 1), false);
    assert.equal(f.state.hp, 270);
});

test("contact applies knockback, stun, immunity, and at most one hit per player per charge", () => {
    const f = fixture(); f.summon(); f.at(2);
    f.players.a.x = 760; f.at(2.05);
    assert.equal(f.hits.length, 2);
    assert.equal(f.hits[0].id, "a");
    assert.equal(f.hits[0].x, 664);
    assert.equal(f.boss.stunned("a"), true);
    assert.equal(f.boss.bite("a", 1), false);
    f.players.a.x = 760; f.at(2.1);
    assert.equal(f.hits.length, 2, "immunity rejects repeated contact");
    f.at(2.56); assert.equal(f.boss.stunned("a"), false);
    f.state.phase = "charging"; f.state.phaseEndsAt = 10;
    f.players.a.x = 760;
    f.at(3.6); assert.equal(f.hits.length, 3);
    f.players.a.x = 760; f.at(5.2);
    assert.equal(f.hits.length, 3, "a charge cannot hit the same player twice");
});

test("defeat awards nothing, enforces cooldown, and empty rooms reset without replacing the const state", () => {
    const f = fixture(); f.summon(); f.at(2);
    for (let i = 0; i < 30; i++) {
        f.at(2 + i * 0.41);
        f.players.a.x = f.state.x - 100; f.players.a.y = f.state.y;
        assert.equal(f.boss.bite("a", f.state.encounterId), true);
    }
    assert.equal(f.state.hp, 0); assert.equal(f.state.phase, "defeated");
    assert.equal(f.boss.bite("b", f.state.encounterId), false);
    assert.equal(f.boss.summon("b", f.state.encounterId), false);
    f.at(f.state.resummonAt);
    f.players.a = { x: 700, y: 240 };
    f.summon(); assert.equal(f.state.hp, 300);
    const reference = f.state;
    delete f.players.a; delete f.players.b; f.at(60);
    assert.equal(f.state, reference); assert.equal(f.state.phase, "dormant");
    assert.equal(f.state.resummonAt, 0);
});

test("navigation routes around terrain and swept motion cannot tunnel through trees or bounds", () => {
    const f = fixture(); f.summon(); f.at(2);
    f.state.x = 850; f.state.y = 100;
    f.state.phaseEndsAt = 100;
    f.players.a = { x: 1000, y: 100 }; delete f.players.b;
    for (let i = 0; i < 80; i++) {
        f.at(2.01 + i * 0.05, 0.05);
        assert.equal(clear(f.state, 40), true);
    }
    assert.ok(f.state.x > 960, "chase navigates around the tree");
    const stopped = move({ x: 850, y: 100 }, { x: 300, y: 0 }, 40);
    assert.equal(stopped.blocked, true); assert.ok(stopped.x <= 876);
    const wall = move({ x: 1000, y: 300 }, { x: 1000, y: 0 }, 40);
    assert.ok(wall.x <= 1040);
    const player = move({ x: 200, y: 100 }, { x: -96, y: 0 }, 32, true);
    assert.ok(player.x >= 200, "knockback cannot enter the shop");
});

test("charging stops at terrain and enters recovery instead of crossing it", () => {
    const f = fixture(); f.summon();
    Object.assign(f.state, { phase: "charging", x: 850, y: 100, phaseEndsAt: 10,
        chargeDirection: { x: 1, y: 0 } });
    f.at(2.1, 0.8);
    assert.equal(f.state.phase, "recovering");
    assert.ok(f.state.x <= 876);
    assert.equal(clear(f.state, 40), true);
});

test("combat suspension cancels a dig without loot or cadet penalties", () => {
    let failures = 0, finish;
    const inventory = [], item = ITEMS[0];
    const loot = createLootController({ inventory, spots: [{ position: { x: 500, y: 240 }, item }],
        onFail: () => failures++, onDigFinish: (result) => { finish = result; } });
    loot.step(0, true, { x: 500, y: 240 });
    loot.suspend();
    assert.equal(finish.reason, "cancelled");
    assert.equal(loot.phase, "exploration"); assert.equal(loot.result, null);
    assert.equal(loot.sniffing, false); assert.equal(failures, 0); assert.deepEqual(inventory, []);
});
