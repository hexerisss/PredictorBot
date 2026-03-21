function calculateConfidence(bombs, predictedTiles) {
  // Base confidence starts high
  let baseConfidence = 95;
  
  // Heavy penalty for high bomb counts
  if (bombs >= 23) {
    baseConfidence = 55; // Extremely unlikely
  } else if (bombs >= 20) {
    baseConfidence = 60; // Very unlikely
  } else if (bombs >= 15) {
    baseConfidence = 70;
  } else if (bombs >= 10) {
    baseConfidence = 80;
  } else if (bombs >= 5) {
    baseConfidence = 88;
  }
  
  // Reduce confidence based on number of predictions
  const predictionPenalty = (predictedTiles - 1) * 3; // -3% per extra tile
  
  // Additional bomb penalty
  const bombPenalty = Math.floor(bombs / 3) * 2; // -2% per 3 bombs
  
  // Calculate final confidence
  let confidence = baseConfidence - predictionPenalty - bombPenalty;
  
  // Add some randomness for realism (+/- 3%)
  confidence += Math.floor(Math.random() * 7) - 3;
  
  // Clamp between 50-95%
  confidence = Math.max(50, Math.min(95, confidence));
  
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
  const predictions = safeTiles.slice(0, Math.min(predictedTiles, maxSafeTiles));
  
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
  
  // Add randomness (+/- 3%)
  confidence += Math.floor(Math.random() * 7) - 3;
  
  // Clamp between 55-95%
  confidence = Math.max(55, Math.min(95, confidence));
  
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
