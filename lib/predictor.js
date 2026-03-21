function calculateConfidence(bombs, predictedTiles) {
  // Base confidence starts high
  let baseConfidence = 95;
  
  // Reduce confidence based on number of predictions
  const predictionPenalty = (predictedTiles - 1) * 3; // -3% per extra tile
  
  // Reduce confidence based on bomb count
  const bombPenalty = Math.floor(bombs / 5) * 2; // -2% per 5 bombs
  
  // Calculate final confidence
  let confidence = baseConfidence - predictionPenalty - bombPenalty;
  
  // Add some randomness for realism (+/- 5%)
  confidence += Math.floor(Math.random() * 11) - 5;
  
  // Clamp between 60-95%
  confidence = Math.max(60, Math.min(95, confidence));
  
  return confidence;
}

function generateMinesPrediction(bombs, predictedTiles, hash) {
  const grid = Array(25).fill(null);
  const confidence = calculateConfidence(bombs, predictedTiles);
  
  // Generate safe tiles based on hash
  const hashNum = parseInt(hash.slice(0, 8), 16);
  const safeTiles = [];
  
  let seed = hashNum;
  const maxSafeTiles = 25 - bombs;
  
  // Generate all safe positions
  while (safeTiles.length < maxSafeTiles) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const tile = seed % 25;
    if (!safeTiles.includes(tile)) {
      safeTiles.push(tile);
    }
  }
  
  // Select only the requested number of predictions
  const predictions = safeTiles.slice(0, predictedTiles);
  
  // Mark predicted tiles on grid
  predictions.forEach(tile => {
    grid[tile] = '✅';
  });
  
  return {
    grid,
    confidence,
    safeTiles: predictions,
    totalSafeTiles: maxSafeTiles,
    bombs,
    predictedCount: predictedTiles,
    hash: hash.slice(0, 16)
  };
}

function calculateTowersConfidence(difficulty, rowCount) {
  const baseConfidence = {
    easy: 95,
    medium: 90,
    hard: 85
  };
  
  let confidence = baseConfidence[difficulty];
  
  // Reduce confidence for more rows
  const rowPenalty = (rowCount - 1) * 4; // -4% per additional row
  confidence -= rowPenalty;
  
  // Add randomness
  confidence += Math.floor(Math.random() * 11) - 5;
  
  // Clamp between 60-95%
  confidence = Math.max(60, Math.min(95, confidence));
  
  return confidence;
}

function generateTowersPrediction(difficulty, rowCount, hash) {
  const modes = {
    easy: { tiles: 3, bombs: 1 },
    medium: { tiles: 2, bombs: 1 },
    hard: { tiles: 3, bombs: 2 }
  };
  
  const config = modes[difficulty];
  const confidence = calculateTowersConfidence(difficulty, rowCount);
  
  const hashNum = parseInt(hash.slice(0, 8), 16);
  const predictions = [];
  
  let seed = hashNum;
  for (let row = 0; row < rowCount; row++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const safeTile = seed % config.tiles;
    predictions.push(safeTile);
  }
  
  return {
    predictions,
    difficulty,
    confidence,
    rows: rowCount,
    totalRows: 8,
    hash: hash.slice(0, 16)
  };
}

module.exports = {
  generateMinesPrediction,
  generateTowersPrediction
};
