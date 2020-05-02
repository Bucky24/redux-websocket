const WebSocket = require('ws');

module.exports = {
	createWithPort: (port) => {
		console.log('Starting server with port', port);
		const wss = new WebSocket.Server({ port });
		return new Socket(wss);
	},
	createWithExpress: (server) => {
		console.log('Starting socket server with web server');
		const wss = new WebSocket.Server({ server });
		return new Socket(wss);
	}
}

class Socket {
	constructor(wss) {
		this.server = wss;
		
		this.connectionsBySession = {};
		this.sessionMaster = {};
		this.connectionData = {};

		this.connection_id = 0;
		this.connections = [];
		
		this.handleConnection = this.handleConnection.bind(this);
		this.handleClose = this.handleClose.bind(this);
		
		this.eventHandlers = {};
		this.eventID = 0;
		
		wss.on('connection', this.handleConnection);
	}
	
	on(event, cb) {
		if (!this.eventHandlers[event]) {
			this.eventHandlers[event] = [];
		}
		
		this.eventHandlers[event].push(cb);
	}
	
	async handleEvent(event, data) {
		if (!this.eventHandlers[event]) {
			return;
		}
		
		let result = null;
		
		this.eventHandlers[event].forEach((cb) => {
			result = cb(data);
		});
		
		return result;
	}
	
	handleConnection(ws) {
		let mySession = null;
		this.connections.push(ws);
		this.connectionData[ws] = {
			session: null,
			id: null,
		};
		console.log(`Received connection. Total:`, this.connections.length);
		ws.on('message', (message) => {
			this.handleMessage(ws, message);
		});
		
		ws.on('close', () => {
			this.handleClose(ws);
		});
	}
	
	handleClose(ws) {
		const index = this.connections.indexOf(ws);
		this.connections.splice(index, 1);
		const connectionData = this.connectionData[ws];
		const session = connectionData ? connectionData.session : null;
		const identifier = connectionData ? connectionData.id : null;
		console.log("Connection closed. Total connections:", this.connections.length);
		
		const sessionConnections = this.connectionsBySession[session];
		if (!sessionConnections) {
			console.log(`Connection closed for "${session}". No connection array found.`);
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

		console.log(`Connection closed for "${session}". Total:`, sessionConnections.length);
		
		if (sessionConnections.length > 0) {
			// broadcast leader to the system
			sessionConnections.forEach(({ conn }) => {
				conn.send(JSON.stringify({
					messageType: 'userLeft',
					connectionID: identifier,
				}));
			});
		}
		
		if (ws == this.sessionMaster[session].conn) {
			if (sessionConnections.length > 0) {
				console.log('Lost session master, promoting next session');
				this.sessionMaster[session] = sessionConnections[0];
			} else {
				console.log('Lost last session');
				delete this.sessionMaster[session];
				delete this.connectionsBySession[session];
			}
		}
	}
	
	getState(session) {
		const master = this.sessionMaster[session];
		
		if (!master) {
			return Promise.resolve({});
		}
		
		console.log('Attempting to fetch state for', session);
		
		const id = this.eventID;
		this.eventID ++;
		
		master.conn.send(JSON.stringify({
			_websocket_session: session,
			messageType: "getState",
			newSession: false,
			eventID: id,
		}));
		
		return new Promise((resolve) => {
			this.on(`event_${id}`, ({ message }) => {
				const { state } = message;
				// this is personal info
				delete state.__websocket.connectionData;
				console.log('Fetched state for', session);
				resolve(state);
			});
		});
	}
	
	handleMessage(ws, message) {
		try {
			const messageObj = JSON.parse(message);
			const session = messageObj._websocket_session;
			this.connectionData[ws].session = session;
			if (messageObj.messageType === 'redux_action') {
				this.connectionsBySession[session].forEach(({ conn }) => {
					if (conn !== ws) {
						conn.send(message);
					}
				});
			} else if (messageObj.messageType === 'redux_user_action') {
				// broadcast to every client, including the one that sent it
				this.connectionsBySession[session].forEach(({ conn }) => {
					conn.send(message);
				});
			} else if (messageObj.messageType === 'getState') {
				let isNewSession = false;
				if (!this.connectionsBySession[session]) {
					this.connectionsBySession[session] = [];
					isNewSession = true;
				}
		
				const connectionID = this.connection_id;
				this.connection_id ++;
				this.connectionData[ws].id = connectionID;
				this.connectionsBySession[session].push({
					conn: ws,
					id: connectionID,
				});
				console.log(`Connection authenticated to session "${session}". Given id ${connectionID}`);
		
				(async () => {
					let initialState = undefined;
					if (!this.sessionMaster[session]) {
						// if there is no master, first set this session as master
						this.sessionMaster[session] = {
							conn: ws,
							id: connectionID,
						};
						// then try to hit our event handlers to load the initial state.
						initialState = await this.handleEvent('getInitialState', {
							session,
							
						});
					}
					console.log('Requesting state from master. New session?', isNewSession);
					this.sessionMaster[session].conn.send(JSON.stringify({
						_websocket_session: session,
						messageType: "getState",
						connectionID: this.sessionMaster[session].id,
						newSession: isNewSession,
						initialState,
					}));
				})()
			} else if (messageObj.messageType === "setState") {
				// push the state to all connected clients
				// anyone already with state will just ignore the message
				// also push the client's connection ID so they can store it
				// for later.
				console.log(`Pushing state for "${session}"`)
				this.connectionsBySession[session].forEach(({ conn, id }) => {
					if (conn !== ws) {
						conn.send(JSON.stringify({
							_sebsocket_session: session,
							messageType: 'setState',
							state: messageObj.state,
							connectionID: id,
						}));
					}
				});
				
				if (messageObj.eventID !== undefined) {
					this.handleEvent(`event_${messageObj.eventID}`, {
						message: messageObj,
					});
				}
			} else if (messageObj.messageType === "setUserData") {
				const connectionID = messageObj.connectionID;
				console.log(`Connection ${connectionID} with state ${session} is pushing their user state`);
				this.connectionsBySession[session].forEach(({ conn, id }) => {
					conn.send(JSON.stringify({
						_sebsocket_session: session,
						messageType: 'setUserData',
						state: messageObj.state,
						connectionID: connectionID,
					}));
				});
			} else if (messageObj.messageType === "ping") {
				ws.send(JSON.stringify({
					messageType: 'pong',
					time: messageObj.time,
				}));
			} else {
				// in this case we get an unexpected event. So fire off a "message" event to any listeners
				console.log(`Received custom message type ${messageObj.messageType}`);
				const { id } = this.connectionData[ws];
				this.handleEvent('message', {
					message: messageObj,
					id,
				});
			}
		} catch (error) {
			console.error('Error processing message', message, error);
		}
	}
}
