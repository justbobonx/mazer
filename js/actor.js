/** Corridor body. Graph is the hit test. Draw is a stand-in for a Sprite. */

function Actor(cellY, cellX, speed, cellSize, look) {
  this.speed = speed;
  this.accel = speed;
  this.reverseAccel = (speed * 2) / 3;
  this.cellSize = cellSize;
  this.vx = 0;
  this.vy = 0;
  this.ix = 0;
  this.iy = 0;
  look = look || {};
  this.color = look.color || "#ffb347";
  this.shape = look.shape || "circle";
  this.radius = look.radius != null ? look.radius : 7;
  this.place(cellY, cellX);
}

Actor.prototype.place = function (cellY, cellX) {
  const half = this.cellSize / 2;
  this.x = cellX * this.cellSize + half;
  this.y = cellY * this.cellSize + half;
  this.vx = 0;
  this.vy = 0;
  this.ix = 0;
  this.iy = 0;
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

Actor.prototype.setInput = function (ix, iy) {
  this.ix = ix || 0;
  this.iy = iy || 0;
};

Actor.prototype._approach = function (v, target) {
  const delta = target - v;
  if (delta === 0) return v;
  const reversing = v !== 0 && target !== 0 && (v > 0) !== (target > 0);
  const step = reversing ? this.reverseAccel : this.accel;
  if (Math.abs(delta) <= step) return target;
  return v + (delta > 0 ? step : -step);
};

Actor.prototype._axisDir = function (delta, horiz) {
  if (delta > 0) return horiz ? DIR.RIGHT : DIR.DOWN;
  if (delta < 0) return horiz ? DIR.LEFT : DIR.UP;
  return -1;
};

Actor.prototype._open = function (maze, g, delta, horiz) {
  const dir = this._axisDir(delta, horiz);
  return dir >= 0 && maze.canExit(g.y, g.x, dir);
};

/** Closed face: cannot leave this cell's center toward that face. */
Actor.prototype._againstCenter = function (pos, vel, center, open) {
  if (!vel) return { pos: pos, vel: vel };
  if (open) return { pos: pos + vel, vel: vel };
  const next = pos + vel;
  if (vel > 0 && next > center) return { pos: center, vel: 0 };
  if (vel < 0 && next < center) return { pos: center, vel: 0 };
  return { pos: next, vel: vel };
};

Actor.prototype._nudgeRail = function (maze, g, c) {
  if (this.iy && this._open(maze, g, this.iy, false) && Math.abs(this.x - c.x) <= this.speed) {
    this.x = c.x;
  }
  if (this.ix && this._open(maze, g, this.ix, true) && Math.abs(this.y - c.y) <= this.speed) {
    this.y = c.y;
  }
};

/** Analog first. Equal analog falls back to pre-accel speeds. Dead tie keeps x. */
Actor.prototype._pickAxis = function (oldVx, oldVy) {
  const ax = Math.abs(this.ix);
  const ay = Math.abs(this.iy);
  if (ax > ay) return "x";
  if (ay > ax) return "y";
  if (Math.abs(oldVx) >= Math.abs(oldVy)) return "x";
  return "y";
};

Actor.prototype.step = function (maze) {
  const oldVx = this.vx;
  const oldVy = this.vy;

  this.vx = this._approach(this.vx, this.ix * this.speed);
  this.vy = this._approach(this.vy, this.iy * this.speed);

  const g = this.grid();
  const c = this.centerOf(g.y, g.x);
  this._nudgeRail(maze, g, c);

  const xHit = this._againstCenter(this.x, this.vx, c.x, this._open(maze, g, this.vx, true));
  const yHit = this._againstCenter(this.y, this.vy, c.y, this._open(maze, g, this.vy, false));
  let nx = xHit.pos;
  let ny = yHit.pos;
  this.vx = xHit.vel;
  this.vy = yHit.vel;

  const offX = Math.abs(nx - c.x) > 0.0001;
  const offY = Math.abs(ny - c.y) > 0.0001;
  if (offX && offY) {
    const pick = this._pickAxis(oldVx, oldVy);
    if (pick === "x") {
      if (Math.abs(this.y - c.y) <= this.speed && this._open(maze, g, this.vx, true)) {
        ny = c.y;
        this.vy = 0;
      } else {
        nx = c.x;
        this.vx = 0;
      }
    } else if (Math.abs(this.x - c.x) <= this.speed && this._open(maze, g, this.vy, false)) {
      nx = c.x;
      this.vx = 0;
    } else {
      ny = c.y;
      this.vy = 0;
    }
  }

  this.x = nx;
  this.y = ny;
};

Actor.prototype.draw = function (ctx) {
  // later: this.sprite.x = this.x; this.sprite.y = this.y; this.sprite.draw(ctx);
  ctx.fillStyle = this.color;
  if (this.shape === "diamond") {
    const s = this.radius;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - s);
    ctx.lineTo(this.x + s, this.y);
    ctx.lineTo(this.x, this.y + s);
    ctx.lineTo(this.x - s, this.y);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
  ctx.fill();
};
