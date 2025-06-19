const players = new Map(); // key: playerId, value: { socket, status }

function addPlayer(playerId, socket) {
  players.set(playerId, { socket, status: 'idle' });
}

function removePlayer(playerId) {
  players.delete(playerId);
}

function getPlayer(playerId) {
  return players.get(playerId);
}

function setPlayerStatus(playerId, status) {
  const player = players.get(playerId);
  if (player) player.status = status;
}

function updatePlayerToken(playerId, token) {
  const player = players.get(playerId);
  if (player) {
    player.playerId = token; // Assuming you want to store a token for the player
  }
}

function getAllPlayers() {
  return Array.from(players.entries());
}

module.exports = {
  addPlayer,
  removePlayer,
  getPlayer,
  setPlayerStatus,
  getAllPlayers,
  updatePlayerToken
};
