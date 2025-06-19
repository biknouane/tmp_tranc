const { v4: uuidv4 } = require('uuid');
const playerManager = require('./playerManager');

const matches = new Map(); // matchId -> match object
const waitingQueue = {
  '1v1': [],
  '2v2': []
};

function joinMatch(playerId, type = '1v1') {
  const queue = waitingQueue[type];

  queue.push(playerId);

  const requiredPlayers = type === '1v1' ? 2 : 4;

  if (queue.length >= requiredPlayers) {
    const players = queue.splice(0, requiredPlayers);
    const matchId = uuidv4();
    const match = {
      id: matchId,
      players,
      status: 'ready',
      type
    };
    matches.set(matchId, match);

    // Update player status
    players.forEach(p => playerManager.setPlayerStatus(p, `in-match:${matchId}`));

    // Notify players that they are ready to play
    players.forEach(p => {
      const entry = playerManager.getPlayer(p);
      if (entry) {
        entry.socket.send(JSON.stringify({
          type: 'match_ready',
          data: { matchId, players }
        }));
      }
    });

    return match;
  }

  return null;
}

function getPlayerMatch(playerId) {
  for (const match of matches.values()) {
    if (match.players.includes(playerId)) {
      return match;
    }
  }
  return null;
}

function getMatch(matchId) {
  return matches.get(matchId);
}

function removeMatch(matchId) {
  matches.delete(matchId);
}

module.exports = {
  joinMatch,
  getMatch,
  removeMatch,
  getPlayerMatch
};
