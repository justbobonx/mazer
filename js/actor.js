/** Corridor body. Graph is the hit test. Draw is a stand-in for a Sprite. */

const ACTOR_EDGE = 1e-4;

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

Actor.prototype._edge = function (index, vel) {
  if (vel > 0) return (index + 1) * this.cellSize - ACTOR_EDGE;
  if (vel < 0) return index * this.cellSize + ACTOR_EDGE;
  return index * this.cellSize + this.cellSize / 2;
};

Actor.prototype._nudgeRail = function (maze, g, c) {
  if (this.iy) {
    const dir = this._axisDir(this.iy, false);
    if (dir >= 0 && maze.canExit(g.y, g.x, dir) && Math.abs(this.x - c.x) <= this.speed) {
      this.x = c.x;
    }
  }
  if (this.ix) {
    const dir = this._axisDir(this.ix, true);
    if (dir >= 0 && maze.canExit(g.y, g.x, dir) && Math.abs(this.y - c.y) <= this.speed) {
      this.y = c.y;
    }
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

  const nx = this.x + this.vx;
  const ny = this.y + this.vy;
  const ngx = Math.floor(nx / this.cellSize);
  const ngy = Math.floor(ny / this.cellSize);
  const crossedX = ngx !== g.x && this.vx !== 0;
  const crossedY = ngy !== g.y && this.vy !== 0;

  const dirX = this._axisDir(this.vx, true);
  const dirY = this._axisDir(this.vy, false);
  const canX = !crossedX || (dirX >= 0 && maze.canExit(g.y, g.x, dirX));
  const canY = !crossedY || (dirY >= 0 && maze.canExit(g.y, g.x, dirY));

  let keepX = true;
  let keepY = true;
  if (crossedX && crossedY && canX && canY) {
    const pick = this._pickAxis(oldVx, oldVy);
    keepX = pick === "x";
    keepY = pick === "y";
  }

  if (this.vx) {
    if (crossedX && !canX) {
      this.x = this._edge(g.x, this.vx);
      this.vx = 0;
    } else if (crossedX && !keepX) {
      this.x = this._edge(g.x, this.vx);
    } else {
      this.x = nx;
    }
  }

  if (this.vy) {
    if (crossedY && !canY) {
      this.y = this._edge(g.y, this.vy);
      this.vy = 0;
    } else if (crossedY && !keepY) {
      this.y = this._edge(g.y, this.vy);
    } else {
      this.y = ny;
    }
  }
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
