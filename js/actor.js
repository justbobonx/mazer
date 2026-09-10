/** Corridor body. Graph is the hit test. Draw is a stand-in for a Sprite. */

function Actor(cellY, cellX, speed, cellSize, look) {
  this.speed = speed;
  this.cellSize = cellSize;
  this.dx = 0;
  this.dy = 0;
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
  this.dx = 0;
  this.dy = 0;
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

Actor.prototype.setInput = function (dx, dy) {
  this.dx = dx || 0;
  this.dy = dy || 0;
};

Actor.prototype._axisDir = function (delta, horiz) {
  if (delta > 0) return horiz ? DIR.RIGHT : DIR.DOWN;
  if (delta < 0) return horiz ? DIR.LEFT : DIR.UP;
  return -1;
};

/**
 * Try one axis. If the step would enter another cell, that exit must be open.
 * Closed: kill speed on that axis and snap that axis to this cell's center.
 * Open / same cell: keep the fluid position.
 */
Actor.prototype._slideAxis = function (maze, axis) {
  const g = this.grid();
  const c = this.centerOf(g.y, g.x);
  const horiz = axis === "x";
  const delta = horiz ? this.dx : this.dy;
  if (!delta) return;

  const nx = horiz ? this.x + delta * this.speed : this.x;
  const ny = horiz ? this.y : this.y + delta * this.speed;
  const ngx = Math.floor(nx / this.cellSize);
  const ngy = Math.floor(ny / this.cellSize);
  const crossed = horiz ? ngx !== g.x : ngy !== g.y;

  if (crossed) {
    const dir = this._axisDir(delta, horiz);
    if (dir < 0 || !maze.canExit(g.y, g.x, dir)) {
      if (horiz) {
        this.dx = 0;
        this.x = c.x;
      } else {
        this.dy = 0;
        this.y = c.y;
      }
      return;
    }
  }

  if (horiz) this.x = nx;
  else this.y = ny;
};

Actor.prototype.step = function (maze) {
  this._slideAxis(maze, "x");
  this._slideAxis(maze, "y");
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
