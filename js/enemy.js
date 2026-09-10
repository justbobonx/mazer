/** Seeker. Picks a graph step, then drives an Actor with the same setInput API. */

function Enemy(cellY, cellX, speed, cellSize) {
  this.actor = new Actor(cellY, cellX, speed, cellSize, {
    color: "#e23d3d",
    shape: "diamond",
    radius: 8,
  });
}

Enemy.prototype.think = function (maze, target) {
  const self = this.actor;
  const g = self.grid();
  const adx = target.x - self.x;
  const ady = target.y - self.y;

  const dirs = [];
  if (Math.abs(adx) >= Math.abs(ady)) {
    if (adx) dirs.push(adx > 0 ? DIR.RIGHT : DIR.LEFT);
    if (ady) dirs.push(ady > 0 ? DIR.DOWN : DIR.UP);
  } else {
    if (ady) dirs.push(ady > 0 ? DIR.DOWN : DIR.UP);
    if (adx) dirs.push(adx > 0 ? DIR.RIGHT : DIR.LEFT);
  }

  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    if (maze.canExit(g.y, g.x, d)) {
      self.setInput(DIR_X[d], DIR_Y[d]);
      return;
    }
  }

  self.setInput(0, 0);
};

Enemy.prototype.step = function (maze, target) {
  this.think(maze, target);
  this.actor.step(maze);
};

Enemy.prototype.draw = function (ctx) {
  this.actor.draw(ctx);
};
