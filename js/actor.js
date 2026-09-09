/** Corridor-locked mover. Turns at cell centers using Cell exits. */

function Actor(cellY, cellX, speed, cellSize) {
  this.speed = speed;
  this.cellSize = cellSize;
  this.dx = 0;
  this.dy = 0;
  this.place(cellY, cellX);
}

Actor.prototype.place = function (cellY, cellX) {
  const half = this.cellSize / 2;
  this.x = cellX * this.cellSize + half;
  this.y = cellY * this.cellSize + half;
};

Actor.prototype.grid = function () {
  return {
    y: Math.floor(this.y / this.cellSize),
    x: Math.floor(this.x / this.cellSize),
  };
};

Actor.prototype.centerOf = function (gy, gx) {
  const half = this.cellSize / 2;
  return { x: gx * this.cellSize + half, y: gy * this.cellSize + half };
};

Actor.prototype.vecToDir = function (dx, dy) {
  if (dy < 0) return DIR.UP;
  if (dx > 0) return DIR.RIGHT;
  if (dy > 0) return DIR.DOWN;
  if (dx < 0) return DIR.LEFT;
  return -1;
};

Actor.prototype.dirToVec = function (dir) {
  return { dx: DIR_X[dir], dy: DIR_Y[dir] };
};

function isReverseVec(a, b) {
  return a.dx === -b.dx && a.dy === -b.dy && (a.dx !== 0 || a.dy !== 0);
}

Actor.prototype.step = function (maze, chooseDir, wanted) {
  const g = this.grid();
  const c = this.centerOf(g.y, g.x);
  const atCenter = Math.abs(this.x - c.x) <= this.speed && Math.abs(this.y - c.y) <= this.speed;

  if (atCenter) {
    this.x = c.x;
    this.y = c.y;
    chooseDir(this, maze, g.y, g.x);
    const dir = this.vecToDir(this.dx, this.dy);
    if (dir < 0 || !maze.canExit(g.y, g.x, dir)) {
      this.dx = 0;
      this.dy = 0;
      return;
    }
  } else {
    if (this.dx !== 0) this.y = c.y;
    else if (this.dy !== 0) this.x = c.x;
  }

  if (wanted && (wanted.dx || wanted.dy) && isReverseVec(wanted, this)) {
    const rev = this.vecToDir(wanted.dx, wanted.dy);
    if (rev >= 0 && (maze.canExit(g.y, g.x, rev) || !atCenter)) {
      this.dx = wanted.dx;
      this.dy = wanted.dy;
    }
  }

  const nx = this.x + this.dx * this.speed;
  const ny = this.y + this.dy * this.speed;
  const ngy = Math.floor(ny / this.cellSize);
  const ngx = Math.floor(nx / this.cellSize);
  if (ngx !== g.x || ngy !== g.y) {
    const dir = this.vecToDir(this.dx, this.dy);
    if (dir < 0 || !maze.canExit(g.y, g.x, dir)) {
      this.x = c.x;
      this.y = c.y;
      this.dx = 0;
      this.dy = 0;
      return;
    }
  }
  this.x = nx;
  this.y = ny;
};

function choosePlayerDir(actor, maze, y, x, wanted) {
  if (wanted && (wanted.dx || wanted.dy)) {
    const d = actor.vecToDir(wanted.dx, wanted.dy);
    if (d >= 0 && maze.canExit(y, x, d)) {
      const v = actor.dirToVec(d);
      actor.dx = v.dx;
      actor.dy = v.dy;
      return;
    }
  }
  const d = actor.vecToDir(actor.dx, actor.dy);
  if (d >= 0 && maze.canExit(y, x, d)) return;
  actor.dx = 0;
  actor.dy = 0;
}

function chooseEnemyDir(actor, maze, y, x) {
  const cell = maze.cell(y, x);
  const opts = cell.openings();
  if (!opts.length) {
    actor.dx = 0;
    actor.dy = 0;
    return;
  }
  const cur = actor.vecToDir(actor.dx, actor.dy);
  const forward = opts.filter(function (d) { return d === cur; });
  const sides = opts.filter(function (d) { return d !== cur && d !== DIR_OPP[cur]; });
  const back = cur >= 0 ? opts.filter(function (d) { return d === DIR_OPP[cur]; }) : [];

  let pick = -1;
  if (sides.length + forward.length >= 2) {
    const pool = sides.concat(forward);
    pick = pool[Math.floor(Math.random() * pool.length)];
  } else if (forward.length) {
    return;
  } else if (sides.length) {
    pick = sides[Math.floor(Math.random() * sides.length)];
  } else if (back.length) {
    pick = back[0];
  }
  if (pick < 0) {
    actor.dx = 0;
    actor.dy = 0;
    return;
  }
  const v = actor.dirToVec(pick);
  actor.dx = v.dx;
  actor.dy = v.dy;
}
