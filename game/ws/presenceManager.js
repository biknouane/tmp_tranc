const { redis } = require('./redisClient');

const PREFIX = 'pong:player:';


async function setOnline(playerId) {
  console.log(`Setting player ${playerId} as online`);
  try {
    await redis.set(`${PREFIX}${playerId}`, 'online');
    console.log(`Player ${playerId} is now online`);
  } catch (err) {
    console.error(`❌ Failed to set player ${playerId} online in Redis:`, err);
  }
}

async function setOffline(playerId) {
  try {
    await redis.set(`${PREFIX}${playerId}`, 'offline');
  } catch (err) {
    console.error(`❌ setOffline error for ${playerId}:`, err);
  }
}

async function renameoldplayerkey(playerId, newPlayerId) {
  const oldKey = `${PREFIX}${playerId}`;
  const newKey = `${PREFIX}${newPlayerId}`;
  try {
    console.log(`Renaming player key from ${playerId} to ${newPlayerId}`);
    const exists = await redis.exists(oldKey);
    if (exists) {
      await redis.rename(oldKey, newKey);
    } else {
      throw new Error(`Player ID ${playerId} does not exist`);
    }
  } catch (err) {
    console.error(`❌ rename error:`, err);
  }
}

async function isOnline(playerId) {
  try {
    const status = await redis.get(`${PREFIX}${playerId}`);
    return status === 'online';
  } catch (err) {
    console.error(`❌ isOnline check failed for ${playerId}:`, err);
    return false;
  }
}

async function listOnlinePlayers() {
  const onlinePlayers = [];
  try {
    let cursor = '0';
    do {
      const scanResult = await redis.scan(cursor, {
        MATCH: `${PREFIX}*`,
        COUNT: 100
      });

      // scanResult is now an object with keys 'cursor' and 'keys'
      console.log('scanResult:', scanResult);

      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      const statuses = await Promise.all(keys.map(k => redis.get(k)));

      statuses.forEach((status, i) => {
        onlinePlayers.push({
          playerId: keys[i].replace(PREFIX, ''),
          status
        });
      });
    } while (cursor !== '0');
  } catch (err) {
    console.error('❌ listOnlinePlayers error:', err);
  }

  return onlinePlayers;
}

// getPlayerId function to extract playerId from token
async function getPlayerId(token) {
  try {
	const playerId = await redis.get(`${PREFIX}${token}`);
	if (!playerId) {
	  console.warn(`No player found for token ${token}`);
	  return null;
	}
	console.log(`Found playerId ${playerId} for token ${token}`);
	return playerId ? playerId.replace(PREFIX, '') : null;
  } catch (err) {
	console.error(`❌ getPlayerId error for token ${token}:`, err);
	return null;
  }
}

module.exports = {
  setOnline,
  setOffline,
  isOnline,
  listOnlinePlayers,
  renameoldplayerkey,
  getPlayerId
};
