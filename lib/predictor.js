function generateMinesPrediction(bombs, hash) {
  const grid = Array(25).fill(null);
  const confidence = Math.floor(Math.random() * 26) + 70; // 70-95%
  
  // Generate "safe" tiles based on hash
  const hashNum = parseInt(hash.slice(0, 8), 16);
  const safeTiles = [];
  
  let seed = hashNum;
  while (safeTiles.length < (25 - bombs)) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const tile = seed % 25;
    if (!safeTiles.includes(tile)) {
      safeTiles.push(tile);
    }
  }
  
  // Mark tiles
  safeTiles.slice(0, 5).forEach(tile => {
    grid[tile] = '✅';
  });
  
  return {
    grid,
    confidence,
    safeTiles: safeTiles.slice(0, 5),
    bombs,
    hash: hash.slice(0, 16)
  };
}

function generateTowersPrediction(difficulty, hash) {
  const modes = {
    easy: { rows: 8, bombs: 1, tiles: 3 },
    medium: { rows: 8, bombs: 1, tiles: 2 },
    hard: { rows: 8, bombs: 2, tiles: 3 }
  };
  
  const config = modes[difficulty];
  const confidence = Math.floor(Math.random() * 26) + 70;
  
  const hashNum = parseInt(hash.slice(0, 8), 16);
  const predictions = [];
  
  let seed = hashNum;
  for (let row = 0; row < config.rows; row++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const safeTile = seed % config.tiles;
    predictions.push(safeTile);
  }
  
  return {
    predictions,
    difficulty,
    confidence,
    rows: config.rows,
    hash: hash.slice(0, 16)
  };
}

module.exports = {
  generateMinesPrediction,
  generateTowersPrediction
};
