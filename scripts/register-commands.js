const commands = [
  {
    name: 'panel',
    description: '🎮 Open the predictor panel',
    type: 1,
  },
  {
    name: 'predict-mines',
    description: '💣 Get mines prediction',
    type: 1,
    options: [
      {
        name: 'bombs',
        description: 'Number of bombs',
        type: 4,
        required: true,
        choices: [
          { name: '1 Bomb', value: 1 },
          { name: '3 Bombs', value: 3 },
          { name: '5 Bombs', value: 5 },
          { name: '10 Bombs', value: 10 },
          { name: '15 Bombs', value: 15 },
          { name: '20 Bombs', value: 20 }
        ]
      },
      {
        name: 'predictions',
        description: 'How many safe tiles to predict',
        type: 4,
        required: true,
        choices: [
          { name: '1 Tile (Highest confidence)', value: 1 },
          { name: '2 Tiles (Very High)', value: 2 },
          { name: '3 Tiles (High)', value: 3 },
          { name: '4 Tiles (Good)', value: 4 },
          { name: '5 Tiles (Medium)', value: 5 },
          { name: '6 Tiles (Moderate)', value: 6 },
          { name: '7 Tiles (Lower)', value: 7 },
          { name: '8 Tiles (Low)', value: 8 },
          { name: '9 Tiles (Very Low)', value: 9 },
          { name: '10 Tiles (Risky)', value: 10 }
        ]
      },
      {
        name: 'hash',
        description: 'Game hash from Bloxflip',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'predict-towers',
    description: '🗼 Get towers prediction',
    type: 1,
    options: [
      {
        name: 'difficulty',
        description: 'Game difficulty',
        type: 3,
        required: true,
        choices: [
          { name: 'Easy (3 tiles, 1 bomb)', value: 'easy' },
          { name: 'Medium (2 tiles, 1 bomb)', value: 'medium' },
          { name: 'Hard (3 tiles, 2 bombs)', value: 'hard' }
        ]
      },
      {
        name: 'rows',
        description: 'How many rows to predict',
        type: 4,
        required: true,
        choices: [
          { name: '1 Row (95% confidence)', value: 1 },
          { name: '2 Rows (90% confidence)', value: 2 },
          { name: '3 Rows (85% confidence)', value: 3 },
          { name: '4 Rows (80% confidence)', value: 4 },
          { name: '5 Rows (75% confidence)', value: 5 },
          { name: '6 Rows (70% confidence)', value: 6 },
          { name: '7 Rows (65% confidence)', value: 7 },
          { name: '8 Rows (60% confidence)', value: 8 }
        ]
      },
      {
        name: 'hash',
        description: 'Game hash from Bloxflip',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'redeem',
    description: '🔑 Redeem a license key',
    type: 1,
    options: [
      {
        name: 'key',
        description: 'Your license key',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'license',
    description: '📋 Check your license status',
    type: 1,
  },
  {
    name: 'admin-generate',
    description: '🔐 Generate a license key (Admin only)',
    type: 1,
    options: [
      {
        name: 'days',
        description: 'License duration in days',
        type: 4,
        required: true
      }
    ]
  }
];

// ... rest of the file stays the same
