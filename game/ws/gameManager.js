const playerManager = require('./playerManager');
const matchManager = require('./matchManager');

const activeGames = new Map(); // matchId -> interval/game state

function startGame(match) {
  console.log(`Starting game for match ${match.id} with players: ${match.players.join(', ')}`);
  const matchId = match.id;
  const width = 2000, height = 1000;
  const baseSpeed = 17;

  const gameState = {
    ball: { 
      x: width / 2, 
      y: height / 2, 
      dx: baseSpeed * (Math.random() > 0.5 ? 1 : -1), // Random initial direction
      dy: baseSpeed * (Math.random() - 0.5) * 0.5, // Random vertical component
      size: 10,
      speed: baseSpeed,
      baseSpeed: baseSpeed,
      speedIncrement: 0.5
    },
    paddles: {
      left: { x: 20, y: height / 2 - 50, width: 25, height: 100, speed: 12 },
      right: { x: width - 40, y: height / 2 - 50, width: 20, height: 100, speed: 10 }
    },
    scores: {},
    canvas: { width, height },
    gameOver: false,
    resetInProgress: false
  };

  // Initialize scores with player IDs
  for (const playerId of match.players) {
    gameState.scores[playerId] = 0;
  }

  const interval = setInterval(() => {
    updateGame(matchId, gameState, match);
  }, 1000 / 60); // 60 FPS

  activeGames.set(matchId, { match, interval, gameState });
}

function updateGame(matchId, gameState, match) {
  if (gameState.gameOver || gameState.resetInProgress) return;

  const ball = gameState.ball;
  const leftPaddle = gameState.paddles.left;
  const rightPaddle = gameState.paddles.right;

  // Ball movement
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Ball collision with top and bottom walls
  if (ball.y - ball.size <= 0 || ball.y + ball.size >= gameState.canvas.height) {
    ball.dy = -ball.dy;
    ball.y = Math.max(ball.size, Math.min(gameState.canvas.height - ball.size, ball.y));
  }

  // Left paddle collision (more precise)
  if (ball.x - ball.size <= leftPaddle.x + leftPaddle.width &&
      ball.x + ball.size >= leftPaddle.x &&
      ball.y + ball.size >= leftPaddle.y &&
      ball.y - ball.size <= leftPaddle.y + leftPaddle.height &&
      ball.dx < 0) {
    
    const hitPos = (ball.y - leftPaddle.y) / leftPaddle.height;
    const angle = (hitPos - 0.5) * Math.PI * 0.6;
    
    ball.speed += ball.speedIncrement;
    ball.dx = Math.cos(angle) * ball.speed;
    ball.dy = Math.sin(angle) * ball.speed;
    ball.x = leftPaddle.x + leftPaddle.width + ball.size;
  }

  // Right paddle collision (more precise)
  if (ball.x + ball.size >= rightPaddle.x &&
      ball.x - ball.size <= rightPaddle.x + rightPaddle.width &&
      ball.y + ball.size >= rightPaddle.y &&
      ball.y - ball.size <= rightPaddle.y + rightPaddle.height &&
      ball.dx > 0) {
    
    const hitPos = (ball.y - rightPaddle.y) / rightPaddle.height;
    const angle = (hitPos - 0.5) * Math.PI * 0.6;
    
    ball.speed += ball.speedIncrement;
    ball.dx = -Math.cos(angle) * ball.speed;
    ball.dy = Math.sin(angle) * ball.speed;
    ball.x = rightPaddle.x - ball.size;
  }

  // Scoring
  if (ball.x < 0) {
    // Right player (player[1]) scores
    const scorer = match.players[1];
    gameState.scores[scorer]++;
    handleGoal(matchId, gameState, match);
  } else if (ball.x > gameState.canvas.width) {
    // Left player (player[0]) scores
    const scorer = match.players[0];
    gameState.scores[scorer]++;
    handleGoal(matchId, gameState, match);
  }

  broadcastGameState(matchId, gameState);
}

function handleGoal(matchId, gameState, match) {
  gameState.resetInProgress = true;
  
  // Check for game over (first to 5 wins, for example)
  const maxScore = 7;
  const scores = Object.values(gameState.scores);
  if (Math.max(...scores) >= maxScore) {
    gameState.gameOver = true;
    endGame(matchId);
    return;
  }

  // Reset ball after delay
  setTimeout(() => {
    resetBall(gameState.ball, gameState.canvas);
    gameState.resetInProgress = false;
  }, 1000);
}

function resetBall(ball, canvas) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speed = ball.baseSpeed;
  
  // Random direction for serve
  const angle = (Math.random() - 0.5) * Math.PI * 0.3; // 30 degree range
  const direction = Math.random() > 0.5 ? 1 : -1;
  
  ball.dx = Math.cos(angle) * ball.speed * direction;
  ball.dy = Math.sin(angle) * ball.speed;
}

function endGame(matchId) {
  const gameData = activeGames.get(matchId);
  if (!gameData) return;

  clearInterval(gameData.interval);
  
  // Broadcast game over
  for (const playerId of gameData.match.players) {
    const player = playerManager.getPlayer(playerId);
    if (player) {
      player.socket.send(JSON.stringify({
        type: 'game_over',
        data: {
          scores: gameData.gameState.scores,
          winner: getWinner(gameData.gameState.scores)
        }
      }));
    }
  }

  activeGames.delete(matchId);
}

function getWinner(scores) {
  const players = Object.keys(scores);
  return scores[players[0]] > scores[players[1]] ? players[0] : players[1];
}

function broadcastGameState(matchId, gameState) {
  const matchData = activeGames.get(matchId);
  if (!matchData) return;

  const gameStateToSend = {
    ball: gameState.ball,
    paddles: gameState.paddles,
    scores: gameState.scores,
    gameOver: gameState.gameOver
  };

  for (const playerId of matchData.match.players) {
    const player = playerManager.getPlayer(playerId);
    if (player) {
      player.socket.send(JSON.stringify({
        type: 'game_state',
        data: gameStateToSend
      }));
    }
  }
}

function updatePaddle(playerId, y) {
  for (const { gameState, match } of activeGames.values()) {
    if (match.players.includes(playerId)) {
      // Determine which paddle this player controls
      const paddleSide = playerId === match.players[0] ? 'left' : 'right';
      const paddle = gameState.paddles[paddleSide];
      
      // Constrain paddle movement within bounds
      const minY = 0;
      const maxY = gameState.canvas.height - paddle.height;
      paddle.y = Math.max(minY, Math.min(maxY, y));
    }
  }
}

function handleGoalScored(playerId) {
  // This can be called when client detects a goal for validation
  // Server will handle scoring in updateGame, but this can be used for validation
  console.log(`Goal scored message received from player ${playerId}`);
}

module.exports = {
  startGame,
  updatePaddle,
  handleGoalScored,
  endGame
};
