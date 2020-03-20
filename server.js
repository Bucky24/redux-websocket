const WebSocket = require('ws');

const data = {};
const connectionsBySession = {};
const sessionMaster = {};

module.exports = function(port) {
	console.log('Starting server on port', port);
	const wss = new WebSocket.Server({ port });

	const connections = [];

	wss.on('connection', function connection(ws) {
		let mySession = null;
		connections.push(ws);
		console.log('Received connection. Total:', connections.length);
		ws.on('message', function incoming(message) {
			try {
				const messageObj = JSON.parse(message);
				const sessionID = messageObj._websocket_session;
				mySession = sessionID;
				if (messageObj.messageType === 'redux_action') {
					connectionsBySession[sessionID].forEach((conn) => {
						if (conn !== ws) {
							conn.send(message);
						}
					});
				} else if (messageObj.messageType === 'getState') {
					if (!connectionsBySession[sessionID]) {
						connectionsBySession[sessionID] = [];
					}
					
					connectionsBySession[sessionID].push(ws);
					console.log(`Connection authenticated to session "${sessionID}"`);
					
					if (!sessionMaster[sessionID]) {
						// if there is no session data, we need to fetch it from this connection.
						sessionMaster[sessionID] = ws;
					}
					console.log('Requesting state from master');
					sessionMaster[sessionID].send(JSON.stringify({
						_websocket_session: sessionID,
						messageType: "getState"
					}));
				} else if (messageObj.messageType === "setState") {
					// push the state to all connected clients
					// anyone already with state will just ignore the message
					console.log(`Pushing state for "${sessionID}"`)
					connectionsBySession[sessionID].forEach((conn) => {
						if (conn !== ws) {
							conn.send(JSON.stringify({
								_sebsocket_session: sessionID,
								messageType: 'setState',
								state: messageObj.state
							}));
						}
					});
				}
			} catch (error) {
				console.error('Error processing message', message, error);
			}
		});
	
		ws.on('close', () => {
			const index = connections.indexOf(ws);
			connections.splice(index, 1);
			
			const sessionConnections = connectionsBySession[mySession];
			
			const index2 = sessionConnections.indexOf(ws);
			sessionConnections.splice(index2, 1);

			console.log(`Connection closed for "${mySession}". Total:`, connections.length);
			
			if (ws == sessionMaster[mySession]) {
				if (sessionConnections.length > 0) {
					console.log('Lost session master, promoting next session');
					sessionMaster[mySession] = sessionConnections[0];
				} else {
					console.log('Lost last session');
					delete sessionMaster[mySession];
				}
			}
		});
	});
}
