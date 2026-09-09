const CELL = 20;
const RADIUS = 7;
const SPEED = 2.6;

const STATES = {
  MAKE: "make",
  PLAY: "play",
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let state = STATES.MAKE;
let cols = 5;
let rows = 5;
let originX = 0;
let originY = 0;
let maze = null;
let gen = null;
let player = { x: 0, y: 0 };
let keys = new Set();
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

function startCellCenter() {
  return {
    x: maze.start.x * CELL + CELL / 2,
    y: maze.start.y * CELL + CELL / 2,
  };
}

function resetMaze() {
  maze = createMaze(cols, rows);
  gen = createGenerator(maze, {
    branchChance: 0.2,
    keepDirChance: 0.74,
    goalBias: 0.3,
  });
  player = startCellCenter();
}

function beginGenerate() {
  fitGrid();
  state = STATES.MAKE;
  resetMaze();
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function isWallAt(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return true;
  return maze.grid[cy][cx] === WALL;
}

function separateCircleRect(px, py, r, rx, ry, rw, rh) {
  const closestX = clamp(px, rx, rx + rw);
  const closestY = clamp(py, ry, ry + rh);
  let dx = px - closestX;
  let dy = py - closestY;
  const dist2 = dx * dx + dy * dy;

  if (dist2 > r * r) return null;

  if (dist2 === 0) {
    const left = px - rx;
    const right = rx + rw - px;
    const top = py - ry;
    const bottom = ry + rh - py;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { x: rx - r, y: py };
    if (m === right) return { x: rx + rw + r, y: py };
    if (m === top) return { x: px, y: ry - r };
    return { x: px, y: ry + rh + r };
  }

  const dist = Math.sqrt(dist2);
  const pen = r - dist;
  if (pen <= 0) return null;
  return { x: px + (dx / dist) * pen, y: py + (dy / dist) * pen };
}

function collideWalls(px, py) {
  const r = RADIUS;
  let x = px;
  let y = py;
  for (let pass = 0; pass < 3; pass++) {
    const minC = Math.floor((x - r) / CELL);
    const maxC = Math.floor((x + r) / CELL);
    const minR = Math.floor((y - r) / CELL);
    const maxR = Math.floor((y + r) / CELL);
    let moved = false;
    for (let cy = minR; cy <= maxR; cy++) {
      for (let cx = minC; cx <= maxC; cx++) {
        if (!isWallAt(cx, cy)) continue;
        const next = separateCircleRect(x, y, r, cx * CELL, cy * CELL, CELL, CELL);
        if (next) {
          x = next.x;
          y = next.y;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return { x, y };
}

function movePlayer() {
  let vx = 0;
  let vy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) vx -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) vx += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) vy -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) vy += 1;
  if (vx !== 0 && vy !== 0) {
    const inv = Math.SQRT1_2;
    vx *= inv;
    vy *= inv;
  }
  if (vx === 0 && vy === 0) return;

  const next = collideWalls(player.x + vx * SPEED, player.y + vy * SPEED);
  player.x = next.x;
  player.y = next.y;
}

function onGoal() {
  const gx = maze.goal.x * CELL + CELL / 2;
  const gy = maze.goal.y * CELL + CELL / 2;
  const dx = player.x - gx;
  const dy = player.y - gy;
  return dx * dx + dy * dy <= (CELL * 0.35) * (CELL * 0.35);
}

function drawCell(cx, cy, color) {
  ctx.fillStyle = color;
  ctx.fillRect(originX + cx * CELL, originY + cy * CELL, CELL, CELL);
}

function drawMaze() {
  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(originX, originY, cols * CELL, rows * CELL);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (maze.grid[y][x] === OPEN) drawCell(x, y, "#3a4554");
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

function frame() {
  if (state === STATES.MAKE) {
    gen.step();
    player = startCellCenter();
    drawMaze();
    drawMakeExtras();
    drawGuy();
    if (gen.isDone()) state = STATES.PLAY;
  } else {
    movePlayer();
    if (onGoal()) {
      beginGenerate();
    } else {
      drawMaze();
      drawGuy();
    }
  }
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  if (e.key === "r" || e.key === "R") beginGenerate();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(beginGenerate, 120);
});

beginGenerate();
frame();
