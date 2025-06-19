// const Fastify = require('fastify');
// const websocketPlugin = require('@fastify/websocket');

// const app = Fastify();

// app.register(websocketPlugin);
// app.register(require('./ws'));

// app.listen({ port: 3000, host: '0.0.0.0' }, err => {
//   if (err) {
//     app.log.error(err);
//     process.exit(1);
//   }
//   console.log('WebSocket server listening on ws://0.0.0.0:3000/ws/game');
// });
  
const Fastify = require('fastify');
const websocketPlugin = require('@fastify/websocket');
const { connect } = require('./ws/redisClient'); // Adjust path if needed

async function start() {
  // Connect Redis first
  await connect();

  // Create Fastify instance
  const app = Fastify();

  // Register websocket plugin and routes
  app.register(websocketPlugin);
  app.register(require('./ws')); // your websocket handlers

  // Start server
  await app.listen({ port: 3000, host: '0.0.0.0' });

  console.log('WebSocket server listening on ws://0.0.0.0:3000/ws/game');
}

// Start everything and catch errors
start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
