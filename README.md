# MAZER

HTML5 canvas maze. Open `index.html` in a browser.

## Grid

- Default cell size: 20px
- Default size: 21 x 31 (odd on purpose)
- Every cell is either wall or opening
- Passages live on odd coordinates; the outer ring is wall

Runner starts on the bottom-middle passage. Goal is the top-middle passage.

## Generation

Shown live in the `make` state, one carve per animation frame.

1. Grow winding paths from the runner. Heads keep their heading most of the time, turn sometimes, and occasionally split. Dead heads stop. If every head dies before the goal, a new head is spawned from an existing passage that still has an unused neighbor.
2. After the goal is reached and growing finishes, leftover passage cells that were never opened get linked to a random neighboring open cell.

Then it switches to play. Arrow keys or WASD move one cell at a time onto open cells. `R` builds a new maze.
