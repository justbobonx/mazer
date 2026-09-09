/**
 * Maze.cells[y][x] is a Cell.
 * [0][0] is upper left. right -> [y][x+1], down -> [y+1][x].
 * Opening a side always opens the opposite side on the neighbor.
 */

function Maze(rows, cols) {
  this.rows = rows;
  this.cols = cols;
  this.cells = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) row.push(new Cell());
    this.cells.push(row);
  }
  this.start = { y: rows - 1, x: Math.floor(cols / 2) };
  this.goal = { y: 0, x: Math.floor(cols / 2) };
  this.heads = [];
  this.visited = [];
  this.leftovers = [];
  this.phase = "idle";
  this.lastCarved = { y: this.start.y, x: this.start.x };
  this.reachedGoal = false;
  this.steps = 0;
}

Maze.prototype.inBounds = function (y, x) {
  return y >= 0 && x >= 0 && y < this.rows && x < this.cols;
};

Maze.prototype.cell = function (y, x) {
  return this.cells[y][x];
};

Maze.prototype.canExit = function (y, x, dir) {
  if (!this.inBounds(y, x)) return false;
  if (!this.cells[y][x].open(dir)) return false;
  const ny = y + DIR_Y[dir];
  const nx = x + DIR_X[dir];
  return this.inBounds(ny, nx);
};

Maze.prototype.openPair = function (y, x, dir) {
  const ny = y + DIR_Y[dir];
  const nx = x + DIR_X[d];
  if (!this.inBounds(ny, nx)) return false;
  this.cells[y][x].set(dir, 1);
  this.cells[ny][nx].set(DIR_OPP[dir], 1);
  this.lastCarved = { y: ny, x: nx };
  return true;
};

Maze.prototype._key = function (y, x) {
  return y + "," + x;
};

Maze.prototype._markVisited = function (y, x) {
  this.visited[this._key(y, x)] = true;
};

Maze.prototype._isVisited = function (y, x) {
  return !!this.visited[this._key(y, x)];
};

Maze.prototype._isGoal = function (y, x) {
  return y === this.goal.y && x === this.goal.x;
};

Maze.prototype._unusedNeighbors = function (y, x) {
  const out = [];
  for (let d = 0; d < 4; d++) {
    const ny = y + DIR_Y[d];
    const nx = x + DIR_X[d];
    if (!this.inBounds(ny, nx)) continue;
    if (this._isVisited(ny, nx)) continue;
    out.push(d);
  }
  return out;
};

Maze.prototype._isSingleIsland = function (y, x) {
  for (let d = 0; d < 4; d++) {
    const ny = y + DIR_Y[d];
    const nx = x + DIR_X[d];
    if (!this.inBounds(ny, nx)) continue;
    if (!this._isVisited(ny, nx)) return false;
  }
  return true;
};

Maze.prototype._sealIslands = function () {
  for (let y = 0; y < this.rows; y++) {
    for (let x = 0; x < this.cols; x++) {
      if (this._isVisited(y, x)) continue;
      if (this._isGoal(y, x)) continue;
      if (!this._isSingleIsland(y, x)) continue;
      this._markVisited(y, x);
      this.lastCarved = { y: y, x: x };
    }
  }
};

Maze.prototype.beginGenerate = function (opts) {
  opts = opts || {};
  this.branchChance = opts.branchChance ?? 0.2;
  this.keepDirChance = opts.keepDirChance ?? 0.74;
  this.goalBias = opts.goalBias ?? 0.3;
  this.visited = Object.create(null);
  this.leftovers = [];
  this.reachedGoal = this.start.y === this.goal.y && this.start.x === this.goal.x;
  this._markVisited(this.start.y, this.start.x);
  this.heads = [{ y: this.start.y, x: this.start.x, dir: -1 }];
  this.phase = "grow";
  this.lastCarved = { y: this.start.y, x: this.start.x };
  this.steps = 0;
};

Maze.prototype._pickDir = function (head, options) {
  if (!options.length) return -1;
  if (head.dir >= 0 && options.indexOf(head.dir) >= 0 && Math.random() < this.keepDirChance) {
    return head.dir;
  }
  if (!this.reachedGoal && Math.random() < this.goalBias) {
    const closer = options.filter((d) => {
      const ny = head.y + DIR_Y[d];
      const nx = head.x + DIR_X[d];
      const now = Math.abs(head.y - this.goal.y) + Math.abs(head.x - this.goal.x);
      const nxt = Math.abs(ny - this.goal.y) + Math.abs(nx - this.goal.x);
      return nxt < now;
    });
    if (closer.length) return closer[Math.floor(Math.random() * closer.length)];
  }
  return options[Math.floor(Math.random() * options.length)];
};

Maze.prototype._spawnHead = function () {
  const candidates = [];
  for (let y = 0; y < this.rows; y++) {
    for (let x = 0; x < this.cols; x++) {
      if (!this._isVisited(y, x)) continue;
      if (this._unusedNeighbors(y, x).length) candidates.push({ y: y, x: x });
    }
  }
  if (!candidates.length) return false;
  const c = candidates[Math.floor(Math.random() * candidates.length)];
  this.heads.push({ y: c.y, x: c.x, dir: -1 });
  return true;
};

Maze.prototype._collectLeftovers = function () {
  this.leftovers = [];
  for (let y = 0; y < this.rows; y++) {
    for (let x = 0; x < this.cols; x++) {
      if (!this._isVisited(y, x)) this.leftovers.push({ y: y, x: x });
    }
  }
  for (let i = this.leftovers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = this.leftovers[i];
    this.leftovers[i] = this.leftovers[j];
    this.leftovers[j] = t;
  }
};

Maze.prototype._growStep = function () {
  if (!this.heads.length) {
    this._sealIslands();
    if (this._spawnHead()) return;
    this.phase = "fill";
    this._collectLeftovers();
    return;
  }

  const useRandom = this.heads.length > 1 && Math.random() < 0.22;
  const hi = useRandom ? Math.floor(Math.random() * this.heads.length) : this.heads.length - 1;
  const head = this.heads[hi];
  const options = this._unusedNeighbors(head.y, head.x);
  if (!options.length) {
    this.heads.splice(hi, 1);
    return;
  }
  const d = this._pickDir(head, options);
  const ny = head.y + DIR_Y[d];
  const nx = head.x + DIR_X[d];
  this.openPair(head.y, head.x, d);
  this._markVisited(ny, nx);
  head.y = ny;
  head.x = nx;
  head.dir = d;
  if (this._isGoal(ny, nx)) this.reachedGoal = true;

  const remain = this._unusedNeighbors(ny, nx);
  if (remain.length && Math.random() < this.branchChance) {
    this.heads.push({ y: ny, x: nx, dir: -1 });
  }
};

Maze.prototype._fillStep = function () {
  if (!this.leftovers.length) {
    this.phase = "done";
    return;
  }
  let idx = -1;
  let dir = -1;
  for (let i = 0; i < this.leftovers.length; i++) {
    const c = this.leftovers[i];
    const opts = [];
    for (let d = 0; d < 4; d++) {
      const ny = c.y + DIR_Y[d];
      const nx = c.x + DIR_X[d];
      if (this.inBounds(ny, nx) && this._isVisited(ny, nx)) opts.push(d);
    }
    if (opts.length) {
      idx = i;
      dir = opts[Math.floor(Math.random() * opts.length)];
      break;
    }
  }
  if (idx < 0) {
    const c = this.leftovers.shift();
    this._markVisited(c.y, c.x);
    this.lastCarved = c;
    return;
  }
  const c = this.leftovers.splice(idx, 1)[0];
  this.openPair(c.y, c.x, dir);
  this._markVisited(c.y, c.x);
  if (this._isGoal(c.y, c.x)) this.reachedGoal = true;
};

Maze.prototype.stepGenerate = function () {
  this.steps += 1;
  if (this.phase === "grow") this._growStep();
  else if (this.phase === "fill") this._fillStep();
};

Maze.prototype.isDone = function () {
  return this.phase === "done";
};
