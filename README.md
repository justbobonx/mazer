# MAZER

HTML5 canvas maze. Open `index.html` in a browser.

Full-window canvas. 20px cells. Grid size is the largest odd width and height that fit; leftover pixels sit as a margin.

HTML overlay for start, pause, and score. Generation still draws on the canvas.

Movement is Pac-Man style: continuous along corridor centerlines, no sidestepping inside a passage. Turns happen at cell centers when that opening exists. Reverse is allowed immediately.

Four red diamonds spawn in the corner passages and keep going straight until a wall or a fork. They do not U-turn if another option exists.

Arrow keys / WASD. `P` or Esc pauses. `R` rebuilds. Goal is +100 and a new maze. Touch a diamond and you respawn.
