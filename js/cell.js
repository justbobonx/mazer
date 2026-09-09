/** One maze cell. exits: [up, right, down, left] i.e. [-Y, +X, +Y, -X]. */

const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
};

const DIR_Y = [-1, 0, 1, 0];
const DIR_X = [0, 1, 0, -1];
const DIR_OPP = [2, 3, 0, 1];

function Cell(exits) {
  this.exits = exits ? exits.slice() : [0, 0, 0, 0];
}

Cell.prototype.open = function (dir) {
  return this.exits[dir] ? 1 : 0;
};

Cell.prototype.set = function (dir, value) {
  this.exits[dir] = value ? 1 : 0;
};

Cell.prototype.openings = function () {
  const out = [];
  for (let d = 0; d < 4; d++) if (this.exits[d]) out.push(d);
  return out;
};

/** Image index. bit0=right, bit1=down, bit2=left, bit3=up. [0,1,1,0] -> 3. */
Cell.prototype.mask = function () {
  const e = this.exits;
  return (e[1] & 1) | ((e[2] & 1) << 1) | ((e[3] & 1) << 2) | ((e[0] & 1) << 8 >> 5);
};
