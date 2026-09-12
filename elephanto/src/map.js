// Elephanto — the evil base map.
// '#' metal wall · '.' base floor · 'A' arena floor · 's' stash room floor
// 'g' gym floor · 'o' outdoor ground (walking here is slow).

var MAP = [
  'oooooooooooooooooooooooooooooo', // 0
  'oooooooooooooooooooooooooooooo', // 1
  'ooooooo################ooooooo', // 2
  'ooooooo##AAAAAA#ssssss#ooooooo', // 3
  'ooooooo##AAAAAA#ssssss#ooooooo', // 4
  'ooooooo##AAAAAA#ssssss#ooooooo', // 5
  'ooooooo##AAAAAA#ssssss#ooooooo', // 6
  'ooooooo##AAAAAA#ssssss#ooooooo', // 7
  'ooooooo#.##.######.####ooooooo', // 8  arena door col 11, stash door col 18
  'ooooooo#..............#ooooooo', // 9  main hall
  'ooooooo#..........gggg#ooooooo', // 10 gym door col 17
  'ooooooo#.........#gggg#ooooooo', // 11
  'ooooooo#.........#gggg#ooooooo', // 12
  'ooooooo#.........#gggg#ooooooo', // 13
  'ooooooo#..............#ooooooo', // 14
  'ooooooo#######..#######ooooooo', // 15 base entrance cols 14-15
  'oooooooooooooooooooooooooooooo', // 16
  'oooooooooooooooooooooooooooooo', // 17
  'oooooooooooooooooooooooooooooo', // 18
  'oooooooooooooooooooooooooooooo', // 19
  'oooooooooooooooooooooooooooooo', // 20
  'oooooooooooooooooooooooooooooo'  // 21
];
var MAP_W = MAP[0].length;
var MAP_H = MAP.length;

// Arena rectangle in cell coords (used to keep bosses inside).
var ARENA = { x0: 9, y0: 3, x1: 15, y1: 8 }; // x1/y1 exclusive

function mapChar(cx, cy) {
  cx = Math.floor(cx); cy = Math.floor(cy);
  if (cx < 0 || cy < 0 || cx >= MAP_W || cy >= MAP_H) return '#';
  return MAP[cy].charAt(cx);
}

function isWallXY(x, y)    { return mapChar(x, y) === '#'; }
function isOutdoorXY(x, y) { return mapChar(x, y) === 'o'; }
function isArenaXY(x, y)   { return mapChar(x, y) === 'A'; }
