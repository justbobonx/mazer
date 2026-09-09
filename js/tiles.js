/** Wall tiles. Drawn last over the maze. files: images/wall_{type}_{mask}.png */

function TileSet(type) {
  this.type = type || 1;
  this.images = new Array(16);
  this.ready = false;
}

TileSet.prototype.load = function () {
  const self = this;
  let left = 16;
  this.ready = false;
  for (let i = 0; i < 16; i++) {
    const img = new Image();
    img.onload = function () {
      left -= 1;
      if (left <= 0) self.ready = true;
    };
    img.onerror = function () {
      left -= 1;
      if (left <= 0) self.ready = true;
    };
    img.src = "images/wall_" + this.type + "_" + i + ".png";
    this.images[i] = img;
  }
};

TileSet.prototype.draw = function (ctx, maze, originX, originY, cellSize) {
  if (!this.ready) return;
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const mask = maze.cell(y, x).mask();
      const img = this.images[mask];
      if (!img || !img.complete || !img.naturalWidth) continue;
      ctx.drawImage(img, originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
    }
  }
};
