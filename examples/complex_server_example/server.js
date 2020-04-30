const ReduxSocketServer = require('../../server');

const server = ReduxSocketServer.createWithPort(5000);

server.on("message", async ({ message, id }) => {
	console.log('Got message', message, 'for', id);
	
	const state = await server.getState(message._websocket_session);
	
	console.log('state is', state);
});
