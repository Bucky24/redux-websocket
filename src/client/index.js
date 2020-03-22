import { setUserData, getUserData, removeUser } from '../webSocketReducer';

class ReduxWebSocketClient {
	constructor(url, protocol, sessionID) {
		this.sessionID = sessionID;
		this.connect(url, protocol);
		
		this.eventHandlers = {};
		this.ignoredActions = [];
		this.rootReducer = null;
		this.connectionID = null;
		this.userDataActions = [];
		this.userDataTree = [];
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
		
		return response;
	}
	
	setIgnoredActions(ignoredActions) {
		this.ignoredActions = ignoredActions;
	}
	
	setUserDataActions(dataActions) {
		this.userDataActions = dataActions;
	}
	
	setUserDataTree(dataTree) {
		this.userDataTree = dataTree;
	}
	
	setReducers(reducers) {
		this.rootReducer = reducers;
	}
	
	connect(url, protocol) {
		const fullUrl = url + '/' + protocol;
		console.log('Attempting connection to', fullUrl);
		const webSocket = new WebSocket(fullUrl);
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
				console.log('got redux action', data.action);
				this._store.dispatch({
					...data.action,
					__webpack_processed: true,
				});
			} else if (data.messageType === 'redux_user_action') {
				console.log('got redux user action from ', data.connectionID);
				// run the reducers manually on the specific user's data tree
				const currentState = this._store.getState();
				const userData = getUserData(currentState);
				const specificUserData = userData[data.connectionID]
				
				let result = this.rootReducer(specificUserData, data.action);
				result = {
					...result
				};
				delete result.__websocket;
				
				// clean up all non user data
				Object.keys(result).forEach((key) => {
					if (!this.userDataTree.includes(key)) {
						delete result[key];
					}
				})

				const newUserData = setUserData(data.connectionID, result);
				this._store.dispatch(newUserData);
			} else if (data.messageType === "getState") {
				this.connectionID = data.connectionID;
				// we know at this point the server had no state for us,
				// so we should just continue forward
				console.log('Got a request for state. This is master connection with id', this.connectionID);
				if (!this._store) {
					console.log('Getting state without store');
					const store = this.triggerEvent("stateReceived");
					this._store = store;
				}
				if (!this._store) {
					console.error('Unable to get store, cannot continue');
					return;
				}
				let state = this._store.getState();
				state = {
					...state,
				};
				// now strip out all user data
				for (const dataKey of this.userDataTree) {
					delete state[dataKey];
				}
				this.send({
					messageType: "setState",
					state,
				});
			} else if (data.messageType === "setState") {
				// emit event on state received
				this.connectionID = data.connectionID;
				console.log('We have received state. Our connection id is', this.connectionID);
				if (!this._store) {
					const store = this.triggerEvent("stateReceived", data.state);
					this._store = store;
				}
			} else if (data.messageType === 'userLeft') {
				console.log("Got message that user", data.connectionID, 'left');
				this._store.dispatch(removeUser(data.connectionID));
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
				if (!action.__webpack_processed && !action.type.includes('__WEBSOCKET__')) {		
					if (
						!this.ignoredActions.includes(action.type) &&
						!this.userDataActions.includes(action.type)
					) {
						const actionObj = {
							messageType: 'redux_action',
							action,
						};
						this.send(actionObj);
					}
					
					if (this.userDataActions.includes(action.type)) {
						const actionObj = {
							messageType: 'redux_user_action',
							action,
							connectionID: this.connectionID,
						}
						this.send(actionObj);
					}
				}
				
				
				return next(action);
			}
		}
	}
}

export default ReduxWebSocketClient;
