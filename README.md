# MAZER

HTML5 canvas maze. Open `index.html` in a browser.

Full-window canvas. Logical cells stay 20px. Grid size fills the window from 5×5 up to 20×20. If the window is larger than that 20×20 maze, the canvas transform scales the maze to use the extra space and centers leftover pixels as a margin.

Maze background color sits under the wall sprites. Default is `#000000`. Change it with `setMazeBg("#1a2030")`.

Each cell is `[up, right, down, left]`. `Maze.cells[y][x]` with `[0][0]` at the upper left. Opening a side also opens the opposite side on the neighbor. Wall tiles `images/wall_{type}_{mask}.png` are drawn last. Mask bits: up=1, right=2, down=4, left=8. Wall types live in `WALL_TYPES` (`[1, 2, 3]`). `W` cycles the active set.

HTML overlay for start, pause, and score. Generation still draws on the canvas.

Movement uses the maze graph as the hit test, not boxes. Actor takes input (`setInput`), steps per axis, and if that step would enter a new cell it asks `maze.canExit`. Closed: kill that axis and snap that axis to the current cell center. Open: keep the fluid x/y. Game feeds the player. Enemy picks a seek heading and uses the same Actor API.

Four red diamonds spawn in the corners and walk the graph toward the player.

Arrow keys / ASD. `W` cycles wall type. `P` or Esc pauses. `R` rebuilds. Goal is +100 and a new maze. Touch a diamond and you respawn.
