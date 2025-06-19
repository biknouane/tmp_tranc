const { v4: uuidv4 } = require('uuid');
const playerManager = require('./playerManager');
const matchManager = require('./matchManager');
const gameManager = require('./gameManager');

const tournaments = new Map();

function createTournament(type = '1v1') {
  const id = uuidv4();
  tournaments.set(id, {
    id,
    players: [],
    status: 'waiting',
    round: 0,
    bracket: [],
    type
  });
  return id;
}

function joinTournament(tournamentId, playerId) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament || tournament.status !== 'waiting') return false;

  tournament.players.push(playerId);

  if (tournament.players.length % 2 === 0) {
    startNextRound(tournamentId);
  }

  return true;
}

function startNextRound(tournamentId) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  const players = tournament.players;
  const matches = [];

  for (let i = 0; i < players.length; i += 2) {
    if (players[i + 1]) {
      matches.push([players[i], players[i + 1]]);
    } else {
      // Odd player out advances
      matches.push([players[i]]);
    }
  }

  tournament.bracket.push(matches);
  tournament.round += 1;
  tournament.status = 'active';

  for (const pair of matches) {
    if (pair.length === 2) {
      const [p1, p2] = pair;
      const match = matchManager.joinMatch(p1, '1v1');
      matchManager.joinMatch(p2, '1v1'); // force match
      gameManager.startGame(match);
    }
  }
}

function reportMatchResult(tournamentId, winnerId) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  const currentRound = tournament.bracket[tournament.round - 1];
  const winners = tournament.players.filter(p => p === winnerId);

  tournament.players = winners;

  if (winners.length === 1) {
    tournament.status = 'finished';
    const winnerSocket = playerManager.getPlayer(winners[0]);
    if (winnerSocket) {
      winnerSocket.socket.send(JSON.stringify({
        type: 'tournament_won',
        data: { tournamentId }
      }));
    }
  } else {
    startNextRound(tournamentId);
  }
}

module.exports = {
  createTournament,
  joinTournament,
  reportMatchResult
};
