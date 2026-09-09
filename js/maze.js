/** Maze grid + stepped generator. Walls and openings are both cells. */

const WALL = 0;
const OPEN = 1;

const DIRS = [
  { dx: 0, dy: -2, name: "N" },
  { dx: 2, dy: 0, name: "E" },
  { dx: 0, dy: 2, name: "S" },
  { dx: -2, dy: 0, name: "W" },
];

function oddNearCenter(n) {
  let m = Math.floor(n / 2);
  if (m % 2 === 0) m -= 1;
  return m;
}

function inBounds(x, y, cols, rows) {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

function isPassageCell(x, y, cols, rows) {
  return x % 2 === 1 && y % 2 === 1 && x > 0 && y > 0 && x < cols - 1 && y < rows - 1;
}

function createMaze(cols, rows) {
  if (cols % 2 === 0 || rows % 2 === 0) {
    throw new Error("cols and rows must be odd so the border stays wall and passages sit on odd cells");
  }
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = new Array(cols);
    for (let x = 0; x < cols; x++) row[x] = WALL;
    grid.push(row);
  }
  const start = { x: oddNearCenter(cols), y: rows - 2 };
  const goal = { x: oddNearCenter(cols), y: 1 };
  return { cols, rows, grid, start, goal };
}

function createGenerator(maze, opts = {}) {
  const branchChance = opts.branchChance ?? 0.2;
  const keepDirChance = opts.keepDirChance ?? 0.72;
  const goalBias = opts.goalBias ?? 0.28;

  const { cols, rows, grid, start, goal } = maze;
  grid[start.y][start.x] = OPEN;
  grid[goal.y][goal.x] = OPEN;

  const heads = [{ x: start.x, y: start.y, dir: null }];
  let reachedGoal = start.x === goal.x && start.y === goal.y;
  let phase = "grow";
  let leftovers = [];
  let lastCarved = { x: start.x, y: start.y };
  let steps = 0;

  function neighborsFrom(x, y, onlyWallPassages) {
    const out = [];
    for (const d of DIRS) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (!isPassageCell(nx, ny, cols, rows)) continue;
      if (onlyWallPassages && grid[ny][nx] === OPEN && !(nx === goal.x && ny === goal.y)) continue;
      if (onlyWallPassages && grid[ny][nx] === OPEN && nx === goal.x && ny === goal.y) {
        out.push({ x: nx, y: ny, dir: d.name, midX: x + d.dx / 2, midY: y + d.dy / 2, isGoal: true });
        continue;
      }
      if (onlyWallPassages && grid[ny][nx] !== WALL) continue;
      out.push({
        x: nx,
        y: ny,
        dir: d.name,
        midX: x + d.dx / 2,
        midY: y + d.dy / 2,
        isGoal: nx === goal.x && ny === goal.y,
      });
    }
    return out;
  }

  function carveTo(fromX, fromY, n) {
    grid[n.midY][n.midX] = OPEN;
    grid[n.y][n.x] = OPEN;
    lastCarved = { x: n.x, y: n.y };
    if (n.isGoal) reachedGoal = true;
  }

  function pickNeighbor(head, options) {
    if (!options.length) return null;
    const keep = options.filter((o) => o.dir === head.dir);
    if (head.dir && keep.length && Math.random() < keepDirChance) {
      return keep[Math.floor(Math.random() * keep.length)];
    }
    if (!reachedGoal && Math.random() < goalBias) {
      const closer = options.filter((o) => {
        const now = Math.abs(head.x - goal.x) + Math.abs(head.y - goal.y);
        const nxt = Math.abs(o.x - goal.x) + Math.abs(o.y - goal.y);
        return nxt < now;
      });
      if (closer.length) return closer[Math.floor(Math.random() * closer.length)];
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  function spawnHeadFromExisting() {
    const candidates = [];
    for (let y = 1; y < rows; y += 2) {
      for (let x = 1; x < cols; x += 2) {
        if (grid[y][x] !== OPEN) continue;
        const opts = neighborsFrom(x, y, true);
        if (opts.length) candidates.push({ x, y });
      }
    }
    if (!candidates.length) return false;
    const c = candidates[Math.floor(Math.random() * candidates.length)];
    heads.push({ x: c.x, y: c.y, dir: null });
    return true;
  }

  function collectLeftovers() {
    leftovers = [];
    for (let y = 1; y < rows; y += 2) {
      for (let x = 1; x < cols; x += 2) {
        if (grid[y][x] === WALL) leftovers.push({ x, y });
      }
    }
    for (let i = leftovers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = leftovers[i];
      leftovers[i] = leftovers[j];
      leftovers[j] = t;
    }
  }

  function fillStep() {
    if (!leftovers.length) {
      phase = "done";
      return { kind: "done" };
    }
    let idx = -1;
    let link = null;
    for (let i = 0; i < leftovers.length; i++) {
      const cell = leftovers[i];
      const opts = [];
      for (const d of DIRS) {
        const nx = cell.x + d.dx;
        const ny = cell.y + d.dy;
        if (!inBounds(nx, ny, cols, rows)) continue;
        if (grid[ny][nx] === OPEN) {
          opts.push({
            x: nx,
            y: ny,
            midX: cell.x + d.dx / 2,
            midY: cell.y + d.dy / 2,
          });
        }
      }
      if (opts.length) {
        idx = i;
        link = opts[Math.floor(Math.random() * opts.length)];
        break;
      }
    }
    if (idx === -1) {
      const cell = leftovers[0];
      let best = null;
      let bestD = Infinity;
      for (let y = 1; y < rows; y += 2) {
        for (let x = 1; x < cols; x += 2) {
          if (grid[y][x] !== OPEN) continue;
          const d = Math.abs(x - cell.x) + Math.abs(y - cell.y);
          if (d > 0 && d < bestD) {
            bestD = d;
            best = { x, y };
          }
        }
      }
      if (!best) {
        leftovers.splice(0, 1);
        grid[cell.y][cell.x] = OPEN;
        lastCarved = cell;
        return { kind: "fill", cell };
      }
      const stepX = Math.sign(best.x - cell.x);
      const stepY = best.x === cell.x ? Math.sign(best.y - cell.y) : 0;
      const midX = cell.x + stepX;
      const midY = cell.y + stepY;
      grid[cell.y][cell.x] = OPEN;
      if (inBounds(midX, midY, cols, rows)) grid[midY][midX] = OPEN;
      lastCarved = cell;
      leftovers.splice(0, 1);
      return { kind: "fill", cell };
    }
    const cell = leftovers[idx];
    leftovers.splice(idx, 1);
    grid[cell.y][cell.x] = OPEN;
    grid[link.midY][link.midX] = OPEN;
    lastCarved = cell;
    return { kind: "fill", cell };
  }

  function growStep() {
    if (!heads.length) {
      if (!reachedGoal) {
        if (!spawnHeadFromExisting()) {
          let x = start.x;
          let y = start.y;
          while (y > goal.y) {
            y -= 1;
            grid[y][x] = OPEN;
          }
          reachedGoal = true;
          lastCarved = { ...goal };
          return { kind: "grow", forced: true };
        }
        return { kind: "grow", respawn: true };
      }
      phase = "fill";
      collectLeftovers();
      return { kind: "phase", phase: "fill", leftoverCount: leftovers.length };
    }

    const useRandomHead = heads.length > 1 && Math.random() < 0.22;
    const hi = useRandomHead ? Math.floor(Math.random() * heads.length) : heads.length - 1;
    const head = heads[hi];
    const options = neighborsFrom(head.x, head.y, true);
    if (!options.length) {
      heads.splice(hi, 1);
      return { kind: "dead", x: head.x, y: head.y };
    }
    const chosen = pickNeighbor(head, options);
    carveTo(head.x, head.y, chosen);
    head.x = chosen.x;
    head.y = chosen.y;
    head.dir = chosen.dir;

    const remain = neighborsFrom(head.x, head.y, true);
    if (remain.length && Math.random() < branchChance) {
      heads.push({ x: head.x, y: head.y, dir: null });
      return { kind: "branch", x: head.x, y: head.y };
    }
    if (chosen.isGoal) {
      heads.splice(hi, 1);
      return { kind: "goal", x: chosen.x, y: chosen.y };
    }
    return { kind: "carve", x: chosen.x, y: chosen.y };
  }

  function step() {
    steps += 1;
    if (phase === "done") return { kind: "done", steps };
    if (phase === "fill") return fillStep();
    return growStep();
  }

  return {
    step,
    getPhase: () => phase,
    getHeads: () => heads,
    getLastCarved: () => lastCarved,
    getLeftovers: () => leftovers,
    reachedGoal: () => reachedGoal,
    getSteps: () => steps,
    isDone: () => phase === "done",
  };
}
