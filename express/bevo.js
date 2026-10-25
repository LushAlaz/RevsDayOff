const geometry = require("../game/src/world-geometry.json");
const bounds = geometry.drillField.bounds;
const obstacles = [geometry.shopObstacle, ...geometry.drillField.trees.map((tree) => tree.obstacle)];
const RULES = Object.freeze(require("../game/src/bevo-rules.json"));
const active = (boss) => !["dormant", "defeated"].includes(boss.phase);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (x, y) => { const length = Math.hypot(x, y); return length ? { x: x / length, y: y / length } : { x: 0, y: 1 }; };
const facing = (v) => Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? "left" : "right") : (v.y < 0 ? "up" : "down");

function clear(point, radius) {
  return point.x >= bounds.left + radius && point.x <= bounds.right - radius
    && point.y >= bounds.top + radius && point.y <= bounds.bottom - radius
    && !obstacles.some((o) => point.x > o.left - radius && point.x < o.right + radius
      && point.y > o.top - radius && point.y < o.bottom + radius);
}

// Small swept steps prevent tunneling through narrow tree trunks or the shop.
function move(point, delta, radius, slide = false, path) {
  const result = { x: point.x, y: point.y, blocked: false };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / 4));
  for (let i = 0; i < steps; i++) {
    const dx = delta.x / steps, dy = delta.y / steps;
    const next = { x: result.x + dx, y: result.y + dy };
    if (clear(next, radius)) {
      result.x = next.x; result.y = next.y;
      path?.push({ x: result.x, y: result.y });
      continue;
    }
    result.blocked = true;
    if (!slide) break;
    if (clear({ x: result.x + dx, y: result.y }, radius)) result.x += dx;
    path?.push({ x: result.x, y: result.y });
    if (clear({ x: result.x, y: result.y + dy }, radius)) result.y += dy;
    path?.push({ x: result.x, y: result.y });
  }
  return result;
}

// Evaluate from the original route, independent of tick size or missed frames.
function knockbackPosition(motion, at) {
  const t = Math.max(0, Math.min(1, (at - motion.startedAt) / motion.duration));
  const index = t * (2 - t) * (motion.path.length - 1);
  const a = motion.path[Math.floor(index)], b = motion.path[Math.min(motion.path.length - 1, Math.floor(index) + 1)];
  const fraction = index - Math.floor(index);
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

function lineClear(from, to) {
  const end = move(from, { x: to.x - from.x, y: to.y - from.y }, RULES.radius);
  return !end.blocked;
}

// Static four-neighbor navigation grid, shared map geometry expanded by boss radius.
const nodes = [];
const byKey = new Map();
for (let y = 40; y <= bounds.bottom - 40; y += 32) {
  for (let x = 40; x <= bounds.right - 40; x += 32) {
    const node = { x, y, key: `${x},${y}`, neighbors: [] };
    if (clear(node, RULES.radius)) { nodes.push(node); byKey.set(node.key, node); }
  }
}
for (const node of nodes) {
  for (const [dx, dy] of [[32, 0], [-32, 0], [0, 32], [0, -32]]) {
    const other = byKey.get(`${node.x + dx},${node.y + dy}`);
    if (other && lineClear(node, other)) node.neighbors.push(other);
  }
}
function chaseDirection(boss, target) {
  if (lineClear(boss, target)) return unit(target.x - boss.x, target.y - boss.y);
  const nearest = (point, reachable) => nodes.filter((n) => !reachable || lineClear(point, n))
    .reduce((best, n) => !best || distance(point, n) < distance(point, best) ? n : best, null);
  const start = nearest(boss, true), goal = nearest(target, false);
  if (!start || !goal) return { x: 0, y: 0 };
  const queue = [goal], visited = new Map([[goal, null]]);
  for (let i = 0; i < queue.length && !visited.has(start); i++) {
    for (const next of queue[i].neighbors) {
      if (!visited.has(next)) { visited.set(next, queue[i]); queue.push(next); }
    }
  }
  let waypoint = start;
  // Follow as far along the route as the current position can see. Re-selecting
  // only the nearest node each tick would oscillate halfway between grid cells.
  for (let next = visited.get(start); next && lineClear(boss, next); next = visited.get(next)) waypoint = next;
  return unit(waypoint.x - boss.x, waypoint.y - boss.y);
}

function segmentDistance(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const fraction = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return distance(point, { x: a.x + dx * fraction, y: a.y + dy * fraction });
}

function createBevoState() {
  return { encounterId: 0, sequence: 0, phase: "dormant", ...RULES.marker,
    facing: "down", hp: RULES.hp, maxHp: RULES.hp, target: null,
    chargeDirection: { x: 0, y: 1 }, phaseEndsAt: 0, resummonAt: 0 };
}

function createBevoController(bevo, { getPlayers, now, onState = () => {}, onHit = () => {}, onPlayersChanged = () => {} }) {
  const bites = new Map(), immunity = new Map(), stuns = new Map(), charged = new Set();
  let hitId = 0, lastBroadcast = -Infinity;
  const snapshot = () => ({ ...bevo, chargeDirection: { ...bevo.chargeDirection }, serverNow: now() });
  function publish() { bevo.sequence++; lastBroadcast = now(); onState(snapshot()); }
  function phase(name, duration) { bevo.phase = name; bevo.phaseEndsAt = now() + duration; publish(); }
  function reset() {
    const encounterId = bevo.encounterId + 1, sequence = bevo.sequence;
    Object.assign(bevo, createBevoState(), { encounterId, sequence });
    bites.clear(); immunity.clear(); stuns.clear(); charged.clear(); publish();
    for (const player of Object.values(getPlayers())) delete player.knockback;
  }
  function summon(id, encounterId) {
    const player = getPlayers()[id];
    if (!player || encounterId !== bevo.encounterId || active(bevo) || now() < bevo.resummonAt
        || distance(player, RULES.marker) > RULES.summonRange || stunned(id)) return false;
    bevo.encounterId++; bevo.hp = RULES.hp; bevo.x = RULES.marker.x; bevo.y = RULES.marker.y;
    bevo.target = null; bevo.facing = "down";
    bites.clear(); immunity.clear(); stuns.clear(); charged.clear();
    phase("spawning", RULES.spawnTime);
    return true;
  }
  function stunned(id) { return now() < (stuns.get(id) ?? -Infinity); }
  function bite(id, encounterId) {
    const player = getPlayers()[id];
    if (!player || encounterId !== bevo.encounterId || !active(bevo) || bevo.phase === "spawning"
        || stunned(id) || now() < (bites.get(id) ?? -Infinity)) return false;
    // Out-of-range bites still consume the server cooldown.
    bites.set(id, now() + RULES.biteCooldown);
    if (distance(player, bevo) > RULES.biteRange) return false;
    bevo.hp = Math.max(0, bevo.hp - RULES.biteDamage);
    if (!bevo.hp) {
      bevo.target = null; bevo.resummonAt = now() + RULES.respawnTime;
      phase("defeated", RULES.respawnTime);
    } else publish();
    return true;
  }
  function step(dt) {
    const players = getPlayers(), ids = Object.keys(players);

    for (const table of [bites, immunity, stuns]) 
      for (const id of table.keys()) 
        if (!players[id]) table.delete(id);

    if (!ids.length) { if (bevo.phase !== "dormant") reset(); return; }

    let playersChanged = false;
    for (const player of Object.values(players)) {
      const motion = player.knockback;
      if (!motion) continue;
      const position = knockbackPosition(motion, now());
      playersChanged ||= player.x !== position.x || player.y !== position.y;
      player.x = position.x; player.y = position.y;
      // Hold the endpoint for the remaining stun, including after boss defeat.
      if (now() >= motion.startedAt + motion.stunDuration) { delete player.knockback; playersChanged = true; }
    }
    if (playersChanged) onPlayersChanged();
    if (!active(bevo)) return;
    
    const nearest = () => ids.reduce((best, id) => !best || distance(players[id], bevo) < distance(players[best], bevo) ? id : best, null);
    const before = { x: bevo.x, y: bevo.y };
    const movingPhase = bevo.phase;
    if (bevo.phase === "chasing" || bevo.phase === "windup") bevo.target = nearest();
    if (bevo.phase === "chasing") {
      const direction = chaseDirection(bevo, players[bevo.target]);
      const end = move(bevo, { x: direction.x * RULES.chaseSpeed * dt, y: direction.y * RULES.chaseSpeed * dt }, RULES.radius);
      bevo.x = end.x; bevo.y = end.y; bevo.facing = facing(direction);
    } else if (bevo.phase === "windup") {
      bevo.chargeDirection = unit(players[bevo.target].x - bevo.x, players[bevo.target].y - bevo.y);
      bevo.facing = facing(bevo.chargeDirection);
    } else if (bevo.phase === "charging") {
      const end = move(bevo, { x: bevo.chargeDirection.x * RULES.chargeSpeed * dt, y: bevo.chargeDirection.y * RULES.chargeSpeed * dt }, RULES.radius);
      bevo.x = end.x; bevo.y = end.y;
      if (end.blocked) phase("recovering", RULES.recoveryTime);
    }
    if (movingPhase === "chasing" || movingPhase === "charging") {
      for (const id of ids) {
        if (now() < (immunity.get(id) ?? -Infinity) || (movingPhase === "charging" && charged.has(id))
            || segmentDistance(players[id], before, bevo) > RULES.radius + 32) continue;
        const direction = unit(players[id].x - bevo.x, players[id].y - bevo.y);
        const from = { x: players[id].x, y: players[id].y }, path = [from];
        const destination = move(from, { x: direction.x * RULES.knockback, y: direction.y * RULES.knockback }, 32, true, path);
        const motion = { encounterId: bevo.encounterId, hitId: ++hitId, fromX: from.x, fromY: from.y,
          x: destination.x, y: destination.y, startedAt: now(), duration: RULES.knockbackTime,
          stunDuration: RULES.stunTime, path };
        players[id].knockback = motion;
        immunity.set(id, now() + RULES.immunityTime); stuns.set(id, now() + RULES.stunTime);
        if (movingPhase === "charging") charged.add(id);
        onHit(id, motion);
      }
    }
    if (now() >= bevo.phaseEndsAt) {
      if (bevo.phase === "spawning" || bevo.phase === "recovering") phase("chasing", RULES.chaseTime);
      else if (bevo.phase === "chasing") {
        bevo.chargeDirection = unit(players[bevo.target].x - bevo.x, players[bevo.target].y - bevo.y);
        phase("windup", RULES.windupTime);
      } else if (bevo.phase === "windup") { charged.clear(); phase("charging", RULES.chargeTime); }
      else if (bevo.phase === "charging") phase("recovering", RULES.recoveryTime);
    }
    if (now() - lastBroadcast >= 0.1 - 1e-9) publish();
  }
  return { snapshot, summon, bite, step, reset, stunned, active: () => active(bevo) };
}
module.exports = { RULES, createBevoState, createBevoController, move, clear, knockbackPosition };
