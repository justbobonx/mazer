/** Wall tiles. Drawn last over the maze. files: images/wall_{type}_{mask}.png */

function TileSet(types) {
  this.types = types && types.length ? types.slice() : [1];
  this.index = 0;
  this.sets = {};
  this.ready = false;
}

TileSet.prototype.currentType = function () {
  return this.types[this.index];
};

TileSet.prototype.cycle = function () {
  if (!this.types.length) return this.currentType();
  this.index = (this.index + 1) % this.types.length;
  return this.currentType();
};

TileSet.prototype.load = function () {
  const self = this;
  let left = this.types.length * 16;
  this.ready = false;
  this.sets = {};
  for (let t = 0; t < this.types.length; t++) {
    const type = this.types[t];
    const images = new Array(16);
    this.sets[type] = images;
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
      img.src = "images/wall_" + type + "_" + i + ".png";
      images[i] = img;
    }
  }
};

TileSet.prototype.draw = function (ctx, maze, originX, originY, cellSize) {
  const images = this.sets[this.currentType()];
  if (!images) return;
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const mask = maze.cell(y, x).mask();
      const img = images[mask];
      if (!img || !img.complete || !img.naturalWidth) continue;
      ctx.drawImage(img, originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
    }
  }
};
