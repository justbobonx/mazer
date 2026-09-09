const CELL = 20;
const RADIUS = 7;
const SPEED = 2.2;
const ENEMY_SPEED = 2.0;
const ENEMY_SIZE = 8;

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

const tiles = new TileSet(1);
tiles.load();

let state = STATES.START;
let beforePause = STATES.PLAY;
let cols = 5;
let rows = 5;
let originX = 0;
let originY = 0;
let maze = null;
let player = null;
let enemies = [];
let keys = new Set();
let wanted = { dx: 0, dy: 0 };
let score = 0;
let resizeTimer = 0;

function fitGrid() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  cols = Math.max(5, Math.floor(w / CELL));
  rows = Math.max(5, Math.floor(h / CELL));
  originX = Math.floor((w - cols * CELL) / 2);
  originY = Math.floor((h - rows * CELL) / 2);
}

function spawnActors() {
  player = new Actor(maze.start.y, maze.start.x, SPEED, CELL);
  const corners = [
    { y: 0, x: 0 },
    { y: 0, x: maze.cols - 1 },
    { y: maze.rows - 1, x: 0 },
    { y: maze.rows - 1, x: maze.cols - 1 },
  ];
  enemies = corners.map(function (c) {
    const e = new Actor(c.y, c.x, ENEMY_SPEED, CELL);
    chooseEnemyDir(e, maze, c.y, c.x);
    return e;
  });
}

function beginGenerate() {
  fitGrid();
  maze = new Maze(rows, cols);
  maze.beginGenerate();
  player = new Actor(maze.start.y, maze.start.x, SPEED, CELL);
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

function readWanted() {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx = -1;
  else if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx = 1;
  else if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy = -1;
  else if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy = 1;
  if (dx || dy) wanted = { dx: dx, dy: dy };
}

function hitEnemy() {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
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
  ctx.fillStyle = "#2a3340";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.fillRect(originX, originY, cols * CELL, rows * CELL);

  const carved = maze.lastCarved;
  if (state === STATES.MAKE && carved) {
    ctx.fillStyle = maze.phase === "fill" ? "#6ec6ff" : "#ffd36a";
    ctx.fillRect(originX + carved.x * CELL, originY + carved.y * CELL, CELL, CELL);
  }

  ctx.fillStyle = "#1f6f4a";
  const pad = 3;
  ctx.fillRect(
    originX + maze.goal.x * CELL + pad,
    originY + maze.goal.y * CELL + pad,
    CELL - pad * 2,
    CELL - pad * 2
  );
}

function drawActors() {
  if (state === STATES.MAKE) {
    ctx.fillStyle = "#ff6b6b";
    for (let i = 0; i < maze.heads.length; i++) {
      const h = maze.heads[i];
      ctx.fillRect(originX + h.x * CELL + 4, originY + h.y * CELL + 4, CELL - 8, CELL - 8);
    }
  }
  ctx.beginPath();
  ctx.fillStyle = "#ffb347";
  ctx.arc(originX + player.x, originY + player.y, RADIUS, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const x = originX + e.x;
    const y = originY + e.y;
    ctx.beginPath();
    ctx.moveTo(x, y - ENEMY_SIZE);
    ctx.lineTo(x + ENEMY_SIZE, y);
    ctx.lineTo(x, y + ENEMY_SIZE);
    ctx.lineTo(x - ENEMY_SIZE, y);
    ctx.closePath();
    ctx.fillStyle = "#e23d3d";
    ctx.fill();
  }
}

function drawFrame() {
  drawFloor();
  drawActors();
  tiles.draw(ctx, maze, originX, originY, CELL);
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
    maze.stepGenerate();
    player.place(maze.start.y, maze.start.x);
    drawFrame();
    if (maze.isDone()) {
      spawnActors();
      state = STATES.PLAY;
      setOverlay();
    }
  } else if (state === STATES.PLAY) {
    readWanted();
    player.step(maze, function (a, m, y, x) {
      choosePlayerDir(a, m, y, x, wanted);
    }, wanted);
    for (let i = 0; i < enemies.length; i++) enemies[i].step(maze, chooseEnemyDir);
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
    fitGrid();
    if (state === STATES.PLAY || state === STATES.MAKE || state === STATES.PAUSE) beginGenerate();
  }, 120);
});

fitGrid();
setOverlay();
frame();
