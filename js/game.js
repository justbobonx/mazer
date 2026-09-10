const CELL = 20;
const MIN_GRID = 5;
const MAX_GRID = 20;
const RADIUS = 7;
const SPEED = 2.2;
const ENEMY_SPEED = 2.0;
const ENEMY_SIZE = 8;
const DEFAULT_MAZE_BG = "#000000";
const WALL_TYPES = [1, 2, 3];

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

const tiles = new TileSet(WALL_TYPES);
tiles.load();

let state = STATES.START;
let beforePause = STATES.PLAY;
let cols = 5;
let rows = 5;
let scale = 1;
let originX = 0;
let originY = 0;
let mazeBg = DEFAULT_MAZE_BG;
let maze = null;
let player = null;
let enemies = [];
let keys = new Set();
let score = 0;
let resizeTimer = 0;

function setMazeBg(color) {
  mazeBg = color || DEFAULT_MAZE_BG;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function fitGrid() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  cols = clamp(Math.floor(w / CELL), MIN_GRID, MAX_GRID);
  rows = clamp(Math.floor(h / CELL), MIN_GRID, MAX_GRID);
  const mazeW = cols * CELL;
  const mazeH = rows * CELL;
  scale = Math.min(w / mazeW, h / mazeH);
  originX = Math.floor((w - mazeW * scale) / 2);
  originY = Math.floor((h - mazeH * scale) / 2);
}

function toScreen() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function toWorld() {
  ctx.setTransform(scale, 0, 0, scale, originX, originY);
}

function spawnActors() {
  player = new Actor(maze.start.y, maze.start.x, SPEED, CELL, {
    color: "#ffb347",
    shape: "circle",
    radius: RADIUS,
  });
  const corners = [
    { y: 0, x: 0 },
    { y: 0, x: maze.cols - 1 },
    { y: maze.rows - 1, x: 0 },
    { y: maze.rows - 1, x: maze.cols - 1 },
  ];
  enemies = corners.map(function (c) {
    return new Enemy(c.y, c.x, ENEMY_SPEED, CELL);
  });
}

function beginGenerate() {
  fitGrid();
  maze = new Maze(rows, cols);
  maze.beginGenerate();
  player = new Actor(maze.start.y, maze.start.x, SPEED, CELL, {
    color: "#ffb347",
    shape: "circle",
    radius: RADIUS,
  });
  enemies = [];
  state = STATES.MAKE;
  setOverlay();
}

function setOverlay() {
  elStart.hidden = state !== STATES.START;
  elPause.hidden = state !== STATES.PAUSE;
  elHud.hidden = state === STATES.START;
  elScore.textContent = String(score);
}

function readInput() {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx = -1;
  else if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx = 1;
  else if (keys.has("ArrowUp")) dy = -1;
  else if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy = 1;
  return { dx: dx, dy: dy };
}

function hitEnemy() {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i].actor;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const lim = RADIUS + ENEMY_SIZE * 0.7;
    if (dx * dx + dy * dy <= lim * lim) return true;
  }
  return false;
}

function onGoal() {
  const half = CELL / 2;
  const gx = maze.goal.x * CELL + half;
  const gy = maze.goal.y * CELL + half;
  const dx = player.x - gx;
  const dy = player.y - gy;
  return dx * dx + dy * dy <= 36;
}

function drawFloor() {
  toScreen();
  ctx.fillStyle = mazeBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  toWorld();
  ctx.fillStyle = mazeBg;
  ctx.fillRect(0, 0, cols * CELL, rows * CELL);

  const carved = maze.lastCarved;
  if (state === STATES.MAKE && carved) {
    ctx.fillStyle = maze.phase === "fill" ? "#6ec6ff" : "#ffd36a";
    ctx.fillRect(carved.x * CELL, carved.y * CELL, CELL, CELL);
  }

  ctx.fillStyle = "#1f6f4a";
  const pad = 3;
  ctx.fillRect(
    maze.goal.x * CELL + pad,
    maze.goal.y * CELL + pad,
    CELL - pad * 2,
    CELL - pad * 2
  );
}

function drawActors() {
  toWorld();
  if (state === STATES.MAKE) {
    ctx.fillStyle = "#ff6b6b";
    for (let i = 0; i < maze.heads.length; i++) {
      const h = maze.heads[i];
      ctx.fillRect(h.x * CELL + 4, h.y * CELL + 4, CELL - 8, CELL - 8);
    }
  }
  if (player) player.draw(ctx);
  for (let i = 0; i < enemies.length; i++) enemies[i].draw(ctx);
}

function drawFrame() {
  drawFloor();
  drawActors();
  toWorld();
  tiles.draw(ctx, maze, 0, 0, CELL);
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
    toScreen();
    ctx.fillStyle = mazeBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (state === STATES.MAKE) {
    maze.stepGenerate();
    player.place(maze.start.y, maze.start.x);
    drawFrame();
    if (maze.isDone()) {
      spawnActors();
      state = STATES.PLAY;
      setOverlay();
    }
  } else if (state === STATES.PLAY) {
    const input = readInput();
    player.setInput(input.dx, input.dy);
    player.step(maze);
    for (let i = 0; i < enemies.length; i++) enemies[i].step(maze, player);
    if (onGoal()) {
      score += 100;
      elScore.textContent = String(score);
      beginGenerate();
    } else if (hitEnemy()) {
      spawnActors();
    }
    drawFrame();
  } else if (state === STATES.PAUSE) {
    drawFrame();
  }
  requestAnimationFrame(frame);
}

btnStart.addEventListener("click", function () {
  score = 0;
  beginGenerate();
});

btnResume.addEventListener("click", togglePause);

window.addEventListener("keydown", function (e) {
  if (e.repeat) {
    if (e.key === "w" || e.key === "W") e.preventDefault();
    else keys.add(e.key);
    return;
  }
  if (e.key === "w" || e.key === "W") {
    e.preventDefault();
    tiles.cycle();
    return;
  }
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

window.addEventListener("keyup", function (e) {
  keys.delete(e.key);
});

window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    const oldCols = cols;
    const oldRows = rows;
    fitGrid();
    if (state === STATES.START) return;
    if (cols !== oldCols || rows !== oldRows) beginGenerate();
  }, 120);
});

fitGrid();
setOverlay();
frame();
