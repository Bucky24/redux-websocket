const WebSocket = require('ws');

module.exports = function(port) {
	console.log('Starting server on port', port);
	const wss = new WebSocket.Server({ port });

	const connections = [];

	wss.on('connection', function connection(ws) {
		connections.push(ws);
		console.log('Received connections. Total:', connections.length);
		ws.on('message', function incoming(message) {
			connections.forEach((conn) => {
				if (conn !== ws) {
					conn.send(message);
				}
			});
		});
	
		ws.on('close', () => {
			const index = connections.indexOf(ws);
			delete connections[index];

			console.log('Connection closed. Total:', connections.length);
		});
	});
}
