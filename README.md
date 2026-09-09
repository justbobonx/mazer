# MAZER

HTML5 canvas maze. Open `index.html` in a browser.

Full-window canvas. 20px cells. Grid size fills the window; leftover pixels sit as a margin.

Each cell is `[up, right, down, left]`. `Maze.cells[y][x]` with `[0][0]` at the upper left. Opening a side also opens the opposite side on the neighbor. Wall tiles `images/wall_1_{mask}.png` are drawn last. Mask bits: up=1, right=2, down=4, left=8.

HTML overlay for start, pause, and score. Generation still draws on the canvas.

Movement is Pac-Man style: continuous along corridor centerlines, no sidestepping inside a passage. Turns happen at cell centers when that opening exists. Reverse is allowed immediately.

Four red diamonds spawn in the corners and keep going straight until a wall or a fork. They do not U-turn if another option exists.

Arrow keys / WASD. `P` or Esc pauses. `R` rebuilds. Goal is +100 and a new maze. Touch a diamond and you respawn.
