const CELL = 20;
const COLS = 21;
const ROWS = 31;

const STATES = {
  START: "start",
  MAKE: "make",
  PLAY: "play",
  WIN: "win",
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");

canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

let state = STATES.START;
let maze = null;
let gen = null;
let player = { x: 0, y: 0 };
let keys = new Set();
let moveCooldown = 0;

function resetMaze() {
  maze = createMaze(COLS, ROWS);
  gen = createGenerator(maze, {
    branchChance: 0.2,
    keepDirChance: 0.74,
    goalBias: 0.3,
  });
  player = { x: maze.start.x, y: maze.start.y };
}

function setState(next) {
  state = next;
  if (next === STATES.MAKE) resetMaze();
  if (next === STATES.PLAY) player = { x: maze.start.x, y: maze.start.y };
}

function cellColor(x, y) {
  const v = maze.grid[y][x];
  if (v === WALL) return "#14181f";
  return "#3a4554";
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
}

function drawGuy(x, y) {
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  ctx.fillStyle = "#ffb347";
  ctx.beginPath();
  ctx.arc(cx, cy - 1, CELL * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9892a";
  ctx.fillRect(cx - CELL * 0.18, cy + 2, CELL * 0.36, CELL * 0.22);
}

function drawGoal(x, y) {
  const pad = 3;
  ctx.fillStyle = "#1f6f4a";
  ctx.fillRect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
  ctx.strokeStyle = "#7dffb3";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x * CELL + pad + 0.5, y * CELL + pad + 0.5, CELL - pad * 2 - 1, CELL - pad * 2 - 1);
}

function drawGridLines() {
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(COLS * CELL, y * CELL + 0.5);
    ctx.stroke();
  }
}

function drawMazeBase() {
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (maze.grid[y][x] === OPEN) drawCell(x, y, cellColor(x, y));
    }
  }
  drawGoal(maze.goal.x, maze.goal.y);
}

function drawStart() {
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e8eef7";
  ctx.font = "700 42px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MAZER", canvas.width / 2, canvas.height / 2 - 36);
  ctx.font = "16px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#9aa7b8";
  ctx.fillText("watch the maze grow, then run it", canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#7dffb3";
  ctx.fillText("click / enter / space to generate", canvas.width / 2, canvas.height / 2 + 36);
}

function drawMake() {
  drawMazeBase();
  drawGridLines();
  const carved = gen.getLastCarved();
  if (carved) {
    ctx.fillStyle = gen.getPhase() === "fill" ? "#6ec6ff" : "#ffd36a";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(carved.x * CELL, carved.y * CELL, CELL, CELL);
    ctx.globalAlpha = 1;
  }
  for (const h of gen.getHeads()) {
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(h.x * CELL + 4, h.y * CELL + 4, CELL - 8, CELL - 8);
  }
  drawGoal(maze.goal.x, maze.goal.y);
  drawGuy(maze.start.x, maze.start.y);
}

function drawPlay() {
  drawMazeBase();
  drawGoal(maze.goal.x, maze.goal.y);
  drawGuy(player.x, player.y);
}

function drawWin() {
  drawPlay();
  ctx.fillStyle = "rgba(8,10,14,0.62)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#7dffb3";
  ctx.font = "700 32px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("CLEAR", canvas.width / 2, canvas.height / 2 - 8);
  ctx.fillStyle = "#c5d0dc";
  ctx.font = "15px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("enter / click for a new maze", canvas.width / 2, canvas.height / 2 + 24);
}

function updateHud() {
  if (state === STATES.START) {
    hud.textContent = "start";
  } else if (state === STATES.MAKE) {
    const leftover = gen.getLeftovers().length;
    hud.textContent =
      gen.getPhase() === "fill"
        ? "make maze — fill leftover rooms (" + leftover + " left)"
        : "make maze — growing paths  heads:" + gen.getHeads().length + "  goal:" + (gen.reachedGoal() ? "yes" : "not yet");
  } else if (state === STATES.PLAY) {
    hud.textContent = "play — arrows / wasd   r: new maze";
  } else {
    hud.textContent = "goal reached";
  }
}

function tryMove(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
  if (maze.grid[ny][nx] !== OPEN) return;
  player.x = nx;
  player.y = ny;
  if (player.x === maze.goal.x && player.y === maze.goal.y) setState(STATES.WIN);
}

function handlePlayInput() {
  if (moveCooldown > 0) {
    moveCooldown -= 1;
    return;
  }
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx = -1;
  else if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx = 1;
  else if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy = -1;
  else if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy = 1;
  if (dx || dy) {
    tryMove(dx, dy);
    moveCooldown = 7;
  }
}

function beginGenerate() {
  setState(STATES.MAKE);
}

function frame() {
  if (state === STATES.START) {
    drawStart();
  } else if (state === STATES.MAKE) {
    gen.step();
    drawMake();
    if (gen.isDone()) setState(STATES.PLAY);
  } else if (state === STATES.PLAY) {
    handlePlayInput();
    drawPlay();
  } else {
    drawWin();
  }
  updateHud();
  requestAnimationFrame(frame);
}

function onConfirm() {
  if (state === STATES.START || state === STATES.WIN) beginGenerate();
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  if (e.key === "Enter" || e.key === " ") onConfirm();
  if ((e.key === "r" || e.key === "R") && (state === STATES.PLAY || state === STATES.WIN)) beginGenerate();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

canvas.addEventListener("click", onConfirm);

frame();
