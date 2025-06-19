const playerManager = require('./playerManager');
const matchManager = require('./matchManager');
const gameManager = require('./gameManager');
// const tournamentManager = require('./tournamentManager');
const presenceManager = require('./presenceManager');

module.exports = {
  ping(connection, data, req, playerId) {
    connection.send(JSON.stringify({
      type: 'pong',
      data: { received: Date.now(), from: playerId }
    }));
  },
  
  auth(connection, data, req, playerId) {
    //update playerId in playerManager with the new data.token
    if (!data || !data.token) {
      return connection.send(JSON.stringify({
        type: 'error',
        data: { message: 'Token is required' }
      }));
    }
    const token = data.token;
    playerManager.updatePlayerToken(playerId, token);
    presenceManager.renameoldplayerkey(playerId, token).then(() => {
      connection.playerId = token;
      connection.send(JSON.stringify({
        type: 'auth_success',
        data: { playerId: token }
      }));
    }).catch(err => {
      console.error('Error renaming player key:', err);
      connection.send(JSON.stringify({
        type: 'error',
        data: { message: 'Failed to update player ID' }
      }));
    });
  },

  list_players(connection, data, req, playerId) {
    const all = playerManager.getAllPlayers().map(([id, p]) => ({
      playerId: id,
      status: p.status
    }));
    connection.send(JSON.stringify({
      type: 'player_list',
      data: all
    }));
  },

  join_match(connection, data, req, playerId) {
    const type = data?.type === '2v2' ? '2v2' : '1v1';
    const match = matchManager.joinMatch(playerId, type);

    connection.send(JSON.stringify({
      type: 'match_joined',
      data: { waiting: !match }
    }));
  },

  match_ready(connection, data, req, playerId) {
    const match = matchManager.getPlayerMatch(playerId);
    if (match && match.status === 'ready') {
      match.status = 'playing';
      gameManager.startGame(match);
    }
  },

  player_input(connection, data, req, playerId) {
    // data = { y: number }
    if (!data || typeof data.y !== 'number') {
      return connection.send(JSON.stringify({
        type: 'error',
        data: { message: `Invalid input data: ${JSON.stringify(data)} and typeof y is ${typeof data.y}` }
      }));
    }
    else
      console.log(`Player ${playerId} input:`, data.y);
    gameManager.updatePaddle(playerId, data.y);
  },

  // join_tournament(connection, data, req, playerId) {
  //   const tournamentId = data?.tournamentId;
  //   const ok = tournamentManager.joinTournament(tournamentId, playerId);
  //   connection.send(JSON.stringify({
  //     type: 'tournament_joined',
  //     data: { success: ok, tournamentId }
  //   }));
  // },

  // simulate_win(connection, data, req, playerId) {
  //   const tournamentId = data?.tournamentId;
  //   tournamentManager.reportMatchResult(tournamentId, playerId);
  // },

  list_online(connection, data, req, playerId) {
    presenceManager.listOnlinePlayers().then(players => {
      connection.send(JSON.stringify({
        type: 'online_list',
        data: players
      }));
    });
  }


};

