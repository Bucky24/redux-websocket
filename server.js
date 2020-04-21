const WebSocket = require('ws');

const data = {};
const connectionsBySession = {};
const sessionMaster = {};

let connection_id = 0;
const connections = [];

module.exports = {
	createWithPort: (port) => {
		console.log('Starting server with port', port);
		const wss = new WebSocket.Server({ port });
		createSocket(wss);
	},
	createWithExpress: (server) => {
		console.log('Starting socket server with web server');
		const wss = new WebSocket.Server({ server });
		createSocket(wss);
	}
}

const createSocket = (wss) => {
	wss.on('connection', function connection(ws) {
		let mySession = null;
		connections.push(ws);
		console.log(`Received connection. Total:`, connections.length);
		ws.on('message', function incoming(message) {
			try {
				const messageObj = JSON.parse(message);
				const sessionID = messageObj._websocket_session;
				mySession = sessionID;
				if (messageObj.messageType === 'redux_action') {
					connectionsBySession[sessionID].forEach(({ conn }) => {
						if (conn !== ws) {
							conn.send(message);
						}
					});
				} else if (messageObj.messageType === 'redux_user_action') {
					// broadcast to every client, including the one that sent it
					connectionsBySession[sessionID].forEach(({ conn }) => {
						conn.send(message);
					});
				} else if (messageObj.messageType === 'getState') {
					let isNewSession = false;
					if (!connectionsBySession[sessionID]) {
						connectionsBySession[sessionID] = [];
						isNewSession = true;
					}
					
					connectionID = connection_id;
					connection_id ++;
					connectionsBySession[sessionID].push({
						conn: ws,
						id: connectionID,
					});
					console.log(`Connection authenticated to session "${sessionID}". Given id ${connectionID}`);
					
					if (!sessionMaster[sessionID]) {
						// if there is no session data, we need to fetch it from this connection.
						sessionMaster[sessionID] = {
							conn: ws,
							id: connectionID,
						};
					}
					console.log('Requesting state from master');
					sessionMaster[sessionID].conn.send(JSON.stringify({
						_websocket_session: sessionID,
						messageType: "getState",
						connectionID: sessionMaster[sessionID].id,
						newSession: isNewSession,
					}));
				} else if (messageObj.messageType === "setState") {
					// push the state to all connected clients
					// anyone already with state will just ignore the message
					// also push the client's connection ID so they can store it
					// for later.
					console.log(`Pushing state for "${sessionID}"`)
					connectionsBySession[sessionID].forEach(({ conn, id }) => {
						if (conn !== ws) {
							conn.send(JSON.stringify({
								_sebsocket_session: sessionID,
								messageType: 'setState',
								state: messageObj.state,
								connectionID: id,
							}));
						}
					});
				} else if (messageObj.messageType === "setUserData") {
					const connectionID = messageObj.connectionID;
					console.log(`Connection ${connectionID} with state ${sessionID} is pushing their user state`);
					connectionsBySession[sessionID].forEach(({ conn, id }) => {
						conn.send(JSON.stringify({
							_sebsocket_session: sessionID,
							messageType: 'setUserData',
							state: messageObj.state,
							connectionID: connectionID,
						}));
					});
				} else if (messageObj.messageType === "clientLog") {
					console.log(`Got client log from ${connectionID}: ${JSON.stringify(messageObj.data)}`);
				} else if (messageObj.messageType === "ping") {
					ws.send(JSON.stringify({
						messageType: 'pong',
						time: messageObj.time,
					}));
				}
			} catch (error) {
				console.error('Error processing message', message, error);
			}
		});
	
		ws.on('close', () => {
			const index = connections.indexOf(ws);
			connections.splice(index, 1);
			console.log("Connection closed. Total connections:", connections.length);
			
			const sessionConnections = connectionsBySession[mySession];
			if (!sessionConnections) {
				console.log(`Connection closed for "${mySession}". No connection array found.`);
				return;
			}
			const index2 = sessionConnections.findIndex(({ conn }) => {
				return conn === ws;
			});
			let myID;
			if (index2 < 0) {
				console.error(`Warning: Unable to find a session connection for our socket.`);
			} else {
				const obj = sessionConnections[index2];
				myID = obj.id;
				sessionConnections.splice(index2, 1);
			}

			console.log(`Connection closed for "${mySession}". Total:`, sessionConnections.length);
			
			if (sessionConnections.length > 0) {
				// broadcast leader to the system
				sessionConnections.forEach(({ conn }) => {
					conn.send(JSON.stringify({
						messageType: 'userLeft',
						connectionID: myID,
					}));
				});
			}
			
			if (ws == sessionMaster[mySession].conn) {
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
