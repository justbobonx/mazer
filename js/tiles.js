/** Wall tiles. Drawn last over the maze. files: images/wall_{type}_{mask}.png */

function TileSet(types) {
  this.types = types && types.length ? types.slice() : [1];
  this.index = 1;
  this.sets = {};
}

TileSet.prototype.currentType = function () {
  return this.types[this.index];
};

TileSet.prototype.srcFor = function (type, mask) {
  return "images/wall_" + type + "_" + mask + ".png";
};

TileSet.prototype.typeReady = function (type) {
  const images = this.sets[type];
  if (!images) return false;
  for (let i = 0; i < 16; i++) {
    const img = images[i];
    if (!img || !img.complete || !img.naturalWidth) return false;
  }
  return true;
};

TileSet.prototype.load = function (type) {
  if (type == null) {
    this.sets = {};
    for (let t = 0; t < this.types.length; t++) this.load(this.types[t]);
    return;
  }
  const images = new Array(16);
  this.sets[type] = images;
  for (let i = 0; i < 16; i++) {
    const img = new Image();
    img.src = this.srcFor(type, i);
    images[i] = img;
  }
};

TileSet.prototype.cycle = function () {
  if (!this.types.length) return this.currentType();
  this.index = (this.index + 1) % this.types.length;
  const type = this.currentType();
  if (!this.typeReady(type)) this.load(type);
  return type;
};

TileSet.prototype.draw = function (ctx, maze, originX, originY, cellSize) {
  let type = this.currentType();
  if (!this.typeReady(type)) {
    this.load(type);
    type = this.types.find((t) => this.typeReady(t));
    if (type == null) return;
  }
  const images = this.sets[type];
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const mask = maze.cell(y, x).mask();
      const img = images[mask];
      if (!img || !img.complete || !img.naturalWidth) continue;
      ctx.drawImage(img, originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
    }
  }
};
