const CELL = 20;
const RADIUS = 7;
const SPEED = 2.2;
const ENEMY_SPEED = 2.0;
const ENEMY_SIZE = 8;

const CARD = [
  { dx: 0, dy: -1, name: "N" },
  { dx: 1, dy: 0, name: "E" },
  { dx: 0, dy: 1, name: "S" },
  { dx: -1, dy: 0, name: "W" },
];

const STATES = {
  START: "start",
  MAKE: "make",
  PLAY: "play",
  PAUSE: "pause",
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const elStart = document.getElementById("start-screen");
const elPause = document.getElementById("pause-screen");
const elHud = document.getElementById("hud");
const elScore = document.getElementById("score");
const btnStart = document.getElementById("btn-start");
const btnResume = document.getElementById("btn-resume");

let state = STATES.START;
let beforePause = STATES.PLAY;
let cols = 5;
let rows = 5;
let originX = 0;
let originY = 0;
let maze = null;
let gen = null;
let player = null;
let enemies = [];
let keys = new Set();
let wanted = { dx: 0, dy: 0 };
let score = 0;
let resizeTimer = 0;

function oddFit(pixels) {
  let n = Math.floor(pixels / CELL);
  if (n < 5) n = 5;
  if (n % 2 === 0) n -= 1;
  return n;
}

function fitGrid() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  cols = oddFit(w);
  rows = oddFit(h);
  originX = Math.floor((w - cols * CELL) / 2);
  originY = Math.floor((h - rows * CELL) / 2);
}

function cellCenter(cx, cy) {
  return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
}

function isOpen(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
  return maze.grid[cy][cx] === OPEN;
}

function openings(cx, cy) {
  const out = [];
  for (const d of CARD) {
    if (isOpen(cx + d.dx, cy + d.dy)) out.push(d);
  }
  return out;
}

function makeActor(cx, cy, speed) {
  const c = cellCenter(cx, cy);
  return { x: c.x, y: c.y, dx: 0, dy: 0, speed };
}

function cornerCells() {
  return [
    { x: 1, y: 1 },
    { x: cols - 2, y: 1 },
    { x: 1, y: rows - 2 },
    { x: cols - 2, y: rows - 2 },
  ];
}

function spawnActors() {
  player = makeActor(maze.start.x, maze.start.y, SPEED);
  enemies = cornerCells().map((c) => {
    const e = makeActor(c.x, c.y, ENEMY_SPEED);
    const opts = openings(c.x, c.y);
    if (opts.length) {
      const d = opts[Math.floor(Math.random() * opts.length)];
      e.dx = d.dx;
      e.dy = d.dy;
    }
    return e;
  });
}

function resetMaze() {
  maze = createMaze(cols, rows);
  gen = createGenerator(maze, {
    branchChance: 0.2,
    keepDirChance: 0.74,
    goalBias: 0.3,
  });
  player = makeActor(maze.start.x, maze.start.y, SPEED);
  enemies = [];
}

function setOverlay() {
  elStart.hidden = state !== STATES.START;
  elPause.hidden = state !== STATES.PAUSE;
  elHud.hidden = state === STATES.START;
  elScore.textContent = String(score);
}

function beginGenerate() {
  fitGrid();
  state = STATES.MAKE;
  resetMaze();
  setOverlay();
}

function sameDir(a, b) {
  return a.dx === b.dx && a.dy === b.dy;
}

function isReverse(a, b) {
  return a.dx === -b.dx && a.dy === -b.dy && (a.dx !== 0 || a.dy !== 0);
}

function readWanted() {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx = -1;
  else if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx = 1;
  else if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy = -1;
  else if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy = 1;
  if (dx || dy) wanted = { dx, dy };
}

function choosePlayer(actor, cx, cy) {
  if ((wanted.dx || wanted.dy) && isOpen(cx + wanted.dx, cy + wanted.dy)) {
    actor.dx = wanted.dx;
    actor.dy = wanted.dy;
    return;
  }
  if ((actor.dx || actor.dy) && isOpen(cx + actor.dx, cy + actor.dy)) return;
  actor.dx = 0;
  actor.dy = 0;
}

function chooseEnemy(actor, cx, cy) {
  const opts = openings(cx, cy);
  if (!opts.length) {
    actor.dx = 0;
    actor.dy = 0;
    return;
  }
  const forward = opts.filter((d) => sameDir(d, actor));
  const sides = opts.filter((d) => !sameDir(d, actor) && !isReverse(d, actor));
  const back = opts.filter((d) => isReverse(d, actor));

  if (sides.length + forward.length >= 2) {
    const pool = sides.concat(forward);
    const d = pool[Math.floor(Math.random() * pool.length)];
    actor.dx = d.dx;
    actor.dy = d.dy;
    return;
  }
  if (forward.length) return;
  if (sides.length) {
    const d = sides[Math.floor(Math.random() * sides.length)];
    actor.dx = d.dx;
    actor.dy = d.dy;
    return;
  }
  if (back.length) {
    actor.dx = back[0].dx;
    actor.dy = back[0].dy;
    return;
  }
  actor.dx = 0;
  actor.dy = 0;
}

function stepActor(actor, chooseDir) {
  const cx = Math.floor(actor.x / CELL);
  const cy = Math.floor(actor.y / CELL);
  const c = cellCenter(cx, cy);
  const nearX = Math.abs(actor.x - c.x) <= actor.speed;
  const nearY = Math.abs(actor.y - c.y) <= actor.speed;
  const atCenter = nearX && nearY;

  if (atCenter) {
    actor.x = c.x;
    actor.y = c.y;
    chooseDir(actor, cx, cy);
    if (!actor.dx && !actor.dy) return;
    if (!isOpen(cx + actor.dx, cy + actor.dy)) {
      actor.dx = 0;
      actor.dy = 0;
      return;
    }
  } else {
    if (actor.dx !== 0) actor.y = c.y;
    else if (actor.dy !== 0) actor.x = c.x;
  }

  if (actor === player && (wanted.dx || wanted.dy) && isReverse(wanted, actor)) {
    if (isOpen(cx + wanted.dx, cy + wanted.dy) || !atCenter) {
      actor.dx = wanted.dx;
      actor.dy = wanted.dy;
    }
  }

  const nx = actor.x + actor.dx * actor.speed;
  const ny = actor.y + actor.dy * actor.speed;
  const ncx = Math.floor(nx / CELL);
  const ncy = Math.floor(ny / CELL);
  if (!isOpen(ncx, ncy)) {
    actor.x = c.x;
    actor.y = c.y;
    actor.dx = 0;
    actor.dy = 0;
    return;
  }
  actor.x = nx;
  actor.y = ny;
}

function hitEnemy() {
  for (const e of enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const lim = RADIUS + ENEMY_SIZE * 0.7;
    if (dx * dx + dy * dy <= lim * lim) return true;
  }
  return false;
}

function onGoal() {
  const g = cellCenter(maze.goal.x, maze.goal.y);
  const dx = player.x - g.x;
  const dy = player.y - g.y;
  return dx * dx + dy * dy <= 36;
}

function drawMaze() {
  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(originX, originY, cols * CELL, rows * CELL);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (maze.grid[y][x] === OPEN) {
        ctx.fillStyle = "#3a4554";
        ctx.fillRect(originX + x * CELL, originY + y * CELL, CELL, CELL);
      }
    }
  }

  const gx = maze.goal.x;
  const gy = maze.goal.y;
  const pad = 3;
  ctx.fillStyle = "#1f6f4a";
  ctx.fillRect(originX + gx * CELL + pad, originY + gy * CELL + pad, CELL - pad * 2, CELL - pad * 2);
  ctx.strokeStyle = "#7dffb3";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    originX + gx * CELL + pad + 0.5,
    originY + gy * CELL + pad + 0.5,
    CELL - pad * 2 - 1,
    CELL - pad * 2 - 1
  );
}

function drawGuy() {
  ctx.beginPath();
  ctx.fillStyle = "#ffb347";
  ctx.arc(originX + player.x, originY + player.y, RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiamond(e) {
  const x = originX + e.x;
  const y = originY + e.y;
  const s = ENEMY_SIZE;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s, y);
  ctx.closePath();
  ctx.fillStyle = "#e23d3d";
  ctx.fill();
  ctx.strokeStyle = "#ff8a8a";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMakeExtras() {
  const carved = gen.getLastCarved();
  if (carved) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = gen.getPhase() === "fill" ? "#6ec6ff" : "#ffd36a";
    ctx.fillRect(originX + carved.x * CELL, originY + carved.y * CELL, CELL, CELL);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "#ff6b6b";
  for (const h of gen.getHeads()) {
    ctx.fillRect(originX + h.x * CELL + 4, originY + h.y * CELL + 4, CELL - 8, CELL - 8);
  }
}

function togglePause() {
  if (state === STATES.PLAY) {
    beforePause = state;
    state = STATES.PAUSE;
    setOverlay();
  } else if (state === STATES.PAUSE) {
    state = beforePause;
    setOverlay();
  }
}

function frame() {
  if (state === STATES.START) {
    ctx.fillStyle = "#07080b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (state === STATES.MAKE) {
    gen.step();
    player.x = cellCenter(maze.start.x, maze.start.y).x;
    player.y = cellCenter(maze.start.x, maze.start.y).y;
    drawMaze();
    drawMakeExtras();
    drawGuy();
    if (gen.isDone()) {
      spawnActors();
      state = STATES.PLAY;
      setOverlay();
    }
  } else if (state === STATES.PLAY) {
    readWanted();
    stepActor(player, choosePlayer);
    for (const e of enemies) stepActor(e, chooseEnemy);
    if (onGoal()) {
      score += 100;
      elScore.textContent = String(score);
      beginGenerate();
    } else if (hitEnemy()) {
      spawnActors();
    }
    drawMaze();
    drawGuy();
    for (const e of enemies) drawDiamond(e);
  } else if (state === STATES.PAUSE) {
    drawMaze();
    drawGuy();
    for (const e of enemies) drawDiamond(e);
  }
  requestAnimationFrame(frame);
}

btnStart.addEventListener("click", () => {
  score = 0;
  beginGenerate();
});

btnResume.addEventListener("click", togglePause);

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  if (state === STATES.START && (e.key === "Enter" || e.key === " ")) {
    score = 0;
    beginGenerate();
  }
  if ((e.key === "p" || e.key === "P" || e.key === "Escape") && (state === STATES.PLAY || state === STATES.PAUSE)) {
    togglePause();
  }
  if ((e.key === "r" || e.key === "R") && (state === STATES.PLAY || state === STATES.PAUSE)) beginGenerate();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    fitGrid();
    if (state === STATES.PLAY || state === STATES.MAKE || state === STATES.PAUSE) beginGenerate();
  }, 120);
});

fitGrid();
setOverlay();
frame();
