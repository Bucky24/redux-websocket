
class ReduxWebSocketClient {
	constructor(url, protocol, sessionID) {
		this.sessionID = sessionID;
		this.connect(url, protocol);
		
		this.eventHandlers = {};
	}
	
	on(event, cb) {
		if (!this.eventHandlers[event]) {
			this.eventHandlers[event] = [];
		}
		this.eventHandlers[event].push(cb);
	}
	
	triggerEvent(event, data) {
		if (!this.eventHandlers[event]) {
			return;
		}
		
		let response;
		this.eventHandlers[event].forEach((cb) => {
			response = cb(data);
		});
		
		if (event === "stateReceived") {
			
		}
		
		return response;
	}
	
	connect(url, protocol) {
		console.log('Attempting connection to', url);
		const webSocket = new WebSocket(url, [protocol]);
		this._socket = webSocket;
		this._connected = false;
		
        webSocket.onopen = (event) => {
			console.log('Connected to websocket');
			this._connected = true;
			
			this.triggerEvent('connected');
			
			this.send({
				messageType: 'getState'
			});
        };
		
        webSocket.onclose = (event) => {
			this._connected = false;
			// reattempt connection after a delay
			setTimeout(() => {
				this.connect(url, protocol);
			}, 1000);
        };
		
        webSocket.onerror = (event) => {
			console.log('error', event);
        };
		
		webSocket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.messageType === 'redux_action') {
				this._store.dispatch({
					...data.action,
					__webpack_processed: true,
				});
			} else if (data.messageType === "getState") {
				// we know at this point the server had no state for us,
				// so we should just continue forward
				if (!this._store) {
					console.log('getting state without store');
					const store = this.triggerEvent("stateReceived");
					this._store = store;
				}
				//console.log('state requested', store.getState());
				this.send({
					messageType: "setState",
					state: this._store.getState()
				});
			} else if (data.messageType === "setState") {
				// emit event on state received
				console.log('we have received state', data.state);
				this.triggerEvent("stateReceived", data.state);
			}
		}
	}
	
	send(data) {
		if (this._connected) {
			const workingData = {
				...data,
				_websocket_session: this.sessionID,
			}
			this._socket.send(JSON.stringify(workingData));
		}
	}
	
	shutdown() {
		if (this._client) {
			this._client.disconnect();
			this._client = null;
		}
 	}
	
	getMiddleware() {
		return (store) => {
			this._store = store;
			return next => action => {
				if (!action.__webpack_processed) {
					const actionObj = {
						messageType: 'redux_action',
						action
					};
					this.send(actionObj);
				}
				return next(action);
			}
		}
	}
}

export default ReduxWebSocketClient;
